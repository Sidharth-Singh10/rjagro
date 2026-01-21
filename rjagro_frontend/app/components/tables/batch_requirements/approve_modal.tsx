import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { BatchRequirement } from '@/app/types/interfaces';

interface ApproveModalProps {
    requirement: BatchRequirement;
    onClose: () => void;
    onConfirm: (req: BatchRequirement, qty: number) => Promise<void>;
}

export const ApproveRequirementModal: React.FC<ApproveModalProps> = ({ requirement, onClose, onConfirm }) => {
    const [allocatedQty, setAllocatedQty] = useState<string>(requirement.quantity.toString());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        await onConfirm(requirement, parseInt(allocatedQty));
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Approve Requirement</h3>
                            <p className="text-sm text-gray-500">Requirement #{requirement.requirement_id}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Item:</span>
                            <span className="font-medium text-gray-900">{requirement.item_code} - {requirement.item_name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Requested:</span>
                            <span className="font-medium text-gray-900">{requirement.quantity} {requirement.item_unit}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Allocated Quantity *</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={allocatedQty}
                                onChange={(e) => setAllocatedQty(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                min="0"
                                max={requirement.quantity}
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">{requirement.item_unit}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!allocatedQty || parseInt(allocatedQty) <= 0 || isSubmitting}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? 'Processing...' : <><Check size={16} /> Approve Request</>}
                    </button>
                </div>
            </div>
        </div>
    );
};