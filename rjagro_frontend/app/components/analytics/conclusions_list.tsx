'use client'
import { memo } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Conclusion } from '@/app/utils/analytics';

/**
 * Renders the conclusions the pipeline produced. Nothing here composes a
 * sentence of its own — if the model changes, these words change with it.
 */
export const ConclusionsList = memo(({ conclusions, kinds = ['finding', 'caveat'] }: {
    conclusions: Conclusion[];
    kinds?: Array<Conclusion['kind']>;
}) => {
    const rows = conclusions.filter((c) => kinds.includes(c.kind));
    if (rows.length === 0) return null;

    return (
        <ul className="space-y-2">
            {rows.map((c) => (
                <li key={c.id} className="flex gap-2 text-[12px] leading-relaxed">
                    {c.kind === 'finding' ? (
                        <CheckCircle2 size={13} className="mt-[3px] shrink-0 text-emerald-600" />
                    ) : (
                        <AlertTriangle size={13} className="mt-[3px] shrink-0 text-amber-500" />
                    )}
                    <span className={c.kind === 'finding' ? 'text-gray-700' : 'text-gray-500'}>{c.text}</span>
                </li>
            ))}
        </ul>
    );
});

ConclusionsList.displayName = 'ConclusionsList';
