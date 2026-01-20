import { useState } from "react";
import { handleAddBatchSale } from "@/app/api/batch_sales";
import { BatchSale, BatchSalePayload, Trader } from "@/app/types/interfaces";
import BatchSalesHeader from "./header";
import BatchSalesList from "./list";
import AddBatchSaleModal from "./add";

interface BatchSalesTableProps {
    batchSales: BatchSale[];
    traders: Trader[];
    loading: boolean;
    batchId: number;
    queryClient: any;
    batchStatus: string;
}

const BatchSalesTable: React.FC<BatchSalesTableProps> = ({
    batchSales,
    traders,
    loading,
    batchId,
    queryClient,
    batchStatus,
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateSale = async (payload: BatchSalePayload) => {
        await handleAddBatchSale(
            payload,
            queryClient,
            setIsSubmitting,
            () => {
                setIsModalOpen(false);
            }
        );
    };

    if (batchStatus !== "closed") {
        return (
            <div className="bg-white rounded-lg shadow p-8 flex flex-col items-center justify-center">
                <h3 className="text-lg font-semibold text-gray-800">
                    Sales Not Available
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                    This batch is currently not closed.
                    Sales can only be added after the batch is closed.
                </p>
            </div>
        );
    }


    return (
        <div className="bg-white rounded-lg shadow relative">
            <BatchSalesHeader onAddClick={() => setIsModalOpen(true)} />

            <BatchSalesList
                batchSales={batchSales}
                traders={traders}
                loading={loading}
            />

            <AddBatchSaleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateSale}
                isSubmitting={isSubmitting}
                batchId={batchId}
                traders={traders}
            />
        </div>
    );
};

export default BatchSalesTable;