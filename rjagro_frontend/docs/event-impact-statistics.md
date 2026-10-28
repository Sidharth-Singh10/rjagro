# Event impact — statistical re-analysis

Every row on the Analytics tab, recomputed from `app/data/chicken_rates.json` by `scripts/event_impact_report.mjs`. Re-run `npm run report:impact` after a price or calendar change.

## The problem with the first labels

The original verdict compared two averages: the equal-length window immediately before an event and the first days of the event, with a 2% dead zone. That is a description of the price path, not a test. It has no standard error, no trend, no control group and no correction for the fact that the window before an event is often inside the previous event. On a series that ran from ₹86 on 1 Apr 2025 to ₹125 on 24 Apr, it mechanically reads "matched" during the run-up and "opposite" after the peak.

## What the labels do now

1. **Trend-adjusted move.** Fit `log(price) ~ day` on the quoted days before the event and project it across the event. The mean forecast error is the move relative to the trend the price was already on.
2. **Benchmark.** Score every other window of the same length in the series exactly the same way, prefer the ones within ±45 days, and rank the event among them. The two-sided add-one share is `p`; the anchor's own window is excluded.
3. **Label.** Unusual at p ≤ 0.05. *With* / *against hypothesis* only when the move is unusual and its sign survives starting the baseline 0–4 days earlier; *baseline-sensitive* when it does not; *typical* otherwise. The multiplicity-adjusted q is shown but not used to filter.

## Data

- 409 quoted days, 1 Apr 2025 → 23 Oct 2026.
- One dense block of 92 consecutive days (1 Apr 2025 → 1 Jul 2025); 45 later blocks separated by missing quotes.
- 91 event occurrences; 50 observable; 23 testable with a benchmark (7 use a local benchmark).

## Headline

| Label | Rows |
| --- | ---: |
| ✓ Unusual, with hypothesis | 1 |
| ✗ Unusual, against hypothesis | 0 |
| ~ Unusual, baseline-sensitive | 2 |
| ! Unusual, no direction assumed | 0 |
| → Typical move | 20 |
| – Not enough data | 27 |
| … No price data yet | 41 |

Only 3 of 23 testable rows are unusual, against roughly 1.2 expected by chance at p ≤ 0.05. The labels are descriptive: unusual means the price path stood out from comparable windows, not that the event caused it.

## The three Lagan windows in question

| Window | Days compared | Pre average | During average | Raw change | Vs pre-trend | Benchmark | p | Baseline shift 0–4 d | Old label | New label |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- | --- | --- |
| 14–21 Apr 2025 | 8v8 | ₹95.50 (8) | ₹114.63 (8) | +20.0% | +21.1% | 100th pct of 50 nearby windows | 0.039 | +20.0% … +24.9% | ✓ Matched | ✓ consistent |
| 25–30 Apr 2025 | 6v6 | ₹122.17 (6) | ₹119.67 (6) | −2.0% | −4.6% | 33rd pct of 63 nearby windows | 0.688 | −2.0% … +3.8% (flips) | ✗ Opposite | → typical |
| 1–28 May 2025 | 14v14 | ₹120.64 (14) | ₹114.50 (14) | −5.1% | −4.2% | 43rd pct of 61 nearby windows | 0.871 | −5.1% … −1.1% | ✗ Opposite | → typical |

**Reading the table.** The 14–21 Apr rise is the only one of the three that is unusual relative to its own neighbourhood, and it is confounded: the calendar's pre-monsoon heat season starts on 15 Apr and the price had already risen from ₹86 to ₹96 before the window. The later two windows are ordinary: the 25–30 Apr comparison opens on the April peak, and the same row becomes +3.8% if the baseline starts four days earlier. The May decline began on 24 Apr, before the cluster. So the two "opposite" verdicts were never evidence against the wedding hypothesis, and the "matched" one is suggestive at best.

## Every testable row

