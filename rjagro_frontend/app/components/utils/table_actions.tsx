import React, { useState, memo } from 'react';
import { MoreVertical } from 'lucide-react';

interface ActionItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    className?: string;
    variant?: 'default' | 'danger';
}

interface TableActionsDropdownProps {
    actions: ActionItem[];
    rowId: number | string;
    openMenuId?: number | string | null;
    onMenuToggle?: (id: number | string | null) => void;
}

const TableActionsDropdown: React.FC<TableActionsDropdownProps> = memo(({
    actions,
    rowId,
    openMenuId,
    onMenuToggle,
}) => {
    const [internalOpenMenuId, setInternalOpenMenuId] = useState<number | string | null>(null);

    // Use external state if provided, otherwise use internal state
    const isOpen = openMenuId !== undefined ? openMenuId === rowId : internalOpenMenuId === rowId;
    const setIsOpen = onMenuToggle || setInternalOpenMenuId;

    const handleToggle = () => {
        setIsOpen(isOpen ? null : rowId);
    };

    const handleActionClick = (action: ActionItem) => {
        action.onClick();
        setIsOpen(null);
    };

    const getActionClassName = (action: ActionItem) => {
        const baseClass = "w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2";

        if (action.className) {
            return `${baseClass} ${action.className}`;
        }

        if (action.variant === 'danger') {
            return `${baseClass} text-red-600`;
        }

        return `${baseClass} text-gray-700`;
    };

    return (
        <div className="relative">
            <button
                onClick={handleToggle}
                className="px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <MoreVertical size={16} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop to close menu when clicking outside */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(null)}
                    />

                    {/* Dropdown menu */}
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-20">
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => handleActionClick(action)}
                                className={getActionClassName(action)}
                            >
                                {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
                                <span>{action.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
});
TableActionsDropdown.displayName = 'TableActionsDropdown';

export default TableActionsDropdown;