'use client'
import { memo, useEffect, useMemo, useState } from 'react';
import { chart } from "./overview/chart_colors";
import { useQuery } from '@tanstack/react-query';
import {
    Banknote, TrendingUp, TrendingDown, Bird, Heart,
    Landmark, IndianRupee, LucideIcon, Receipt, Scale, ArrowLeftRight, Briefcase, Package, Wallet,
} from 'lucide-react';

import { fetchLedgerAccounts } from '@/app/api/ledger_accounts';
import { fetchBatchSales } from '@/app/api/batch_sales';
import { fetchPurchases } from '@/app/api/purchases';
import { fetchBatches, fetchBatchClosures } from '@/app/api/batches';
import { fetchLoans } from '@/app/api/loans';
import { fetchInventory } from '@/app/api/inventory';
import { fetchItems } from '@/app/api/items';
import { fetchSuppliers, fetchSupplierPayments } from '@/app/api/supplier';
import { fetchTraders, fetchTraderPayments } from '@/app/api/traders';
import { fetchBatchAllocationLines } from '@/app/api/batch_allocation_lines';
import { fetchBatchAllocations } from '@/app/api/batch_allocations';
import { fetchStockReceipts } from '@/app/api/stock_receipts';
import { fetchLedgerEntries } from '@/app/api/ledger_entries';
import { fetchOtherExpenses } from '@/app/api/other_expenses';
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

const STALE = 5 * 60 * 1000;

