import React, { useState, useEffect, useRef } from 'react';
import {
    Edit,
    Filter,
    ChevronLeft,
    ChevronRight,
    Plus,
    MoreVertical,
    FileText
} from 'lucide-react';

import { BatchClosure, Batch } from '../../types/interfaces';
import { downloadGrowingChargesPdf } from '@/app/api/batches';

interface BatchClosureWithJoins extends BatchClosure {
    farmer_name?: string;
    line_name?: string;
    supervisor_name?: string;
}

interface BatchClosureSummaryTableProps {
    batchClosures: BatchClosureWithJoins[];
    batches: Batch[];
    loading: boolean;
    showAddForm: boolean;
    setShowAddForm: (show: boolean) => void;
}

const BatchClosureSummaryTable: React.FC<BatchClosureSummaryTableProps> = ({
    batchClosures,
    batches,
    loading,
    setShowAddForm,
}) => {
    // State to track which row has the menu open
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleDownloadGC = async (batchId: number) => {
        await downloadGrowingChargesPdf(batchId, 0);
        setOpenMenuId(null);
    };

    const calculateMortality = (initial: number, available: number) => {
        if (initial === 0) return 0;
        return ((initial - available) / initial * 100);
    };

    const calculateProfitMargin = (revenue: number, grossProfit: number) => {
        if (revenue === 0) return 0;
        return (grossProfit / revenue * 100);
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Batch Closure Summary</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Plus size={18} />
                        Add Closure Summary
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]"> {/* Added min-h to allow dropdowns to scroll if needed */}
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initial</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Profit</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin %</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : batchClosures.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">No batch closure summaries found</td>
                            </tr>
                        ) : (
                            batchClosures.map((closure) => (
                                <tr key={closure.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{closure.id}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">#{closure.batch_id}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {(() => {
                                            const batch = batches.find(b => b.batch_id === closure.batch_id);
                                            return batch?.farmer_name || 'N/A';
                                        })()}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="text-xs">
                                            <div>{closure.start_date}</div>
                                            <div className="text-gray-500">to {closure.end_date}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{closure.initial_chicken_count.toLocaleString()}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{closure.available_chicken_count.toLocaleString()}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">₹{closure.revenue.toLocaleString()}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                        <span className={closure.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            ₹{closure.gross_profit.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${calculateProfitMargin(closure.revenue, closure.gross_profit) >= 20
                                            ? 'bg-green-100 text-green-800'
                                            : calculateProfitMargin(closure.revenue, closure.gross_profit) >= 10
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {calculateProfitMargin(closure.revenue, closure.gross_profit).toFixed(1)}%
                                        </span>
                                    </td>

                                    {/* --- Actions Column with Dropdown --- */}
                                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <div className="relative inline-block text-left">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === closure.id ? null : closure.id);
                                                }}
                                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {openMenuId === closure.id && (
                                                <div
                                                    ref={menuRef}
                                                    className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
                                                >
                                                    <div className="py-1" role="menu">
                                                        {/* Edit Option */}
                                                        <button
                                                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            onClick={() => {
                                                                console.log("Edit clicked", closure.id);
                                                                setOpenMenuId(null);
                                                            }}
                                                        >
                                                            <Edit size={16} className="mr-2" />
                                                            Edit
                                                        </button>

                                                        {/* Download GC Option */}
                                                        <button
                                                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            onClick={() => handleDownloadGC(closure.batch_id)}
                                                        >
                                                            <FileText size={16} className="mr-2 text-blue-600" />
                                                            Download GC
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                    Showing {batchClosures.length} of {batchClosures.length} results
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <ChevronLeft size={16} />
                        Previous
                    </button>
                    <button className="px-3 py-2 bg-blue-600 text-white rounded-lg">1</button>
                    <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchClosureSummaryTable;