#!/usr/bin/env bash
# Rebuild every artefact from the price file and the event calendar.
#
#   bash run_all.sh              uses data/raw/<current CSV>
#   PRICES=... bash run_all.sh   any other export of the tracker
#   DB=1 bash run_all.sh         read chicken_prices from Postgres instead
#
# Writes tables + report + payload under outputs/, refreshes REPORT.md, and
# exports the web app's bundled payload.
set -euo pipefail
cd "$(dirname "$0")"

PY=.venv/bin/python
[ -x "$PY" ] || { echo "no .venv; see README" >&2; exit 1; }

PRICES="${PRICES:-data/raw/RATE TRACKER - Chicken Rate Updated 29⁄10.csv}"
export PYTHONPATH=.
sha256sum data/raw/* > logs/inputs.sha256

if [ "${DB:-0}" = "1" ]; then
  "$PY" -W ignore -m cp_pipeline.cli run --db --out outputs
else
  "$PY" -W ignore -m cp_pipeline.cli run --prices "$PRICES" --out outputs
fi

cp outputs/report.md REPORT.md

"$PY" -W ignore -m cp_pipeline.cli export \
  --prices "$PRICES" \
  --payload-out ../rjagro_frontend/app/data/price_forecast.json \
  --report-out ../rjagro_frontend/docs/event-impact-statistics.md \
  --quiet

echo "done"
