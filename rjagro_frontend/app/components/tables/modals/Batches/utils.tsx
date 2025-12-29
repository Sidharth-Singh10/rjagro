'use client'
import React, { useMemo, useState, useEffect } from 'react';
import { X, Save, IndianRupee, Lock } from 'lucide-react';
import { Batch, BatchAllocation, BatchAllocationLine, BatchClosurePayload, BatchRequirement, CreateFarmerCommission, FarmerCommissionHistory } from '@/app/types/interfaces';
import { useAuth } from '@/app/hooks/useAuth';


export interface BatchDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: Batch;
    batchAllocations: BatchAllocation[];
    requirements: BatchRequirement[];
    commissionHistory?: FarmerCommissionHistory[];
    onAddCommission?: (commission: CreateFarmerCommission) => Promise<void>;
    commissionLoading?: boolean;
    onCloseBatch?: (batchClosure: BatchClosurePayload) => Promise<void>;
    batchClosureLoading?: boolean;
}

export interface AllocationsTabProps {
    activeTab: 'Feed' | 'Chicks' | 'Medicine';
    data: { rows: any[]; total: number };
}

export interface FarmerCommissionTabProps {
    batch: Batch;
    commissionHistory: FarmerCommissionHistory[];
    totalCommission: number;
    onAddCommission?: (commission: CreateFarmerCommission) => Promise<void>;
    loading: boolean;
    userId?: number;
}

export interface SummaryTabProps {
    batch: Batch;
    byCategory: any;
    farmerCommissionData: { history: FarmerCommissionHistory[]; total: number };
    totalExpenses: number;
    onCloseBatch?: (batchClosure: BatchClosurePayload) => Promise<void>;
    loading: boolean;
}

// --- Helper Functions ---

export const parseNumberSafe = (v: string | number | undefined) => {
    if (v === undefined || v === null || v === '') return 0;
    if (typeof v === 'number') return v;
    const cleaned = (v as string).toString().replace(/,/g, '').trim();
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
};

export const classifyName = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('feed')) return 'Feed';
    if (n.includes('chick')) return 'Chicks';
    if (n.includes('medicine')) return 'Medicine';
    // fallback: put into Feed by default (change if you have categories)
    return 'Feed';
};