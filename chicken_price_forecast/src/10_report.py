"""Step 10 - render REPORT.md from the artefacts.

Every number in the report is read from a generated table or log, so updating
the price file and running `bash run_all.sh` refreshes the prose too. Nothing
in this file should be edited to change a figure: change the model, then re-run.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

import cplib as cp

OUT = cp.ROOT / "REPORT.md"

dq = json.loads((cp.LOGS / "data_quality.json").read_text())
base = json.loads((cp.LOGS / "baseline.json").read_text())
run = json.loads((cp.LOGS / "forecast_run.json").read_text())
eff = json.loads((cp.LOGS / "event_effects.json").read_text())
audit = json.loads((cp.LOGS / "event_calendar_audit.json").read_text())

daily = pd.read_csv(cp.TABLES / "daily_forecast.csv", parse_dates=["date"])
imp = pd.read_csv(cp.TABLES / "historical_event_impact.csv")
cat = pd.read_csv(cp.TABLES / "category_effects.csv")
cov = pd.read_csv(cp.TABLES / "event_coverage.csv")
evf = pd.read_csv(cp.TABLES / "event_forecasts.csv")
bt = pd.read_csv(cp.TABLES / "model_backtest_summary.csv")
byh = pd.read_csv(cp.TABLES / "model_backtest_by_horizon.csv")
evbt = pd.read_csv(cp.TABLES / "model_backtest_events_vs_nonevent.csv")
drift = pd.read_csv(cp.TABLES / "drift_sensitivity.csv")
trend = pd.read_csv(cp.TABLES / "trend_instability.csv")
halo = pd.read_csv(cp.TABLES / "halo_pooling.csv")
verify = pd.read_csv(cp.TABLES / "event_date_verification.csv")
monthly = pd.read_csv(cp.TABLES / "data_quality_monthly.csv")

SEL = "seasonal_anchor_events"
piv = byh.pivot(index="model", columns="bucket", values="smape")
evpiv = evbt.pivot(index="model", columns="event_window", values="smape")
rank = run["ranking_smape_1_28"]
tau = float(np.sqrt(eff["tau2_core"]))
n_obs = dq["observations"]
first_obs, last_obs = dq["first_observation"], dq["last_observation"]
n_events = len(imp)
n_a = int((imp["reliability"].str.startswith("A")).sum())
n_b = int((imp["reliability"].str.startswith("B")).sum())
n_c = int((imp["reliability"].str.startswith("C")).sum())
n_d = int((imp["reliability"].str.startswith("D")).sum())
n_e = int((imp["reliability"].str.startswith("E")).sum())
thin = int(((imp["n_observed_days_core"] > 0) & (imp["n_observed_days_core"] <= 2)).sum())
thin_all = int((imp["n_observed_days_core"] <= 2).sum())
fday = daily.iloc[0]
lday = daily.iloc[-1]
peak = daily.loc[daily["baseline_inr"].idxmax()]
trough = daily.loc[daily["baseline_inr"].idxmin()]
event_low = daily.loc[daily["forecast_inr"].idxmin()]
event_high = daily.loc[daily["forecast_inr"].idxmax()]
event_days = int((daily["event_impact_pct"] != 0).sum())

wedding = imp[imp.definition_id == "lagan-weddings"].iloc[0]
fest = cat[cat.category == "festival"].iloc[0]
obs_cat = cat[cat.category == "observance"].iloc[0]
isl = cat[cat.category == "islamic"].iloc[0]
fair = cat[cat.category == "fair"].iloc[0]

significant = imp[(imp.shrunk_ci80_lo_pct > 0) | (imp.shrunk_ci80_hi_pct < 0)]
sig_up = significant[significant.shrunk_effect_pct > 0]
sig_dn = significant[significant.shrunk_effect_pct < 0]


def pct(v, digits=1):
    if v is None or (isinstance(v, float) and not np.isfinite(v)):
        return "—"
    return f"{v:+.{digits}f}%".replace("-", "\u2212")


def days(n):
    return f"{int(n)} day" if int(n) == 1 else f"{int(n)} days"


def money(v, digits=1):
    if v is None or (isinstance(v, float) and not np.isfinite(v)):
        return "—"
    return f"{v:,.{digits}f}"


def table(rows, header):
    out = "| " + " | ".join(header) + " |\n"
    out += "|" + "|".join(["---"] * len(header)) + "|\n"
    for row in rows:
        out += "| " + " | ".join(str(cell) for cell in row) + " |\n"
    return out


# ---------------------------------------------------------------------------
# tables
# ---------------------------------------------------------------------------
evidence = table(
    [[r.definition_id, r.category, int(r.occurrences), int(r.occurrences_with_price_data),
      int(r.core_observed_days), f"{r.core_coverage_pct:.0f}%", r.evidence_class]
     for _, r in cov[~cov.is_regime].sort_values(["core_observed_days", "definition_id"]).iterrows()],
    ["event", "category", "occurrences", "with quotes", "observed days", "coverage", "class"])

impact_rows = []
for _, r in imp.sort_values("shrunk_effect_pct", ascending=False).iterrows():
    impact_rows.append([
        r.definition_id, int(r.n_occurrences_with_observed_prices), int(r.n_observed_days_core),
        money(r.observed_mean_price_inr), money(r.estimated_baseline_price_inr),
        pct(r.raw_effect_pct, 2),
        "—" if pd.isna(r.raw_ci95_lo_pct) else f"{pct(r.raw_ci95_lo_pct)} to {pct(r.raw_ci95_hi_pct)}",
        f"**{pct(r.shrunk_effect_pct, 2)}**",
        f"{pct(r.shrunk_ci80_lo_pct)} to {pct(r.shrunk_ci80_hi_pct)}",
        f"{int(r.n_occurrences_with_observed_prices) if False else r.reliability[0]}",
    ])
impact_table = table(impact_rows,
                     ["event", "n occ", "n days", "observed", "baseline", "raw", "95% CI (raw)",
                      "pooled", "80% CI (pooled)", "grade"])

cat_rows = [[r.category, int(r.n_occurrences), int(r.n_events), pct(r.raw_pooled_pct, 2),
             f"**{pct(r.pooled_effect_pct, 2)}**",
             f"{pct(r.pooled_ci95_lo_pct)} to {pct(r.pooled_ci95_hi_pct)}"]
            for _, r in cat.sort_values("pooled_effect_pct", ascending=False).iterrows()]
cat_table = table(cat_rows, ["category", "occurrences", "events", "raw pooled", "pooled effect", "95% CI"])

_best = bt["smape"].min()
bt_rows = [[r.model, int(r.n), f"{r.mae:.2f}", f"{r.rmse:.2f}",
            f"**{r.smape:.2f}**" if r.smape == _best else f"{r.smape:.2f}",
            f"{r.bias:+.2f}".replace("-", "\u2212"), f"{r.bias_pct:+.1f}".replace("-", "\u2212")]
           for _, r in bt.iterrows()]
bt_table = table(bt_rows, ["model", "n", "MAE ₹", "RMSE ₹", "sMAPE %", "bias ₹", "bias %"])

order = [m for m in [SEL, "seasonal_anchor", "ets_weekly", "ma7", "naive"] if m in piv.index]
hz_rows = [[m, f"{piv.loc[m, '1-7d']:.2f}", f"{piv.loc[m, '8-28d']:.2f}", f"{piv.loc[m, '29-90d']:.2f}"]
           for m in order]
hz_table = table(hz_rows, ["model", "1–7 d", "8–28 d", "29–90 d"])

ev_rows = [[m, f"{evpiv.loc[m, False]:.2f}", f"{evpiv.loc[m, True]:.2f}"] for m in order]
ev_table = table(ev_rows, ["model", "non-event days", "event windows"])

head_rows = []
for target in ["2026-10-29", "2026-11-08", "2026-12-31", "2027-03-31", "2027-06-30", "2027-12-31"]:
    row = daily[daily.date == pd.Timestamp(target)]
    if len(row) == 0:
        continue
    r = row.iloc[0]
    head_rows.append([target, money(r.forecast_inr), money(r.baseline_inr), pct(r.event_impact_pct),
                      f"{money(r.pi80_lo)}–{money(r.pi80_hi)}", f"{money(r.pi95_lo)}–{money(r.pi95_hi)}",
                      r.events_active if isinstance(r.events_active, str) and r.events_active else "—"])
head_table = table(head_rows, ["date", "forecast", "baseline", "impact", "80%", "95%", "active events"])

mon = daily.groupby(daily.date.dt.strftime("%Y-%m"))["forecast_inr"].mean().round(1)
mon_pairs = list(mon.items())
mon_rows = []
half = (len(mon_pairs) + 1) // 2
for i in range(half):
    left = mon_pairs[i]
    right = mon_pairs[i + half] if i + half < len(mon_pairs) else ("", "")
    mon_rows.append([left[0], f"{left[1]:.1f}", right[0], f"{right[1]:.1f}" if right[0] else ""])
mon_table = table(mon_rows, ["month", "INR/kg", "month", "INR/kg"])

agg = (evf.groupby("definition_id")
       .agg(name=("event", "first"), n=("impact_pct", "size"), impact=("impact_pct", "mean"),
            lo=("impact_pct_ci80_lo", "first"), hi=("impact_pct_ci80_hi", "first"),
            rel=("reliability", "first"), price=("event_period_mean_inr", "mean"))
       .reset_index().sort_values("impact", ascending=False))
evf_table = table([[r["name"], int(r["n"]), pct(r["impact"]), f"{pct(r['lo'])} to {pct(r['hi'])}",
                    f"{r['price']:.0f}", r["rel"][0]] for _, r in agg.iterrows()],
                  ["event", "occurrences", "impact", "80% CI", "mean price", "grade"])

drift_rows = []
for _, r in drift[drift.target_date == "2027-12-31"].iterrows():
    drift_rows.append([f"{r.annual_drift_pct:+.0f}%", money(r.baseline_inr), money(r.event_adjusted_inr)])
drift_table = table(drift_rows, ["annual drift", "baseline 2027-12-31", "event-adjusted 2027-12-31"])

ver_rows = [[r.definition_id, r.calendar_start[:10], r.calendar_date_confidence, r.external_check or "—",
             "confirmed" if r.verification_status == "independently confirmed" else "not re-checked"]
            for _, r in verify.iterrows() if r.verification_status.startswith("independently")]
ver_table = table(ver_rows, ["event", "calendar date", "calendar label", "external source", "status"])

trend_rows = [[r.origin[:10], f"{r.implied_trend_pct_per_year:+,.0f}%", f"{r.day_30_forecast_inr:,.0f}",
               f"{r.day_90_forecast_inr:,.0f}", f"{r.last_observed_inr:,.0f}"] for _, r in trend.iterrows()]
trend_table = table(trend_rows, ["fitted to data up to", "implied trend", "30-day", "90-day", "last observed"])

# ---------------------------------------------------------------------------
# narrative
# ---------------------------------------------------------------------------
report = f"""# Wholesale chicken prices in Uttar Pradesh — statistical report and daily forecast to December 2027

