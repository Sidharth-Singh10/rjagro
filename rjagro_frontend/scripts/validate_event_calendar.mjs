/**
 * Validates the UP chicken price events calendar.
 *
 * Usage (from rjagro_frontend/):
 *   node scripts/validate_event_calendar.mjs   (or: npm run validate:events)
 *
 * Checks the canonical dataset, the derived app copy and the price dataset
 * together, so a stale copy or an out-of-range date fails the build instead of
 * shipping. Exits non-zero on the first set of failures.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const canonicalPath = resolve(here, '../data/up_chicken_events.json');
const appPath = resolve(here, '../app/data/up_chicken_events.json');
const ratesPath = resolve(here, '../app/data/chicken_rates.json');

const canonical = JSON.parse(readFileSync(canonicalPath, 'utf8'));
const app = JSON.parse(readFileSync(appPath, 'utf8'));
const rates = JSON.parse(readFileSync(ratesPath, 'utf8'));

const COVERAGE_END = canonical.meta.coverage_end;
const errors = [];
const fail = (message) => errors.push(message);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDate = (value) => {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

if (!Array.isArray(rates.rows) || rates.rows.length === 0) {
  console.error('✗ chicken_rates.json has no rows; cannot derive the calendar window');
  process.exit(1);
}

/** Derived, never hardcoded: the first quoted price day. */
const datasetStart = rates.rows[0].date;
if (!isIsoDate(datasetStart)) fail(`Derived dataset start is not an ISO date: ${datasetStart}`);

if (!isIsoDate(COVERAGE_END)) fail(`meta.coverage_end is not an ISO date: ${COVERAGE_END}`);
if (datasetStart > COVERAGE_END) fail(`Dataset start ${datasetStart} is after coverage end ${COVERAGE_END}`);
if (app.meta?.dataset_start !== datasetStart) {
  fail(`app copy dataset_start is ${app.meta?.dataset_start}, expected the derived ${datasetStart} (run npm run build:events)`);
}

