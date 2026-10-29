"""Step 11 - draw the pipeline that produces the numbers.

Renders `outputs/charts/08_pipeline_map.png` and `.svg`. The card contents are
literals; the counts on them are read from the run logs so the picture cannot
drift from the artefacts.
"""
from __future__ import annotations

import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

import cplib as cp

dq = json.loads((cp.LOGS / "data_quality.json").read_text())
audit = json.loads((cp.LOGS / "event_calendar_audit.json").read_text())
checks = json.loads((cp.LOGS / "consistency_checks.json").read_text())

INK = "#12395B"
MUTED = "#5f6f7e"
HAIR = "#dde4ec"
ACCENT = "#a6761a"
GREEN = "#2e8b64"
PAPER = "#ffffff"
WASH = "#f5f8fb"

W, H = 180, 104
fig = plt.figure(figsize=(W / 10, H / 10), dpi=150)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.axis("off")
fig.patch.set_facecolor(PAPER)


def stage_card(x, y, w, h, kicker, title, lines, outputs, colour=INK):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=1.4",
                                linewidth=1.0, edgecolor=colour, facecolor=PAPER, zorder=2))
    hh = 10.5
    ax.add_patch(FancyBboxPatch((x, y + h - hh), w, hh, boxstyle="round,pad=0,rounding_size=1.4",
                                linewidth=0, facecolor=colour, zorder=3))
    ax.add_patch(plt.Rectangle((x, y + h - hh), w, 2.0, linewidth=0, facecolor=colour, zorder=3))
    ax.text(x + 3.4, y + h - 3.4, kicker, fontsize=5.6, color="#c8d6e4", va="center", zorder=4)
    ax.text(x + 3.4, y + h - 7.2, title, fontsize=7.8, color=PAPER, va="center", weight="bold", zorder=4)

    ty = y + h - hh - 4.2
    for line in lines:
        ax.text(x + 3.2, ty, "–", fontsize=6, color=ACCENT, va="top", zorder=4)
        ax.text(x + 5.4, ty, line, fontsize=6.1, color="#2f3d4b", va="top", zorder=4)
        ty -= 4.7

    ax.plot([x + 2.6, x + w - 2.6], [y + 1.4 + 4.2 * len(outputs), y + 1.4 + 4.2 * len(outputs)],
            color=HAIR, lw=0.8, zorder=4)
    oy = y + 1.4 + 4.2 * (len(outputs) - 1)
    for line in outputs:
        ax.text(x + 3.2, oy, line, fontsize=5.5, color=MUTED, family="monospace", va="center", zorder=4)
        oy -= 4.2


def arrow(x1, y1, x2, y2, colour=INK, rad=0.0, lw=1.1):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=8,
                                 linewidth=lw, color=colour,
                                 connectionstyle=f"arc3,rad={rad}", zorder=1))


# ---------------------------------------------------------------------------
# title
# ---------------------------------------------------------------------------
ax.text(5, 99, "How the forecast numbers are produced", fontsize=13.5, weight="bold", color=INK)
ax.text(5, 94.4,
        "Every figure in the report and in the Analytics tab comes off this chain. "
        "One command re-runs it end to end; no number is copied by hand.",
        fontsize=6.9, color=MUTED)

# ---------------------------------------------------------------------------
# inputs
# ---------------------------------------------------------------------------
inputs = [
    dict(x=5, w=52, kicker="INPUT · PRICE CSV", title="Wholesale rate tracker",
         big=f"{dq['observations']} quoted days",
         small=[f"{dq['first_observation']} -> {dq['last_observation']}  ·  INR per kg",
                f"{dq['missing_calendar_days']} blank days stay blank"]),
    dict(x=61, w=52, kicker="INPUT · EVENT JSON", title="Festival & season calendar",
         big=f"{audit['definitions']} definitions · {audit['occurrences']} occurrences",
         small=["2025 - 2027, each dated and sourced", "7 long phases become seasonality"]),
]
in_y, in_h = 78.5, 13
for box in inputs:
    x, w = box["x"], box["w"]
    ax.add_patch(FancyBboxPatch((x, in_y), w, in_h, boxstyle="round,pad=0,rounding_size=1.2",
                                linewidth=1.0, edgecolor="#2f4f6f", facecolor=WASH, zorder=2))
    ax.text(x + 3.2, in_y + in_h - 2.9, box["kicker"], fontsize=5.4, color=MUTED, va="center", zorder=4)
    ax.text(x + 3.2, in_y + in_h - 6.3, box["title"], fontsize=7.2, color=INK, va="center",
            weight="bold", zorder=4)
    ax.text(x + 3.2, in_y + 4.6, box["big"], fontsize=6.6, color=INK, va="center", zorder=4)
    ax.text(x + 3.2, in_y + 2.5, box["small"][0], fontsize=5.4, color=MUTED, va="center", zorder=4)
    ax.text(x + 3.2, in_y + 1.1, box["small"][1], fontsize=5.4, color=MUTED, va="center", zorder=4)

