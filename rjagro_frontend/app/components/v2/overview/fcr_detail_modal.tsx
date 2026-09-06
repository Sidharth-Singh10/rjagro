'use client';

import { memo } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { FCRData } from './fcr_chart';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    data: FCRData | null;
}


const getColor = (fcr: number) => {
    if (fcr <= 1.7) return '#16a34a';
    if (fcr <= 2.0) return '#f59e0b';
    return '#ef4444';
};

const getVerdict = (fcr: number) => {
    if (fcr <= 1.6) return { text: 'Excellent', bg: 'bg-green-50', border: 'border-green-200', fg: 'text-green-700' };
    if (fcr <= 1.8) return { text: 'Acceptable', bg: 'bg-yellow-50', border: 'border-yellow-200', fg: 'text-yellow-700' };
    if (fcr <= 2.0) return { text: 'Below Average', bg: 'bg-orange-50', border: 'border-orange-200', fg: 'text-orange-700' };
    return { text: 'Poor', bg: 'bg-red-50', border: 'border-red-200', fg: 'text-red-700' };
};


const getRecommendation = (fcr: number): string[] => {
    if (fcr <= 1.6) return [
        'Feed conversion is well within target. Maintain the current feed and feeding schedule.',
        'Keep monitoring weekly so any regression is caught early.',
    ];
    if (fcr <= 1.8) return [
        'FCR is acceptable but has room to improve toward the 1.6 target.',
        'Review feed storage for moisture or spillage, and confirm feeders are calibrated to reduce waste.',
    ];
    if (fcr <= 2.0) return [
        'FCR is above target. Check for feed wastage, uneven feeder line height, and pellet quality.',
        'Review bird weights against the standard growth curve — uneven growth usually points to feeding or temperature issues.',
    ];
    return [
        'FCR is poor. Audit feed inventory records against deliveries to rule out shrinkage.',
        'Check for disease pressure, heat stress or ventilation problems, and review mortality timing against the feeding program.',
    ];
};

export const FCRDetailModal = memo(({ isOpen, onClose, data }: Props) => {
    if (!isOpen || !data) return null;

    const verdict = getVerdict(data.fcr);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b bg-white">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{data.label} — FCR Breakdown</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Step-by-step calculation</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-5">
                    {/* Step 1: Feed consumed */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Step 1: Total Feed Consumed
                        </h3>
                        <div className="border border-gray-100 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500">
                                        <th className="text-left px-3 py-2 font-medium">Feed Item</th>
                                        <th className="text-right px-3 py-2 font-medium">Qty</th>
                                        <th className="text-right px-3 py-2 font-medium">Unit</th>
                                        <th className="text-right px-3 py-2 font-medium">kg</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.feedBreakdown.map((f, i) => (
                                        <tr key={i} className="border-t border-gray-50">
                                            <td className="px-3 py-2 text-gray-700">{f.itemName}</td>
                                            <td className="px-3 py-2 text-right text-gray-600">{f.qty}</td>
                                            <td className="px-3 py-2 text-right text-gray-600">{f.unit}</td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-800">{f.kg.toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                                        <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-600">Total Feed</td>
                                        <td className="px-3 py-2 text-right font-bold text-gray-900">{data.totalFeedKg.toFixed(1)} kg</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>

                    {/* Step 2: Live weight sold */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Step 2: Total Live Weight Sold
                        </h3>
                        <div className="border border-gray-100 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500">
                                        <th className="text-left px-3 py-2 font-medium">Sale #</th>
                                        <th className="text-right px-3 py-2 font-medium">Birds</th>
                                        <th className="text-right px-3 py-2 font-medium">Avg Weight (kg)</th>
                                        <th className="text-right px-3 py-2 font-medium">Total Weight (kg)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.salesBreakdown.map((s, i) => (
                                        <tr key={i} className="border-t border-gray-50">
                                            <td className="px-3 py-2 text-gray-700">Sale {i + 1}</td>
                                            <td className="px-3 py-2 text-right text-gray-600">{s.quantity}</td>
                                            <td className="px-3 py-2 text-right text-gray-600">{s.avgWeight.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-800">{s.totalWeight.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                                        <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-600">Total Weight</td>
                                        <td className="px-3 py-2 text-right font-bold text-gray-900">{data.totalWeightKg.toFixed(2)} kg</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>

                    {/* Step 3: FCR result */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Step 3: FCR Calculation
                        </h3>
                        <div className={`${verdict.bg} ${verdict.border} border rounded-lg p-4`}>
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-600 space-y-1">
                                    <p>
                                        <span className="font-medium">Formula:</span>{' '}
                                        Total Feed (kg) &divide; Total Weight Sold (kg)
                                    </p>
                                    <p>
                                        <span className="font-medium">Calculation:</span>{' '}
                                        {data.totalFeedKg.toFixed(1)} &divide; {data.totalWeightKg.toFixed(2)} ={' '}
                                        <span className="font-bold text-sm" style={{ color: getColor(data.fcr) }}>
                                            {data.fcr.toFixed(2)}
                                        </span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${verdict.fg} ${verdict.bg} ${verdict.border} border`}>
                                        {verdict.text}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Recommendations */}
                    <section>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className="text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-700">
                                Recommendations
                            </h3>
                        </div>
                        <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
                            <ul className="text-xs text-gray-700 leading-relaxed space-y-1.5 list-disc ml-4">
                                {getRecommendation(data.fcr).map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
});
FCRDetailModal.displayName = 'FCRDetailModal';
