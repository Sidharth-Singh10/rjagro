// 'use client';
import React, { useState } from 'react';
import { NewTrader, Trader } from '@/app/types/interfaces';
import TradersHeader from './trader_header';
import AddTraderForm from './addform';
import TradersList from './trader_list';
import { TraderDetailsModal } from './trader_details_modal';


interface TradersTableProps {
    traders: Trader[];
    loading: boolean;
    showAddForm: boolean;
    newTrader: NewTrader;
    setShowAddForm: (show: boolean) => void;
    setNewTrader: React.Dispatch<React.SetStateAction<NewTrader>>;
    handleAddTrader: () => void;
}

const TradersTable: React.FC<TradersTableProps> = ({
    traders,
    loading,
    showAddForm,
    newTrader,
    setShowAddForm,
    setNewTrader,
    handleAddTrader,
}) => {
    const [selectedTraderId, setSelectedTraderId] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleRowClick = (trader: Trader) => {

        setSelectedTraderId(Number(trader.trader_id));
        setIsModalOpen(true);
    };

    return (
        <div className="bg-white rounded-lg shadow">

            <TradersHeader onAddClick={() => setShowAddForm(true)} />

            {showAddForm && (
                <AddTraderForm
                    newTrader={newTrader}
                    setNewTrader={setNewTrader}
                    onSave={handleAddTrader}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            <TradersList
                traders={traders}
                loading={loading}
                onRowClick={handleRowClick}
            />

            <TraderDetailsModal
                isOpen={isModalOpen}
                traderId={selectedTraderId}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default TradersTable;