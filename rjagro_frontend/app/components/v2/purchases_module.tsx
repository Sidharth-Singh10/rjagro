'use client'
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/hooks/useAuth';
import { fetchPurchases, handleAddPurchase } from '@/app/api/purchases';
import { fetchSuppliers } from '@/app/api/supplier';
import { fetchItems } from '@/app/api/items';
import { LedgerAccountType, NewPurchase, PurchasePayload } from '@/app/types/interfaces';
import { ShoppingCart } from 'lucide-react';
import PurchasesTable from '../tables/purchases';


const PurchasesModule = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [subTab, setSubTab] = useState<'Purchases'>('Purchases');

    // Shared Loading/Form State
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // --- Data Fetching ---
    const { data: purchases = [] } = useQuery({
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

    // --- State: New Purchase ---
    const [newPurchase, setNewPurchase] = useState<NewPurchase>({
        item_code: '',
        item_name: '',
        cost_per_unit: '',
        quantity: '',
        supplier: '',
        purchase_date: new Date().toISOString().slice(0, 10),
        payment_type: '',
        supplier_id: undefined,
        payment_account: undefined,
        inventory_account_id: undefined,
        payment_account_id: undefined
    });

    // --- Handlers: Purchase Logic ---
    const handleItemCodeSelect = (itemCode: string) => {
        const selectedItem = items.find(item => item.item_code === itemCode);
        if (selectedItem) {
            setNewPurchase(prev => ({
                ...prev,
                item_code: itemCode,
                item_name: selectedItem.item_name
            }));
        }
    };

    const onAddPurchase = () => {
        const final: PurchasePayload = {
            item_code: newPurchase.item_code,
            cost_per_unit: Number(newPurchase.cost_per_unit),
            quantity: Number(newPurchase.quantity),
            purchase_date: newPurchase.purchase_date,
            supplier: newPurchase.supplier,
            supplier_id: newPurchase.supplier_id,
            payment_account: newPurchase.payment_account ?? LedgerAccountType.Asset,
            created_by: user ? user.user_id : 9999,
            payment_type: newPurchase.payment_type,
            inventory_account_id: newPurchase.inventory_account_id!,
            payment_account_id: newPurchase.payment_account_id!
        };

        handleAddPurchase(final, queryClient, setLoading);
    };



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
                        loading={loading}
                        showAddForm={showAddForm}
                        newPurchase={newPurchase}
                        setShowAddForm={setShowAddForm}
                        setNewPurchase={setNewPurchase}
                        handleItemCodeSelect={handleItemCodeSelect}
                        handleAddPurchase={onAddPurchase}
                    />
                )}

            </div>
        </div>
    );
};

export default PurchasesModule;