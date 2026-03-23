/**
 * Skills Tracker Entry Form
 * 
 * Enhanced entry form for Skills Tracker with integration to Skills Matrix,
 * Guardrails project linking, and comprehensive skill development tracking.
 */

import { useState, useEffect } from 'react';
import { createEntry, updateEntry } from '../../lib/trackerStudio/trackerEntryService';
import type { Tracker, TrackerEntry, TrackerFieldSchema } from '../../lib/trackerStudio/types';
import { Loader2, AlertCircle, CheckCircle2, X, Award, Link2, RefreshCw, Info, TrendingUp, Clock, Plus } from 'lucide-react';
import type { TrackerTheme } from '../../lib/trackerStudio/trackerThemeUtils';
import { useAuth } from '../../contexts/AuthContext';
import { 
  syncEntryToSkillsMatrix, 
  getSkillsFromMatrix, 
  findSkillInMatrix 
} from '../../lib/trackerStudio/skillsTrackerService';
import type { UserSkill } from '../../lib/skillsService';
import { showToast } from '../Toast';

type SkillsTrackerEntryFormProps = {
  tracker: Tracker;
  entryDate: string;
  existingEntry?: TrackerEntry | null;
  onEntrySaved: () => void;
  readOnly?: boolean;
  theme: TrackerTheme;
};

