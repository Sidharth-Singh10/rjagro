'use client'

import React, { useState } from 'react';
import { Edit, Filter, ChevronLeft, ChevronRight, Plus, X, Save, ArrowUp, ArrowDown, ArrowUpDown, MoreVertical, Trash2 } from 'lucide-react';
import { calculateTotalCost } from '../../utils/helper';
import { Item, LedgerAccountType, NewPurchase, Purchase, Supplier } from '@/app/types/interfaces';
import { useQueryClient } from '@tanstack/react-query';
import { handleDeletePurchase } from '@/app/api/purchases';
import { INVENTORY_ACCOUNT_MAP, PAYMENT_ACCOUNT_MAP } from '@/app/types/constants';
import { TableConfigs, useTableSorting } from '@/app/hooks/sorting';
import TableActionsDropdown from '../utils/table_actions';

interface ExtendedNewPurchase extends NewPurchase {
    category?: string;
    inventory_account_id?: number;
    payment_account_id?: number;
}

interface PurchasesTableProps {
    purchases: Purchase[];
    items: Item[];
    suppliers: Supplier[];
    loading: boolean;
    showAddForm: boolean;
    newPurchase: ExtendedNewPurchase;
    setShowAddForm: (show: boolean) => void;
    setNewPurchase: React.Dispatch<React.SetStateAction<ExtendedNewPurchase>>;
    handleItemCodeSelect: (itemCode: string) => void;
    handleAddPurchase: () => void;
}

const PurchasesTable: React.FC<PurchasesTableProps> = ({
    purchases,
    items,
    suppliers,
    loading,
    showAddForm,
    newPurchase,
    setShowAddForm,
    setNewPurchase,
    handleItemCodeSelect,
    handleAddPurchase,
}) => {
    const initialFormState: ExtendedNewPurchase = {
        item_code: '',
        item_name: '',
        cost_per_unit: '',
        quantity: '',
        supplier: '',
        payment_type: '',
        payment_account: undefined,
        category: '',
        inventory_account_id: undefined,
        payment_account_id: undefined
    };

    const resetForm = () => {
        setNewPurchase(initialFormState);
    };

    const handleOpenForm = () => {
        resetForm();
        setShowAddForm(true);
    };

    const handleCloseForm = () => {
        setShowAddForm(false);
        resetForm();
    };

    const handleSubmit = () => {
        handleAddPurchase();
        resetForm();
    };

    const handlePaymentMethodChange = (paymentMethod: string) => {
        const paymentAccount = paymentMethod === 'CASH' ? LedgerAccountType.Asset : LedgerAccountType.Liability;
        const paymentAccountId = PAYMENT_ACCOUNT_MAP[paymentMethod as keyof typeof PAYMENT_ACCOUNT_MAP];

        console.log('Payment Method:', paymentMethod);
        console.log('Payment Account:', paymentAccount);
        console.log('Payment Account ID:', paymentAccountId);

        setNewPurchase(prev => ({
            ...prev,
            payment_type: paymentMethod,
            payment_account: paymentAccount,
            payment_account_id: paymentAccountId
        }));
    };

    const handleCategoryChange = (category: string) => {
        const inventoryAccountId = INVENTORY_ACCOUNT_MAP[category as keyof typeof INVENTORY_ACCOUNT_MAP];

        setNewPurchase(prev => ({
            ...prev,
            category: category,
            inventory_account_id: inventoryAccountId
        }));
    };

    const categories = [
        { value: 'feed', label: 'Feed' },
        { value: 'medicine', label: 'Medicine' },
        { value: 'chicks', label: 'Chicks' }
    ];

    const { sortedData, requestSort, getSortIcon } = useTableSorting(
        purchases,
        { key: 'purchase_date', direction: 'desc' }, // Primary sort
        TableConfigs.purchases.getValueFn
    );

    const queryClient = useQueryClient();
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

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

            {/* Add Purchase Form */}
            {showAddForm && (
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Add New Purchase</h3>
                        <button
                            onClick={handleCloseForm}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 text-black md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <select
                                value={newPurchase.category || ''}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select Category</option>
                                {categories.map((category) => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Item Code *
                            </label>
                            <select
                                value={newPurchase.item_code}
                                onChange={(e) => handleItemCodeSelect(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select Item Code</option>
                                {items
                                    // Exlcluding Desi chicken here bruh
                                    .filter((item) => item.item_code !== "DC101")
                                    .map((item) => (
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
                                value={newPurchase.item_name}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                                placeholder="Auto-filled"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cost Per Unit *
                            </label>
                            <input
                                type="number"
                                value={newPurchase.cost_per_unit}
                                onChange={(e) => setNewPurchase(prev => ({ ...prev, cost_per_unit: e.target.value ? parseFloat(e.target.value) : '' }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity *
                            </label>
                            <input
                                type="number"
                                value={newPurchase.quantity}
                                onChange={(e) => setNewPurchase(prev => ({ ...prev, quantity: e.target.value ? parseInt(e.target.value) : '' }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Supplier *
                            </label>
                            <select
                                value={newPurchase.supplier}
                                onChange={(e) => setNewPurchase(prev => ({ ...prev, supplier: e.target.value, supplier_id: suppliers.find(s => s.name === e.target.value)?.supplier_id }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select Supplier</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier.supplier_id} value={supplier.name}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Method *
                            </label>
                            <select
                                value={newPurchase.payment_type || ''}
                                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select Payment Method</option>
                                {/* hardcoded values here do not change */}
                                <option value="Cash">Cash</option>
                                <option value="Payable">Payable</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Total Cost
                            </label>
                            <input
                                type="text"
                                value={calculateTotalCost(newPurchase.cost_per_unit, newPurchase.quantity).toFixed(2)}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleSubmit}
                                disabled={!newPurchase.category || !newPurchase.payment_type}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={18} />
                                Save Purchase
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <SortableHeader columnKey="purchase_id">Purchase ID</SortableHeader>
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
                                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                                    No purchases found
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((purchase) => (
                                <tr key={purchase.purchase_id} className="hover:bg-gray-50">
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
                                        {purchase.supplier}
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
                                                        const confirmed = window.confirm(`Delete purchase #${purchase.purchase_id}?`);
                                                        if (!confirmed) return;
                                                        handleDeletePurchase(purchase.purchase_id, queryClient);
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