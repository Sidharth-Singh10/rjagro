'use client'
import { memo } from 'react';
import {
    BadgeCheck, CalendarClock, CircleHelp, Shuffle, TrendingDown, TrendingUp,
} from 'lucide-react';
import { chart } from '../../v2/overview/chart_colors';
import {
    impactLabel, type ChickenEvent, type DateConfidence, type PriceImpact,
} from '@/app/utils/event_calendar';

/**
 * Colour is paired with a glyph and a word in every surface that uses these,
 * so the impact direction survives greyscale, colour blindness and print.
 */
export const impactColor: Record<PriceImpact, string> = {
    positive: chart.green,
    negative: chart.red,
    mixed: chart.amber,
    unknown: chart.slate,
};

/** One-word form for chips, legends and toolbars, where space is tight. */
export const impactShortLabel: Record<PriceImpact, string> = {
    positive: 'Uptick',
    negative: 'Downturn',
    mixed: 'Mixed',
    unknown: 'Unknown',
};

/** Stable render order for legends, lists and sorted columns. */
export const impactOrder: PriceImpact[] = ['positive', 'negative', 'mixed', 'unknown'];

export const ImpactIcon = ({ impact, size = 13 }: { impact: PriceImpact; size?: number }) => {
    if (impact === 'positive') return <TrendingUp size={size} aria-hidden />;
    if (impact === 'negative') return <TrendingDown size={size} aria-hidden />;
    if (impact === 'mixed') return <Shuffle size={size} aria-hidden />;
    return <CircleHelp size={size} aria-hidden />;
};

const dateConfidenceIcon = (confidence: DateConfidence) => {
    if (confidence === 'confirmed') return <BadgeCheck size={12} aria-hidden />;
    if (confidence === 'estimated') return <CalendarClock size={12} aria-hidden />;
    return <CircleHelp size={12} aria-hidden />;
};

const dateConfidenceClass: Record<DateConfidence, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    estimated: 'bg-amber-50 text-amber-800 border-amber-200',
    tentative: 'bg-orange-50 text-orange-800 border-orange-200',
    unknown: 'bg-gray-50 text-gray-600 border-gray-200',
};

export const ImpactChip = memo(({ impact, compact = false }: { impact: PriceImpact; compact?: boolean }) => (
    <span
        className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
        style={{
            color: impactColor[impact],
            borderColor: `color-mix(in srgb, ${impactColor[impact]} 30%, white)`,
            backgroundColor: `color-mix(in srgb, ${impactColor[impact]} 9%, white)`,
        }}
    >
        <ImpactIcon impact={impact} />
        {!compact && impactLabel[impact]}
    </span>
));
ImpactChip.displayName = 'ImpactChip';

export const DateConfidenceChip = memo(({ confidence }: { confidence: DateConfidence }) => (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${dateConfidenceClass[confidence]}`}>
        {dateConfidenceIcon(confidence)}
        {confidence === 'confirmed' ? 'Confirmed date' : confidence === 'estimated' ? 'Estimated date' : confidence === 'tentative' ? 'Tentative date' : 'Unknown date'}
    </span>
));
DateConfidenceChip.displayName = 'DateConfidenceChip';

export const ConfidenceChip = memo(({ confidence }: { confidence: ChickenEvent['impactConfidence'] }) => (
    <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
        {confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : 'Low'} impact confidence
    </span>
));
ConfidenceChip.displayName = 'ConfidenceChip';

/**
 * Compact key for the section header. Impact is always glyph + word, never
 * colour on its own.
 */
export const ImpactLegend = memo(() => (
    <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500"
        aria-label="Expected price direction (research hypothesis): uptick, downturn, mixed, unknown"
    >
        {impactOrder.map((impact) => (
            <span key={impact} className="inline-flex items-center gap-1">
                <span style={{ color: impactColor[impact] }} aria-hidden>
                    <ImpactIcon impact={impact} size={12} />
                </span>
                {impactShortLabel[impact]}
            </span>
        ))}
    </div>
));
ImpactLegend.displayName = 'ImpactLegend';
