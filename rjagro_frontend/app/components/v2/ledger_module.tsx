import { fetchLedgerAccounts, handleAddLedgerAccount } from "@/app/api/ledger_accounts";
import { fetchLedgerEntries, handleAddLedgerEntry } from "@/app/api/ledger_entries";
import { useAuth } from "@/app/hooks/useAuth";
import { LedgerEntryPayload, NewLedgerAccount, NewLedgerEntry } from "@/app/types/interfaces";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import LedgerAccountsTable from "../tables/ledger_accounts";
import LedgerEntriesTable from "../tables/ledger_entries";

export const LedgerIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
);


export const LedgerModule = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [subTab, setSubTab] = useState<'Accounts' | 'Entries'>('Accounts');

    // Shared Loading/Form State
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // --- Data Fetching ---
    const { data: ledgerEntries = [], isLoading: isEntriesLoading } = useQuery({
        queryKey: ["ledger_entries"],
        queryFn: fetchLedgerEntries,
        staleTime: 5 * 60 * 1000,
    });

    const { data: ledgerAccounts = [], isLoading: isAccountsLoading } = useQuery({
        queryKey: ['ledger_accounts'],
        queryFn: fetchLedgerAccounts,
        staleTime: 5 * 60 * 1000,
    });

    const [newLedgerEntry, setNewLedgerEntry] = useState<NewLedgerEntry>({
        account_id: '',
        debit: '',
        credit: '',
        txn_date: new Date().toISOString().slice(0, 10),
        reference_table: '',
        reference_id: '',
        narration: ''
    });

    // --- Form State: Accounts ---
    const [newLedgerAccount, setNewLedgerAccount] = useState<NewLedgerAccount>({
        name: '',
        account_type: '',
        current_balance: ''
    });

    // --- Handlers ---
    const onAddEntry = () => {
        const payload: LedgerEntryPayload = {
            account_id: Number(newLedgerEntry.account_id),
            debit: newLedgerEntry.debit ? Number(newLedgerEntry.debit) : undefined,
            credit: newLedgerEntry.credit ? Number(newLedgerEntry.credit) : undefined,
            txn_date: newLedgerEntry.txn_date,
            reference_table: newLedgerEntry.reference_table || undefined,
            reference_id: newLedgerEntry.reference_id ? Number(newLedgerEntry.reference_id) : undefined,
            narration: newLedgerEntry.narration || undefined,
            created_by: user ? user.user_id : undefined,
        };

        handleAddLedgerEntry(payload, queryClient, setLoading, () => {
            setShowAddForm(false);
            setNewLedgerEntry({
                account_id: '',
                debit: '',
                credit: '',
                txn_date: new Date().toISOString().slice(0, 10),
                reference_table: '',
                reference_id: '',
                narration: ''
            });
        });
    };

    const onAddAccount = () => {
        handleAddLedgerAccount(
            {
                name: newLedgerAccount.name,
                account_type: newLedgerAccount.account_type,
                current_balance: Number(newLedgerAccount.current_balance)
            },
            queryClient,
            setLoading
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex space-x-4 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setSubTab('Accounts')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Accounts'
                        ? 'border-b-2 border-green-600 text-green-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Chart of Accounts
                </button>
                <button
                    onClick={() => setSubTab('Entries')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Entries'
                        ? 'border-b-2 border-green-600 text-green-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Ledger Entries
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[500px]">
                {subTab === 'Accounts' && (
                    <LedgerAccountsTable
                        ledgerAccounts={ledgerAccounts}
                        loading={loading || isAccountsLoading}
                        showAddForm={showAddForm}
                        newLedgerAccount={newLedgerAccount}
                        setShowAddForm={setShowAddForm}
                        setNewLedgerAccount={setNewLedgerAccount}
                        handleAddLedgerAccount={onAddAccount}
                    />
                )}

                {subTab === 'Entries' && (
                    <LedgerEntriesTable
                        ledgerEntries={ledgerEntries}
                        ledgerAccounts={ledgerAccounts}
                        loading={loading || isEntriesLoading}
                        showAddForm={showAddForm}
                        newLedgerEntry={newLedgerEntry}
                        setShowAddForm={setShowAddForm}
                        setNewLedgerEntry={setNewLedgerEntry}
                        handleAddLedgerEntry={onAddEntry}
                    />
                )}
            </div>
        </div>
    );
};