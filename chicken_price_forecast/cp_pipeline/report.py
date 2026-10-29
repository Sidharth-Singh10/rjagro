"""Render the run's report from facts and conclusions.

Markdown only. No number is computed here; if a figure is needed it is read out
of `facts`, which is why the report cannot disagree with the app payload.
"""
from __future__ import annotations

from .config import Config


def _pct(v, d=1):
    return "—" if v is None else f"{v:+.{d}f}%".replace("-", "\u2212")


def _inr(v, d=1):
    return "—" if v is None else f"\u20b9{v:,.{d}f}"


def _table(header, rows) -> str:
    out = "| " + " | ".join(header) + " |\n"
    out += "|" + "|".join(["---"] * len(header)) + "|\n"
    for r in rows:
        out += "| " + " | ".join(str(c) for c in r) + " |\n"
    return out


def render(facts: dict, conclusions: list[dict], cfg: Config, meta: dict) -> str:
    d = facts["data"]
    f = facts["forecast"]
    v = facts["validation"]
    items = facts["events"]["items"]
    cats = facts["events"]["categories"]

    rows = [[e["name"], e["category"], e["occurrences"], e["observedDays"],
             _pct(e["rawPct"], 2), _pct(e["pooledPct"], 2),
             f"{_pct(e['pooledLo80'])} to {_pct(e['pooledHi80'])}", e["reliability"]]
            for e in items]
    ev_table = _table(["event", "category", "occ", "days", "raw", "pooled", "80% CI", "grade"], rows)

    cat_table = _table(
        ["category", "occurrences", "raw", "pooled", "95% CI"],
        [[c["category"], c["occurrences"], _pct(c["rawPct"], 2), _pct(c["pooledPct"], 2),
          f"{_pct(c['lo95'])} to {_pct(c['hi95'])}"] for c in cats])

    v_table = _table(
        ["model", "n", "MAE ₹", "RMSE ₹", "sMAPE %", "bias ₹"],
        [[m["model"], m["n"], f"{m['mae']:.2f}", f"{m['rmse']:.2f}",
          f"**{m['smape']:.2f}**" if m["model"] == v["selected"] else f"{m['smape']:.2f}",
          f"{m['bias']:+.2f}".replace("-", "\u2212")] for m in v["models"]])

    head_rows = []
    for target in (f["start"], f["peak"]["date"], f["trough"]["date"], f["end"]):
        row = next((r for r in f["daily"] if r["date"] == target), None)
        if row:
            head_rows.append([row["date"], _inr(row["forecast"]), _inr(row["baseline"]),
                              _pct(row["impactPct"]),
                              f"{_inr(row['lo80'])}–{_inr(row['hi80'])}",
                              f"{_inr(row['lo95'])}–{_inr(row['hi95'])}",
                              ", ".join(row["events"]) or "—"])
    head_table = _table(["date", "forecast", "baseline", "impact", "80%", "95%", "events"], head_rows)

    mon_rows = []
    monthly = f["monthly"]
    half = (len(monthly) + 1) // 2
    for i in range(half):
        left = monthly[i]
        right = monthly[i + half] if i + half < len(monthly) else None
        mon_rows.append([left["month"], _inr(left["forecast"]),
                         right["month"] if right else "", _inr(right["forecast"]) if right else ""])
    mon_table = _table(["month", "INR/kg", "month", "INR/kg"], mon_rows)

    bullets = "\n".join(f"- **{c['id'].replace('-', ' ')}.** {c['text']}" for c in conclusions)

    return f"""# Wholesale chicken price — run report

Generated {meta['generated_at']} from data through **{d['last']}**
({d['observations']} quoted days). Model `{v['selected']}`; run `{meta['run_id']}`;
dataset `{meta['dataset_hash']}`.

## What this run says

{bullets}

## Data

| item | value |
|---|---|
| observations | {d['observations']} |
| first / last quote | {d['first']} / {d['last']} |
| calendar days in span | {d['spanDays']} |
| days with no quote | {d['missingDays']} ({d['missingPct']}%) |
| gap runs / longest gap | {d['gapRuns']} / {d['longestGap']} days |
| mean / min / max | {d['mean']:.1f} / {d['min']:.0f} / {d['max']:.0f} INR per kg |
| source | {d['source'].get('kind', 'unknown')} |

Missing days are never filled. Models fit on quoted days only.

## Event estimates

{ev_table}

{cat_table}

`raw` is the matched-window difference; `pooled` shrinks it toward the category
level so a one-day event cannot pose as a recurring effect. Grade A is the only
level with enough independent occurrences to act on.

## Forecast

{head_table}

{mon_table}

The baseline is the same fitted model with every event offset switched off. It is
a counterfactual, not an observed price. Bands are prediction intervals for a
single day, not for the mean path.

## Validation

{v_table}

Rolling origins, horizons 1–90 days, scored only on quoted days. Selected model:
**{v['selected']}** — sMAPE {v['smape1to7']}% (1–7 d), {v['smape8to28']}% (8–28 d),
{v['smape29to90']}% (29–90 d). Error curve `sigma(h) = {v['sigma']['sigma0']} × h^{v['sigma']['power']}`,
floored by a 12-month dispersion of {v['yoySd']}.

## Method, in one paragraph

Event effects come from a matched-window study: the mean log price inside an
event is compared with the 14 days before and after, excluding other events'
core days, with a {cfg.bootstrap_reps}-draw block bootstrap for uncertainty. Occurrences
are pooled per event and shrunk toward a pooled category effect
(category sd {cfg.shrinkage_tau_between:.0%}). The forecast is a seasonal anchor —
{f'one annual harmonic, weekday terms, no trend' if cfg.fourier_harmonics == 1 else f'{cfg.fourier_harmonics} annual harmonics'} —
with the level re-anchored to the last {cfg.anchor_observations} observations and event
offsets added per date. A trend is deliberately not extrapolated: with 1.5 annual
cycles the trend and the cycle are not separately identified.

## Limits

One price series and a calendar. Feed costs, arrivals, disease, weather and
policy are invisible, and every event estimate is an association in a thin
sample rather than a causal effect. Intervals beyond 90 days are extrapolated.

## Reproducing

```
python -m cp_pipeline run --prices <csv> --out <dir>
```

Config fingerprint `{cfg.fingerprint()}`. Same dataset hash and config hash
produce the same payload.
"""