const n = (v: unknown): number => Number(v) || 0;

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
        queryKey: ['stock_receipts'], queryFn: () => fetchStockReceipts(), staleTime: STALE,
    });
    const { data: batchAllocations = [] } = useQuery({
        queryKey: ['batch_allocations'], queryFn: fetchBatchAllocations, staleTime: STALE,
    });
    const { data: ledgerEntries = [] } = useQuery({
        queryKey: ['ledger_entries'], queryFn: fetchLedgerEntries, staleTime: STALE,
    });
    const { data: otherExpenses = [] } = useQuery({
        queryKey: ['other_expenses'], queryFn: fetchOtherExpenses, staleTime: STALE,
    });
    const { data: supplierPaymentsBySupplier = {} } = useQuery({
        queryKey: ['overview_supplier_payments', suppliers.map(s => s.supplier_id)],
        queryFn: async () => {
            const entries = await Promise.all(suppliers.map(async s => {
                try {
                    const payments = await fetchSupplierPayments(s.supplier_id);
                    return [s.supplier_id, payments.reduce((sum, p) => sum + n(p.amount), 0)] as const;
                } catch {
                    return [s.supplier_id, 0] as const;
                }
            }));
            return Object.fromEntries(entries) as Record<number, number>;
        },
        enabled: suppliers.length > 0,
        staleTime: STALE,
    });
    const { data: traderPaymentsByTrader = {} } = useQuery({
        queryKey: ['overview_trader_payments', traders.map(t => t.trader_id)],
        queryFn: async () => {
            const entries = await Promise.all(traders.map(async t => {
                try {
                    const payments = await fetchTraderPayments(t.trader_id);
                    return [t.trader_id, payments.reduce((sum, p) => sum + n(p.amount), 0)] as const;
                } catch {
                    return [t.trader_id, 0] as const;
                }
            }));
            return Object.fromEntries(entries) as Record<number, number>;
        },
        enabled: traders.length > 0,
        staleTime: STALE,
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

    const lotCategoryMap = useMemo(() => {
        const map: Record<number, string> = {};
        stockReceipts.forEach(sr => {
            const cat = itemMap[sr.item_code]?.item_category;
            if (cat) map[n(sr.lot_id)] = cat;
        });
        return map;
    }, [stockReceipts, itemMap]);

    const allocationDateById = useMemo(() => {
        const map: Record<number, string> = {};
        batchAllocations.forEach(a => { map[n(a.allocation_id)] = a.allocation_date; });
        return map;
    }, [batchAllocations]);

    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

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
        const ledgerNet = (accountId: number, key: string) =>
            ledgerEntries
                .filter(e => e.account_id === accountId && inMonth(e.txn_date, key))
                .reduce((s, e) => s + n(e.debit) - n(e.credit), 0);

        const grossProfitThisMonth = sumRevenue(thisMonthKey) - sumCogs(thisMonthKey);
        const otherExpensesThisMonth = otherExpenses
            .filter(e => inMonth(e.expense_date, thisMonthKey))
            .reduce((s, e) => s + n(e.amount), 0);
        const commissionThisMonth = ledgerNet(106, thisMonthKey);
        const interestThisMonth = ledgerNet(112, thisMonthKey);
        const netProfitThisMonth = grossProfitThisMonth - otherExpensesThisMonth - commissionThisMonth - interestThisMonth;

        const cashEntries = ledgerEntries.filter(e => e.account_id === 101 && inMonth(e.txn_date, thisMonthKey));
        const cashIn = cashEntries.reduce((s, e) => s + n(e.debit), 0);
        const cashOut = cashEntries.reduce((s, e) => s + n(e.credit), 0);

        const balance = (id: number) => n(ledgerAccounts.find(a => a.account_id === id)?.current_balance);
        const cashBalance = balance(101);
        const inventoryValue = balance(102) + balance(103) + balance(104);
        const receivables = balance(110);
        const payables = balance(105);
        const workingCapital = cashBalance + inventoryValue + receivables - payables;

        // Feed days of cover: bags on hand ÷ average daily bags consumed
        const feedOnHand = stockReceipts
            .filter(sr => itemMap[sr.item_code]?.item_category === 'Feed' && itemMap[sr.item_code]?.item_name !== 'FEED DELIVERY')
            .reduce((s, sr) => s + n(sr.remaining_qty), 0);
        const datedFeed: { qty: number; date: string }[] = [];
        allocationLines.forEach(l => {
            if (lotCategoryMap[n(l.lot_id)] !== 'Feed') return;
            const date = allocationDateById[n(l.allocation_id)];
            if (date) datedFeed.push({ qty: n(l.qty), date });
        });
        let daysCover = 0;
        if (feedOnHand > 0 && datedFeed.length > 0) {
            const times = datedFeed.map(x => new Date(x.date + 'T00:00:00').getTime());
            const start = Math.min(...times);
            const end = Math.max(Date.now(), Math.max(...times));
            const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
            const perDay = datedFeed.reduce((s, x) => s + x.qty, 0) / days;
            daysCover = perDay > 0 ? feedOnHand / perDay : 0;
        }

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
    }, [ledgerAccounts, batchClosures, batchSales, otherExpenses, ledgerEntries, stockReceipts, allocationLines, allocationDateById, lotCategoryMap, itemMap, thisMonthKey]);

    // ── Net profit breakdown (double-click detail) ────────────────────
    const [showNetProfit, setShowNetProfit] = useState(false);

    const netProfitBreakdown: NetProfitBreakdown = useMemo(() => {
        const buildMonth = (key: string): NetProfitMonth => {
            const closures = batchClosures.filter(c => c.end_date.slice(0, 7) === key);
            const revenue = closures.reduce((s, c) => s + n(c.revenue), 0);
            const cogs = closures.reduce((s, c) => s + n(c.revenue) - n(c.gross_profit), 0);
            const grossProfit = revenue - cogs;

            const monthOther = otherExpenses.filter(e => e.expense_date.slice(0, 7) === key);
            const otherSum = monthOther.reduce((s, e) => s + n(e.amount), 0);
            const byCat: Record<string, number> = {};
            monthOther.forEach(e => {
                const label = OTHER_EXPENSE_CATEGORY_LABELS[e.category] ?? e.category;
                byCat[label] = (byCat[label] ?? 0) + n(e.amount);
            });

            const ledgerNet = (accountId: number) =>
                ledgerEntries
                    .filter(e => e.account_id === accountId && (e.txn_date ?? '').slice(0, 7) === key)
                    .reduce((s, e) => s + n(e.debit) - n(e.credit), 0);
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
                otherByCategory: Object.entries(byCat)
                    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
                    .sort((a, b) => b.value - a.value),
            };
        };
        return { month: buildMonth(thisMonthKey), previousMonth: buildMonth(lastMonthKey) };
    }, [batchClosures, otherExpenses, ledgerEntries, thisMonthKey, lastMonthKey]);

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
        allocationLines.forEach(l => {
            const date = allocationDateById[n(l.allocation_id)];
            if (!date || date.slice(0, 7) !== thisMonthKey) return;
            const cat = lotCategoryMap[n(l.lot_id)] ?? 'Other';
            byCategory[cat] = (byCategory[cat] ?? 0) + n(l.line_value);
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
    }, [allocationLines, allocationDateById, lotCategoryMap, thisMonthKey]);

    // ── Other expenses mix (month) by category ────────────────────────
    const otherExpenseMix = useMemo(() => {
        const byCategory: Record<string, number> = {};
        otherExpenses
            .filter(e => e.expense_date.slice(0, 7) === thisMonthKey)
            .forEach(e => {
                const label = OTHER_EXPENSE_CATEGORY_LABELS[e.category] ?? e.category;
                byCategory[label] = (byCategory[label] ?? 0) + n(e.amount);
            });

        const palette = [chart.orange, chart.rose, chart.blue, chart.teal, chart.violet, chart.amber, chart.magenta, chart.slate];
        const data = Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value], i) => ({
                name,
                value: parseFloat(n(value).toFixed(2)),
                color: palette[i % palette.length],
            }));

        return { data, total: data.reduce((s, d) => s + d.value, 0) };
    }, [otherExpenses, thisMonthKey]);

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
        return batches
            .filter(b => allocationLines.some(l => n(l.batch_id) === b.batch_id))
            .map(b => {
                let feed = 0, chicks = 0, medicine = 0, other = 0;
                allocationLines.forEach(l => {
                    if (n(l.batch_id) !== b.batch_id) return;
                    const cat = lotCategoryMap[n(l.lot_id)] ?? 'Other';
                    const v = n(l.line_value);
                    if (cat === 'Feed') feed += v;
                    else if (cat === 'Chicks') chicks += v;
                    else if (cat === 'Medicine') medicine += v;
                    else other += v;
                });
                const birds = n(b.initial_bird_count);
                const perBird = (v: number) => (birds > 0 ? parseFloat((v / birds).toFixed(2)) : 0);
                return {
                    label: `Batch ${b.batch_id}`,
                    feed: perBird(feed),
                    chicks: perBird(chicks),
                    medicine: perBird(medicine),
                    other: perBird(other),
                    total: perBird(feed + chicks + medicine + other),
                    birds,
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
            .slice(-10);
    }, [batches, allocationLines, lotCategoryMap]);

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

    // ── Avg sale weight per bird (kg) ─────────────────────────────────
    const avgWeightData: AvgWeightData[] = useMemo(() => {
        return batchSales
            .slice()
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map(s => {
                const qty = n(s.quantity);
                const d = new Date(s.created_at);
                return {
                    label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                    avgWeight: qty > 0 ? parseFloat((n(s.avg_weight) / qty).toFixed(3)) : 0,
                    batchId: s.batch_id,
                    birds: qty,
                };
            });
    }, [batchSales]);

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
            salesBreakdownPerBatch[batchId].push({
                quantity: qty,
                avgWeight: qty > 0 ? avgW / qty : 0,
                totalWeight: avgW,
            });
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
        const daysSince = (dateStr?: string) => {
            if (!dateStr) return undefined;
            const t = new Date(dateStr.slice(0, 10) + 'T00:00:00').getTime();
            if (Number.isNaN(t)) return undefined;
            return Math.max(0, Math.floor((Date.now() - t) / 86400000));
        };

        // Receivables: credit sales per trader minus payments received
        const receivableByTrader: Record<number, { amount: number; oldest?: string }> = {};
        batchSales.forEach(s => {
            if ((s.payment_type ?? 'RECEIVABLE') !== 'RECEIVABLE') return;
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
            if ((p.payment_type ?? '') !== 'PAYABLE') return;
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
                    subtext={`${otherExpenses.filter(e => e.expense_date.slice(0, 7) === thisMonthKey).length} entries this month`}
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
                <div className="space-y-6">
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
            </div>

            {/* Batch Profitability & FCR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BatchProfitChart data={batchProfitData} />
                <FCRChart data={fcrData} onBarClick={setSelectedFCR} />
            </div>

            {/* Cost per Bird, Realized vs Breakeven, Avg Sale Weight */}
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
                data={selectedFCR}
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
