/**
 * Cross-checks the event-impact labels against an independent recomputation of
 * the raw JSON, so a change to the window maths, the trend fit or the benchmark
 * cannot slip through.
 *
 *   node --no-warnings --experimental-strip-types \
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
const MIN_PRE = 4;
const MIN_DURING = 3;
const RADIUS_DAYS = 45;
const MIN_BENCHMARK = 20;
const UNUSUAL_P = 0.05;

const MS = (iso) => Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
);
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDays = (value, days) => iso(MS(value) + days * DAY);
const dayGap = (from, to) => Math.round((MS(to) - MS(from)) / DAY);
const round = (value, digits) => {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
};
const average = (rows) => rows.reduce((sum, row) => sum + row.rate, 0) / rows.length;

const points = rates.rows;
const first = points[0].date;
const last = points[points.length - 1].date;
const definitions = Object.fromEntries(dataset.definitions.map((entry) => [entry.id, entry]));

/** Maximal runs of consecutive quoted days. */
const blocks = (() => {
    const out = [];
    let current = [points[0]];
    for (const point of points.slice(1)) {
        if (dayGap(current[current.length - 1].date, point.date) !== 1) {
            out.push(current);
            current = [];
        }
        current.push(point);
    }
    out.push(current);
    return out.filter((block) => block.length >= 2);
})();

const quotes = (from, to) => points.filter((point) => point.date >= from && point.date <= to);

/** Plain OLS on log(rate) ~ day offset. */
const fitTrend = (rows) => {
    if (rows.length < 3) return null;
    const origin = rows[0].date;
    const xs = rows.map((row) => dayGap(origin, row.date));
    const ys = rows.map((row) => Math.log(row.rate));
    const n = xs.length;
    const meanX = xs.reduce((sum, value) => sum + value, 0) / n;
    const meanY = ys.reduce((sum, value) => sum + value, 0) / n;
    let sxx = 0;
    let sxy = 0;
    for (let index = 0; index < n; index += 1) {
        sxx += (xs[index] - meanX) ** 2;
        sxy += (xs[index] - meanX) * (ys[index] - meanY);
    }
    if (sxx < 1e-9) return null;
    const slope = sxy / sxx;
    return { origin, intercept: meanY - slope * meanX, slope };
};

const forecastError = (trend, rows) => {
    const errors = rows.map((row) =>
        Math.log(row.rate) - (trend.intercept + trend.slope * dayGap(trend.origin, row.date)));
    return errors.reduce((sum, value) => sum + value, 0) / errors.length;
};

const windowsFor = (length) => {
    const out = [];
    for (const block of blocks) {
        for (let index = length; index <= block.length - length; index += 1) {
            const trend = fitTrend(block.slice(index - length, index));
            if (!trend) continue;
            out.push({
                anchor: block[index].date,
                value: forecastError(trend, block.slice(index, index + length)),
            });
        }
    }
    return out;
};

const windowCache = new Map();
const windows = (length) => {
    if (!windowCache.has(length)) windowCache.set(length, windowsFor(length));
    return windowCache.get(length);
};

const benchmarkFor = (value, anchor, length) => {
    const others = windows(length).filter((entry) => entry.anchor !== anchor);
    if (others.length < MIN_BENCHMARK) return null;
    const local = others.filter((entry) => Math.abs(dayGap(anchor, entry.anchor)) <= RADIUS_DAYS);
    const useLocal = local.length >= MIN_BENCHMARK;
    const pool = useLocal ? local : others;
    const below = pool.filter((entry) => entry.value < value).length;
    const above = pool.filter((entry) => entry.value > value).length;
    const n = pool.length;
    return {
        kind: useLocal ? 'local' : 'global',
        n,
        percentile: Math.round((below / n) * 100),
        p: round(Math.min(1, 2 * Math.min((below + 1) / (n + 1), (above + 1) / (n + 1))), 3),
    };
};

