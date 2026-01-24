'use client'
import React, { useState } from 'react';
import {
    ClipboardCheck,
    ChevronLeft,
    ChevronRight,
    LucideIcon,
    LogOut,
    Bird,
    Layers
} from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface UserSidebarProps {
    activeSection: string;
    onNavigate: (section: string) => void;
}

interface NavItem {
    id: string;
    label: string;
    icon: LucideIcon | React.ElementType | null;
}

const UserSidebar: React.FC<UserSidebarProps> = ({ activeSection, onNavigate }) => {
    const [isSidebarOpen, setSidebarOpen] = useState<boolean>(true);
    const { user, logout } = useAuth();
    const router = useRouter();

    const navItems: NavItem[] = [
        { id: 'Requirements', label: 'Requirements', icon: ClipboardCheck },
        { id: 'Batches', label: 'Batches', icon: Layers },
        { id: 'BirdCount', label: 'Bird Count', icon: Bird },
    ];

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

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
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
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
                                    onClick={() => onNavigate(item.id)}
                                    className={`
                                        group flex items-center rounded-xl text-sm font-medium transition-all duration-300 ease-in-out whitespace-nowrap
                                        h-14
                                        
                                        ${isActive
                                            ? 'bg-green-100 text-green-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 bg-white'}

                                        /* Centering Logic for Icons */
                                        ${isSidebarOpen
                                            ? 'w-full px-3 justify-start'
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
                <div className="flex items-center justify-between overflow-hidden">
                    <div className="flex items-center">
                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {isSidebarOpen && (
                            <div className="ml-3 transition-opacity duration-300">
                                <p className="text-sm font-medium text-gray-700 whitespace-nowrap">{user?.name || 'User'}</p>
                                <p className="text-xs text-gray-500 whitespace-nowrap">{user?.role || 'Staff'}</p>
                            </div>
                        )}
                    </div>
                    {isSidebarOpen && (
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default UserSidebar;
