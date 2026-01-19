'use client'
import AllocationsModule from '@/app/components/v2/allocations_module';
import BatchesModule from '@/app/components/v2/batches_module';
import EntitiesModule from '@/app/components/v2/entities_module';
import InventoryModule from '@/app/components/v2/inventory_module';
import { LedgerIcon, LedgerModule } from '@/app/components/v2/ledger_module';
import PurchasesModule from '@/app/components/v2/purchases_module';
import { Bird, ClipboardCheck, Package, ShoppingCartIcon, Users } from 'lucide-react';
import React, { useState } from 'react';

const NewDashboard = () => {
    const [activeSection, setActiveSection] = useState('Ledger');
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const navItems = [
        { id: 'Overview', label: 'Overview', icon: null },
        { id: 'Ledger', label: 'Finance & Ledger', icon: LedgerIcon },
        { id: 'Inventory', label: 'Inventory', icon: Package },
        { id: 'Purchases', label: 'Purchases', icon: ShoppingCartIcon },
        { id: 'Allocations', label: 'Requirements & Allocations', icon: ClipboardCheck },
        { id: 'Batches', label: 'Batches', icon: Bird },
        { id: 'Entities', label: 'Entities', icon: Users },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">

            {/* Sidebar Drawer */}
            <aside
                className={`
                    ${isSidebarOpen ? 'w-64' : 'w-20'} 
                    bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col
                `}
            >
                {/* Sidebar Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                    <span className={`font-bold text-xl text-green-700 ${!isSidebarOpen && 'hidden'}`}>RJ AGRO</span>
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-2">
                        {navItems.map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => setActiveSection(item.id)}
                                    className={`
                                        w-full flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors
                                        ${activeSection === item.id
                                            ? 'bg-green-50 text-green-700 border border-green-100'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                    `}
                                >
                                    {item.icon ? <item.icon stroke="currentColor" /> : <div className="w-5 h-5 bg-gray-200 rounded-full" />}
                                    <span className={`ml-3 whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}>{item.label}</span>

                                    {/* Active Indicator Arrow */}
                                    {activeSection === item.id && isSidebarOpen && (
                                        <div className="ml-auto text-green-600">
                                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* User Footer */}
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                            U
                        </div>
                        <div className={`ml-3 ${!isSidebarOpen && 'hidden'}`}>
                            <p className="text-sm font-medium text-gray-700">Admin User</p>
                            <p className="text-xs text-gray-500">View Profile</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {navItems.find(i => i.id === activeSection)?.label}
                        </h1>
                    </div>

                    {/* Dynamic View Rendering */}
                    {activeSection === 'Ledger' && <LedgerModule />}
                    {activeSection === 'Purchases' && <PurchasesModule />}
                    {activeSection === 'Inventory' && <InventoryModule />}
                    {activeSection === 'Allocations' && <AllocationsModule />}
                    {activeSection === 'Batches' && <BatchesModule />}
                    {activeSection === 'Entities' && <EntitiesModule />}


                </div>
            </main>
        </div>
    );
};

export default NewDashboard;