// ---- The app copy must be exactly the canonical file plus derived metadata ----
const expectedApp = {
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
if (JSON.stringify(app) !== JSON.stringify(expectedApp)) {
  fail('app/data/up_chicken_events.json is out of sync with data/up_chicken_events.json — run npm run build:events');
}

// ---- Definitions ----
const CATEGORIES = new Set(['festival', 'observance', 'islamic', 'wedding', 'fair', 'seasonal']);
const IMPACTS = new Set(['positive', 'negative', 'mixed', 'unknown']);
const IMPACT_CONFIDENCE = new Set(['low', 'medium', 'high']);
const SCOPES = new Set(['statewide', 'regional', 'national']);
const RECURRENCE = new Set(['annual-single', 'annual-multiple', 'one-off']);
const YEARS = [2025, 2026, 2027];

const definitions = new Map();
for (const definition of canonical.definitions) {
  const label = `definition ${definition.id ?? '(no id)'}`;
  if (!definition.id) fail(`${label}: missing id`);
  if (definitions.has(definition.id)) fail(`${label}: duplicate id`);
  definitions.set(definition.id, definition);

  if (!definition.name) fail(`${label}: missing name`);
  if (!CATEGORIES.has(definition.category)) fail(`${label}: bad category "${definition.category}"`);
  if (!IMPACTS.has(definition.expected_price_impact)) fail(`${label}: bad expected_price_impact "${definition.expected_price_impact}"`);
  if (!IMPACT_CONFIDENCE.has(definition.impact_confidence)) fail(`${label}: bad impact_confidence "${definition.impact_confidence}"`);
  if (!SCOPES.has(definition.scope)) fail(`${label}: bad scope "${definition.scope}"`);
  if (!RECURRENCE.has(definition.recurrence)) fail(`${label}: bad recurrence "${definition.recurrence}"`);
  if (!definition.calendar_system) fail(`${label}: missing calendar_system`);
  if (!definition.location_scope) fail(`${label}: missing location_scope`);
  if (!definition.description) fail(`${label}: missing description`);
  if (!definition.impact_mechanism) fail(`${label}: missing impact_mechanism`);
  if (!definition.notes) fail(`${label}: missing notes`);
  if (definition.last_verified_at !== canonical.meta.last_verified_at) {
    fail(`${label}: last_verified_at differs from meta.last_verified_at`);
  }
  if (!Array.isArray(definition.sources) || definition.sources.length === 0) {
    fail(`${label}: needs at least one source`);
  }
}

// ---- Sources ----
const checkSources = (sources, label) => {
  if (!Array.isArray(sources) || sources.length === 0) {
    fail(`${label}: needs at least one source`);
    return;
  }
  for (const source of sources) {
    if (!source.title) fail(`${label}: a source is missing a title`);
    if (!source.publisher) fail(`${label}: source "${source.title}" is missing a publisher`);
    if (!source.supports) fail(`${label}: source "${source.title}" is missing a supports note`);
    if (typeof source.url !== 'string' || !/^https?:\/\/\S+$/.test(source.url)) {
      fail(`${label}: source "${source.title ?? '?'}" has no usable URL`);
    }
    if (!isIsoDate(source.retrieved_at)) {
      fail(`${label}: source "${source.title}" has a bad retrieved_at "${source.retrieved_at}"`);
    }
  }
};

for (const definition of canonical.definitions) {
  checkSources(definition.sources, `definition ${definition.id}`);
}
for (const occurrence of canonical.occurrences) {
  if (occurrence.sources) checkSources(occurrence.sources, `occurrence ${occurrence.definition_id} ${occurrence.start_date}`);
}

// ---- Occurrences ----
const seen = new Map();
const byDefinitionYear = new Map();

for (const occurrence of canonical.occurrences) {
  const label = `occurrence ${occurrence.definition_id} ${occurrence.start_date}`;
  const definition = definitions.get(occurrence.definition_id);
  if (!definition) {
    fail(`${label}: unknown definition_id`);
    continue;
  }

  if (!isIsoDate(occurrence.start_date)) fail(`${label}: start_date is not an ISO date`);
  if (!isIsoDate(occurrence.end_date)) fail(`${label}: end_date is not an ISO date`);
  if (!['confirmed', 'estimated', 'tentative', 'unknown'].includes(occurrence.date_confidence)) {
    fail(`${label}: bad date_confidence "${occurrence.date_confidence}"`);
  }
  if (occurrence.start_date > occurrence.end_date) {
    fail(`${label}: start_date is after end_date`);
  }
  if (occurrence.start_date < datasetStart) {
    fail(`${label}: starts before the derived dataset start ${datasetStart}`);
  }
  if (occurrence.end_date > COVERAGE_END) {
    fail(`${label}: ends after the coverage end ${COVERAGE_END}`);
  }
  if (Number(occurrence.start_date.slice(0, 4)) !== occurrence.year) {
    fail(`${label}: year ${occurrence.year} does not match start_date`);
  }
  if (occurrence.notes !== undefined && occurrence.notes !== null && typeof occurrence.notes !== 'string') {
    fail(`${label}: notes must be a string`);
  }

  const duplicateKey = `${definition.name}|${occurrence.start_date}|${occurrence.end_date}`;
  if (seen.has(duplicateKey)) {
    fail(`${label}: duplicate of ${seen.get(duplicateKey)} (same name, start and end)`);
  }
  seen.set(duplicateKey, label);

  const key = `${occurrence.definition_id}|${occurrence.year}`;
  if (!byDefinitionYear.has(key)) byDefinitionYear.set(key, []);
  byDefinitionYear.get(key).push(occurrence);
}

// ---- Recurrence coverage ----
for (const definition of canonical.definitions) {
  const occurrences = canonical.occurrences.filter((o) => o.definition_id === definition.id);
  if (occurrences.length === 0) {
    fail(`definition ${definition.id}: has no occurrences`);
    continue;
  }

  const excluded = new Map((definition.excluded_years ?? []).map((entry) => [entry.year, entry.reason]));
  for (const entry of definition.excluded_years ?? []) {
    if (!YEARS.includes(entry.year)) fail(`definition ${definition.id}: excluded year ${entry.year} is outside coverage`);
    if (!entry.reason) fail(`definition ${definition.id}: excluded year ${entry.year} has no reason`);
    const inYear = occurrences.filter((o) => o.year === entry.year);
    if (inYear.length > 0) {
      fail(`definition ${definition.id}: year ${entry.year} is listed as excluded but has an occurrence`);
    }
  }

  if (definition.recurrence === 'one-off') {
    if (occurrences.length !== 1) fail(`definition ${definition.id}: one-off event must have exactly one occurrence`);
    continue;
  }

  if (definition.recurrence === 'annual-multiple') {
    for (const year of YEARS) {
      if (!byDefinitionYear.has(`${definition.id}|${year}`) && !excluded.has(year)) {
        fail(`definition ${definition.id}: annual-multiple is missing occurrences for ${year}`);
      }
    }
    continue;
  }

  for (const year of YEARS) {
    const count = (byDefinitionYear.get(`${definition.id}|${year}`) ?? []).length;
    const shouldExist = !excluded.has(year);
    if (shouldExist && count !== 1) {
      fail(`definition ${definition.id}: expected exactly 1 occurrence in ${year}, found ${count}`);
    }
    if (!shouldExist && count !== 0) {
      fail(`definition ${definition.id}: expected no occurrence in ${year} (excluded), found ${count}`);
    }
  }
}

// ---- Overlap sanity: same definition must not double-book a date ----
for (const [key, occurrences] of byDefinitionYear) {
  const sorted = [...occurrences].sort((a, b) => a.start_date.localeCompare(b.start_date));
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].start_date <= sorted[i - 1].end_date) {
      fail(`${key}: overlapping occurrences ${sorted[i - 1].start_date}–${sorted[i - 1].end_date} and ${sorted[i].start_date}–${sorted[i].end_date}`);
    }
  }
}

// ---- Summary ----
const events = canonical.occurrences.map((occurrence) => ({
  ...occurrence,
  name: definitions.get(occurrence.definition_id)?.name ?? '?',
  category: definitions.get(occurrence.definition_id)?.category ?? '?',
  impact: definitions.get(occurrence.definition_id)?.expected_price_impact ?? '?',
  scope: definitions.get(occurrence.definition_id)?.scope ?? '?',
  sources: [
    ...(definitions.get(occurrence.definition_id)?.sources ?? []),
    ...(occurrence.sources ?? []),
  ],
}));

const tally = (values) => values.reduce((acc, value) => {
  acc[value] = (acc[value] ?? 0) + 1;
  return acc;
}, {});

const byCategory = tally(events.map((event) => event.category));
const byImpact = tally(events.map((event) => event.impact));
const byConfidence = tally(events.map((event) => event.date_confidence));
const byScope = tally(events.map((event) => event.scope));
const byYear = tally(events.map((event) => String(event.year)));
const multiDay = events.filter((event) => event.start_date !== event.end_date).length;
const multiSource = events.filter((event) => new Set(event.sources.map((s) => s.url)).size > 1).length;

const sourcePublishers = [...new Set(canonical.definitions.flatMap((d) => d.sources.map((s) => s.publisher)))].sort();

if (errors.length > 0) {
  console.error(`✗ Event calendar validation failed with ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('✓ Event calendar is valid');
console.log(`  window            ${datasetStart} → ${COVERAGE_END} (start derived from chicken_rates.json rows[0])`);
console.log(`  definitions       ${canonical.definitions.length}`);
console.log(`  occurrences       ${events.length} (${multiDay} multi-day, ${events.length - multiDay} single-day)`);
console.log(`  by year           ${JSON.stringify(byYear)}`);
console.log(`  by category       ${JSON.stringify(byCategory)}`);
console.log(`  by impact         ${JSON.stringify(byImpact)}`);
console.log(`  by date confidence ${JSON.stringify(byConfidence)}`);
console.log(`  by scope          ${JSON.stringify(byScope)}`);
console.log(`  multi-source      ${multiSource} of ${events.length}`);
console.log(`  publishers        ${sourcePublishers.join(', ')}`);
console.log(`  last verified     ${canonical.meta.last_verified_at}`);
