import { StockReturnPayload, Item, ReturnableAllocationLine } from "@/app/types/interfaces";
import FieldLabel from '@/app/components/ui/field_label';
import { fetchReturnableAllocationLines } from "@/app/api/stock_returns";
import { Save, X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const inputBaseClasses = "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-600 outline-none transition-all";
const readOnlyBaseClasses = "w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 font-medium cursor-not-allowed select-none";

interface AddStockReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: StockReturnPayload) => void;
    isSubmitting: boolean;
    batchId: number;
    items: Item[];
}

const formatQty = (value: number | string) => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const AddStockReturnModal: React.FC<AddStockReturnModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    batchId,
    items,
}) => {
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
    const [returnableLines, setReturnableLines] = useState<ReturnableAllocationLine[]>([]);
    const [fetchingLines, setFetchingLines] = useState(false);

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
            setReturnableLines([]);
            setFetchingLines(false);
        }
    }, [isOpen, batchId]);

    useEffect(() => {
        let cancelled = false;

        const fetchLines = async () => {
            if (!formState.batch_id || !selectedItemCode) {
                setReturnableLines([]);
                return;
            }
            setFetchingLines(true);
            try {
                const lines = await fetchReturnableAllocationLines(formState.batch_id, selectedItemCode);
                if (cancelled) return;

                if (lines.length === 0) {
                    toast.warning("This item has no returnable stock left in this batch.");
                    setReturnableLines([]);
                    setFormState(prev => ({ ...prev, allocation_line_id: 0, unit_cost: 0, return_value: 0 }));
                    return;
                }

                // Default to the oldest line that still has stock to return.
                const first = lines[0];
                const unitCost = Number(first.unit_cost);
                setReturnableLines(lines);
                setFormState(prev => ({
                    ...prev,
                    allocation_line_id: first.allocation_line_id,
                    unit_cost: unitCost,
                    return_value: Number((prev.return_qty * unitCost).toFixed(2)),
                }));
            } catch (error) {
                if (cancelled) return;
                toast.error("Failed to fetch returnable stock for this item");
                console.error(error);
                setReturnableLines([]);
                setFormState(prev => ({ ...prev, allocation_line_id: 0, unit_cost: 0, return_value: 0 }));
            } finally {
                if (!cancelled) setFetchingLines(false);
            }
        };

        fetchLines();
        return () => { cancelled = true; };
    }, [formState.batch_id, selectedItemCode]);

    const selectedLine = returnableLines.find(
        line => line.allocation_line_id === formState.allocation_line_id
    );
    const maxReturnable = selectedLine ? Number(selectedLine.returnable_qty) : 0;
    const qtyError =
        formState.return_qty > 0 && maxReturnable > 0 && formState.return_qty > maxReturnable;

    // Handler for Allocation Line Change (recalculates value with that lot's cost)
    const handleLineChange = (allocationLineId: number) => {
        const line = returnableLines.find(l => l.allocation_line_id === allocationLineId);
        if (!line) return;
        const unitCost = Number(line.unit_cost);
        setFormState(prev => ({
            ...prev,
            allocation_line_id: allocationLineId,
            unit_cost: unitCost,
            return_value: Number((prev.return_qty * unitCost).toFixed(2)),
        }));
    };

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
        if (formState.return_qty <= 0) {
            toast.error("Return quantity must be greater than zero");
            return;
        }
        if (maxReturnable > 0 && formState.return_qty > maxReturnable) {
            toast.error(`Return quantity cannot exceed the returnable quantity (${formatQty(maxReturnable)})`);
            return;
        }

        onSubmit(formState);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-100 transition-transform duration-300 transform scale-100">

                {/* Modal Header */}
                <div className="bg-gray-50 border-b border-gray-100 p-6 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Add Stock Return</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Process a return for Batch #{batchId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-800 hover:bg-gray-100 p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Batch ID (Read Only) */}
                    <div>
                        <FieldLabel>Batch ID</FieldLabel>
                        <input type="text" value={`#${formState.batch_id}`} readOnly className={readOnlyBaseClasses} />
                    </div>

                    {/* Return Date */}
                    <div>
                        <FieldLabel required>Return Date</FieldLabel>
                        <input
                            type="date"
                            value={formState.return_date}
                            onChange={(e) => setFormState({ ...formState, return_date: e.target.value })}
                            className={inputBaseClasses}
                        />
                    </div>

                    {/* ITEM SELECTION */}
                    <div className="col-span-full">
                        <FieldLabel required>Item to Return</FieldLabel>
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
                        {fetchingLines && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Loader2 size={14} className="animate-spin text-green-600" />
                                Looking up returnable stock...
                            </p>
                        )}
                    </div>

                    {/* ALLOCATION LINE SELECTION */}
                    {returnableLines.length > 1 && (
                        <div className="col-span-full">
                            <FieldLabel required>Allocation Line / Lot</FieldLabel>
                            <select
                                value={formState.allocation_line_id}
                                onChange={(e) => handleLineChange(Number(e.target.value))}
                                className={inputBaseClasses}
                            >
                                {returnableLines.map((line) => (
                                    <option key={line.allocation_line_id} value={line.allocation_line_id}>
                                        Line #{line.allocation_line_id} · Lot #{line.lot_id} · ₹{formatQty(line.unit_cost)}/unit · max {formatQty(line.returnable_qty)}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">
                                Returns are restored to the lot they were allocated from.
                            </p>
                        </div>
                    )}

                    {returnableLines.length === 1 && selectedLine && (
                        <div className="col-span-full">
                            <p className="text-xs text-green-600 flex items-center gap-1">
                                ✓ Line #{selectedLine.allocation_line_id} · Lot #{selectedLine.lot_id} · max returnable {formatQty(selectedLine.returnable_qty)}
                            </p>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="col-span-full h-px bg-gray-100 my-2"></div>

                    {/* Unit Cost (Auto-fetched) */}
                    <div>
                        <FieldLabel>Unit Cost</FieldLabel>
                        <div className="relative">
                            <input
                                type="number"
                                value={formState.unit_cost || ''}
                                readOnly
                                className={readOnlyBaseClasses}
                                placeholder={fetchingLines ? "Fetching..." : "Auto-fetched"}
                            />
                            {fetchingLines && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 size={16} className="animate-spin text-green-600" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Cost fetched from the allocation line</p>
                    </div>

                    {/* Return Quantity */}
                    <div>
                        <FieldLabel required>Return Quantity</FieldLabel>
                        <input
                            type="number"
                            value={formState.return_qty || ''}
                            onChange={(e) => handleQuantityChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            className={`${inputBaseClasses} ${qtyError ? 'border-red-400 focus:border-red-500 focus:ring-red-400/30' : ''}`}
                            placeholder="0.00"
                            min="0.01"
                            max={maxReturnable || undefined}
                            step="0.01"
                            disabled={!formState.allocation_line_id}
                        />
                        {selectedLine && (
                            <p className={`text-xs mt-1 ${qtyError ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                Max returnable: {formatQty(selectedLine.returnable_qty)} (allocated {formatQty(selectedLine.allocated_qty)}, already returned {formatQty(selectedLine.returned_qty)})
                            </p>
                        )}
                    </div>

                    {/* Return Value (Calculated) */}
                    <div className="col-span-full">
                        <FieldLabel>Total Return Value</FieldLabel>
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
                        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all duration-200 font-medium text-sm shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !formState.allocation_line_id || !formState.return_qty || qtyError}
                        className={`flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-500/30 transition-all duration-200 font-medium text-sm shadow-md ${(isSubmitting || !formState.allocation_line_id || qtyError) ? "opacity-70 cursor-not-allowed" : ""
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
