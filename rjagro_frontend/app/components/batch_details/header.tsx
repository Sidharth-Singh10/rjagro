import { Batch } from "@/app/types/interfaces";
import { ArrowLeft, Printer } from "lucide-react";

export const BatchHeader = ({ batch, onBack }: { batch: Batch; onBack: () => void }) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
            <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
                <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Batch #{batch.batch_id}
                </h1>
                <p className="text-sm text-gray-500">
                    {batch.farmer_name} • Started: {batch.start_date}
                </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${batch.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {batch.status}
            </span>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                <Printer size={18} /> Report
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Edit Batch
            </button>
        </div>
    </div>
);