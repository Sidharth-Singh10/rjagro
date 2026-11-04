import assert from 'node:assert/strict';
import { isPrediction, isLedgerBatch, chartPoints, modelIds } from '../app/utils/forecast_ledger_types.ts';
const row = { model: 'naive', date: '2026-11-05', horizon: 1, prediction: 100, lo80: 90, hi80: 110, lo95: 80, hi95: 120, intervalStatus: 'empirical', events: [], actual: null };
assert.equal(isPrediction(row), true);
assert.equal(isPrediction({ ...row, prediction: NaN }), false);
assert.equal(isPrediction({ ...row, lo80: null }), false);
assert.equal(isPrediction({ ...row, lo95: 95 }), false);
assert.equal(isPrediction({ ...row, model: 'invented' }), false);
const points = chartPoints([row, { ...row, model: 'ar1', prediction: 101 }], 'naive');
assert.equal(points.length, 1);
assert.equal(points[0].naive, 100);
assert.equal(points[0].ar1, 101);
assert.equal(points[0].existing, null);
assert.deepEqual(points[0].band95, [80, 120]);
const batch = {
    id: 'd90ae536-89dd-40f0-8182-156bfa100e99', protocolId: 'a'.repeat(64), kind: 'official', originDate: '2026-11-04',
    snapshotAt: '2026-11-04T18:35:00Z', publishedAt: '2026-11-04T18:36:00Z', status: 'published',
    datasetHash: 'b'.repeat(64), error: null,
    models: modelIds.map((id) => ({ id, name: id, version: 'v1', role: 'challenger' })),
    predictions: modelIds.map((model) => ({ ...row, model })),
};
assert.equal(isLedgerBatch(batch), true);
assert.equal(isLedgerBatch({ ...batch, models: batch.models.map(() => batch.models[0]) }), false);
assert.equal(isLedgerBatch({ ...batch, predictions: batch.predictions.slice(1) }), false);
assert.equal(isLedgerBatch({ ...batch, predictions: [] }), false);
assert.equal(isLedgerBatch({ ...batch, predictions: [...batch.predictions, row] }), false);
assert.equal(isLedgerBatch({ ...batch, predictions: batch.predictions.map((p) => p.model === 'ar1' ? { ...p, horizon: 2 } : p) }), false);
assert.equal(isLedgerBatch({ ...batch, predictions: batch.predictions.map((p) => p.model === 'ar1' ? { ...p, actual: 90 } : p) }), false);
assert.equal(isLedgerBatch({ ...batch, originDate: '2026-02-31' }), false);
assert.equal(isLedgerBatch({ ...batch, status: 'running', publishedAt: null, predictions: [] }), true);
console.log('Forecast ledger validation and chart alignment checks passed');
