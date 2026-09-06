'use client'
import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import UserSidebar from '@/app/components/user/user_sidebar';
import DashboardSkeleton from '@/app/components/utils/skeletons/dashboard';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';

// Modules are code-split: only the active section's chunk loads.
const ModuleLoading = () => (
    <div className="space-y-4 animate-pulse" aria-busy="true">
        <div className="h-10 bg-gray-200/70 rounded-lg w-1/3" />
        <div className="h-64 bg-gray-200/50 rounded-xl" />
        <div className="h-64 bg-gray-200/50 rounded-xl" />
    </div>
);

const UserRequirementsModule = dynamic(() => import('@/app/components/user/user_requirements_module'), { loading: ModuleLoading, ssr: false });
const UserBatchesModule = dynamic(() => import('@/app/components/user/user_batches_module'), { loading: ModuleLoading, ssr: false });
const UserBirdCountModule = dynamic(() => import('@/app/components/user/user_bird_count_module'), { loading: ModuleLoading, ssr: false });

const moduleImporters = [
    () => import('@/app/components/user/user_requirements_module'),
    () => import('@/app/components/user/user_batches_module'),
    () => import('@/app/components/user/user_bird_count_module'),
];

function preloadModulesOnIdle() {
    const schedule = typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb: () => void) => (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
        : (cb: () => void) => setTimeout(cb, 1500);
    schedule(() => {
        moduleImporters.forEach((load) => { load().catch(() => {}); });
    });
}

const UserDashboardContent: React.FC = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeSection, setActiveSection] = useState('Requirements');
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && user?.role === 'Admin') {
            router.push('/dashboard/v2');
        }
    }, [user, loading, router]);

    // Warm the lazy module chunks once the shell is usable.
    useEffect(() => {
        if (!loading && user && user.role !== 'Admin') {
            preloadModulesOnIdle();
        }
    }, [loading, user]);

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (user?.role === 'Admin') {
        return <DashboardSkeleton />;
    }

    const getSectionTitle = () => {
        switch (activeSection) {
            case 'Requirements':
                return { title: 'Requirements', subtitle: 'View and submit batch requirements' };
            case 'Batches':
                return { title: 'Batches', subtitle: 'View active batches and closure summaries' };
            case 'BirdCount':
                return { title: 'Bird Count', subtitle: 'Track daily bird mortality and additions' };
            default:
                return { title: 'Dashboard', subtitle: '' };
        }
    };

    const { title, subtitle } = getSectionTitle();

    return (
        <div className="flex flex-col md:flex-row h-dvh bg-gray-50 overflow-hidden">
            {/* Mobile top header */}
            <div className="md:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 flex-shrink-0">
                <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    aria-label="Open menu"
                >
                    <Menu size={22} />
                </button>
                <span className="font-bold text-lg text-green-700">RJ AGRO</span>
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
            </div>

            <UserSidebar
                activeSection={activeSection}
                onNavigate={setActiveSection}
                isMobileOpen={isMobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />

            <main className="flex-1 overflow-y-auto bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                    <div className="mb-6 md:mb-8">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                            {title}
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {subtitle}
                        </p>
                    </div>

                    {activeSection === 'Requirements' && <UserRequirementsModule />}
                    {activeSection === 'Batches' && <UserBatchesModule />}
                    {activeSection === 'BirdCount' && <UserBirdCountModule />}
                </div>
            </main>
        </div>
    );
};

const UserDashboard: React.FC = () => {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <UserDashboardContent />
        </Suspense>
    );
};

export default UserDashboard;
