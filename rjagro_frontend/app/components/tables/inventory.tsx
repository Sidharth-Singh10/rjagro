'use client';
import React, { useState } from 'react';
import { Inbox,  Edit, Filter, ChevronLeft, ChevronRight, Plus, X, Save, Package } from 'lucide-react';
import { Inventory, InventoryWithItemDetails, Item, NewInventory } from '@/app/types/interfaces';

interface InventoryTableProps {
    inventory: Inventory[];
    items: Item[];
    loading: boolean;
    showAddForm: boolean;
    newInventory: NewInventory;
    setShowAddForm: (show: boolean) => void;
    setNewInventory: React.Dispatch<React.SetStateAction<NewInventory>>;
    handleItemCodeSelect: (itemCode: string) => void;
    handleAddInventory: () => void;
    handleUpdateInventory: (item_code: string, current_qty: number) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
    inventory,
    items,
    loading,
    showAddForm,
    newInventory,
    setShowAddForm,
    setNewInventory,
    handleItemCodeSelect,
    handleAddInventory,
    handleUpdateInventory,
}) => {
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editQty, setEditQty] = useState<number>(0);

    // Join inventory with items data on frontend
    const inventoryWithItems: InventoryWithItemDetails[] = inventory.map(invItem => {
        const itemDetails = items.find(item => item.item_code === invItem.item_code);
        return {
            ...invItem,
            item_name: itemDetails?.item_name || 'Unknown Item',
            unit: itemDetails?.unit || 'N/A'
        };
    });

    const handleEditClick = (item: Inventory) => {
        setEditingItem(item.item_code);
        setEditQty(item.current_qty);
    };

    const handleSaveEdit = (item_code: string) => {
        handleUpdateInventory(item_code, editQty);
        setEditingItem(null);
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setEditQty(0);
    };

    const getStockStatus = (qty: number) => {
        if (qty === 0) return { status: 'Out of Stock', color: 'text-red-600 bg-red-100' };
        if (qty < 10) return { status: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
        return { status: 'In Stock', color: 'text-green-600 bg-green-100' };
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                    <Package className="text-gray-600" size={24} />
                    <h2 className="text-xl font-semibold text-gray-800">Inventory Management</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Plus size={18} />
                        Add Item
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </div>

            {/* Add Inventory Form */}
            {showAddForm && (
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Add New Inventory Item</h3>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 text-gray-900 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Item Code *
                            </label>
                            <select
                                value={newInventory.item_code}
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
                                value={newInventory.item_name}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                                placeholder="Auto-filled"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Current Quantity *
                            </label>
                            <input
                                type="number"
                                value={newInventory.current_qty}
                                onChange={(e) => setNewInventory(prev => ({ 
                                    ...prev, 
                                    current_qty: e.target.value ? parseFloat(e.target.value) : '' 
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleAddInventory}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Save size={18} />
                                Save Item
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
                                Item Code
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Item Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Current Quantity
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Unit
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stock Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Updated
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : inventory.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No inventory items found</p>
                                </td>
                            </tr>
                        ) : (
                            inventoryWithItems.map((item) => {
                                const stockStatus = getStockStatus(item.current_qty);
                                const isEditing = editingItem === item.item_code;
                                
                                return (
                                    <tr key={item.item_code} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.item_code}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.item_name}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editQty}
                                                    onChange={(e) => setEditQty(parseFloat(e.target.value) || 0)}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                                    step="0.01"
                                                />
                                            ) : (
                                                item.current_qty
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {item.unit}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                                                {stockStatus.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(item.last_updated).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleSaveEdit(item.item_code)}
                                                        className="text-green-600 hover:text-green-800"
                                                        title="Save"
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="text-gray-600 hover:text-gray-800"
                                                        title="Cancel"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleEditClick(item)}
                                                    className="text-green-600 hover:text-green-700"
                                                    title="Edit Quantity"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                    Showing {inventoryWithItems.length} of {inventoryWithItems.length} items
                </div>
                <div className="flex items-center gap-2">
                    <button disabled className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg cursor-not-allowed opacity-40">
                        <ChevronLeft size={16} />
                        Previous
                    </button>
                    <span className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium" aria-current="page">1</span>
                    <button disabled className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg cursor-not-allowed opacity-40">
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InventoryTable;