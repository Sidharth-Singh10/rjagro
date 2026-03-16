import { StockReturnPayload, Item } from "@/app/types/interfaces";
import { fetchStockReturnUnitCost } from "@/app/api/stock_returns"; 
import { Save, X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const Label = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
    <label className="block text-sm font-medium text-gray-800 mb-1.5">
        {children} {required && <span className="text-blue-600">*</span>}
    </label>
);

const inputBaseClasses = "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all";
const readOnlyBaseClasses = "w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 font-medium cursor-not-allowed select-none"; 

interface AddStockReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: StockReturnPayload) => void;
    isSubmitting: boolean;
    batchId: number;
    items: Item[]; 
}

const AddStockReturnModal: React.FC<AddStockReturnModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    batchId,
    items,
}) => {
    // Default state
    const initialFormState: StockReturnPayload = {
        batch_id: batchId,
        allocation_line_id: 0,
        return_date: new Date().toISOString().split('T')[0],
        return_qty: 0,
        unit_cost: 0,
        return_value: 0,
    };

    const [formState, setFormState] = useState<StockReturnPayload>(initialFormState);
    const [selectedItemCode, setSelectedItemCode] = useState<string>('');
    const [fetchingCost, setFetchingCost] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormState({
                batch_id: batchId,
                allocation_line_id: 0,
                return_date: new Date().toISOString().split('T')[0],
                return_qty: 0,
                unit_cost: 0,
                return_value: 0,
            });
            setSelectedItemCode('');
            setFetchingCost(false);
        }
    }, [isOpen, batchId]);

    useEffect(() => {
        const fetchCostData = async () => {
            if (formState.batch_id && selectedItemCode) {
                setFetchingCost(true);
                try {
                    const data = await fetchStockReturnUnitCost(formState.batch_id, selectedItemCode);

                    const unitCost = Number(data.unit_cost);
                    setFormState(prev => ({
                        ...prev,
                        allocation_line_id: data.allocation_line_id,
                        unit_cost: unitCost,
                        return_value: Number((prev.return_qty * unitCost).toFixed(2))
                    }));
                } catch (error) {
                    toast.error("Failed to fetch cost details for this item");
                    console.error(error);
                    // Reset cost related fields on error
                    setFormState(prev => ({ ...prev, allocation_line_id: 0, unit_cost: 0, return_value: 0 }));
                } finally {
                    setFetchingCost(false);
                }
            }
        };

        fetchCostData();
    }, [formState.batch_id, selectedItemCode]);

    // Handler for Quantity Change (Recalculates Value)
    const handleQuantityChange = (qty: number) => {
        setFormState(prev => ({
            ...prev,
            return_qty: qty,
            return_value: Number((qty * prev.unit_cost).toFixed(2))
        }));
    };

    const handleSubmit = () => {
        if (!formState.return_date) {
            toast.error("Please select a date");
            return;
        }
        if (!formState.allocation_line_id) {
            toast.error("Please select a valid item linked to this batch");
            return;
        }

        onSubmit(formState);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-100 transition-transform duration-300 transform scale-100">

                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 p-6 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Add Stock Return</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Process a return for Batch #{batchId}</p>
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

                    {/* Return Date */}
                    <div>
                        <Label required>Return Date</Label>
                        <input
                            type="date"
                            value={formState.return_date}
                            onChange={(e) => setFormState({ ...formState, return_date: e.target.value })}
                            className={inputBaseClasses}
                        />
                    </div>

                    {/* ITEM SELECTION (Replaces Manual Allocation) */}
                    <div className="col-span-full">
                        <Label required>Item to Return</Label>
                        <select
                            value={selectedItemCode}
                            onChange={(e) => setSelectedItemCode(e.target.value)}
                            className={inputBaseClasses}
                        >
                            <option value="">-- Select Item --</option>
                            {items.map((item) => (
                                <option key={item.item_code} value={item.item_code}>
                                    {item.item_code} - {item.item_name}
                                </option>
                            ))}
                        </select>
                        {formState.allocation_line_id > 0 && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                ✓ Linked to Allocation ID: {formState.allocation_line_id}
                            </p>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="col-span-full h-px bg-gray-100 my-2"></div>

                    {/* Unit Cost (Auto-fetched) */}
                    <div>
                        <Label>Unit Cost</Label>
                        <div className="relative">
                            <input
                                type="number"
                                value={formState.unit_cost || ''}
                                readOnly
                                className={readOnlyBaseClasses}
                                placeholder={fetchingCost ? "Fetching..." : "Auto-fetched"}
                            />
                            {fetchingCost && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 size={16} className="animate-spin text-blue-500" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Cost fetched from batch allocation</p>
                    </div>

                    {/* Return Quantity */}
                    <div>
                        <Label required>Return Quantity</Label>
                        <input
                            type="number"
                            value={formState.return_qty || ''}
                            onChange={(e) => handleQuantityChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            className={inputBaseClasses}
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                            disabled={!formState.allocation_line_id} // Disable until item is valid
                        />
                    </div>

                    {/* Return Value (Calculated) */}
                    <div className="col-span-full">
                        <Label>Total Return Value</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                            <input
                                type="number"
                                value={formState.return_value?.toFixed(2)}
                                readOnly
                                className={`${readOnlyBaseClasses} pl-8 font-bold text-gray-800`}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Calculated as Quantity × Unit Cost</p>
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
                        disabled={isSubmitting || !formState.allocation_line_id || !formState.return_qty}
                        className={`flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 transition-all duration-200 font-medium text-sm shadow-md ${(isSubmitting || !formState.allocation_line_id) ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                    >
                        {isSubmitting ? (
                            <span className="animate-spin h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full"></span>
                        ) : (
                            <Save size={18} />
                        )}
                        {isSubmitting ? "Processing..." : "Process Return"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddStockReturnModal;