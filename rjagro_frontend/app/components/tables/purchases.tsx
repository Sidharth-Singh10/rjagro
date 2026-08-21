'use client'

import React, { useState } from 'react';
import { Filter, ChevronLeft, ChevronRight, Plus, X, Save, ArrowUp, ArrowDown, ArrowUpDown, Trash2 } from 'lucide-react';
import { Item, Purchase, Supplier } from '@/app/types/interfaces';
import { useQueryClient } from '@tanstack/react-query';
import { handleAddPurchaseOrder, handleDeletePurchase, handleDeletePurchaseOrder } from '@/app/api/purchases';
import { TableConfigs, useTableSorting } from '@/app/hooks/sorting';
import TableActionsDropdown from '../utils/table_actions';

interface OrderItemRow {
    id: number;
    item_code: string;
    item_name: string;
    cost_per_unit: number | '';
    quantity: number | '';
}

interface PurchasesTableProps {
    purchases: Purchase[];
    items: Item[];
    suppliers: Supplier[];
    loading: boolean;
    showAddForm: boolean;
    setShowAddForm: (show: boolean) => void;
    createdBy: number;
}

const PurchasesTable: React.FC<PurchasesTableProps> = ({
    purchases,
    items,
    suppliers,
    loading,
    showAddForm,
    setShowAddForm,
    createdBy,
}) => {
    const queryClient = useQueryClient();
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    // Multi-item order form state
    const [supplierId, setSupplierId] = useState<number | ''>('');
    const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [paymentType, setPaymentType] = useState('');
    const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);

    const resetForm = () => {
        setSupplierId('');
        setPurchaseDate(new Date().toISOString().slice(0, 10));
        setPaymentType('');
        setOrderItems([]);
    };

    const handleOpenForm = () => {
        resetForm();
        setShowAddForm(true);
    };

    const handleCloseForm = () => {
        setShowAddForm(false);
        resetForm();
    };

    const addItemRow = () => {
        setOrderItems(prev => [
            ...prev,
            { id: Date.now(), item_code: '', item_name: '', cost_per_unit: '', quantity: '' },
        ]);
    };

    const removeItemRow = (id: number) => {
        setOrderItems(prev => prev.filter(row => row.id !== id));
    };

    const handleItemCodeSelect = (id: number, itemCode: string) => {
        const selectedItem = items.find(item => item.item_code === itemCode);
        setOrderItems(prev => prev.map(row =>
            row.id === id
                ? { ...row, item_code: itemCode, item_name: selectedItem?.item_name ?? '' }
                : row
        ));
    };

    const updateItemRow = (id: number, field: 'cost_per_unit' | 'quantity', value: string) => {
        const parsed = value === '' ? '' : parseFloat(value);
        setOrderItems(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: parsed } : row
        ));
    };

    const supplierName = () => {
        const s = suppliers.find(s => s.supplier_id === supplierId);
        return s?.name ?? '';
    };

    const orderTotal = orderItems.reduce((sum, row) => {
        const c = Number(row.cost_per_unit) || 0;
        const q = Number(row.quantity) || 0;
        return sum + c * q;
    }, 0);

    const handleSubmit = async () => {
        if (!supplierId || !paymentType || orderItems.length === 0) {
            alert('Please select supplier, payment method, and add at least one item');
            return;
        }
        const validItems = orderItems.filter(
            row => row.item_code && Number(row.cost_per_unit) > 0 && Number(row.quantity) > 0
        );
        if (validItems.length === 0) {
            alert('Please complete at least one item row (item, cost per unit, quantity)');
            return;
        }

        await handleAddPurchaseOrder(
            {
                supplier_id: Number(supplierId),
                supplier: supplierName(),
                purchase_date: purchaseDate,
                payment_type: paymentType,
                created_by: createdBy,
                items: validItems.map(row => ({
                    item_code: row.item_code,
                    cost_per_unit: Number(row.cost_per_unit),
                    quantity: Number(row.quantity),
                })),
            },
            queryClient,
            () => {},
            () => {
                setShowAddForm(false);
                resetForm();
            }
        );
    };

    const { sortedData, requestSort, getSortIcon } = useTableSorting(
        purchases,
        { key: 'purchase_date', direction: 'desc' },
        TableConfigs.purchases.getValueFn
    );

    const getSupplierName = (supplierId: number) => {
        const supplier = suppliers.find(s => s.supplier_id === supplierId);
        return supplier?.name || 'Unknown';
    };

    const SortableHeader: React.FC<{
        columnKey: string;
        children: React.ReactNode;
        className?: string;
    }> = ({ columnKey, children, className = "" }) => {
        const IconComponent = getSortIcon(columnKey) === 'ArrowUp' ? ArrowUp :
            getSortIcon(columnKey) === 'ArrowDown' ? ArrowDown : ArrowUpDown;

        return (
            <th
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
                onClick={() => requestSort(columnKey)}
            >
                <div className="flex items-center justify-between group">
                    <span>{children}</span>
                    <IconComponent size={14} className="ml-1 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
            </th>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Purchases</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleOpenForm}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Plus size={18} />
                        Add Purchase
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </div>

            {/* Add Purchase Order Form */}
            {showAddForm && (
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Add New Purchase Order</h3>
                        <button
                            onClick={handleCloseForm}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Header fields */}
                    <div className="grid grid-cols-1 text-black md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Supplier *
                            </label>
                            <select
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select Supplier</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Purchase Date *
                            </label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Method *
                            </label>
                            <select
                                value={paymentType}
                                onChange={(e) => setPaymentType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select Payment Method</option>
                                <option value="Cash">Cash</option>
                                <option value="Payable">Payable</option>
                            </select>
                        </div>
                    </div>

                    {/* Item lines */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-gray-700">Items</h4>
                            <button
                                onClick={addItemRow}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>

                        {orderItems.length === 0 ? (
                            <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                                No items added yet. Click &quot;Add Item&quot; to add line items.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                <div className="grid grid-cols-12 gap-2 px-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="col-span-4">Item</div>
                                    <div className="col-span-3">Cost Per Unit</div>
                                    <div className="col-span-2">Quantity</div>
                                    <div className="col-span-2">Total</div>
                                    <div className="col-span-1"></div>
                                </div>
                                {orderItems.map((row) => (
                                    <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-4">
                                            <select
                                                value={row.item_code}
                                                onChange={(e) => handleItemCodeSelect(row.id, e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            >
                                                <option value="">Select Item</option>
                                                {items
                                                    .filter((item) => item.item_code !== "DC101")
                                                    .map((item) => (
                                                        <option key={item.item_code} value={item.item_code}>
                                                            {item.item_code} - {item.item_name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                        <div className="col-span-3">
                                            <input
                                                type="number"
                                                value={row.cost_per_unit}
                                                onChange={(e) => updateItemRow(row.id, 'cost_per_unit', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                placeholder="0.00"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                value={row.quantity}
                                                onChange={(e) => updateItemRow(row.id, 'quantity', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="col-span-2 text-sm font-medium text-gray-800">
                                            ₹{((Number(row.cost_per_unit) || 0) * (Number(row.quantity) || 0)).toFixed(2)}
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <button
                                                onClick={() => removeItemRow(row.id)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-700">
                            Order Total: <span className="font-semibold text-gray-900">₹{orderTotal.toFixed(2)}</span>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!supplierId || !paymentType || orderItems.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            Save Purchase Order
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Order ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Purchase ID
                            </th>
                            <SortableHeader columnKey="item_code">Item Code</SortableHeader>
                            <SortableHeader columnKey="item_name">Item Name</SortableHeader>
                            <SortableHeader columnKey="cost_per_unit">Cost Per Unit</SortableHeader>
                            <SortableHeader columnKey="total_cost">Total Cost</SortableHeader>
                            <SortableHeader columnKey="quantity">Quantity</SortableHeader>
                            <SortableHeader columnKey="purchase_date">Purchase Date</SortableHeader>
                            <SortableHeader columnKey="supplier">Supplier</SortableHeader>
                            <SortableHeader columnKey="payment_method">Payment Type</SortableHeader>
                            <SortableHeader columnKey="created_by">Created By</SortableHeader>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                                    No purchases found
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((purchase) => (
                                <tr key={purchase.purchase_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {purchase.purchase_order_id ? `#${purchase.purchase_order_id}` : '-'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {purchase.purchase_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {purchase.item_code}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {purchase.item_name}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {purchase.cost_per_unit}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {purchase.total_cost}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {purchase.quantity}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {purchase.purchase_date}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {getSupplierName(purchase.supplier_id)}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {purchase.payment_type || 'N/A'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {purchase.created_by}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 relative">
                                        <TableActionsDropdown
                                            rowId={purchase.purchase_id}
                                            openMenuId={openMenuId}
                                            onMenuToggle={(id) => setOpenMenuId(typeof id === 'number' ? id : null)}
                                            actions={[
                                                {
                                                    label: 'Delete',
                                                    icon: <Trash2 size={14} />,
                                                    variant: 'danger',
                                                    onClick: () => {
                                                        if (purchase.purchase_order_id) {
                                                            const confirmed = window.confirm(`Delete purchase order #${purchase.purchase_order_id} (all items)?`);
                                                            if (!confirmed) return;
                                                            handleDeletePurchaseOrder(purchase.purchase_order_id, queryClient);
                                                        } else {
                                                            const confirmed = window.confirm(`Delete purchase #${purchase.purchase_id}?`);
                                                            if (!confirmed) return;
                                                            handleDeletePurchase(purchase.purchase_id, queryClient);
                                                        }
                                                    }
                                                }
                                            ]}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                    Showing {purchases.length} of {purchases.length} results
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
};

export default PurchasesTable;
