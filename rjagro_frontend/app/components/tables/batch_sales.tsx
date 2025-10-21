import React from 'react';
import { Edit, Filter, ChevronLeft, ChevronRight, Plus, X, Save } from 'lucide-react';
import { Batch, BatchSale, Item, NewBatchSale, Trader } from '@/app/types/interfaces';

interface BatchSalesTableProps {
  batchSales: BatchSale[];
  items: Item[];
  batches: Batch[];
  traders: Trader[];
  loading: boolean;
  showAddForm: boolean;
  newBatchSale: NewBatchSale;
  setShowAddForm: (show: boolean) => void;
  setNewBatchSale: React.Dispatch<React.SetStateAction<NewBatchSale>>;
  handleItemCodeSelect: (itemCode: string) => void;
  handleBatchSelect: (batchId: number) => void;
  handleTraderSelect: (traderId: number) => void;
  handleAddBatchSale: () => void;
}

const BatchSalesTable: React.FC<BatchSalesTableProps> = ({
  batchSales,
  items,
  batches,
  traders,
  loading,
  showAddForm,
  newBatchSale,
  setShowAddForm,
  setNewBatchSale,
  handleItemCodeSelect,
  handleBatchSelect,
  handleTraderSelect,
  handleAddBatchSale,
}) => {
  // Calculate value automatically when quantity or rate changes
  const calculateValue = (quantity: number | '', rate: number | '') => {
    if (quantity && rate) {
      return Number(quantity) * Number(rate);
    }
    return 0;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800">Batch Sales</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={18} />
            Add Sale
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {/* Add Batch Sale Form */}
      {showAddForm && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Add New Batch Sale</h3>
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
                Item Code *
              </label>
              <select
                value={newBatchSale.item_code}
                onChange={(e) => handleItemCodeSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Item</option>
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
                value={newBatchSale.item_name}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                placeholder="Auto-filled"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch *
              </label>
              <select
                value={newBatchSale.batch_id}
                onChange={(e) => handleBatchSelect(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Batch</option>
                {batches.map((batch) => (
                  <option key={batch.batch_id} value={batch.batch_id}>
                    Batch #{batch.batch_id} - {batch.farmer_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Farmer
              </label>
              <input
                type="text"
                value={newBatchSale.farmer_name}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                placeholder="Auto-filled from batch"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trader *
              </label>
              <select
                value={newBatchSale.trader_id}
                onChange={(e) => handleTraderSelect(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Trader</option>
                {traders.map((trader) => (
                  <option key={trader.trader_id} value={trader.trader_id}>
                    {trader.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trader Name
              </label>
              <input
                type="text"
                value={newBatchSale.trader_name}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                placeholder="Auto-filled"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Average Weight *
              </label>
              <input
                type="number"
                value={newBatchSale.avg_weight}
                onChange={(e) => setNewBatchSale(prev => ({ ...prev, avg_weight: e.target.value ? parseFloat(e.target.value) : '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate per Unit *
              </label>
              <input
                type="number"
                value={newBatchSale.rate}
                onChange={(e) => {
                  const rate = e.target.value ? parseFloat(e.target.value) : '';
                  setNewBatchSale(prev => ({
                    ...prev,
                    rate,
                    value: calculateValue(prev.quantity, rate)
                  }));
                }}
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
                value={newBatchSale.quantity}
                onChange={(e) => {
                  const quantity = e.target.value ? parseFloat(e.target.value) : '';
                  setNewBatchSale(prev => ({
                    ...prev,
                    quantity,
                    value: calculateValue(quantity, prev.rate)
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Value
              </label>
              <input
                type="text"
                value={typeof newBatchSale.value === 'number' ? newBatchSale.value.toFixed(2) : '0.00'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>

            <div className="flex items-end col-span-2">
              <button
                onClick={handleAddBatchSale}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save size={18} />
                Save Sale
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
                Sale ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batch
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Farmer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trader
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Weight
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sale Date
              </th>
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
            ) : batchSales.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                  No batch sales found
                </td>
              </tr>
            ) : (
              batchSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    #{sale.id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{sale.item_code}</div>
                      <div className="text-gray-500">{sale.item_name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    Batch #{sale.batch_id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.farmer_name}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.trader_name}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.avg_weight}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.rate}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.quantity}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {sale.value}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.created_at).toLocaleDateString()}
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
          Showing {batchSales.length} of {batchSales.length} results
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

export default BatchSalesTable;
