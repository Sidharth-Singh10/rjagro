'use client'
import { memo, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Banknote, TrendingUp, TrendingDown, Bird, Heart,
    Landmark, IndianRupee, LucideIcon,
} from 'lucide-react';

import { fetchLedgerAccounts } from '@/app/api/ledger_accounts';
import { fetchBatchSales } from '@/app/api/batch_sales';
import { fetchPurchases } from '@/app/api/purchases';
import { fetchBatches, fetchBatchClosures } from '@/app/api/batches';
import { fetchLoans } from '@/app/api/loans';
import { fetchInventory } from '@/app/api/inventory';
import { fetchItems } from '@/app/api/items';
import { fetchSuppliers } from '@/app/api/supplier';
import { fetchTraders } from '@/app/api/traders';
import { fetchBatchAllocationLines } from '@/app/api/batch_allocation_lines';
import { fetchStockReceipts } from '@/app/api/stock_receipts';
import { Item } from '@/app/types/interfaces';

import { RevenueExpenseChart } from './overview/revenue_expense_chart';
import { ExpenseDonut } from './overview/expense_donut';
import { BatchProfitChart } from './overview/batch_profit_chart';
import { MortalityChart } from './overview/mortality_chart';
import { InventoryChart } from './overview/inventory_chart';
import { PayablesReceivables } from './overview/payables_receivables';
import { AvgSaleRateChart } from './overview/avg_sale_rate_chart';
import { FCRChart, FCRData } from './overview/fcr_chart';
import { FCRDetailModal } from './overview/fcr_detail_modal';
import { LiftingHeatmap } from './overview/lifting_heatmap';

const STALE = 5 * 60 * 1000;

const n = (v: unknown): number => Number(v) || 0;

const fmt = (v: number) =>
    `₹${n(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isInMonth = (dateStr: string, ref: Date) => {
    const d = new Date(dateStr);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
};

const getMonthKey = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (key: string) => {
    const [year, month] = key.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

const OverviewKPI = memo(({ title, value, subtext, icon: Icon, color }: {
    title: string;
    value: string;
    subtext: string;
    icon: LucideIcon;
    color: string;
}) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
        <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}14` }}
        >
            <Icon size={22} style={{ color }} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</p>
            <p className="text-xl font-bold text-gray-900 truncate mt-0.5">{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{subtext}</p>
        </div>
    </div>
));
OverviewKPI.displayName = 'OverviewKPI';

