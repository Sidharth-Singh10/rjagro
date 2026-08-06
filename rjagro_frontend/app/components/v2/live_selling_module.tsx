'use client'
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Ban, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchFarms } from '@/app/api/farms';
import {
    fetchBatches,
    handleAddLiveBatch,
    activateLiveBatch,
    closeLiveBatch,
    addBatchTimeslot,
    fetchBatchTimeslots,
} from '@/app/api/batches';

const LiveSellingModule = () => {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const [createFarmId, setCreateFarmId] = useState<number | ''>('');
    const [createStartDate, setCreateStartDate] = useState<string>(new Date().toISOString().slice(0, 10));

    const [timeslotsFor, setTimeslotsFor] = useState<number | null>(null);
    const [actionFor, setActionFor] = useState<{ batchId: number; kind: 'activate' | 'timeslot' } | null>(null);
    const [weightInput, setWeightInput] = useState('');
    const [slotStart, setSlotStart] = useState('09:00');
    const [slotEnd, setSlotEnd] = useState('10:00');

    const { data: farms = [] } = useQuery({
        queryKey: ['farms'],
        queryFn: fetchFarms,
        staleTime: 5 * 60 * 1000,
    });

    const { data: batches = [] } = useQuery({
        queryKey: ['batches'],
        queryFn: fetchBatches,
        staleTime: 5 * 60 * 1000,
    });

    const { data: timeslots = [] } = useQuery({
        queryKey: ['timeslots', timeslotsFor],
        queryFn: () => fetchBatchTimeslots(timeslotsFor!),
        enabled: timeslotsFor !== null,
    });

    const liveBatches = batches.filter(b => b.farm);

    const onCreateBatch = () => {
        if (!createFarmId) return;
        handleAddLiveBatch(createFarmId, createStartDate, queryClient, setLoading, () => {
            setCreateFarmId('');
            setCreateStartDate(new Date().toISOString().slice(0, 10));
        });
    };

    const toggleTimeslots = (batchId: number) => {
        setTimeslotsFor(prev => (prev === batchId ? null : batchId));
        setActionFor(null);
    };

    const toggleAction = (batchId: number, kind: 'activate' | 'timeslot') => {
        setActionFor(prev => (prev && prev.batchId === batchId && prev.kind === kind ? null : { batchId, kind }));
        setTimeslotsFor(null);
        setWeightInput('');
        setSlotStart('09:00');
        setSlotEnd('10:00');
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">Live Batches</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Create live-selling batches from farms. Manage farms in the Farms section.
                </p>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <select
                        value={createFarmId}
                        onChange={(e) => setCreateFarmId(e.target.value ? Number(e.target.value) : '')}
                        className="w-64 px-3 py-2 border border-gray-300 rounded-lg text-black"
                    >
                        <option value="">Select Farm</option>
                        {farms.map(f => (
                            <option key={f.farm_id} value={f.farm_id}>{f.code} - {f.name}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={createStartDate}
                        onChange={(e) => setCreateStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-black"
                    />
                    <button
                        onClick={onCreateBatch}
                        disabled={loading || !createFarmId || !createStartDate}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        <Plus size={18} /> Create Live Batch
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farm</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Body Weight</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {liveBatches.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                    No live batches found. Create one from a farm above.
                                </td>
                            </tr>
                        ) : (
                            liveBatches.map(batch => (
                                <React.Fragment key={batch.batch_id}>
                                    <tr className="hover:bg-green-50/40">
                                        <td className="px-4 py-4 text-sm font-medium text-gray-900">#{batch.batch_id}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900">{batch.farm?.name}</td>
                                        <td className="px-4 py-4 text-sm">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                batch.status === 'Live'
                                                    ? 'bg-green-100 text-green-800'
                                                    : batch.status === 'Closed'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {batch.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900">
                                            {batch.avg_body_weight ? `${batch.avg_body_weight} kg` : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                {batch.status === 'Open' && (
                                                    <button
                                                        onClick={() => toggleAction(batch.batch_id, 'activate')}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
                                                    >
                                                        <Play size={14} /> Activate
                                                    </button>
                                                )}
                                                {batch.status !== 'Closed' && (
                                                    <>
                                                        <button
                                                            onClick={() => toggleAction(batch.batch_id, 'timeslot')}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                                                        >
                                                            <Clock size={14} /> Timeslot
                                                        </button>
                                                        <button
                                                            onClick={() => closeLiveBatch(batch.batch_id, queryClient, setLoading)}
                                                            disabled={loading}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                                                        >
                                                            <Ban size={14} /> Close
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => toggleTimeslots(batch.batch_id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-lg hover:bg-gray-700"
                                                >
                                                    {timeslotsFor === batch.batch_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    Timeslots
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Inline action row */}
                                    {actionFor && actionFor.batchId === batch.batch_id && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-3 bg-gray-50">
                                                {actionFor.kind === 'activate' ? (
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <label className="text-sm font-medium text-gray-700">Avg Body Weight (kg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={weightInput}
                                                            onChange={(e) => setWeightInput(e.target.value)}
                                                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-black"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                activateLiveBatch(batch.batch_id, Number(weightInput), queryClient, setLoading, () => setActionFor(null));
                                                            }}
                                                            disabled={loading}
                                                            className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                                                        >
                                                            <Play size={16} /> Activate Batch
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <label className="text-sm font-medium text-gray-700">Slot Start</label>
                                                        <input
                                                            type="time"
                                                            value={slotStart}
                                                            onChange={(e) => setSlotStart(e.target.value)}
                                                            className="px-3 py-2 border border-gray-300 rounded-lg text-black"
                                                        />
                                                        <label className="text-sm font-medium text-gray-700">Slot End</label>
                                                        <input
                                                            type="time"
                                                            value={slotEnd}
                                                            onChange={(e) => setSlotEnd(e.target.value)}
                                                            className="px-3 py-2 border border-gray-300 rounded-lg text-black"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                addBatchTimeslot(batch.batch_id, slotStart, slotEnd, queryClient, setLoading, () => setActionFor(null));
                                                            }}
                                                            disabled={loading}
                                                            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            <Clock size={16} /> Add Timeslot
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}

                                    {/* Inline timeslots list */}
                                    {timeslotsFor === batch.batch_id && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-3 bg-gray-50">
                                                <div className="text-sm">
                                                    {timeslots.length === 0 ? (
                                                        <span className="text-gray-500">No timeslots yet.</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {timeslots.map(ts => (
                                                                <span key={ts.timeslot_id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
                                                                    <Clock size={14} className="text-gray-400" />
                                                                    {ts.slot_start.slice(0, 5)} - {ts.slot_end.slice(0, 5)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LiveSellingModule;
