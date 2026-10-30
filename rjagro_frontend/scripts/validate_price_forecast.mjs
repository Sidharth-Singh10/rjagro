/**
 * Validates `app/data/price_forecast.json` (payload schema 2) before it ships.
 *
 * The file is written by `cp_pipeline export` / `run_all.sh`. This check fails
 * loudly if the export is stale, hand-edited, or internally inconsistent, so a
 * broken payload cannot reach the Analytics tab.
 *
 *   node scripts/validate_price_forecast.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const payload = JSON.parse(readFileSync(resolve(root, 'app/data/price_forecast.json'), 'utf8'));
const calendar = JSON.parse(readFileSync(resolve(root, 'app/data/up_chicken_events.json'), 'utf8'));

const failures = [];
const fail = (m) => failures.push(m);

const DAY_MS = 86_400_000;
const epoch = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

const { meta, data, events, forecast, validation, conclusions } = payload;

if (payload.schema !== 2) fail(`schema is ${payload.schema}, expected 2`);
if (!meta || !data || !events || !forecast || !validation) {
    fail('missing meta, data, events, forecast or validation');
} else {
    // ---- meta --------------------------------------------------------------
    for (const k of ['runId', 'generatedAt', 'dataThrough', 'model', 'datasetHash']) {
        if (!meta[k]) fail(`meta.${k} is empty`);
    }

    // ---- data --------------------------------------------------------------
    if (!(data.observations > 300)) fail(`only ${data.observations} observations`);
    if (data.first >= data.last) fail(`data range ${data.first} to ${data.last}`);
    const span = Math.round((epoch(data.last) - epoch(data.first)) / DAY_MS) + 1;
    if (data.observations + data.missingDays !== span) {
        fail(`observations (${data.observations}) + missing (${data.missingDays}) is not the span (${span})`);
    }

    // ---- forecast daily ----------------------------------------------------
    const daily = forecast.daily;
    if (!Array.isArray(daily) || daily.length === 0) {
        fail('forecast.daily is empty');
    } else {
        const first = daily[0].date;
        const last = daily[daily.length - 1].date;
        const expected = Math.round((epoch(last) - epoch(first)) / DAY_MS) + 1;
        if (daily.length !== expected) {
            fail(`daily rows not contiguous: ${daily.length} for ${expected} calendar days`);
        }
        if (first !== forecast.start) fail(`first row ${first} is not forecast.start ${forecast.start}`);
        if (last !== forecast.end) fail(`last row ${last} is not forecast.end ${forecast.end}`);
        if (forecast.end !== '2027-12-31') fail(`horizon ends ${forecast.end}`);
        if (forecast.start <= data.last) fail(`forecast starts ${forecast.start}, not after ${data.last}`);
        if (daily.length !== forecast.days) fail(`forecast.days ${forecast.days} is not ${daily.length}`);

        for (const row of daily) {
            if (!(row.lo95 <= row.lo80 && row.lo80 <= row.forecast && row.forecast <= row.hi80 && row.hi80 <= row.hi95)) {
                fail(`interval ordering broken on ${row.date}`);
                break;
            }
            const rebuilt = row.baseline * (1 + row.impactPct / 100);
            if (Math.abs(rebuilt - row.forecast) > 0.2) {
                fail(`forecast is not baseline x (1 + impact) on ${row.date}: ${rebuilt} vs ${row.forecast}`);
                break;
            }
        }
    }

    // ---- events ------------------------------------------------------------
    const definitionIds = new Set(calendar.definitions.map((d) => d.id));
    if (!Array.isArray(events.items) || events.items.length === 0) {
        fail('events.items is empty');
    } else {
        for (const e of events.items) {
            if (!definitionIds.has(e.id)) fail(`unknown event id ${e.id}`);
            if (!['A', 'B', 'C', 'D', 'E'].includes(e.reliability)) fail(`${e.id} grade ${e.reliability}`);
            if (!(e.pooledLo80 <= e.pooledPct && e.pooledPct <= e.pooledHi80)) {
                fail(`${e.id}: pooled ${e.pooledPct} outside its 80% interval`);
            }
            if (e.occurrences === 0 && e.reliability !== 'E') {
                fail(`${e.id} has no occurrences but grade ${e.reliability}`);
            }
        }
    }

    // ---- future occurrences ------------------------------------------------
    for (const o of forecast.eventOccurrences ?? []) {
        if (!definitionIds.has(o.id)) fail(`future occurrence for unknown event ${o.id}`);
        if (o.end < forecast.start || o.start > forecast.end) {
            fail(`occurrence ${o.id} ${o.start} falls outside the horizon`);
        }
        if (!(o.impactLo80 <= o.impactPct && o.impactPct <= o.impactHi80)) {
            fail(`occurrence ${o.id}: impact ${o.impactPct} outside its interval`);
        }
    }

    // ---- validation --------------------------------------------------------
    if (!Array.isArray(validation.models) || validation.models.length < 2) {
        fail('validation.models has fewer than two candidates');
    } else if (!validation.models.some((m) => m.model === validation.selected)) {
        fail(`selected model ${validation.selected} is not in the comparison`);
    }
    if (!isNum(validation.smape8to28) || validation.smape8to28 <= 0) fail('validation.smape8to28 missing');

    // ---- conclusions -------------------------------------------------------
    if (!Array.isArray(conclusions) || conclusions.length === 0) {
        fail('conclusions is empty');
    } else {
        for (const c of conclusions) {
            if (!c.text || c.text.length < 20) fail(`conclusion ${c.id} has no text`);
            if (!Array.isArray(c.refs) || c.refs.length === 0) fail(`conclusion ${c.id} has no refs`);
        }
    }

    // ---- JSON safety -------------------------------------------------------
    for (const [key, value] of Object.entries(forecast)) {
        if (isNum(value) && !Number.isFinite(value)) fail(`forecast.${key} is not finite`);
    }
}

if (failures.length > 0) {
    console.error(`price_forecast.json failed ${failures.length} check(s):`);
    for (const m of failures) console.error(`  - ${m}`);
    process.exit(1);
}

console.log(
    `price_forecast.json ok: ${forecast.daily.length} days (${forecast.start} to ${forecast.end}), `
    + `${data.observations} quoted days to ${data.last}, model ${meta.model}, `
    + `${events.items.length} events, ${conclusions.length} conclusions.`,
);