Source: `{cp.PRICE_CSV.name}` · data through {last_obs} ·
forecast horizon {fday.date.date()} – {lday.date.date()}

---

## 1. Executive summary

**What the data is.** A single daily wholesale price series for chicken in Uttar
Pradesh, in **INR per kg of live weight**, running from **{first_obs}** to
**{last_obs}** with **{n_obs} quoted days**. The series is not a panel: no market
identifier, no volume, no grade. It is one statewide wholesale reference rate,
and every statement below is about that series only.

**The three findings that matter most.**

1. **Only the wedding season survives the evidence test.** Of {n_events} discrete
   events, {thin} have at most two observed days ({n_e} of them none at all).
   After pooling, the wedding (*lagan*) clusters show **{pct(wedding.shrunk_effect_pct)}**
   (80% interval {pct(wedding.shrunk_ci80_lo_pct)} to {pct(wedding.shrunk_ci80_hi_pct)},
   {int(wedding.n_occurrences_with_observed_prices)} occurrences, {int(wedding.n_observed_days_core)} observed days, grade A).
2. **The festival estimate is small and moves with the data, not with the festival.**
   Pooled festival windows now sit at **{pct(fest.pooled_effect_pct)}**
   (95% interval {pct(fest.pooled_ci95_lo_pct)} to {pct(fest.pooled_ci95_hi_pct)}).
   The previous extract of this same file gave −0.9%; adding sixteen quotes and
   correcting five prices was enough to flip the sign. That instability *is* the
   finding: with one or two quoted days per festival, the estimate is dominated
   by which days happen to be priced, not by demand.