| Dates | Event | Assumed | Raw | Vs trend | Percentile | p | q | Label |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 14–21 Apr 2025 | Wedding season (Lagan) muhurat cluster | positive | +20.0% | +21.1% | 100 | 0.039 | 0.299 | consistent |
| 15 Apr – 30 Jun 2025 | Pre-monsoon summer heat season | mixed | +27.5% | +10.2% | 98 | 0.087 | 0.465 | typical |
| 25–30 Apr 2025 | Wedding season (Lagan) muhurat cluster | positive | −2.0% | −4.6% | 33 | 0.688 | 0.962 | typical |
| 1–28 May 2025 | Wedding season (Lagan) muhurat cluster | positive | −5.1% | −4.2% | 43 | 0.871 | 0.962 | typical |
| 1 Jun – 30 Sept 2025 | Southwest monsoon season | mixed | −24.4% | −17.0% | 19 | 0.413 | 0.962 | typical |
| 2–8 Jun 2025 | Wedding season (Lagan) muhurat cluster | positive | −16.3% | +5.6% | 76 | 0.507 | 0.962 | typical |
| 10 Jul – 9 Aug 2025 | Sawan (Shravana) month | negative | −10.7% | −9.1% | 28 | 0.595 | 0.962 | typical |
| 8–21 Sept 2025 | Pitru Paksha (Shraddh) | negative | −2.4% | −23.3% | 4 | 0.101 | 0.465 | typical |
| 22 Sept – 1 Oct 2025 | Sharadiya Navratri | negative | −4.6% | +10.9% | 74 | 0.544 | 0.962 | typical |
| 2–30 Nov 2025 | Wedding season (Lagan) muhurat cluster | positive | +15.2% | −3.0% | 42 | 0.861 | 0.962 | typical |
| 15 Dec 2025 – 31 Jan 2026 | Winter fog and cold-wave transport disruption | mixed | −8.1% | +3.1% | 58 | 0.861 | 0.962 | typical |
| 24 Dec 2025 – 1 Jan 2026 | Christmas and New Year holidays | positive | +5.5% | +0.1% | 46 | 0.926 | 0.962 | typical |
| 14 Jan – 15 Feb 2026 | Magh Mela, Prayagraj | mixed | −0.3% | −0.7% | 53 | 0.962 | 0.962 | typical |
| 5–26 Feb 2026 | Wedding season (Lagan) muhurat cluster | positive | +1.0% | +4.5% | 62 | 0.785 | 0.962 | typical |
| 19 Feb – 19 Mar 2026 | Ramadan (Ramzan) | mixed | +0.9% | −4.2% | 37 | 0.759 | 0.962 | typical |
| 2–12 Mar 2026 | Wedding season (Lagan) muhurat cluster | positive | +3.9% | −0.4% | 44 | 0.887 | 0.962 | typical |
| 15–29 Apr 2026 | Wedding season (Lagan) muhurat cluster | positive | −3.3% | −29.8% | 0 | 0.025 | 0.288 | fragile |
| 15 Apr – 30 Jun 2026 | Pre-monsoon summer heat season | mixed | −3.3% | −29.8% | 0 | 0.025 | 0.288 | fragile |
| 1–14 May 2026 | Wedding season (Lagan) muhurat cluster | positive | +12.4% | +10.5% | 77 | 0.481 | 0.962 | typical |
| 1–11 Jul 2026 | Wedding season (Lagan) muhurat cluster | positive | +17.9% | +11.6% | 77 | 0.474 | 0.962 | typical |
| 30 Jul – 28 Aug 2026 | Sawan (Shravana) month | negative | −10.7% | +27.9% | 91 | 0.203 | 0.778 | typical |
| 27 Sept – 10 Oct 2026 | Pitru Paksha (Shraddh) | negative | −1.9% | −16.7% | 17 | 0.354 | 0.962 | typical |
| 11–19 Oct 2026 | Sharadiya Navratri | negative | +0.1% | −2.0% | 36 | 0.734 | 0.962 | typical |

## Limitations

- **One dense season.** Apr–Aug 2025 is the only stretch with a quote almost every day; 2026 is ~60% populated with gaps of 2–4 days, so most 2026 rows cannot be benchmarked locally.
- **Confounding is structural.** The pre-monsoon heat season (15 Apr–30 Jun) contains the entire 2025 wedding season, and the heat-wave entry covers it too. No window comparison can separate them on this data.
- **Not independent tests.** The rows overlap and share baselines; `q` is indicative, and a single p near 0.05 among ~23 tests is what chance produces.
- **Co-movement, not causation.** A label says the price path was unusual and which way it went. It cannot say the event moved the price.

## What would settle it

A day-level test — muhurat days versus the non-muhurat days around them, inside the same cluster — needs the individual muhurat dates as structured data (they are currently prose in each occurrence note) and a pooled model across seasons. That is the follow-up, not part of this change.

