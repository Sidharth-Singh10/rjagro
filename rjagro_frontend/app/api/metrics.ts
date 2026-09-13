import { MetricSnapshot, MetricSnapshotQuery } from "../types/interfaces";
import api from "../utils/api";

export const fetchMetricSnapshots = async (
    query: MetricSnapshotQuery = {}
): Promise<MetricSnapshot[]> => {
    const params = new URLSearchParams();
    if (query.period_type) params.set("period_type", query.period_type);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    if (query.metrics && query.metrics.length > 0) params.set("metrics", query.metrics.join(","));

    const qs = params.toString();
    const response = await api.get(`/getall/metric_snapshots${qs ? `?${qs}` : ""}`);
    return response.data;
};