const stabilityFor = (start, end, length) => {
    const during = quotes(start, [addDays(start, length - 1), end, last].sort()[0]);
    if (during.length < 3) return null;
    const duringMean = average(during);
    const deltas = [];
    for (let shift = 0; shift <= 4; shift += 1) {
        const pre = quotes(addDays(start, -length - shift), addDays(start, -1 - shift));
        if (pre.length < 3) continue;
        deltas.push(((duringMean - average(pre)) / average(pre)) * 100);
    }
    if (deltas.length < 4) return null;
    const min = Math.min(...deltas);
    const max = Math.max(...deltas);
    return { min, max, shifts: deltas.length, stable: min >= 0 || max <= 0 };
};

/** Deliberately a second, plain-JS implementation of the same rule. */
const independent = () => {
    const out = new Map();

    for (const occurrence of dataset.occurrences) {
        const id = `${occurrence.definition_id}-${occurrence.start_date}`;
        const duration = dayGap(occurrence.start_date, occurrence.end_date) + 1;
        const length = Math.max(3, Math.min(14, duration));
        const observable = occurrence.start_date <= last && occurrence.end_date >= first;
        const impact = definitions[occurrence.definition_id].expected_price_impact;

        const pre = quotes(addDays(occurrence.start_date, -length), addDays(occurrence.start_date, -1));
        const duringFrom = occurrence.start_date > first ? occurrence.start_date : first;
        const duringTo = [addDays(occurrence.start_date, length - 1), occurrence.end_date, last].sort()[0];
        const during = quotes(duringFrom, duringTo);

        if (!observable) {
            out.set(id, { delta: null, trend: null, verdict: 'pending' });
            continue;
        }
        if (pre.length < MIN_PRE || during.length < MIN_DURING) {
            out.set(id, { delta: null, trend: null, verdict: 'insufficient' });
            continue;
        }

        const delta = round(((average(during) - average(pre)) / average(pre)) * 100, 1);
        const trend = fitTrend(pre);
        if (!trend) {
            out.set(id, { delta, trend: null, verdict: 'insufficient' });
            continue;
        }
        const residual = forecastError(trend, during);
        const trendPct = round((Math.exp(residual) - 1) * 100, 1);
        const benchmark = benchmarkFor(residual, occurrence.start_date, length);
        const stability = stabilityFor(occurrence.start_date, occurrence.end_date, length);

        let verdict;
        if (!benchmark) verdict = 'insufficient';
        else if (benchmark.p > UNUSUAL_P) verdict = 'typical';
        else if (stability && !stability.stable) verdict = 'fragile';
        else if (impact === 'positive') verdict = trendPct > 0 ? 'consistent' : trendPct < 0 ? 'contradicted' : 'notable';
        else if (impact === 'negative') verdict = trendPct < 0 ? 'consistent' : trendPct > 0 ? 'contradicted' : 'notable';
        else verdict = 'notable';

        out.set(id, { delta, trend: trendPct, benchmark, stability, verdict });
    }

    return out;
};

const expected = independent();
const failures = [];
const close = (a, b, tolerance = 0.051) => {
    if (a === null || b === null) return a === b;
    return Math.abs(a - b) < tolerance;
};

for (const row of eventImpacts) {
    const want = expected.get(row.id);
    if (!want) {
        failures.push(`${row.id}: missing from the independent recomputation`);
        continue;
    }
    if (!close(row.deltaPct, want.delta)) {
        failures.push(`${row.id}: delta ${row.deltaPct} vs ${want.delta}`);
    }
    if (!close(row.trendPct, want.trend)) {
        failures.push(`${row.id}: trend ${row.trendPct} vs ${want.trend}`);
    }
    if (row.verdict !== want.verdict) {
        failures.push(`${row.id}: verdict ${row.verdict} vs ${want.verdict}`);
    }
    if (want.benchmark) {
        if (row.benchmark?.p !== want.benchmark.p) {
            failures.push(`${row.id}: p ${row.benchmark?.p} vs ${want.benchmark.p}`);
        }
        if (row.benchmark?.n !== want.benchmark.n) {
            failures.push(`${row.id}: benchmark n ${row.benchmark?.n} vs ${want.benchmark.n}`);
        }
        if (row.benchmark?.kind !== want.benchmark.kind) {
            failures.push(`${row.id}: benchmark kind ${row.benchmark?.kind} vs ${want.benchmark.kind}`);
        }
        if (row.benchmark?.percentile !== want.benchmark.percentile) {
            failures.push(`${row.id}: percentile ${row.benchmark?.percentile} vs ${want.benchmark.percentile}`);
        }
    } else if (row.benchmark !== null) {
        failures.push(`${row.id}: unexpected benchmark`);
    }
    if (want.stability) {
        if (!close(row.stability?.min ?? null, want.stability.min, 1e-9)) {
            failures.push(`${row.id}: stability min ${row.stability?.min} vs ${want.stability.min}`);
        }
        if (!close(row.stability?.max ?? null, want.stability.max, 1e-9)) {
            failures.push(`${row.id}: stability max ${row.stability?.max} vs ${want.stability.max}`);
        }
        if (row.stability?.stable !== want.stability.stable) {
            failures.push(`${row.id}: stability ${row.stability?.stable} vs ${want.stability.stable}`);
        }
    }
}