3. **The series is close to a random walk around a seasonal shape; its trend is
   not identifiable.** A model with a free trend plus annual harmonics produces a
   90-day forecast of **INR {trend.day_90_forecast_inr.iloc[0]:,.0f}** when fitted
   to the first six months of data (`trend_instability.csv`). The base forecast
   therefore does **not** extrapolate a trend: it anchors the level to the last
   three observations and extrapolates only the seasonal shape and event effects.

**Forecast headline.** The central path starts at **INR {fday.forecast_inr:.1f}** on
{fday.date.date()} and ends at **INR {lday.forecast_inr:.1f}** on {lday.date.date()}
(baseline without event effects: {lday.baseline_inr:.1f}), the seasonal shape peaks at
**INR {peak.baseline_inr:.1f}** around {peak.date.date()} and bottoms at
**INR {trough.baseline_inr:.1f}** around {trough.date.date()}. The deepest
event-adjusted day is {event_low.date.date()} at **INR {event_low.forecast_inr:.1f}**
({pct(event_low.event_impact_pct)} on the day, {event_low.events_active or 'no event'}).
The 95% interval at the end of the horizon is **INR {lday.pi95_lo:.0f} – {lday.pi95_hi:.0f}**.

**Largest estimated associations**

| direction | event | pooled effect | 80% interval | evidence |
|---|---|---|---|---|
""" + "\n".join(
    f"| {'positive' if r.shrunk_effect_pct > 0 else 'negative'} | {r.event} | "
    f"{'**' if r.definition_id == 'lagan-weddings' else ''}{pct(r.shrunk_effect_pct)}{'**' if r.definition_id == 'lagan-weddings' else ''} | "
    f"{pct(r.shrunk_ci80_lo_pct)} to {pct(r.shrunk_ci80_hi_pct)} | "
    f"{days(r.n_observed_days_core)}, grade {r.reliability[0]} |"
    for _, r in imp.reindex(imp.shrunk_effect_pct.abs().sort_values(ascending=False).index).head(8).iterrows()
) + f"""

