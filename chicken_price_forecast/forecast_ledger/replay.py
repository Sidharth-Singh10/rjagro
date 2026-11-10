"""One-off paced replay: one official batch per market day for a chosen window.

The ledger scores an outcome only when it is first recorded strictly after the
batch was published. A backfilled origin therefore cannot be scored while its
actual is already in the database. This command makes the actuals genuinely
unknown in that window: it removes the selected days and their audit rows,
registers the frozen protocol while they are absent, then reveals them one day
at a time, waiting for each day's batch to publish before revealing the next.

It is destructive and deliberate:
  * the selected rows leave `chicken_prices` and their audit rows are dropped;
  * the values and their original timings are written to a JSON backup first;
  * every re-inserted row is stamped `quote_source = 'replay'`.

Run it once. It is never imported by the long-lived worker.
"""
import argparse
import json
import os
import time
from datetime import date, timedelta
from pathlib import Path

from forecast_ledger.protocol import definition
from forecast_ledger.store import Store
from forecast_ledger.worker import process


def prices_in(store, first, last):
    with store.connect() as conn:
        return conn.execute('''SELECT price_date,price,quote_source,note,updated_at,updated_by
            FROM chicken_prices WHERE price_date BETWEEN %s AND %s ORDER BY price_date''',
            (first, last)).fetchall()


def audit_in(store, first, last):
    with store.connect() as conn:
        return conn.execute('''SELECT price_date,old_price,new_price,action,changed_at,changed_by
            FROM chicken_price_audit WHERE price_date BETWEEN %s AND %s ORDER BY price_date,id''',
            (first, last)).fetchall()


def erase(store, first, last):
    with store.connect() as conn, conn.transaction():
        conn.execute('DELETE FROM chicken_price_audit WHERE price_date BETWEEN %s AND %s', (first, last))
        conn.execute('DELETE FROM chicken_prices WHERE price_date BETWEEN %s AND %s', (first, last))


def insert_day(store, day, price):
    with store.connect() as conn, conn.transaction():
        if conn.execute('SELECT 1 AS hit FROM chicken_prices WHERE price_date=%s', (day,)).fetchone():
            return False
        conn.execute('''INSERT INTO chicken_prices (price_date,price,quote_source,updated_at)
            VALUES (%s,%s::numeric,'replay',clock_timestamp())''', (day, price))
        conn.execute('''INSERT INTO chicken_price_audit (price_date,old_price,new_price,action,changed_at)
            VALUES (%s,NULL,%s::numeric,'insert',clock_timestamp())''', (day, price))
        return True


def registered_known_dates(store):
    with store.connect() as conn:
        row = conn.execute('SELECT initial_known_dates FROM forecast_protocols WHERE id=%s',
                           (store.protocol_id,)).fetchone()
    return None if row is None else {date.fromisoformat(d) for d in row['initial_known_dates']}


def official_batches(store):
    with store.connect() as conn:
        return conn.execute('''SELECT origin_date,status,error,attempts FROM forecast_batches
            WHERE protocol_id=%s AND kind='official' ORDER BY origin_date''', (store.protocol_id,)).fetchall()


def count_priced(store, floor, before):
    with store.connect() as conn:
        return conn.execute('''SELECT count(*) AS n FROM chicken_prices
            WHERE price_date>=%s AND price_date<%s''', (floor, before)).fetchone()['n']


def drain(store, floor, until, timeout=1800):
    """Capture and publish until every origin before `until` is published."""
    deadline = time.monotonic() + timeout
    while True:
        store.capture('official')
        job = store.claim()
        if job:
            print(f'  fitting origin {job["origin_date"]} ({job["kind"]})', flush=True)
            process(store, job)
            continue
        rows = [r for r in official_batches(store) if r['origin_date'] < until]
        broken = [r for r in rows if r['status'] == 'blocked'
                  or (r['status'] == 'failed' and r['attempts'] >= 3)]
        if broken:
            raise SystemExit(f'origin {broken[0]["origin_date"]} is {broken[0]["status"]}: {broken[0]["error"]}')
        if len(rows) == count_priced(store, floor, until) and all(r['status'] == 'published' for r in rows):
            return rows
        if time.monotonic() > deadline:
            raise SystemExit(f'timed out waiting for origins before {until}; nothing was deleted that a backup cannot restore')
        time.sleep(2)


def load_backup(path):
    payload = json.loads(Path(path).read_text())
    return [(date.fromisoformat(r['price_date']), r['price']) for r in payload['prices']]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--first', required=True, help='first market day to replay (YYYY-MM-DD)')
    parser.add_argument('--last', required=True, help='last market day to replay (YYYY-MM-DD)')
    parser.add_argument('--backup', default='/tmp/opencode/forecast_replay_backup.json')
    parser.add_argument('--apply', action='store_true', help='perform the replay; without it only report the plan')
    args = parser.parse_args()

    first, last = date.fromisoformat(args.first), date.fromisoformat(args.last)
    if last < first:
        raise SystemExit('last must not be before first')

    protocol_id, config = definition()
    floor = date.fromisoformat(config['originsFrom'])
    if first < floor:
        raise SystemExit(f'first {first} is before the protocol floor {floor}')

    store = Store(os.environ['DATABASE_URL'], protocol_id)
    expected = (last - first).days + 1
    known = registered_known_dates(store)

    if known is None:
        prices = prices_in(store, first, last)
        if len(prices) != expected:
            raise SystemExit(f'expected {expected} recorded days in the window, found {len(prices)}')
        audit = audit_in(store, first, last)
        Path(args.backup).parent.mkdir(parents=True, exist_ok=True)
        Path(args.backup).write_text(json.dumps(dict(
            first=str(first), last=str(last), protocol=protocol_id,
            prices=[dict(r) for r in prices], audit=[dict(r) for r in audit]), default=str, indent=2))
        print(f'backup written to {args.backup} ({len(prices)} prices, {len(audit)} audit rows)')
        days = [(r['price_date'], r['price']) for r in prices]
    else:
        if any(first <= d <= last for d in known):
            raise SystemExit('this protocol was registered while the window was present; '
                             'its outcomes can never be scored, so the replay is refused')
        days = load_backup(args.backup)
        print(f'resuming {first} .. {last} from {args.backup}')
        present = {r['price_date']: r['price'] for r in prices_in(store, first, last)}
        for day, price in days:
            if day in present and float(present[day]) != float(price):
                raise SystemExit(f'{day} is present as {present[day]} but the backup says {price}; refusing')

    existing = [r for r in official_batches(store) if first <= r['origin_date'] <= last]
    print(f'protocol {protocol_id[:12]}: '
          + ('not registered yet, known dates will stop before ' + str(first)
             if known is None else f'registered, {len(existing)} batches already in the window'))

    if not args.apply:
        print('plan only; re-run with --apply to erase, register and replay')
        return

    if known is None:
        erase(store, first, last)
        print(f'erased prices and audit rows for {first} .. {last}')
        store.register(config)
        print(f'registered {protocol_id[:12]}')

    for day, price in days:
        drain(store, floor, day)
        created = insert_day(store, day, price)
        print(f'{day}: {"inserted" if created else "already present"}', flush=True)
    drain(store, floor, last + timedelta(days=1))

    scored = store.reconcile()
    rows = [r for r in official_batches(store) if first <= r['origin_date'] <= last]
    print(f'published {len(rows)} official batches in the window; evaluations appended: {scored}')
    for r in rows:
        print(f'  {r["origin_date"]} {r["status"]} {r["error"] or ""}')


if __name__ == '__main__':
    main()
