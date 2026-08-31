import { useState } from "react";
import { handleAddBatchSale } from "@/app/api/batch_sales";
import { AppTrader, BatchSale, BatchSalePayload, Trader } from "@/app/types/interfaces";
import BatchSalesHeader from "./header";
import BatchSalesList from "./list";
import AddBatchSaleModal from "./add";

interface BatchSalesTableProps {
    batchSales: BatchSale[];
    traders: Trader[];
    appTraders: AppTrader[];
    loading: boolean;
    batchId: number;
    queryClient: any;
}

const BatchSalesTable: React.FC<BatchSalesTableProps> = ({
    batchSales,
    traders,
    appTraders,
    loading,
    batchId,
    queryClient,
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateSale = async (payload: BatchSalePayload) => {
        await handleAddBatchSale(
            payload,
            queryClient,
            setIsSubmitting,
        );
    };

    return (
        <div className="bg-white rounded-lg shadow relative">
            <BatchSalesHeader onAddClick={() => setIsModalOpen(true)} />

            <BatchSalesList
                batchSales={batchSales}
                traders={traders}
                appTraders={appTraders}
                loading={loading}
            />

            <AddBatchSaleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateSale}
                isSubmitting={isSubmitting}
                batchId={batchId}
                traders={traders}
                appTraders={appTraders}
            />
        </div>
    );
};

export default BatchSalesTable;