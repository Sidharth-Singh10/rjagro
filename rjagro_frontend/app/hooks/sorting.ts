// Custom hook for table sorting
import { useState, useMemo } from 'react';
import { SortableValue, SortConfig } from '../types/sorting';
import { TableSortingUtils } from '../utils/sorting';

export function useTableSorting<T>(
    data: T[],
    initialSort: SortConfig = { key: '', direction: null },
    getValueFn?: (item: T, key: string) => SortableValue
) {
    const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort);

    const sortedData = useMemo(() => {
        return TableSortingUtils.sortData(data, sortConfig, getValueFn);
    }, [data, sortConfig, getValueFn]);

    const requestSort = (key: string) => {
        setSortConfig(currentSort => TableSortingUtils.toggleSort(currentSort, key));
    };

    const getSortIcon = (columnKey: string) => {
        return TableSortingUtils.getSortIcon(sortConfig, columnKey);
    };

    return {
        sortedData,
        sortConfig,
        requestSort,
        getSortIcon,
        setSortConfig
    };
}

// Predefined value extractors for common use cases
export const ValueExtractors = {
    /**
     * Extract date from various date formats
     */
    date: (item: any, key: string): Date => {
        const value = item[key];
        return new Date(value);
    },

    /**
     * Extract numeric value, handling strings that represent numbers
     */
    numeric: (item: any, key: string): number => {
        const value = item[key];
        return typeof value === 'number' ? value : parseFloat(value) || 0;
    },

    /**
     * Extract string value, handling case-insensitive sorting
     */
    string: (item: any, key: string): string => {
        const value = item[key];
        return String(value || '').toLowerCase();
    },

    /**
     * Extract value from nested object path (e.g., 'user.profile.name')
     */
    nested: (path: string) => (item: any): SortableValue => {
        return path.split('.').reduce((obj, key) => obj?.[key], item);
    }
};

// Example configurations for your specific tables
export const TableConfigs = {
    batchSales: {
        // Standard column mappings
        columns: {
            'id': 'numeric',
            'item_code': 'string',
            'item_name': 'string',
            'batch_id': 'numeric',
            'farmer_name': 'string',
            'trader_name': 'string',
            'avg_weight': 'numeric',
            'rate': 'numeric',
            'quantity': 'numeric',
            'value': 'numeric',
            'created_at': 'date'
        },

        // Custom value extractor function
        getValueFn: (item: any, key: string): SortableValue => {
            switch (key) {
                case 'created_at':
                    return new Date(item[key]);
                case 'avg_weight':
                case 'rate':
                case 'quantity':
                case 'value':
                    return parseFloat(item[key]) || 0;
                default:
                    return item[key];
            }
        }
    },

    birdCountHistory: {
        columns: {
            'record_id': 'numeric',
            'batch_id': 'numeric',
            'record_date': 'date',
            'deaths': 'numeric',
            'additions': 'numeric',
            'net_change': 'numeric',
            'notes': 'string',
            'created_at': 'date'
        },

        getValueFn: (item: any, key: string): SortableValue => {
            switch (key) {
                case 'record_date':
                case 'created_at':
                    return new Date(item[key]);
                case 'net_change':
                    return (item.additions || 0) - (item.deaths || 0);
                case 'deaths':
                case 'additions':
                    return parseInt(item[key]) || 0;
                default:
                    return item[key];
            }
        }
    },
    purchases: {
        columns: {
            'purchase_id': 'numeric',
            'item_code': 'string',
            'item_name': 'string',
            'cost_per_unit': 'numeric',
            'total_cost': 'numeric',
            'quantity': 'numeric',
            'purchase_date': 'date',
            'supplier': 'string',
            'payment_method': 'string',
            'created_by': 'string'
        },
        getValueFn: (item: any, key: string): SortableValue => {
            switch (key) {
                case 'purchase_date':
                    return new Date(item[key]);
                case 'cost_per_unit':
                case 'total_cost':
                case 'quantity':
                    return parseFloat(item[key]) || 0;
                case 'purchase_id':
                    return parseInt(item[key]) || 0;
                default:
                    return item[key];
            }
        }
    }
};