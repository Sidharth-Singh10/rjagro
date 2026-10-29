"""Command line entry points.

    python -m cp_pipeline run --prices <csv> --out <dir> [--config cfg.json]
    python -m cp_pipeline run --db --out <dir>
    python -m cp_pipeline worker --poll 2          # sidecar service
    python -m cp_pipeline import-csv --prices <csv>

Only `worker` and `import-csv` need a database. `run` works entirely offline.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

from .config import Config
from .prices import CsvSource, DatabaseSource
from .runner import run as run_pipeline

ADVISORY_LOCK = 815_231  # any stable int; two workers must pick the same one


# ---------------------------------------------------------------------------
# run
# ---------------------------------------------------------------------------
def cmd_run(args) -> int:
    cfg = Config.load(args.config)
    source = DatabaseSource(args.dsn) if args.db else CsvSource(args.prices)
    out = Path(args.out) if args.out else None
    result = run_pipeline(source, cfg, args.events, verbose=not args.quiet,
                          persist=out, run_id=args.run_id or "local")
    if not args.quiet:
        payload = result["payload"]
        f = payload["forecast"]
        print(f"\ndata through {payload['meta']['dataThrough']}  ·  "
              f"model {payload['meta']['model']}  ·  {len(f['daily'])} days")
        print(f"forecast {f['first']:.1f} -> {f['lastCentral']:.1f} "
              f"(95% {f['lastLo95']:.1f}-{f['lastHi95']:.1f})")
        for c in payload["conclusions"][:3]:
            print(f"  - {c['text'][:140]}")
    return 0


def cmd_export(args) -> int:
    """Run the pipeline and write the app's bundled payload (offline fallback)."""
    cfg = Config.load(args.config)
    source = DatabaseSource(args.dsn) if args.db else CsvSource(args.prices)
    result = run_pipeline(source, cfg, args.events, verbose=not args.quiet,
                          run_id=args.run_id or "export")
    payload_path = Path(args.payload_out)
    payload_path.parent.mkdir(parents=True, exist_ok=True)
    payload_path.write_text(json.dumps(result["payload"], separators=(",", ":"), allow_nan=False))
    if args.report_out:
        rp = Path(args.report_out)
        rp.parent.mkdir(parents=True, exist_ok=True)
        rp.write_text(result["report_md"])
    print(f"wrote {payload_path} ({payload_path.stat().st_size / 1024:.0f} KB)")
    return 0


# ---------------------------------------------------------------------------
# database helpers
# ---------------------------------------------------------------------------
def _connect(dsn: str | None):
    import psycopg
    dsn = dsn or __import__("os").environ.get("DATABASE_URL", "")
    if not dsn:
        raise SystemExit("DATABASE_URL is required")
    return psycopg.connect(dsn, autocommit=True)


def cmd_import_csv(args) -> int:
    series = CsvSource(args.prices).load()
    with _connect(args.dsn) as conn, conn.cursor() as cur:
        inserted = updated = 0
        for date, price in series.items():
            cur.execute("SELECT price FROM chicken_prices WHERE price_date = %s", (date.date(),))
            row = cur.fetchone()
            if row is None:
                cur.execute(
                    "INSERT INTO chicken_prices (price_date, price, quote_source) VALUES (%s, %s, 'csv-import')",
                    (date.date(), float(price)))
                inserted += 1
            elif float(row[0]) != float(price):
                cur.execute(
                    "UPDATE chicken_prices SET price=%s, quote_source='csv-import', updated_at=now() WHERE price_date=%s",
                    (float(price), date.date()))
                cur.execute(
                    "INSERT INTO chicken_price_audit (price_date, old_price, new_price, action) VALUES (%s,%s,%s,'import')",
                    (date.date(), float(row[0]), float(price)))
                updated += 1
        cur.execute("INSERT INTO analytics_runs (status, trigger) VALUES ('queued','import') ON CONFLICT DO NOTHING")
    print(f"imported {inserted} new, {updated} corrected, one run queued")
    return 0


