import React from 'react';
import { BatchRequirement } from '@/app/types/interfaces';
import SortableHeader from '../sortable_headers/header';
import { ActionButtons } from '../../utils/batch_requirements/action_button';

interface BatchRequirementsListProps {
    data: BatchRequirement[];
    loading: boolean;
    isAdmin: boolean;
    processingId: number | null;
    requestSort: (key: keyof BatchRequirement) => void;
    getSortIcon: (key: keyof BatchRequirement) => React.ReactNode;
    onApproveClick: (req: BatchRequirement) => void;
    onRejectClick: (req: BatchRequirement) => void;
}

export const BatchRequirementsList: React.FC<BatchRequirementsListProps> = ({
    data, loading, isAdmin, processingId, requestSort, getSortIcon, onApproveClick, onRejectClick
}) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <SortableHeader<BatchRequirement>
                            columnKey="requirement_id"
                            requestSort={requestSort}
                            getSortIcon={getSortIcon}
                            isSortable
                        >
                            ReqID
                        </SortableHeader>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Line</th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor</th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <SortableHeader columnKey="request_date" requestSort={requestSort} getSortIcon={getSortIcon} isSortable={true}>Request Date</SortableHeader>
                        {isAdmin && <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                        <tr><td colSpan={isAdmin ? 10 : 9} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                    ) : data.length === 0 ? (
                        <tr><td colSpan={isAdmin ? 10 : 9} className="px-4 py-8 text-center text-gray-500">No requirements found</td></tr>
                    ) : (
                        data.map((r) => (
                            <tr key={r.requirement_id} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{r.requirement_id}</td>
                                <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">{r.line_name}</td>
                                <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">{r.batch_id}</td>
                                <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">{r.supervisor_name}</td>
                                <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">{r.farmer_name}</td>
                                <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">{r.item_code} - {r.item_name} ({r.item_unit})</td>
                                <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{r.quantity}</td>
                                <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500">{r.request_date}</td>
                                {isAdmin && (
                                    <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                                        <ActionButtons
                                            requirement={r}
                                            processingId={processingId}
                                            onApprove={onApproveClick}
                                            onReject={onRejectClick}
                                        />
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};