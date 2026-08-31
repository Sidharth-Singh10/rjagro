import { AppTrader, BatchSale, Trader } from "@/app/types/interfaces";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BatchSalesListProps {
    batchSales: BatchSale[];
    traders: Trader[];
    appTraders: AppTrader[];
    loading: boolean;
}

const BatchSalesList: React.FC<BatchSalesListProps> = ({
    batchSales,
    traders,
    appTraders,
    loading,
}) => {
    const traderName = (sale: BatchSale): string => {
        if (sale.app_trader_id) {
            return appTraders.find((t) => t.id === sale.app_trader_id)?.name || "Unknown Trader";
        }
        return traders.find((t) => t.trader_id === sale.trader_id)?.name || "Unknown Trader";
    };
    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trader</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Weight</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : batchSales.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No batch sales found</td>
                            </tr>
                        ) : (
                            batchSales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">#{sale.id}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div>
                                            <div className="font-medium">{sale.item_code}</div>
                                            <div className="text-gray-500 text-xs">{sale.item_name}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {traderName(sale)}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{sale.avg_weight}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{sale.rate}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{sale.quantity}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">₹{sale.value}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(sale.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">Showing {batchSales.length} results</div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </>
    );
};

export default BatchSalesList;