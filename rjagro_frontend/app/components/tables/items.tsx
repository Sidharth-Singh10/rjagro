import { ItemCategory } from '@/app/types/enums';
import TableSkeletonRows from '@/app/components/ui/table_skeleton_rows';
import { Item } from '@/app/types/interfaces';
import { Inbox,  Edit, Filter, ChevronLeft, ChevronRight, Plus, X, Save } from 'lucide-react';
interface ItemsTableProps {
    items: Item[];
    loading: boolean;
    showAddForm: boolean;
    newItem: Item;
    setShowAddForm: (show: boolean) => void;
    setNewItem: React.Dispatch<React.SetStateAction<Item>>;
    handleAddItem: () => void;
}
const ItemsTable: React.FC<ItemsTableProps> = ({
    items,
    loading,
    showAddForm,
    newItem,
    setShowAddForm,
    setNewItem,
    handleAddItem,
}) => (
    <div className="bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Items</h2>
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

        {/* Add Item Form */}
        {showAddForm && (
            <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-800">Add New Item</h3>
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
                        <input
                            type="text"
                            value={newItem.item_code}
                            onChange={(e) =>
                                setNewItem((prev) => ({ ...prev, item_code: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Unique item code"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name *
                        </label>
                        <input
                            type="text"
                            value={newItem.item_name}
                            onChange={(e) =>
                                setNewItem((prev) => ({ ...prev, item_name: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Item name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category *
                        </label>
                        <select
                            value={newItem.item_category}
                            onChange={(e) =>
                                setNewItem((prev) => ({
                                    ...prev,
                                    item_category: e.target.value as ItemCategory,
                                }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            <option value="">Select category</option>
                            <option value={ItemCategory.Feed}>Feed</option>
                            <option value={ItemCategory.Medicine}>Medicine</option>
                            <option value={ItemCategory.Chicks}>Chicks</option>
                            <option value={ItemCategory.FinishedBirds}>Finished Birds</option>
                        </select>
                    </div>


                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit
                        </label>
                        <input
                            type="text"
                            value={newItem.unit}
                            onChange={(e) =>
                                setNewItem((prev) => ({ ...prev, unit: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="e.g. kg, pcs, box"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={handleAddItem}
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
                            Unit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                        <TableSkeletonRows cols={4} />
                    ) : items.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No items found</p>
                                </td>
                        </tr>
                    ) : (
                        items.map((item) => (
                            <tr key={item.item_code} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.item_code}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.item_name}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.item_category}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.unit || '-'}
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
                Showing {items.length} of {items.length} results
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

export default ItemsTable;