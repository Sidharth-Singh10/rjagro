'use client'
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tractor, Briefcase, Truck } from 'lucide-react';
import { fetchFarmers, handleAddFarmer } from '@/app/api/farmers';
import { fetchTraders, handleAddTrader } from '@/app/api/traders';
import { fetchSuppliers, handleAddSupplier } from '@/app/api/supplier';
import { NewFarmer, NewTrader, SupplierPayload, SupplierType } from '@/app/types/interfaces';
import FarmersTable from '../tables/farmers';
import TradersTable from '../tables/traders/traders';
import SuppliersTable from '../tables/suppliers/suppliers';


const EntitiesModule = () => {
    const queryClient = useQueryClient();
    const [subTab, setSubTab] = useState<'Farmers' | 'Traders' | 'Suppliers'>('Farmers');

    // Shared Loading/Form State
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // --- Data Fetching ---
    const { data: farmers = [], isLoading: isFarmersLoading } = useQuery({
        queryKey: ["farmers"],
        queryFn: fetchFarmers,
        staleTime: 5 * 60 * 1000,
    });

    const { data: traders = [], isLoading: isTradersLoading } = useQuery({
        queryKey: ['traders'],
        queryFn: fetchTraders,
        staleTime: 5 * 60 * 1000,
    });

    const { data: suppliers = [], isLoading: isSuppliersLoading } = useQuery({
        queryKey: ['suppliers'],
        queryFn: fetchSuppliers,
        staleTime: 5 * 60 * 1000,
    });

    // --- STATE & HANDLERS: FARMERS ---
    const [newFarmer, setNewFarmer] = useState<NewFarmer>({
        name: '',
        phone_number: '',
        address: '',
        bank_account_no: '',
        bank_name: '',
        ifsc_code: '',
        area_size: 0
    });

    const onAddFarmer = () => {
        handleAddFarmer(newFarmer, queryClient, setLoading);
    };

    // --- STATE & HANDLERS: TRADERS ---
    const [newTrader, setNewTrader] = useState<NewTrader>({
        name: '',
        phone_number: '',
        address: '',
        bank_account_no: '',
        bank_name: '',
        ifsc_code: '',
    });

    const onAddTrader = () => {
        handleAddTrader(newTrader, queryClient, setLoading);
    };

    // --- STATE & HANDLERS: SUPPLIERS ---
    const [newSupplier, setNewSupplier] = useState<SupplierPayload>({
        supplier_type: SupplierType.Chick,
        name: '',
        phone_number: '',
        address: '',
        bank_account_no: '',
        bank_name: '',
        ifsc_code: ''
    });

    const onAddSupplier = () => {
        handleAddSupplier(newSupplier, queryClient, setLoading);
    };

    return (
        <div className="space-y-6">
            {/* Inner Module Navigation */}
            <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 pb-2">
                <button
                    onClick={() => { setSubTab('Farmers'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Farmers'
                            ? 'border-b-2 border-green-600 text-green-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Tractor className="w-4 h-4" />
                    <span>Farmers</span>
                </button>
                <button
                    onClick={() => { setSubTab('Traders'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Traders'
                            ? 'border-b-2 border-green-600 text-green-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Briefcase className="w-4 h-4" />
                    <span>Traders</span>
                </button>
                <button
                    onClick={() => { setSubTab('Suppliers'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Suppliers'
                            ? 'border-b-2 border-green-600 text-green-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Truck className="w-4 h-4" />
                    <span>Suppliers</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[500px]">
                {subTab === 'Farmers' && (
                    <FarmersTable
                        farmers={farmers}
                        loading={loading || isFarmersLoading}
                        showAddForm={showAddForm}
                        newFarmer={newFarmer}
                        setShowAddForm={setShowAddForm}
                        setNewFarmer={setNewFarmer}
                        handleAddFarmer={onAddFarmer}
                    />
                )}

                {subTab === 'Traders' && (
                    <TradersTable
                        traders={traders}
                        loading={loading || isTradersLoading}
                        showAddForm={showAddForm}
                        newTrader={newTrader}
                        setShowAddForm={setShowAddForm}
                        setNewTrader={setNewTrader}
                        handleAddTrader={onAddTrader}
                    />
                )}

                {subTab === 'Suppliers' && (
                    <SuppliersTable
                        suppliers={suppliers}
                        loading={loading || isSuppliersLoading}
                        showAddForm={showAddForm}
                        newSupplier={newSupplier}
                        setShowAddForm={setShowAddForm}
                        setNewSupplier={setNewSupplier}
                        handleAddSupplier={onAddSupplier}
                    />
                )}
            </div>
        </div>
    );
};

export default EntitiesModule;