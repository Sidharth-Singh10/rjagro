import { handleCloseBatch } from "@/app/api/batches";
import { fetchBatchSalesByBatchId } from "@/app/api/batch_sales";
import { Batch } from "@/app/types/interfaces";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, ChevronDown, Printer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const BatchHeader = ({ batch, onBack }: { batch: Batch; onBack: () => void }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
                {/* Left Side: Back Button & Title */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={onBack}
                        className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                    >
                        <ArrowLeft size={20} className="text-gray-600 sm:w-6 sm:h-6" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-2xl font-bold text-gray-800">
                            Batch #{batch.batch_id}
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">
                            {batch.farmer_name} • Started: {batch.start_date}
                        </p>
                    </div>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${batch.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {batch.status}
                    </span>
                </div>

                {/* Right Side: Actions */}
                <div className="flex gap-2 ml-8 sm:ml-0">
                    <button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm">
                        <Printer size={16} /> Report
                    </button>

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                            Actions
                            <ChevronDown size={16} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Edit Batch
                                </button>
                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setIsCloseModalOpen(true);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                    Close Batch
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isCloseModalOpen && (
                <CloseBatchModal
                    batch={batch}
                    onClose={() => setIsCloseModalOpen(false)}
                />
            )}
        </>
    );
};

const CloseBatchModal = ({ batch, onClose }: { batch: Batch; onClose: () => void }) => {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    // Initialize state with default date
    const [formData, setFormData] = useState({
        batch_id: batch.batch_id,
        start_date: batch.start_date,
        end_date: new Date().toISOString().split('T')[0],
        initial_chicken_count: batch.initial_bird_count,
        available_chicken_count: batch.current_bird_count,
        revenue: 0,
        gross_profit: 0
    });
    const [revenueEdited, setRevenueEdited] = useState(false);

    // Auto-fill revenue from recorded sales so closing doesn't default to 0.
    const { data: batchSales = [] } = useQuery({
        queryKey: ["batch_sales_close", batch.batch_id],
        queryFn: () => fetchBatchSalesByBatchId(batch.batch_id),
    });
    const salesTotal = batchSales.reduce((s, x) => s + (Number(x.value) || 0), 0);

    useEffect(() => {
        if (!revenueEdited && salesTotal > 0) {
            setFormData((prev) => ({ ...prev, revenue: salesTotal }));
        }
    }, [salesTotal, revenueEdited]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleCloseBatch(
            formData,
            queryClient,
            setLoading,
            () => {
                onClose();
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Close Batch #{batch.batch_id}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-yellow-800">
                        Are you sure you want to close this batch? This action will calculate final metrics.
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Closing Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                required
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all pl-10"
                            />
                            <Calendar size={18} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Revenue</label>
                            <input
                                type="number"
                                value={formData.revenue}
                                onChange={(e) => { setRevenueEdited(true); setFormData({ ...formData, revenue: Number(e.target.value) }); }}
                                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            />
                            {salesTotal > 0 && (
                                <p className="text-xs text-gray-500">Auto-filled from {batchSales.length} recorded sale(s) (₹{salesTotal.toLocaleString('en-IN')}). You can adjust if needed — the server recomputes it from sales on close.</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Gross Profit</label>
                            <input
                                type="number"
                                value={formData.gross_profit}
                                onChange={(e) => setFormData({ ...formData, gross_profit: Number(e.target.value) })}
                                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex justify-center items-center"
                        >
                            {loading ? "Closing..." : "Confirm Close"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};