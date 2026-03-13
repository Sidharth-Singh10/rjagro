'use client'
import { useMemo } from 'react';
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
import { FCRChart } from './overview/fcr_chart';
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

const OverviewKPI = ({ title, value, subtext, icon: Icon, color }: {
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
);

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

        const totalClosedRevenue = batchClosures.reduce((s, c) => s + n(c.revenue), 0);
        const totalBirdsSold = batchClosures.reduce((s, c) => s + n(c.available_chicken_count), 0);
        const avgRevenuePerBird = totalBirdsSold > 0
            ? totalClosedRevenue / totalBirdsSold
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

    // ── Monthly revenue vs expenses series ────────────────────────────
    const revenueExpenseData = useMemo(() => {
        const months: Record<string, { revenue: number; expenses: number }> = {};

        batchSales.forEach(s => {
            const key = getMonthKey(s.created_at);
            if (!months[key]) months[key] = { revenue: 0, expenses: 0 };
            months[key].revenue += n(s.value);
        });

        purchases.forEach(p => {
            const key = getMonthKey(p.purchase_date);
            if (!months[key]) months[key] = { revenue: 0, expenses: 0 };
            months[key].expenses += n(p.total_cost);
        });

        return Object.entries(months)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([key, val]) => ({
                month: getMonthLabel(key),
                revenue: parseFloat(n(val.revenue).toFixed(2)),
                expenses: parseFloat(n(val.expenses).toFixed(2)),
            }));
    }, [batchSales, purchases]);

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

    // ── Avg Sale Rate per month (weighted by weight sold) ─────────────
    const avgSaleRateData = useMemo(() => {
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
                month: getMonthLabel(key),
                avgRate: val.totalWeight > 0
                    ? parseFloat((val.weightedSum / val.totalWeight).toFixed(2))
                    : 0,
            }));
    }, [batchSales]);

    // ── FCR per batch ─────────────────────────────────────────────────
    const fcrData = useMemo(() => {
        const feedPerBatch: Record<number, number> = {};
        allocationLines.forEach(line => {
            const batchId = n(line.batch_id);
            if (!batchId) return;
            const itemCode = lotItemCodeMap[n(line.lot_id)];
            if (!itemCode) return;
            const category = itemMap[itemCode]?.item_category;
            if (category !== 'Feed') return;
            feedPerBatch[batchId] = (feedPerBatch[batchId] ?? 0) + n(line.qty);
        });

        const weightPerBatch: Record<number, number> = {};
        batchSales.forEach(s => {
            const batchId = n(s.batch_id);
            weightPerBatch[batchId] = (weightPerBatch[batchId] ?? 0) + n(s.quantity) * n(s.avg_weight);
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
                };
            })
            .filter((d): d is { label: string; fcr: number } => d !== null)
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
                    subtext="Avg across closed batches"
                    icon={IndianRupee}
                    color="#d946ef"
                />
            </div>

            {/* Chick Lifting Heatmap */}
            <LiftingHeatmap batches={batches} />

            {/* Revenue vs Expenses & Expense Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueExpenseChart data={revenueExpenseData} />
                </div>
                <ExpenseDonut data={expenseBreakdown.data} total={expenseBreakdown.total} />
            </div>

            {/* Batch Profitability & FCR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BatchProfitChart data={batchProfitData} />
                <FCRChart data={fcrData} />
            </div>

            {/* Mortality, Avg Sale Rate, Inventory */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MortalityChart data={mortalityData} />
                <AvgSaleRateChart data={avgSaleRateData} />
                <InventoryChart data={inventoryData} />
            </div>

            {/* Payables & Receivables */}
            <PayablesReceivables {...payablesReceivablesData} />
        </div>
    );
};

export default OverviewModule;
