export const modelIds = ['existing', 'hybrid', 'ar1', 'naive'] as const;
export type LedgerModel = typeof modelIds[number];
export interface LedgerEvent { id: string; name: string; start: string; end: string; leadStart: string }
export interface ModelDefinition { id: LedgerModel; name: string; version: string; role: string }
export interface BatchSummary {
    id: string; protocolId: string; kind: 'official' | 'ad_hoc'; originDate: string;
    snapshotAt: string; publishedAt: string | null; status: string; error: string | null;
    datasetHash: string; requestedAt?: string; lastQuote?: string; total?: number;
}
export interface LedgerPrediction {
    model: LedgerModel; date: string; horizon: number; prediction: number;
    lo80: number | null; hi80: number | null; lo95: number | null; hi95: number | null;
    intervalStatus: string; events: LedgerEvent[]; actual: number | null;
}
export interface LedgerBatch extends BatchSummary { models: ModelDefinition[]; predictions: LedgerPrediction[] }
export interface BatchList {
    protocolId: string | null; protocols: Array<{ id: string; name: string; models: ModelDefinition[]; events: Array<{id: string; name: string}>; createdAt: string }>;
    batches: BatchSummary[]; limit: number; offset: number;
}
export interface LedgerScore {
    model: LedgerModel; bucket: string; n: number; origins: number; uniqueDates: number;
    mae: number; originMae: number; rmse: number; smape: number; bias: number;
    intervalN80: number; intervalN95: number; coverage80: number | null; coverage95: number | null;
    eventOccurrences: number; eventYears: number;
    width80: number | null; width95: number | null; intervalScore80: number | null; intervalScore95: number | null;
    evaluatedAt: string;
}
export interface ScoreResponse {
    protocolId: string | null; kind: string; segment: string; generatedAt: string; caveat: string; scores: LedgerScore[];
}
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optionalNumber = (v: unknown) => v === null || finite(v);
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const isTimestamp = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
const isFingerprint = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
export const isModel = (v: unknown): v is LedgerModel => modelIds.some((m) => m === v);
export const isBatchSummary = (v: unknown): v is BatchSummary => object(v)
    && typeof v.id === 'string' && isFingerprint(v.protocolId) && isDate(v.originDate)
    && (v.kind === 'official' || v.kind === 'ad_hoc')
    && ['queued', 'running', 'published', 'failed', 'blocked', 'missed'].includes(String(v.status))
    && isTimestamp(v.snapshotAt) && isFingerprint(v.datasetHash) && (v.error === null || typeof v.error === 'string')
    && (v.status === 'published' ? isTimestamp(v.publishedAt) : v.publishedAt === null);
export const isPrediction = (v: unknown): v is LedgerPrediction => {
    if (!object(v) || !isModel(v.model) || !isDate(v.date)
        || !finite(v.horizon) || !Number.isInteger(v.horizon) || v.horizon < 1
        || !finite(v.prediction) || v.prediction <= 0 || !optionalNumber(v.actual) || (finite(v.actual) && v.actual <= 0)
        || typeof v.intervalStatus !== 'string' || !Array.isArray(v.events)) return false;
    for (const level of [80, 95]) {
        const lo = v[`lo${level}`], hi = v[`hi${level}`];
        if (lo === null && hi === null) continue;
        if (!finite(lo) || !finite(hi) || lo <= 0 || lo > v.prediction || hi < v.prediction) return false;
    }
    if (finite(v.lo80) && finite(v.lo95) && (v.lo95 > v.lo80 || Number(v.hi95) < Number(v.hi80))) return false;
    return v.events.every((e: unknown) => object(e) && ['id','name','start','end','leadStart'].every((k) => typeof e[k] === 'string'));
};
export const isLedgerBatch = (v: unknown): v is LedgerBatch => {
    if (!object(v) || !isBatchSummary(v) || !Array.isArray(v.models) || v.models.length !== 4
        || !v.models.every((m: unknown) => object(m) && isModel(m.id) && typeof m.name === 'string' && typeof m.version === 'string' && typeof m.role === 'string')
        || new Set(v.models.map((m) => m.id)).size !== 4
        || !Array.isArray(v.predictions) || !v.predictions.every(isPrediction)) return false;
    if (v.status !== 'published') return v.predictions.length === 0;
    if (!v.predictions.length) return false;
    const cohorts = new Map<string, { models: Set<LedgerModel>; actual: number | null }>();
    const origin = Date.parse(v.originDate);
    for (const p of v.predictions as LedgerPrediction[]) {
        if ((Date.parse(p.date) - origin) / 86_400_000 !== p.horizon) return false;
        const cohort = cohorts.get(p.date) ?? { models: new Set<LedgerModel>(), actual: p.actual };
        if (cohort.models.has(p.model) || cohort.actual !== p.actual) return false;
        cohort.models.add(p.model);
        cohorts.set(p.date, cohort);
    }
    return [...cohorts.values()].every((c) => c.models.size === 4);
};
export const isLedgerScore = (v: unknown): v is LedgerScore => {
    if (!object(v) || !isModel(v.model) || !['1-7','8-30','31-90','91-180','181-365','>365'].includes(String(v.bucket))
        || !isTimestamp(v.evaluatedAt)) return false;
    for (const k of ['n','origins','uniqueDates','intervalN80','intervalN95','eventOccurrences','eventYears']) {
        if (!finite(v[k]) || !Number.isInteger(v[k]) || v[k] < 0) return false;
    }
    for (const k of ['mae','originMae','rmse','smape','bias']) if (!finite(v[k])) return false;
    for (const k of ['coverage80','coverage95','width80','width95','intervalScore80','intervalScore95']) if (!optionalNumber(v[k])) return false;
    for (const level of [80,95]) {
        const coverage = v[`coverage${level}`];
        if (finite(coverage) && (coverage < 0 || coverage > 1)) return false;
        if ((v[`intervalN${level}`] === 0) !== (coverage === null)) return false;
    }
    return true;
};
export interface LedgerPoint {
    date: string; actual: number | null; existing: number | null; hybrid: number | null; ar1: number | null; naive: number | null;
    band80: [number, number] | null; band95: [number, number] | null; events: string[];
}
export function chartPoints(rows: LedgerPrediction[], intervalModel: LedgerModel): LedgerPoint[] {
    const byDate = new Map<string, LedgerPoint>();
    for (const r of rows) {
        const point = byDate.get(r.date) ?? { date: r.date, actual: r.actual, existing: null, hybrid: null, ar1: null, naive: null, band80: null, band95: null, events: [] };
        point[r.model] = r.prediction;
        point.events = [...new Set([...point.events, ...r.events.map((e) => e.name)])];
        if (r.model === intervalModel) {
            point.band80 = r.lo80 !== null && r.hi80 !== null ? [r.lo80, r.hi80] : null;
            point.band95 = r.lo95 !== null && r.hi95 !== null ? [r.lo95, r.hi95] : null;
        }
        byDate.set(r.date, point);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
