'use client'
import { fetchAllocationsByBatchId } from "@/app/api/batch_allocations";
import { fetchAppTraders } from "@/app/api/app_traders";
import { fetchBatchSalesByBatchId } from "@/app/api/batch_sales";
import { fetchBatchById } from "@/app/api/batches";
import { fetchBirdCountHistoryById } from "@/app/api/bird_count_history";
import { fetchStockReturnsByBatch } from "@/app/api/stock_returns";
import { BatchHeader } from "@/app/components/batch_details/header";
import { BatchDetailsSkeleton } from "@/app/components/batch_details/helpers/loading";
import { KPICard, ExpenseKPICard, ExpenseBreakdown } from "@/app/components/batch_details/kpi_grid";
import AllocatedRequirementTable from "@/app/components/batch_details/tabs/allocated_view";
import BirdCountHistoryTable from "@/app/components/batch_details/tabs/bird_count_history/bird_count_history";
import StockReturnsTable from "@/app/components/batch_details/tabs/returns/returns";
import BatchSalesTable from "@/app/components/batch_details/tabs/sales_view/sales_view";
import { useItems, useTraders } from "@/app/hooks/use_common_data";
import { useAuth } from "@/app/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, Package, TrendingUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";

export default function BatchDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const batchId = Number(params.id);
    const [activeTab, setActiveTab] = useState('allocations');
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isAdmin = user?.role === 'Admin';

    const goToDashboardBatches = () => {
        if (isAdmin) {
            router.push("/dashboard/v2?tab=Batches");
        } else {
            router.push("/dashboard/user");
        }
    };


    const { data: batch, isLoading } = useQuery({
        queryKey: ["batch_new"],
        queryFn: () => fetchBatchById(batchId),
    });

    const { data: batchSales = [], isLoading: isSalesLoading } = useQuery({
        queryKey: ["batch_sales_new", batchId],
        queryFn: () => fetchBatchSalesByBatchId(batchId),
        enabled: !!batchId
    });

    const { data: allocations = [], isLoading: isAllocationsLoading } = useQuery({
        queryKey: ["allocations_new", batchId],
        queryFn: () => fetchAllocationsByBatchId(batchId),
        enabled: !!batchId
    });

    const { data: birdCountHistory = [], isLoading: isBirdCountLoading } = useQuery({
        queryKey: ["bird_count_history_new", batchId],
        queryFn: () => fetchBirdCountHistoryById(batchId),
        enabled: !!batchId
    });

    const { data: stockReturns = [], isLoading: isStockReturnsLoading } = useQuery({
        queryKey: ["stock_returns_new", batchId],
        queryFn: () => fetchStockReturnsByBatch(batchId),
        enabled: !!batchId
    });




    const { data: traders = [] } = useTraders();
    const { data: appTraders = [] } = useQuery({
        queryKey: ["app-traders"],
        queryFn: fetchAppTraders,
        staleTime: 1000 * 60 * 10,
    });
    const { data: items = [] } = useItems();

    const totalExpenses = useMemo(() => {
        const allocatedTotal = allocations.reduce((sum, a) => sum + parseFloat(a.allocated_value || '0'), 0);
        const returnsTotal = stockReturns.reduce((sum, r) => sum + (Number(r.return_value) || 0), 0);
        return allocatedTotal - returnsTotal;
    }, [allocations, stockReturns]);

    const totalRevenue = useMemo(() => {
        return batchSales.reduce((sum, s) => sum + (Number(s.value) || 0), 0);
    }, [batchSales]);

    const grossProfit = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);

    const expenseBreakdown: ExpenseBreakdown = useMemo(() => {
        const itemCategoryMap = new Map(items.map(i => [i.item_code, i.item_category]));
        const result = { feed: 0, chicks: 0, medicine: 0, returns: 0 };

        for (const alloc of allocations) {
            const cat = (itemCategoryMap.get(alloc.item_code) ?? '').toLowerCase();
            const val = parseFloat(alloc.allocated_value || '0');
            if (cat.includes('feed')) result.feed += val;
            else if (cat.includes('chick')) result.chicks += val;
            else if (cat.includes('medicine')) result.medicine += val;
            else result.feed += val;
        }

        result.returns = stockReturns.reduce((sum, r) => sum + (Number(r.return_value) || 0), 0);
        return result;
    }, [allocations, stockReturns, items]);

    if (isLoading) return <BatchDetailsSkeleton />;

    if (!batch) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800">Batch Not Found</h2>
                <button onClick={goToDashboardBatches} className="mt-4 text-blue-600 hover:underline">
                    Go Back
                </button>
            </div>
        </div>
    );

    const mortalityRate = ((batch.initial_bird_count - batch.current_bird_count) / batch.initial_bird_count * 100).toFixed(2);

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
            <BatchHeader batch={batch} onBack={goToDashboardBatches} />

            <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-3 sm:gap-4 mb-6 sm:mb-8`}>
                <KPICard
                    title="Current Stock"
                    value={batch.current_bird_count}
                    subtext={`Initial: ${batch.initial_bird_count}`}
                    icon={Package}
                    colorClass="bg-blue-500"
                />
                <KPICard
                    title="Mortality Rate"
                    value={`${mortalityRate}%`}
                    subtext="Target: < 3%"
                    icon={AlertTriangle}
                    colorClass={Number(mortalityRate) > 5 ? "bg-red-500" : "bg-green-500"}
                />
                {isAdmin && (
                    <ExpenseKPICard
                        title="Total Expenses"
                        value={`₹ ${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        subtext="Hover for breakdown"
                        icon={TrendingUp}
                        colorClass="bg-orange-500"
                        breakdown={expenseBreakdown}
                    />
                )}
                {isAdmin && (
                    <KPICard
                        title="Revenue"
                        value={`₹ ${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        subtext={`Gross Profit: ₹ ${grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={Activity}
                        colorClass={grossProfit >= 0 ? "bg-green-500" : "bg-red-500"}
                    />
                )}
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
                <div className="border-b px-2 sm:px-4 overflow-x-auto">
                    <nav className="flex gap-4 sm:gap-6 min-w-max">
                        {['allocations', 'sales', 'bird count', 'returns'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 sm:py-4 px-1 sm:px-2 text-sm font-medium border-b-2 transition-colors capitalize whitespace-nowrap ${activeTab === tab
                                    ? 'border-green-600 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.replace('_', ' & ')}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* 4. Tab Content Area */}
                <div className="">

                    {activeTab === 'allocations' && (
                        <div className="text-center text-gray-500 ">
                            <AllocatedRequirementTable
                                allocations={allocations}
                                loading={isAllocationsLoading}
                                isAdmin={isAdmin}
                            />
                        </div>
                    )}

                    {activeTab === 'sales' && (
                        <div className="text-center text-gray-500 ">
                            <BatchSalesTable
                                batchSales={batchSales}
                                loading={isSalesLoading}
                                traders={traders}
                                appTraders={appTraders}
                                batchId={batchId}
                                queryClient={queryClient}
                            />
                        </div>
                    )}

                    {activeTab === 'bird count' && (
                        <div className="text-center text-gray-500">
                            <BirdCountHistoryTable
                                historyData={birdCountHistory}
                                loading={isBirdCountLoading}
                                batchId={batchId}
                            />
                        </div>
                    )}

                    {activeTab === 'returns' && (
                        <div className="text-center text-gray-500">
                            <StockReturnsTable
                                stockReturns={stockReturns}
                                items={items}
                                loading={isStockReturnsLoading}
                                batchId={batchId}
                                isAdmin={isAdmin}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}