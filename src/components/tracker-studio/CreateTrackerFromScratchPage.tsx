import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { createTrackerFromSchema } from '../../lib/trackerStudio/trackerService';
import type { TrackerFieldSchema, TrackerFieldType, TrackerEntryGranularity, TrackerChartConfig } from '../../lib/trackerStudio/types';
import { ChartConfigEditor } from './ChartConfigEditor';

export function CreateTrackerFromScratchPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entryGranularity, setEntryGranularity] = useState<TrackerEntryGranularity>('daily');
  const [fields, setFields] = useState<TrackerFieldSchema[]>([
    { id: 'field-1', label: 'Value', type: 'text' },
  ]);
  const [chartConfig, setChartConfig] = useState<TrackerChartConfig>({
    enabledCharts: ['summary', 'timeSeries', 'heatmap', 'histogram', 'frequency'],
    defaultDateRange: '30d',
    showSecondaryCharts: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldTypes: { value: TrackerFieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'rating', label: 'Rating (1-5)' },
    { value: 'date', label: 'Date' },
  ];

  const addField = () => {
    const newId = `field-${Date.now()}`;
    setFields([...fields, { id: newId, label: 'New Field', type: 'text' }]);
  };

  const removeField = (fieldId: string) => {
    if (fields.length === 1) {
      setError('Tracker must have at least one field');
      return;
    }
    setFields(fields.filter(f => f.id !== fieldId));
  };

  const updateField = (fieldId: string, updates: Partial<TrackerFieldSchema>) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Tracker name is required');
      return;
    }

    if (fields.length === 0) {
      setError('Tracker must have at least one field');
      return;
    }

    // Validate field IDs are unique
    const fieldIds = fields.map(f => f.id);
    if (new Set(fieldIds).size !== fieldIds.length) {
      setError('Field IDs must be unique');
      return;
    }

    // Validate all fields have labels
    for (const field of fields) {
      if (!field.label.trim()) {
        setError(`Field "${field.id}" must have a label`);
        return;
      }
    }

    try {
      setLoading(true);
      const tracker = await createTrackerFromSchema({
        name: name.trim(),
        description: description.trim() || undefined,
        field_schema: fields,
        entry_granularity: entryGranularity,
        chart_config: chartConfig,
      });
      navigate(`/tracker-studio/tracker/${tracker.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tracker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/tracker-studio/templates')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 active:text-gray-700 mb-4 transition-colors text-sm sm:text-base min-h-[44px] sm:min-h-0"
          >
            <ArrowLeft size={18} />
            Back to Templates
          </button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Create Custom Tracker</h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">Define your own tracker structure</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 flex-1 text-sm sm:text-base">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Basic Information</h2>

            <div>
              <label htmlFor="tracker-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Tracker Name *
              </label>
              <input
                id="tracker-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
                placeholder="e.g., My Custom Tracker"
              />
            </div>

            <div>
              <label htmlFor="tracker-description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Description (optional)
              </label>
              <textarea
                id="tracker-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={3}
                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base sm:text-sm min-h-[80px]"
                placeholder="Optional description"
              />
            </div>

            <div>
              <label htmlFor="entry-granularity" className="block text-sm font-medium text-gray-700 mb-1.5">
                Entry Granularity
              </label>
              <select
                id="entry-granularity"
                value={entryGranularity}
                onChange={(e) => setEntryGranularity(e.target.value as TrackerEntryGranularity)}
                disabled={loading}
                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
              >
                <option value="daily">Daily</option>
                <option value="session">Session</option>
                <option value="event">Event</option>
                <option value="range">Range</option>
              </select>
            </div>
          </div>

          {/* Fields */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Fields</h2>
              <button
                type="button"
                onClick={addField}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                <Plus size={16} />
                Add Field
              </button>
            </div>

            {fields.map((field, index) => (
              <FieldEditor
                key={field.id}
                field={field}
                fieldTypes={fieldTypes}
                onUpdate={(updates) => updateField(field.id, updates)}
                onRemove={() => removeField(field.id)}
                canRemove={fields.length > 1}
                disabled={loading}
              />
            ))}
          </div>

          {/* Chart Configuration */}
          <ChartConfigEditor
            config={chartConfig}
            onChange={setChartConfig}
            disabled={loading}
          />

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate('/tracker-studio/templates')}
              disabled={loading}
              className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium min-h-[44px] text-base sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || fields.length === 0}
              className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 min-h-[44px] text-base sm:text-sm"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type FieldEditorProps = {
  field: TrackerFieldSchema;
  fieldTypes: { value: TrackerFieldType; label: string }[];
  onUpdate: (updates: Partial<TrackerFieldSchema>) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled: boolean;
};

function FieldEditor({ field, fieldTypes, onUpdate, onRemove, canRemove, disabled }: FieldEditorProps) {
  const [showValidation, setShowValidation] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Field Label *
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              disabled={disabled}
              required
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
              placeholder="Field name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Field Type *
            </label>
            <select
              value={field.type}
              onChange={(e) => onUpdate({ type: e.target.value as TrackerFieldType })}
              disabled={disabled}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
            >
              {fieldTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="self-start sm:self-auto p-2.5 sm:p-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Remove field"
            aria-label="Remove field"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Simple Validation (min/max only) */}
      {(field.type === 'number' || field.type === 'rating') && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowValidation(!showValidation)}
            className="text-sm text-gray-600 hover:text-gray-900 active:text-gray-700 min-h-[44px] sm:min-h-0 py-2 sm:py-0"
          >
            {showValidation ? 'Hide' : 'Show'} validation options
          </button>
          {showValidation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Min Value
                </label>
                <input
                  type="number"
                  value={field.validation?.min ?? ''}
                  onChange={(e) => onUpdate({
                    validation: {
                      ...field.validation,
                      min: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })}
                  disabled={disabled}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Max Value
                </label>
                <input
                  type="number"
                  value={field.validation?.max ?? ''}
                  onChange={(e) => onUpdate({
                    validation: {
                      ...field.validation,
                      max: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })}
                  disabled={disabled}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