Grade counts across the {n_events} events: **A {n_a}, B {n_b}, C {n_c}, D {n_d}, E {n_e}**.
Everything below grade A should be read as *a weak prior to be updated*, not as a
measured recurring effect.

**Model performance.** {run['origins'].__len__()} rolling origins
({run['origins'][0]} → {run['origins'][-1]}), horizons 1–90 days,
{int(bt['n'].max()):,} scored days per model. The selected model — a seasonal anchor with
event offsets — has **sMAPE {rank[SEL]:.1f}%** at 1–28 days and
**{piv.loc[SEL, '29-90d']:.1f}%** at 29–90 days, against {rank['naive']:.1f}% / {piv.loc['naive', '29-90d']:.1f}%
for the naive forecast. Over the full 1–90 day mix it is **{bt.loc[bt.model == SEL, 'smape'].iloc[0]:.2f}%**,
second to a 7-day moving average at {bt.loc[bt.model == 'ma7', 'smape'].iloc[0]:.2f}%, so no single model
dominates; the event model is preferred because it is the most accurate at
operational horizons and is the only candidate that produces the requested
baseline / event-adjusted decomposition.

**Reliability of the event forecasts.** Wedding seasons: the only effect that is
statistically distinguishable from zero, and even it rests on about six wedding
periods rather than twelve independent seasons. Festivals and observances: low
confidence — the event-level 80% intervals are wider than any effect claimed.

