import React from 'react';
import { Inbox,  Edit, Filter, ChevronLeft, ChevronRight, Plus, X, Save } from 'lucide-react';
import { InventoryMovement, Item, NewInventoryMovement } from '@/app/types/interfaces';

interface InventoryMovementsTableProps {
    inventoryMovements: InventoryMovement[];
    items: Item[];
    loading: boolean;
    showAddForm: boolean;
    newMovement: NewInventoryMovement;
    setShowAddForm: (show: boolean) => void;
    setNewMovement: React.Dispatch<React.SetStateAction<NewInventoryMovement>>;
    handleItemCodeSelect: (itemCode: string) => void;
    handleAddMovement: () => void;
}
enum MovementType {
    PURCHASE = 'purchase',
    ALLOCATION = 'allocation',
    ADJUSTMENT = 'adjustment',
    TRANSFER = 'transfer'
}


const InventoryMovementsTable: React.FC<InventoryMovementsTableProps> = ({
    inventoryMovements,
    items,
    loading,
    showAddForm,
    newMovement,
    setShowAddForm,
    setNewMovement,
    handleItemCodeSelect,
    handleAddMovement,
}) => {
    // Helper function to get item name by item code
    const getItemName = (itemCode: string) => {
        const item = items.find(item => item.item_code === itemCode);
        return item ? item.item_name : 'Unknown Item';
    };
    const getMovementTypeColor = (type: MovementType) => {
        switch (type) {
            case MovementType.PURCHASE:
                return 'bg-green-100 text-green-800';
            case MovementType.ALLOCATION:
                return 'bg-blue-100 text-blue-800';
            case MovementType.ADJUSTMENT:
                return 'bg-yellow-100 text-yellow-800';
            case MovementType.TRANSFER:
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Inventory Movements</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Plus size={18} />
                        Add Movement
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </div>

            {/* Add Movement Form */}
            {showAddForm && (
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Add New Inventory Movement</h3>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 text-gray-900 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Item Code *
                            </label>
                            <select
                                value={newMovement.item_code}
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
                                value={newMovement.item_name}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                                placeholder="Auto-filled"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Movement Type *
                            </label>
                            <select
                                value={newMovement.movement_type}
                                onChange={(e) => setNewMovement(prev => ({ ...prev, movement_type: e.target.value as MovementType }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select Movement Type</option>
                                <option value={MovementType.PURCHASE}>PURCHASE</option>
                                <option value={MovementType.ALLOCATION}>ALLOCATION</option>
                                <option value={MovementType.ADJUSTMENT}>ADJUSTMENT</option>
                                <option value={MovementType.TRANSFER}>TRANSFER</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity Change *
                            </label>
                            <input
                                type="number"
                                value={newMovement.qty_change}
                                onChange={(e) => setNewMovement(prev => ({ ...prev, qty_change: e.target.value ? parseFloat(e.target.value) : '' }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reference ID
                            </label>
                            <input
                                type="number"
                                value={newMovement.reference_id}
                                onChange={(e) => setNewMovement(prev => ({ ...prev, reference_id: e.target.value ? parseInt(e.target.value) : '' }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Optional reference"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Movement Date *
                            </label>
                            <input
                                type="date"
                                value={newMovement.movement_date}
                                onChange={(e) => setNewMovement(prev => ({ ...prev, movement_date: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleAddMovement}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Save size={18} />
                                Save Movement
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
                                Movement ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Item Code
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Item Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Movement Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Qty Change
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Reference ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Movement Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : inventoryMovements.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No inventory movements found</p>
                                </td>
                            </tr>
                        ) : (
                            inventoryMovements.map((movement) => (
                                <tr key={movement.movement_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {movement.movement_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {movement.item_code}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {getItemName(movement.item_code)}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getMovementTypeColor(movement.movement_type)}`}>
                                            {movement.movement_type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <span className={movement.qty_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            {movement.qty_change >= 0 ? '+' : ''}{movement.qty_change}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {movement.reference_id || '-'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(movement.movement_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button className="text-green-600 hover:text-green-700">
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
                    Showing {inventoryMovements.length} of {inventoryMovements.length} results
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
export default InventoryMovementsTable;