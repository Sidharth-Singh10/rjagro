'use client'
import React, { useState, useCallback, memo } from 'react';
import {
    Banknote,
    Bird,
    ClipboardCheck,
    Package,
    Receipt,
    ShoppingCartIcon,
    Users,
    ChevronLeft,
    ChevronRight,
    LucideIcon
} from 'lucide-react';

const LedgerIcon = ClipboardCheck;

interface SidebarProps {
    activeSection: string;
    onNavigate: (section: string) => void;
}

interface NavItem {
    id: string;
    label: string;
    icon: LucideIcon | React.ElementType | null;
}

const navItems: NavItem[] = [
    { id: 'Overview', label: 'Overview', icon: null },
    { id: 'Ledger', label: 'Finance & Ledger', icon: LedgerIcon },
    { id: 'Inventory', label: 'Inventory', icon: Package },
    { id: 'Purchases', label: 'Purchases', icon: ShoppingCartIcon },
    { id: 'Allocations', label: 'Allocations', icon: ClipboardCheck },
    { id: 'Batches', label: 'Batches', icon: Bird },
    { id: 'Entities', label: 'Entities', icon: Users },
    { id: 'Loan', label: 'Loan', icon: Banknote },
    { id: 'OtherExpenses', label: 'Other Expenses', icon: Receipt },
];

const Sidebar: React.FC<SidebarProps> = memo(({ activeSection, onNavigate }) => {
    const [isSidebarOpen, setSidebarOpen] = useState<boolean>(true);

    const toggleSidebar = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    const handleNavigate = useCallback((id: string) => {
        onNavigate(id);
    }, [onNavigate]);

    return (
        <aside
            className={`
                ${isSidebarOpen ? 'w-64' : 'w-20'} 
                bg-white border-r border-gray-200 flex-shrink-0 
                transition-all duration-300 ease-in-out flex flex-col relative z-20
            `}
        >
            {/* Sidebar Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 bg-white z-10">
                <span className={`font-bold text-xl text-green-700 whitespace-nowrap overflow-hidden transition-all duration-300 ${!isSidebarOpen && 'opacity-0 w-0'}`}>
                    RJ AGRO
                </span>
                <button
                    onClick={toggleSidebar}
                    className={`
                        p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors
                        ${!isSidebarOpen ? 'mx-auto' : ''}
                    `}
                    aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                    {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 py-4 overflow-visible">
                <ul className="space-y-1 px-2">
                    {navItems.map((item) => {
                        const isActive = activeSection === item.id;

                        return (
                            <li key={item.id} className="relative flex items-center">
                                <button
                                    onClick={() => handleNavigate(item.id)}
                                    className={`
                                        group flex items-center rounded-xl text-sm font-medium transition-all duration-300 ease-in-out whitespace-nowrap
                                        h-14
                                        
                                        ${isActive
                                            ? 'bg-green-100 text-green-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 bg-white'}

                                        /* Centering Logic for Icons */
                                        ${isSidebarOpen
                                            // Open: Standard padding, left align
                                            ? 'w-full px-3 justify-start'

                                            // Collapsed: Center align, remove padding, expand on hover
                                            : 'w-12 justify-center px-0 hover:w-56 hover:px-3 hover:justify-start hover:bg-gray-50 hover:shadow-xl hover:z-50 hover:border-gray-200 hover:border'
                                        }
                                    `}
                                >
                                    {/* Icon Wrapper */}
                                    <div className={`
                                        flex-shrink-0 flex items-center justify-center w-12 h-12 
                                        ${!isSidebarOpen && 'group-hover:bg-transparent'}
                                    `}>
                                        {item.icon ? (
                                            <item.icon
                                                className={`
                                                    w-5 h-5 transition-transform duration-200 group-hover:scale-110 
                                                    ${isActive ? 'text-green-600' : 'text-gray-500 group-hover:text-green-600'}
                                                `}
                                                strokeWidth={2}
                                            />
                                        ) : (
                                            <div className="w-2 h-2 bg-gray-300 rounded-full" />
                                        )}
                                    </div>

                                    {/* Label Wrapper */}
                                    <span
                                        className={`
                                            overflow-hidden transition-all duration-300 ease-in-out
                                            ${isSidebarOpen
                                                ? 'opacity-100 ml-3 max-w-[200px]'
                                                : 'opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[200px] group-hover:ml-1'
                                            }
                                        `}
                                    >
                                        {item.label}
                                    </span>

                                    {/* Active Indicator Arrow */}
                                    {isActive && isSidebarOpen && (
                                        <div className="ml-auto text-green-600 pr-1">
                                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Footer */}
            <div className="p-4 border-t border-gray-200 bg-white z-10">
                <div className="flex items-center justify-center overflow-hidden">
                    <div className="w-8 h-8 flex-shrink-0 rounded-full bg-green-600 flex items-center justify-center text-white font-bold cursor-pointer hover:ring-2 hover:ring-green-300 transition-all">
                        U
                    </div>
                    {isSidebarOpen && (
                        <div className="ml-3 transition-opacity duration-300">
                            <p className="text-sm font-medium text-gray-700 whitespace-nowrap">Admin User</p>
                            <p className="text-xs text-gray-500 whitespace-nowrap hover:text-green-600 cursor-pointer">View Profile</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
});
Sidebar.displayName = 'Sidebar';

export default Sidebar;