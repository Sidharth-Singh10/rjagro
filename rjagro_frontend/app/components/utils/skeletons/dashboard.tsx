import React from 'react';

const DashboardSkeleton = () => {
    // Helper to create repeating table rows
    const TableRowSkeleton = () => (
        <div className="flex items-center justify-between py-4 border-b border-gray-100">
            {/* We use varying widths to simulate different data types (IDs, names, dates, badges) */}
            <div className="h-5 w-10 bg-gray-200 rounded"></div> {/* Batch ID */}
            <div className="h-5 w-8 bg-gray-200 rounded"></div>  {/* Line ID */}
            <div className="h-5 w-16 bg-gray-200 rounded"></div> {/* Supervisor */}
            <div className="h-5 w-32 bg-gray-200 rounded"></div> {/* Farmer Name (longer) */}
            <div className="h-5 w-24 bg-gray-200 rounded"></div> {/* Date */}
            <div className="h-5 w-16 bg-gray-200 rounded"></div> {/* Number */}
            <div className="h-5 w-16 bg-gray-200 rounded"></div> {/* Number */}
            <div className="h-6 w-12 bg-gray-200 rounded-full"></div> {/* Mortality Badge */}
            <div className="h-6 w-14 bg-gray-200 rounded-full"></div> {/* Status Badge */}
            <div className="h-5 w-40 bg-gray-200 rounded"></div> {/* Created At timestamp */}
        </div>
    );

    return (
        // animate-pulse creates the shimmering effect
        <div className="flex h-screen bg-gray-50 overflow-hidden animate-pulse">

            {/* --- Sidebar Skeleton --- */}
            <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-full p-6 justify-between">
                <div>
                    {/* Logo/Brand area */}
                    <div className="h-8 w-32 bg-gray-200 rounded mb-12"></div>

                    {/* Navigation Links */}
                    <div className="space-y-8">
                        {/* Simulating 7 navigation items */}
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <div className="h-6 w-6 bg-gray-200 rounded"></div> {/* Icon placeholder */}
                                <div className="h-5 w-32 bg-gray-200 rounded"></div> {/* Text placeholder */}
                            </div>
                        ))}
                    </div>
                </div>

                {/* User Profile Area at bottom sidebar */}
                <div className="flex items-center space-x-4 pt-6 border-t border-gray-100">
                    <div className="h-12 w-12 bg-gray-300 rounded-full"></div> {/* Avatar */}
                    <div className="space-y-2">
                        <div className="h-5 w-24 bg-gray-200 rounded"></div> {/* Name */}
                        <div className="h-4 w-20 bg-gray-200 rounded"></div> {/* Link text */}
                    </div>
                </div>
            </aside>

            {/* --- Main Content Area Skeleton --- */}
            <main className="flex-1 overflow-y-auto bg-gray-50">
                <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

                    {/* Page Header ("Batches") */}
                    <div>
                        <div className="h-10 w-48 bg-gray-200 rounded mb-2"></div>
                    </div>

                    {/* Tabs Navigation ("Active Batches", "Batch Closures") */}
                    <div className="flex space-x-8 border-b border-gray-200 pb-4">
                        <div className="h-6 w-32 bg-gray-200 rounded"></div>
                        <div className="h-6 w-32 bg-gray-200 rounded"></div>
                    </div>

                    {/* Main Table Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">

                        {/* Card Header & Add Button */}
                        <div className="flex justify-between items-center mb-8">
                            <div className="h-8 w-32 bg-gray-200 rounded"></div> {/* Table Title */}
                            <div className="h-10 w-28 bg-gray-200 rounded-md"></div> {/* Add Button */}
                        </div>

                        {/* The Table Content */}
                        <div className="space-y-4">
                            {/* Table Headers Row */}
                            <div className="flex justify-between pb-4 border-b border-gray-100 mb-2 px-2">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="h-4 w-16 bg-gray-300 rounded"></div>
                                ))}
                            </div>

                            {/* Table Data Rows - Render 8 rows */}
                            <div className="px-2 space-y-4">
                                {[...Array(8)].map((_, index) => (
                                    <TableRowSkeleton key={index} />
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default DashboardSkeleton;