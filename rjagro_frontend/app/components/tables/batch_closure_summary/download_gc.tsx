import React, { useState, useEffect } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { downloadGrowingChargesPdf } from '@/app/api/batches';
import { GrowingChargesInputs } from '@/app/types/interfaces';

interface DownloadGCModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchId: number;
}

const DownloadGCModal: React.FC<DownloadGCModalProps> = ({ isOpen, onClose, batchId }) => {
    const [loading, setLoading] = useState(false);

    // Initialize with default values
    const [formData, setFormData] = useState<Omit<GrowingChargesInputs, 'batch_id'>>({
        bird_shortage: 0,
        other_deduction: 0,
        bird_shortage_cost: 0,
        fcr_incentive: 0,
        market_incentive: 0,
        tds_per: 0
    });

    // Reset form when modal opens or batchId changes
    useEffect(() => {
        if (isOpen) {
            setFormData({
                bird_shortage: 0,
                other_deduction: 0,
                bird_shortage_cost: 0,
                fcr_incentive: 0,
                market_incentive: 0,
                tds_per: 0
            });
        }
    }, [isOpen, batchId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await downloadGrowingChargesPdf({
            batch_id: batchId,
            ...formData
        }, setLoading);

        if (success) {
            onClose();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value === '' ? 0 : parseFloat(value)
        }));
    };

    // Helper for input fields to keep JSX clean
    const renderInput = (label: string, name: keyof typeof formData, placeholder: string = "0.00") => (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {label}
            </label>
            <div className="relative">
                <input
                    type="number"
                    name={name}
                    step="0.01"
                    value={formData[name] || ''}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop with Blur */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in slide-in-from-bottom-4 duration-300">

                {/* Header with Gradient */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-100">
                                <FileText className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    Growing Charges
                                </h3>
                                <p className="text-sm text-blue-600 font-medium mt-1">
                                    Batch #{batchId}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        {/* Section 1: Shortage & Cost */}
                        <div className="grid grid-cols-2 gap-5">
                            {renderInput("Bird Shortage", "bird_shortage")}
                            {renderInput("Shortage Cost", "bird_shortage_cost")}
                        </div>

                        {/* Section 2: Incentives */}
                        <div className="grid grid-cols-2 gap-5">
                            {renderInput("FCR Incentive", "fcr_incentive")}
                            {renderInput("Market Incentive", "market_incentive")}
                        </div>

                        {/* Section 3: Deductions & Tax */}
                        <div className="grid grid-cols-2 gap-5">
                            {renderInput("Other Deduction", "other_deduction")}
                            {renderInput("TDS Percentage (%)", "tds_per")}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating...
                                </span>
                            ) : (
                                <>
                                    <Download size={18} />
                                    Download PDF
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DownloadGCModal;