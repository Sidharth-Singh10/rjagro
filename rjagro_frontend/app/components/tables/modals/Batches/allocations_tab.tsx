import { AllocationsTabProps } from "./utils";

export const AllocationsTab: React.FC<AllocationsTabProps> = ({ activeTab, data }) => {
    return (
        <>
            {/* Enhanced total value display */}
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">
                        Total {activeTab} Allocated Value
                    </span>
                    <span className="text-2xl font-bold text-green-900">
                        ₹{data.total.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Enhanced table container */}
            <div className="max-h-80 overflow-auto rounded-xl border border-gray-200">
                {data.rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                            <span className="text-xl">📦</span>
                        </div>
                        <p className="text-sm font-medium">No {activeTab.toLowerCase()} allocations</p>
                        <p className="text-xs text-gray-400">No data available for this batch</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr className="text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Requirement ID
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Item Code
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Item Name
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">
                                    Requested Qty
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">
                                    Allocated Value
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.rows.map((row: any) => {
                                const req = row.requirement;
                                return (
                                    <tr
                                        key={req.requirement_id}
                                        className="hover:bg-gray-50 transition-colors duration-150"
                                    >
                                        <td className="px-4 py-4 text-gray-900 font-mono text-xs">
                                            {req.requirement_id}
                                        </td>
                                        <td className="px-4 py-4 text-gray-700 font-medium">
                                            {req.item_code}
                                        </td>
                                        <td className="px-4 py-4 text-gray-900">
                                            {req.item_name}
                                        </td>
                                        <td className="px-4 py-4 text-gray-700 text-right font-medium">
                                            {req.quantity}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="text-gray-900 font-semibold">
                                                ₹{row.totalAllocatedValue.toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
};