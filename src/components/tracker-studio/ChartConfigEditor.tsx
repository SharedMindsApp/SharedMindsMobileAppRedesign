/**
 * Chart Configuration Editor Component
 * 
 * Allows users to configure which charts are enabled for a tracker.
 */

import { useState } from 'react';
import { BarChart3, TrendingUp, Calendar, BarChart, Activity } from 'lucide-react';
import type { TrackerChartConfig } from '../../lib/trackerStudio/types';

interface ChartConfigEditorProps {
  config: TrackerChartConfig;
  onChange: (config: TrackerChartConfig) => void;
  disabled?: boolean;
}

const AVAILABLE_CHARTS = [
  { id: 'summary', label: 'Summary Statistics', icon: BarChart3, description: 'Average, median, min, max values' },
  { id: 'timeSeries', label: 'Time Series Chart', icon: TrendingUp, description: 'Line chart showing trends over time' },
  { id: 'heatmap', label: 'Calendar Heatmap', icon: Calendar, description: 'Visual pattern recognition over time' },
  { id: 'histogram', label: 'Value Distribution', icon: BarChart, description: 'Frequency of different values' },
  { id: 'frequency', label: 'Entry Frequency', icon: Activity, description: 'How often entries are logged' },
];

const DEFAULT_DATE_RANGES = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' },
] as const;

export function ChartConfigEditor({ config, onChange, disabled = false }: ChartConfigEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const enabledCharts = config.enabledCharts || AVAILABLE_CHARTS.map(c => c.id);
  const defaultDateRange = config.defaultDateRange || '30d';
  const showSecondaryCharts = config.showSecondaryCharts ?? false;

  const toggleChart = (chartId: string) => {
    if (disabled) return;
    
    const newEnabled = enabledCharts.includes(chartId)
      ? enabledCharts.filter(id => id !== chartId)
      : [...enabledCharts, chartId];
    
    onChange({
      ...config,
      enabledCharts: newEnabled,
    });
  };

  const handleDateRangeChange = (range: typeof DEFAULT_DATE_RANGES[number]['value']) => {
    if (disabled) return;
    onChange({
      ...config,
      defaultDateRange: range,
    });
  };

  const handleSecondaryChartsToggle = () => {
    if (disabled) return;
    onChange({
      ...config,
      showSecondaryCharts: !showSecondaryCharts,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Analytics & Charts</h3>
          <p className="text-sm text-gray-600 mt-1">Configure which visualizations are available for this tracker</p>
        </div>
      </div>

      {/* Enabled Charts */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Enabled Charts
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AVAILABLE_CHARTS.map(chart => {
            const Icon = chart.icon;
            const isEnabled = enabledCharts.includes(chart.id);
            
            return (
              <label
                key={chart.id}
                className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  isEnabled
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => toggleChart(chart.id)}
                  disabled={disabled}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={18} className={isEnabled ? 'text-blue-600' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${isEnabled ? 'text-blue-900' : 'text-gray-700'}`}>
                      {chart.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{chart.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Advanced Options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={disabled}
          className="text-sm text-gray-600 hover:text-gray-900 active:text-gray-700 transition-colors min-h-[44px] sm:min-h-0 py-2 sm:py-0"
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced options
        </button>
        
        {showAdvanced && (
          <div className="mt-3 space-y-4 pt-3 border-t border-gray-200">
            {/* Default Date Range */}
            <div>
              <label htmlFor="default-date-range" className="block text-sm font-medium text-gray-700 mb-2">
                Default Date Range
              </label>
              <select
                id="default-date-range"
                value={defaultDateRange}
                onChange={(e) => handleDateRangeChange(e.target.value as typeof DEFAULT_DATE_RANGES[number]['value'])}
                disabled={disabled}
                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
              >
                {DEFAULT_DATE_RANGES.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Show Secondary Charts by Default */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSecondaryCharts}
                  onChange={handleSecondaryChartsToggle}
                  disabled={disabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Show secondary charts by default
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Heatmap, histogram, and frequency charts will be visible by default
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
