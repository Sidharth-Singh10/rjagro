"""Run the pipeline: one function, explicit stages, one bundle out.

Stages are named and ordered in `STAGES`; each receives the artifacts produced so
far and returns the keys it adds. Replacing a stage means replacing one entry.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from . import backtest, conclusions as narrative, design, events as ev, facts as facts_mod
from . import forecast as fc
from . import models, prices as prices_mod, report as report_mod
from .calendar import Calendar, load as load_calendar
from .config import Config, CHART_DIR, TABLE_DIR
from .prices import PriceSource

SCHEMA = 2


@dataclass
class RunContext:
    source: PriceSource
    cfg: Config
    events_path: Path
    verbose: bool = False
    artifacts: dict = field(default_factory=dict)
    timings: dict = field(default_factory=dict)

    def put(self, **kwargs):
        self.artifacts.update(kwargs)

    def require(self, *keys):
        missing = [k for k in keys if k not in self.artifacts]
        if missing:
            raise RuntimeError(f"stage dependency missing: {missing}")


def stage(name):
    def wrap(fn):
        fn._stage_name = name
        return fn
    return wrap


# ---------------------------------------------------------------------------
# stages
# ---------------------------------------------------------------------------
@stage("ingest")
def _ingest(ctx: RunContext):
    series = ctx.source.load()
    audit = prices_mod.audit(series, ctx.source.describe())
    ctx.put(prices=series, audit=audit, dataset_hash=prices_mod.dataset_hash(series))
    return {}


@stage("calendar")
def _calendar(ctx: RunContext):
    cal = load_calendar(ctx.events_path)
    ctx.put(calendar=cal, coverage=cal.coverage(ctx.artifacts["prices"].index))
    return {}


@stage("baseline")
def _baseline(ctx: RunContext):
    mdl = design.BaselineModel(
        k=ctx.cfg.fourier_harmonics, include_trend=True,
        include_weekday=ctx.cfg.include_weekday,
    ).fit(ctx.artifacts["prices"])
    ctx.put(baseline_description=mdl.describe())
    return {}


@stage("event_study")
def _event_study(ctx: RunContext):
    oc, pl = ev.estimate(ctx.artifacts["prices"], ctx.artifacts["calendar"], ctx.cfg,
                         boot=ctx.cfg.bootstrap_reps)
    ctx.put(occurrences=oc, event_effects=pl)
    return {}


@stage("backtest")
def _backtest(ctx: RunContext):
    bt = backtest.run(ctx.artifacts["prices"], ctx.artifacts["calendar"], ctx.cfg,
                      boot=ctx.cfg.backtest_bootstrap, verbose=ctx.verbose)
    overall, by_h, by_ev = backtest.summarise(bt)
    selected = backtest.select(ctx.cfg, by_h)
    ctx.put(backtest_raw=bt, backtest_overall=overall, backtest_by_horizon=by_h,
            backtest_event_window=by_ev, selected_model=selected)
    return {}


@stage("forecast")
def _forecast(ctx: RunContext):
    cfg = ctx.cfg
    prices = ctx.artifacts["prices"]
    selected = ctx.artifacts["selected_model"]
    sigma = backtest.interval_curve(selected, ctx.artifacts["backtest_raw"], cfg)
    sigma_yoy, yoy_n = backtest.year_over_year_dispersion(prices)
    daily = fc.build(prices, ctx.artifacts["calendar"], cfg,
                     ctx.artifacts["event_effects"], selected, sigma, sigma_yoy)
    ctx.put(forecast_daily=daily, sigma=sigma, sigma_yoy=sigma_yoy, yoy_pairs=yoy_n)
    return {}


@stage("facts")
def _facts(ctx: RunContext):
    facts = facts_mod.build(
        prices=ctx.artifacts["prices"], audit=ctx.artifacts["audit"],
        cal=ctx.artifacts["calendar"], pl=ctx.artifacts["event_effects"],
        bt_overall=ctx.artifacts["backtest_overall"],
        by_h=ctx.artifacts["backtest_by_horizon"],
        by_ev=ctx.artifacts["backtest_event_window"],
        selected=ctx.artifacts["selected_model"],
        daily=ctx.artifacts["forecast_daily"],
        sigma=ctx.artifacts["sigma"], sigma_yoy=ctx.artifacts["sigma_yoy"],
        cfg=ctx.cfg,
    )
    ctx.put(facts=facts)
    return {}


@stage("narrative")
def _narrative(ctx: RunContext):
    ctx.put(conclusions=narrative.build(ctx.artifacts["facts"]))
    return {}


@stage("report")
def _report(ctx: RunContext):
    meta = {
        "run_id": ctx.artifacts.get("run_id", "local"),
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "dataset_hash": ctx.artifacts["dataset_hash"],
    }
    ctx.put(meta=meta)
    ctx.put(report_md=report_mod.render(ctx.artifacts["facts"], ctx.artifacts["conclusions"],
                                        ctx.cfg, meta))
    return {}


STAGES = [_ingest, _calendar, _baseline, _event_study, _backtest, _forecast,
          _facts, _narrative, _report]


# ---------------------------------------------------------------------------
# public entry point
# ---------------------------------------------------------------------------
def run(source: PriceSource, cfg: Config | None = None, events_path=None,
        verbose: bool = False, persist: Path | None = None,
        run_id: str = "local") -> dict:
    """Execute every stage and return the bundle (payload + report + frames)."""
    from .config import DEFAULT_EVENTS
    cfg = cfg or Config()
    ctx = RunContext(source=source, cfg=cfg,
                     events_path=Path(events_path or DEFAULT_EVENTS), verbose=verbose)
    ctx.put(run_id=run_id)

    for fn in STAGES:
        t0 = time.perf_counter()
        fn(ctx)
        ctx.timings[fn._stage_name] = round(time.perf_counter() - t0, 2)
        if verbose:
            print(f"  {fn._stage_name:<14} {ctx.timings[fn._stage_name]:>6.2f}s")

    payload = build_payload(ctx)
    result = {
        "payload": payload,
        "report_md": ctx.artifacts["report_md"],
        "artifacts": ctx.artifacts,
        "timings": ctx.timings,
    }
    if persist:
        write_artifacts(ctx, Path(persist))
    return result


def build_payload(ctx: RunContext) -> dict:
    a = ctx.artifacts
    payload = {
        "schema": SCHEMA,
        "meta": {
            "runId": a["run_id"],
            "generatedAt": a["meta"]["generated_at"],
            "dataThrough": a["facts"]["data"]["last"],
            "datasetHash": a["dataset_hash"],
            "configHash": ctx.cfg.fingerprint(),
            "model": a["selected_model"],
            "market": ctx.cfg.market,
            "unit": ctx.cfg.unit,
            "priceDefinition": ctx.cfg.price_definition,
            "source": a["facts"]["data"]["source"],
        },
        "data": a["facts"]["data"],
        "events": a["facts"]["events"],
        "forecast": a["facts"]["forecast"],
        "validation": a["facts"]["validation"],
        "conclusions": a["conclusions"],
        "baseline": a["baseline_description"],
    }
    return json.loads(json.dumps(payload))  # ensure JSON-safe


def write_artifacts(ctx: RunContext, out: Path) -> None:
    """Optional disk dump, so the repo keeps human-readable tables."""
    out = Path(out)
    (out / "tables").mkdir(parents=True, exist_ok=True)
    a = ctx.artifacts
    a["forecast_daily"].to_csv(out / "tables" / "daily_forecast.csv", index=False)
    a["event_effects"].to_csv(out / "tables" / "historical_event_impact.csv", index=False)
    a["occurrences"].to_csv(out / "tables" / "historical_event_occurrences.csv", index=False)
    a["backtest_overall"].to_csv(out / "tables" / "model_backtest_summary.csv", index=False)
    a["backtest_by_horizon"].to_csv(out / "tables" / "model_backtest_by_horizon.csv", index=False)
    a["coverage"].to_csv(out / "tables" / "event_coverage.csv", index=False)
    (out / "report.md").write_text(a["report_md"])
    (out / "payload.json").write_text(json.dumps(build_payload(ctx), indent=1))
