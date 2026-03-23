import { useState, useEffect } from 'react';
import { createEntry, updateEntry, getEntryByDate } from '../../lib/trackerStudio/trackerEntryService';
import type { Tracker, TrackerEntry, TrackerFieldSchema } from '../../lib/trackerStudio/types';
import { Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import type { TrackerTheme } from '../../lib/trackerStudio/trackerThemeUtils';
import { isMoodTracker, shouldUseLowFrictionUX } from '../../lib/trackerStudio/emotionWords';
import { MoodTrackerEntryForm } from './MoodTrackerEntryForm';
import { isHabitTracker } from '../../lib/trackerStudio/habitTrackerUtils';
import { IntelligentHabitTrackerEntryForm } from './IntelligentHabitTrackerEntryForm';
import { isSkillsTracker } from '../../lib/trackerStudio/skillsTrackerUtils';
import { SkillsTrackerEntryForm } from './SkillsTrackerEntryForm';

type TrackerEntryFormProps = {
  tracker: Tracker;
  entryDate: string; // ISO date string (YYYY-MM-DD)
  existingEntry?: TrackerEntry | null;
  onEntrySaved: () => void;
  readOnly?: boolean;
  theme: TrackerTheme;
};

export function TrackerEntryForm({
  tracker,
  entryDate,
  existingEntry,
  onEntrySaved,
  readOnly = false,
  theme,
}: TrackerEntryFormProps) {
  const [saved, setSaved] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | boolean | null>>({});
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const useLowFriction = shouldUseLowFrictionUX(tracker.name, tracker.field_schema_snapshot);

  useEffect(() => {
    // Initialize form with existing entry or defaults
    if (existingEntry) {
      setFieldValues(existingEntry.field_values);
      setNotes(existingEntry.notes || '');
      setShowNotes(!!existingEntry.notes);
    } else {
      // Initialize with default values from schema
      const defaults: Record<string, string | number | boolean | null> = {};
      for (const field of tracker.field_schema_snapshot) {
        if (field.default !== undefined) {
          defaults[field.id] = field.default;
        } else {
          defaults[field.id] = getDefaultValueForType(field.type);
        }
      }
      setFieldValues(defaults);
      setNotes('');
      setShowNotes(false);
    }
  }, [existingEntry, tracker]);

  const getDefaultValueForType = (type: string): string | number | boolean | null => {
    switch (type) {
      case 'text':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'rating':
        return 1;
      case 'date':
        return entryDate;
      default:
        return null;
    }
  };

  const handleFieldChange = (fieldId: string, value: string | number | boolean | null) => {
    setFieldValues(prev => {
      const next = { ...prev, [fieldId]: value };
      
      // If entry_type changes, clear conditional fields that are no longer relevant
      if (fieldId === 'entry_type') {
        // Find all fields that have conditional requirements
        const conditionalFields = tracker.field_schema_snapshot.filter(f => f.conditional);
        conditionalFields.forEach(field => {
          // If this conditional field's condition is no longer met, clear its value
          if (field.conditional && field.conditional.field === 'entry_type') {
            if (value !== field.conditional.value) {
              next[field.id] = getDefaultValueForType(field.type);
            }
          }
        });
      }
      
      return next;
    });
    
    // Clear validation error for this field
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validateField = (field: TrackerFieldSchema, value: unknown): string | null => {
    // Type validation
    switch (field.type) {
      case 'text':
        if (typeof value !== 'string') return 'Must be text';
        if (field.validation?.required && !value.trim()) return 'Required';
        if (field.validation?.minLength && value.length < field.validation.minLength) {
          return `Must be at least ${field.validation.minLength} characters`;
        }
        if (field.validation?.maxLength && value.length > field.validation.maxLength) {
          return `Must be at most ${field.validation.maxLength} characters`;
        }
        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) return 'Invalid format';
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) return 'Must be a number';
        if (field.validation?.min !== undefined && value < field.validation.min) {
          return `Must be at least ${field.validation.min}`;
        }
        if (field.validation?.max !== undefined && value > field.validation.max) {
          return `Must be at most ${field.validation.max}`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') return 'Must be true or false';
        break;
      case 'rating':
        if (typeof value !== 'number' || isNaN(value) || value < 1 || value > 5) {
          return 'Must be between 1 and 5';
        }
        break;
      case 'date':
        if (typeof value !== 'string') return 'Must be a date';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Invalid date format';
        break;
    }
    return null;
  };

  const handleSave = async (finalFieldValues: Record<string, string | number | boolean | null>, finalNotes: string) => {
    setError(null);
    setValidationErrors({});

    // Validate all fields
    // Note: Skip validation for special fields like '_emotion_words' and system fields like 'entry_date'
    // entry_date is handled separately and not part of field_values
    const errors: Record<string, string> = {};
    for (const field of tracker.field_schema_snapshot) {
      // Skip entry_date - it's not part of field_values, it's a separate parameter
      if (field.id === 'entry_date') {
        continue;
      }
      
      // Skip conditional fields that aren't currently shown
      if (field.conditional) {
        const conditionalFieldValue = finalFieldValues[field.conditional.field];
        if (conditionalFieldValue !== field.conditional.value) {
          continue; // Skip validation for fields that aren't shown
        }
      }
      
      const value = finalFieldValues[field.id];
      if (field.validation?.required && (value === null || value === undefined || value === '')) {
        errors[field.id] = 'Required';
      } else if (value !== null && value !== undefined && value !== '') {
        const fieldError = validateField(field, value);
        if (fieldError) {
          errors[field.id] = fieldError;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      
      // Create detailed error message
      const errorDetails = Object.entries(errors)
        .map(([fieldId, errorMsg]) => {
          const field = tracker.field_schema_snapshot.find(f => f.id === fieldId);
          const fieldLabel = field?.label || fieldId;
          return `${fieldLabel}: ${errorMsg}`;
        })
        .join('; ');
      
      const errorMessage = `Validation failed: ${errorDetails}`;
      
      // Log detailed error for debugging
      console.error('[TrackerEntryForm] Validation failed:', {
        trackerId: tracker.id,
        trackerName: tracker.name,
        entryDate,
        errors,
        fieldValues: finalFieldValues,
        fieldSchema: tracker.field_schema_snapshot.map(f => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.validation?.required,
        })),
      });
      
      throw new Error(errorMessage);
    }

    if (existingEntry) {
      await updateEntry(existingEntry.id, {
        field_values: finalFieldValues,
        notes: finalNotes.trim() || undefined,
      });
    } else {
      await createEntry({
        tracker_id: tracker.id,
        entry_date: entryDate,
        field_values: finalFieldValues,
        notes: finalNotes.trim() || undefined,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await handleSave(fieldValues, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onEntrySaved();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save entry';
      console.error('[TrackerEntryForm] Submit error:', {
        trackerId: tracker.id,
        trackerName: tracker.name,
        entryDate,
        fieldValues,
        error: errorMessage,
        errorStack: err instanceof Error ? err.stack : undefined,
        validationErrors,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Use mood tracker form for mood trackers
  const isMood = isMoodTracker(tracker.name, tracker.field_schema_snapshot);
  
  if (isMood) {
    return (
      <MoodTrackerEntryForm
        tracker={tracker}
        entryDate={entryDate}
        existingEntry={existingEntry}
        onEntrySaved={onEntrySaved}
        readOnly={readOnly}
        theme={theme}
        onSave={handleSave}
        loading={loading}
      />
    );
  }

  // Use intelligent form for Habit Tracker
  if (isHabitTracker(tracker)) {
    return (
      <IntelligentHabitTrackerEntryForm
        tracker={tracker}
        entryDate={entryDate}
        existingEntry={existingEntry}
        onEntrySaved={onEntrySaved}
        readOnly={readOnly}
        theme={theme}
      />
    );
  }

  // Use specialized form for Skills Tracker
  if (isSkillsTracker(tracker)) {
    return (
      <SkillsTrackerEntryForm
        tracker={tracker}
        entryDate={entryDate}
        existingEntry={existingEntry}
        onEntrySaved={onEntrySaved}
        readOnly={readOnly}
        theme={theme}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saved && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium flex-1">Entry saved successfully!</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm flex-1 font-medium">{error}</p>
        </div>
      )}

      {/* Schema-driven fields */}
      <div className="space-y-6">
        {tracker.field_schema_snapshot
          .filter(field => {
            // Show field if it has no conditional requirement, or if condition is met
            if (!field.conditional) {
              return true;
            }
            const conditionalFieldValue = fieldValues[field.conditional.field];
            return conditionalFieldValue === field.conditional.value;
          })
          .sort((a, b) => {
            // Sort fields: entry_type first, then date, then others
            if (a.id === 'entry_type') return -1;
            if (b.id === 'entry_type') return 1;
            if (a.id === 'entry_date' || a.id === 'date') return -1;
            if (b.id === 'entry_date' || b.id === 'date') return 1;
            return 0;
          })
          .map(field => (
            <FieldInput
              key={field.id}
              field={field}
              value={fieldValues[field.id]}
              onChange={(value) => handleFieldChange(field.id, value)}
              error={validationErrors[field.id]}
              readOnly={readOnly}
              theme={theme}
              trackerName={tracker.name}
            />
          ))}
      </div>

      {/* Notes - Collapsible for low-friction trackers */}
      {useLowFriction ? (
        <div>
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              disabled={readOnly}
              className={`w-full ${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-4 text-left transition-all hover:shadow-md ${
                readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Add a note <span className="text-gray-500">(optional)</span>
                </span>
                <Plus size={18} className="text-gray-400" />
              </div>
            </button>
          ) : (
            <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${theme.borderColor}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-900">
                  Note <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotes(false);
                      setNotes('');
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Hide notes"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <textarea
                id="entry-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading || readOnly}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base bg-white disabled:bg-gray-50"
                placeholder="Anything you want to add?"
              />
            </div>
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="entry-notes" className="block text-sm font-semibold text-gray-700 mb-2">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="entry-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={loading || readOnly}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50 resize-none text-base min-h-[100px]"
            placeholder="Add any additional notes or thoughts..."
          />
        </div>
      )}

      {/* Submit */}
      {readOnly ? (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-6 text-center`}>
          <p className={`text-sm ${theme.accentText} font-medium`}>You have read-only access to this tracker</p>
        </div>
      ) : (
        <button
          type="submit"
          disabled={loading}
          className={`w-full px-6 py-4 ${theme.buttonBg} ${theme.buttonHover} text-white rounded-xl hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-3 min-h-[52px] text-base shadow-md`}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              <span>{existingEntry ? 'Update Entry' : 'Save Entry'}</span>
            </>
          )}
        </button>
      )}
    </form>
  );
}

type FieldInputProps = {
  field: TrackerFieldSchema;
  value: string | number | boolean | null;
  onChange: (value: string | number | boolean | null) => void;
  error?: string;
  readOnly?: boolean;
  theme: TrackerTheme;
  trackerName?: string;
};

function FieldInput({ field, value, onChange, error, readOnly = false, theme, trackerName = '' }: FieldInputProps) {
  const isRequired = field.validation?.required;
  
  // Determine if this rating field should use emojis
  const useEmojis = field.type === 'rating' && trackerName && (
    trackerName.toLowerCase().includes('energy') ||
    trackerName.toLowerCase().includes('stress') ||
    trackerName.toLowerCase().includes('sleep')
  );
  
  // Emoji mappings for different tracker types
  const getEmojisForField = () => {
    const name = trackerName.toLowerCase();
    if (name.includes('energy')) {
      return ['😴', '😑', '😐', '😊', '⚡']; // Energy levels
    }
    if (name.includes('stress')) {
      return ['😰', '😟', '😐', '😌', '😊']; // Stress levels
    }
    if (name.includes('sleep')) {
      return ['😴', '😴', '😐', '😊', '😄']; // Sleep quality
    }
    return null;
  };
  
  const fieldEmojis = useEmojis ? getEmojisForField() : null;

  switch (field.type) {
    case 'text':
      // If field has options, render as select dropdown
      if (field.options && field.options.length > 0) {
        return (
          <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all hover:shadow-md`}>
            <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-3">
              {field.label} {isRequired && <span className="text-red-500">*</span>}
              {field.description && (
                <span className="block text-xs text-gray-500 font-normal mt-1">{field.description}</span>
              )}
            </label>
            <select
              id={field.id}
              value={value as string || ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={readOnly}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-base font-medium min-h-[52px] transition-all ${
                error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white cursor-pointer'}`}
            >
              <option value="">Select {field.label.toLowerCase()}...</option>
              {field.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
              <AlertCircle size={14} />
              {error}
            </p>}
          </div>
        );
      }
      // Otherwise render as textarea
      return (
        <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all hover:shadow-md`}>
          <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-3">
            {field.label} {isRequired && <span className="text-red-500">*</span>}
            {field.description && (
              <span className="block text-xs text-gray-500 font-normal mt-1">{field.description}</span>
            )}
          </label>
          <textarea
            id={field.id}
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            rows={4}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 resize-none text-base min-h-[100px] transition-all ${
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
          {error && <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>}
        </div>
      );

    case 'number':
      return (
        <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all hover:shadow-md`}>
          <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-3">
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <input
            id={field.id}
            type="number"
            value={value as number ?? ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            disabled={readOnly}
            min={field.validation?.min}
            max={field.validation?.max}
            step="any"
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-lg font-semibold min-h-[52px] transition-all ${
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
          {error && <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>}
        </div>
      );

    case 'boolean':
      return (
        <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all hover:shadow-md`}>
          <label className={`flex items-center gap-4 cursor-pointer min-h-[60px] ${readOnly ? 'cursor-not-allowed' : ''}`}>
            <div className="relative">
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => onChange(e.target.checked)}
                disabled={readOnly}
                className={`w-6 h-6 ${theme.buttonBg.replace('bg-', 'text-')} border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed flex-shrink-0 transition-all cursor-pointer`}
              />
              {value === true && (
                <CheckCircle2 className="absolute inset-0 w-6 h-6 text-white pointer-events-none" size={24} />
              )}
            </div>
            <span className="text-base font-semibold text-gray-900 flex-1">
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </span>
          </label>
          {error && <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>}
        </div>
      );

    case 'rating':
      return (
        <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all hover:shadow-md`}>
          <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-4">
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map(rating => {
              const emoji = fieldEmojis ? fieldEmojis[rating - 1] : null;
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onChange(rating)}
                  disabled={readOnly}
                  className={`flex-1 py-4 rounded-xl border-2 transition-all font-bold text-lg min-h-[60px] shadow-sm ${
                    value === rating
                      ? `${theme.buttonBg} text-white border-transparent shadow-lg scale-105`
                      : `bg-white text-gray-700 border-gray-300 hover:shadow-md active:scale-95 ${theme.accentBg}`
                  } ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {emoji || rating}
                </button>
              );
            })}
          </div>
          {error && <p className="mt-3 text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>}
        </div>
      );

    case 'date':
      return (
        <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all hover:shadow-md`}>
          <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-3">
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <input
            id={field.id}
            type="date"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-base font-medium min-h-[52px] transition-all ${
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
          />
          {error && <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>}
        </div>
      );

    default:
      return null;
  }
}