def _claim(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT pg_try_advisory_lock(%s)", (ADVISORY_LOCK,))
        if not cur.fetchone()[0]:
            return None
        cur.execute("""
            WITH nxt AS (
                SELECT id FROM analytics_runs
                 WHERE status = 'queued'
                 ORDER BY requested_at
                 LIMIT 1
                 FOR UPDATE SKIP LOCKED
            )
            UPDATE analytics_runs r
               SET status = 'running', started_at = now()
              FROM nxt
             WHERE r.id = nxt.id
            RETURNING r.id, r.requested_by
        """)
        return cur.fetchone()


def _finish(conn, run_id, *, ok: bool, payload=None, report_md=None, model=None,
            dataset_hash=None, error=None):
    with conn.cursor() as cur:
        if ok:
            cur.execute("""
                UPDATE analytics_runs
                   SET status='succeeded', finished_at=now(), payload=%s, report_md=%s,
                       model=%s, dataset_hash=%s, error=NULL, config_hash=%s
                 WHERE id=%s
            """, (json.dumps(payload), report_md, model, dataset_hash,
                  payload.get("meta", {}).get("configHash") if payload else None, run_id))
        else:
            cur.execute("""
                UPDATE analytics_runs SET status='failed', finished_at=now(), error=%s
                 WHERE id=%s
            """, (error, run_id))
        cur.execute("SELECT pg_advisory_unlock(%s)", (ADVISORY_LOCK,))


def _prune(conn, keep: int = 50):
    with conn.cursor() as cur:
        cur.execute("""
            DELETE FROM analytics_runs
             WHERE id IN (
                SELECT id FROM analytics_runs
                 WHERE status='succeeded'
                 ORDER BY finished_at DESC
                 OFFSET %s)
        """, (keep,))


def cmd_worker(args) -> int:
    cfg = Config.load(args.config)
    conn = _connect(args.dsn)
    print(f"worker up · poll {args.poll}s · model {cfg.primary_model}")
    while True:
        claimed = _claim(conn)
        if claimed is None:
            if args.once:
                print("nothing queued")
                return 0
            time.sleep(args.poll)
            continue

        run_id, requested_by = claimed
        print(f"run {run_id} started")
        t0 = time.time()
        try:
            result = run_pipeline(DatabaseSource(args.dsn), cfg, args.events,
                                  verbose=True, run_id=str(run_id))
            _finish(conn, run_id, ok=True, payload=result["payload"],
                    report_md=result["report_md"],
                    model=result["payload"]["meta"]["model"],
                    dataset_hash=result["payload"]["meta"]["datasetHash"])
            _prune(conn)
            print(f"run {run_id} ok in {time.time() - t0:.1f}s "
                  f"({len(result['payload']['forecast']['daily'])} days)")
        except Exception:  # noqa: BLE001 - a failed run must be recorded, not raised
            err = traceback.format_exc()
            _finish(conn, run_id, ok=False, error=err[-4000:])
            print(f"run {run_id} FAILED\n{err[-1200:]}")
        if args.once:
            return 0


# ---------------------------------------------------------------------------
def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="cp_pipeline", description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("run", help="run the pipeline once")
    r.add_argument("--prices", default=None, help="CSV export of the tracker")
    r.add_argument("--db", action="store_true", help="read chicken_prices instead of a CSV")
    r.add_argument("--events", default=None)
    r.add_argument("--out", default=None)
    r.add_argument("--config", default=None)
    r.add_argument("--dsn", default=None)
    r.add_argument("--run-id", default=None)
    r.add_argument("--quiet", action="store_true")
    r.set_defaults(func=cmd_run)

    w = sub.add_parser("worker", help="poll analytics_runs and execute them")
    w.add_argument("--poll", type=float, default=2.0)
    w.add_argument("--once", action="store_true")
    w.add_argument("--config", default=None)
    w.add_argument("--events", default=None)
    w.add_argument("--dsn", default=None)
    w.set_defaults(func=cmd_worker)

    e = sub.add_parser("export", help="run and write the web app's bundled payload")
    e.add_argument("--prices", default=None)
    e.add_argument("--db", action="store_true")
    e.add_argument("--events", default=None)
    e.add_argument("--config", default=None)
    e.add_argument("--dsn", default=None)
    e.add_argument("--run-id", default=None)
    e.add_argument("--payload-out", required=True)
    e.add_argument("--report-out", default=None)
    e.add_argument("--quiet", action="store_true")
    e.set_defaults(func=cmd_export)

    i = sub.add_parser("import-csv", help="seed or merge a CSV into chicken_prices")
    i.add_argument("--prices", required=True)
    i.add_argument("--dsn", default=None)
    i.set_defaults(func=cmd_import_csv)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
