import React from 'react';
import { Edit, Delete, Filter, ChevronLeft, ChevronRight, Plus, X, Save } from 'lucide-react';
import { LedgerAccount, NewLedgerAccount } from '@/app/types/interfaces';
import { useLedgerAccountsSorting } from '@/app/hooks/custom_sorting';
import SortableHeader from './sortable_headers/header';

interface LedgerAccountsTableProps {
  ledgerAccounts: LedgerAccount[];
  loading: boolean;
  showAddForm: boolean;
  newLedgerAccount: NewLedgerAccount;
  setShowAddForm: (show: boolean) => void;
  setNewLedgerAccount: React.Dispatch<React.SetStateAction<NewLedgerAccount>>;
  handleAddLedgerAccount: () => void;
}

const LedgerAccountsTable: React.FC<LedgerAccountsTableProps> = ({
  ledgerAccounts,
  loading,
  showAddForm,
  newLedgerAccount,
  setShowAddForm,
  setNewLedgerAccount,
  handleAddLedgerAccount,
}) => {
  const { sortedData, requestSort, getSortIcon } = useLedgerAccountsSorting(ledgerAccounts);

  const accountTypes = [
    { value: 'Asset', label: 'Asset' },
    { value: 'Liability', label: 'Liability' },
    { value: 'Equity', label: 'Equity' },
    { value: 'Revenue', label: 'Revenue' },
    { value: 'Expense', label: 'Expense' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getAccountTypeColor = (type: string) => {
    const colors = {
      Asset: 'bg-green-100 text-green-800',
      Liability: 'bg-red-100 text-red-800',
      Equity: 'bg-blue-100 text-blue-800',
      Revenue: 'bg-purple-100 text-purple-800',
      Expense: 'bg-orange-100 text-orange-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800">Ledger Accounts</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={18} />
            Add Account
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Add New Ledger Account</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 text-black md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Name *
              </label>
              <input
                type="text"
                value={newLedgerAccount.name}
                onChange={(e) => setNewLedgerAccount(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter account name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Type *
              </label>
              <select
                value={newLedgerAccount.account_type}
                onChange={(e) => setNewLedgerAccount(prev => ({ ...prev, account_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Account Type</option>
                {accountTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Balance *
              </label>
              <input
                type="number"
                value={newLedgerAccount.current_balance}
                onChange={(e) => setNewLedgerAccount(prev => ({
                  ...prev,
                  current_balance: e.target.value ? parseFloat(e.target.value) : ''
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAddLedgerAccount}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save size={18} />
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <SortableHeader
                columnKey="account_id"
                requestSort={requestSort}
                getSortIcon={getSortIcon}
                isSortable={true}
              >
                Account ID
              </SortableHeader>

              <SortableHeader
                columnKey="name"
                requestSort={requestSort}
                getSortIcon={getSortIcon}
                isSortable={false}
              >
                Account Name
              </SortableHeader>

              <SortableHeader
                columnKey="account_type"
                requestSort={requestSort}
                getSortIcon={getSortIcon}
                isSortable={true}
              >
                Account Type
              </SortableHeader>

              <SortableHeader
                columnKey="current_balance"
                requestSort={requestSort}
                getSortIcon={getSortIcon}
                isSortable={true}
              >
                Current Balance
              </SortableHeader>

              <SortableHeader
                columnKey="created_at"
                requestSort={requestSort}
                getSortIcon={getSortIcon}
                isSortable={false}
              >
                Created At
              </SortableHeader>

            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No ledger accounts found
                </td>
              </tr>
            ) : (
              sortedData.map((account) => (
                <tr key={account.account_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {account.account_id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {account.name}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccountTypeColor(account.account_type)}`}>
                      {account.account_type}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span
                      className={`font-medium ${(account.account_type === 'Liability' || account.account_type === 'Expense')
                        ? 'text-red-600'
                        : account.current_balance >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                        }`}
                    >
                      {formatCurrency(account.current_balance)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(account.created_at).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="text-sm text-gray-500">
          Showing {sortedData.length} of {sortedData.length} results
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
            <ChevronLeft size={16} />
            Previous
          </button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-lg">1</button>
          <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LedgerAccountsTable;