if (eventImpacts.length !== dataset.occurrences.length) {
    failures.push(`analysed ${eventImpacts.length} of ${dataset.occurrences.length} occurrences`);
}

const summary = summariseImpacts(eventImpacts);
const total =
    summary.consistent + summary.contradicted + summary.fragile + summary.notable
    + summary.typical + summary.insufficient + summary.pending;
if (total !== summary.total) failures.push(`summary counts sum to ${total}, expected ${summary.total}`);
if (summary.analysable !== summary.total - summary.insufficient - summary.pending) {
    failures.push(`analysable ${summary.analysable} does not match the verdict counts`);
}

// Known-answer checks for the three Lagan windows the methodology was built on.
const known = {
    'lagan-weddings-2025-04-14': { delta: 20, trend: 21.1, verdict: 'consistent' },
    'lagan-weddings-2025-04-25': { delta: -2, trend: -4.6, verdict: 'typical' },
    'lagan-weddings-2025-05-01': { delta: -5.1, trend: -4.2, verdict: 'typical' },
};
for (const [id, want] of Object.entries(known)) {
    const row = eventImpacts.find((impact) => impact.id === id);
    if (!row) {
        failures.push(`${id}: missing from the analysis`);
        continue;
    }
    if (!close(row.deltaPct, want.delta)) failures.push(`${id}: delta ${row.deltaPct}, expected ${want.delta}`);
    if (!close(row.trendPct, want.trend)) failures.push(`${id}: trend ${row.trendPct}, expected ${want.trend}`);
    if (row.verdict !== want.verdict) failures.push(`${id}: verdict ${row.verdict}, expected ${want.verdict}`);
}

// No label may claim a direction without an unusual, stable move.
for (const row of eventImpacts) {
    if (row.verdict === 'consistent' || row.verdict === 'contradicted') {
        if (!row.benchmark || row.benchmark.p > UNUSUAL_P) {
            failures.push(`${row.id}: ${row.verdict} without an unusual move`);
        }
        if (!row.stability || !row.stability.stable) {
            failures.push(`${row.id}: ${row.verdict} without a stable baseline`);
        }
    }
}

if (failures.length > 0) {
    console.error(`✗ ${failures.length} mismatch(es)`);
    failures.forEach((failure) => console.error(`  ${failure}`));
    process.exit(1);
}

console.log('✓ Event impact analysis matches the independent recomputation');
console.log(`  ${summary.total} occurrences · ${summary.observable} observable · ${summary.analysable} testable`);
console.log(
    `  ${summary.consistent} with hypothesis · ${summary.contradicted} against · `
    + `${summary.fragile} baseline-sensitive · ${summary.notable} unusual · ${summary.typical} typical · `
    + `${summary.insufficient} not enough data · ${summary.pending} future`,
);

for (const id of Object.keys(known)) {
    const row = eventImpacts.find((impact) => impact.id === id);
    console.log(
        `  ${row.event.name} (${row.event.startDate}): `
        + `pre ₹${row.pre.average} (${row.pre.quotes}) → during ₹${row.during.average} (${row.during.quotes}) `
        + `= ${row.deltaPct}% raw, ${row.trendPct}% vs trend, p ${row.benchmark?.p} · ${row.verdict}`,
    );
}
