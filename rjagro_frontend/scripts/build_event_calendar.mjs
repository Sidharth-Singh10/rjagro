/**
 * Syncs the canonical event calendar into the JSON the Analytics tab imports.
 *
 * Usage (from rjagro_frontend/):
 *   node scripts/build_event_calendar.mjs
 *
 * `data/up_chicken_events.json` is the source of truth and keeps recurring
 * definitions apart from per-year occurrences, so a festival's description and
 * sources are written once. The app copy keeps that same shape — the loader in
 * `app/utils/event_calendar.ts` joins definitions to occurrences — and adds the
 * derived calendar window so the dataset is self-describing at runtime.
 *
 * The window start is read from the first quoted day in `chicken_rates.json` on
 * every build. It is never hardcoded here or in the UI.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const canonicalPath = resolve(here, '../data/up_chicken_events.json');
const ratesPath = resolve(here, '../app/data/chicken_rates.json');
const outputPath = resolve(here, '../app/data/up_chicken_events.json');

const canonical = JSON.parse(readFileSync(canonicalPath, 'utf8'));
const rates = JSON.parse(readFileSync(ratesPath, 'utf8'));

if (!Array.isArray(rates.rows) || rates.rows.length === 0) {
  throw new Error('chicken_rates.json has no rows — cannot derive the calendar start');
}

const datasetStart = rates.rows[0].date;

const output = {
  meta: {
    ...canonical.meta,
    generated_from: 'data/up_chicken_events.json',
    dataset_start: datasetStart,
    dataset_start_rule: canonical.meta.coverage_start_rule,
    event_count: canonical.occurrences.length,
  },
  definitions: canonical.definitions,
  occurrences: canonical.occurrences,
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(
  `Synced ${canonical.occurrences.length} occurrences and ${canonical.definitions.length} definitions; `
  + `window ${datasetStart} to ${canonical.meta.coverage_end}`,
);
