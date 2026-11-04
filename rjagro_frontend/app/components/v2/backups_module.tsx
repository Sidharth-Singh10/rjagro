'use client'
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Clock,
    DatabaseBackup,
    HardDrive,
    RefreshCw,
    XCircle,
} from 'lucide-react';
import { fetchBackupLog } from '@/app/api/backups';
import { BackupRun, BackupStatus } from '@/app/types/interfaces';

const IST = 'Asia/Kolkata';

const istDayKey = (iso: string): string =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: IST,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(iso));

const formatDateTime = (iso: string | null): string => {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', {
        timeZone: IST,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(new Date(iso));
};

const formatTime = (iso: string): string =>
    new Intl.DateTimeFormat('en-IN', {
        timeZone: IST,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    }).format(new Date(iso));

const formatBytes = (bytes: number | null): string => {
    if (bytes === null || bytes === undefined) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDuration = (ms: number | null): string => {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return `${ms} ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
    return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
};

const relative = (iso: string | null): string => {
    if (!iso) return 'never';
    const diffMs = Date.now() - new Date(iso).getTime();
    const hours = diffMs / 3_600_000;
    if (hours < 1) return `${Math.round(diffMs / 60_000)} min ago`;
    if (hours < 48) return `${Math.round(hours)} h ago`;
    return `${Math.round(hours / 24)} d ago`;
};

interface StatusStyle {
    dot: string;
    chip: string;
    label: string;
    icon: React.ElementType;
}

const STATUS: Record<BackupStatus, StatusStyle> = {
    success: {
        dot: 'bg-green-500',
        chip: 'bg-green-50 text-green-700 border-green-200',
        label: 'Success',
        icon: CheckCircle2,
    },
    partial: {
        dot: 'bg-amber-500',
        chip: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Local only',
        icon: AlertTriangle,
    },
    failed: {
        dot: 'bg-red-500',
        chip: 'bg-red-50 text-red-700 border-red-200',
        label: 'Failed',
        icon: XCircle,
    },
    running: {
        dot: 'bg-gray-400',
        chip: 'bg-gray-50 text-gray-700 border-gray-200',
        label: 'Running',
        icon: Clock,
    },
};

const statusOf = (run: BackupRun): BackupStatus =>
    run.stale && run.status === 'running' ? 'failed' : run.status;

const worstStatus = (runs: BackupRun[]): BackupStatus => {
    const order: BackupStatus[] = ['failed', 'partial', 'running', 'success'];
    const present = new Set(runs.map(statusOf));
    return order.find((s) => present.has(s)) ?? 'success';
};

const StatusChip: React.FC<{ status: BackupStatus }> = ({ status }) => {
    const style = STATUS[status];
    const Icon = style.icon;
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${style.chip}`}
        >
            <Icon className="h-3.5 w-3.5" />
            {style.label}
        </span>
    );
};

const KpiCard: React.FC<{
    label: string;
    value: string;
    hint?: string;
    icon: React.ElementType;
    tone?: 'default' | 'warn' | 'bad';
}> = ({ label, value, hint, icon: Icon, tone = 'default' }) => {
    const toneClass =
        tone === 'bad'
            ? 'text-red-600'
            : tone === 'warn'
                ? 'text-amber-600'
                : 'text-gray-900';

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
                <Icon className="h-4 w-4 text-gray-400" />
            </div>
            <p className={`mt-2 text-xl font-semibold ${toneClass}`}>{value}</p>
            {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
    );
};

