'use client'
import React, { useEffect, useState, Suspense } from 'react';
import UserSidebar from '@/app/components/user/user_sidebar';
import UserRequirementsModule from '@/app/components/user/user_requirements_module';
import UserBirdCountModule from '@/app/components/user/user_bird_count_module';
import UserBatchesModule from '@/app/components/user/user_batches_module';
import DashboardSkeleton from '@/app/components/utils/skeletons/dashboard';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';

const UserDashboardContent: React.FC = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeSection, setActiveSection] = useState('Requirements');

    useEffect(() => {
        // If user is admin, redirect to admin dashboard
        if (!loading && user?.role === 'Admin') {
            router.push('/dashboard/v2');
        }
    }, [user, loading, router]);

    // Show loading while checking auth
    if (loading) {
        return <DashboardSkeleton />;
    }

    // Don't render if admin (will redirect)
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
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <UserSidebar
                activeSection={activeSection}
                onNavigate={setActiveSection}
            />

            <main className="flex-1 overflow-y-auto bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">
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
