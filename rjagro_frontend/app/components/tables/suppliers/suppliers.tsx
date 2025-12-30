'use client';
import React from 'react';
import { Supplier, SupplierPayload } from '@/app/types/interfaces';
import { SupplierForm } from './add_suppliers';
import { SupplierList } from './supplier_list';


interface SuppliersTableProps {
    suppliers: Supplier[];
    loading: boolean;
    showAddForm: boolean;
    newSupplier: SupplierPayload;
    setShowAddForm: (show: boolean) => void;
    setNewSupplier: React.Dispatch<React.SetStateAction<SupplierPayload>>;
    handleAddSupplier: () => void;
}

const SuppliersTable: React.FC<SuppliersTableProps> = ({
    suppliers,
    loading,
    showAddForm,
    newSupplier,
    setShowAddForm,
    setNewSupplier,
    handleAddSupplier,
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header Section */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800">Suppliers</h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`px-4 py-2 rounded-lg shadow transition-colors text-white ${showAddForm
                        ? 'bg-gray-500 hover:bg-gray-600'
                        : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {showAddForm ? 'Cancel' : 'Add Supplier'}
                </button>
            </div>

            {showAddForm && (
                <SupplierForm
                    newSupplier={newSupplier}
                    setNewSupplier={setNewSupplier}
                    onSave={handleAddSupplier}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            <SupplierList
                suppliers={suppliers}
                loading={loading}
            />
        </div>
    );
};

export default SuppliersTable;