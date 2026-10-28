/**
 * Writes `docs/event-impact-statistics.md`: the auditable version of every
 * label on the Analytics tab, including the three Lagan windows the method was
 * built around.
 *
 *   node --no-warnings --experimental-strip-types \
 *        --experimental-loader ./scripts/json_module_loader.mjs \
 *        scripts/event_impact_report.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { eventImpacts, ordinal, summariseImpacts, UNUSUAL_P } from '../app/utils/event_price_impact.ts';
import { formatEventDate, formatEventRange } from '../app/utils/event_calendar.ts';
import { ratePoints } from '../app/utils/rate_tracker.ts';
import { contiguousBlocks } from '../app/utils/event_stats.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, '../docs/event-impact-statistics.md');

const pct = (value) => {
    if (value === null) return '—';
    return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;
};
const pValue = (value) => (value === null ? '—' : value < 0.001 ? '<0.001' : value.toFixed(3));
const count = (value, total) => `${value} of ${total}`;

const summary = summariseImpacts(eventImpacts);
const testable = eventImpacts.filter((row) => row.verdict !== 'insufficient' && row.verdict !== 'pending');
const blocks = contiguousBlocks(ratePoints);
const dense = blocks.reduce((best, block) => (block.length > best.length ? block : best), blocks[0]);
const gaps = blocks.length - 1;

const bench = testable.filter((row) => row.benchmark?.kind === 'local').length;
const unusual = summary.consistent + summary.contradicted + summary.fragile + summary.notable;
const expectedByChance = (summary.analysable * UNUSUAL_P).toFixed(1);

const weddingIds = [
    'lagan-weddings-2025-04-14',
    'lagan-weddings-2025-04-25',
    'lagan-weddings-2025-05-01',
];
const wedding = weddingIds.map((id) => eventImpacts.find((row) => row.id === id));

const lines = [];

lines.push('# Event impact — statistical re-analysis');
lines.push('');
lines.push(
    'Every row on the Analytics tab, recomputed from `app/data/chicken_rates.json` by '
    + '`scripts/event_impact_report.mjs`. Re-run `npm run report:impact` after a price or calendar change.',
);
lines.push('');
lines.push('## The problem with the first labels');
lines.push('');
lines.push(
    'The original verdict compared two averages: the equal-length window immediately before an event and the '
    + 'first days of the event, with a 2% dead zone. That is a description of the price path, not a test. It has '
    + 'no standard error, no trend, no control group and no correction for the fact that the window before an '
    + 'event is often inside the previous event. On a series that ran from ₹86 on 1 Apr 2025 to ₹125 on 24 Apr, '
    + 'it mechanically reads "matched" during the run-up and "opposite" after the peak.',
);
lines.push('');
lines.push('## What the labels do now');
lines.push('');
lines.push('1. **Trend-adjusted move.** Fit `log(price) ~ day` on the quoted days before the event and project it across the event. The mean forecast error is the move relative to the trend the price was already on.');
lines.push('2. **Benchmark.** Score every other window of the same length in the series exactly the same way, prefer the ones within ±45 days, and rank the event among them. The two-sided add-one share is `p`; the anchor\'s own window is excluded.');
lines.push(`3. **Label.** Unusual at p ≤ ${UNUSUAL_P}. *With* / *against hypothesis* only when the move is unusual and its sign survives starting the baseline 0–4 days earlier; *baseline-sensitive* when it does not; *typical* otherwise. The multiplicity-adjusted q is shown but not used to filter.`);
lines.push('');
lines.push('## Data');
lines.push('');
lines.push(`- ${ratePoints.length} quoted days, ${formatEventDate(ratePoints[0].date)} → ${formatEventDate(ratePoints[ratePoints.length - 1].date)}.`);
lines.push(`- One dense block of ${dense.length} consecutive days (${formatEventDate(dense[0].date)} → ${formatEventDate(dense[dense.length - 1].date)}); ${gaps} later blocks separated by missing quotes.`);
lines.push(`- ${summary.total} event occurrences; ${summary.observable} observable; ${summary.analysable} testable with a benchmark (${bench} use a local benchmark).`);
lines.push('');
lines.push('## Headline');
lines.push('');
lines.push('| Label | Rows |');
lines.push('| --- | ---: |');
lines.push(`| ✓ Unusual, with hypothesis | ${summary.consistent} |`);
lines.push(`| ✗ Unusual, against hypothesis | ${summary.contradicted} |`);
lines.push(`| ~ Unusual, baseline-sensitive | ${summary.fragile} |`);
lines.push(`| ! Unusual, no direction assumed | ${summary.notable} |`);
lines.push(`| → Typical move | ${summary.typical} |`);
lines.push(`| – Not enough data | ${summary.insufficient} |`);
lines.push(`| … No price data yet | ${summary.pending} |`);
lines.push('');
lines.push(
    `Only ${unusual} of ${summary.analysable} testable rows are unusual, against roughly ${expectedByChance} `
    + `expected by chance at p ≤ ${UNUSUAL_P}. The labels are descriptive: unusual means the price path stood out `
    + 'from comparable windows, not that the event caused it.',
);
lines.push('');
lines.push('## The three Lagan windows in question');
lines.push('');
lines.push('| Window | Days compared | Pre average | During average | Raw change | Vs pre-trend | Benchmark | p | Baseline shift 0–4 d | Old label | New label |');
lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- | --- | --- |');
for (const row of wedding) {
    if (!row) continue;
    const old = row.id.endsWith('2025-04-14') ? '✓ Matched' : '✗ Opposite';
    const label = `${row.verdict === 'consistent' ? '✓' : row.verdict === 'typical' ? '→' : '~'} ${row.verdict}`;
    const benchmark = row.benchmark
        ? `${ordinal(row.benchmark.percentile)} pct of ${row.benchmark.n} ${row.benchmark.kind === 'local' ? 'nearby' : 'series'} windows`
        : '—';
    const stability = row.stability
        ? `${pct(row.stability.min)} … ${pct(row.stability.max)}${row.stability.stable ? '' : ' (flips)'}`
        : '—';
    lines.push(
        `| ${formatEventRange(row.event.startDate, row.event.endDate)} | ${row.windowDays}v${row.windowDays} `
        + `| ₹${row.pre.average?.toFixed(2)} (${row.pre.quotes}) | ₹${row.during.average?.toFixed(2)} (${row.during.quotes}) `
        + `| ${pct(row.deltaPct)} | ${pct(row.trendPct)} | ${benchmark} | ${pValue(row.benchmark?.p ?? null)} `
        + `| ${stability} | ${old} | ${label} |`,
    );
}
lines.push('');
lines.push('**Reading the table.** The 14–21 Apr rise is the only one of the three that is unusual relative to its own neighbourhood, and it is confounded: the calendar\'s pre-monsoon heat season starts on 15 Apr and the price had already risen from ₹86 to ₹96 before the window. The later two windows are ordinary: the 25–30 Apr comparison opens on the April peak, and the same row becomes +3.8% if the baseline starts four days earlier. The May decline began on 24 Apr, before the cluster. So the two "opposite" verdicts were never evidence against the wedding hypothesis, and the "matched" one is suggestive at best.');
lines.push('');
lines.push('## Every testable row');
lines.push('');
lines.push('| Dates | Event | Assumed | Raw | Vs trend | Percentile | p | q | Label |');
lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |');
for (const row of testable) {
    lines.push(
        `| ${formatEventRange(row.event.startDate, row.event.endDate)} | ${row.event.name} | ${row.event.impact} `
        + `| ${pct(row.deltaPct)} | ${pct(row.trendPct)} | ${row.benchmark?.percentile ?? '—'} `
        + `| ${pValue(row.benchmark?.p ?? null)} | ${pValue(row.qValue)} | ${row.verdict} |`,
    );
}
lines.push('');
lines.push('## Limitations');
lines.push('');
lines.push('- **One dense season.** Apr–Aug 2025 is the only stretch with a quote almost every day; 2026 is ~60% populated with gaps of 2–4 days, so most 2026 rows cannot be benchmarked locally.');
lines.push('- **Confounding is structural.** The pre-monsoon heat season (15 Apr–30 Jun) contains the entire 2025 wedding season, and the heat-wave entry covers it too. No window comparison can separate them on this data.');
lines.push('- **Not independent tests.** The rows overlap and share baselines; `q` is indicative, and a single p near 0.05 among ~23 tests is what chance produces.');
lines.push('- **Co-movement, not causation.** A label says the price path was unusual and which way it went. It cannot say the event moved the price.');
lines.push('');
lines.push('## What would settle it');
lines.push('');
lines.push('A day-level test — muhurat days versus the non-muhurat days around them, inside the same cluster — needs the individual muhurat dates as structured data (they are currently prose in each occurrence note) and a pooled model across seasons. That is the follow-up, not part of this change.');
lines.push('');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${lines.join('\n')}\n`);

console.log(`✓ Wrote ${outputPath}`);
console.log(
    `  ${summary.analysable} testable · ${summary.consistent} with · ${summary.contradicted} against · `
    + `${summary.fragile} baseline-sensitive · ${summary.typical} typical`,
);