const OverviewModule = () => {
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
    const { data: allocationLines = [] } = useQuery({
        queryKey: ['batch_allocation_lines'], queryFn: fetchBatchAllocationLines, staleTime: STALE,
    });
    const { data: stockReceipts = [] } = useQuery({
        queryKey: ['stock_receipts'], queryFn: fetchStockReceipts, staleTime: STALE,
    });

    // ── Lookup maps ───────────────────────────────────────────────────
    const itemMap = useMemo(() => {
        const map: Record<string, Item> = {};
        items.forEach(i => { map[i.item_code] = i; });
        return map;
    }, [items]);

    const lotItemCodeMap = useMemo(() => {
        const map: Record<number, string> = {};
        stockReceipts.forEach(sr => { map[n(sr.lot_id)] = sr.item_code; });
        return map;
    }, [stockReceipts]);

    // ── KPI aggregations ──────────────────────────────────────────────
    const kpis = useMemo(() => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);

        const cashBalance = n(ledgerAccounts.find(a => a.account_id === 101)?.current_balance);

        const revenueThisMonth = batchSales
            .filter(s => isInMonth(s.created_at, now))
            .reduce((sum, s) => sum + n(s.value), 0);
        const revenueLastMonth = batchSales
            .filter(s => isInMonth(s.created_at, lastMonth))
            .reduce((sum, s) => sum + n(s.value), 0);
        const revenueDelta = revenueLastMonth > 0
            ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
            : 0;

        const expensesThisMonth = purchases
            .filter(p => isInMonth(p.purchase_date, now))
            .reduce((sum, p) => sum + n(p.total_cost), 0);
        const expensesLastMonth = purchases
            .filter(p => isInMonth(p.purchase_date, lastMonth))
            .reduce((sum, p) => sum + n(p.total_cost), 0);
        const expensesDelta = expensesLastMonth > 0
            ? ((expensesThisMonth - expensesLastMonth) / expensesLastMonth) * 100
            : 0;

        const activeBatches = batches.filter(b => b.status === 'Open');
        const totalBirds = activeBatches.reduce((s, b) => s + n(b.current_bird_count), 0);
        const totalInitial = activeBatches.reduce((s, b) => s + n(b.initial_bird_count), 0);
        const overallMortality = totalInitial > 0
            ? ((totalInitial - totalBirds) / totalInitial) * 100
            : 0;

        const activeLoans = loans.filter(l => l.status === 'Active');
        const outstandingLoanBalance = activeLoans.reduce((s, l) => s + n(l.outstanding_balance), 0);

        const last5Closures = batchClosures
            .slice()
            .sort((a, b) => b.end_date.localeCompare(a.end_date))
            .slice(0, 5);
        const totalClosedRevenue = last5Closures.reduce((s, c) => s + n(c.revenue), 0);
        const totalBirdsPlaced = last5Closures.reduce((s, c) => s + n(c.initial_chicken_count), 0);
        const avgRevenuePerBird = totalBirdsPlaced > 0
            ? totalClosedRevenue / totalBirdsPlaced
            : 0;

        return {
            cashBalance,
            revenueThisMonth,
            revenueDelta,
            expensesThisMonth,
            expensesDelta,
            activeBatchCount: activeBatches.length,
            totalBirds,
            overallMortality,
            outstandingLoanBalance,
            activeLoanCount: activeLoans.length,
            avgRevenuePerBird,
        };
    }, [ledgerAccounts, batchSales, purchases, batches, loans, batchClosures]);

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

    // ── Expense breakdown by item category ────────────────────────────
    const expenseBreakdown = useMemo(() => {
        const byCategory: Record<string, number> = {};
        purchases.forEach(p => {
            const cat = itemMap[p.item_code]?.item_category ?? 'Other';
            byCategory[cat] = (byCategory[cat] ?? 0) + n(p.total_cost);
        });

        const colors: Record<string, string> = {
            Feed: '#f59e0b',
            Chicks: '#38bdf8',
            Medicine: '#fb7185',
            FinishedBirds: '#a78bfa',
        };

        const data = Object.entries(byCategory).map(([name, value]) => ({
            name,
            value: parseFloat(n(value).toFixed(2)),
            color: colors[name] ?? '#94a3b8',
        }));

        return { data, total: data.reduce((s, d) => s + d.value, 0) };
    }, [purchases, itemMap]);

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
                const weight = n(s.quantity) * n(s.avg_weight);
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
            const weight = n(s.quantity) * n(s.avg_weight);
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

    // ── FCR per batch ─────────────────────────────────────────────────
    const FEED_BAG_KG = 50;

    const fcrData = useMemo(() => {
        const feedPerBatch: Record<number, number> = {};
        const feedBreakdownPerBatch: Record<number, { itemName: string; qty: number; unit: string; kg: number }[]> = {};
        allocationLines.forEach(line => {
            const batchId = n(line.batch_id);
            if (!batchId) return;
            const itemCode = lotItemCodeMap[n(line.lot_id)];
            if (!itemCode) return;
            const item = itemMap[itemCode];
            if (!item || item.item_category !== 'Feed') return;
            if (item.item_name.toUpperCase() === 'FEED DELIVERY') return;
            const qty = n(line.qty);
            const unit = item.unit ?? '';
            const kgs = unit.toLowerCase() === 'bags' ? qty * FEED_BAG_KG : qty;
            feedPerBatch[batchId] = (feedPerBatch[batchId] ?? 0) + kgs;
            if (!feedBreakdownPerBatch[batchId]) feedBreakdownPerBatch[batchId] = [];
            feedBreakdownPerBatch[batchId].push({ itemName: item.item_name, qty, unit, kg: kgs });
        });

        const weightPerBatch: Record<number, number> = {};
        const salesBreakdownPerBatch: Record<number, { quantity: number; avgWeight: number; totalWeight: number }[]> = {};
        batchSales.forEach(s => {
            const batchId = n(s.batch_id);
            const avgW = n(s.avg_weight);
            const qty = n(s.quantity);
            weightPerBatch[batchId] = (weightPerBatch[batchId] ?? 0) + avgW;
            if (!salesBreakdownPerBatch[batchId]) salesBreakdownPerBatch[batchId] = [];
            salesBreakdownPerBatch[batchId].push({ quantity: qty, avgWeight: avgW, totalWeight: avgW });
        });

        const batchIds = new Set([...Object.keys(feedPerBatch), ...Object.keys(weightPerBatch)].map(Number));

        return Array.from(batchIds)
            .map(id => {
                const feed = feedPerBatch[id] ?? 0;
                const weight = weightPerBatch[id] ?? 0;
                if (feed <= 0 || weight <= 0) return null;
                return {
                    label: `Batch ${id}`,
                    fcr: parseFloat((feed / weight).toFixed(2)),
                    batchId: id,
                    totalFeedKg: feed,
                    totalWeightKg: weight,
                    feedBreakdown: feedBreakdownPerBatch[id] ?? [],
                    salesBreakdown: salesBreakdownPerBatch[id] ?? [],
                };
            })
            .filter((d): d is FCRData => d !== null)
            .sort((a, b) => b.fcr - a.fcr)
            .slice(0, 10);
    }, [allocationLines, batchSales, lotItemCodeMap, itemMap]);

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
        const payables = suppliers
            .map(s => ({ name: s.name, amount: parseFloat(s.amount_due) || 0 }))
            .filter(s => s.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        const receivables = traders
            .map(t => ({ name: t.name, amount: parseFloat(t.amount_due) || 0 }))
            .filter(t => t.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        return {
            payables,
            receivables,
            totalPayable: payables.reduce((s, p) => s + p.amount, 0),
            totalReceivable: receivables.reduce((s, r) => s + r.amount, 0),
        };
    }, [suppliers, traders]);

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    color="#10b981"
                />
                <OverviewKPI
                    title="Expenses (Month)"
                    value={fmt(kpis.expensesThisMonth)}
                    subtext={
                        kpis.expensesDelta !== 0
                            ? `${kpis.expensesDelta > 0 ? '+' : ''}${kpis.expensesDelta.toFixed(2)}% vs last month`
                            : 'This month'
                    }
                    icon={TrendingDown}
                    color="#f97316"
                />
                <OverviewKPI
                    title="Active Batches"
                    value={String(kpis.activeBatchCount)}
                    subtext={`${kpis.totalBirds.toLocaleString('en-IN')} total birds`}
                    icon={Bird}
                    color="#0ea5e9"
                />
                <OverviewKPI
                    title="Total Live Birds"
                    value={kpis.totalBirds.toLocaleString('en-IN')}
                    subtext={`${kpis.overallMortality.toFixed(2)}% overall mortality`}
                    icon={Heart}
                    color="#f43f5e"
                />
                <OverviewKPI
                    title="Outstanding Loans"
                    value={fmt(kpis.outstandingLoanBalance)}
                    subtext={`${kpis.activeLoanCount} active loan${kpis.activeLoanCount !== 1 ? 's' : ''}`}
                    icon={Landmark}
                    color="#8b5cf6"
                />
                <OverviewKPI
                    title="Revenue Per Bird"
                    value={fmt(kpis.avgRevenuePerBird)}
                    subtext="Avg across last 5 closed batches"
                    icon={IndianRupee}
                    color="#d946ef"
                />
            </div>

            {/* Chick Lifting Heatmap */}
            <LiftingHeatmap batches={batches} />

            {/* Revenue vs Expenses & Expense Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
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
                </div>
                <ExpenseDonut data={expenseBreakdown.data} total={expenseBreakdown.total} />
            </div>

            {/* Batch Profitability & FCR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BatchProfitChart data={batchProfitData} />
                <FCRChart data={fcrData} onBarClick={setSelectedFCR} />
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
                data={selectedFCR}
            />
        </div>
    );
};

export default OverviewModule;
