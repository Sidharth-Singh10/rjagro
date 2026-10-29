# Wholesale chicken price — pipeline

Turns a daily price series and an event calendar into the numbers, the written
conclusions and the forecast the Analytics tab shows.

Two rules shape the design:

1. **One implementation.** The app never computes a statistic. It renders the
   payload this pipeline writes.
2. **Three seams.** Where data comes from, what the forecast equation is, and how
   the conclusions are worded are independent. Changing one must not touch the
   others.

## Quick start

```bash
uv venv .venv --python 3.12 && uv pip install --python .venv/bin/python -r requirements.txt

PYTHONPATH=. .venv/bin/python -m cp_pipeline.cli run \
    --prices "data/raw/RATE TRACKER - Chicken Rate Updated 29⁄10.csv" \
    --out outputs                       # tables + report + payload

bash run_all.sh                          # the same, plus REPORT.md and the app export
PYTHONPATH=. .venv/bin/python tests/test_pipeline.py
```

`run` prints the headline, the model and the first conclusions, and writes
`outputs/tables/*.csv`, `outputs/report.md` and `outputs/payload.json`.

## Layout

```
cp_pipeline/
  config.py        every knob, with today's values as defaults (fingerprinted per run)
  prices.py        PriceSource: CsvSource | DatabaseSource | MemorySource, plus the audit
  calendar.py      event definitions → occurrences → lead/core/recovery windows
  design.py        fourier, weekday, trend, HAC regression, baseline diagnostics
  events.py        matched-window study, block bootstrap, pooling, shrinkage
  models.py        ForecastModel protocol + registry (the equation lives here)
  backtest.py      rolling origins, metrics, selection, interval calibration
  forecast.py      assembles baseline / event-adjusted / intervals from one fit
  facts.py         every number the narrative may use — the contract
  conclusions.py   facts → sentences (the only module that writes prose)
  report.py        facts + conclusions → markdown
  runner.py        stage order, hashing, payload assembly
  cli.py           run | export | worker | import-csv
tests/test_pipeline.py   golden, model-swap, fact-reference tests
legacy/            the pre-package scripts; kept for the long-form report and figures
```

## The three seams

**Data.** Implement `PriceSource` (one method: `load() -> Series`) and nothing
downstream changes. The CLI already ships CSV, Postgres and in-memory sources.

**The equation.** Add a class with a `key` and a `predict()` and register it:

```python
# cp_pipeline/models.py
class DampedTrend:
    key = "damped"
    def predict(self, train, future, *, train_offsets, future_offsets, cfg):
        return ...

models.register(DampedTrend())
```

Then list it in `Config.candidates` (or `analytics_settings`). The backtest
scores it, the selector may choose it, facts and the narrative pick it up. No
other file changes — `tests/test_pipeline.py::test_model_swap` proves it.

**The words.** `facts.py` emits numbers only; `conclusions.py` turns them into
sentences; the report and the UI render those sentences verbatim. No component
and no template may contain a statistic of its own.

## The app loop

```
prices edited in /analytics  →  PUT /analytics/prices/{date}
   → row + audit row committed
   → one queued analytics_run (edits coalesce; partial unique index)
   → worker claims it, runs the stages, writes payload + report_md
   → UI polls /analytics/status, then refetches /analytics/forecast
```

Nothing is committed, rebuilt or restarted. A run takes about 10 s.

### Database

Apply once: `psql "$DATABASE_URL" -f analytics_schema_additions.sql`
(tables: `chicken_prices`, `chicken_price_audit`, `analytics_runs`,
`analytics_settings`; documented in `database/history/2026-10-29-analytics.md`).

Seed from the current sheet:

```bash
PYTHONPATH=. .venv/bin/python -m cp_pipeline.cli import-csv \
    --prices "data/raw/RATE TRACKER - Chicken Rate Updated 29⁄10.csv"
```

### Worker

The worker is a database client; run it wherever the pipeline can run.

```bash
PYTHONPATH=. .venv/bin/python -m cp_pipeline.cli worker --poll 2
```

It claims at most one run at a time (`FOR UPDATE SKIP LOCKED` plus an advisory
lock), records failures with their traceback instead of dying, and keeps the
last 50 successful payloads.

### Worker image (CI → Docker Hub → VPS)

`.github/workflows/analytics-worker.yml` builds `Dockerfile.worker` on every push
that touches `chicken_price_forecast/**` and pushes
`sidharthsingh7/rjagro_analytics_worker:latest` (plus a `sha-…` tag) to Docker Hub.
It needs the same secrets the backend workflow uses: `DOCKERHUB_USERNAME`,
`DOCKERHUB_TOKEN`.

On the VPS, where there is no source checkout:

```bash
docker pull sidharthsingh7/rjagro_analytics_worker:latest
docker stop analytics-worker 2>/dev/null; docker rm analytics-worker 2>/dev/null
docker run -d --restart unless-stopped --name analytics-worker \
  -e DATABASE_URL=postgresql://USER:PASS@HOST:5432/rjagro \
  sidharthsingh7/rjagro_analytics_worker:latest
docker logs -f analytics-worker      # "worker up · poll 2s"
```

Locally, `docker compose -f docker-compose.analytics.yml up -d --build` builds the
same image from this package.

The image is a database client: no ports, no volumes, no state on disk. It carries
the pipeline and `data/raw/up_chicken_events.json` (the calendar is read from
disk, prices come from Postgres), runs as a non-root user, and has a healthcheck
that fails when the database is unreachable.

`DATABASE_URL` must be reachable **from inside the container** — the repo `.env`
points at `localhost:5432` through the rjdb tunnel, which inside a container is
the container itself.

## Where the app's numbers come from

`NEXT_PUBLIC_ANALYTICS_SOURCE`:

- `api` — the latest succeeded run from `/analytics/forecast`, with the price
  calendar reading `/analytics/prices`.
- unset or `json` — the bundled `app/data/price_forecast.json`, which
  `run_all.sh` refreshes. The tab works offline and cannot be blanked by a
  backend outage.

## Updating the numbers

- **From the app:** edit the day in the Price history calendar, Save & recompute.
- **From a sheet:** drop the new export in `data/raw/`, point `PRICES=` at it,
  run `bash run_all.sh`, and `import-csv` if the database is the source.
- **Model or wording change:** edit `models.py` / `conclusions.py`, run the
  tests, then `run_all.sh`. The payload schema is unchanged, so the UI needs no
  change.

## What is legacy

`legacy/` holds the numbered scripts that produced the long-form `REPORT.md`,
the PNG figures and the Excel workbook before the package existed. They still
work against their own tables; the packaged pipeline supersedes them for the
app and for every number that ships.
