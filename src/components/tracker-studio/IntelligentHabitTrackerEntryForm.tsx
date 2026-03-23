/**
 * Intelligent Habit Tracker Entry Form - Premium Edition
 * 
 * High-end, responsive, intelligent entry form with:
 * - Smooth animations and micro-interactions
 * - Premium visual design
 * - Keyboard shortcuts
 * - Smart defaults and suggestions
 * - Pattern-based predictions
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createEntry, updateEntry, getEntryByDate, listEntriesByDateRange } from '../../lib/trackerStudio/trackerEntryService';
import type { Tracker, TrackerEntry, TrackerFieldSchema } from '../../lib/trackerStudio/types';
import { Loader2, AlertCircle, CheckCircle2, X, Sparkles, Clock, Zap, Flame, TrendingUp, Copy, Bell, AlertTriangle, Lightbulb, Plus, Command } from 'lucide-react';
import { HabitNameSelector } from './HabitNameSelector';
import { TrackerRelationshipSuggestion } from './TrackerRelationshipSuggestion';
import type { TrackerTheme } from '../../lib/trackerStudio/trackerThemeUtils';
import { useHabitPatterns } from '../../hooks/trackerStudio/useHabitPatterns';
import { useHabitStreaks } from '../../hooks/trackerStudio/useHabitStreaks';
import { useHabitPredictions } from '../../hooks/trackerStudio/useHabitPredictions';
import { getYesterdayEntry } from '../../lib/trackerStudio/habitStreakAnalysis';
import { showToast } from '../Toast';

type IntelligentHabitTrackerEntryFormProps = {
  tracker: Tracker;
  entryDate: string;
  existingEntry?: TrackerEntry | null;
  onEntrySaved: () => void;
  readOnly?: boolean;
  theme: TrackerTheme;
};

export function IntelligentHabitTrackerEntryForm({
  tracker,
  entryDate,
  existingEntry,
  onEntrySaved,
  readOnly = false,
  theme,
}: IntelligentHabitTrackerEntryFormProps) {
  const [saved, setSaved] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | boolean | null>>({});
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [habitNameInput, setHabitNameInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [savingAnimation, setSavingAnimation] = useState(false);

  // Load habit patterns for smart suggestions
  const { patterns, suggestions, loading: patternsLoading } = useHabitPatterns(
    tracker.id,
    90,
    new Date(entryDate)
  );

  // Load habit streaks for insights and motivation
  const { streaks, insights, loading: streaksLoading } = useHabitStreaks(tracker.id, 365);

  // Load predictive suggestions, alerts, and prompts
  const { suggestions: predictiveSuggestions, alerts, prompts, hasHighPriority, loading: predictionsLoading } = useHabitPredictions(
    tracker.id,
    new Date(entryDate)
  );

  // Load recent entries for "Same as yesterday" functionality
  const [recentEntries, setRecentEntries] = useState<TrackerEntry[]>([]);
  const [loadingRecentEntries, setLoadingRecentEntries] = useState(false);

  useEffect(() => {
    async function loadRecentEntries() {
      if (!tracker.id || existingEntry) return;
      
      try {
        setLoadingRecentEntries(true);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 7);
        
        const entries = await listEntriesByDateRange({
          tracker_id: tracker.id,
          start_date: yesterday.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
        });
        
        setRecentEntries(entries);
      } catch (err) {
        console.error('Failed to load recent entries:', err);
      } finally {
        setLoadingRecentEntries(false);
      }
    }

    loadRecentEntries();
  }, [tracker.id, existingEntry]);

  // Initialize form with existing entry or smart defaults
  useEffect(() => {
    if (existingEntry) {
      setFieldValues(existingEntry.field_values);
      setNotes(existingEntry.notes || '');
      setShowNotes(!!existingEntry.notes);
      setHabitNameInput(existingEntry.field_values?.habit_name as string || '');
    } else if (suggestions.defaultHabitName && patterns.size > 0) {
      const defaults: Record<string, string | number | boolean | null> = {};
      
      defaults.habit_name = suggestions.defaultHabitName;
      setHabitNameInput(suggestions.defaultHabitName);

      if (suggestions.defaultStatus) {
        defaults.status = suggestions.defaultStatus;
      }

      if (suggestions.defaultValueNumeric !== null) {
        defaults.value_numeric = suggestions.defaultValueNumeric;
      }

      if (suggestions.defaultValueBoolean !== null) {
        defaults.value_boolean = suggestions.defaultValueBoolean;
      }

      for (const field of tracker.field_schema_snapshot) {
        if (!defaults[field.id]) {
          if (field.default !== undefined) {
            defaults[field.id] = field.default;
          } else {
            defaults[field.id] = getDefaultValueForType(field.type);
          }
        }
      }

      setFieldValues(defaults);
      setNotes('');
      setShowNotes(false);
    } else {
      const defaults: Record<string, string | number | boolean | null> = {};
      for (const field of tracker.field_schema_snapshot) {
        if (field.default !== undefined) {
          defaults[field.id] = field.default;
        } else {
          defaults[field.id] = getDefaultValueForType(field.type);
        }
      }
      setFieldValues(defaults);
      setHabitNameInput('');
      setNotes('');
      setShowNotes(false);
    }
  }, [existingEntry, tracker, suggestions, patterns]);

  // Keyboard shortcuts
  useEffect(() => {
    if (readOnly || loading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.querySelector('form');
        if (form) {
          form.requestSubmit();
        }
      }
      
      // Escape to clear form
      if (e.key === 'Escape' && !existingEntry) {
        setHabitNameInput('');
        setFieldValues({});
        setNotes('');
        setShowNotes(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, loading, existingEntry]);

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

  const handleHabitNameChange = useCallback((value: string) => {
    setHabitNameInput(value);
    setFieldValues(prev => ({ ...prev, habit_name: value }));
    setShowSuggestions(true);
    setSelectedSuggestionIndex(-1);
  }, []);

  const handleSelectSuggestion = useCallback((habitName: string) => {
    setHabitNameInput(habitName);
    setFieldValues(prev => ({ ...prev, habit_name: habitName }));
    setShowSuggestions(false);

    if (patterns.has(habitName)) {
      const pattern = patterns.get(habitName)!;
      if (pattern.recentEntries.length > 0) {
        const recentEntry = pattern.recentEntries[0];
        setFieldValues(prev => ({
          ...prev,
          habit_name: habitName,
          status: recentEntry.field_values?.status || prev.status,
          value_numeric: recentEntry.field_values?.value_numeric || prev.value_numeric,
          value_boolean: recentEntry.field_values?.value_boolean ?? prev.value_boolean,
        }));
        if (recentEntry.notes) {
          setNotes(recentEntry.notes);
          setShowNotes(true);
        }
      }
    }
  }, [patterns]);

  const handleFieldChange = useCallback((fieldId: string, value: string | number | boolean | null) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }, [validationErrors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setSavingAnimation(true);
      setError(null);
      setValidationErrors({});

      // Validate required fields
      const errors: Record<string, string> = {};
      for (const field of tracker.field_schema_snapshot) {
        if (field.validation?.required) {
          const value = fieldValues[field.id];
          if (value === null || value === undefined || value === '') {
            errors[field.id] = 'Required';
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setSavingAnimation(false);
        setLoading(false);
        return;
      }

      if (existingEntry) {
        await updateEntry(existingEntry.id, {
          field_values: fieldValues,
          notes: notes.trim() || undefined,
        });
        showToast('success', 'Entry updated successfully! ✨');
      } else {
        await createEntry({
          tracker_id: tracker.id,
          entry_date: entryDate,
          field_values: fieldValues,
          notes: notes.trim() || undefined,
        });
        showToast('success', 'Habit logged! Keep it up! 🔥');
      }

      setSaved(true);
      setSavingAnimation(false);
      setTimeout(() => {
        setSaved(false);
        onEntrySaved();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save entry';
      setError(errorMessage);
      setSavingAnimation(false);
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = useCallback((habitName: string, pattern?: any) => {
    const defaults: Record<string, string | number | boolean | null> = {
      habit_name: habitName,
    };
    
    if (pattern) {
      defaults.status = pattern.mostCommonStatus || 'done';
      if (pattern.averageValueNumeric !== null) {
        defaults.value_numeric = pattern.averageValueNumeric;
      }
      if (pattern.averageValueBoolean !== null) {
        defaults.value_boolean = pattern.averageValueBoolean;
      }
    } else {
      defaults.status = 'done';
    }
    
    setFieldValues(defaults);
    setHabitNameInput(habitName);
    setNotes('');
    setShowNotes(false);
    
    // Auto-focus status field if it exists
    setTimeout(() => {
      const statusField = document.querySelector('[id*="status"]') as HTMLElement;
      if (statusField) statusField.focus();
    }, 100);
  }, []);

  // Find fields
  const habitNameField = tracker.field_schema_snapshot.find(f => f.id === 'habit_name');
  const statusField = tracker.field_schema_snapshot.find(f => f.id === 'status');
  const valueNumericField = tracker.field_schema_snapshot.find(f => f.id === 'value_numeric');
  const valueBooleanField = tracker.field_schema_snapshot.find(f => f.id === 'value_boolean');
  const notesField = tracker.field_schema_snapshot.find(f => f.id === 'notes');
  const otherFields = tracker.field_schema_snapshot.filter(
    f => !['habit_name', 'status', 'value_numeric', 'value_boolean', 'notes'].includes(f.id)
  );

  const isLoadingData = patternsLoading || streaksLoading || predictionsLoading || loadingRecentEntries;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Success Animation */}
      {saved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col items-center gap-3 sm:gap-4 animate-in zoom-in-95 fade-in duration-300 max-w-xs w-full">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
              <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 relative" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900">Saved!</p>
          </div>
        </div>
      )}
      
      {/* Error Message - Premium Design */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3 shadow-lg animate-in slide-in-from-top-2 fade-in">
          <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg flex-shrink-0">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base text-red-900 font-semibold mb-0.5 sm:mb-1">Oops!</p>
            <p className="text-xs sm:text-sm text-red-800 leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 transition-colors p-1.5 sm:p-2 rounded-lg hover:bg-red-100 flex-shrink-0 touch-manipulation"
            aria-label="Dismiss error"
          >
            <X size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}

      {/* Loading Skeleton for Initial Load */}
      {isLoadingData && !existingEntry && !habitNameInput && (
        <div className="space-y-3 sm:space-y-4 animate-pulse">
          <div className="h-20 sm:h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl sm:rounded-2xl"></div>
          <div className="h-14 sm:h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg sm:rounded-xl"></div>
          <div className="h-14 sm:h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg sm:rounded-xl"></div>
        </div>
      )}

      {/* Proactive Predictive Suggestions - Premium Card */}
      {predictiveSuggestions.length > 0 && !existingEntry && !isLoadingData && (
        <div className={`relative overflow-hidden bg-gradient-to-br ${
          hasHighPriority 
            ? 'from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-300' 
            : 'from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200'
        } rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300`}>
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className={`p-1.5 sm:p-2 rounded-lg ${hasHighPriority ? 'bg-orange-100' : 'bg-blue-100'}`}>
                <Lightbulb className={`h-4 w-4 sm:h-5 sm:w-5 ${hasHighPriority ? 'text-orange-600' : 'text-blue-600'}`} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Smart Suggestions</h3>
            </div>
            
            <div className="space-y-2.5 sm:space-y-3">
              {predictiveSuggestions.slice(0, 2).map((suggestion, idx) => (
                <div
                  key={idx}
                  className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 backdrop-blur-sm transition-all ${
                    suggestion.priority === 'high'
                      ? 'bg-white/70 border-orange-200 shadow-md'
                      : 'bg-white/60 border-blue-200 shadow-sm'
                  }`}
                >
                  <p className="text-xs sm:text-sm text-gray-800 mb-2.5 sm:mb-3 leading-relaxed">{suggestion.message}</p>
                  {suggestion.actionLabel && (
                    <button
                      type="button"
                      onClick={() => {
                        const pattern = patterns.get(suggestion.habitName);
                        handleQuickFill(suggestion.habitName, pattern);
                      }}
                      disabled={readOnly || loading}
                      className={`group inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-[36px] rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation ${
                        suggestion.priority === 'high'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md hover:shadow-lg active:scale-95'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md hover:shadow-lg active:scale-95'
                      }`}
                    >
                      {suggestion.actionLabel}
                      <Zap size={14} className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 group-active:animate-spin" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pattern Alerts - Refined */}
      {alerts.length > 0 && !existingEntry && !isLoadingData && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 sm:p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900">Pattern Insights</h3>
          </div>
          
          <div className="space-y-2.5 sm:space-y-3">
            {alerts.slice(0, 2).map((alert, idx) => (
              <div key={idx} className="p-3 sm:p-4 bg-white/80 backdrop-blur-sm border border-amber-200 rounded-lg sm:rounded-xl">
                <p className="text-xs sm:text-sm text-gray-900 mb-1 font-semibold leading-relaxed">{alert.message}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 mb-2">Pattern: {alert.pattern}</p>
                {alert.suggestion && (
                  <p className="text-[10px] sm:text-xs text-amber-800 bg-amber-50 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg mt-2 leading-relaxed">
                    💡 {alert.suggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions - Premium Grid */}
      {!existingEntry && recentEntries.length > 0 && !isLoadingData && (
        <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Quick Actions</h3>
            </div>
            <span className="hidden sm:inline text-xs text-gray-500 font-medium">Press ⌘+↩ to save</span>
          </div>
          
          <div className="space-y-2">
            {(() => {
              const currentHabitName = habitNameInput.trim();
              if (!currentHabitName) return null;
              
              const yesterdayEntry = getYesterdayEntry(currentHabitName, recentEntries);
              if (!yesterdayEntry) return null;

              return (
                <button
                  type="button"
                  onClick={() => {
                    setFieldValues(yesterdayEntry.field_values);
                    setHabitNameInput(yesterdayEntry.field_values?.habit_name as string || '');
                    setNotes(yesterdayEntry.notes || '');
                    setShowNotes(!!yesterdayEntry.notes);
                  }}
                  disabled={readOnly || loading}
                  className="group w-full flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 min-h-[56px] sm:min-h-[64px] bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg sm:rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98] touch-manipulation"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg group-active:bg-white/30 transition-colors flex-shrink-0">
                      <Copy size={16} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold truncate">Same as yesterday</p>
                      <p className="text-[10px] sm:text-xs opacity-90 truncate">
                        {yesterdayEntry.field_values?.status || 'Done'}
                        {yesterdayEntry.field_values?.value_numeric && typeof yesterdayEntry.field_values.value_numeric === 'number' && (
                          ` • ${yesterdayEntry.field_values.value_numeric}`
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block text-xs opacity-75 flex-shrink-0 ml-2">Click to apply</div>
                </button>
              );
            })()}

            {suggestions.suggestedHabitNames.slice(0, 3).map((habitName) => {
              const streak = streaks.get(habitName);
              const pattern = patterns.get(habitName);
              
              return (
                <button
                  key={habitName}
                  type="button"
                  onClick={() => handleQuickFill(habitName, pattern)}
                  disabled={readOnly || loading}
                  className="group w-full flex items-center justify-between px-4 sm:px-5 py-3 min-h-[48px] bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-2 border-gray-200 hover:border-blue-300 rounded-lg sm:rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation"
                >
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate flex-1 text-left pr-2">{habitName}</span>
                  {streak && streak.streakType === 'active' && streak.currentStreak > 0 && (
                    <span className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full shadow-sm flex-shrink-0">
                      <Flame size={10} className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-pulse" />
                      {streak.currentStreak}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Streak Insights - Premium Design */}
      {insights.length > 0 && !existingEntry && habitNameInput && streaks.has(habitNameInput) && !isLoadingData && (
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
          {insights
            .filter(insight => insight.habitName.toLowerCase() === habitNameInput.trim().toLowerCase())
            .map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 sm:gap-4">
                <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0 ${
                  insight.streak.streakType === 'active' && insight.streak.currentStreak > 0
                    ? insight.streak.currentStreak >= 7 
                      ? 'bg-gradient-to-br from-orange-400 to-red-500' 
                      : 'bg-gradient-to-br from-yellow-400 to-orange-500'
                    : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                } shadow-lg`}>
                  {insight.streak.streakType === 'active' && insight.streak.currentStreak > 0 ? (
                    <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  ) : (
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-bold text-gray-900 mb-1 leading-relaxed">{insight.message}</p>
                  {insight.streak.longestStreak > 0 && insight.streak.streakType === 'active' && (
                    <p className="text-xs sm:text-sm text-gray-700">
                      Best streak: <span className="font-bold text-orange-600">{insight.streak.longestStreak} days</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Contextual Note */}
      {suggestions.contextualNote && !existingEntry && !isLoadingData && (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3`}>
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">{suggestions.contextualNote}</p>
        </div>
      )}

      {/* Habit Name Field - Premium */}
      {habitNameField && (
        <div className={`relative ${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${
          validationErrors.habit_name ? 'border-red-400 shadow-red-200' : theme.borderColor
        } transition-all duration-200 hover:shadow-lg ${validationErrors.habit_name ? 'shadow-lg' : 'shadow-md'}`}>
          <HabitNameSelector
            value={habitNameInput}
            onChange={handleHabitNameChange}
            disabled={readOnly || loading}
            theme={theme}
            allowFreeType={true}
          />
          {validationErrors.habit_name && (
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1.5 sm:gap-2 animate-in slide-in-from-top-1">
              <AlertCircle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {validationErrors.habit_name}
            </p>
          )}
        </div>
      )}

      {/* Tracker Relationship Suggestion */}
      {habitNameInput && !existingEntry && (
        <TrackerRelationshipSuggestion
          habitName={habitNameInput}
          onSyncToDetailed={(trackerId) => {}}
        />
      )}

      {/* Status Field - Premium Pill Design */}
      {statusField && (
        <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${validationErrors.status ? 'border-red-400' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
          <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4">
            Status {statusField.validation?.required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {statusField.options?.map(option => {
              const isSelected = fieldValues.status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !readOnly && handleFieldChange('status', option.value)}
                  disabled={readOnly || loading}
                  className={`group relative px-4 sm:px-6 py-2.5 sm:py-3 min-h-[44px] sm:min-h-[40px] rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg sm:scale-105 ring-2 sm:ring-4 ring-blue-200'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 sm:hover:scale-105 shadow-sm'
                  }`}
                >
                  {option.label}
                  {isSelected && (
                    <CheckCircle2 size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline-block ml-1.5 sm:ml-2" />
                  )}
                </button>
              );
            })}
          </div>
          {validationErrors.status && (
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1.5 sm:gap-2">
              <AlertCircle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {validationErrors.status}
            </p>
          )}
        </div>
      )}

      {/* Numeric Value Field - Premium */}
      {valueNumericField && (
        <PremiumNumberInput
          field={valueNumericField}
          value={fieldValues.value_numeric as number | null}
          onChange={(value) => handleFieldChange('value_numeric', value)}
          error={validationErrors.value_numeric}
          readOnly={readOnly}
          theme={theme}
        />
      )}

      {/* Boolean Value Field - Premium Toggle */}
      {valueBooleanField && (
        <PremiumToggleInput
          field={valueBooleanField}
          value={fieldValues.value_boolean as boolean | null}
          onChange={(value) => handleFieldChange('value_boolean', value)}
          error={validationErrors.value_boolean}
          readOnly={readOnly}
          theme={theme}
        />
      )}

      {/* Other Fields */}
      {otherFields.map(field => (
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

      {/* Notes Field - Premium Collapsible */}
      <div>
        {!showNotes ? (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            disabled={readOnly}
            className={`w-full ${theme.accentBg} border-2 ${theme.borderColor} rounded-xl sm:rounded-2xl p-4 sm:p-5 text-left transition-all duration-200 hover:shadow-lg active:scale-[0.98] min-h-[56px] sm:min-h-[64px] touch-manipulation ${
              readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-gray-700">
                Add a note <span className="text-gray-500 font-normal">(optional)</span>
              </span>
              <div className="p-1.5 sm:p-2 bg-gray-100 rounded-lg group-active:bg-gray-200 transition-colors flex-shrink-0">
                <Plus size={16} className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-gray-600" />
              </div>
            </div>
          </button>
        ) : (
          <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${theme.borderColor} shadow-md transition-all`}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <label className="text-xs sm:text-sm font-bold text-gray-900">
                Note <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNotes(false);
                    setNotes('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Hide notes"
                >
                  <X size={18} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </button>
              )}
            </div>
            <textarea
              id="entry-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading || readOnly}
              rows={4}
              className="w-full px-4 sm:px-5 py-3 sm:py-4 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 resize-none text-sm sm:text-base bg-white disabled:bg-gray-50 transition-all placeholder:text-gray-400 leading-relaxed"
              placeholder="Reflections, observations, or anything you'd like to remember..."
            />
          </div>
        )}
      </div>

      {/* Submit Button - Premium Design */}
      {readOnly ? (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center`}>
          <p className={`text-xs sm:text-sm ${theme.accentText} font-semibold`}>You have read-only access to this tracker</p>
        </div>
      ) : (
        <button
          type="submit"
          disabled={loading}
          className={`group relative w-full px-6 sm:px-8 py-4 sm:py-5 min-h-[56px] sm:min-h-[60px] bg-gradient-to-r ${
            loading 
              ? 'from-gray-400 to-gray-500' 
              : 'from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 active:from-blue-700 active:via-indigo-700 active:to-purple-700'
          } text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden touch-manipulation active:scale-[0.98]`}
        >
          {savingAnimation && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          )}
          <div className="relative flex items-center justify-center gap-2 sm:gap-3">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                <span className="text-sm sm:text-base">Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={20} className="w-5 h-5 sm:w-6 sm:h-6 group-active:scale-110 transition-transform" />
                <span className="text-sm sm:text-base">{existingEntry ? 'Update Entry' : 'Save Entry'}</span>
                <span className="hidden sm:inline text-xs opacity-75 ml-auto">⌘↩</span>
              </>
            )}
          </div>
        </button>
      )}
    </form>
  );
}

// Premium Number Input Component
function PremiumNumberInput({
  field,
  value,
  onChange,
  error,
  readOnly,
  theme,
}: {
  field: TrackerFieldSchema;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  readOnly?: boolean;
  theme: TrackerTheme;
}) {
  const isRequired = field.validation?.required;

  return (
    <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${error ? 'border-red-400 shadow-red-200' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
      <label htmlFor={field.id} className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4">
        {field.label} {isRequired && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={field.id}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
          disabled={readOnly}
          min={field.validation?.min}
          max={field.validation?.max}
          step="any"
          className={`w-full px-4 sm:px-5 py-3.5 sm:py-4 border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-offset-0 text-xl sm:text-2xl font-bold text-center transition-all touch-manipulation ${
            error 
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
          } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'} hover:border-gray-400`}
          placeholder="0"
          inputMode="numeric"
        />
        {!readOnly && (
          <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 sm:gap-1">
            <button
              type="button"
              onClick={() => onChange((value ?? 0) + 1)}
              className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-gray-600 font-bold transition-colors touch-manipulation text-base sm:text-sm"
              aria-label="Increase value"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => onChange(Math.max((value ?? 0) - 1, field.validation?.min ?? 0))}
              className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-gray-600 font-bold transition-colors touch-manipulation text-base sm:text-sm"
              aria-label="Decrease value"
            >
              −
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1.5 sm:gap-2">
          <AlertCircle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {error}
        </p>
      )}
    </div>
  );
}

// Premium Toggle Input Component
function PremiumToggleInput({
  field,
  value,
  onChange,
  error,
  readOnly,
  theme,
}: {
  field: TrackerFieldSchema;
  value: boolean | null;
  onChange: (value: boolean) => void;
  error?: string;
  readOnly?: boolean;
  theme: TrackerTheme;
}) {
  const isRequired = field.validation?.required;
  const isChecked = value === true;

  return (
    <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${error ? 'border-red-400' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
      <label className={`flex items-center gap-3 sm:gap-4 cursor-pointer min-h-[44px] ${readOnly ? 'cursor-not-allowed' : ''}`}>
        <div className="relative flex-shrink-0">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly}
            className="sr-only"
          />
          <div
            className={`w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-all duration-300 touch-manipulation ${
              isChecked
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                : 'bg-gray-300'
            } ${readOnly ? 'opacity-50' : 'cursor-pointer'}`}
            onClick={() => !readOnly && onChange(!isChecked)}
          >
            <div
              className={`absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${
                isChecked ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
        <span className="text-sm sm:text-base font-bold text-gray-900 flex-1">
          {field.label} {isRequired && <span className="text-red-500">*</span>}
        </span>
        {isChecked && (
          <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 animate-in zoom-in-95 flex-shrink-0" />
        )}
      </label>
      {error && (
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1.5 sm:gap-2">
          <AlertCircle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {error}
        </p>
      )}
    </div>
  );
}

// Reuse FieldInput for other fields (keeping simpler design for less common fields)
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

  if (field.type === 'text' && field.options && field.options.length > 0) {
    return (
      <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${error ? 'border-red-400' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
        <label htmlFor={field.id} className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4">
          {field.label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        <select
          id={field.id}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={`w-full px-4 sm:px-5 py-3 sm:py-4 min-h-[48px] sm:min-h-[52px] border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-offset-0 text-sm sm:text-base font-semibold transition-all touch-manipulation ${
            error 
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
          } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white cursor-pointer'} hover:border-gray-400`}
        >
          <option value="">Select {field.label.toLowerCase()}...</option>
          {field.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1.5 sm:gap-2">
            <AlertCircle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {error}
          </p>
        )}
      </div>
    );
  }

  return null;
}
