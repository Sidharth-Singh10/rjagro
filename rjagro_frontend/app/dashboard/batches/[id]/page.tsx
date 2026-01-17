'use client'
import { fetchBatchSalesByBatchId } from "@/app/api/batch_sales";
import { fetchBatchById } from "@/app/api/batches";
import { BatchHeader } from "@/app/components/batch_details/header";
import { KPICard } from "@/app/components/batch_details/kpi_grid";
import BatchSalesTable from "@/app/components/batch_details/tabs/sales_view";
import { useAllBatches, useTraders } from "@/app/hooks/use_common_data";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Package, TrendingUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function BatchDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const batchId = Number(params.id);
    const [activeTab, setActiveTab] = useState('overview');


    const { data: batch, isLoading } = useQuery({
        queryKey: ["batch_new"],
        queryFn: () => fetchBatchById(batchId),
    });

    const { data: batchSales = [], isLoading: isSalesLoading } = useQuery({
        queryKey: ["batch_sales_new", batchId],
        queryFn: () => fetchBatchSalesByBatchId(batchId),
        enabled: !!batchId
    });


    const { data: traders = [], isLoading: isTradersLoading } = useTraders();
    const { data: allBatches = [] } = useAllBatches();

    if (isLoading) return <div className="p-10 text-center">Loading Batch Details...</div>;
    if (!batch) return <div className="p-10 text-center">Batch not found</div>;

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
                        {['allocations', 'sales'].map((tab) => (
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
                            <p>Import your <code>&lt;BatchAllocationsTable /&gt;</code> here.</p>
                            <p className="text-sm">Filter it by <code>batch_id === {batchId}</code></p>
                        </div>
                    )}

                    {activeTab === 'sales' && (
                        <div className="text-center text-gray-500 ">
                            <BatchSalesTable
                                batchSales={batchSales}
                                loading={isSalesLoading}
                                traders={traders}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}