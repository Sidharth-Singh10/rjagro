'use client'
import React, { useState } from 'react';
import { Inbox,  Filter, ChevronLeft, ChevronRight, Plus, X, Save, DollarSign } from 'lucide-react';
import { LedgerAccount, LedgerEntry, LedgerEntryPayload, NewLedgerEntry } from '@/app/types/interfaces';
import { capitalizeWords } from '@/app/utils/helper';
import { useLedgerEntriesSorting } from '@/app/hooks/custom_sorting';
import SortableHeader from './sortable_headers/header';

interface LedgerEntriesTableProps {
    ledgerEntries: LedgerEntry[];
    ledgerAccounts: LedgerAccount[];
    loading: boolean;
    showAddForm: boolean;
    newLedgerEntry: NewLedgerEntry;
    setShowAddForm: (show: boolean) => void;
    setNewLedgerEntry: React.Dispatch<React.SetStateAction<NewLedgerEntry>>;
    handleAddLedgerEntry: (entry: LedgerEntryPayload) => void;
}

const LedgerEntriesTable: React.FC<LedgerEntriesTableProps> = ({
    ledgerEntries,
    ledgerAccounts,
    loading,
    showAddForm,
    newLedgerEntry,
    setShowAddForm,
    setNewLedgerEntry,
    handleAddLedgerEntry,
}) => {
    const { sortedData, requestSort, getSortIcon } = useLedgerEntriesSorting(ledgerEntries);

    const getAccountDetails = (account_id: number) => {
        const account = ledgerAccounts.find(acc => acc.account_id === account_id);
        return account ? { name: account.name, type: account.account_type } : { name: '-', type: '-' };
    };
    const [transactionType, setTransactionType] = useState<'debit' | 'credit' | ''>('');
    const formatCurrency = (amount?: number) => {
        if (!amount || isNaN(amount)) return '-';
        return `₹${Number(amount).toFixed(2)}`;
    };

    const getAccountTypeColor = (accountType?: string) => {
        switch (accountType?.toLowerCase()) {
            case 'asset':
                return 'bg-blue-100 text-blue-800';
            case 'liability':
                return 'bg-orange-100 text-orange-800';
            case 'equity':
                return 'bg-purple-100 text-purple-800';
            case 'revenue':
                return 'bg-green-100 text-green-800';
            case 'expense':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const resetForm = () => {
        setNewLedgerEntry({
            account_id: '',
            debit: '',
            credit: '',
            txn_date: new Date().toISOString().slice(0, 10),
            reference_table: '',
            reference_id: '',
            narration: ''
        });
    };

    const handleFormClose = () => {
        setShowAddForm(false);
        resetForm();
    };

    const getAmountColor = (accountType?: string, amountType?: 'debit' | 'credit', amount?: number) => {
        if (!amount || amount === 0) return 'text-gray-400';

        switch (accountType?.toLowerCase()) {
            case 'asset':
            case 'expense':
                return amountType === 'debit' ? 'text-green-600' : 'text-red-600';
            case 'liability':
            case 'equity':
            case 'revenue':
                return amountType === 'debit' ? 'text-red-600' : 'text-green-600';
            default:
                return 'text-gray-600';
        }
    };

    const handleAddLedgerEntryWithValidation = () => {
        // Validate required fields
        if (!newLedgerEntry.account_id) {
            alert('Please select an account');
            return;
        }
        if (!newLedgerEntry.txn_date) {
            alert('Please select a transaction date');
            return;
        }
        if (!newLedgerEntry.debit && !newLedgerEntry.credit) {
            alert('Please enter either debit or credit amount');
            return;
        }
        if (newLedgerEntry.debit && newLedgerEntry.credit) {
            alert('Please enter either debit OR credit, not both');
            return;
        }

        const entryToSend: LedgerEntryPayload = {
            account_id: Number(newLedgerEntry.account_id),
            debit: newLedgerEntry.debit ? Number(newLedgerEntry.debit) : undefined,
            credit: newLedgerEntry.credit ? Number(newLedgerEntry.credit) : undefined,
            txn_date: newLedgerEntry.txn_date,
            reference_table: newLedgerEntry.reference_table || undefined,
            reference_id: newLedgerEntry.reference_id ? Number(newLedgerEntry.reference_id) : undefined,
            narration: newLedgerEntry.narration || undefined,
        };

        handleAddLedgerEntry(entryToSend);
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-green-600" />
                    <h2 className="text-xl font-semibold text-gray-800">Ledger Entries</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Plus size={18} />
                        Add Entry
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </div>

            {/* Add Ledger Entry Form */}
            {showAddForm && (
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Add New Ledger Entry</h3>
                        <button
                            onClick={handleFormClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4 text-gray-900">
                        {/* Info Note */}
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-gray-700">
                            <p><strong>Assets & Expenses</strong> → Debit increases, Credit decreases</p>
                            <p><strong>Liabilities, Capital & Incomes</strong> → Credit increases, Debit decreases</p>
                        </div>

                        {/* Row 1: Account and Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Required Field - Account */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account *
                                </label>
                                <select
                                    value={newLedgerEntry.account_id}
                                    onChange={(e) => setNewLedgerEntry(prev => ({
                                        ...prev,
                                        account_id: e.target.value === '' ? '' : Number(e.target.value)
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="">Select Account</option>
                                    {ledgerAccounts.map((account) => (
                                        <option key={account.account_id} value={account.account_id.toString()}>
                                            {account.name} ({account.account_type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Required Field - Transaction Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Transaction Date *
                                </label>
                                <input
                                    type="date"
                                    value={newLedgerEntry.txn_date}
                                    onChange={(e) => setNewLedgerEntry(prev => ({
                                        ...prev,
                                        txn_date: e.target.value
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Row 2: Transaction Type and Amount */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Transaction Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Transaction Type *
                                </label>
                                <select
                                    value={transactionType}
                                    onChange={(e) => {
                                        const type = e.target.value as 'debit' | 'credit' | '';
                                        setTransactionType(type);

                                        if (type === 'debit') {
                                            setNewLedgerEntry(prev => ({
                                                ...prev,
                                                debit: prev.credit || prev.debit || '', // Preserve existing amount
                                                credit: ''
                                            }));
                                        } else if (type === 'credit') {
                                            setNewLedgerEntry(prev => ({
                                                ...prev,
                                                credit: prev.debit || prev.credit || '', // Preserve existing amount
                                                debit: ''
                                            }));
                                        } else {
                                            setNewLedgerEntry(prev => ({
                                                ...prev,
                                                debit: '',
                                                credit: ''
                                            }));
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="">Select Type</option>
                                    <option value="debit">Debit</option>
                                    <option value="credit">Credit</option>
                                </select>
                            </div>

                            {/* Amount Field - Show based on selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount *
                                </label>
                                <input
                                    type="number"
                                    value={transactionType === 'debit' ? newLedgerEntry.debit : transactionType === 'credit' ? newLedgerEntry.credit : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (transactionType === 'debit') {
                                            setNewLedgerEntry(prev => ({
                                                ...prev,
                                                debit: value === '' ? '' : Number(value),
                                                credit: ''
                                            }));
                                        } else if (transactionType === 'credit') {
                                            setNewLedgerEntry(prev => ({
                                                ...prev,
                                                credit: value === '' ? '' : Number(value),
                                                debit: ''
                                            }));
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="0.00"
                                    step="0.01"
                                    disabled={!transactionType}
                                />
                            </div>
                        </div>

                        {/* Row 3: Optional Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reference Table
                                </label>
                                <input
                                    type="text"
                                    value={newLedgerEntry.reference_table || ''}
                                    onChange={(e) => setNewLedgerEntry(prev => ({
                                        ...prev,
                                        reference_table: e.target.value
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="e.g., purchases, sales"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reference ID
                                </label>
                                <input
                                    type="number"
                                    value={newLedgerEntry.reference_id || ''}
                                    onChange={(e) => setNewLedgerEntry(prev => ({
                                        ...prev,
                                        reference_id: e.target.value === '' ? '' : Number(e.target.value)
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Reference record ID"
                                />
                            </div>
                        </div>

                        {/* Row 4: Narration and Submit */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Narration
                                </label>
                                <input
                                    type="text"
                                    value={newLedgerEntry.narration || ''}
                                    onChange={(e) => setNewLedgerEntry(prev => ({
                                        ...prev,
                                        narration: e.target.value
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Transaction description or notes"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleAddLedgerEntryWithValidation}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    disabled={loading}
                                >
                                    <Save size={18} />
                                    {loading ? 'Saving...' : 'Save Entry'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Entry ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Account Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Account Type
                            </th>
                            <SortableHeader
                                columnKey="txn_date"
                                requestSort={requestSort}
                                getSortIcon={getSortIcon}
                                isSortable={true}
                            >
                                Date
                            </SortableHeader>

                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Debit
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Credit
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Reference
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Narration
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Group ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created By
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                    Loading ledger entries...
                                </td>
                            </tr>
                        ) : ledgerEntries.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No ledger entries found</p>
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((entry) => (
                                <tr key={entry.entry_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        #{entry.entry_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {`${capitalizeWords(getAccountDetails(entry.account_id).name)}` || `Account ${entry.account_id}`}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        {getAccountDetails(entry.account_id).type ? (
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getAccountTypeColor(getAccountDetails(entry.account_id).type)}`}>
                                                {`${getAccountDetails(entry.account_id).type}`}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">--</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(entry.txn_date).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${getAmountColor(getAccountDetails(entry.account_id).type, 'debit', entry.debit)}`}>
                                        {formatCurrency(entry.debit)}
                                    </td>
                                    <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${getAmountColor(getAccountDetails(entry.account_id).type, 'credit', entry.credit)}`}>
                                        {formatCurrency(entry.credit)}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {entry.reference_table && entry.reference_id ? (
                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                {entry.reference_table}#{entry.reference_id}
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                                        {entry.narration || '-'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                            {entry.txn_group_id.slice(0, 8)}...
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {entry.created_by_name || entry.created_by || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Summary Footer */}
            {ledgerEntries.length > 0 && (
                <div className="border-t bg-gray-50 px-4 py-3">
                    <div className="flex justify-between text-sm">
                        <div className="text-gray-600">
                            Showing {ledgerEntries.length} entries
                        </div>
                        <div className="flex gap-6">
                            <div className="text-red-600 font-medium">
                                Total Debits: {formatCurrency(
                                    ledgerEntries.reduce((sum, entry) => sum + (Number(entry.debit) || 0), 0)
                                )}
                            </div>
                            <div className="text-green-600 font-medium">
                                Total Credits: {formatCurrency(
                                    ledgerEntries.reduce((sum, entry) => sum + (Number(entry.credit) || 0), 0)
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                    Showing {ledgerEntries.length} of {ledgerEntries.length} results
                </div>
                <div className="flex items-center gap-2">
                    <button disabled className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg cursor-not-allowed opacity-40">
                        <ChevronLeft size={16} />
                        Previous
                    </button>
                    <span className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium" aria-current="page">1</span>
                    <button disabled className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg cursor-not-allowed opacity-40">
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LedgerEntriesTable;