# ---------------------------------------------------------------------------
# stages
# ---------------------------------------------------------------------------
st_y, st_h = 32, 34
st_w, gap = 32.4, 2.2
stages = [
    dict(kicker="01 · INGEST", title="Parse & audit",
         lines=["read every dated row", "blanks stay missing, never zero", "gap runs, duplicates, jumps"],
         outputs=["prices_daily.csv", "data_quality.json"]),
    dict(kicker="02 · CALENDAR", title="Windows & evidence",
         lines=["lead-in · core · recovery", "quotes available per event", "which events share days"],
         outputs=["event_occurrences.csv", "event_coverage.csv"]),
    dict(kicker="03 · BASELINE", title="The normal price",
         lines=["trend, weekday, annual terms", "trend is not identified", "volatility and level breaks"],
         outputs=["baseline.json", "baseline_*.csv"]),
    dict(kicker="04 · EVENT STUDY", title="Effect of each event",
         lines=["matched ±14-day windows", "block bootstrap, 2,000 draws", "pool, then shrink to category"],
         outputs=["event_effects.json", "historical_event_impact.csv"]),
    dict(kicker="05 · FORECAST", title="Pick, validate, project",
         lines=["9 candidates, 11 origins", "anchor + season + events", "intervals from backtest error"],
         outputs=["daily_forecast.csv", "backtest_predictions.csv"]),
]

xs = [5 + i * (st_w + gap) for i in range(len(stages))]
for x, s in zip(xs, stages):
    stage_card(x, st_y, st_w, st_h, s["kicker"], s["title"], s["lines"], s["outputs"])

for i in range(len(stages) - 1):
    arrow(xs[i] + st_w + 0.2, st_y + st_h / 2, xs[i + 1] - 0.2, st_y + st_h / 2)

arrow(31, in_y - 0.3, xs[0] + st_w * 0.55, st_y + st_h + 0.3)
arrow(87, in_y - 0.3, xs[1] + st_w * 0.45, st_y + st_h + 0.3)

# ---------------------------------------------------------------------------
# delivery band
# ---------------------------------------------------------------------------
band_x = 5
band_w = W - 10
dv_y, dv_h = 10, 15.5

deliver = [
    ("06 · CHARTS", "Figures",
     "8 PNG charts, one per question",
     "history · event windows · backtest · forecast"),
    ("07 · TABLES & CHECKS", "Tables & workbook",
     f"20 CSVs + xlsx · {sum(c['passed'] for c in checks)}/{len(checks)} checks pass",
     "every exported number traces to an artefact"),
    ("09 · 10", "Report and app",
     "REPORT.md · price_forecast.json",
     "the report and the Analytics tab read the same outputs"),
]
inner_w = (band_w - 4 * 2.2) / 3
for i, (kicker, title, sub, sub2) in enumerate(deliver):
    x = band_x + 2.2 + i * (inner_w + 2.2)
    ax.add_patch(FancyBboxPatch((x, dv_y), inner_w, dv_h, boxstyle="round,pad=0,rounding_size=1.2",
                                linewidth=1.0, edgecolor=GREEN, facecolor=WASH, zorder=2))
    ax.text(x + 3.0, dv_y + dv_h - 3.2, kicker, fontsize=5.4, color=GREEN, weight="bold")
    ax.text(x + 3.0, dv_y + dv_h - 6.6, title, fontsize=7.2, color=INK, weight="bold")
    ax.text(x + 3.0, dv_y + 4.2, sub, fontsize=5.5, color=MUTED)
    ax.text(x + 3.0, dv_y + 2.2, sub2, fontsize=5.5, color="#8b98a6")

for i in (2, 3, 4):
    target_x = band_x + 2.2 + (i - 2) * (inner_w + 2.2) + inner_w / 2
    arrow(xs[i] + st_w * 0.5, st_y - 0.3, target_x, dv_y + dv_h + 0.3, colour=GREEN, lw=0.9)

# ---------------------------------------------------------------------------
# runner strip
# ---------------------------------------------------------------------------
ax.add_patch(FancyBboxPatch((5, 2.2), W - 10, 4.4, boxstyle="round,pad=0,rounding_size=1.0",
                            linewidth=0, facecolor=INK, zorder=2))
ax.text(7, 4.4, "bash run_all.sh", fontsize=6.4, color=PAPER, family="monospace",
        va="center", weight="bold")
ax.text(31, 4.4,
        "steps 01 -> 10 in order, about half a minute, regenerating every artefact above - "
        "the validation gate stops the chain if two numbers stop agreeing",
        fontsize=6.0, color="#dbe4ee", va="center")

fig.savefig(cp.CHARTS / "08_pipeline_map.png", dpi=150, facecolor=PAPER)
fig.savefig(cp.CHARTS / "08_pipeline_map.svg", facecolor=PAPER)
print("wrote 08_pipeline_map.png / .svg")
