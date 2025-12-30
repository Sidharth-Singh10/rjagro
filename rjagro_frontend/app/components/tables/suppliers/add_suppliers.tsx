'use client';

import React from 'react';
import { SupplierPayload, SupplierType } from '@/app/types/interfaces';
import { Save, X } from 'lucide-react';

interface SupplierFormProps {
    newSupplier: SupplierPayload;
    setNewSupplier: React.Dispatch<React.SetStateAction<SupplierPayload>>;
    onSave: () => void;
    onCancel: () => void;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
    newSupplier,
    setNewSupplier,
    onSave,
    onCancel,
}) => {
    const handleChange = (field: keyof SupplierPayload, value: string) => {
        setNewSupplier((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="p-4 border-b bg-gray-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Add New Supplier</h3>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 text-black md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Supplier Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Type *</label>
                    <select
                        value={newSupplier.supplier_type}
                        onChange={(e) => handleChange('supplier_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Select Supplier Type</option>
                        {Object.values(SupplierType).map((type) => (
                            <option key={type} value={type}>
                                {type.replace('_', ' ')}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Standard Inputs */}
                <InputField
                    label="Name *"
                    value={newSupplier.name}
                    onChange={(val) => handleChange('name', val)}
                    placeholder="Supplier name"
                />

                <InputField
                    label="Phone Number *"
                    value={newSupplier.phone_number}
                    onChange={(val) => handleChange('phone_number', val)}
                    placeholder="Unique phone number"
                />

                {/* Address - Full Width on medium screens */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                    <textarea
                        value={newSupplier.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Full address"
                        rows={1}
                    />
                </div>

                {/* Bank Details */}
                <InputField
                    label="Bank Account No *"
                    value={newSupplier.bank_account_no}
                    onChange={(val) => handleChange('bank_account_no', val)}
                    placeholder="Bank account number"
                />

                <InputField
                    label="Bank Name *"
                    value={newSupplier.bank_name}
                    onChange={(val) => handleChange('bank_name', val)}
                    placeholder="Bank name"
                />

                <InputField
                    label="IFSC Code *"
                    value={newSupplier.ifsc_code}
                    onChange={(val) => handleChange('ifsc_code', val)}
                    placeholder="IFSC code"
                />

                {/* Save Button */}
                <div className="flex items-end">
                    <button
                        onClick={onSave}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Save size={18} />
                        Save Supplier
                    </button>
                </div>
            </div>
        </div>
    );
};

const InputField = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder: string }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={placeholder}
        />
    </div>
);