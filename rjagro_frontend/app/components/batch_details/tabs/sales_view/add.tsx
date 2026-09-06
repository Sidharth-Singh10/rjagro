import { AppTrader, BatchSalePayload, Trader } from "@/app/types/interfaces";
import FieldLabel from '@/app/components/ui/field_label';
import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";

const inputBaseClasses = "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-600 outline-none transition-all";

const readOnlyBaseClasses = "w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 font-medium cursor-not-allowed select-none";

interface BatchSaleFormState extends Omit<BatchSalePayload, 'trader_id' | 'app_trader_id' | 'avg_weight' | 'rate' | 'quantity'> {
    trader_id: number | string;
    app_trader_id: number | '';
    avg_weight: number | string;
    rate: number | string;
    quantity: number | string;
    value: number;
    trader_name: string;
    item_name: string;
}

interface AddBatchSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: BatchSalePayload) => Promise<void>;
    isSubmitting: boolean;
    batchId: number;
    traders: Trader[];
    appTraders: AppTrader[];
}

const AddBatchSaleModal: React.FC<AddBatchSaleModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    batchId,
    traders,
    appTraders,
}) => {
    const initialFormState: BatchSaleFormState = {
        batch_id: batchId,
        trader_id: "",
        app_trader_id: "",
        trader_name: "",
        item_code: "DC101",
        item_name: "DESI CHICKEN",
        avg_weight: "",
        rate: "",
        quantity: "",
        value: 0,
        payment_type: "Receivable",
        created_by: 1,
    };

    const [formState, setFormState] = useState(initialFormState);

    useEffect(() => {
        if (isOpen) {
            setFormState({
                batch_id: batchId,
                trader_id: "",
                app_trader_id: "",
                trader_name: "",
                item_code: "DC101",
                item_name: "DESI CHICKEN",
                avg_weight: "",
                rate: "",
                quantity: "",
                value: 0,
                payment_type: "Receivable",
                created_by: 1,
            });
        }
    }, [isOpen, batchId]);

    const calculateValue = (weight: number | string, rate: number | string) => {
        const w = Number(weight) || 0;
        const r = Number(rate) || 0;
        return Math.round(w * r * 100) / 100;
    };

    const handleTraderSelect = (value: string) => {
        if (value.startsWith("app-")) {
            const id = Number(value.slice(4));
            const trader = appTraders.find((t) => t.id === id);
            setFormState((prev) => ({
                ...prev,
                trader_id: "",
                app_trader_id: id,
                trader_name: trader ? trader.name : "",
            }));
        } else if (value.startsWith("legacy-")) {
            const id = Number(value.slice(7));
            const trader = traders.find((t) => t.trader_id === id);
            setFormState((prev) => ({
                ...prev,
                trader_id: id,
                app_trader_id: "",
                trader_name: trader ? trader.name : "",
            }));
        } else {
            setFormState((prev) => ({
                ...prev,
                trader_id: "",
                app_trader_id: "",
                trader_name: "",
            }));
        }
    };

    const resetForm = () => {
        setFormState({
            batch_id: batchId,
            trader_id: "",
            app_trader_id: "",
            trader_name: "",
            item_code: "DC101",
            item_name: "DESI CHICKEN",
            avg_weight: "",
            rate: "",
            quantity: "",
            value: 0,
            payment_type: "Receivable",
            created_by: 1,
        });
    };

    const handleSubmit = async () => {
        const traderSelected = formState.trader_id !== "" || formState.app_trader_id !== "";
        if (!traderSelected || !formState.avg_weight || !formState.rate || !formState.quantity) {
            alert("Please fill in all required fields");
            return;
        }

        const payload: BatchSalePayload = {
            item_code: formState.item_code,
            batch_id: formState.batch_id,
            trader_id: formState.trader_id !== "" ? Number(formState.trader_id) : 0,
            avg_weight: Number(formState.avg_weight),
            rate: Number(formState.rate),
            quantity: Number(formState.quantity),
            payment_type: formState.payment_type,
            created_by: formState.created_by,
            app_trader_id: formState.app_trader_id !== "" ? Number(formState.app_trader_id) : undefined,
        };

        await onSubmit(payload);
        resetForm();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-100 transition-transform duration-300 transform scale-100">
                {/* Modal Header */}
                <div className=" bg-gray-50 border-b border-gray-100  flex items-center justify-between p-5 sticky top-0 z-10 backdrop-blur-md">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Add New Batch Sale</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Enter sales details for batch #{batchId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-800 hover:bg-gray-100 p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Read Only Fields - Using lighter slate background to differentiate */}
                    <div className="lg:col-span-1">
                        <FieldLabel>Item Code</FieldLabel>
                        <input type="text" value={formState.item_code} readOnly className={readOnlyBaseClasses} />
                    </div>
                    <div className="lg:col-span-2">
                        <FieldLabel>Item Name</FieldLabel>
                        <input type="text" value={formState.item_name} readOnly className={readOnlyBaseClasses} />
                    </div>
                    <div className="lg:col-span-1">
                        <FieldLabel>Batch ID</FieldLabel>
                        <input type="text" value={`#${formState.batch_id}`} readOnly className={readOnlyBaseClasses} />
                    </div>

                    {/* Divider for visual separation */}
                    <div className="col-span-full h-px bg-gray-100 my-2"></div>

                    {/* Input Fields */}
                    <div className="md:col-span-2">
                        <FieldLabel required>Trader</FieldLabel>
                        <select
                            value={formState.app_trader_id !== "" ? `app-${formState.app_trader_id}` : formState.trader_id !== "" ? `legacy-${formState.trader_id}` : ""}
                            onChange={(e) => handleTraderSelect(e.target.value)}
                            className={`${inputBaseClasses} bg-white`}
                        >
                            <option value="">Select Trader</option>
                            <optgroup label="App Traders (Mobile)">
                                {appTraders.map((trader) => (
                                    <option
                                        key={`app-${trader.id}`}
                                        value={`app-${trader.id}`}
                                        disabled={!trader.linked_trader_id}
                                    >
                                        {trader.name}{trader.linked_trader_id ? "" : " (no linked trader)"}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Other Traders">
                                {traders.map((trader) => (
                                    <option key={`legacy-${trader.trader_id}`} value={`legacy-${trader.trader_id}`}>
                                        {trader.name}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    <div>
                        <FieldLabel required>Payment Type</FieldLabel>
                        <select
                            value={formState.payment_type}
                            onChange={(e) => setFormState((prev) => ({ ...prev, payment_type: e.target.value }))}
                            className={`${inputBaseClasses} bg-white`}
                        >
                            <option value="Cash">Cash</option>
                            <option value="Receivable">Receivable</option>
                        </select>
                    </div>
                    {/* Empty container to align grid */}
                    <div className="hidden lg:block"></div>


                    <div>
                        <FieldLabel required>Total Weight (kg)</FieldLabel>
                        <input
                            type="number"
                            value={formState.avg_weight}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormState((prev) => ({
                                    ...prev,
                                    avg_weight: val,
                                    value: calculateValue(val, prev.rate),
                                }));
                            }}
                            className={inputBaseClasses}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div>
                        <FieldLabel required>Rate per Unit (₹)</FieldLabel>
                        <input
                            type="number"
                            value={formState.rate}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormState((prev) => ({
                                    ...prev,
                                    rate: val,
                                    value: calculateValue(prev.avg_weight, val),
                                }));
                            }}
                            className={inputBaseClasses}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div>
                        <FieldLabel required>Quantity (Birds)</FieldLabel>
                        <input
                            type="number"
                            value={formState.quantity}
                            onChange={(e) => setFormState((prev) => ({ ...prev, quantity: e.target.value }))}
                            className={inputBaseClasses}
                            placeholder="0"
                            min="0"
                        />
                    </div>

                    {/* Total Value - highlighted with blue accent background */}
                    <div>
                        <FieldLabel>Total Value (₹)</FieldLabel>
                        <div className="relative">
                            <input
                                type="text"
                                value={formState.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                readOnly
                                // Using blue tint background for emphasis
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-lg font-bold text-right cursor-not-allowed"
                            />
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                        </div>
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
                        disabled={isSubmitting}
                        // Changed to blue background
                        className={`flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-500/30 transition-all duration-200 font-medium text-sm shadow-md ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                    >
                        {isSubmitting ? (
                            <span className="animate-spin h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full"></span>
                        ) : (
                            <Save size={18} />
                        )}
                        {isSubmitting ? "Saving..." : "Save Sale"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddBatchSaleModal;