import React from 'react';
import { Edit, Filter, ChevronLeft, ChevronRight, Plus, X, Save } from 'lucide-react';
import { Item, NewStockReceipt, Purchase, StockReceipt } from '@/app/types/interfaces';

interface StockReceiptsTableProps {
    stockReceipts: StockReceipt[];
    items: Item[];
    purchases: Purchase[];
    loading: boolean;
    showAddForm: boolean;
    newStockReceipt: NewStockReceipt;
    setShowAddForm: (show: boolean) => void;
    setNewStockReceipt: React.Dispatch<React.SetStateAction<NewStockReceipt>>;
    handleItemCodeSelect: (itemCode: string) => void;
    handlePurchaseSelect: (purchaseId: string) => void;
    handleAddStockReceipt: () => void;
}

const StockReceiptsTable: React.FC<StockReceiptsTableProps> = ({
    stockReceipts,
    items,
    purchases,
    loading,
    showAddForm,
    newStockReceipt,
    setShowAddForm,
    setNewStockReceipt,
    handleItemCodeSelect,
    handlePurchaseSelect,
    handleAddStockReceipt,
}) => (
    <div className="bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Stock Receipts</h2>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Plus size={18} />
                    Add Stock Receipt
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Filter size={18} />
                    Filters
                </button>
            </div>
        </div>

        {/* Add Stock Receipt Form */}
        {showAddForm && (
            <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-800">Add New Stock Receipt</h3>
                    <button
                        onClick={() => setShowAddForm(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 text-black md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Purchase ID (Optional)
                        </label>
                        <select
                            value={newStockReceipt.purchase_id}
                            onChange={(e) => handlePurchaseSelect(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            <option value="">Select Purchase (Optional)</option>
                            {purchases.map((purchase) => (
                                <option key={purchase.purchase_id} value={purchase.purchase_id}>
                                    #{purchase.purchase_id} - {purchase.item_code}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Code *
                        </label>
                        <select
                            value={newStockReceipt.item_code}
                            onChange={(e) => handleItemCodeSelect(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            <option value="">Select Item Code</option>
                            {items.map((item) => (
                                <option key={item.item_code} value={item.item_code}>
                                    {item.item_code} - {item.item_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name
                        </label>
                        <input
                            type="text"
                            value={newStockReceipt.item_name}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                            placeholder="Auto-filled"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Received Quantity *
                        </label>
                        <input
                            type="number"
                            value={newStockReceipt.received_qty}
                            onChange={(e) => setNewStockReceipt(prev => ({ 
                                ...prev, 
                                received_qty: e.target.value ? parseFloat(e.target.value) : '',
                                remaining_qty: e.target.value ? parseFloat(e.target.value) : ''
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="0.00"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Remaining Quantity
                        </label>
                        <input
                            type="number"
                            value={newStockReceipt.remaining_qty}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                            placeholder="Auto-filled"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Cost *
                        </label>
                        <input
                            type="number"
                            value={newStockReceipt.unit_cost}
                            onChange={(e) => setNewStockReceipt(prev => ({ ...prev, unit_cost: e.target.value ? parseFloat(e.target.value) : '' }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="0.00"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Received Date *
                        </label>
                        <input
                            type="date"
                            value={newStockReceipt.received_date}
                            onChange={(e) => setNewStockReceipt(prev => ({ ...prev, received_date: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier (Optional)
                        </label>
                        <input
                            type="text"
                            value={newStockReceipt.supplier}
                            onChange={(e) => setNewStockReceipt(prev => ({ ...prev, supplier: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Supplier name"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={handleAddStockReceipt}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Save size={18} />
                            Save Receipt
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lot ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Purchase ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Received Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Remaining Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit Cost
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Received Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supplier
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                        <tr>
                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                Loading...
                            </td>
                        </tr>
                    ) : stockReceipts.length === 0 ? (
                        <tr>
                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                No stock receipts found
                            </td>
                        </tr>
                    ) : (
                        stockReceipts.map((receipt) => (
                            <tr key={receipt.lot_id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {receipt.lot_id}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {receipt.purchase_id || '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {receipt.item_code}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {receipt.item_name || '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {receipt.received_qty}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className={`${Number(receipt.remaining_qty) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {receipt.remaining_qty}
                                    </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {receipt.unit_cost}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {receipt.received_date}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {receipt.supplier || '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <button className="text-blue-600 hover:text-blue-800">
                                        <Edit size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-500">
                Showing {stockReceipts.length} of {stockReceipts.length} results
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

export default StockReceiptsTable;