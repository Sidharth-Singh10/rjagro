import React, { useState } from 'react';
import { XCircle, AlertCircle } from 'lucide-react';
import { BatchRequirement } from '@/app/types/interfaces';

interface RejectModalProps {
    requirement: BatchRequirement;
    onClose: () => void;
    onConfirm: (id: number) => Promise<void>;
}

export const RejectRequirementModal: React.FC<RejectModalProps> = ({ requirement, onClose, onConfirm }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        await onConfirm(requirement.requirement_id);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Reject Requirement</h3>
                            <p className="text-sm text-gray-500">Requirement #{requirement.requirement_id}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-medium text-red-800">Confirm Rejection</h4>
                            <p className="text-sm text-red-700 mt-1">This action cannot be undone.</p>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Item:</span><span className="font-medium text-gray-900">{requirement.item_code} - {requirement.item_name}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Quantity:</span><span className="font-medium text-gray-900">{requirement.quantity} {requirement.item_unit}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Farmer:</span><span className="font-medium text-gray-900">{requirement.farmer_name}</span></div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleConfirm} disabled={isSubmitting} className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                        {isSubmitting ? 'Processing...' : <><XCircle size={16} /> Reject Request</>}
                    </button>
                </div>
            </div>
        </div>
    );
};