/**
 * Chart Controls Component
 * 
 * Date range selector and field selector for analytics charts.
 */

import { Calendar } from 'lucide-react';
import type { DateRange, DateRangePreset } from '../../../lib/trackerStudio/analyticsTypes';
import type { TrackerFieldSchema } from '../../../lib/trackerStudio/types';
import { getDateRangePreset, formatDateRange, getPresetFromDateRange } from '../../../lib/trackerStudio/analyticsUtils';

interface ChartControlsProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  fields: TrackerFieldSchema[];
  selectedFields: string[];
  onFieldsChange: (fieldIds: string[]) => void;
  availableChartTypes?: string[];
  selectedChartType?: string;
  onChartTypeChange?: (type: string) => void;
}

export function ChartControls({
  dateRange,
  onDateRangeChange,
  fields,
  selectedFields,
  onFieldsChange,
  availableChartTypes,
  selectedChartType,
  onChartTypeChange,
}: ChartControlsProps) {
  const presets: DateRangePreset[] = ['7d', '30d', '90d', '1y', 'all'];
  const currentPreset = getPresetFromDateRange(dateRange);

  const handlePresetClick = (preset: DateRangePreset) => {
    const newRange = getDateRangePreset(preset);
    onDateRangeChange(newRange);
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    const newRange: DateRange = {
      ...dateRange,
      [type]: value,
    };
    onDateRangeChange(newRange);
  };

  const numericFields = fields.filter(f => 
    f.type === 'number' || f.type === 'rating' || f.type === 'boolean'
  );

  const handleFieldToggle = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      // If it's the only selected field, don't allow deselecting
      if (selectedFields.length === 1) {
        return;
      }
      onFieldsChange(selectedFields.filter(id => id !== fieldId));
    } else {
      onFieldsChange([...selectedFields, fieldId]);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
      {/* Date Range Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="flex flex-wrap gap-2">
          {presets.map(preset => (
            <button
              key={preset}
              onClick={() => handlePresetClick(preset)}
              className={`px-3 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 ${
                currentPreset === preset
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset === '7d' ? '7 Days' :
               preset === '30d' ? '30 Days' :
               preset === '90d' ? '90 Days' :
               preset === '1y' ? '1 Year' :
               'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Range
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="start-date" className="block text-xs text-gray-500 mb-1">
              Start Date
            </label>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[44px] sm:min-h-0"
              />
            </div>
          </div>
          <div className="flex-1">
            <label htmlFor="end-date" className="block text-xs text-gray-500 mb-1">
              End Date
            </label>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[44px] sm:min-h-0"
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {formatDateRange(dateRange)}
        </p>
      </div>

      {/* Field Selector (if multiple numeric fields) */}
      {numericFields.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fields to Display
          </label>
          <div className="flex flex-wrap gap-2">
            {numericFields.map(field => (
              <label
                key={field.id}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field.id)}
                  onChange={() => handleFieldToggle(field.id)}
                  disabled={selectedFields.length === 1 && selectedFields.includes(field.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{field.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Chart Type Selector (if multiple types available) */}
      {availableChartTypes && availableChartTypes.length > 1 && onChartTypeChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chart Type
          </label>
          <div className="flex flex-wrap gap-2">
            {availableChartTypes.map(type => (
              <button
                key={type}
                onClick={() => onChartTypeChange(type)}
                className={`px-3 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 ${
                  selectedChartType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
