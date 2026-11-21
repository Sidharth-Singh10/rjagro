import assert from 'node:assert/strict';
import { isChallenger, isChallengerDay, isChallengerEnvelope } from '../app/utils/forecast_ledger_types.ts';

const day = {
    date: '2027-01-01', prediction: 96.54,
    levelLog: 4.6, seasonalLog: 0, eventLog: 0.002, recentLog: -0.032,
    lo80: 80, hi80: 115, lo95: 70, hi95: 130, intervalStatus: 'uncalibrated_path_scenario',
};
// Components must reproduce the stored central value within the 2 dp archive contract.
assert.equal(Math.abs(Math.exp(4.6 + 0 + 0.002 - 0.032) - 96.54) <= 0.02, true);
assert.equal(isChallengerDay(day), true);
assert.equal(isChallengerDay({ ...day, levelLog: 9 }), false);
assert.equal(isChallengerDay({ ...day, lo80: 0 }), false);
assert.equal(isChallengerDay({ ...day, lo95: 100, hi95: 130 }), false);
assert.equal(isChallengerDay({ ...day, date: "2027-02-30" }), false);

const challenger = {
    status: 'ready', model: 'event_ar_v1', name: 'Event-aligned AR-error challenger', role: 'challenger',
    version: 'event-ar-v1', fingerprint: 'c'.repeat(64), trainingCutoff: '2026-11-20',
    datasetHash: 'd'.repeat(64), calendarHash: 'e'.repeat(64),
    daily: [day, { ...day, date: '2027-01-02' }],
    weekly: [{ start: '2027-01-01', end: '2027-01-07', prediction: 96.5, lo95: 70, hi95: 130, lo80: 80, hi80: 115, intervalStatus: 'uncalibrated_path_scenario' }],
};
assert.equal(isChallenger(challenger), true);
assert.equal(isChallenger({ ...challenger, role: 'production' }), false);
assert.equal(isChallenger({ ...challenger, daily: [day, { ...day, date: '2027-01-03' }] }), false);
assert.equal(isChallenger({ ...challenger, daily: [{ ...day, date: '2027-01-02' }, day] }), false);
assert.equal(isChallenger({ status: 'unavailable', model: 'event_ar_v1', version: 'v1' }), true);

const envelope = {
    protocolId: 'a'.repeat(64), caveat: 'challenger only',
    latest: { batchId: 'd90ae536-89dd-40f0-8182-156bfa100e99', originDate: '2026-11-20', publishedAt: '2026-11-21T03:41:43Z', protocolId: 'a'.repeat(64), challenger },
};
assert.equal(isChallengerEnvelope(envelope), true);
assert.equal(isChallengerEnvelope({ ...envelope, latest: null }), true);
assert.equal(isChallengerEnvelope({ ...envelope, protocolId: 'short' }), false);
assert.equal(isChallengerEnvelope({ ...envelope, latest: { ...envelope.latest, challenger: { ...challenger, daily: [] } } }), false);

console.log('Challenger forecast validation checks passed');