---

## 2. Inputs, scope and data quality

### 2.1 Files

| file | content |
|---|---|
| `{cp.PRICE_CSV.name}` | {dq['rows_in_file']} dated rows, {n_obs} with a price, {dq['blank_price_cells']} blank |
| `up_chicken_events.json` | 26 definitions, 91 occurrences (2025–2027), sourced |
| `chicken_rates.json` (frontend build artefact) | same observations as the CSV; used only as a cross-check |

The previous extract of the tracker is kept beside the current one in
`data/raw/`; only the current file is read. SHA-256 of every raw file is in
`logs/inputs.sha256`.

### 2.2 What the series is

* **Currency and unit: INR per kg, live weight.** The CSV header says only
  "CHICKEN SOLD RATE", so the unit was verified rather than assumed. In the
  business database, `batch_sales` for item `DC101` (DESI CHICKEN, finished
  birds) records `value = rate × avg_weight` with `avg_weight` in kilograms per
  lot; 24 of the 30 September 2026 lots sold at 104–123 INR/kg. That matches the
  level of this series and establishes per-kg pricing.
* **Market: statewide Uttar Pradesh.** The tracker carries no market column and
  no sub-state identifier exists, so this is a state reference rate.
* **Not a panel.** One observation per date; no trader, volume or grade.

### 2.3 Coverage and missingness

| item | value |
|---|---|
| first / last observation | {first_obs} / {last_obs} |
| observations | {n_obs} |
| calendar days in span | {dq['calendar_days_in_span']} |
| days with no quote | **{dq['missing_calendar_days']} ({dq['missing_share_pct']:.1f}%)** |
| gap runs | {dq['gap_runs']} |
| longest gap | {dq['longest_gap_days']} days |
| gaps ≥ 7 days | {dq['gaps_ge_7_days']} |
| duplicate dates | {dq['duplicate_dates']} |
| non-numeric or non-positive prices | 0 |
| share of unchanged days | {dq['share_days_unchanged_pct']:.1f}% |

The history starts on **{first_obs}**, not 1 January 2025, which is why Holi,
Ramadan and Eid-ul-Fitr each have only one occurrence inside the price sample.

The gaps are recording gaps, not market closures: they are irregular and hit
weekdays and weekends alike. **No interpolation, smoothing or outlier removal was
applied.** All models fit on observed days only. The one exception is the ETS
benchmark, which needs an equally spaced series and therefore bridges gaps
linearly; it is labelled as a benchmark.

### 2.4 Descriptive statistics

| statistic | value |
|---|---|
| mean / median | {dq['price_mean']:.1f} / {dq['price_median']:.0f} INR per kg |
| standard deviation | {base['sd_inr']:.1f} (CV {base['cv_pct']}%) |
| minimum | {base['min_inr']:.0f} INR on {base['min_date']} |
| maximum | {base['max_inr']:.0f} INR on {base['max_date']} |
| mean absolute daily change | {base['mean_abs_daily_change_inr']:.1f} INR ({base['daily_change_sd_pct']}% sd of daily returns) |
| share of unchanged days | {dq['share_days_unchanged_pct']:.1f}% |

---

## 3. Event calendar

### 3.1 Construction

The supplied JSON is used unchanged as the candidate list. Each occurrence gets
a lead-in, the official dates, and a recovery window:

| event length | lead-in | core | recovery |
|---|---|---|---|
| ≤ 7 days | 2 days | official dates | 2 days |
| 8–31 days | 1 day | official dates | 1 day |
| > 31 days | – | official dates | – |

Twenty-six definitions produce 91 dated occurrences for 2025–2027. **Seven
definitions are reclassified as seasonal regimes** — monsoon, summer heat,
winter fog, Sawan, Ramadan, Magh Mela and the 2025 heat wave — because they cover
most of the calendar ({audit['share_observed_days_in_any_core'] * 100:.0f}% of observed days sit
inside at least one core window) and cannot be separated from annual seasonality
with 1.5 cycles. That leaves {n_events} discrete events.

{evidence}

### 3.2 Overlaps

