import React from 'react';
import { Inbox,  Edit, Filter, ChevronLeft, ChevronRight, Plus, X, Save, Trash2 } from 'lucide-react';
import { BatchAllocation, BatchAllocationLine, NewBatchAllocationLine, StockReceipt } from '@/app/types/interfaces';

interface BatchAllocationLinesTableProps {
  allocationLines: BatchAllocationLine[];
  batchAllocations: BatchAllocation[];
  stockReceipts: StockReceipt[];
  loading: boolean;
  showAddForm: boolean;
  newAllocationLine: NewBatchAllocationLine;
  setShowAddForm: (show: boolean) => void;
  setNewAllocationLine: React.Dispatch<React.SetStateAction<NewBatchAllocationLine>>;
  handleAddAllocationLine: () => void;
  handleDeleteAllocationLine?: (allocationLineId: number) => void;
}

const BatchAllocationLinesTable: React.FC<BatchAllocationLinesTableProps> = ({
  allocationLines,
  batchAllocations,
  stockReceipts,
  loading,
  showAddForm,
  newAllocationLine,
  setShowAddForm,
  setNewAllocationLine,
  handleAddAllocationLine,
  handleDeleteAllocationLine,
}) => {
  
  const calculateLineValue = (qty: number | '', unitCost: number | '') => {
    const quantity = typeof qty === 'number' ? qty : parseFloat(qty as string) || 0;
    const cost = typeof unitCost === 'number' ? unitCost : parseFloat(unitCost as string) || 0;
    return quantity * cost;
  };

  const handleLotSelect = (lotId: string) => {
    const selectedLot = stockReceipts.find(receipt => receipt.lot_id === parseInt(lotId));
    if (selectedLot) {
      setNewAllocationLine(prev => ({
        ...prev,
        lot_id: parseInt(lotId),
        unit_cost: selectedLot.unit_cost
      }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800">Batch Allocation Lines</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={18} />
            Add Allocation Line
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {/* Add Allocation Line Form */}
      {showAddForm && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Add New Allocation Line</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 text-gray-900 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Allocation *
              </label>
              <select
                value={newAllocationLine.allocation_id}
                onChange={(e) => setNewAllocationLine(prev => ({ 
                  ...prev, 
                  allocation_id: e.target.value ? parseInt(e.target.value) : '' 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Allocation</option>
                {batchAllocations.map((allocation) => (
                  <option key={allocation.allocation_id} value={allocation.allocation_id}>
                    #{allocation.allocation_id} - Req #{allocation.requirement_id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Lot *
              </label>
              <select
                value={newAllocationLine.lot_id}
                onChange={(e) => handleLotSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Lot</option>
                {stockReceipts.map((receipt) => (
                  <option key={receipt.lot_id} value={receipt.lot_id}>
                    Lot #{receipt.lot_id} - {receipt.item_code} ({receipt.received_qty} available)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                value={newAllocationLine.qty}
                onChange={(e) => setNewAllocationLine(prev => ({ 
                  ...prev, 
                  qty: e.target.value ? parseFloat(e.target.value) : '' 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Cost *
              </label>
              <input
                type="number"
                value={newAllocationLine.unit_cost}
                onChange={(e) => setNewAllocationLine(prev => ({ 
                  ...prev, 
                  unit_cost: e.target.value ? parseFloat(e.target.value) : '' 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Line Value
              </label>
              <input
                type="text"
                value={calculateLineValue(newAllocationLine.qty, newAllocationLine.unit_cost).toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleAddAllocationLine}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save size={18} />
              Save Allocation Line
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Line ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Allocation ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lot Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Cost
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Line Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : allocationLines.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No allocation lines found</p>
                                </td>
              </tr>
            ) : (
              allocationLines.map((line) => (
                <tr key={line.allocation_line_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {line.allocation_line_id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {line.allocation_id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {line.lot_number || line.lot_id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {line.item_code || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {line.item_name || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {line.qty}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{line.unit_cost}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₹{line.line_value}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <button className="text-green-600 hover:text-green-700">
                        <Edit size={16} />
                      </button>
                      {handleDeleteAllocationLine && (
                        <button 
                          onClick={() => handleDeleteAllocationLine(line.allocation_line_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="text-sm text-gray-500">
          Showing {allocationLines.length} of {allocationLines.length} results
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

export default BatchAllocationLinesTable;