const BackupsModule: React.FC = () => {
    const [cursor, setCursor] = useState(() => {
        const now = new Date();
        return { y: now.getUTCFullYear(), m: now.getUTCMonth() };
    });

    const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
        queryKey: ['backup_log'],
        queryFn: () => fetchBackupLog({ limit: 200 }),
        staleTime: 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });

    const runs = data?.runs ?? [];
    const summary = data?.summary;

    const byDay = useMemo(() => {
        const map = new Map<string, BackupRun[]>();
        for (const run of runs) {
            const key = istDayKey(run.started_at);
            const list = map.get(key);
            if (list) list.push(run);
            else map.set(key, [run]);
        }
        return map;
    }, [runs]);

    const todayKey = istDayKey(new Date().toISOString());
    const scheduledDays = summary?.schedule.days_of_month ?? [];

    const monthLabel = new Intl.DateTimeFormat('en-IN', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(cursor.y, cursor.m, 1)));

    const firstWeekday = new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();

    const shiftMonth = (delta: number) => {
        const d = new Date(Date.UTC(cursor.y, cursor.m + delta, 1));
        setCursor({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
    };

    const lastSuccessAt = summary?.last_success_at ?? null;
    const hoursSince = summary?.hours_since_success ?? null;
    const stale = hoursSince === null || hoursSince > (summary?.schedule.every_days ?? 3) * 24 + 12;
    const missedInWindow = summary?.window.failed ?? 0;

    return (
        <div className="space-y-6">
            {/* Staleness banner: the failure mode this tab exists to catch. */}
            {!isLoading && !isError && stale && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                    <div className="text-sm text-amber-800">
                        <p className="font-medium">No successful backup in the expected window.</p>
                        <p className="mt-0.5 text-amber-700">
                            Last success: {formatDateTime(lastSuccessAt)} ({relative(lastSuccessAt)}).
                            Expected every {summary?.schedule.every_days} days — check
                            {' '}<code className="rounded bg-amber-100 px-1">db-backup.service</code>.
                        </p>
                    </div>
                </div>
            )}

            {isError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Could not load the backup log.</p>
                        <p className="mt-0.5">
                            {error instanceof Error ? error.message : 'Unknown error.'} The
                            endpoint reads the <code>backup_runs</code> table — it may not be
                            migrated yet.
                        </p>
                    </div>
                </div>
            )}

            {/* KPI strip */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    label="Last successful"
                    value={lastSuccessAt ? relative(lastSuccessAt) : 'never'}
                    hint={formatDateTime(lastSuccessAt)}
                    icon={CheckCircle2}
                    tone={stale ? 'warn' : 'default'}
                />
                <KpiCard
                    label="Next scheduled"
                    value={summary ? formatDateTime(summary.next_scheduled_at) : '—'}
                    hint={
                        summary
                            ? `Every ${summary.schedule.every_days} days at ${summary.schedule.time_utc} UTC`
                            : undefined
                    }
                    icon={CalendarDays}
                />
                <KpiCard
                    label="Window result"
                    value={
                        summary
                            ? `${summary.window.success} ok / ${summary.window.partial} partial / ${summary.window.failed} failed`
                            : '—'
                    }
                    hint={
                        summary
                            ? `Last ${summary.window.runs} run${summary.window.runs === 1 ? '' : 's'}`
                            : undefined
                    }
                    icon={DatabaseBackup}
                    tone={missedInWindow > 0 ? 'bad' : 'default'}
                />
                <KpiCard
                    label="Stored (window)"
                    value={summary ? formatBytes(summary.total_bytes) : '—'}
                    hint={
                        summary?.remote_host
                            ? `Reviewed remote: ${summary.remote_host}:/srv/backups`
                            : 'Remote target not recorded yet'
                    }
                    icon={HardDrive}
                />
            </div>

            {/* Calendar */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-green-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Backup calendar</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500" /> success
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" /> local only
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500" /> failed / missed
                        </span>
                        <button
                            onClick={() => refetch()}
                            className="ml-2 inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 font-medium text-gray-600 hover:bg-gray-50"
                            aria-label="Refresh backup log"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="mb-2 flex items-center justify-between">
                    <button
                        onClick={() => shiftMonth(-1)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
                        aria-label="Previous month"
                    >
                        ‹
                    </button>
                    <span className="text-sm font-medium text-gray-800">{monthLabel}</span>
                    <button
                        onClick={() => shiftMonth(1)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
                        aria-label="Next month"
                    >
                        ›
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-gray-400">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <div key={d} className="py-1">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstWeekday }).map((_, i) => (
                        <div key={`pad-${i}`} className="h-16 rounded-lg bg-transparent" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const key = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayRuns = byDay.get(key) ?? [];
                        const isScheduled = scheduledDays.includes(day);
                        const isToday = key === todayKey;
                        const isPast = key < todayKey;
                        const missed = isScheduled && dayRuns.length === 0 && isPast;
                        const status = dayRuns.length > 0 ? worstStatus(dayRuns) : null;
                        const dotClass = missed
                            ? 'bg-red-500'
                            : status
                                ? STATUS[status].dot
                                : '';

                        return (
                            <div
                                key={key}
                                title={
                                    dayRuns.length > 0
                                        ? dayRuns
                                            .map(
                                                (r) =>
                                                    `${formatTime(r.started_at)} · ${STATUS[statusOf(r)].label}${
                                                        r.filename ? ` · ${r.filename}` : ''
                                                    }${r.error ? ` · ${r.error}` : ''}`
                                            )
                                            .join('\n')
                                        : missed
                                            ? 'Scheduled backup — no run recorded'
                                            : isScheduled
                                                ? 'Scheduled backup'
                                                : undefined
                                }
                                className={[
                                    'flex h-16 flex-col items-center justify-center rounded-lg border text-xs transition-colors',
                                    missed
                                        ? 'border-red-200 bg-red-50'
                                        : dayRuns.length > 0
                                            ? 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                                            : isScheduled
                                                ? 'border-dashed border-gray-300 bg-white'
                                                : 'border-transparent',
                                    isToday ? 'ring-2 ring-green-400' : '',
                                ].join(' ')}
                            >
                                <span
                                    className={
                                        isToday
                                            ? 'font-semibold text-green-700'
                                            : 'font-medium text-gray-600'
                                    }
                                >
                                    {day}
                                </span>
                                {isScheduled && dayRuns.length === 0 && (
                                    <span className="mt-0.5 text-[9px] uppercase tracking-wide text-gray-400">
                                        due
                                    </span>
                                )}
                                {dayRuns.length > 0 && (
                                    <span className="mt-1 flex items-center gap-0.5">
                                        {dayRuns.slice(0, 3).map((r) => (
                                            <span
                                                key={r.id}
                                                className={`h-1.5 w-1.5 rounded-full ${STATUS[statusOf(r)].dot}`}
                                            />
                                        ))}
                                        {dayRuns.length > 3 && (
                                            <span className="text-[9px] text-gray-500">
                                                +{dayRuns.length - 3}
                                            </span>
                                        )}
                                    </span>
                                )}
                                {missed && (
                                    <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-red-500">
                                        missed
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent runs */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">Recent runs</h3>
                    <span className="text-xs text-gray-500">
                        {runs.length} record{runs.length === 1 ? '' : 's'}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                                <th className="px-4 py-2 font-medium">Started (IST)</th>
                                <th className="px-4 py-2 font-medium">Status</th>
                                <th className="px-4 py-2 font-medium">Size</th>
                                <th className="px-4 py-2 font-medium">Duration</th>
                                <th className="px-4 py-2 font-medium">Remote</th>
                                <th className="px-4 py-2 font-medium">Trigger</th>
                                <th className="px-4 py-2 font-medium">File</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                        Loading backup history…
                                    </td>
                                </tr>
                            )}
                            {!isLoading && runs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                        No backups recorded yet.
                                    </td>
                                </tr>
                            )}
                            {runs.map((run) => (
                                <tr key={run.id} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                                        {formatDateTime(run.started_at)}
                                    </td>
                                    <td className="px-4 py-2">
                                        <StatusChip status={statusOf(run)} />
                                        {run.error && (
                                            <p
                                                className="mt-1 max-w-[22rem] truncate text-xs text-red-600"
                                                title={run.error}
                                            >
                                                {run.error}
                                            </p>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                                        {formatBytes(run.dump_bytes)}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                                        {formatDuration(run.duration_ms)}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2">
                                        {run.remote_ok ? (
                                            <span className="text-green-700">
                                                {run.remote_host ?? 'remote'} ✓
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">
                                                {run.remote_host ? `${run.remote_host} ✗` : '—'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 capitalize text-gray-600">
                                        {run.triggered_by}
                                    </td>
                                    <td
                                        className="max-w-[16rem] truncate px-4 py-2 font-mono text-xs text-gray-500"
                                        title={run.filename ?? undefined}
                                    >
                                        {run.filename ?? '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BackupsModule;
