# Wholesale chicken price analysis and daily forecast — Uttar Pradesh

Statistical analysis of daily wholesale chicken prices for Uttar Pradesh and a
daily forecast from **24 October 2026 to 31 December 2027**, with the festival,
religious, wedding and seasonal events in the supplied calendar estimated as
measurable price associations.

Everything here is generated from two inputs and can be regenerated end to end.

## Inputs (never modified)

| file | role |
|---|---|
| `data/raw/RATE TRACKER - Chicken Rate Updated 29⁄10.csv` | current daily wholesale price tracker, INR per kg, 1 Apr 2025 – 28 Oct 2026 (425 quoted days; 169 blank) |
| `data/raw/up_chicken_events.json` | 26 event definitions, 91 dated occurrences, 2025–2027, with sources |

The originals live in the repository root (`RATE TRACKER - Chicken Rate.csv`,
`rjagro_frontend/data/up_chicken_events.json`) and were copied byte for byte
into `data/raw/`. Their SHA-256 hashes are in `logs/inputs.sha256`.

## Outputs

```
outputs/
  chicken_price_deliverables.xlsx     all tables in one workbook
  tables/
    data_quality_monthly.csv          observations per month
    baseline_summary.csv              level, volatility, stationarity, seasonality tests
    baseline_weekday.csv              day-of-week profile
    baseline_monthly_profile.csv      month-of-year profile
    baseline_coefficients.csv         calendar regression coefficients
    baseline_model_selection.csv      Fourier / trend specification search
    event_coverage.csv                evidence available per event
    event_overlap_pairs.csv           how much events share days
    event_date_verification.csv       external spot-check of 2027 dates
    historical_event_occurrences.csv  one row per occurrence
    historical_event_impact.csv       one row per event
    category_effects.csv              pooled effect by category
    halo_pooling.csv                  lead-in / recovery patterns
    model_backtest_summary.csv        accuracy of every candidate model
    model_backtest_by_horizon.csv     accuracy by horizon bucket
    model_backtest_events_vs_nonevent.csv
    trend_instability.csv             why a free trend is rejected
    drift_sensitivity.csv             long-horizon drift scenarios
    daily_forecast.csv                434 rows, one per day
    event_forecasts.csv               one row per future event occurrence
  charts/                             eight PNG figures
logs/                                 JSON run logs and consistency checks
data/processed/                       cleaned daily series, event days, backtest predictions
src/                                  pipeline code
```

## Reproduce

```bash
cd chicken_price_forecast
uv venv .venv --python 3.12
uv pip install --python .venv/bin/python -r requirements.txt
bash run_all.sh
```

`run_all.sh` executes the ten steps in order. Total runtime is about half a minute.

| step | script | what it does |
|---|---|---|
| 01 | `src/01_ingest.py` | parse, validate, audit missingness |
| 02 | `src/02_events.py` | flatten the calendar, add windows, count evidence, find overlaps |
| 03 | `src/03_baseline.py` | describe the normal price series and test seasonality |
| 04 | `src/04_event_impacts.py` | matched-window event study + empirical-Bayes pooling |
| 05 | `src/05_forecast.py` | rolling-origin backtest, model selection, final forecast |
| 06 | `src/06_charts.py` | all figures |
| 07 | `src/07_export.py` | Excel workbook + 26 consistency checks |
| 08 | `src/08_verify_event_dates.py` | record the external check of 2027 dates |
| 09 | `src/09_export_frontend.py` | write `rjagro_frontend/app/data/price_forecast.json` for the Analytics tab |
| 10 | `src/10_report.py` | render `REPORT.md` from the generated artefacts |

## Frontend

Step 09 writes `../rjagro_frontend/app/data/price_forecast.json` (the only file
the web app reads) and refreshes `../rjagro_frontend/docs/event-impact-statistics.md`.
The app never computes an event effect or a forecast itself, so the UI cannot
drift from the report. Validate the export after any hand edit with:

```bash
cd ../rjagro_frontend && npm run validate:forecast
```

## Updating with new observations

1. Drop the new extract into `data/raw/` and point `PRICE_CSV` in
   `src/cplib.py` at it. The file must keep the `D-Mon-YYYY,price` layout; leave
   the price cell blank when no quote was recorded — blanks are treated as
   missing, never as zero. The forecast start date follows the last quoted day
   automatically, and every table, chart, the report and the web app's JSON are
   regenerated from it.
2. If a new event year is needed, add occurrences to
   `data/raw/up_chicken_events.json` (`definitions` + `occurrences`) and set
   `date_confidence`.
3. Run `bash run_all.sh`. The forecast start date is taken from the last
   quoted day automatically (`cp.FORECAST_START` is defined relative to the
   data, and `05_forecast.py` writes one row per calendar day to 2027-12-31).

Nothing is hard-coded to a particular end date except the 2027-12-31 horizon.

## Design decisions worth knowing

* **Prices are INR per kg of live weight.** The CSV header says only
  "CHICKEN SOLD RATE"; the unit was established from the business database
  (`batch_sales.rate` for `DC101 DESI CHICKEN`, where `value = rate × weight_kg`
  and rate is 104–123 in Sep 2026) and from the level of the series. See
  `REPORT.md` §2.
* **Missing days are not interpolated.** They are documented, and every model
  fits only on observed days. Only the ETS benchmarks bridge gaps, because the
  algorithm needs an equally spaced series; that is stated where it matters.
* **Event effects are identified from local matched windows**, not from a
  global trend line, because the trend itself is not identified on 18 months of
  data. See `REPORT.md` §5.
* **Thin evidence is pooled, not dressed up.** Events with one or two observed
  days are shrunk toward their category mean and carry a reliability grade of
  D or E.
* **No trend is extrapolated into 2027.** The sample contains 1.5 annual
  cycles; fitting a trend plus annual harmonics produces absurd
  extrapolations (`outputs/tables/trend_instability.csv` shows a 90-day
  forecast of INR 2,619 from one origin). The forecast anchors the level to the
  last three observations and extrapolates only the seasonal shape. A drift
  sensitivity table is provided instead.

## Caveats

The forecast is a statistical extrapolation of one price series, not a market
model. It cannot see feed costs, chick placement, disease, transport, weather
shocks, imports or policy. Prediction intervals widen to roughly ±45% at 95%
by December 2027 and should be read before the central line.
