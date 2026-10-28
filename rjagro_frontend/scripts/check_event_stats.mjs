/**
 * Known-answer tests for the statistics kernel. These fixtures are small enough
 * to check by hand, so a regression in the trend fit, the benchmark or the
 * multiplicity adjustment fails loudly instead of quietly moving every label.
 *
 *   node --no-warnings --experimental-strip-types \
 *        --experimental-loader ./scripts/json_module_loader.mjs \
 *        scripts/check_event_stats.mjs
 */
import {
    benjaminiHochberg, buildBenchmark, contiguousBlocks, fitLogTrend,
    meanForecastError, percentChange, roundTo, stabilityRange,
} from '../app/utils/event_stats.ts';

const failures = [];
const check = (label, ok, detail = '') => {
    if (!ok) failures.push(`${label}${detail ? `: ${detail}` : ''}`);
};
const near = (a, b, tolerance = 1e-9) => a !== null && b !== null && Math.abs(a - b) <= tolerance;

const day = (index) => new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10);
const points = (rates) => rates.map((rate, index) => ({ date: day(index), rate }));

// ---------------------------------------------------------------------------
// Trend fit on exact log-linear data
// ---------------------------------------------------------------------------
const logLinear = points([0, 1, 2, 3].map((t) => 100 * Math.exp(0.01 * t)));
const trend = fitLogTrend(logLinear);

check('fitLogTrend returns a fit', trend !== null);
if (trend) {
    check('fitLogTrend slope', near(trend.slope, 0.01, 1e-12), String(trend.slope));
    check('fitLogTrend intercept', near(trend.intercept, Math.log(100), 1e-12), String(trend.intercept));
    check('fitLogTrend r2', near(trend.r2, 1, 1e-12), String(trend.r2));
    check('fitLogTrend n', trend.n === 4, String(trend.n));
}
check('fitLogTrend rejects two points', fitLogTrend(logLinear.slice(0, 2)) === null);

// One day at 110 against a 1%/day trend from 100 is ~5.5% above forecast.
const residual = trend ? meanForecastError(trend, [{ date: day(4), rate: 110 }]) : null;
check('meanForecastError', near(residual, Math.log(110) - Math.log(100) - 0.04, 1e-12), String(residual));

// ---------------------------------------------------------------------------
// Benchmark: a value above every comparable window
// ---------------------------------------------------------------------------
const syntheticWindows = Array.from({ length: 21 }, (_, index) => ({
    anchor: day(index),
    value: -0.1 + index * 0.001,
}));
const top = buildBenchmark(0.5, day(0), syntheticWindows);
check('buildBenchmark returns a benchmark', top !== null);
if (top) {
    check('buildBenchmark n', top.n === 20, String(top.n));
    check('buildBenchmark percentile', top.percentile === 100, String(top.percentile));
    check('buildBenchmark add-one p', near(top.p, roundTo(2 / 21, 3)), String(top.p));
    check('buildBenchmark local flag', top.kind === 'local', top.kind);
}
check('buildBenchmark needs 20 windows', buildBenchmark(0.5, day(0), syntheticWindows.slice(0, 19)) === null);

// ---------------------------------------------------------------------------
// Benjamini–Hochberg
// ---------------------------------------------------------------------------
const q = benjaminiHochberg([0.01, 0.04, 0.03, null]);
check('BH length', q.length === 4);
check('BH smallest', near(q[0], 0.03), String(q[0]));
check('BH middle', near(q[1], 0.04), String(q[1]));
check('BH third', near(q[2], 0.04), String(q[2]));
check('BH null stays null', q[3] === null);

// ---------------------------------------------------------------------------
// Baseline stability
// ---------------------------------------------------------------------------
const flat = stabilityRange(points(Array.from({ length: 20 }, () => 100)), day(14), day(19), 6);
check('stabilityRange returns a range', flat !== null);
if (flat) {
    check('stabilityRange flat is stable', flat.stable);
    check('stabilityRange flat shifts', flat.shifts === 5, String(flat.shifts));
    check('stabilityRange flat min', near(flat.min, 0), String(flat.min));
}

const spiked = points([
    ...Array.from({ length: 10 }, () => 90),
    ...Array.from({ length: 4 }, () => 130),
    ...Array.from({ length: 6 }, () => 100),
]);
const fragile = stabilityRange(spiked, day(14), day(19), 6);
check('stabilityRange spiked returns a range', fragile !== null);
if (fragile) {
    check('stabilityRange spiked flips sign', fragile.stable === false, String(fragile.stable));
    check('stabilityRange spiked crosses zero', fragile.min < 0 && fragile.max > 0, `${fragile.min}..${fragile.max}`);
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
check('percentChange', near(percentChange(100, 110), 10));
check('roundTo', roundTo(1.2345, 2) === 1.23);

const split = contiguousBlocks([
    { date: '2025-01-01', rate: 100 },
    { date: '2025-01-02', rate: 101 },
    { date: '2025-01-03', rate: 102 },
    { date: '2025-01-06', rate: 103 },
    { date: '2025-01-07', rate: 104 },
]);
check('contiguousBlocks block count', split.length === 2, String(split.length));
check('contiguousBlocks first block', split[0].length === 3, String(split[0].length));
check('contiguousBlocks second block', split[1].length === 2, String(split[1].length));

if (failures.length > 0) {
    console.error(`✗ ${failures.length} statistics check(s) failed`);
    failures.forEach((failure) => console.error(`  ${failure}`));
    process.exit(1);
}

console.log('✓ Statistics kernel fixtures pass');
