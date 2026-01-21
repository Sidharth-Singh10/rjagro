'use client';
import { fetchFarmerCommissionHistoryById } from '@/app/api/batches';
import { Farmer, FarmerCommissionHistory, NewFarmer } from '@/app/types/interfaces';
import { Edit, Filter, ChevronLeft, ChevronRight, Plus, X, Save, IndianRupee, Calendar } from 'lucide-react';
import { useState } from 'react';

interface FarmersTableProps {
    farmers: Farmer[];
    loading: boolean;
    showAddForm: boolean;
    newFarmer: NewFarmer;
    setShowAddForm: (show: boolean) => void;
    setNewFarmer: React.Dispatch<React.SetStateAction<NewFarmer>>;
    handleAddFarmer: () => void;
}

const FarmersTable: React.FC<FarmersTableProps> = ({
    farmers,
    loading,
    showAddForm,
    newFarmer,
    setShowAddForm,
    setNewFarmer,
    handleAddFarmer,
}) => {
    const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [commissionHistory, setCommissionHistory] = useState<FarmerCommissionHistory[]>([]);
    const [modalLoading, setModalLoading] = useState(false);


    const handleFarmerDoubleClick = async (farmer: Farmer) => {
        setSelectedFarmer(farmer);
        setShowModal(true);
        setModalLoading(true);

        try {
            const history = await fetchFarmerCommissionHistoryById(farmer.farmer_id);
            setCommissionHistory(history);
        } catch (error) {
            console.error('Error fetching commission history:', error);
            setCommissionHistory([]);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedFarmer(null);
        setCommissionHistory([]);
    };

    const totalCommission = commissionHistory.reduce((sum, commission) => {
        const amount = typeof commission.commission_amount === 'string'
            ? parseFloat(commission.commission_amount)
            : commission.commission_amount;
        return sum + (amount || 0);
    }, 0);

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Farmers</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Plus size={18} />
                        Add Farmer
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </div>

            {/* Add Farmer Form */}
            {showAddForm && (
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Add New Farmer</h3>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 text-black md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input
                                type="text"
                                value={newFarmer.name}
                                onChange={(e) => setNewFarmer(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Farmer name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                            <input
                                type="text"
                                value={newFarmer.phone_number}
                                onChange={(e) => setNewFarmer(prev => ({ ...prev, phone_number: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Unique phone number"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                            <textarea
                                value={newFarmer.address}
                                onChange={(e) => setNewFarmer(prev => ({ ...prev, address: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Full address"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account No *</label>
                            <input
                                type="text"
                                value={newFarmer.bank_account_no}
                                onChange={(e) => setNewFarmer(prev => ({ ...prev, bank_account_no: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Bank account number"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
                            <input
                                type="text"
                                value={newFarmer.bank_name}
                                onChange={(e) => setNewFarmer(prev => ({ ...prev, bank_name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Bank name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code *</label>
                            <input
                                type="text"
                                value={newFarmer.ifsc_code}
                                onChange={(e) => setNewFarmer(prev => ({ ...prev, ifsc_code: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="IFSC code"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Area Size (acres) *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newFarmer.area_size}
                                onChange={(e) => setNewFarmer(prev => ({ ...prev, area_size: e.target.value ? parseFloat(e.target.value) : '' }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleAddFarmer}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Save size={18} />
                                Save Farmer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Farmers Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area Size</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : farmers.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No farmers found</td>
                            </tr>
                        ) : (
                            farmers.map(f => (
                                <tr key={f.farmer_id} className="hover:bg-gray-50" onDoubleClick={() => handleFarmerDoubleClick(f)}>
                                    <td className="px-4 py-4 text-sm text-gray-900">{f.farmer_id}</td>
                                    <td className="px-4 py-4 text-sm text-gray-900">{f.name}</td>
                                    <td className="px-4 py-4 text-sm text-gray-900">{f.phone_number}</td>
                                    <td className="px-4 py-4 text-sm text-gray-900">{f.address}</td>
                                    <td className="px-4 py-4 text-sm text-gray-900">{f.bank_name} ({f.bank_account_no})</td>
                                    <td className="px-4 py-4 text-sm text-gray-900">{f.area_size}</td>
                                    <td className="px-4 py-4 text-sm text-gray-900">{new Date(f.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500">
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

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">Showing {farmers.length} of {farmers.length} results</div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border rounded-lg hover:bg-gray-50">
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <button className="px-3 py-2 bg-blue-600 text-white rounded-lg">1</button>
                    <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border rounded-lg hover:bg-gray-50">
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Commission History Modal */}
            {showModal && selectedFarmer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all animate-in slide-in-from-bottom-4 duration-300">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
                            <div className="flex items-center justify-between p-6">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-gray-900">Commission History</h3>
                                    <p className="text-sm text-gray-600">
                                        {selectedFarmer.name} (ID: {selectedFarmer.farmer_id})
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={closeModal}
                                        className="p-2 rounded-full hover:bg-white/80 transition-colors duration-200 group"
                                    >
                                        <X size={20} className="text-gray-600 group-hover:text-gray-800" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            {/* Total Commission Card */}
                            <div className="p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200 mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                                        <IndianRupee size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-green-800">Total Commission</h4>
                                        <p className="text-3xl font-bold text-green-900">
                                            ₹{totalCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Commission History Table */}
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                    <h4 className="text-lg font-semibold text-gray-800">Commission History</h4>
                                </div>

                                {modalLoading ? (
                                    <div className="p-8 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                                        <p className="text-gray-600 mt-2">Loading commission history...</p>
                                    </div>
                                ) : commissionHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                            <IndianRupee size={24} className="text-gray-400" />
                                        </div>
                                        <p className="text-lg font-medium">No commission history found</p>
                                        <p className="text-sm text-gray-400">This farmer hasn&apost received any commissions yet.</p>
                                    </div>
                                ) : (
                                    <div className="max-h-80 overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr className="text-left">
                                                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Commission ID</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {commissionHistory.map((commission) => (
                                                    <tr key={commission.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                        <td className="px-4 py-4 text-gray-900 font-mono text-xs">
                                                            {commission.id}
                                                        </td>
                                                        <td className="px-4 py-4 text-green-600 font-semibold">
                                                            ₹{(typeof commission.commission_amount === 'string'
                                                                ? parseFloat(commission.commission_amount)
                                                                : commission.commission_amount
                                                            ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 py-4 text-gray-700">
                                                            {commission.description || 'No description'}
                                                        </td>
                                                        <td className="px-4 py-4 text-gray-600">
                                                            <div className="flex items-center gap-2">
                                                                <Calendar size={14} className="text-green-500" />
                                                                {new Date(commission.created_at).toLocaleDateString('en-IN')}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                            <div className="flex justify-end">
                                <button
                                    onClick={closeModal}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>


    )
};

export default FarmersTable;
