'use client'
import React, { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/hooks/useAuth';
import { fetchPurchasesPage, PURCHASES_PAGE_SIZE } from '@/app/api/purchases';
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
    const [page, setPage] = useState(1);
    const [sortKey, setSortKey] = useState('purchase_date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const {
        data: purchasesPage,
        isPending: isPurchasesPending,
        isFetching: isPurchasesFetching,
    } = useQuery({
        queryKey: ['purchases', 'page', page, sortKey, sortDir],
        queryFn: () => fetchPurchasesPage(page, PURCHASES_PAGE_SIZE, { sort: sortKey, dir: sortDir }),
        placeholderData: keepPreviousData,
        staleTime: 5 * 60 * 1000,
    });

    const purchases = purchasesPage?.items ?? [];

    useEffect(() => {
        if (purchasesPage && purchasesPage.total_pages > 0 && page > purchasesPage.total_pages) {
            setPage(purchasesPage.total_pages);
        }
    }, [purchasesPage, page]);

    const onSortChange = (key: string) => {
        if (key === sortKey) {
            setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(1);
    };

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
                        loading={loading}
                        tableLoading={isPurchasesPending}
                        refreshing={isPurchasesFetching && !isPurchasesPending}
                        page={page}
                        pageSize={PURCHASES_PAGE_SIZE}
                        totalCount={purchasesPage?.total_count ?? 0}
                        totalPages={purchasesPage?.total_pages ?? 0}
                        totalAmount={purchasesPage?.total_amount ?? 0}
                        onPageChange={setPage}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSortChange={onSortChange}
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
