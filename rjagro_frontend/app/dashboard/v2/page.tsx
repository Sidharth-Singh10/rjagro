'use client'
import React, { useState } from 'react';
import AllocationsModule from '@/app/components/v2/allocations_module';
import BatchesModule from '@/app/components/v2/batches_module';
import EntitiesModule from '@/app/components/v2/entities_module';
import InventoryModule from '@/app/components/v2/inventory_module';
import { LedgerModule } from '@/app/components/v2/ledger_module';
import PurchasesModule from '@/app/components/v2/purchases_module';
import Sidebar from '@/app/components/v2/side_bar';


const NewDashboard: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string>('Ledger');

    const getTitle = (id: string): string => {
        switch (id) {
            case 'Overview': return 'Overview';
            case 'Ledger': return 'Finance & Ledger';
            case 'Inventory': return 'Inventory';
            case 'Purchases': return 'Purchases';
            case 'Allocations': return 'Allocations';
            case 'Batches': return 'Batches';
            case 'Entities': return 'Entities';
            default: return 'Dashboard';
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">

            <Sidebar
                activeSection={activeSection}
                onNavigate={setActiveSection}
            />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {getTitle(activeSection)}
                        </h1>
                    </div>

                    {/* Dynamic View Rendering */}
                    {activeSection === 'Ledger' && <LedgerModule />}
                    {activeSection === 'Purchases' && <PurchasesModule />}
                    {activeSection === 'Inventory' && <InventoryModule />}
                    {activeSection === 'Allocations' && <AllocationsModule />}
                    {activeSection === 'Batches' && <BatchesModule />}
                    {activeSection === 'Entities' && <EntitiesModule />}

                    {/* Placeholder for Overview */}
                    {activeSection === 'Overview' && (
                        <div className="p-4 bg-white rounded-lg shadow text-gray-500">
                            Overview Dashboard Coming Soon
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default NewDashboard;