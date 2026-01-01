import React from 'react';
import { Filter, Plus } from 'lucide-react';

interface TradersHeaderProps {
    onAddClick: () => void;
}

const TradersHeader: React.FC<TradersHeaderProps> = ({ onAddClick }) => {
    return (
        <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Traders</h2>
            <div className="flex items-center gap-3">
                <button
                    onClick={onAddClick}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Plus size={18} />
                    Add Trader
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Filter size={18} />
                    Filters
                </button>
            </div>
        </div>
    );
};

export default TradersHeader;