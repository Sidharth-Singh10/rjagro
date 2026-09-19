'use client'
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

export interface SearchableSelectOption {
    value: number | string;
    label: string;
}

interface SearchableSelectProps {
    value: number | string | '';
    onChange: (value: string) => void;
    options: SearchableSelectOption[];
    placeholder: string;
    searchPlaceholder?: string;
    /** Called with the typed query (debounced) so the parent can refetch. */
    onSearch?: (query: string) => void;
    loading?: boolean;
    disabled?: boolean;
    emptyText?: string;
    debounceMs?: number;
}

/**
 * A native select fronted by a debounced search box. The parent owns the
 * option list (usually a paginated API search), so this stays usable when the
 * underlying table grows to thousands of rows.
 */
const SearchableSelect: React.FC<SearchableSelectProps> = ({
    value,
    onChange,
    options,
    placeholder,
    searchPlaceholder = 'Type to search...',
    onSearch,
    loading = false,
    disabled = false,
    emptyText = 'No matches',
    debounceMs = 300,
}) => {
    const [query, setQuery] = useState('');
    const onSearchRef = useRef(onSearch);

    useEffect(() => {
        onSearchRef.current = onSearch;
    });

    useEffect(() => {
        if (!onSearchRef.current) return;
        const timer = setTimeout(() => onSearchRef.current?.(query), debounceMs);
        return () => clearTimeout(timer);
    }, [query, debounceMs]);

    return (
        <div className="space-y-2">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    disabled={disabled}
                    className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
                />
                {loading && (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                )}
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
            >
                <option value="">{!loading && options.length === 0 ? emptyText : placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default SearchableSelect;
