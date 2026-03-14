import { BirdCountHistoryPayload } from "@/app/types/interfaces";
import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";

interface AddBirdCountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: BirdCountHistoryPayload) => void;
    isSubmitting: boolean;
    batchId: number;
}

const AddBirdCountModal: React.FC<AddBirdCountModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    batchId,
}) => {
    // Default state
    const initialFormState: BirdCountHistoryPayload = {
        batch_id: batchId,
        record_date: new Date().toISOString().split('T')[0], // Default to today
        deaths: 0,
        additions: 0,
        notes: "",
    };

    const [formState, setFormState] = useState<BirdCountHistoryPayload>(initialFormState);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormState({
                batch_id: batchId,
                record_date: new Date().toISOString().split('T')[0],
                deaths: 0,
                additions: 0,
                notes: "",
            });
        }
    }, [isOpen, batchId]);

    const handleSubmit = () => {
        if (!formState.record_date) {
            alert("Please select a date");
            return;
        }

        const payload: BirdCountHistoryPayload = {
            batch_id: formState.batch_id,
            record_date: formState.record_date,
            deaths: Number(formState.deaths),
            additions: Number(formState.additions),
            notes: formState.notes || "",
        };

        onSubmit(payload);
    };

    if (!isOpen) return null;

    // Helper components for consistent styling (Copied from reference)
    const Label = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
        <label className="block text-sm font-medium text-gray-800 mb-1.5">
            {children} {required && <span className="text-blue-600">*</span>}
        </label>
    );

    const inputBaseClasses = "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all";
    const readOnlyBaseClasses = "w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 font-medium cursor-not-allowed select-none";

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-100 transition-transform duration-300 transform scale-100">
                
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 p-6 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Add Bird Count Record</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Enter daily mortality or additions for batch #{batchId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-800 hover:bg-gray-100 p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Batch ID (Read Only) */}
                    <div>
                        <Label>Batch ID</Label>
                        <input type="text" value={`#${formState.batch_id}`} readOnly className={readOnlyBaseClasses} />
                    </div>

                    {/* Record Date */}
                    <div>
                        <Label required>Record Date</Label>
                        <input
                            type="date"
                            value={formState.record_date}
                            onChange={(e) => setFormState({ ...formState, record_date: e.target.value })}
                            className={inputBaseClasses}
                        />
                    </div>

                    {/* Divider */}
                    <div className="col-span-full h-px bg-gray-100 my-2"></div>

                    {/* Deaths */}
                    <div>
                        <Label required>Deaths</Label>
                        <input
                            type="number"
                            value={formState.deaths}
                            onChange={(e) => setFormState({ ...formState, deaths: Number(e.target.value) })}
                            className={inputBaseClasses}
                            placeholder="0"
                            min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Number of birds died</p>
                    </div>

                    {/* Additions */}
                    <div>
                        <Label required>Additions</Label>
                        <input
                            type="number"
                            value={formState.additions}
                            onChange={(e) => setFormState({ ...formState, additions: Number(e.target.value) })}
                            className={inputBaseClasses}
                            placeholder="0"
                            min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">New birds added (if any)</p>
                    </div>

                    {/* Notes */}
                    <div className="col-span-full">
                        <Label>Notes</Label>
                        <textarea
                            value={formState.notes}
                            onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                            className={`${inputBaseClasses} min-h-[100px] resize-y`}
                            placeholder="Enter any observations, reasons for mortality, etc."
                        />
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/80 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-200 font-medium text-sm shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 transition-all duration-200 font-medium text-sm shadow-md ${
                            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                    >
                        {isSubmitting ? (
                            <span className="animate-spin h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full"></span>
                        ) : (
                            <Save size={18} />
                        )}
                        {isSubmitting ? "Saving..." : "Save Record"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddBirdCountModal;