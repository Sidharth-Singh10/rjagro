'use client'
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import AllocationsModule from '@/app/components/v2/allocations_module';
import AppTradersModule from '@/app/components/v2/app_traders_module';
import BatchesModule from '@/app/components/v2/batches_module';
import EntitiesModule from '@/app/components/v2/entities_module';
import FarmsModule from '@/app/components/v2/farms_module';
import InventoryModule from '@/app/components/v2/inventory_module';
import { LedgerModule } from '@/app/components/v2/ledger_module';
import LoanModule from '@/app/components/v2/loan_module';
import OverviewModule from '@/app/components/v2/overview_module';
import OtherExpensesModule from '@/app/components/v2/other_expenses_module';
import PurchasesModule from '@/app/components/v2/purchases_module';
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

const SECTION_COMPONENTS: Record<string, React.FC> = {
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

    const ActiveComponent = useMemo(
        () => SECTION_COMPONENTS[activeSection] ?? null,
        [activeSection],
    );

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (user?.role !== 'Admin') {
        return <DashboardSkeleton />;
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
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