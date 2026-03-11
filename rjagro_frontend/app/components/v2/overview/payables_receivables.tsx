'use client'
import { ChartCard } from './chart_card';

interface EntityDue {
    name: string;
    amount: number;
}

interface Props {
    payables: EntityDue[];
    receivables: EntityDue[];
    totalPayable: number;
    totalReceivable: number;
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PayablesReceivables = ({ payables, receivables, totalPayable, totalReceivable }: Props) => {
    const net = totalReceivable - totalPayable;

    return (
        <ChartCard title="Payables & Receivables">
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-gray-50">
                <div className="text-center flex-1">
                    <p className="text-xs text-gray-500">Total Payable</p>
                    <p className="text-base font-bold text-orange-600">{fmt(totalPayable)}</p>
                </div>
                <div className="text-center flex-1 border-x border-gray-200">
                    <p className="text-xs text-gray-500">Total Receivable</p>
                    <p className="text-base font-bold text-green-600">{fmt(totalReceivable)}</p>
                </div>
                <div className="text-center flex-1">
                    <p className="text-xs text-gray-500">Net Position</p>
                    <p className={`text-base font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {net >= 0 ? '+' : ''}{fmt(net)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Top Payables
                    </p>
                    <div className="space-y-2">
                        {payables.length === 0 && (
                            <p className="text-xs text-gray-400">No outstanding payables</p>
                        )}
                        {payables.slice(0, 5).map((s) => (
                            <div key={s.name} className="flex justify-between text-xs">
                                <span className="text-gray-600 truncate mr-2">{s.name}</span>
                                <span className="font-medium text-orange-600 whitespace-nowrap">
                                    {fmt(s.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Top Receivables
                    </p>
                    <div className="space-y-2">
                        {receivables.length === 0 && (
                            <p className="text-xs text-gray-400">No outstanding receivables</p>
                        )}
                        {receivables.slice(0, 5).map((t) => (
                            <div key={t.name} className="flex justify-between text-xs">
                                <span className="text-gray-600 truncate mr-2">{t.name}</span>
                                <span className="font-medium text-green-600 whitespace-nowrap">
                                    {fmt(t.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </ChartCard>
    );
};
