import React from 'react';

export function BatchDetailsSkeleton() {
    return (
        <div className="min-h-dvh bg-gray-50 p-6 ">
            <div className="flex justify-between items-center mb-6">
                <div className="h-8 w-1/3 bg-gray-200 rounded-md"></div>
                <div className="h-10 w-24 bg-gray-200 rounded-md"></div>
            </div>

            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-32 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                            <div className="h-8 w-8 bg-gray-100 rounded-full"></div>
                        </div>
                        <div>
                            <div className="h-8 w-32 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 w-20 bg-gray-100 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tab Area Skeleton */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
                <div className="border-b px-4 py-4 flex gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-6 w-24 bg-gray-200 rounded"></div>
                    ))}
                </div>
                <div className="p-8 space-y-4">
                    <div className="h-10 w-full bg-gray-100 rounded"></div>
                    <div className="h-10 w-full bg-gray-100 rounded"></div>
                    <div className="h-10 w-full bg-gray-100 rounded"></div>
                    <div className="h-10 w-full bg-gray-100 rounded"></div>
                </div>
            </div>
        </div>
    );
}