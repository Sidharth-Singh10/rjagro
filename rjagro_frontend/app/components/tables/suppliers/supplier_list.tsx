'use client';

import React from 'react';
import { Inbox } from 'lucide-react';
import { Supplier } from '@/app/types/interfaces';

interface SupplierListProps {
    suppliers: Supplier[];
    loading: boolean;
    onRowClick: (supplier: Supplier) => void;
}

export const SupplierList: React.FC<SupplierListProps> = ({ suppliers, loading, onRowClick }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        {['ID', 'Name', 'Phone', 'Amount Due', 'Address', 'Bank', 'IFSC', 'Created At'].map((header) => (
                            <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                        <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                <div className="animate-pulse">Loading suppliers...</div>
                            </td>
                        </tr>
                    ) : suppliers.length === 0 ? (
                        <tr>
                            <td colSpan={9} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No suppliers found.</p>
                                </td>
                        </tr>
                    ) : (
                        suppliers.map((s) => (
                            <tr key={s.supplier_id} onClick={() => onRowClick(s)} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-4 text-sm text-gray-900">{s.supplier_id}</td>
                                <td className="px-4 py-4 text-sm text-gray-900 font-medium">{s.name}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{s.phone_number}</td>
                                <td className={`px-4 py-4 text-sm font-medium ${parseFloat(s.amount_due) > 0 ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                    {s.amount_due}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={s.address}>{s.address}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">
                                    <div className="flex flex-col">
                                        <span>{s.bank_name}</span>
                                        <span className="text-xs text-gray-500">{s.bank_account_no}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900">{s.ifsc_code}</td>
                                <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                                    {new Date(s.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};