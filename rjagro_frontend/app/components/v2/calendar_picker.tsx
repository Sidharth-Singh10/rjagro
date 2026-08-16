'use client'
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const toDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

interface CalendarPickerProps {
    value?: string;
    onConfirm: (date: string) => void;
    onClose: () => void;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ value, onConfirm, onClose }) => {
    const initial = value ? new Date(value + 'T00:00:00') : new Date();
    const [viewDate, setViewDate] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
    const [selected, setSelected] = useState<string | undefined>(value);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const todayKey = toDateString(new Date());

    const changeMonth = (delta: number) => {
        setViewDate(new Date(year, month + delta, 1));
    };

    const selectDate = (day: number) => {
        setSelected(toDateString(new Date(year, month, day)));
    };

    const confirm = () => {
        if (selected) onConfirm(selected);
    };

    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`blank-${i}`} />);
    for (let day = 1; day <= daysInMonth; day++) {
        const key = toDateString(new Date(year, month, day));
        const isSelected = key === selected;
        const isToday = key === todayKey;
        cells.push(
            <button
                key={key}
                type="button"
                onClick={() => selectDate(day)}
                className={`
                    aspect-square rounded-lg text-sm flex items-center justify-center transition-colors
                    ${isSelected
                        ? 'bg-green-600 text-white font-semibold shadow-sm'
                        : 'text-gray-700 hover:bg-green-50'}
                `}
            >
                <span className={isToday && !isSelected ? 'underline decoration-green-500 decoration-2 underline-offset-2 font-medium' : ''}>
                    {day}
                </span>
            </button>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 w-72">
            <div className="flex items-center justify-between mb-3">
                <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <p className="text-sm font-semibold text-gray-800">
                    {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
                <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map(w => (
                    <div key={w} className="text-[11px] font-medium text-gray-400 text-center pb-1">
                        {w}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {cells}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={confirm}
                    disabled={!selected}
                    className="flex-1 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Create Batch
                </button>
            </div>
        </div>
    );
};

export default CalendarPicker;
