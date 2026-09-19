'use client'
import { memo, useEffect, useMemo, useState } from 'react';
import { chart } from "./overview/chart_colors";
import { useQuery } from '@tanstack/react-query';
import {
    Banknote, TrendingUp, TrendingDown, Bird, Heart,
    Landmark, IndianRupee, LucideIcon, Receipt, Scale, ArrowLeftRight, Briefcase, Package, Wallet,
} from 'lucide-react';

import { fetchLedgerAccounts } from '@/app/api/ledger_accounts';
import { fetchBatchSales, fetchBatchSalesByBatchId } from '@/app/api/batch_sales';
import { fetchPurchases } from '@/app/api/purchases';
import { fetchBatches, fetchBatchClosures } from '@/app/api/batches';
import { fetchLoans } from '@/app/api/loans';
import { fetchInventory } from '@/app/api/inventory';
import { fetchItems } from '@/app/api/items';
import { fetchSuppliers, fetchSupplierPaymentTotals } from '@/app/api/supplier';
import { fetchTraders, fetchTraderPaymentTotals } from '@/app/api/traders';
import { fetchLedgerEntriesSummary } from '@/app/api/ledger_entries';
import {
    fetchAllocationBatchCosts,
    fetchAllocationCategoryTotals,
    fetchAllocationFcr,
    fetchBatchFeedLines,
    fetchFeedSummary,
} from '@/app/api/aggregates';
import { fetchOtherExpensesSummary } from '@/app/api/other_expenses';
import { fetchMetricSnapshots } from '@/app/api/metrics';
import { Item, OTHER_EXPENSE_CATEGORY_LABELS } from '@/app/types/interfaces';

import { RevenueExpenseChart } from './overview/revenue_expense_chart';
import { ExpenseDonut } from './overview/expense_donut';
import { BatchProfitChart } from './overview/batch_profit_chart';
import { MortalityChart } from './overview/mortality_chart';
import { InventoryChart } from './overview/inventory_chart';
import { PayablesReceivables } from './overview/payables_receivables';
import { AvgSaleRateChart } from './overview/avg_sale_rate_chart';
import { FCRChart, FCRData } from './overview/fcr_chart';
import { FCRDetailModal } from './overview/fcr_detail_modal';
import { CogsDetailModal, CogsBreakdown, CogsMonthTotals } from './overview/cogs_detail_modal';
import { NetProfitModal, NetProfitBreakdown, NetProfitMonth } from './overview/net_profit_modal';
import { CostPerBirdChart, CostPerBirdData } from './overview/cost_per_bird_chart';
import { BreakevenChart, BreakevenData } from './overview/breakeven_chart';
import { AvgWeightChart, AvgWeightData } from './overview/avg_weight_chart';
import { LiftingHeatmap } from './overview/lifting_heatmap';
import { RangeFilter, sliceSeries, SeriesPoint } from './overview/range_filter';
import {
    PnlTrendChart,
    MarginTrendChart,
    RevenuePerKgChart,
    CashFlowChart,
    WorkingCapitalChart,
    OpsVolumeChart,
    EfficiencyChart,
} from './overview/financial_charts';

const STALE = 5 * 60 * 1000;

const n = (v: unknown): number => Number(v) || 0;

// API serializes payment_type enum as variant names ("Receivable", "Payable",
// "Cash"), while the DB enum values are uppercase. Compare case-insensitively.
const isPaymentType = (value: unknown, expected: string) =>
    String(value ?? '').toUpperCase() === expected;

const fmt = (v: number) =>
    `₹${n(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getMonthKey = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (key: string) => {
    const [year, month] = key.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

const OverviewKPI = memo(({ title, value, subtext, icon: Icon, color, onDoubleClick }: {
    title: string;
    value: string;
    subtext: string;
    icon: LucideIcon;
    color: string;
    onDoubleClick?: () => void;
}) => (
    <div
        onDoubleClick={onDoubleClick}
        title={onDoubleClick ? 'Double-click to see calculation' : undefined}
        className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${onDoubleClick ? 'cursor-pointer select-none' : ''}`}
    >
        <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
                backgroundColor: `color-mix(in srgb, ${color} 10%, white)`,
                color,
            }}
        >
            <Icon size={22} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500">{title}</p>
            <p className="text-xl font-semibold text-gray-900 truncate mt-0.5 tnum">{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{subtext}</p>
        </div>
    </div>
));
OverviewKPI.displayName = 'OverviewKPI';

