import React from 'react';
import { Inbox,  Edit, Filter, ChevronLeft, ChevronRight, Plus, X, Save } from 'lucide-react';
import { ProductionLine, ProductionLinePayload, SupervisorSimplified } from '@/app/types/interfaces';

interface ProductionLinesTableProps {
    productionLines: ProductionLine[];
    supervisors: SupervisorSimplified[];
    loading: boolean;
    showAddForm: boolean;
    newProductionLine: ProductionLinePayload;
    setShowAddForm: (show: boolean) => void;
    setNewProductionLine: React.Dispatch<React.SetStateAction<ProductionLinePayload>>;
    handleAddProductionLine: () => void;
}

const ProductionLinesTable: React.FC<ProductionLinesTableProps> = ({
    productionLines,
    supervisors,
    loading,
    showAddForm,
    newProductionLine,
    setShowAddForm,
    setNewProductionLine,
    handleAddProductionLine,
}) => (
    <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Production Lines</h2>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Plus size={18} />
                    Add Production Line
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Filter size={18} />
                    Filters
                </button>
            </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
            <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-800">Add New Production Line</h3>
                    <button
                        onClick={() => setShowAddForm(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 text-gray-900 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Line Name *
                        </label>
                        <input
                            type="text"
                            value={newProductionLine.line_name}
                            onChange={(e) =>
                                setNewProductionLine(prev => ({ ...prev, line_name: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Enter line name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Supervisor *
                        </label>
                        <select
                            value={newProductionLine.supervisor_id || ''}
                            onChange={(e) =>
                                setNewProductionLine(prev => ({
                                    ...prev,
                                    supervisor_id: Number(e.target.value),
                                }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            <option value="">Select Supervisor</option>
                            {supervisors.map((sup) => (
                                <option key={sup.user_id} value={sup.user_id}>
                                    {sup.user_id} - {sup.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={handleAddProductionLine}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Save size={18} />
                            Save Production Line
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Line ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Line Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supervisor ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supervisor Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created At
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                        </tr>
                    ) : productionLines.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No production lines found</p>
                                </td>
                        </tr>
                    ) : (
                        productionLines.map((line) => {
                            const supervisor = supervisors.find(
                                (s) => s.user_id === line.supervisor_id
                            );
                            return (
                                <tr key={line.line_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {line.line_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {line.line_name}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {line.supervisor_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {supervisor ? supervisor.name : line.supervisor_name}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {line.created_at ? line.created_at.slice(0, 10) : ''}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button className="text-green-600 hover:text-green-700">
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-500">
                Showing {productionLines.length} of {productionLines.length} results
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

export default ProductionLinesTable;
