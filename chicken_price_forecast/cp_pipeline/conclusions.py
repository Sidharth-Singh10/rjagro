"""Conclusions: the only module allowed to write a sentence about the numbers.

It reads `facts` and returns a list of statements. Each carries the facts it
rests on, so the UI can show a caption under the chart and the report can reuse
the same words. If a fact is missing the statement says so — it never fills the
gap with a plausible number.
"""
from __future__ import annotations


def _pct(v, digits=1) -> str:
    if v is None:
        return "—"
    return f"{v:+.{digits}f}%".replace("-", "\u2212")


def _inr(v, digits=1) -> str:
    if v is None:
        return "—"
    return f"\u20b9{v:,.{digits}f}"


def build(facts: dict) -> list[dict]:
    out: list[dict] = []
    ev = facts["events"]
    items = ev["items"]
    cats = {c["category"]: c for c in ev["categories"]}
    f = facts["forecast"]
    v = facts["validation"]
    d = facts["data"]

    graded = [e for e in items if e["pooledLo80"] is not None]
    significant = [e for e in graded if e["pooledLo80"] > 0 or e["pooledHi80"] < 0]
    up = [e for e in significant if e["pooledPct"] > 0]
    down = [e for e in significant if e["pooledPct"] < 0]
    strong = [e for e in items if e["reliability"] == "A"]

    # ---- 1. which events survive the evidence test -------------------------
    if significant:
        names_up = ", ".join(f"{e['name']} ({_pct(e['pooledPct'])})" for e in up) or "none"
        names_down = ", ".join(f"{e['name']} ({_pct(e['pooledPct'])})" for e in down) or "none"
        out.append({
            "id": "event-strength",
            "kind": "finding",
            "text": (f"{len(significant)} of {len(items)} events separate from zero at the 80% level. "
                     f"Above baseline: {names_up}. Below baseline: {names_down}."),
            "refs": ["events.items"],
        })
    else:
        out.append({
            "id": "event-strength",
            "kind": "finding",
            "text": (f"None of the {len(items)} events separates from zero at the 80% level in this "
                     "sample; every event estimate is within its own uncertainty."),
            "refs": ["events.items"],
        })

    # ---- 2. the best-evidenced effect --------------------------------------
    if strong:
        e = max(strong, key=lambda x: abs(x["pooledPct"]))
        out.append({
            "id": "strongest-event",
            "kind": "finding",
            "text": (f"{e['name']} is the only grade-A effect: {_pct(e['pooledPct'])} "
                     f"(80% interval {_pct(e['pooledLo80'])} to {_pct(e['pooledHi80'])}, "
                     f"{e['occurrences']} occurrences, {e['observedDays']} quoted days)."),
            "refs": ["events.items", "events.items.reliability"],
        })
    else:
        out.append({
            "id": "strongest-event",
            "kind": "caveat",
            "text": "No event reaches grade A; every estimate here is a weak prior to be updated.",
            "refs": ["events.items"],
        })

    # ---- 3. the pooled category the hypothesis was about -------------------
    fest = cats.get("festival")
    if fest:
        separable = fest["lo95"] > 0 or fest["hi95"] < 0
        out.append({
            "id": "festival-pool",
            "kind": "finding" if separable else "caveat",
            "text": (f"Pooled festival windows sit at {_pct(fest['pooledPct'])} "
                     f"(95% interval {_pct(fest['lo95'])} to {_pct(fest['hi95'])}), "
                     + ("which excludes zero." if separable
                        else "too imprecise to confirm or reject the direction the calendar expects.")),
            "refs": ["events.categories"],
        })

    # ---- 4. the forecast path ---------------------------------------------
    out.append({
        "id": "forecast-path",
        "kind": "finding",
        "text": (f"The path runs from {_inr(f['first'])} on {f['start']} to {_inr(f['lastCentral'])} "
                 f"on {f['end']}, with the seasonal shape peaking at {_inr(f['peak']['value'])} "
                 f"around {f['peak']['date']} and bottoming at {_inr(f['trough']['value'])} "
                 f"around {f['trough']['date']}."),
        "refs": ["forecast"],
    })

    # ---- 5. what the interval says ----------------------------------------
    width = None
    if f["lastCentral"]:
        width = (f["lastHi95"] - f["lastLo95"]) / f["lastCentral"] * 100
    out.append({
        "id": "forecast-interval",
        "kind": "caveat",
        "text": (f"The 95% interval at the end of the horizon is {_inr(f['lastLo95'])} to "
                 f"{_inr(f['lastHi95'])}"
                 + (f" — a band about {width:.0f}% as wide as the central value. " if width else ". ")
                 + "That width is the honest summary of what this history supports; the level is "
                   "one draw from it, the shape is the part worth trusting."),
        "refs": ["forecast.daily", "validation.sigma"],
    })

    # ---- 6. demonstrated skill --------------------------------------------
    models = [m for m in v["models"] if m["model"] == v["selected"]]
    if models:
        m = models[0]
        best = min(v["models"], key=lambda x: x["smape"])
        out.append({
            "id": "validation",
            "kind": "finding" if best["model"] == v["selected"] else "caveat",
            "text": (f"The selected model ({v['selected']}) scores {m['smape']:.1f}% sMAPE overall, "
                     f"{v['smape8to28']:.1f}% at 8–28 days and {v['smape29to90']:.1f}% at 29–90 days. "
                     + ("It is the best of the candidates tested." if best["model"] == v["selected"]
                        else f"{best['model']} scores {best['smape']:.1f}% overall, so no single model dominates.")),
            "refs": ["validation.models"],
        })

    # ---- 7. how thin the evidence is --------------------------------------
    # "few observed days" can mean two very different things: the event only
    # lasts a day or two, or the data around it is missing. Say which.
    thin = [e for e in items if e["observedDays"] <= 2]
    if d["missingDays"] == 0:
        gap_text = "the price series itself has no gaps"
    else:
        gap_text = f"{d['missingDays']} of {d['spanDays']} calendar days have no quote"
    out.append({
        "id": "evidence-depth",
        "kind": "caveat",
        "text": (f"{len(thin)} of {len(items)} events last two days or less, so each estimate rests on "
                 f"that many observations; {gap_text}. Event conclusions are associations in a thin "
                 "sample, not causal effects."),
        "refs": ["events.items", "data.missingDays"],
    })

    return out
