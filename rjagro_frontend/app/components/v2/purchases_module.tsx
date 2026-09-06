'use client'
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/hooks/useAuth';
import { fetchPurchases } from '@/app/api/purchases';
import { fetchSuppliers } from '@/app/api/supplier';
import { fetchItems } from '@/app/api/items';
import { ShoppingCart } from 'lucide-react';
import PurchasesTable from '../tables/purchases';


const PurchasesModule = () => {
    const { user } = useAuth();
    const [subTab, setSubTab] = useState<'Purchases'>('Purchases');

    // Shared Loading/Form State
    const [loading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // --- Data Fetching ---
    const { data: purchases = [], isLoading: isPurchasesLoading } = useQuery({
        queryKey: ['purchases'],
        queryFn: fetchPurchases,
        staleTime: 5 * 60 * 1000,
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: fetchSuppliers,
        staleTime: 5 * 60 * 1000,
    });

    // Items are needed for the Purchase Form dropdowns
    const { data: items = [] } = useQuery({
        queryKey: ['items'],
        queryFn: fetchItems,
        staleTime: 5 * 60 * 1000,
    });



    return (
        <div className="space-y-6">
            {/* Inner Module Navigation */}
            <div className="flex items-center space-x-4 border-b border-gray-200 pb-2">
                <button
                    onClick={() => { setSubTab('Purchases'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Purchases'
                        ? 'border-b-2 border-green-600 text-green-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Purchase Orders</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[500px]">
                {subTab === 'Purchases' && (
                    <PurchasesTable
                        purchases={purchases}
                        items={items}
                        suppliers={suppliers}
                        loading={loading || isPurchasesLoading}
                        showAddForm={showAddForm}
                        setShowAddForm={setShowAddForm}
                        createdBy={user ? user.user_id : 9999}
                    />
                )}

            </div>
        </div>
    );
};

export default PurchasesModule;
