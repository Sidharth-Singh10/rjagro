import React from 'react';
import { Inbox,  Edit } from 'lucide-react';
import { Trader } from '@/app/types/interfaces';

interface TradersListProps {
    traders: Trader[];
    loading: boolean;
    onRowClick: (trader: Trader) => void;

}

const TradersList: React.FC<TradersListProps> = ({ traders, loading, onRowClick }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        {['Trader ID', 'Name', 'Amount Due', 'Phone Number', 'Address', 'Bank Account No', 'Bank Name', 'IFSC Code', 'Created At', 'Actions'].map((header) => (
                            <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                        <tr>
                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                        </tr>
                    ) : traders.length === 0 ? (
                        <tr>
                            <td colSpan={10} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No traders found</p>
                                </td>
                        </tr>
                    ) : (
                        traders.map((trader) => (
                            <tr key={trader.trader_id} onClick={() => onRowClick(trader)} className="hover:bg-gray-50">
                                <td className="px-4 py-4 text-sm text-gray-900">{trader.trader_id}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{trader.name}</td>
                                <td className={`px-4 py-4 text-sm font-medium ${parseFloat(trader.amount_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {trader.amount_due}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900">{trader.phone_number}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{trader.address}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{trader.bank_account_no}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{trader.bank_name}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{trader.ifsc_code}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{trader.created_at}</td>
                                <td className="px-4 py-4 text-sm text-gray-500">
                                    <button className="text-green-600 hover:text-green-700">
                                        <Edit size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default TradersList;