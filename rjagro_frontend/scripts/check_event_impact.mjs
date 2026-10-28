/**
 * Cross-checks the event-impact analysis against an independent recomputation
 * of the raw JSON, so a change to the window maths cannot slip through.
 *
 *   node --experimental-strip-types \
 *        --experimental-loader ./scripts/json_module_loader.mjs \
 *        scripts/check_event_impact.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { eventImpacts, summariseImpacts } from '../app/utils/event_price_impact.ts';

const here = dirname(fileURLToPath(import.meta.url));

const dataset = JSON.parse(readFileSync(resolve(here, '../data/up_chicken_events.json'), 'utf8'));
const rates = JSON.parse(readFileSync(resolve(here, '../app/data/chicken_rates.json'), 'utf8'));

const DAY = 86_400_000;
const FLAT = 2;
const MIN_QUOTES = 3;
const MS = (iso) => Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
);
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Deliberately written as a second, plain-JS implementation of the same rule. */
const independent = () => {
    const points = rates.rows;
    const first = points[0].date;
    const last = points[points.length - 1].date;
    const definitions = Object.fromEntries(dataset.definitions.map((d) => [d.id, d]));
    const out = new Map();

    for (const occurrence of dataset.occurrences) {
        const duration = Math.round((MS(occurrence.end_date) - MS(occurrence.start_date)) / DAY) + 1;
        const window = Math.max(3, Math.min(14, duration));

        const preFrom = iso(MS(occurrence.start_date) - window * DAY);
        const preTo = iso(MS(occurrence.start_date) - DAY);
        const duringFrom = occurrence.start_date > first ? occurrence.start_date : first;
        const rawDuringTo = iso(MS(occurrence.start_date) + (window - 1) * DAY);
        const duringTo = [rawDuringTo, occurrence.end_date, last].sort()[0];

        const pre = points.filter((p) => p.date >= preFrom && p.date <= preTo);
        const during = points.filter((p) => p.date >= duringFrom && p.date <= duringTo);
        const avg = (rows) => rows.reduce((sum, row) => sum + row.rate, 0) / rows.length;

        const id = `${occurrence.definition_id}-${occurrence.start_date}`;
        const observable = occurrence.start_date <= last && occurrence.end_date >= first;
        const impact = definitions[occurrence.definition_id].expected_price_impact;

        if (!observable) {
            out.set(id, { delta: null, verdict: 'pending' });
            continue;
        }
        if (pre.length < MIN_QUOTES || during.length < MIN_QUOTES) {
            out.set(id, { delta: null, verdict: 'insufficient' });
            continue;
        }

        const delta = Math.round(((avg(during) - avg(pre)) / avg(pre)) * 1000) / 10;
        const direction = Math.abs(delta) < FLAT ? 'flat' : delta > 0 ? 'up' : 'down';
        const verdict = impact === 'mixed' || direction === 'flat'
            ? 'inconclusive'
            : (impact === 'positive' && direction === 'up') || (impact === 'negative' && direction === 'down')
                ? 'aligned'
                : 'opposed';
        out.set(id, { delta, verdict });
    }
    return out;
};

const expected = independent();
const failures = [];

for (const row of eventImpacts) {
    const want = expected.get(row.id);
    if (!want) {
        failures.push(`${row.id}: missing from the independent recomputation`);
        continue;
    }
    if (row.verdict !== want.verdict) {
        failures.push(`${row.id}: verdict ${row.verdict} vs ${want.verdict}`);
    }
    if (row.deltaPct !== want.delta) {
        failures.push(`${row.id}: delta ${row.deltaPct} vs ${want.delta}`);
    }
}
if (eventImpacts.length !== dataset.occurrences.length) {
    failures.push(`analysed ${eventImpacts.length} of ${dataset.occurrences.length} occurrences`);
}

const summary = summariseImpacts(eventImpacts);
const expectedSummary = { total: 91, observable: 50, analysable: 27, aligned: 10, opposed: 5, inconclusive: 12, insufficient: 23, pending: 41 };
for (const [key, value] of Object.entries(expectedSummary)) {
    if (summary[key] !== value) failures.push(`summary.${key} = ${summary[key]}, expected ${value}`);
}

if (failures.length > 0) {
    console.error(`✗ ${failures.length} mismatch(es)`);
    failures.forEach((failure) => console.error(`  ${failure}`));
    process.exit(1);
}

console.log('✓ Event impact analysis matches the independent recomputation');
console.log(`  ${summary.total} occurrences · ${summary.observable} observable · ${summary.analysable} analysable`);
console.log(`  aligned ${summary.aligned} · opposed ${summary.opposed} · inconclusive ${summary.inconclusive} · insufficient ${summary.insufficient} · pending ${summary.pending}`);

const samples = ['sawan-2025-07-10', 'diwali-window-2025-10-18', 'eid-ul-adha-2025-06-05'];
for (const row of eventImpacts.filter((impact) => samples.includes(impact.id))) {
    console.log(
        `  ${row.event.name} (${row.event.startDate}): `
        + `pre ₹${row.pre.average} (${row.pre.quotes}) → during ₹${row.during.average} (${row.during.quotes}) `
        + `= ${row.deltaPct}% · assumed ${row.event.impact} · ${row.verdict}`,
    );
}
