"""Step 06 - charts.

Seven required figures plus a data-coverage panel. Every chart is a standalone
PNG in outputs/charts with a title, labelled axes and units.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Patch
from matplotlib.lines import Line2D

import cplib as cp

plt.rcParams.update({
    "figure.dpi": 150, "savefig.dpi": 150, "font.size": 9,
    "axes.titlesize": 11, "axes.titleweight": "bold", "axes.labelsize": 9,
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.grid": True, "grid.alpha": 0.25, "grid.linewidth": 0.6,
    "legend.frameon": False, "figure.autolayout": False,
})

NAVY = "#12395B"
BLUE = "#2E6E9E"
TEAL = "#2A9D8F"
AMBER = "#E9A63A"
RED = "#C0392B"
GREY = "#8A8A8A"
PURPLE = "#6A4C93"

CAT_COLOR = {"festival": PURPLE, "observance": TEAL, "islamic": "#B5651D",
             "wedding": AMBER, "fair": "#7A8B99", "seasonal": BLUE}

prices = cp.observed_prices()
et = cp.load_event_calendar()
occ = et.occurrences
daily = pd.read_csv(cp.TABLES / "daily_forecast.csv", parse_dates=["date"])
imp = pd.read_csv(cp.TABLES / "historical_event_impact.csv")
occ_hist = pd.read_csv(cp.TABLES / "historical_event_occurrences.csv", parse_dates=["start_date", "end_date"])
bt = pd.read_csv(cp.PROC / "backtest_predictions.csv", parse_dates=["origin", "date"])
by_h = pd.read_csv(cp.TABLES / "model_backtest_by_horizon.csv")


def save(fig, name):
    fig.tight_layout()
    fig.savefig(cp.CHARTS / name, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("wrote", name)


# ---------------------------------------------------------------------------
# 0. data coverage
# ---------------------------------------------------------------------------
monthly = pd.read_csv(cp.TABLES / "data_quality_monthly.csv")
fig, ax = plt.subplots(figsize=(11, 3.6))
ax.bar(pd.to_datetime(monthly["month"]), monthly["calendar_days"], width=24,
       color="#E7E7E7", label="calendar days in month")
ax.bar(pd.to_datetime(monthly["month"]), monthly["observed_days"], width=24,
       color=NAVY, label="days with a quoted price")
ax.set_title("Price observations per month, April 2025 - October 2026")
ax.set_ylabel("days"); ax.set_xlabel("month")
ax.set_ylim(0, 42)
ax.legend(loc="upper right", ncol=2, fontsize=8, frameon=True, framealpha=0.9, edgecolor="none")
ax.axhline(monthly["calendar_days"].mean(), color=GREY, lw=0.8, ls="--")
ax.text(pd.to_datetime(monthly["month"].iloc[-1]), 33, "partial\nmonth", fontsize=6.5,
        ha="center", color=GREY)
save(fig, "00_data_coverage.png")


# ---------------------------------------------------------------------------
# 1. history with event windows
# ---------------------------------------------------------------------------
fig, (ax, axb) = plt.subplots(2, 1, figsize=(13, 6.2), height_ratios=[5, 1], sharex=True)
ax.plot(prices.index, prices.values, color=NAVY, lw=1.0, label="observed wholesale price")
ax.scatter(prices.index, prices.values, s=6, color=NAVY, zorder=3)

for cat, col in [("festival", PURPLE), ("observance", TEAL), ("wedding", AMBER), ("islamic", "#B5651D")]:
    shade = occ[(occ.category == cat) & (~occ.is_regime)]
    for _, r in shade.iterrows():
        ax.axvspan(r.start_date, r.end_date, color=col, alpha=0.16 if cat == "wedding" else 0.22, lw=0)

ax.set_title("UP wholesale chicken price with discrete event windows, April 2025 - October 2026")
ax.set_ylabel("INR per kg (live weight)")
ax.set_ylim(40, 155)
ax.set_xlim(prices.index.min() - pd.Timedelta(days=7), prices.index.max() + pd.Timedelta(days=7))
ax.text(0.995, 0.02, "axis starts at INR 40", transform=ax.transAxes, fontsize=7,
        color=GREY, ha="right")
handles = [Line2D([], [], color=NAVY, lw=1.2, label="observed price")] + \
          [Patch(color=CAT_COLOR[c], alpha=0.4, label=c) for c in ["festival", "observance", "wedding", "islamic"]]
leg = ax.legend(handles=handles, loc="lower left", ncol=5, fontsize=8, frameon=True,
                framealpha=0.9, edgecolor="none")
leg.get_frame().set_facecolor("white")

for cat, col in [("festival", PURPLE), ("observance", TEAL), ("wedding", AMBER), ("islamic", "#B5651D")]:
    shade = occ[(occ.category == cat) & (~occ.is_regime)]
    for _, r in shade.iterrows():
        axb.axvspan(r.start_date, r.end_date, color=col, alpha=0.8, lw=0, ymin=0.05, ymax=0.45)
for _, r in occ[(occ.category == "wedding")].iterrows():
    axb.axvspan(r.start_date, r.end_date, color=AMBER, alpha=0.8, lw=0, ymin=0.55, ymax=0.95)
axb.set_yticks([]); axb.set_xlabel("date")
axb.set_title("event timeline (lower band: festivals / observances / islamic; upper band: wedding seasons)",
              fontsize=9, loc="left")
axb.grid(False)
axb.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
axb.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
save(fig, "01_history_with_events.png")


# ---------------------------------------------------------------------------
# 2. event window paths
# ---------------------------------------------------------------------------
selected = ["diwali-window", "holi", "eid-ul-adha", "janmashtami", "pitru-paksha", "lagan-weddings"]
fig, axes = plt.subplots(2, 3, figsize=(13, 6.4), sharey=True)
for ax, eid in zip(axes.ravel(), selected):
    sub = occ_hist[occ_hist.definition_id == eid]
    n_drawn = 0
    for _, r in sub.iterrows():
        ref = prices[prices.index <= r.start_date]
        idx = pd.date_range(r.start_date - pd.Timedelta(days=21),
                            r.start_date + pd.Timedelta(days=41))
        vals = prices.reindex(idx)
        if len(ref) == 0 or vals.notna().sum() < 8:
            continue
        rel = np.log(vals / ref.iloc[-1])
        x = np.array([(d - r.start_date).days for d in idx])
        ax.plot(x, rel.values * 100, color=GREY, lw=0.9, alpha=0.5)
        n_drawn += 1
    dur = (pd.Timestamp(sub.iloc[0].end_date) - pd.Timestamp(sub.iloc[0].start_date)).days
    ax.axvspan(-0.5, dur + 0.5, color=CAT_COLOR.get(sub.iloc[0].category, BLUE), alpha=0.15)
    ax.axhline(0, color="k", lw=0.7)
    ax.axvline(0, color="k", lw=0.7, ls=":")
    ax.set_title(f"{sub.iloc[0]['event']}\n{n_drawn} of {len(sub)} occurrences plotted", fontsize=9)
    ax.set_xlabel("days relative to event start")
    ax.set_xlim(-22, 42)
fig.supylabel("price vs last pre-event observation, %", x=0.012, fontsize=9)
fig.suptitle("Price paths around selected events (each grey line is one occurrence)",
             fontweight="bold", y=1.02)
save(fig, "02_event_window_paths.png")


# ---------------------------------------------------------------------------
# 3. event impact with uncertainty
# ---------------------------------------------------------------------------
d = imp.sort_values("shrunk_effect_pct").reset_index(drop=True)
fig, ax = plt.subplots(figsize=(9.5, 6.6))
y = np.arange(len(d))
for i, r in d.iterrows():
    col = CAT_COLOR.get(r["category"], BLUE)
    ax.plot([r["shrunk_ci95_lo_pct"], r["shrunk_ci95_hi_pct"]], [i, i], color=col, lw=1.4, alpha=0.55)
    ax.plot([r["shrunk_ci80_lo_pct"], r["shrunk_ci80_hi_pct"]], [i, i], color=col, lw=3.2, alpha=0.85,
            solid_capstyle="butt")
    ax.scatter(r["shrunk_effect_pct"], i, color=col, s=34, zorder=4,
               edgecolor="white", linewidth=0.6)
ax.axvline(0, color="k", lw=0.9)
ax.set_yticks(y)
ax.set_yticklabels([
    f"{r['definition_id']}  (n={int(r['n_occurrences_with_observed_prices'])})"
    if r["n_occurrences_with_observed_prices"] > 0 else
    f"{r['definition_id']}  (category prior)"
    for _, r in d.iterrows()], fontsize=8)
ax.set_xlabel("estimated association with the event window, % of baseline price")
ax.set_title("Estimated event association with 80% and 95% intervals\n"
             "(empirical-Bayes shrunk; thin bars = 95%, thick bars = 80%)")
ax.legend(handles=[Patch(color=CAT_COLOR[c], label=c) for c in ["festival", "observance", "islamic", "wedding", "fair"]],
          loc="lower right", fontsize=8)
save(fig, "03_event_impact_intervals.png")


# ---------------------------------------------------------------------------
# 4. ranked impacts
# ---------------------------------------------------------------------------
d2 = imp[np.isfinite(imp["shrunk_effect_pct"])].sort_values("shrunk_effect_pct")
fig, ax = plt.subplots(figsize=(9.5, 5.6))
cols = [RED if v > 0 else TEAL for v in d2["shrunk_effect_pct"]]
ax.barh(d2["definition_id"], d2["shrunk_effect_pct"], color=cols, alpha=0.85)
for i, (_, r) in enumerate(d2.iterrows()):
    off = 0.25 if r["shrunk_effect_pct"] >= 0 else -0.25
    ax.text(r["shrunk_effect_pct"] + off, i, f"{r['shrunk_effect_pct']:+.1f}%  [{r['reliability'][0]}]",
            va="center", ha="left" if r["shrunk_effect_pct"] >= 0 else "right", fontsize=7.5)
ax.axvline(0, color="k", lw=0.9)
ax.set_xlabel("estimated association with the event window, % (negative = below baseline)")
ax.set_title("Ranked event associations: highest and lowest estimated price impact")
ax.set_xlim(d2["shrunk_effect_pct"].min() - 3, d2["shrunk_effect_pct"].max() + 3)
ax.legend(handles=[Patch(color=RED, alpha=.85, label="price above baseline"),
                   Patch(color=TEAL, alpha=.85, label="price below baseline")],
          loc="lower right", fontsize=8)
save(fig, "04_ranked_event_impacts.png")


# ---------------------------------------------------------------------------
# 5. backtest
# ---------------------------------------------------------------------------
model = "seasonal_anchor_events"
sel = bt[(bt.model == model) & (bt.h <= 7)].sort_values("date")
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 7.4), height_ratios=[3, 2])
mask = (prices.index >= bt.date.min()) & (prices.index <= bt.date.max())
ax1.plot(prices.index[mask], prices.values[mask], color=NAVY, lw=1.0, label="actual price")
for o, grp in sel.groupby("origin"):
    ax1.plot(grp["date"], grp["pred_inr"], color=RED, lw=1.4, alpha=0.85,
             label="1-7 day-ahead forecast" if o == sel.origin.min() else None)
    ax1.scatter([o], [prices.reindex([o]).iloc[0]] if o in prices.index else [np.nan], s=10, color="k", zorder=5)
ax1.set_ylabel("INR per kg")
ax1.set_ylim(55, 165)
ax1.set_title("Forecasts issued at each rolling origin vs the price that followed")
ax1.legend(loc="upper left", ncol=2, fontsize=8)

piv = by_h.pivot(index="model", columns="bucket", values="smape")
order = ["seasonal_anchor_events", "seasonal_anchor", "ets_weekly", "ma7", "naive"]
order = [m for m in order if m in piv.index]
x = np.arange(len(order)); w = 0.26
for i, b in enumerate(["1-7d", "8-28d", "29-90d"]):
    ax2.bar(x + (i - 1) * w, piv.loc[order, b].values, width=w, label=b,
            color=[BLUE, TEAL, AMBER][i], alpha=0.9)
ax2.set_xticks(x); ax2.set_xticklabels([o.replace("seasonal_anchor", "seasonal anchor") for o in order], fontsize=8)
ax2.set_ylabel("sMAPE, % (lower is better)")
ax2.set_title("Out-of-sample error by horizon bucket")
ax2.legend(title="horizon", ncol=3, loc="upper left", fontsize=8)
ax2.set_ylim(0, max(piv.loc[order].max()) * 1.25)
save(fig, "05_backtest.png")


# ---------------------------------------------------------------------------
# 6. forecast fan
# ---------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(13, 5.6))
ax.plot(prices.index, prices.values, color=NAVY, lw=1.1, label="observed")
ax.plot(daily.date, daily.forecast_inr, color=RED, lw=0.7, alpha=0.45)
ax.plot(daily.date, daily.forecast_inr.rolling(7, center=True, min_periods=1).mean(),
        color=RED, lw=1.5, label="event-adjusted forecast (7-day mean)")
ax.plot(daily.date, daily.baseline_inr.rolling(7, center=True, min_periods=1).mean(),
        color=BLUE, lw=1.0, ls="--", alpha=0.9, label="baseline (7-day mean)")
roll = lambda x: pd.Series(x).rolling(7, center=True, min_periods=1).mean()
ax.fill_between(daily.date, roll(daily.pi80_lo), roll(daily.pi80_hi), color=RED, alpha=0.16,
                label="80% prediction interval")
ax.fill_between(daily.date, roll(daily.pi95_lo), roll(daily.pi95_hi), color=RED, alpha=0.08,
                label="95% prediction interval")
ax.axvline(cp.FORECAST_START, color="k", lw=0.9, ls=":")
ax.text(cp.FORECAST_START, 152, " forecast start", fontsize=8, va="top")
ax.set_ylim(0, 210)
ax.set_ylabel("INR per kg (live weight)")
ax.set_title("Wholesale chicken price: history and daily forecast to 31 December 2027\n"
             "(thin line = daily values; thick line = 7-day centred mean)")
ax.legend(loc="lower left", ncol=5, fontsize=8, frameon=True, framealpha=0.9,
          edgecolor="none")
ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
save(fig, "06_forecast_fan.png")


# ---------------------------------------------------------------------------
# 7. forecast with synchronised event timeline
# ---------------------------------------------------------------------------
fig, (ax, axb) = plt.subplots(2, 1, figsize=(13, 6.6), height_ratios=[4, 1.3], sharex=True)
hist = prices[prices.index >= pd.Timestamp("2026-04-01")]
ax.plot(hist.index, hist.values, color=NAVY, lw=1.1, label="observed")
ax.plot(daily.date, daily.forecast_inr, color=RED, lw=0.7, alpha=0.45)
ax.plot(daily.date, daily.forecast_inr.rolling(7, center=True, min_periods=1).mean(),
        color=RED, lw=1.5, label="forecast (7-day mean)")
roll7 = lambda x: pd.Series(x).rolling(7, center=True, min_periods=1).mean()
ax.fill_between(daily.date, roll7(daily.pi80_lo), roll7(daily.pi80_hi), color=RED, alpha=0.15,
                label="80% interval")
ax.fill_between(daily.date, roll7(daily.pi95_lo), roll7(daily.pi95_hi), color=RED, alpha=0.07,
                label="95% interval")
ax.axvline(cp.FORECAST_START, color="k", lw=0.9, ls=":")
ax.set_ylim(0, 190); ax.set_ylabel("INR per kg")
ax.set_title("Forecast to December 2027 with the event calendar that drives the adjustments")
ax.legend(loc="lower left", ncol=5, fontsize=8, frameon=True, framealpha=0.9, edgecolor="none")

lanes = {"wedding": 4, "festival": 3, "islamic": 2, "observance": 1, "fair": 0.4}
for _, r in occ[(occ.start_date >= pd.Timestamp("2026-04-01")) & (~occ.is_regime)].iterrows():
    y0 = lanes.get(r.category, 0.4)
    axb.barh(y0, (r.end_date - r.start_date).days + 1, left=r.start_date, height=0.62,
             color=CAT_COLOR.get(r.category, BLUE), alpha=0.85)
axb.set_yticks(list(lanes.values())); axb.set_yticklabels(list(lanes.keys()), fontsize=8)
axb.set_xlabel("date"); axb.grid(False)
axb.set_title("discrete events in the forecast period (regime events such as monsoon and winter fog excluded)",
              fontsize=8, loc="left")
axb.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
axb.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
save(fig, "07_forecast_with_timeline.png")

print("charts complete")