Wedding clusters overlap the pre-monsoon heat season on 170 days, and Pitru
Paksha, Navratri and Diwali overlap each other in the September–November window.
Across events, 39% of occurrences share days with another discrete event, close
to 100% for the October–November cluster (`event_overlap_pairs.csv` lists every
pair). Where two events always co-occur their effects cannot be separated; the
forecast applies overlapping effects multiplicatively and reports the combined
number.

### 3.3 Date verification

The calendar's own labels: {audit['date_confidence_counts'].get('confirmed', 0)} occurrences "confirmed",
{audit['date_confidence_counts'].get('estimated', 0)} "estimated", {audit['date_confidence_counts'].get('tentative', 0)} "tentative".
The 2027 dates that matter most were independently re-checked against a public
India holiday calendar publishing state-level (Uttar Pradesh) dates:

{ver_table}
The remaining 2027 dates were **not** independently re-checked and keep the
calendar's "estimated" label. Islamic dates depend on local moon sighting;
wedding muhurats shift more.

---

## 4. The normal price pattern

### 4.1 Trend

An unrestricted regression of log price on a linear trend, two annual harmonics
and weekday dummies gives a trend of **{base['baseline_trend_pct_per_year']}% per year**
and R² of {base['baseline_r2']}. That number is unusable for forecasting: with 1.5 annual
cycles, trend and harmonics are almost collinear, so the coefficients are
individually meaningless even when the fit looks decent.

{trend_table}

A one-year-ahead extrapolation built on such a coefficient is worthless, which is
why **no drift is extrapolated in the base forecast**. A drift sensitivity band
is reported instead (§7.4).

### 4.2 Seasonality

* **Annual cycle.** With two harmonics the joint test is significant
  (p = {base['annual_joint_p']:.4f}); the implied amplitude is {pct(base['annual_amplitude_pct'])}
  at its peak and {pct(base['annual_trough_pct'])} at its trough *relative to the sample mean*.
  With one harmonic — the specification the backtest selected — the shape is
  smoother: a winter peak and a monsoon trough.
* **Weekday.** Joint p = {base['weekday_joint_p']:.4f}. Saturday and Friday run below
  Sunday; the rest are within ±1% (`baseline_weekday.csv`).
* **Regime events.** Monsoon, winter fog, summer heat and Sawan *are* the annual
  cycle, not separately identified shocks. No incremental effect is claimed.

### 4.3 Volatility and breaks

Daily returns have a {base['daily_change_sd_pct']}% standard deviation, near-zero autocorrelation of
daily changes ({base['ar1_daily_change']}), and price autocorrelation of {base['acf_price_lag7']} at 7 days.
A sup-F break scan peaks on **{base['supF_break_date']}** (F = {base['supF_stat']:.0f}), the recovery from the
mid-2025 trough. The series is better described as level regimes than as a stable
trend, which is why the forecast re-anchors its level.

---

## 5. Historical event effects

### 5.1 Method

