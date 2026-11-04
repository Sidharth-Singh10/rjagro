import api from "../utils/api";
import { BackupLog } from "../types/interfaces";

export interface BackupLogQuery {
    from?: string;
    to?: string;
    limit?: number;
}

export const fetchBackupLog = async (
    query: BackupLogQuery = {}
): Promise<BackupLog> => {
    const params = new URLSearchParams();
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    if (query.limit) params.set("limit", String(query.limit));

    const qs = params.toString();
    const response = await api.get(`/backups/runs${qs ? `?${qs}` : ""}`);
    return response.data;
};
