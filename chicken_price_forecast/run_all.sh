#!/usr/bin/env bash
# Rebuild every table, chart and check from the two raw inputs.
set -euo pipefail
cd "$(dirname "$0")"

PY=.venv/bin/python
if [ ! -x "$PY" ]; then
  echo "No virtualenv found. Create it with:" >&2
  echo "  uv venv .venv --python 3.12 && uv pip install --python .venv/bin/python -r requirements.txt" >&2
  exit 1
fi

export PYTHONPATH=src
sha256sum data/raw/* > logs/inputs.sha256

for step in 01_ingest 02_events 03_baseline 04_event_impacts 05_forecast \
            06_charts 07_export 08_verify_event_dates 09_export_frontend; do
  echo "== $step =="
  "$PY" -W ignore "src/${step}.py"
done
echo "done"
