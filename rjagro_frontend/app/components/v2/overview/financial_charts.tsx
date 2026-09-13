'use client'
import { memo } from 'react';
import { MetricTrendChart } from './metric_trend_chart';
import { chart } from './chart_colors';
import type { SeriesPoint } from './range_filter';

interface Props {
    data: SeriesPoint[];
    headerControls?: React.ReactNode;
}

const inrCompact = (value: number) => `₹${(Number(value) / 1000).toFixed(0)}k`;
const pct = (value: number) => `${Number(value).toFixed(2)}%`;
const pctTick = (value: number) => `${Number(value).toFixed(0)}%`;
const kg = (value: number) =>
    `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg`;
const count = (value: number) =>
    Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ─── Closed-batch P&L ────────────────────────────────────────────────────────

export const PnlTrendChart = memo(({ data, headerControls }: Props) => (
    <MetricTrendChart
        title="P&L Trend — Closed Batches (₹)"
        data={data}
        headerControls={headerControls}
        leftTickFormatter={inrCompact}
        emptyText="No closed batch history yet"
        series={[
            { key: 'revenue_closed', label: 'Revenue', color: chart.brand, kind: 'bar' },
            { key: 'cogs', label: 'COGS', color: chart.orange, kind: 'bar' },
            { key: 'gross_profit', label: 'Gross Profit', color: chart.blue, kind: 'line' },
            { key: 'net_profit', label: 'Net Profit', color: chart.teal, kind: 'line' },
            { key: 'other_expenses', label: 'Other Expenses', color: chart.rose, kind: 'line' },
        ]}
    />
));
PnlTrendChart.displayName = 'PnlTrendChart';

// ─── Margins ─────────────────────────────────────────────────────────────────

export const MarginTrendChart = memo(({ data, headerControls }: Props) => (
    <MetricTrendChart
        title="Margin Trend (%)"
        data={data}
        headerControls={headerControls}
        leftTickFormatter={pctTick}
        emptyText="No closed batch history yet"
        series={[
            { key: 'gross_margin_pct', label: 'Gross Margin', color: chart.brand, format: pct },
            { key: 'net_margin_pct', label: 'Net Margin', color: chart.violet, format: pct },
        ]}
    />
));
MarginTrendChart.displayName = 'MarginTrendChart';

// ─── Realized vs breakeven ₹/kg ──────────────────────────────────────────────

export const RevenuePerKgChart = memo(({ data, headerControls, badge }: Props & { badge?: React.ReactNode }) => (
    <MetricTrendChart
        title="Revenue per kg — Closed Batches (₹/kg)"
        data={data}
        headerControls={headerControls}
        badge={badge}
        leftTickFormatter={(value: number) => `₹${Number(value).toFixed(0)}`}
        emptyText="No closed batches yet"
        series={[
            { key: 'revenue_per_kg', label: 'Revenue/kg', color: chart.brand },
        ]}
    />
));
RevenuePerKgChart.displayName = 'RevenuePerKgChart';

// ─── Cash flow ───────────────────────────────────────────────────────────────

export const CashFlowChart = memo(({ data, headerControls }: Props) => (
    <MetricTrendChart
        title="Cash Flow (₹, by period)"
        data={data}
        headerControls={headerControls}
        leftTickFormatter={inrCompact}
        emptyText="No ledger history yet"
        series={[
            { key: 'cash_in', label: 'Cash In', color: chart.green, kind: 'bar' },
            { key: 'cash_out', label: 'Cash Out', color: chart.rose, kind: 'bar' },
            { key: 'net_cash_flow', label: 'Net Cash Flow', color: chart.blue },
        ]}
    />
));
CashFlowChart.displayName = 'CashFlowChart';

// ─── Working capital & balances ──────────────────────────────────────────────

export const WorkingCapitalChart = memo(({ data, headerControls }: Props) => (
    <MetricTrendChart
        title="Working Capital & Balances (₹)"
        data={data}
        headerControls={headerControls}
        leftTickFormatter={inrCompact}
        emptyText="No balance history yet"
        series={[
            { key: 'cash_balance', label: 'Cash', color: chart.brand },
            { key: 'working_capital', label: 'Working Capital', color: chart.violet },
            { key: 'receivables', label: 'Receivables', color: chart.blue },
            { key: 'payables', label: 'Payables', color: chart.rose },
            { key: 'inventory_value', label: 'Inventory', color: chart.amber },
        ]}
        initialHidden={['receivables', 'payables', 'inventory_value']}
    />
));
WorkingCapitalChart.displayName = 'WorkingCapitalChart';

// ─── Ops: birds & feed ───────────────────────────────────────────────────────

export const OpsVolumeChart = memo(({ data, headerControls }: Props) => (
    <MetricTrendChart
        title="Birds & Feed"
        data={data}
        headerControls={headerControls}
        leftTickFormatter={(value: number) => `${Number(value).toFixed(0)}`}
        rightTickFormatter={(value: number) => `${(Number(value) / 1000).toFixed(0)}k kg`}
        emptyText="No operations history yet"
        series={[
            { key: 'birds_placed', label: 'Birds Placed', color: chart.blue, kind: 'bar', format: count },
            { key: 'birds_sold', label: 'Birds Sold', color: chart.brand, kind: 'bar', format: count },
            {
                key: 'feed_consumed_kg',
                label: 'Feed',
                color: chart.amber,
                yAxis: 'right',
                format: kg,
            },
        ]}
        initialHidden={['feed_consumed_kg']}
    />
));
OpsVolumeChart.displayName = 'OpsVolumeChart';

// ─── Ops: efficiency ─────────────────────────────────────────────────────────

export const EfficiencyChart = memo(({ data, headerControls }: Props) => (
    <MetricTrendChart
        title="Mortality & FCR"
        data={data}
        headerControls={headerControls}
        leftTickFormatter={pctTick}
        rightTickFormatter={(value: number) => Number(value).toFixed(1)}
        emptyText="No closed batch history yet"
        series={[
            { key: 'mortality_pct', label: 'Mortality', color: chart.rose, format: pct },
            {
                key: 'fcr',
                label: 'FCR',
                color: chart.violet,
                yAxis: 'right',
                format: (value: number) => Number(value).toFixed(2),
            },
        ]}
    />
));
EfficiencyChart.displayName = 'EfficiencyChart';
