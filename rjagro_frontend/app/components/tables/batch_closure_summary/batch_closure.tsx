import React, { useState, useEffect, useRef } from 'react';
import TableSkeletonRows from '@/app/components/ui/table_skeleton_rows';
import { Inbox, 
    Edit,
    Filter,
    ChevronLeft,
    ChevronRight,
    Plus,
    MoreVertical,
    FileText
} from 'lucide-react';
import { Batch, BatchClosure } from '@/app/types/interfaces';
import DownloadGCModal from './download_gc';


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
    // Dropdown menu state
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handler to open the modal and close the dropdown
    const handleOpenGCModal = (batchId: number) => {
        setSelectedBatchId(batchId);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const calculateProfitMargin = (revenue: number, grossProfit: number) => {
        if (revenue === 0) return 0;
        return (grossProfit / revenue * 100);
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow">
                {/* Header */}
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

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
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
                                <TableSkeletonRows cols={10} />
                            ) : batchClosures.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No batch closure summaries found</p>
                                </td>
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
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">₹{Number(closure.revenue).toLocaleString()}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                            <span className={Number(closure.gross_profit) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                ₹{Number(closure.gross_profit).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${calculateProfitMargin(Number(closure.revenue), Number(closure.gross_profit)) >= 20
                                                ? 'bg-green-100 text-green-800'
                                                : calculateProfitMargin(Number(closure.revenue), Number(closure.gross_profit)) >= 10
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {calculateProfitMargin(Number(closure.revenue), Number(closure.gross_profit)).toFixed(1)}%
                                            </span>
                                        </td>

                                        {/* Actions Column */}
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
                                                        className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-40"
                                                    >
                                                        <div className="py-1" role="menu">
                                                            <button
                                                                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                onClick={() => setOpenMenuId(null)}
                                                            >
                                                                <Edit size={16} className="mr-2" />
                                                                Edit
                                                            </button>

                                                            <button
                                                                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                onClick={() => handleOpenGCModal(closure.batch_id)}
                                                            >
                                                                <FileText size={16} className="mr-2 text-green-600" />
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

                {/* Pagination (Simplified for brevity) */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-gray-500">
                        Showing {batchClosures.length} results
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modular Component Implementation */}
            {selectedBatchId !== null && (
                <DownloadGCModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedBatchId(null);
                    }}
                    batchId={selectedBatchId}
                />
            )}
        </>
    );
};

export default BatchClosureSummaryTable;