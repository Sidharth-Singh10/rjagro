/**
 * Converts the wholesale chicken rate tracker CSV into the static dataset the
 * Analytics tab reads.
 *
 * Usage (from rjagro_frontend/):
 *   node scripts/parse_rate_tracker.mjs
 *
 * The CSV is a hand-maintained sheet: a title row, a header row and then
 * `d-Mon-yyyy,<rate>` pairs. Rates are ₹/kg and blank cells mean "no quote
 * that day", never zero — those days are dropped rather than filled.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(here, '../data/rate_tracker_chicken.csv');
const outputPath = resolve(here, '../app/data/chicken_rates.json');

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** "1-Apr-2025" -> "2025-04-01" */
const toIsoDate = (value) => {
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (month === undefined) return null;
  return `${year}-${String(month + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const text = readFileSync(inputPath, 'utf8').replace(/\r\n?/g, '\n');

const rows = [];
const seen = new Set();
let skipped = 0;

for (const line of text.split('\n')) {
  const cells = line.split(',').map((cell) => cell.trim());
  const [dateCell, ...rest] = cells;
  if (!dateCell || !/^\d/.test(dateCell)) continue;

  const date = toIsoDate(dateCell);
  if (!date) {
    skipped += 1;
    continue;
  }
  if (seen.has(date)) throw new Error(`Duplicate date in CSV: ${dateCell}`);

  const rawRate = rest.find((cell) => cell !== '');
  if (rawRate === undefined) continue; // blank rate → no quote that day

  const rate = Number(rawRate);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Unparseable rate for ${dateCell}: "${rawRate}"`);
  }

  seen.add(date);
  rows.push({ date, rate });
}

if (rows.length === 0) throw new Error('No priced rows parsed — check the CSV layout');

rows.sort((a, b) => a.date.localeCompare(b.date));

const dataset = {
  source: 'RATE TRACKER - Chicken Rate.csv',
  unit: 'INR/kg',
  start: rows[0].date,
  end: rows[rows.length - 1].date,
  rows,
};

writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);

console.log(
  `Parsed ${rows.length} priced days (${skipped} unreadable rows skipped) ` +
  `${dataset.start} → ${dataset.end} → ${outputPath}`,
);
