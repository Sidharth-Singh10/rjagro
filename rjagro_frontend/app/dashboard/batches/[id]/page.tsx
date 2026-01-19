'use client'
import { fetchAllocationsByBatchId } from "@/app/api/batch_allocations";
import { fetchBatchSalesByBatchId } from "@/app/api/batch_sales";
import { fetchBatchById } from "@/app/api/batches";
import { fetchBirdCountHistoryById } from "@/app/api/bird_count_history";
import { fetchStockReturnsByBatch } from "@/app/api/stock_returns";
import { BatchHeader } from "@/app/components/batch_details/header";
import { BatchDetailsSkeleton } from "@/app/components/batch_details/helpers/loading";
import { KPICard } from "@/app/components/batch_details/kpi_grid";
import AllocatedRequirementTable from "@/app/components/batch_details/tabs/allocated_view";
import BirdCountHistoryTable from "@/app/components/batch_details/tabs/bird_count_history/bird_count_history";
import StockReturnsTable from "@/app/components/batch_details/tabs/returns/returns";
import BatchSalesTable from "@/app/components/batch_details/tabs/sales_view/sales_view";
import { useItems, useTraders } from "@/app/hooks/use_common_data";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, Package, TrendingUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function BatchDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const batchId = Number(params.id);
    const [activeTab, setActiveTab] = useState('allocations');
    const queryClient = useQueryClient();


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
    const { data: items = [] } = useItems();

    if (isLoading) return <BatchDetailsSkeleton />;

    if (!batch) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800">Batch Not Found</h2>
                <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">
                    Go Back
                </button>
            </div>
        </div>
    );

    const mortalityRate = ((batch.initial_bird_count - batch.current_bird_count) / batch.initial_bird_count * 100).toFixed(2);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <BatchHeader batch={batch} onBack={() => router.back()} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                <KPICard
                    title="Total Expenses"
                    value="₹ 0.00"
                    subtext="Feed + Medicine + Chicks"
                    icon={TrendingUp}
                    colorClass="bg-orange-500"
                />
                <KPICard
                    title="Est. Revenue"
                    value="₹ 0.00"
                    subtext="Based on current weight"
                    icon={Activity}
                    colorClass="bg-purple-500"
                />
            </div>

            {/* 3. Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
                <div className="border-b px-4">
                    <nav className="flex gap-6">
                        {['allocations', 'sales', 'bird count', 'returns'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
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
                            />
                        </div>
                    )}

                    {activeTab === 'sales' && (
                        <div className="text-center text-gray-500 ">
                            <BatchSalesTable
                                batchSales={batchSales}
                                loading={isSalesLoading}
                                traders={traders}
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
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}