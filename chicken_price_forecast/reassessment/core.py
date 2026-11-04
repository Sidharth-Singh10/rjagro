"""Independent pure-data utilities. No database driver or legacy CSV access."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
HERE = Path(__file__).resolve().parent
END = pd.Timestamp("2027-12-31")
SEED = 20261104
BUCKETS = ["1-7", "8-30", "31-90", "91-180", "181-365", ">365"]


def load_snapshot(path):
    b = json.loads(Path(path).read_text())
    m = b["provenance"]
    if m.get("kind") != "postgres_mcp_snapshot" or m.get("profile") != "rjagro":
        raise ValueError("Only an explicit rjagro PostgreSQL MCP extraction is accepted")
    vals = np.asarray(b["prices"], float)
    dates = pd.DatetimeIndex(b["dates"]) if "dates" in b else pd.date_range(m["first_date"], m["last_date"])
    if len(vals) != len(dates) or len(vals) != m["observations"]:
        raise ValueError("Date/count mismatch")
    if not np.isfinite(vals).all() or (vals <= 0).any() or dates.has_duplicates or not dates.is_monotonic_increasing:
        raise ValueError("Invalid prices or dates")
    for text, key in [("{" + ",".join(f"{v:.2f}" for v in vals) + "}", "prices_md5"),
                      ("{" + ",".join(d.date().isoformat() for d in dates) + "}", "dates_md5")]:
        if hashlib.md5(text.encode()).hexdigest() != m[key]:
            raise ValueError(f"Database checksum mismatch: {key}")
    return pd.Series(vals, index=dates, name="price"), m


def calendar_design(dates, annual=True):
    d = pd.DatetimeIndex(dates)
    cols = [np.ones(len(d))]
    if annual:
        phase = (d - pd.Timestamp("2025-01-01")).days.to_numpy() * 2 * np.pi / 365.25
        cols.extend([np.sin(phase), np.cos(phase)])
    # Fixed Monday reference even for single-day prediction batches.
    cols.extend([(d.day_of_week == j).astype(float) for j in range(1, 7)])
    return np.column_stack(cols)


def lag_features(s):
    lp = np.log(s)
    past = lp.shift(1)
    f = pd.DataFrame({f"lag{k}": lp.shift(k) for k in (1, 2, 7, 14, 28)})
    for w in (7, 28):
        f[f"mean{w}"] = past.rolling(w).mean()
        f[f"sd{w}"] = past.rolling(w).std()
    f["momentum7"] = lp.shift(1) - lp.shift(8)
    f["dow_sin"] = np.sin(s.index.day_of_week * 2 * np.pi / 7)
    f["dow_cos"] = np.cos(s.index.day_of_week * 2 * np.pi / 7)
    phase = s.index.day_of_year * 2 * np.pi / 365.25
    f["year_sin"], f["year_cos"] = np.sin(phase), np.cos(phase)
    return f


def bucket(h):
    return BUCKETS[np.searchsorted([7,30,90,180,365], h, side="left")]


def event_evidence(years):
    n = len(set(years))
    return f"insufficient: {n} independent years" if n < 3 else f"limited: {n} independent years"


def empirical_band(errors, alpha):
    """Finite-sample symmetric absolute-log-error band; no exchangeability claim."""
    e = np.abs(np.asarray(errors, float))
    e = e[np.isfinite(e)]
    rank = int(np.ceil((len(e) + 1) * (1 - alpha)))
    if len(e) < 20 or rank > len(e):
        return None
    q = float(np.sort(e)[rank - 1])
    return -q, q


def available_errors(bt, origin):
    return bt[(bt["origin"] < origin) & (bt["date"] <= origin)].copy()


def forecast_dates(last):
    return pd.date_range(pd.Timestamp(last) + pd.Timedelta(days=1), END)


def metrics(d):
    e = d.pred.to_numpy() - d.actual.to_numpy()
    out = dict(n=len(d), origins=d.origin.nunique(), unique_dates=d.date.nunique(),
               mae=float(np.abs(e).mean()), rmse=float(np.sqrt(np.mean(e**2))),
               smape=float(np.mean(200*np.abs(e)/(np.abs(d.pred)+np.abs(d.actual)))),
               bias=float(e.mean()))
    for level in (80,95):
        lo, hi = f"lo{level}", f"hi{level}"
        if lo in d:
            v = d[d[lo].notna() & d[hi].notna()]
            out[f"interval_n{level}"] = len(v)
            out[f"coverage{level}"] = float(((v.actual >= v[lo]) & (v.actual <= v[hi])).mean()) if len(v) else np.nan
            out[f"width{level}"] = float((v[hi]-v[lo]).mean()) if len(v) else np.nan
            a = 1-level/100
            score = v[hi]-v[lo] + 2/a*(v[lo]-v.actual).clip(lower=0) + 2/a*(v.actual-v[hi]).clip(lower=0)
            out[f"interval_score{level}"] = float(score.mean()) if len(v) else np.nan
    return out


def file_hashes():
    """Protect original analysis; hash bytes, never load old price observations."""
    dirs = ["cp_pipeline", "legacy", "outputs", "data", "tests"]
    paths = [p for name in dirs for p in (ROOT/name).rglob("*")
             if p.is_file() and "__pycache__" not in p.parts]
    paths += [ROOT/"REPORT.md", ROOT/"README.md", ROOT/"run_all.sh"]
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}
