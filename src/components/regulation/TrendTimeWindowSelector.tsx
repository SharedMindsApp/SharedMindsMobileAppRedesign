import React from 'react';
import type { TimeWindow } from '../../lib/regulation/regulationTrendService';

interface TrendTimeWindowSelectorProps {
  selected: TimeWindow;
  onChange: (window: TimeWindow) => void;
}

export function TrendTimeWindowSelector({ selected, onChange }: TrendTimeWindowSelectorProps) {
  const options: { value: TimeWindow; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 days' },
    { value: '14days', label: 'Last 14 days' },
  ];

  return (
    <div className="flex gap-2">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            selected === option.value
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
