'use client'
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox,  Plus, X, Save, MapPin, Video } from 'lucide-react';
import { fetchFarms, handleAddFarm } from '@/app/api/farms';
import { fetchFarmers } from '@/app/api/farmers';
import { handleAddLiveBatch } from '@/app/api/batches';
import { FarmPayload } from '@/app/types/interfaces';
import CalendarPicker from '@/app/components/v2/calendar_picker';

const emptyFarm: FarmPayload = {
    farmer_id: '',
    code: '',
    name: '',
    location: '',
    video_url: '',
    gmaps_url: '',
};

const FarmsModule = () => {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [showAddFarm, setShowAddFarm] = useState(false);
    const [newFarm, setNewFarm] = useState<FarmPayload>(emptyFarm);
    const [batchFarm, setBatchFarm] = useState<number | null>(null);

    const { data: farms = [] } = useQuery({
        queryKey: ['farms'],
        queryFn: fetchFarms,
        staleTime: 5 * 60 * 1000,
    });

    const { data: farmers = [] } = useQuery({
        queryKey: ['farmers'],
        queryFn: fetchFarmers,
        staleTime: 5 * 60 * 1000,
    });

    const onAddFarm = () => {
        handleAddFarm(newFarm, queryClient, setLoading, () => {
            setNewFarm(emptyFarm);
            setShowAddFarm(false);
        });
    };

    const onSelectBatchDate = (date: string) => {
        if (batchFarm === null) return;
        const farmId = batchFarm;
        setBatchFarm(null);
        handleAddLiveBatch(farmId, date, queryClient, setLoading);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">Farms</h2>
                <button
                    onClick={() => setShowAddFarm(prev => !prev)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    {showAddFarm ? <X size={18} /> : <Plus size={18} />}
                    {showAddFarm ? 'Close' : 'Add Farm'}
                </button>
            </div>

            {showAddFarm && (
                <div className="p-4 border-b bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-gray-900">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Farmer *</label>
                            <select
                                value={newFarm.farmer_id}
                                onChange={(e) => setNewFarm(prev => ({ ...prev, farmer_id: Number(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Select Farmer</option>
                                {farmers.map(f => (
                                    <option key={f.farmer_id} value={f.farmer_id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                            <input
                                type="text"
                                value={newFarm.code}
                                onChange={(e) => setNewFarm(prev => ({ ...prev, code: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="e.g. FARM-001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input
                                type="text"
                                value={newFarm.name}
                                onChange={(e) => setNewFarm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                                type="text"
                                value={newFarm.location}
                                onChange={(e) => setNewFarm(prev => ({ ...prev, location: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="e.g. Village, District, State"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                            <input
                                type="text"
                                value={newFarm.video_url}
                                onChange={(e) => setNewFarm(prev => ({ ...prev, video_url: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">GMaps URL</label>
                            <input
                                type="text"
                                value={newFarm.gmaps_url}
                                onChange={(e) => setNewFarm(prev => ({ ...prev, gmaps_url: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={onAddFarm}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                <Save size={18} /> Save Farm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Media</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {farms.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No farms found</p>
                                </td>
                            </tr>
                        ) : (
                            farms.map(farm => {
                                const farmer = farmers.find(f => f.farmer_id === farm.farmer_id);
                                return (
                                    <tr key={farm.farm_id} className="hover:bg-green-50/40">
                                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{farm.code}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900">{farm.name}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900">{farmer?.name ?? farm.farmer_id}</td>
                                        <td className="px-4 py-4 text-sm text-gray-500">
                                            {farm.location || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-3">
                                                {farm.gmaps_url && (
                                                    <a href={farm.gmaps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-700 hover:underline">
                                                        <MapPin size={14} /> Maps
                                                    </a>
                                                )}
                                                {farm.video_url && (
                                                    <a href={farm.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-700 hover:underline">
                                                        <Video size={14} /> Video
                                                    </a>
                                                )}
                                                {!farm.gmaps_url && !farm.video_url && '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <button
                                                onClick={() => setBatchFarm(farm.farm_id)}
                                                disabled={loading}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                                            >
                                                <Plus size={14} /> Create Batch
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {batchFarm !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setBatchFarm(null)} />
                    <div className="relative">
                        <CalendarPicker onConfirm={onSelectBatchDate} onClose={() => setBatchFarm(null)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default FarmsModule;