const OverviewModule = () => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // ── Financial chart range filters (monthly) ───────────────────────
    const [monthlyMode, setMonthlyMode] = useState('12m');
    const [monthlyFrom, setMonthlyFrom] = useState('');
    const [monthlyTo, setMonthlyTo] = useState('');

    // ── Data fetching ─────────────────────────────────────────────────
    const { data: ledgerAccounts = [] } = useQuery({
        queryKey: ['ledger_accounts'], queryFn: fetchLedgerAccounts, staleTime: STALE,
    });
    const { data: batchSales = [] } = useQuery({
        queryKey: ['batch_sales'], queryFn: fetchBatchSales, staleTime: STALE,
    });
    const { data: purchases = [] } = useQuery({
        queryKey: ['purchases'], queryFn: fetchPurchases, staleTime: STALE,
    });
    const { data: batches = [] } = useQuery({
        queryKey: ['batches'], queryFn: fetchBatches, staleTime: STALE,
    });
    const { data: loans = [] } = useQuery({
        queryKey: ['loans'], queryFn: fetchLoans, staleTime: STALE,
    });
    const { data: inventory = [] } = useQuery({
        queryKey: ['inventory'], queryFn: fetchInventory, staleTime: STALE,
    });
    const { data: items = [] } = useQuery({
        queryKey: ['items'], queryFn: fetchItems, staleTime: STALE,
    });
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'], queryFn: fetchSuppliers, staleTime: STALE,
    });
    const { data: traders = [] } = useQuery({
        queryKey: ['traders'], queryFn: fetchTraders, staleTime: STALE,
    });
    const { data: batchClosures = [] } = useQuery({
        queryKey: ['batch_closures'], queryFn: fetchBatchClosures, staleTime: STALE,
    });
    const { data: ledgerSummary = [] } = useQuery({
        queryKey: ['ledger_entries', 'summary', lastMonthKey, thisMonthKey],
        queryFn: () => fetchLedgerEntriesSummary(lastMonthKey, thisMonthKey),
        staleTime: STALE,
    });
    const { data: expenseSummary = [] } = useQuery({
        queryKey: ['other_expenses', 'summary', lastMonthKey, thisMonthKey],
        queryFn: () => fetchOtherExpensesSummary(lastMonthKey, thisMonthKey),
        staleTime: STALE,
    });
    const { data: feedSummary } = useQuery({
        queryKey: ['inventory_feed_summary'], queryFn: fetchFeedSummary, staleTime: STALE,
    });
    const { data: allocationCategoryTotals = [] } = useQuery({
        queryKey: ['allocation_category_totals', lastMonthKey, thisMonthKey],
        queryFn: () => fetchAllocationCategoryTotals(lastMonthKey, thisMonthKey),
        staleTime: STALE,
    });
    const { data: allocationBatchCosts = [] } = useQuery({
        queryKey: ['allocation_batch_costs', 10],
        queryFn: () => fetchAllocationBatchCosts(10),
        staleTime: STALE,
    });
    const { data: allocationFcr = [] } = useQuery({
        queryKey: ['allocation_fcr', 10],
        queryFn: () => fetchAllocationFcr(10),
        staleTime: STALE,
    });

    // Only the monthly snapshots are charted, and only for the selected range.
    const metricRange = useMemo(() => {
        if (monthlyMode === 'all') return { from: undefined as string | undefined, to: undefined as string | undefined };
        if (monthlyMode === 'custom' && (monthlyFrom || monthlyTo)) {
            return { from: monthlyFrom || undefined, to: monthlyTo || undefined };
        }
        const start = new Date();
        start.setMonth(start.getMonth() - 11);
        const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
        return { from, to: thisMonthKey };
    }, [monthlyMode, monthlyFrom, monthlyTo, thisMonthKey]);

    const { data: metricSnapshots = [] } = useQuery({
        queryKey: ['metric_snapshots', 'month', metricRange.from ?? '', metricRange.to ?? ''],
        queryFn: () => fetchMetricSnapshots({ period_type: 'month', from: metricRange.from, to: metricRange.to }),
        staleTime: STALE,
    });
    const { data: supplierPaymentTotals = [] } = useQuery({
        queryKey: ['supplier_payment_totals'], queryFn: fetchSupplierPaymentTotals, staleTime: STALE,
    });
    const { data: traderPaymentTotals = [] } = useQuery({
        queryKey: ['trader_payment_totals'], queryFn: fetchTraderPaymentTotals, staleTime: STALE,
    });

    // Per-entity payment totals, computed server-side in one query each.
    const supplierPaymentsBySupplier = useMemo(() => {
        const map: Record<number, number> = {};
        supplierPaymentTotals.forEach(row => { map[row.supplier_id] = row.total; });
        return map;
    }, [supplierPaymentTotals]);

    const traderPaymentsByTrader = useMemo(() => {
        const map: Record<number, number> = {};
        traderPaymentTotals.forEach(row => { map[row.trader_id] = row.total; });
        return map;
    }, [traderPaymentTotals]);

    // ── Lookup maps ───────────────────────────────────────────────────
    const itemMap = useMemo(() => {
        const map: Record<string, Item> = {};
        items.forEach(i => { map[i.item_code] = i; });
        return map;
    }, [items]);

    const farmerNameByBatch = useMemo(() => {
        const map: Record<number, string> = {};
        batches.forEach(b => { map[n(b.batch_id)] = b.farmer_name; });
        return map;
    }, [batches]);

    // ── Stored metrics history (monthly snapshots only) ───────────────
    const metricPeriods = useMemo(() => {
        const grouped: Record<string, Record<string, number>> = {};
        metricSnapshots.forEach(snapshot => {
            const bucket = grouped[snapshot.period_key] ?? {};
            bucket[snapshot.metric_key] = n(snapshot.value);
            grouped[snapshot.period_key] = bucket;
        });

        const monthRows: SeriesPoint[] = Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, metrics]) => ({ key, label: getMonthLabel(key), ...metrics }));

        return { monthRows };
    }, [metricSnapshots]);

    // ── Financial chart range filters (monthly) ───────────────────────
    const monthlyOptions = useMemo(() => [
        { key: '12m', label: 'Last 12M' },
        { key: 'all', label: 'All' },
        { key: 'custom', label: 'Custom' },
    ], []);

    const handleMonthlyMode = (mode: string) => {
        if (mode === 'custom' && metricPeriods.monthRows.length > 0) {
            if (!monthlyFrom) setMonthlyFrom(metricPeriods.monthRows[0].key);
            if (!monthlyTo) setMonthlyTo(metricPeriods.monthRows[metricPeriods.monthRows.length - 1].key);
        }
        setMonthlyMode(mode);
    };

    const monthlySeries = useMemo(
        () => sliceSeries(
            metricPeriods.monthRows,
            monthlyMode,
            monthlyFrom,
            monthlyTo,
            monthlyMode === '12m' ? 12 : undefined,
        ),
        [metricPeriods.monthRows, monthlyMode, monthlyFrom, monthlyTo],
    );

    const monthlyRangeControls = (
        <RangeFilter
            options={monthlyOptions}
            mode={monthlyMode}
            onModeChange={handleMonthlyMode}
            customFrom={monthlyFrom}
            onCustomFromChange={setMonthlyFrom}
            customTo={monthlyTo}
            onCustomToChange={setMonthlyTo}
            inputType="month"
        />
    );

    // ── Revenue per kg per closed batch ───────────────────────────────
    const revenuePerKgRows: SeriesPoint[] = useMemo(() => {
        const totalsByBatch: Record<number, { value: number; kg: number }> = {};
        batchSales.forEach(s => {
            const batchId = n(s.batch_id);
            if (!totalsByBatch[batchId]) totalsByBatch[batchId] = { value: 0, kg: 0 };
            totalsByBatch[batchId].value += n(s.value);
            totalsByBatch[batchId].kg += n(s.avg_weight);
        });

        const rows: SeriesPoint[] = [];
        batchClosures.forEach(c => {
            const totals = totalsByBatch[n(c.batch_id)] ?? { value: 0, kg: 0 };
            if (totals.kg <= 0 || totals.value <= 0) return;
            const closeDate = new Date(c.end_date + 'T00:00:00');
            const dateLabel = closeDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const farmerName = farmerNameByBatch[n(c.batch_id)];
            rows.push({
                key: c.end_date.slice(0, 7),
                monthKey: c.end_date.slice(0, 7),
                closeDate: c.end_date,
                label: `${dateLabel} · B${c.batch_id}`,
                label2: farmerName ?? '',
                tooltipTitle: `${dateLabel} · B${c.batch_id}${farmerName ? ` · ${farmerName}` : ''}`,
                revenue_per_kg: parseFloat((totals.value / totals.kg).toFixed(2)),
                batchId: c.batch_id,
                kg: parseFloat(totals.kg.toFixed(2)),
            });
        });

        return rows.sort((a, b) => String(a.closeDate).localeCompare(String(b.closeDate)));
    }, [batchSales, batchClosures, farmerNameByBatch]);

    const revenuePerKgSeries = useMemo(() => {
        if (monthlyMode === 'custom') {
            return revenuePerKgRows.filter(row =>
                (!monthlyFrom || String(row.monthKey) >= monthlyFrom) &&
                (!monthlyTo || String(row.monthKey) <= monthlyTo),
            );
        }
        if (monthlyMode === '12m') {
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - 11);
            const pad = (value: number) => String(value).padStart(2, '0');
            const cutoffKey = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}`;
            return revenuePerKgRows.filter(row => String(row.monthKey) >= cutoffKey);
        }
        return revenuePerKgRows;
    }, [revenuePerKgRows, monthlyMode, monthlyFrom, monthlyTo]);

    // ── Live batch rate (aggregate only, never plotted) ───────────────
    const liveBatchRate = useMemo(() => {
        const closedBatchIds = new Set(batchClosures.map(c => n(c.batch_id)));
        let value = 0, kg = 0, birds = 0;
        batchSales.forEach(s => {
            if (closedBatchIds.has(n(s.batch_id))) return;
            value += n(s.value);
            kg += n(s.avg_weight);
            birds += n(s.quantity);
        });
        return {
            perKg: kg > 0 ? value / kg : null,
            kg,
            birds,
        };
    }, [batchSales, batchClosures]);

    const liveBatchBadge = liveBatchRate.perKg === null ? (
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] text-gray-400">
            No live batch sales
        </span>
    ) : (
        <span className="inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px]">
            <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-medium text-emerald-700">Live batches</span>
            <span className="font-semibold text-emerald-800">
                ₹{liveBatchRate.perKg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg
            </span>
            <span className="text-emerald-600">
                {liveBatchRate.kg.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg · {liveBatchRate.birds.toLocaleString('en-IN')} birds
            </span>
        </span>
    );

    // ── KPI aggregations ──────────────────────────────────────────────
    const kpis = useMemo(() => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);

        const cashBalance = n(ledgerAccounts.find(a => a.account_id === 101)?.current_balance);

        // Single pass over sales and batch closures computing both months' totals.
        // Expenses are COGS: revenue − gross profit of batches closed in the month.
        let revenueThisMonth = 0, revenueLastMonth = 0, expensesThisMonth = 0, expensesLastMonth = 0;
        let grossProfitThisMonth = 0, closedRevenueThisMonth = 0;
        const thisYear = now.getFullYear(), thisMonth = now.getMonth();
        for (const s of batchSales) {
            const d = new Date(s.created_at);
            const v = n(s.value);
            if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) revenueThisMonth += v;
            else if (d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth()) revenueLastMonth += v;
        }
        const thisMonthKey = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}`;
        const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        for (const c of batchClosures) {
            const key = c.end_date.slice(0, 7);
            const closureRevenue = n(c.revenue);
            const gp = n(c.gross_profit);
            const v = closureRevenue - gp;
            if (key === thisMonthKey) {
                expensesThisMonth += v;
                grossProfitThisMonth += gp;
                closedRevenueThisMonth += closureRevenue;
            } else if (key === lastMonthKey) {
                expensesLastMonth += v;
            }
        }
        const grossMarginPct = closedRevenueThisMonth > 0
            ? (grossProfitThisMonth / closedRevenueThisMonth) * 100
            : 0;
        const revenueDelta = revenueLastMonth > 0
            ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
            : 0;

        const expensesDelta = expensesLastMonth > 0
            ? ((expensesThisMonth - expensesLastMonth) / expensesLastMonth) * 100
            : 0;

        const activeBatches = batches.filter(b => b.status === 'Open');
        let totalBirds = 0, totalInitial = 0;
        for (const b of activeBatches) {
            totalBirds += n(b.current_bird_count);
            totalInitial += n(b.initial_bird_count);
        }
        const overallMortality = totalInitial > 0
            ? ((totalInitial - totalBirds) / totalInitial) * 100
            : 0;

        let outstandingLoanBalance = 0;
        for (const l of loans) {
            if (l.status === 'Active') outstandingLoanBalance += n(l.outstanding_balance);
        }

        const last5Closures = batchClosures
            .slice()
            .sort((a, b) => b.end_date.localeCompare(a.end_date))
            .slice(0, 5);
        let totalClosedRevenue = 0, totalBirdsPlaced = 0;
        for (const c of last5Closures) {
            totalClosedRevenue += n(c.revenue);
            totalBirdsPlaced += n(c.initial_chicken_count);
        }
        const avgRevenuePerBird = totalBirdsPlaced > 0
            ? totalClosedRevenue / totalBirdsPlaced
            : 0;

        return {
            cashBalance,
            revenueThisMonth,
            revenueDelta,
            expensesThisMonth,
            expensesDelta,
            grossProfitThisMonth,
            grossMarginPct,
            closedRevenueThisMonth,
            activeBatchCount: activeBatches.length,
            totalBirds,
            overallMortality,
            outstandingLoanBalance,
            activeLoanCount: loans.filter(l => l.status === 'Active').length,
            avgRevenuePerBird,
        };
    }, [ledgerAccounts, batchSales, batches, loans, batchClosures]);

    // ── Financial month metrics (net profit, cash flow, working capital) ──
    const financials = useMemo(() => {
        const inMonth = (dateStr: string | undefined, key: string) =>
            !!dateStr && dateStr.slice(0, 7) === key;

        const closuresIn = (key: string) => batchClosures.filter(c => inMonth(c.end_date, key));
        const sumRevenue = (key: string) => closuresIn(key).reduce((s, c) => s + n(c.revenue), 0);
        const sumCogs = (key: string) => closuresIn(key).reduce((s, c) => s + n(c.revenue) - n(c.gross_profit), 0);
        const ledgerNet = (accountId: number, key: string) => {
            const row = ledgerSummary.find(s => s.account_id === accountId && s.month === key);
            return row ? row.total_debit - row.total_credit : 0;
        };

        const grossProfitThisMonth = sumRevenue(thisMonthKey) - sumCogs(thisMonthKey);
        const otherExpensesThisMonth =
            expenseSummary.find(s => s.month === thisMonthKey)?.total ?? 0;
        const commissionThisMonth = ledgerNet(106, thisMonthKey);
        const interestThisMonth = ledgerNet(112, thisMonthKey);
        const netProfitThisMonth = grossProfitThisMonth - otherExpensesThisMonth - commissionThisMonth - interestThisMonth;

        const cashSummary = ledgerSummary.find(s => s.account_id === 101 && s.month === thisMonthKey);
        const cashIn = cashSummary?.total_debit ?? 0;
        const cashOut = cashSummary?.total_credit ?? 0;

        const balance = (id: number) => n(ledgerAccounts.find(a => a.account_id === id)?.current_balance);
        const cashBalance = balance(101);
        const inventoryValue = balance(102) + balance(103) + balance(104);
        const receivables = balance(110);
        const payables = balance(105);
        const workingCapital = cashBalance + inventoryValue + receivables - payables;

        // Feed on hand and days of cover come precomputed from the server.
        const feedOnHand = feedSummary?.feed_on_hand ?? 0;
        const daysCover = feedSummary?.days_cover ?? 0;

        // Breakeven & realized rate for batches closed this month
        const closedThisMonth = new Set(closuresIn(thisMonthKey).map(c => c.batch_id));
        const kgThisMonth = batchSales
            .filter(s => closedThisMonth.has(s.batch_id))
            .reduce((s, sale) => s + n(sale.avg_weight), 0);
        const breakevenRate = kgThisMonth > 0 ? sumCogs(thisMonthKey) / kgThisMonth : 0;
        const realizedRate = kgThisMonth > 0 ? sumRevenue(thisMonthKey) / kgThisMonth : 0;

        return {
            grossProfitThisMonth,
            otherExpensesThisMonth,
            commissionThisMonth,
            interestThisMonth,
            netProfitThisMonth,
            cashIn,
            cashOut,
            cashFlowThisMonth: cashIn - cashOut,
            cashBalance,
            inventoryValue,
            receivables,
            payables,
            workingCapital,
            feedOnHand,
            daysCover,
            breakevenRate,
            realizedRate,
            kgThisMonth,
        };
    }, [ledgerAccounts, batchClosures, batchSales, expenseSummary, ledgerSummary, feedSummary, itemMap, thisMonthKey]);

    // ── Net profit breakdown (double-click detail) ────────────────────
    const [showNetProfit, setShowNetProfit] = useState(false);

    const netProfitBreakdown: NetProfitBreakdown = useMemo(() => {
        const buildMonth = (key: string): NetProfitMonth => {
            const closures = batchClosures.filter(c => c.end_date.slice(0, 7) === key);
            const revenue = closures.reduce((s, c) => s + n(c.revenue), 0);
            const cogs = closures.reduce((s, c) => s + n(c.revenue) - n(c.gross_profit), 0);
            const grossProfit = revenue - cogs;

            const monthOther = expenseSummary.find(s => s.month === key);
            const otherSum = monthOther?.total ?? 0;
            const otherByCategory = (monthOther?.by_category ?? [])
                .map(row => ({
                    name: OTHER_EXPENSE_CATEGORY_LABELS[row.category] ?? row.category,
                    value: parseFloat(n(row.total).toFixed(2)),
                }))
                .sort((a, b) => b.value - a.value);

            const ledgerNet = (accountId: number) => {
                const row = ledgerSummary.find(s => s.account_id === accountId && s.month === key);
                return row ? row.total_debit - row.total_credit : 0;
            };
            const commission = ledgerNet(106);
            const interest = ledgerNet(112);

            return {
                key,
                label: getMonthLabel(key),
                revenue,
                cogs,
                grossProfit,
                otherExpenses: otherSum,
                commission,
                interest,
                netProfit: grossProfit - otherSum - commission - interest,
                otherByCategory,
            };
        };
        return { month: buildMonth(thisMonthKey), previousMonth: buildMonth(lastMonthKey) };
    }, [batchClosures, expenseSummary, ledgerSummary, thisMonthKey, lastMonthKey]);

    // ── COGS breakdown (double-click detail) ──────────────────────────
    const [showCogsBreakdown, setShowCogsBreakdown] = useState(false);

    const cogsBreakdown: CogsBreakdown = useMemo(() => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);

        const buildMonth = (key: string): CogsMonthTotals => {
            const rows = batchClosures
                .filter(c => c.end_date.slice(0, 7) === key)
                .sort((a, b) => a.end_date.localeCompare(b.end_date))
                .map(c => {
                    const revenue = n(c.revenue);
                    const grossProfit = n(c.gross_profit);
                    return {
                        batchId: c.batch_id,
                        endDate: c.end_date,
                        revenue,
                        grossProfit,
                        cogs: revenue - grossProfit,
                    };
                });
            const revenue = rows.reduce((s, r) => s + r.revenue, 0);
            const cogs = rows.reduce((s, r) => s + r.cogs, 0);
            const grossProfit = rows.reduce((s, r) => s + r.grossProfit, 0);
            return {
                key,
                label: getMonthLabel(key),
                rows,
                revenue,
                cogs,
                grossProfit,
                marginPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
            };
        };

        const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        return { month: buildMonth(thisKey), previousMonth: buildMonth(lastKey) };
    }, [batchClosures]);

    // ── Revenue vs Expenses filter state ──────────────────────────────
    const [revExpFilterMode, setRevExpFilterMode] = useState<'month' | 'custom'>('month');
    const [revExpSelectedMonth, setRevExpSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [revExpCustomFrom, setRevExpCustomFrom] = useState('');
    const [revExpCustomTo, setRevExpCustomTo] = useState('');

    const closedBatchIds = useMemo(
        () => new Set(batchClosures.map(c => c.batch_id)),
        [batchClosures],
    );

    const availableMonths = useMemo(() => {
        const s = new Set<string>();
        batchClosures.forEach(c => s.add(getMonthKey(c.end_date)));
        batchSales.forEach(sale => {
            if (closedBatchIds.has(sale.batch_id)) s.add(getMonthKey(sale.created_at));
        });

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        for (let m = 1; m <= currentMonth; m++) {
            s.add(`${currentYear}-${String(m).padStart(2, '0')}`);
        }

        return Array.from(s).sort();
    }, [batchClosures, batchSales, closedBatchIds]);

    useEffect(() => {
        if (availableMonths.length > 0 && !availableMonths.includes(revExpSelectedMonth)) {
            setRevExpSelectedMonth(availableMonths[availableMonths.length - 1]);
        }
    }, [availableMonths, revExpSelectedMonth]);

    // ── Cumulative revenue vs expenses (closed batches only) ────────
    const revenueExpenseData = useMemo(() => {
        const isInRange = (dateStr: string) => {
            if (revExpFilterMode === 'month') {
                return getMonthKey(dateStr) === revExpSelectedMonth;
            }
            if (revExpCustomFrom && revExpCustomTo) {
                const d = dateStr.slice(0, 10);
                return d >= revExpCustomFrom && d <= revExpCustomTo;
            }
            return false;
        };

        // Expense events from batch closures
        const expenseEvents = batchClosures
            .filter(c => isInRange(c.end_date))
            .sort((a, b) => a.end_date.localeCompare(b.end_date))
            .map(c => ({
                dateRaw: c.end_date.slice(0, 10),
                batchId: c.batch_id,
                amount: n(c.revenue) - n(c.gross_profit),
            }));

        // Revenue events from sales of closed batches
        const revenueEvents = batchSales
            .filter(s => closedBatchIds.has(s.batch_id) && isInRange(s.created_at))
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map(s => ({
                dateRaw: s.created_at.slice(0, 10),
                batchId: s.batch_id,
                amount: n(s.value),
            }));

        // Cumulative expense by date
        type BatchEntry = { batchId: number; amount: number };
        const expByDate: Record<string, { cumulative: number; batches: BatchEntry[] }> = {};
        let expCum = 0;
        const expBatchesSoFar: BatchEntry[] = [];
        expenseEvents.forEach(e => {
            expCum += e.amount;
            expBatchesSoFar.push({ batchId: e.batchId, amount: e.amount });
            expByDate[e.dateRaw] = { cumulative: expCum, batches: [...expBatchesSoFar] };
        });

        // Cumulative revenue by date (group sales by date, aggregate per batch)
        const revGrouped: Record<string, BatchEntry[]> = {};
        revenueEvents.forEach(r => {
            if (!revGrouped[r.dateRaw]) revGrouped[r.dateRaw] = [];
            revGrouped[r.dateRaw].push({ batchId: r.batchId, amount: r.amount });
        });
        const revByDate: Record<string, { cumulative: number; batches: BatchEntry[] }> = {};
        let revCum = 0;
        const revBatchMap: Record<number, number> = {};
        Object.keys(revGrouped).sort().forEach(date => {
            revGrouped[date].forEach(r => {
                revCum += r.amount;
                revBatchMap[r.batchId] = (revBatchMap[r.batchId] ?? 0) + r.amount;
            });
            revByDate[date] = {
                cumulative: revCum,
                batches: Object.entries(revBatchMap).map(([id, amt]) => ({ batchId: Number(id), amount: amt })),
            };
        });

        // Merge all dates into a single timeline
        const allDates = Array.from(new Set([...Object.keys(expByDate), ...Object.keys(revByDate)])).sort();
        let lastExp = 0;
        let lastRev = 0;
        let lastExpBatches: BatchEntry[] = [];
        let lastRevBatches: BatchEntry[] = [];

        return allDates.map(dateRaw => {
            if (expByDate[dateRaw]) {
                lastExp = expByDate[dateRaw].cumulative;
                lastExpBatches = expByDate[dateRaw].batches;
            }
            if (revByDate[dateRaw]) {
                lastRev = revByDate[dateRaw].cumulative;
                lastRevBatches = revByDate[dateRaw].batches;
            }
            const d = new Date(dateRaw + 'T00:00:00');
            return {
                date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                dateRaw,
                revenue: parseFloat(lastRev.toFixed(2)),
                expenses: parseFloat(lastExp.toFixed(2)),
                expenseBatches: lastExpBatches,
                revenueBatches: lastRevBatches,
            };
        });
    }, [batchClosures, batchSales, closedBatchIds, revExpFilterMode, revExpSelectedMonth, revExpCustomFrom, revExpCustomTo]);

    // ── COGS mix (month) by item category ─────────────────────────────
    const cogsMix = useMemo(() => {
        const byCategory: Record<string, number> = {};
        allocationCategoryTotals
            .filter(row => row.month === thisMonthKey)
            .forEach(row => {
                byCategory[row.category] = (byCategory[row.category] ?? 0) + n(row.total);
            });

        const colors: Record<string, string> = {
            Feed: chart.amber,
            Chicks: chart.blue,
            Medicine: chart.rose,
            FinishedBirds: chart.violet,
        };

        const data = Object.entries(byCategory).map(([name, value]) => ({
            name,
            value: parseFloat(n(value).toFixed(2)),
            color: colors[name] ?? '#94a3b8',
        }));

        return { data, total: data.reduce((s, d) => s + d.value, 0) };
    }, [allocationCategoryTotals, thisMonthKey]);

    // ── Other expenses mix (month) by category ────────────────────────
    const otherExpenseMix = useMemo(() => {
        const summary = expenseSummary.find(s => s.month === thisMonthKey);
        const palette = [chart.orange, chart.rose, chart.blue, chart.teal, chart.violet, chart.amber, chart.magenta, chart.slate];
        const data = [...(summary?.by_category ?? [])]
            .sort((a, b) => b.total - a.total)
            .map((row, i) => ({
                name: OTHER_EXPENSE_CATEGORY_LABELS[row.category] ?? row.category,
                value: parseFloat(n(row.total).toFixed(2)),
                color: palette[i % palette.length],
            }));

        return { data, total: data.reduce((s, d) => s + d.value, 0) };
    }, [expenseSummary, thisMonthKey]);

    // ── Batch profitability with Gross Margin % and Cost Per Bird ─────
    const batchProfitData = useMemo(() => {
        return batchClosures.slice(-15).map(c => {
            const rev = n(c.revenue);
            const gp = n(c.gross_profit);
            const birds = n(c.initial_chicken_count);
            return {
                label: `Batch ${c.batch_id}`,
                revenue: parseFloat(rev.toFixed(2)),
                grossProfit: parseFloat(gp.toFixed(2)),
                grossMarginPct: rev > 0 ? parseFloat(((gp / rev) * 100).toFixed(2)) : 0,
                costPerBird: birds > 0 ? parseFloat(((rev - gp) / birds).toFixed(2)) : 0,
            };
        });
    }, [batchClosures]);

    // ── Cost per Bird by category (per batch) ─────────────────────────
    const costPerBirdData: CostPerBirdData[] = useMemo(() => {
        // batch_id -> category -> allocated value
        const costByBatch: Record<number, Record<string, number>> = {};
        allocationBatchCosts.forEach(row => {
            const bucket = costByBatch[row.batch_id] ?? {};
            bucket[row.category] = (bucket[row.category] ?? 0) + n(row.total);
            costByBatch[row.batch_id] = bucket;
        });

        return batches
            .filter(b => costByBatch[n(b.batch_id)])
            .map(b => {
                const costs = costByBatch[n(b.batch_id)] ?? {};
                const feed = costs['Feed'] ?? 0;
                const chicks = costs['Chicks'] ?? 0;
                const medicine = costs['Medicine'] ?? 0;
                const total = Object.values(costs).reduce((s, v) => s + v, 0);
                const other = total - feed - chicks - medicine;
                const birds = n(b.initial_bird_count);
                const perBird = (v: number) => (birds > 0 ? parseFloat((v / birds).toFixed(2)) : 0);
                return {
                    label: `Batch ${b.batch_id}`,
                    feed: perBird(feed),
                    chicks: perBird(chicks),
                    medicine: perBird(medicine),
                    other: perBird(other),
                    total: perBird(total),
                    birds,
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
            .slice(-10);
    }, [batches, allocationBatchCosts]);

    // ── Realized vs breakeven rate per closed batch ───────────────────
    const breakevenData: BreakevenData[] = useMemo(() => {
        const kgByBatch: Record<number, number> = {};
        batchSales.forEach(s => {
            kgByBatch[s.batch_id] = (kgByBatch[s.batch_id] ?? 0) + n(s.avg_weight);
        });

        return batchClosures
            .slice(-10)
            .map(c => {
                const revenue = n(c.revenue);
                const cogs = revenue - n(c.gross_profit);
                const kg = kgByBatch[c.batch_id] ?? 0;
                return {
                    label: `Batch ${c.batch_id}`,
                    realized: kg > 0 ? parseFloat((revenue / kg).toFixed(2)) : 0,
                    breakeven: kg > 0 ? parseFloat((cogs / kg).toFixed(2)) : 0,
                    marginPerKg: kg > 0 ? parseFloat(((revenue - cogs) / kg).toFixed(2)) : 0,
                    kg: parseFloat(kg.toFixed(2)),
                };
            })
            .filter(d => d.kg > 0);
    }, [batchClosures, batchSales]);

    // ── Avg sold weight per bird (kg) per closed batch ────────────────
    const avgWeightData: AvgWeightData[] = useMemo(() => {
        const totalsByBatch: Record<number, { birds: number; kg: number }> = {};
        batchSales.forEach(s => {
            const batchId = n(s.batch_id);
            if (!totalsByBatch[batchId]) totalsByBatch[batchId] = { birds: 0, kg: 0 };
            totalsByBatch[batchId].birds += n(s.quantity);
            totalsByBatch[batchId].kg += n(s.avg_weight);
        });

        return batchClosures
            .slice()
            .sort((a, b) => a.end_date.localeCompare(b.end_date))
            .map(c => {
                const totals = totalsByBatch[n(c.batch_id)] ?? { birds: 0, kg: 0 };
                const closeDate = new Date(c.end_date + 'T00:00:00');
                return {
                    label: `${closeDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · B${c.batch_id}`,
                    avgWeight: totals.birds > 0 ? parseFloat((totals.kg / totals.birds).toFixed(3)) : 0,
                    batchId: c.batch_id,
                    farmerName: farmerNameByBatch[n(c.batch_id)],
                    birds: totals.birds,
                    totalKg: parseFloat(totals.kg.toFixed(2)),
                    closeDate: c.end_date,
                };
            })
            .filter(row => row.birds > 0);
    }, [batchSales, batchClosures, farmerNameByBatch]);

    // ── Mortality rate per active batch ───────────────────────────────
    const mortalityData = useMemo(() => {
        const soldPerBatch: Record<number, number> = {};
        batchSales.forEach(s => {
            soldPerBatch[s.batch_id] = (soldPerBatch[s.batch_id] ?? 0) + n(s.quantity);
        });

        return batches
            .filter(b => b.status === 'Open')
            .map(b => {
                const sold = soldPerBatch[b.batch_id] ?? 0;
                const deaths = n(b.initial_bird_count) - n(b.current_bird_count) - sold;
                const pct = n(b.initial_bird_count) > 0
                    ? Math.max(0, (deaths / n(b.initial_bird_count)) * 100)
                    : 0;
                return { label: `Batch ${b.batch_id}`, mortalityPct: parseFloat(pct.toFixed(2)) };
            })
            .sort((a, b) => b.mortalityPct - a.mortalityPct)
            .slice(0, 10);
    }, [batches, batchSales]);

    // ── FCR detail modal ──────────────────────────────────────────────
    const [selectedFCR, setSelectedFCR] = useState<FCRData | null>(null);

    // ── Avg Sale Rate mode ───────────────────────────────────────────
    const [avgRateMode, setAvgRateMode] = useState<'monthly' | 'continuous'>('continuous');

    const avgSaleRateData = useMemo(() => {
        if (avgRateMode === 'monthly') {
            const months: Record<string, { weightedSum: number; totalWeight: number }> = {};
            batchSales.forEach(s => {
                const key = getMonthKey(s.created_at);
                // avg_weight stores the total weight (kg) of the sale
                const weight = n(s.avg_weight);
                if (weight <= 0) return;
                if (!months[key]) months[key] = { weightedSum: 0, totalWeight: 0 };
                months[key].weightedSum += n(s.rate) * weight;
                months[key].totalWeight += weight;
            });
            return Object.entries(months)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(-12)
                .map(([key, val]) => ({
                    label: getMonthLabel(key),
                    avgRate: val.totalWeight > 0
                        ? parseFloat((val.weightedSum / val.totalWeight).toFixed(2))
                        : 0,
                }));
        }

        const days: Record<string, { weightedSum: number; totalWeight: number }> = {};
        batchSales.forEach(s => {
            const key = s.created_at.slice(0, 10);
            // avg_weight stores the total weight (kg) of the sale
            const weight = n(s.avg_weight);
            if (weight <= 0) return;
            if (!days[key]) days[key] = { weightedSum: 0, totalWeight: 0 };
            days[key].weightedSum += n(s.rate) * weight;
            days[key].totalWeight += weight;
        });
        return Object.entries(days)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => {
                const d = new Date(key + 'T00:00:00');
                return {
                    label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                    avgRate: val.totalWeight > 0
                        ? parseFloat((val.weightedSum / val.totalWeight).toFixed(2))
                        : 0,
                };
            });
    }, [batchSales, avgRateMode]);

    // ── FCR per batch (server-side aggregate) ─────────────────────────
    const fcrData = useMemo(() => {
        return allocationFcr.map(row => ({
            label: `Batch ${row.batch_id}`,
            fcr: row.fcr,
            batchId: row.batch_id,
            totalFeedKg: row.feed_kg,
            totalWeightKg: row.weight_kg,
            // Breakdowns load on demand when a bar is clicked.
            feedBreakdown: [],
            salesBreakdown: [],
        }));
    }, [allocationFcr]);

    // ── FCR breakdown for the selected batch (lazy) ───────────────────
    const { data: fcrBreakdown } = useQuery({
        queryKey: ['fcr_breakdown', selectedFCR?.batchId],
        queryFn: async () => {
            const batchId = selectedFCR!.batchId;
            const [feedLines, sales] = await Promise.all([
                fetchBatchFeedLines(batchId),
                fetchBatchSalesByBatchId(batchId),
            ]);
            return { feedLines, sales };
        },
        enabled: !!selectedFCR,
        staleTime: STALE,
    });

    const fcrModalData: FCRData | null = useMemo(() => {
        if (!selectedFCR) return null;
        const feedLines = fcrBreakdown?.feedLines ?? [];
        const sales = fcrBreakdown?.sales ?? [];
        const feedBreakdown = feedLines.map(f => ({
            itemName: f.item_name,
            qty: f.qty,
            unit: f.unit ?? '',
            kg: f.kg,
        }));
        const salesBreakdown = sales.map(s => {
            const qty = n(s.quantity);
            const avgW = n(s.avg_weight);
            return {
                quantity: qty,
                avgWeight: qty > 0 ? avgW / qty : 0,
                totalWeight: avgW,
            };
        });
        return {
            ...selectedFCR,
            totalFeedKg: feedBreakdown.reduce((s, f) => s + f.kg, 0) || selectedFCR.totalFeedKg,
            totalWeightKg: salesBreakdown.reduce((s, x) => s + x.totalWeight, 0) || selectedFCR.totalWeightKg,
            feedBreakdown,
            salesBreakdown,
        };
    }, [selectedFCR, fcrBreakdown]);

    // ── Inventory levels with item details ────────────────────────────
    const inventoryData = useMemo(() => {
        return inventory
            .map(inv => {
                const item = itemMap[inv.item_code];
                return {
                    name: item?.item_name ?? inv.item_code,
                    quantity: n(inv.current_qty),
                    unit: item?.unit ?? '',
                    category: item?.item_category ?? 'Other',
                };
            })
            .filter(d => d.quantity > 0)
            .sort((a, b) => b.quantity - a.quantity);
    }, [inventory, itemMap]);

    // ── Payables & Receivables ────────────────────────────────────────
    const payablesReceivablesData = useMemo(() => {
        const daysSince = (dateStr?: string) => {
            if (!dateStr) return undefined;
            const t = new Date(dateStr.slice(0, 10) + 'T00:00:00').getTime();
            if (Number.isNaN(t)) return undefined;
            return Math.max(0, Math.floor((Date.now() - t) / 86400000));
        };

        // Receivables: credit sales per trader minus payments received
        const receivableByTrader: Record<number, { amount: number; oldest?: string }> = {};
        batchSales.forEach(s => {
            if (!isPaymentType(s.payment_type ?? 'RECEIVABLE', 'RECEIVABLE')) return;
            const entry = receivableByTrader[s.trader_id] ?? { amount: 0 };
            entry.amount += n(s.value);
            if (!entry.oldest || s.created_at < entry.oldest) entry.oldest = s.created_at;
            receivableByTrader[s.trader_id] = entry;
        });
        const receivables = traders
            .map(t => {
                const gross = receivableByTrader[t.trader_id]?.amount ?? 0;
                const paid = traderPaymentsByTrader[t.trader_id] ?? 0;
                return {
                    name: t.name,
                    amount: Math.max(0, gross - paid),
                    ageDays: daysSince(receivableByTrader[t.trader_id]?.oldest),
                };
            })
            .filter(t => t.amount > 0.005)
            .sort((a, b) => b.amount - a.amount);

        // Payables: credit purchases per supplier minus payments made
        const payableBySupplier: Record<number, { amount: number; oldest?: string }> = {};
        purchases.forEach(p => {
            if (!isPaymentType(p.payment_type, 'PAYABLE')) return;
            const entry = payableBySupplier[p.supplier_id] ?? { amount: 0 };
            entry.amount += n(p.total_cost);
            if (!entry.oldest || p.purchase_date < entry.oldest) entry.oldest = p.purchase_date;
            payableBySupplier[p.supplier_id] = entry;
        });
        const payables = suppliers
            .map(s => {
                const gross = payableBySupplier[s.supplier_id]?.amount ?? 0;
                const paid = supplierPaymentsBySupplier[s.supplier_id] ?? 0;
                return {
                    name: s.name,
                    amount: Math.max(0, gross - paid),
                    ageDays: daysSince(payableBySupplier[s.supplier_id]?.oldest),
                };
            })
            .filter(s => s.amount > 0.005)
            .sort((a, b) => b.amount - a.amount);

        return {
            payables,
            receivables,
            totalPayable: payables.reduce((s, p) => s + p.amount, 0),
            totalReceivable: receivables.reduce((s, r) => s + r.amount, 0),
        };
    }, [suppliers, traders, purchases, batchSales, supplierPaymentsBySupplier, traderPaymentsByTrader]);

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <OverviewKPI
                    title="Cash Balance"
                    value={fmt(kpis.cashBalance)}
                    subtext="Current cash position"
                    icon={Banknote}
                    color="#16a34a"
                />
                <OverviewKPI
                    title="Revenue (Month)"
                    value={fmt(kpis.revenueThisMonth)}
                    subtext={
                        kpis.revenueDelta !== 0
                            ? `${kpis.revenueDelta > 0 ? '+' : ''}${kpis.revenueDelta.toFixed(2)}% vs last month`
                            : 'This month'
                    }
                    icon={TrendingUp}
                    color={chart.brand}
                />
                <OverviewKPI
                    title="COGS (Month)"
                    value={fmt(kpis.expensesThisMonth)}
                    subtext={
                        kpis.expensesDelta !== 0
                            ? `${kpis.expensesDelta > 0 ? '+' : ''}${kpis.expensesDelta.toFixed(2)}% vs last month · Revenue − gross profit`
                            : 'Revenue − gross profit (closed batches) · double-click for details'
                    }
                    icon={TrendingDown}
                    color={chart.orange}
                    onDoubleClick={() => setShowCogsBreakdown(true)}
                />
                <OverviewKPI
                    title="Gross Profit (Month)"
                    value={fmt(kpis.grossProfitThisMonth)}
                    subtext={
                        kpis.closedRevenueThisMonth > 0
                            ? `${kpis.grossMarginPct.toFixed(2)}% margin · Revenue − COGS`
                            : 'No closed batches this month'
                    }
                    icon={kpis.grossProfitThisMonth >= 0 ? TrendingUp : TrendingDown}
                    color={kpis.grossProfitThisMonth >= 0 ? '#16a34a' : '#dc2626'}
                    onDoubleClick={() => setShowCogsBreakdown(true)}
                />
                <OverviewKPI
                    title="Net Profit (Month)"
                    value={fmt(financials.netProfitThisMonth)}
                    subtext={
                        kpis.closedRevenueThisMonth > 0
                            ? `${((financials.netProfitThisMonth / kpis.closedRevenueThisMonth) * 100).toFixed(2)}% net margin · double-click for details`
                            : 'Revenue − COGS − expenses'
                    }
                    icon={Wallet}
                    color={financials.netProfitThisMonth >= 0 ? '#16a34a' : '#dc2626'}
                    onDoubleClick={() => setShowNetProfit(true)}
                />
                <OverviewKPI
                    title="Other Expenses (Month)"
                    value={fmt(financials.otherExpensesThisMonth)}
                    subtext={`${expenseSummary.find(s => s.month === thisMonthKey)?.count ?? 0} entries this month`}
                    icon={Receipt}
                    color={chart.rose}
                />
                <OverviewKPI
                    title="Breakeven Rate"
                    value={`${fmt(financials.breakevenRate)}/kg`}
                    subtext={
                        financials.kgThisMonth > 0
                            ? `Realized ${fmt(financials.realizedRate)}/kg · margin ${fmt(financials.realizedRate - financials.breakevenRate)}/kg`
                            : 'No closed-batch sales this month'
                    }
                    icon={Scale}
                    color={chart.orange}
                />
                <OverviewKPI
                    title="Cash Flow (Month)"
                    value={fmt(financials.cashFlowThisMonth)}
                    subtext={`In ${fmt(financials.cashIn)} · Out ${fmt(financials.cashOut)}`}
                    icon={ArrowLeftRight}
                    color={financials.cashFlowThisMonth >= 0 ? '#16a34a' : '#dc2626'}
                />
                <OverviewKPI
                    title="Working Capital"
                    value={fmt(financials.workingCapital)}
                    subtext="Cash + inventory + receivables − payables"
                    icon={Briefcase}
                    color={chart.violet}
                />
                <OverviewKPI
                    title="Inventory Value"
                    value={fmt(financials.inventoryValue)}
                    subtext={
                        financials.daysCover > 0
                            ? `${financials.daysCover.toFixed(1)} days feed cover`
                            : 'No feed consumption recorded'
                    }
                    icon={Package}
                    color={chart.blue}
                />
                <OverviewKPI
                    title="Active Batches"
                    value={String(kpis.activeBatchCount)}
                    subtext={`${kpis.totalBirds.toLocaleString('en-IN')} total birds`}
                    icon={Bird}
                    color={chart.blue}
                />
                <OverviewKPI
                    title="Total Live Birds"
                    value={kpis.totalBirds.toLocaleString('en-IN')}
                    subtext={`${kpis.overallMortality.toFixed(2)}% overall mortality`}
                    icon={Heart}
                    color={chart.rose}
                />
                <OverviewKPI
                    title="Outstanding Loans"
                    value={fmt(kpis.outstandingLoanBalance)}
                    subtext={`${kpis.activeLoanCount} active loan${kpis.activeLoanCount !== 1 ? 's' : ''}`}
                    icon={Landmark}
                    color={chart.violet}
                />
                <OverviewKPI
                    title="Revenue Per Bird"
                    value={fmt(kpis.avgRevenuePerBird)}
                    subtext="Avg across last 5 closed batches"
                    icon={IndianRupee}
                    color={chart.magenta}
                />
            </div>

            {/* Financial Performance — stored metrics history */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <PnlTrendChart data={monthlySeries} headerControls={monthlyRangeControls} />
                </div>
                <MarginTrendChart data={monthlySeries} headerControls={monthlyRangeControls} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenuePerKgChart
                    data={revenuePerKgSeries}
                    headerControls={monthlyRangeControls}
                    badge={liveBatchBadge}
                />
                <CashFlowChart data={monthlySeries} headerControls={monthlyRangeControls} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <WorkingCapitalChart data={monthlySeries} headerControls={monthlyRangeControls} />
                <OpsVolumeChart data={monthlySeries} headerControls={monthlyRangeControls} />
                <EfficiencyChart data={monthlySeries} headerControls={monthlyRangeControls} />
            </div>

            {/* Chick Lifting Heatmap */}
            <LiftingHeatmap batches={batches} />

            {/* Revenue vs Expenses (full width) */}
            <RevenueExpenseChart
                data={revenueExpenseData}
                filterMode={revExpFilterMode}
                onFilterModeChange={setRevExpFilterMode}
                selectedMonth={revExpSelectedMonth}
                onSelectedMonthChange={setRevExpSelectedMonth}
                availableMonths={availableMonths}
                customFrom={revExpCustomFrom}
                onCustomFromChange={setRevExpCustomFrom}
                customTo={revExpCustomTo}
                onCustomToChange={setRevExpCustomTo}
            />

            {/* Expense Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ExpenseDonut
                    data={cogsMix.data}
                    total={cogsMix.total}
                    title="COGS Mix (Month)"
                    emptyText="No allocations this month"
                />
                <ExpenseDonut
                    data={otherExpenseMix.data}
                    total={otherExpenseMix.total}
                    title="Other Expenses (Month)"
                    emptyText="No other expenses this month"
                />
            </div>

            {/* Batch Profitability & FCR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BatchProfitChart data={batchProfitData} />
                <FCRChart data={fcrData} onBarClick={setSelectedFCR} />
            </div>

            {/* Cost per Bird, Realized vs Breakeven, Avg Sold Weight */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <CostPerBirdChart data={costPerBirdData} />
                <BreakevenChart data={breakevenData} />
                <AvgWeightChart data={avgWeightData} />
            </div>

            {/* Mortality, Avg Sale Rate, Inventory */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MortalityChart data={mortalityData} />
                <AvgSaleRateChart data={avgSaleRateData} mode={avgRateMode} onModeChange={setAvgRateMode} />
                <InventoryChart data={inventoryData} />
            </div>

            {/* Payables & Receivables */}
            <PayablesReceivables {...payablesReceivablesData} />

            {/* FCR Detail Modal */}
            <FCRDetailModal
                isOpen={!!selectedFCR}
                onClose={() => setSelectedFCR(null)}
                data={fcrModalData}
            />

            {/* COGS / Gross Profit Breakdown Modal */}
            <CogsDetailModal
                isOpen={showCogsBreakdown}
                onClose={() => setShowCogsBreakdown(false)}
                breakdown={cogsBreakdown}
            />

            {/* Net Profit Breakdown Modal */}
            <NetProfitModal
                isOpen={showNetProfit}
                onClose={() => setShowNetProfit(false)}
                breakdown={netProfitBreakdown}
            />
        </div>
    );
};

export default OverviewModule;
