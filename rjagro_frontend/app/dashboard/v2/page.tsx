'use client'
import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/app/components/v2/side_bar';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardSkeleton from '@/app/components/utils/skeletons/dashboard';
import { useAuth } from '@/app/hooks/useAuth';

const SECTION_TITLES: Record<string, string> = {
    Overview: 'Overview',
    Ledger: 'Finance & Ledger',
    Inventory: 'Inventory',
    Purchases: 'Purchases',
    Allocations: 'Allocations',
    Batches: 'Batches',
    Farms: 'Farms',
    Entities: 'Entities',
    AppTraders: 'App Traders',
    Loan: 'Loan',
    OtherExpenses: 'Other Expenses',
};

// Placeholder shown while a module chunk is being fetched.
const ModuleLoading = () => (
    <div className="space-y-4 animate-pulse" aria-busy="true">
        <div className="h-10 bg-gray-200/70 rounded-lg w-1/3" />
        <div className="h-64 bg-gray-200/50 rounded-xl" />
        <div className="h-64 bg-gray-200/50 rounded-xl" />
    </div>
);

// Each module is code-split: only the chunk for the active section loads.
const OverviewModule = dynamic(() => import('@/app/components/v2/overview_module'), { loading: ModuleLoading, ssr: false });
const LedgerModule = dynamic(() => import('@/app/components/v2/ledger_module').then(m => m.LedgerModule), { loading: ModuleLoading, ssr: false });
const PurchasesModule = dynamic(() => import('@/app/components/v2/purchases_module'), { loading: ModuleLoading, ssr: false });
const InventoryModule = dynamic(() => import('@/app/components/v2/inventory_module'), { loading: ModuleLoading, ssr: false });
const AllocationsModule = dynamic(() => import('@/app/components/v2/allocations_module'), { loading: ModuleLoading, ssr: false });
const BatchesModule = dynamic(() => import('@/app/components/v2/batches_module'), { loading: ModuleLoading, ssr: false });
const FarmsModule = dynamic(() => import('@/app/components/v2/farms_module'), { loading: ModuleLoading, ssr: false });
const EntitiesModule = dynamic(() => import('@/app/components/v2/entities_module'), { loading: ModuleLoading, ssr: false });
const AppTradersModule = dynamic(() => import('@/app/components/v2/app_traders_module'), { loading: ModuleLoading, ssr: false });
const LoanModule = dynamic(() => import('@/app/components/v2/loan_module'), { loading: ModuleLoading, ssr: false });
const OtherExpensesModule = dynamic(() => import('@/app/components/v2/other_expenses_module'), { loading: ModuleLoading, ssr: false });

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
    Overview: OverviewModule,
    Ledger: LedgerModule,
    Purchases: PurchasesModule,
    Inventory: InventoryModule,
    Allocations: AllocationsModule,
    Batches: BatchesModule,
    Farms: FarmsModule,
    Entities: EntitiesModule,
    AppTraders: AppTradersModule,
    Loan: LoanModule,
    OtherExpenses: OtherExpensesModule,
};

// Same dynamic imports as above — calling them warms the chunk cache
// so switching tabs is instant.
const moduleImporters = [
    () => import('@/app/components/v2/overview_module'),
    () => import('@/app/components/v2/ledger_module'),
    () => import('@/app/components/v2/purchases_module'),
    () => import('@/app/components/v2/inventory_module'),
    () => import('@/app/components/v2/allocations_module'),
    () => import('@/app/components/v2/batches_module'),
    () => import('@/app/components/v2/farms_module'),
    () => import('@/app/components/v2/entities_module'),
    () => import('@/app/components/v2/app_traders_module'),
    () => import('@/app/components/v2/loan_module'),
    () => import('@/app/components/v2/other_expenses_module'),
];

function preloadModulesOnIdle() {
    const schedule = typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb: () => void) => (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
        : (cb: () => void) => setTimeout(cb, 1500);
    schedule(() => {
        moduleImporters.forEach((load) => { load().catch(() => {}); });
    });
}

const DashboardContent: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string>('Ledger');
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams.get("tab");
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user && user.role !== 'Admin') {
            router.push('/dashboard/user');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (tabFromUrl) {
            setActiveSection(tabFromUrl);
        }
    }, [tabFromUrl]);

    // Warm the lazy module chunks once the shell is usable.
    useEffect(() => {
        if (!loading && user?.role === 'Admin') {
            preloadModulesOnIdle();
        }
    }, [loading, user]);

    const ActiveComponent = SECTION_COMPONENTS[activeSection] ?? null;

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (user?.role !== 'Admin') {
        return <DashboardSkeleton />;
    }

    return (
        <div className="flex h-dvh bg-gray-50 overflow-hidden">
            <Sidebar
                activeSection={activeSection}
                onNavigate={setActiveSection}
            />

            <main className="flex-1 overflow-y-auto bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {SECTION_TITLES[activeSection] ?? 'Dashboard'}
                        </h1>
                    </div>

                    {ActiveComponent && <ActiveComponent />}
                </div>
            </main>
        </div>
    );
};

const NewDashboard: React.FC = () => {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent />
        </Suspense>
    );
};

export default NewDashboard;