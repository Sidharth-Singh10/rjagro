'use client'
import { useAuth } from "@/app/hooks/useAuth";
import { BatchDetailsModalProps, classifyName, parseNumberSafe } from "./utils";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { FarmerCommissionTab } from "./farmer_commission";
import { SummaryTab } from "./summary";
import { AllocationsTab } from "./allocations_tab";

const BatchDetailsModal: React.FC<BatchDetailsModalProps> = ({
    isOpen,
    onClose,
    batch,
    batchAllocations,
    requirements,
    commissionHistory = [],
    onAddCommission,
    commissionLoading = false,
    onCloseBatch,
    batchClosureLoading = false,
}) => {
    const user = useAuth().user;
    // Added 'Returns' to the state type definition
    const [activeTab, setActiveTab] = useState<'Feed' | 'Chicks' | 'Returns' | 'Medicine' | 'FarmerCommission' | 'Summary'>('Feed');

    // accepted requirements for selected batch
    const acceptedRequirements = useMemo(() => {
        return requirements.filter(r =>
            Number(r.batch_id) === Number(batch.batch_id) &&
            String(r.status || '').toLowerCase().includes('accept')
        );
    }, [batch, requirements]);

    // For each accepted requirement, compute allocated_value from batchAllocations
    const acceptedRequirementsWithAllocation = useMemo(() => {
        if (!acceptedRequirements.length) return [];
        return acceptedRequirements.map(req => {
            const allocs = batchAllocations.filter(a => Number(a.requirement_id) === Number(req.requirement_id));
            const totalAllocatedValue = allocs.reduce((sum, a) => sum + parseNumberSafe(a.allocated_value), 0);
            const category = classifyName(req.item_name || '');
            return {
                requirement: req,
                allocations: allocs,
                totalAllocatedValue,
                category
            };
        });
    }, [acceptedRequirements, batchAllocations]);

    // group by category
    const byCategory = useMemo(() => {
        const feed = acceptedRequirementsWithAllocation.filter(x => x.category === 'Feed');
        const chicks = acceptedRequirementsWithAllocation.filter(x => x.category === 'Chicks');
        const medicine = acceptedRequirementsWithAllocation.filter(x => x.category === 'Medicine');
        const sum = (arr: typeof acceptedRequirementsWithAllocation) => arr.reduce((s, x) => s + x.totalAllocatedValue, 0);
        return {
            Feed: { rows: feed, total: sum(feed) },
            Chicks: { rows: chicks, total: sum(chicks) },
            Medicine: { rows: medicine, total: sum(medicine) }
        };
    }, [acceptedRequirementsWithAllocation]);

    // Commission calculations
    const farmerCommissionData = useMemo(() => {
        const farmerCommissions = commissionHistory.filter(c =>
            Number(c.farmer_id) === Number(batch.farmer_id)
        );

        const totalCommission = farmerCommissions.reduce((sum, c) => sum + parseNumberSafe(c.commission_amount), 0);

        return {
            history: farmerCommissions,
            total: totalCommission
        };
    }, [batch, commissionHistory]);

    // Calculate total expenses for gross profit calculation
    const totalExpenses = useMemo(() => {
        return byCategory.Feed.total + byCategory.Chicks.total + byCategory.Medicine.total + farmerCommissionData.total;
    }, [byCategory, farmerCommissionData]);

    const handleClose = () => {
        setActiveTab('Feed');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Enhanced backdrop with blur effect */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={handleClose} />

            {/* Modal container with better responsive design */}
            <div className="relative z-60 w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in slide-in-from-bottom-4 duration-300">

                {/* Enhanced header with gradient background */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
                    <div className="flex items-center justify-between p-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-gray-900">
                                Allocations for Batch #{batch.batch_id}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    Line {batch.line_id}
                                </span>
                                <span>Farmer: <span className="font-medium">{batch.farmer_name}</span></span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-600 bg-white/60 px-3 py-2 rounded-lg backdrop-blur-sm">
                                <span className="font-medium">{batch.start_date}</span>
                                <span className="mx-2">→</span>
                                <span className="font-medium">{batch.end_date}</span>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-full hover:bg-white/80 transition-colors duration-200 group"
                            >
                                <X size={20} className="text-gray-600 group-hover:text-gray-800" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Enhanced tabs with better styling */}
                <div className="bg-gray-50 border-b border-gray-200">
                    <div className="flex overflow-x-auto">
                        {/* UPDATE: Added 'Returns' to this array */}
                        {(['Feed', 'Chicks', 'Medicine', 'Returns', 'FarmerCommission', 'Summary'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`relative px-6 py-4 text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === tab
                                    ? 'text-green-700 bg-white border-b-2 border-green-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                    }`}
                            >
                                {tab === 'FarmerCommission' ? 'Farmer Commission' : tab}
                                {activeTab === tab && (
                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-green-600 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'FarmerCommission' ? (
                        <FarmerCommissionTab
                            batch={batch}
                            commissionHistory={farmerCommissionData.history}
                            totalCommission={farmerCommissionData.total}
                            onAddCommission={onAddCommission}
                            loading={commissionLoading}
                            userId={user?.user_id}
                        />
                    )
                        : activeTab === 'Summary' ? (
                            <SummaryTab
                                batch={batch}
                                byCategory={byCategory}
                                farmerCommissionData={farmerCommissionData}
                                totalExpenses={totalExpenses}
                                onCloseBatch={onCloseBatch}
                                loading={batchClosureLoading}
                            />
                        ) : (
                            <AllocationsTab
                                activeTab={activeTab as 'Feed' | 'Chicks' | 'Medicine'}
                                data={byCategory[activeTab as 'Feed' | 'Chicks' | 'Medicine']}
                            />
                        )}
                </div>
            </div>
        </div>
    );
};

export default BatchDetailsModal;