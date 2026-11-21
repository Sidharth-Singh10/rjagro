import assert from 'node:assert/strict';
import {
    MODEL_OPTIONS, HORIZONS, publishedDays, challengerDays, ledgerDays, trimHorizon,
} from '../app/utils/model_series.ts';

// Five options, challenger available, exactly one published entry.
assert.equal(MODEL_OPTIONS.length, 5);
assert.equal(MODEL_OPTIONS.filter((o) => o.role === 'published').length, 1);
assert.equal(MODEL_OPTIONS.filter((o) => o.role === 'challenger').length, 1);
assert.deepEqual(MODEL_OPTIONS.map((o) => o.id), ['published', 'event_ar', 'hybrid', 'ar1', 'naive']);
// No duplicate equation: the ledger's `existing` is the published model.
assert.equal(MODEL_OPTIONS.some((o) => o.id === 'existing'), false);
assert.deepEqual(HORIZONS.map((h) => h.value), [30, 90, 180, 'all']);

const payload = {
    forecast: {
        start: '2026-11-21',
        daily: [
            { date: '2026-11-21', forecast: 96, baseline: 94, lo80: 80, hi80: 112, lo95: 72, hi95: 124, events: ['lagan-weddings'] },
            { date: '2026-11-22', forecast: 96.5, baseline: 94.5, lo80: 80, hi80: 112, lo95: 72, hi95: 124, events: [] },
        ],
    },
    events: { items: [{ id: 'lagan-weddings', name: 'Wedding season' }] },
};
const published = publishedDays(payload);
assert.equal(published.length, 2);
assert.equal(published[0].baseline, 94);
assert.deepEqual(published[0].events, ['Wedding season']);
// A row missing a band is dropped rather than plotted as a hole.
assert.equal(publishedDays({ ...payload, forecast: { start: 'x', daily: [{ ...payload.forecast.daily[0], lo95: null }] } }).length, 0);

const envelope = {
    latest: {
        challenger: {
            status: 'ready',
            daily: [
                { date: '2026-11-21', prediction: 96.27, lo80: 79.6, hi80: 118.5, lo95: 71.3, hi95: 133.3 },
                { date: '2026-11-22', prediction: 96.3, lo80: 79.6, hi80: 118.5, lo95: 71.3, hi95: 133.3 },
            ],
        },
    },
};
const challenger = challengerDays(envelope);
assert.equal(challenger.length, 2);
assert.equal(challenger[0].forecast, 96.27);
assert.equal(challenger[0].baseline, null);
assert.deepEqual(challenger[0].events, []);
assert.deepEqual(challengerDays({ latest: null }), []);
assert.deepEqual(challengerDays({ latest: { challenger: { status: 'unavailable' } } }), []);

const batch = {
    status: 'published',
    predictions: [
        { model: 'ar1', date: '2026-11-22', prediction: 95, lo80: 80, hi80: 110, lo95: 70, hi95: 120, events: [] },
        { model: 'ar1', date: '2026-11-21', prediction: 94, lo80: 80, hi80: 110, lo95: 70, hi95: 120, events: [{ name: 'Diwali window' }] },
        { model: 'naive', date: '2026-11-21', prediction: 79, lo80: 70, hi80: 90, lo95: 60, hi95: 100, events: [] },
        { model: 'hybrid', date: '2026-11-21', prediction: 87, lo80: null, hi80: null, lo95: null, hi95: null, events: [] },
    ],
};
const ar1 = ledgerDays(batch, 'ar1');
assert.equal(ar1.length, 2);
// Sorted by date even though the source rows were not.
assert.deepEqual(ar1.map((d) => d.date), ['2026-11-21', '2026-11-22']);
assert.deepEqual(ar1[0].events, ['Diwali window']);
assert.equal(ar1[0].baseline, null);
// A model whose bands are missing contributes nothing instead of a null band.
assert.deepEqual(ledgerDays(batch, 'hybrid'), []);
assert.deepEqual(ledgerDays({ ...batch, status: 'running' }, 'ar1'), []);

const days = Array.from({ length: 200 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 10, 21) + i * 86_400_000).toISOString().slice(0, 10),
}));
assert.equal(trimHorizon(days, 90).length, 90);
assert.equal(trimHorizon(days, 30).length, 30);
assert.equal(trimHorizon(days, 'all').length, 200);
// Anchor-driven trimming keeps the issued start, not the first array element.
assert.equal(trimHorizon(days.slice(5), 10, days[5].date).length, 10);
assert.deepEqual(trimHorizon([], 90), []);

console.log('Model forecast adapter checks passed');