export function SkillsTrackerEntryForm({
  tracker,
  entryDate,
  existingEntry,
  onEntrySaved,
  readOnly = false,
  theme,
}: SkillsTrackerEntryFormProps) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | boolean | null>>({});
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Skills Matrix integration
  const [skillsFromMatrix, setSkillsFromMatrix] = useState<UserSkill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [syncToMatrix, setSyncToMatrix] = useState(true); // Default to syncing
  const [selectedSkill, setSelectedSkill] = useState<UserSkill | null>(null);
  const [skillNameInput, setSkillNameInput] = useState('');
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);

  // Load skills from matrix
  useEffect(() => {
    async function loadSkills() {
      if (!user) return;
      
      try {
        setLoadingSkills(true);
        const skills = await getSkillsFromMatrix(user.id);
        setSkillsFromMatrix(skills);
      } catch (err) {
        console.error('Failed to load skills from matrix:', err);
      } finally {
        setLoadingSkills(false);
      }
    }

    loadSkills();
  }, [user]);

  // Initialize form
  useEffect(() => {
    if (existingEntry) {
      setFieldValues(existingEntry.field_values);
      setNotes(existingEntry.notes || '');
      setShowNotes(!!existingEntry.notes);
      
      const skillName = existingEntry.field_values.skill_name as string;
      if (skillName) {
        setSkillNameInput(skillName);
        // Try to find matching skill in matrix
        if (user) {
          findSkillInMatrix(user.id, skillName).then(skill => {
            if (skill) {
              setSelectedSkill(skill);
              // Pre-fill proficiency and confidence from matrix if not set in entry
              if (!existingEntry.field_values.proficiency_level && skill.proficiency) {
                setFieldValues(prev => ({ ...prev, proficiency_level: skill.proficiency }));
              }
              if (!existingEntry.field_values.confidence_level && skill.confidence_level) {
                setFieldValues(prev => ({ ...prev, confidence_level: skill.confidence_level }));
              }
            }
          });
        }
      }
    } else {
      // Initialize with defaults
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
      setSkillNameInput('');
      setSelectedSkill(null);
    }
  }, [existingEntry, tracker, user]);

  const getDefaultValueForType = (type: string): string | number | boolean | null => {
    switch (type) {
      case 'text':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'rating':
        return 3;
      case 'date':
        return entryDate;
      default:
        return null;
    }
  };

  const handleFieldChange = (fieldId: string, value: string | number | boolean | null) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    
    // If skill name changes, try to find matching skill
    if (fieldId === 'skill_name' && typeof value === 'string' && user) {
      setSkillNameInput(value);
      findSkillInMatrix(user.id, value).then(skill => {
        if (skill) {
          setSelectedSkill(skill);
          // Auto-fill proficiency and confidence if not already set
          if (!fieldValues.proficiency_level && skill.proficiency) {
            setFieldValues(prev => ({ ...prev, proficiency_level: skill.proficiency }));
          }
          if (!fieldValues.confidence_level && skill.confidence_level) {
            setFieldValues(prev => ({ ...prev, confidence_level: skill.confidence_level }));
          }
          if (!fieldValues.skill_category && skill.category) {
            setFieldValues(prev => ({ ...prev, skill_category: skill.category }));
          }
        } else {
          setSelectedSkill(null);
        }
      });
    }
    
    // Clear validation error for this field
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleSkillSelect = (skill: UserSkill) => {
    if (readOnly) return;
    
    setSkillNameInput(skill.name);
    setSelectedSkill(skill);
    setShowSkillSuggestions(false);
    
    // Auto-fill fields from skill
    setFieldValues(prev => ({
      ...prev,
      skill_name: skill.name,
      proficiency_level: skill.proficiency,
      confidence_level: skill.confidence_level || prev.confidence_level || 3,
      skill_category: skill.category || prev.skill_category || null,
    }));
  };

  const filteredSkills = skillsFromMatrix.filter(skill =>
    skill.name.toLowerCase().includes(skillNameInput.toLowerCase())
  ).slice(0, 10); // Limit to 10 suggestions

  const validateField = (field: TrackerFieldSchema, value: unknown): string | null => {
    switch (field.type) {
      case 'text':
        if (typeof value !== 'string') return 'Must be text';
        if (field.validation?.required && !value.trim()) return 'Required';
        if (field.validation?.maxLength && value.length > field.validation.maxLength) {
          return `Must be at most ${field.validation.maxLength} characters`;
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
      case 'rating':
        if (typeof value !== 'number' || isNaN(value) || value < 1 || value > 5) {
          return 'Must be between 1 and 5';
        }
        break;
    }
    return null;
  };

  const handleSave = async (
    finalFieldValues: Record<string, string | number | boolean | null>,
    finalNotes: string
  ) => {
    setError(null);
    setValidationErrors({});

    // Validate all fields
    const errors: Record<string, string> = {};
    for (const field of tracker.field_schema_snapshot) {
      const value = finalFieldValues[field.id];
      if (value === undefined || value === null) {
        if (field.validation?.required) {
          errors[field.id] = 'Required';
        }
        continue;
      }
      const error = validateField(field, value);
      if (error) {
        errors[field.id] = error;
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      throw new Error('Please fix validation errors');
    }

    // Sync to skills matrix if enabled
    if (syncToMatrix && user && finalFieldValues.skill_name) {
      try {
        const skillName = finalFieldValues.skill_name as string;
        const proficiency = finalFieldValues.proficiency_level as number;
        const confidence = finalFieldValues.confidence_level as number | undefined;
        const category = finalFieldValues.skill_category as string | undefined;
        const evidence = finalFieldValues.evidence as string | undefined;

        await syncEntryToSkillsMatrix(
          user.id,
          skillName,
          proficiency,
          confidence,
          category as any,
          evidence
        );
      } catch (err) {
        console.error('Failed to sync to skills matrix:', err);
        // Don't block saving if sync fails
        showToast('warning', 'Entry saved, but sync to Skills Matrix failed');
      }
    }

    // Save entry
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
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Find skill name field
  const skillNameField = tracker.field_schema_snapshot.find(f => f.id === 'skill_name');
  const proficiencyField = tracker.field_schema_snapshot.find(f => f.id === 'proficiency_level');
  const confidenceField = tracker.field_schema_snapshot.find(f => f.id === 'confidence_level');

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

      {/* Skills Matrix Integration Info */}
      {selectedSkill && (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-4 flex items-start gap-3`}>
          <Award className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 mb-1">Linked to Skills Matrix</p>
            <p className="text-xs text-gray-600">
              This skill exists in your Skills Matrix. Changes will sync automatically.
            </p>
          </div>
        </div>
      )}

      {/* Sync Toggle */}
      {!readOnly && (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-4`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={syncToMatrix}
              onChange={(e) => setSyncToMatrix(e.target.checked)}
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-purple-600" />
                <span className="text-sm font-semibold text-gray-900">
                  Sync with Skills Matrix
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Automatically update your Skills Matrix when you save this entry
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Skill Name Field with Dropdown */}
      {skillNameField && (
        <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${validationErrors.skill_name ? 'border-red-300' : theme.borderColor} transition-all`}>
          <label htmlFor={skillNameField.id} className="block text-sm font-semibold text-gray-900 mb-3">
            {skillNameField.label} {skillNameField.validation?.required && <span className="text-red-500">*</span>}
            {skillNameField.description && (
              <span className="block text-xs text-gray-500 font-normal mt-1">
                {skillNameField.description}
              </span>
            )}
          </label>
          
          <div className="relative">
            <input
              id={skillNameField.id}
              type="text"
              value={skillNameInput}
              onChange={(e) => {
                setSkillNameInput(e.target.value);
                setShowSkillSuggestions(true);
                handleFieldChange(skillNameField.id, e.target.value);
              }}
              onFocus={() => setShowSkillSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 200)}
              disabled={readOnly || loading}
              placeholder="Start typing to search your skills..."
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-base font-medium transition-all ${
                validationErrors.skill_name 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
              } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
            />
            
            {loadingSkills && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}

            {/* Skill Suggestions Dropdown */}
            {showSkillSuggestions && !readOnly && skillNameInput && filteredSkills.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredSkills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => handleSkillSelect(skill)}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{skill.name}</span>
                      {skill.category && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {skill.category}
                        </span>
                      )}
                    </div>
                    {skill.proficiency && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Proficiency:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(level => (
                            <div
                              key={level}
                              className={`w-2 h-2 rounded-full ${
                                level <= skill.proficiency! 
                                  ? 'bg-purple-500' 
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {validationErrors.skill_name && (
            <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
              <AlertCircle size={14} />
              {validationErrors.skill_name}
            </p>
          )}
        </div>
      )}

      {/* Render other fields */}
      <div className="space-y-6">
        {tracker.field_schema_snapshot
          .filter(field => field.id !== 'skill_name') // Already rendered above
          .map(field => (
            <FieldInput
              key={field.id}
              field={field}
              value={fieldValues[field.id]}
              onChange={(value) => handleFieldChange(field.id, value)}
              error={validationErrors[field.id]}
              readOnly={readOnly}
              theme={theme}
            />
          ))}
      </div>

      {/* Notes */}
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
                Add notes / reflections <span className="text-gray-500">(optional)</span>
              </span>
              <Plus size={18} className="text-gray-400" />
            </div>
          </button>
        ) : (
          <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${theme.borderColor}`}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-900">
                Notes / Reflections <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNotes(false);
                    setNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading || readOnly}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-base bg-white disabled:bg-gray-50"
              placeholder="Reflections, observations, challenges, insights..."
            />
          </div>
        )}
      </div>

      {/* Submit */}
      {readOnly ? (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-6 text-center`}>
          <p className={`text-sm ${theme.accentText} font-medium`}>
            You have read-only access to this tracker
          </p>
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
};

function FieldInput({ field, value, onChange, error, readOnly = false, theme }: FieldInputProps) {
  const isRequired = field.validation?.required;

  // Handle rating fields
  if (field.type === 'rating') {
    return (
      <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all`}>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          {field.label} {isRequired && <span className="text-red-500">*</span>}
          {field.description && (
            <span className="block text-xs text-gray-500 font-normal mt-1">
              {field.description}
            </span>
          )}
        </label>
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5].map(level => (
            <button
              key={level}
              type="button"
              onClick={() => !readOnly && onChange(level)}
              disabled={readOnly}
              className={`flex-1 h-12 rounded-lg border-2 transition-all font-semibold ${
                (value as number) === level
                  ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                  : readOnly
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }

  // Handle text fields with options (dropdown)
  if (field.type === 'text' && field.options && field.options.length > 0) {
    return (
      <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all`}>
        <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-3">
          {field.label} {isRequired && <span className="text-red-500">*</span>}
          {field.description && (
            <span className="block text-xs text-gray-500 font-normal mt-1">
              {field.description}
            </span>
          )}
        </label>
        <select
          id={field.id}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-base font-medium min-h-[52px] transition-all ${
            error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
          } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white cursor-pointer'}`}
        >
          <option value="">Select {field.label.toLowerCase()}...</option>
          {field.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }

  // Handle number fields
  if (field.type === 'number') {
    return (
      <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all`}>
        <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-3">
          {field.label} {isRequired && <span className="text-red-500">*</span>}
          {field.description && (
            <span className="block text-xs text-gray-500 font-normal mt-1">
              {field.description}
            </span>
          )}
        </label>
        <input
          id={field.id}
          type="number"
          value={(value as number) ?? 0}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : 0)}
          disabled={readOnly}
          min={field.validation?.min}
          max={field.validation?.max}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-base font-medium transition-all ${
            error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
          } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }

  // Handle text fields (textarea)
  return (
    <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all`}>
      <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-3">
        {field.label} {isRequired && <span className="text-red-500">*</span>}
        {field.description && (
          <span className="block text-xs text-gray-500 font-normal mt-1">
            {field.description}
          </span>
        )}
      </label>
      <textarea
        id={field.id}
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        rows={field.id === 'evidence' ? 4 : 3}
        maxLength={field.validation?.maxLength}
        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-base resize-none transition-all ${
          error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
        } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
        placeholder={field.description || `Enter ${field.label.toLowerCase()}...`}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
          <AlertCircle size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
