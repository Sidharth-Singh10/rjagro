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
    allocationLines ,
    requirements,
    stockReturns, 
    commissionHistory = [],
    onAddCommission,
    commissionLoading = false,
    onCloseBatch,
    batchClosureLoading = false,
}) => {
    const user = useAuth().user;
    const [activeTab, setActiveTab] = useState<'Feed' | 'Chicks' | 'Medicine' | 'FarmerCommission' | 'Summary'>('Feed');

    // --- 1. Filter Accepted Requirements (Base Allocations) ---
    const acceptedRequirements = useMemo(() => {
        return requirements.filter(r =>
            Number(r.batch_id) === Number(batch.batch_id) &&
            String(r.status || '').toLowerCase().includes('accept')
        );
    }, [batch, requirements]);

    // --- 2. Join Allocations to Requirements ---
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

    // --- 3. Process Returns (The Join Logic) ---
    const returnsByCategory = useMemo(() => {
        const result = { Feed: 0, Chicks: 0, Medicine: 0 };

        // Filter returns for this batch
        const batchReturns = stockReturns.filter(r => Number(r.batch_id) === Number(batch.batch_id));

        batchReturns.forEach(ret => {
            // JOIN 1: StockReturn -> BatchAllocationLine
            const line = allocationLines.find(l => Number(l.allocation_line_id) === Number(ret.allocation_line_id));
            if (!line) return;

            // JOIN 2: BatchAllocationLine -> BatchAllocation
            const allocation = batchAllocations.find(a => Number(a.allocation_id) === Number(line.allocation_id));
            if (!allocation) return;

            // JOIN 3: BatchAllocation -> BatchRequirement
            const requirement = requirements.find(r => Number(r.requirement_id) === Number(allocation.requirement_id));
            if (!requirement) return;

            // JOIN 4: BatchRequirement -> Item Name -> Category
            const category = classifyName(requirement.item_name || '');
            
            if (category === 'Feed' || category === 'Chicks' || category === 'Medicine') {
                result[category] += parseNumberSafe(ret.return_value);
            }
        });

        return result;
    }, [stockReturns, batch.batch_id, allocationLines, batchAllocations, requirements]);


    // --- 4. Aggregate Totals (Allocated - Returned) ---
    const byCategory = useMemo(() => {
        const getCategoryData = (cat: 'Feed' | 'Chicks' | 'Medicine') => {
            const rows = acceptedRequirementsWithAllocation.filter(x => x.category === cat);
            const allocatedTotal = rows.reduce((s, x) => s + x.totalAllocatedValue, 0);
            const returnedTotal = returnsByCategory[cat];
            
            return {
                rows,
                allocatedTotal,
                returnedTotal,
                netTotal: allocatedTotal - returnedTotal
            };
        };

        return {
            Feed: getCategoryData('Feed'),
            Chicks: getCategoryData('Chicks'),
            Medicine: getCategoryData('Medicine')
        };
    }, [acceptedRequirementsWithAllocation, returnsByCategory]);


    // --- 5. Commission & Total Expenses ---
    const farmerCommissionData = useMemo(() => {
        const farmerCommissions = commissionHistory.filter(c =>
            Number(c.farmer_id) === Number(batch.farmer_id)
        );
        const totalCommission = farmerCommissions.reduce((sum, c) => sum + parseNumberSafe(c.commission_amount), 0);
        return { history: farmerCommissions, total: totalCommission };
    }, [batch, commissionHistory]);

    const totalExpenses = useMemo(() => {
        return byCategory.Feed.netTotal + 
               byCategory.Chicks.netTotal + 
               byCategory.Medicine.netTotal + 
               farmerCommissionData.total;
    }, [byCategory, farmerCommissionData]);

    const handleClose = () => {
        setActiveTab('Feed');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={handleClose} />
            <div className="relative z-60 w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
                    <div className="flex items-center justify-between p-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-gray-900">
                                Batch #{batch.batch_id} Details
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Farmer: <span className="font-medium">{batch.farmer_name}</span></span>
                            </div>
                        </div>
                        <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/80 transition-colors">
                            <X size={20} className="text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-gray-50 border-b border-gray-200">
                    <div className="flex overflow-x-auto">
                        {(['Feed', 'Chicks', 'Medicine', 'FarmerCommission', 'Summary'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    activeTab === tab
                                    ? 'border-green-600 text-green-700 bg-white'
                                    : 'border-transparent text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {tab === 'FarmerCommission' ? 'Farmer Commission' : tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 h-[600px] overflow-y-auto">
                    {activeTab === 'FarmerCommission' ? (
                        <FarmerCommissionTab
                            batch={batch}
                            commissionHistory={farmerCommissionData.history}
                            totalCommission={farmerCommissionData.total}
                            onAddCommission={onAddCommission}
                            loading={commissionLoading}
                            userId={user?.user_id}
                        />
                    ) : activeTab === 'Summary' ? (
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
                            // Pass the Rows to the Allocation Tab (Allocated Value)
                            data={{ 
                                rows: byCategory[activeTab].rows, 
                                total: byCategory[activeTab].allocatedTotal 
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default BatchDetailsModal;