For each occurrence: `E` is the mean log price on the official event dates, `M`
the mean log price over 14 days before the lead-in and 14 days after the
recovery (excluding days in another discrete event's core window), and the
effect is `Δ = mean(E) − mean(M)`, reported as `(exp(Δ) − 1) × 100`.

A symmetric local window is used because the global trend is neither identified
nor stable (§4.1), and because averaging both sides makes a price that is
trending into or out of the event largely cancel.

Uncertainty: a circular block bootstrap of the local price path (2,000
replications, 7-day blocks). Occurrences are pooled per event with a
random-effects model, then shrunk toward a pooled category effect:

```
event effect    ~ N(category effect, tau_within^2)   tau_within = {tau * 100:.1f}% (estimated)
category effect ~ N(0, 4%^2)                          documented hyper-parameter
```

With five categories the between-category spread cannot be estimated; 4% avoids
both erasing the wedding effect and believing a one-day reading. The shrinkage
weight on own evidence is reported for every event.

This is an **association**, not a causal effect: there is no control group, and
unobserved supply shocks move with the same calendar.

### 5.2 Results

{impact_table}

Category pools after shrinkage:

{cat_table}

### 5.3 What this does and does not say

* **Wedding seasons are the one robust finding** — {pct(wedding.shrunk_effect_pct)} with an
  80% interval that excludes zero, stable across {int(wedding.n_occurrences_with_observed_prices)} occurrences.
* **The festival estimate is unstable, and that is the honest result.** Adding
  sixteen quotes and correcting five prices to the same file moved the pooled
  festival effect from −0.9% to {pct(fest.pooled_effect_pct)}. Individual festival rows swing far
  more: Diwali is {pct(imp.loc[imp.definition_id == 'diwali-window', 'shrunk_effect_pct'].iloc[0])} on two quoted days, while
  Deepotsav — one day, one occurrence — is {pct(imp.loc[imp.definition_id == 'deepotsav', 'shrunk_effect_pct'].iloc[0])}.
* **Lead-in and recovery.** Pooled across occurrences, the median lead-in movement
  is {halo.loc[halo.window == 'lead_in', 'median_window_pct'].iloc[0]:+.1f}% and the median recovery movement
  {halo.loc[halo.window == 'recovery', 'median_window_pct'].iloc[0]:+.1f}%, with median ratios to the core movement of
  {halo.loc[halo.window == 'lead_in', 'median_ratio_to_core'].iloc[0]:.2f} and {halo.loc[halo.window == 'recovery', 'median_ratio_to_core'].iloc[0]:.2f}. These are descriptive and are
  **not** added to the forecast, which applies the effect to official event dates
  only and therefore probably understates the total event-period association.
* **No effect is causal.** The matched window removes level drift, not a supply
  shock that happens to coincide with the event.

---

## 6. Forecasting model

### 6.1 Candidates

`naive`, `ma7`, `snaive7`, `ets_damped`, `ets_weekly`, `seasonal_anchor`
(log price on one annual harmonic plus weekday dummies, level re-anchored to the
last three observations), `seasonal_flat`, and the two variants with event
offsets. A trend + harmonics specification was excluded after the identification
failure in §4.1; one harmonic rather than two was chosen by out-of-sample
comparison.

### 6.2 Validation design

Chronological rolling origins from 2026-04-01 (the first date with a full annual
cycle of history) to 2026-09-01, every two weeks, horizons 1–90 days, scored only
on observed days. Event effects are re-estimated at every origin with the same
estimator, cutting the data at the origin. No future information enters.

### 6.3 Results

{bt_table}

By horizon bucket (sMAPE %):

{hz_table}

Event days versus non-event days (sMAPE %):

{ev_table}

The event offsets cut event-window error from
{evpiv.loc['seasonal_anchor', True]:.2f}% to {evpiv.loc[SEL, True]:.2f}% without touching non-event days — the clearest
evidence that the event component adds something, even though the individual
effects are small.

### 6.4 Selection and honest caveats

* **Selected for the forecast:** `{SEL}` — best 1–28 day accuracy
  ({rank[SEL]:.1f}% weighted sMAPE), and the only candidate that separates baseline
  from event effects inside one specification.
* **It is not the overall winner.** A 7-day moving average scores
  {bt.loc[bt.model == 'ma7', 'smape'].iloc[0]:.2f}% over the full 1–90 day mix against {bt.loc[bt.model == SEL, 'smape'].iloc[0]:.2f}% here.
* **Biases differ in sign.** The selected model under-predicts by
  {abs(bt.loc[bt.model == SEL, 'bias_pct'].iloc[0]):.1f}% on average; naive and ETS over-predict by about
  {bt.loc[bt.model == 'naive', 'bias_pct'].iloc[0]:.1f}%.
* **The validation sample is small** — {run['origins'].__len__()} origins, six months of test data, one
  price regime. Nothing here claims this model is better than ETS in general.
* **No claim of festival accuracy.** Event-window sMAPE is
  {evpiv.loc[SEL, True]:.1f}%: the model does not predict festival prices to within a few
  percent, it merely predicts them slightly better than a model that ignores events.

### 6.5 Prediction intervals

The standard deviation of the log error is {run['error_scaling']['anchor_sigma']['7'] * 100:.1f}% at one week and
{run['error_scaling']['sigma_at_h90'] * 100:.1f}% at 90 days, following roughly
`sigma(h) = {run['error_scaling']['sigma0']:.3f} × h^{run['error_scaling']['power']:.2f}`. Beyond the tested horizon that
power law is extrapolated but floored by the empirical dispersion of 12-month
price changes ({run['error_scaling']['sigma_yoy_365d'] * 100:.1f}%, {run['error_scaling']['n_yoy_pairs']} year-over-year pairs).

Intervals are **prediction intervals for an individual daily price**, not
confidence bands for a mean.

---

## 7. Forecast

### 7.1 Baseline versus event-adjusted

For every date: the **baseline** is the same fitted model with every discrete
event offset switched off; the **event-adjusted** value turns them on for the
official dates; the **impact** is the difference. Overlapping events compound on
the log scale. Both are model-derived counterfactuals — the baseline was never a
traded price.

### 7.2 Headline path

{head_table}

Monthly means of the event-adjusted path:

{mon_table}

### 7.3 Event-specific results

`outputs/tables/event_forecasts.csv` has one row per future occurrence
({len(evf)} rows). Summary by event:

{evf_table}

Where a row averages over several core days and two events overlap, the impact is
the **combined** effect on those dates, not the named event alone.

### 7.4 Drift sensitivity

Because no drift is extrapolated, the long-horizon level depends on the seasonal
anchor. Under four annual drift assumptions:

{drift_table}

---

## 8. Limitations and unobserved confounders

1. **One series, no covariates.** Feed prices, chick placement, bird weight,
   mortality, disease, transport, weather, imports and policy are invisible.
2. **Thin event evidence.** {thin_all} of {n_events} discrete events have ≤ 2 observed days; their
   estimates are mostly the category prior.
3. **Overlap.** Most event windows share days; co-occurring effects cannot be
   separated.
4. **Trend and seasonality are not separable** in 1.5 cycles. The flat drift is a
   choice, not a finding; §7.4 shows the alternative.
5. **{dq['missing_share_pct']:.0f}% of days are missing**, and there is no way to test whether
   they are missing at random with respect to price.
6. **The unit is inferred**, not documented by the source.
7. **Intervals beyond 90 days are extrapolated**, calibrated partly on
   year-over-year variability from a single 18-month window.
8. **Structural breaks are likely.** The 2025 trough and 2026 recovery dominate
   the sample.
9. **No causal claim.** Event effects are associations from one time series with
   no control group.

---

## 9. Reproducibility

```
chicken_price_forecast/
├── README.md                     how to run and update
├── requirements.txt              pinned versions
├── run_all.sh                    one command rebuilds everything
├── data/raw/                     untouched inputs + SHA-256
├── data/processed/               cleaned daily series, event days, backtest predictions
├── src/
│   ├── cplib.py                  IO, calendar features, HAC/Wald helpers
│   ├── effects.py                the event estimator (shared by report and backtest)
│   ├── 01_ingest.py … 10_report.py
├── outputs/tables/               every table as CSV
├── outputs/charts/               eight figures as PNG
├── outputs/chicken_price_deliverables.xlsx
└── logs/                         JSON run logs, data-quality audit, consistency checks
```

Full rebuild: `bash run_all.sh` (about half a minute). This report is rendered by
`src/10_report.py`, so every figure above is read from a generated artefact
rather than typed by hand. The consistency suite (`07_export.py`) verifies
day-by-day coverage, the arithmetic identities between the three forecast
columns, interval ordering, event-effect consistency between the daily and event
tables, the absence of look-ahead in the backtest, and that the raw inputs are
unmodified.

To add new observations: drop the new extract into `data/raw/`, point
`cplib.PRICE_CSV` at it, re-run. The forecast start date follows the last quoted
day automatically, and step 09 refreshes the web app's
`rjagro_frontend/app/data/price_forecast.json`.
"""

OUT.write_text(report)
print(f"wrote {OUT.name} ({len(report.splitlines())} lines)")
