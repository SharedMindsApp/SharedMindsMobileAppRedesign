/**
 * Intelligent Goal Tracker Entry Form - Premium Edition
 * 
 * High-end, responsive, intelligent entry form for goal tracking with:
 * - Progress momentum analysis
 * - Milestone detection
 * - Next steps suggestions
 * - Obstacle identification
 * - Mobile-optimized design
 * - Optional Goals Activity system integration
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createEntry, updateEntry, getEntryByDate, listEntriesByDateRange } from '../../lib/trackerStudio/trackerEntryService';
import type { Tracker, TrackerEntry, TrackerFieldSchema } from '../../lib/trackerStudio/types';
import { Loader2, AlertCircle, CheckCircle2, X, Sparkles, Target, TrendingUp, Calendar, Lightbulb, Trophy, AlertTriangle, Rocket, Flag, Plus, ArrowRight } from 'lucide-react';
import type { TrackerTheme } from '../../lib/trackerStudio/trackerThemeUtils';
import { useAuth } from '../../contexts/AuthContext';
import { analyzeGoalProgress, getGoalPattern } from '../../lib/trackerStudio/goalTrackerIntelligence';
import { listGoals } from '../../lib/goals/goalsService';
import { showToast } from '../Toast';

type IntelligentGoalTrackerEntryFormProps = {
  tracker: Tracker;
  entryDate: string;
  existingEntry?: TrackerEntry | null;
  onEntrySaved: () => void;
  readOnly?: boolean;
  theme: TrackerTheme;
};

export function IntelligentGoalTrackerEntryForm({
  tracker,
  entryDate,
  existingEntry,
  onEntrySaved,
  readOnly = false,
  theme,
}: IntelligentGoalTrackerEntryFormProps) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | boolean | null>>({});
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [savingAnimation, setSavingAnimation] = useState(false);
  
  // Intelligence data
  const [progressInsight, setProgressInsight] = useState<any>(null);
  const [goalPattern, setGoalPattern] = useState<any>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [goalsFromActivitySystem, setGoalsFromActivitySystem] = useState<any[]>([]);

  // Load goals from activity system for linking
  useEffect(() => {
    async function loadGoals() {
      if (!user) return;
      
      try {
        const goals = await listGoals(user.id);
        setGoalsFromActivitySystem(goals);
      } catch (err) {
        console.error('Failed to load goals from activity system:', err);
      }
    }

    loadGoals();
  }, [user]);

  // Calculate progress velocity and insights
  useEffect(() => {
    async function calculateInsights() {
      const goalName = fieldValues.goal_name as string;
      const currentProgress = fieldValues.progress as number;
      
      if (!goalName || currentProgress === undefined || !user) return;
      
      try {
        setLoadingInsight(true);
        const [insight, pattern] = await Promise.all([
          analyzeGoalProgress(tracker, goalName, entryDate),
          getGoalPattern(tracker, goalName),
        ]);
        
        setProgressInsight(insight);
        setGoalPattern(pattern);
        
        // Auto-calculate progress velocity if not set
        if (insight && !fieldValues.progress_velocity && fieldValues.progress !== undefined) {
          setFieldValues(prev => ({
            ...prev,
            progress_velocity: insight.velocity,
            momentum: insight.momentum,
          }));
        }
        
        // Auto-detect milestone
        if (insight?.milestoneReached && insight.milestoneDetails && !fieldValues.milestone) {
          setFieldValues(prev => ({
            ...prev,
            milestone: insight.milestoneDetails,
            celebration: insight.milestoneDetails,
          }));
        }
      } catch (err) {
        console.error('Failed to calculate insights:', err);
      } finally {
        setLoadingInsight(false);
      }
    }

    if (fieldValues.goal_name && fieldValues.progress !== undefined) {
      calculateInsights();
    }
  }, [fieldValues.goal_name, fieldValues.progress, tracker, entryDate, user]);

  // Initialize form
  useEffect(() => {
    if (existingEntry) {
      setFieldValues(existingEntry.field_values);
      setNotes(existingEntry.notes || '');
      setShowNotes(!!existingEntry.notes);
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
        return 3;
      case 'date':
        return entryDate;
      default:
        return null;
    }
  };

  const handleFieldChange = useCallback((fieldId: string, value: string | number | boolean | null) => {
    setFieldValues(prev => {
      const next = { ...prev, [fieldId]: value };
      
      // Auto-calculate days remaining if target_date and entry_date are set
      if (fieldId === 'target_date' && value) {
        const targetDate = new Date(value as string);
        const currentDate = new Date(entryDate);
        const daysRemaining = Math.max(0, Math.floor((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
        next.time_remaining_days = daysRemaining;
      }
      
      // Auto-calculate progress velocity when progress changes
      if (fieldId === 'progress' && value !== undefined && value !== null) {
        // This will be calculated by the insight effect above
      }
      
      return next;
    });
    
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }, [validationErrors, entryDate]);

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
        showToast('success', 'Goal progress updated! 🎯');
      } else {
        await createEntry({
          tracker_id: tracker.id,
          entry_date: entryDate,
          field_values: fieldValues,
          notes: notes.trim() || undefined,
        });
        showToast('success', 'Goal progress logged! Keep going! 🚀');
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

  // Find fields
  const goalNameField = tracker.field_schema_snapshot.find(f => f.id === 'goal_name');
  const progressField = tracker.field_schema_snapshot.find(f => f.id === 'progress');
  const statusField = tracker.field_schema_snapshot.find(f => f.id === 'status');
  const milestoneField = tracker.field_schema_snapshot.find(f => f.id === 'milestone');
  const targetDateField = tracker.field_schema_snapshot.find(f => f.id === 'target_date');
  const otherFields = tracker.field_schema_snapshot.filter(
    f => !['goal_name', 'progress', 'status', 'milestone', 'target_date', 'notes'].includes(f.id)
  );

  const currentProgress = (fieldValues.progress as number) || 0;
  const progressPercentage = Math.min(100, Math.max(0, currentProgress));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Success Animation */}
      {saved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col items-center gap-3 sm:gap-4 animate-in zoom-in-95 fade-in duration-300 max-w-xs w-full">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
              <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 relative" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900">Saved!</p>
          </div>
        </div>
      )}
      
      {/* Error Message */}
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
            className="text-red-400 hover:text-red-600 transition-colors p-1.5 sm:p-2 rounded-lg hover:bg-red-100 flex-shrink-0 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Dismiss error"
          >
            <X size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}

      {/* Progress Insight Card - Premium */}
      {progressInsight && !existingEntry && (
        <div className={`relative overflow-hidden bg-gradient-to-br ${
          progressInsight.milestoneReached
            ? 'from-yellow-50 via-amber-50 to-orange-50 border-2 border-yellow-300'
            : progressInsight.isOnTrack
            ? 'from-green-50 via-emerald-50 to-teal-50 border-2 border-green-300'
            : 'from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200'
        } rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg`}>
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16"></div>
          <div className="relative">
            {progressInsight.milestoneReached && (
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">Milestone Achieved! 🎉</h3>
              </div>
            )}
            
            {progressInsight.suggestion && (
              <div className="p-3 sm:p-4 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg sm:rounded-xl mb-3">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-gray-800 leading-relaxed flex-1">{progressInsight.suggestion}</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3 bg-white/60 rounded-lg">
                <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Velocity</p>
                <p className={`text-sm sm:text-base font-bold ${
                  progressInsight.velocity > 0 ? 'text-green-600' : 
                  progressInsight.velocity < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {progressInsight.velocity > 0 ? '+' : ''}{progressInsight.velocity.toFixed(1)}%
                </p>
              </div>
              <div className="p-2.5 sm:p-3 bg-white/60 rounded-lg">
                <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Momentum</p>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 capitalize">
                  {progressInsight.momentum}
                </p>
              </div>
              {progressInsight.daysRemaining !== null && (
                <div className="p-2.5 sm:p-3 bg-white/60 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Days Left</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900">{progressInsight.daysRemaining}</p>
                </div>
              )}
              {progressInsight.daysSinceStart > 0 && (
                <div className="p-2.5 sm:p-3 bg-white/60 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Days Active</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900">{progressInsight.daysSinceStart}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Goal Name Field - Premium with Autocomplete */}
      {goalNameField && (
        <div className={`relative ${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${
          validationErrors.goal_name ? 'border-red-400 shadow-red-200' : theme.borderColor
        } transition-all duration-200 hover:shadow-lg ${validationErrors.goal_name ? 'shadow-lg' : 'shadow-md'}`}>
          <label htmlFor={goalNameField.id} className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4">
            {goalNameField.label} {goalNameField.validation?.required && <span className="text-red-500">*</span>}
          </label>
          
          <input
            id={goalNameField.id}
            type="text"
            value={(fieldValues.goal_name as string) || ''}
            onChange={(e) => handleFieldChange('goal_name', e.target.value)}
            disabled={readOnly || loading}
            placeholder="What goal are you working on?"
            className={`w-full px-4 sm:px-5 py-3 sm:py-4 min-h-[48px] sm:min-h-[44px] border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-offset-0 transition-all text-sm sm:text-base font-semibold touch-manipulation ${
              validationErrors.goal_name 
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'} hover:border-gray-400`}
          />
          
          {/* Goals from Activity System Suggestions */}
          {goalsFromActivitySystem.length > 0 && !fieldValues.goal_name && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Or link to existing goal:</p>
              <div className="flex flex-wrap gap-2">
                {goalsFromActivitySystem.slice(0, 5).map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => {
                      handleFieldChange('goal_name', goal.activity.title);
                      handleFieldChange('linked_goal_id', goal.id);
                    }}
                    disabled={readOnly || loading}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 min-h-[36px] text-xs sm:text-sm bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg font-medium text-gray-900 transition-colors touch-manipulation active:scale-95"
                  >
                    {goal.activity.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {validationErrors.goal_name && (
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1.5 sm:gap-2 animate-in slide-in-from-top-1">
              <AlertCircle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {validationErrors.goal_name}
            </p>
          )}
        </div>
      )}

      {/* Progress Field - Premium Visual */}
      {progressField && (
        <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${validationErrors.progress ? 'border-red-400' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
          <div className="mb-3 sm:mb-4">
            <label htmlFor={progressField.id} className="block text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">
              {progressField.label} {progressField.validation?.required && <span className="text-red-500">*</span>}
            </label>
            
            {/* Visual Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 sm:h-5 mb-3 sm:mb-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercentage >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  progressPercentage >= 75 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                  progressPercentage >= 50 ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                  progressPercentage >= 25 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                  'bg-gradient-to-r from-gray-400 to-gray-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            {/* Progress Percentage Display */}
            <div className="relative">
              <input
                id={progressField.id}
                type="number"
                value={currentProgress}
                onChange={(e) => handleFieldChange('progress', e.target.value ? parseFloat(e.target.value) : 0)}
                disabled={readOnly}
                min={progressField.validation?.min || 0}
                max={progressField.validation?.max || 100}
                step="1"
                className={`w-full px-4 sm:px-5 py-3 sm:py-4 min-h-[48px] sm:min-h-[52px] border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-offset-0 text-2xl sm:text-3xl font-bold text-center transition-all touch-manipulation ${
                  validationErrors.progress 
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'} hover:border-gray-400`}
                placeholder="0"
                inputMode="numeric"
              />
              <span className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-bold text-gray-400 pointer-events-none">
                %
              </span>
              
              {/* Quick Progress Buttons */}
              {!readOnly && (
                <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
                  {[0, 25, 50, 75, 100].map(percentage => (
                    <button
                      key={percentage}
                      type="button"
                      onClick={() => handleFieldChange('progress', percentage)}
                      className={`flex-1 min-w-[60px] px-3 sm:px-4 py-2 min-h-[44px] rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all touch-manipulation active:scale-95 ${
                        currentProgress === percentage
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      }`}
                    >
                      {percentage}%
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {validationErrors.progress && (
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1.5 sm:gap-2">
              <AlertCircle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {validationErrors.progress}
            </p>
          )}
        </div>
      )}

      {/* Status Field - Premium Pills */}
      {statusField && (
        <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${validationErrors.status ? 'border-red-400' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
          <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4">
            Status {statusField.validation?.required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {statusField.options?.map(option => {
              const isSelected = fieldValues.status === option.value;
              const statusColors: Record<string, string> = {
                active: 'from-green-500 to-emerald-500',
                in_progress: 'from-blue-500 to-indigo-500',
                completed: 'from-purple-500 to-pink-500',
                paused: 'from-yellow-400 to-orange-500',
                archived: 'from-gray-400 to-gray-500',
              };
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !readOnly && handleFieldChange('status', option.value)}
                  disabled={readOnly || loading}
                  className={`group relative px-4 sm:px-6 py-2.5 sm:py-3 min-h-[44px] sm:min-h-[40px] rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 ${
                    isSelected
                      ? `bg-gradient-to-r ${statusColors[option.value] || 'from-blue-500 to-indigo-500'} text-white shadow-lg sm:scale-105 ring-2 sm:ring-4 ring-opacity-30`
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

      {/* Milestone Field - Highlighted */}
      {milestoneField && (
        <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${theme.borderColor} shadow-md transition-all hover:shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200`}>
          <label htmlFor={milestoneField.id} className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
            {milestoneField.label}
          </label>
          <textarea
            id={milestoneField.id}
            value={(fieldValues.milestone as string) || ''}
            onChange={(e) => handleFieldChange('milestone', e.target.value)}
            disabled={readOnly}
            rows={3}
            maxLength={milestoneField.validation?.maxLength}
            className="w-full px-4 sm:px-5 py-3 sm:py-4 border-2 border-yellow-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-yellow-200 focus:border-yellow-400 resize-none text-sm sm:text-base bg-white disabled:bg-gray-50 transition-all placeholder:text-gray-400 leading-relaxed"
            placeholder="Celebrate your wins! What milestone did you reach?"
          />
        </div>
      )}

      {/* Target Date Field */}
      {targetDateField && (
        <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${validationErrors.target_date ? 'border-red-400' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
          <label htmlFor={targetDateField.id} className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            {targetDateField.label}
          </label>
          <input
            id={targetDateField.id}
            type="date"
            value={(fieldValues.target_date as string) || ''}
            onChange={(e) => handleFieldChange('target_date', e.target.value)}
            disabled={readOnly}
            min={entryDate}
            className={`w-full px-4 sm:px-5 py-3 sm:py-4 min-h-[48px] sm:min-h-[44px] border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-offset-0 transition-all text-sm sm:text-base font-medium touch-manipulation ${
              validationErrors.target_date 
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'} hover:border-gray-400`}
          />
          {fieldValues.time_remaining_days !== undefined && fieldValues.time_remaining_days !== null && (
            <p className="mt-2 text-xs sm:text-sm text-gray-600">
              {fieldValues.time_remaining_days} days remaining
            </p>
          )}
        </div>
      )}

      {/* Other Fields */}
      {otherFields.map(field => (
        <GoalFieldInput
          key={field.id}
          field={field}
          value={fieldValues[field.id]}
          onChange={(value) => handleFieldChange(field.id, value)}
          error={validationErrors[field.id]}
          readOnly={readOnly}
          theme={theme}
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
                Add notes / reflection <span className="text-gray-500 font-normal">(optional)</span>
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
                Notes / Reflection <span className="text-gray-500 font-normal">(optional)</span>
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
              placeholder="Reflections, insights, challenges, wins, next steps..."
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
                <Target size={20} className="w-5 h-5 sm:w-6 sm:h-6 group-active:scale-110 transition-transform" />
                <span className="text-sm sm:text-base">{existingEntry ? 'Update Progress' : 'Log Progress'}</span>
              </>
            )}
          </div>
        </button>
      )}
    </form>
  );
}

// Goal Field Input Component
function GoalFieldInput({
  field,
  value,
  onChange,
  error,
  readOnly,
  theme,
}: {
  field: TrackerFieldSchema;
  value: string | number | boolean | null;
  onChange: (value: string | number | boolean | null) => void;
  error?: string;
  readOnly?: boolean;
  theme: TrackerTheme;
}) {
  const isRequired = field.validation?.required;

  // Handle rating fields (confidence, motivation)
  if (field.type === 'rating') {
    return (
      <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${error ? 'border-red-400' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
        <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4">
          {field.label} {isRequired && <span className="text-red-500">*</span>}
          {field.description && (
            <span className="block text-[10px] sm:text-xs text-gray-500 font-normal mt-1">
              {field.description}
            </span>
          )}
        </label>
        <div className="flex items-center gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map(level => (
            <button
              key={level}
              type="button"
              onClick={() => !readOnly && onChange(level)}
              disabled={readOnly}
              className={`flex-1 h-12 sm:h-14 rounded-lg sm:rounded-xl border-2 transition-all font-bold text-sm sm:text-base touch-manipulation active:scale-95 ${
                (value as number) === level
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-600 text-white shadow-lg scale-105 ring-2 sm:ring-4 ring-blue-200'
                  : readOnly
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {level}
            </button>
          ))}
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

  // Handle text fields with options (dropdown)
  if (field.type === 'text' && field.options && field.options.length > 0) {
    return (
      <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${error ? 'border-red-400' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
        <label htmlFor={field.id} className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4">
          {field.label} {isRequired && <span className="text-red-500">*</span>}
          {field.description && (
            <span className="block text-[10px] sm:text-xs text-gray-500 font-normal mt-1">
              {field.description}
            </span>
          )}
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

  // Handle number fields
  if (field.type === 'number') {
    return (
      <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${error ? 'border-red-400' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
        <label htmlFor={field.id} className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4">
          {field.label} {isRequired && <span className="text-red-500">*</span>}
          {field.description && (
            <span className="block text-[10px] sm:text-xs text-gray-500 font-normal mt-1">
              {field.description}
            </span>
          )}
        </label>
        <input
          id={field.id}
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
          disabled={readOnly}
          min={field.validation?.min}
          max={field.validation?.max}
          step="any"
          className={`w-full px-4 sm:px-5 py-3 sm:py-4 min-h-[48px] sm:min-h-[44px] border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-offset-0 text-base sm:text-lg font-semibold transition-all touch-manipulation ${
            error 
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
          } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'} hover:border-gray-400`}
          placeholder="0"
          inputMode="numeric"
        />
        {error && (
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1.5 sm:gap-2">
            <AlertCircle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {error}
          </p>
        )}
      </div>
    );
  }

  // Handle date fields
  if (field.type === 'date') {
    return (
      <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${error ? 'border-red-400' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
        <label htmlFor={field.id} className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4">
          {field.label} {isRequired && <span className="text-red-500">*</span>}
          {field.description && (
            <span className="block text-[10px] sm:text-xs text-gray-500 font-normal mt-1">
              {field.description}
            </span>
          )}
        </label>
        <input
          id={field.id}
          type="date"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={`w-full px-4 sm:px-5 py-3 sm:py-4 min-h-[48px] sm:min-h-[44px] border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-offset-0 transition-all text-sm sm:text-base font-medium touch-manipulation ${
            error 
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
          } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'} hover:border-gray-400`}
        />
        {error && (
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1.5 sm:gap-2">
            <AlertCircle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {error}
          </p>
        )}
      </div>
    );
  }

  // Handle text fields (textarea)
  return (
    <div className={`${theme.accentBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 ${error ? 'border-red-400' : theme.borderColor} shadow-md transition-all hover:shadow-lg`}>
      <label htmlFor={field.id} className="block text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4">
        {field.label} {isRequired && <span className="text-red-500">*</span>}
        {field.description && (
          <span className="block text-[10px] sm:text-xs text-gray-500 font-normal mt-1">
            {field.description}
          </span>
        )}
      </label>
      <textarea
        id={field.id}
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        rows={field.id.includes('why') || field.id.includes('notes') ? 4 : 3}
        maxLength={field.validation?.maxLength}
        className={`w-full px-4 sm:px-5 py-3 sm:py-4 border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-offset-0 resize-none text-sm sm:text-base transition-all placeholder:text-gray-400 leading-relaxed touch-manipulation ${
          error 
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
        } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
        placeholder={field.description || `Enter ${field.label.toLowerCase()}...`}
      />
      {error && (
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1.5 sm:gap-2">
          <AlertCircle size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {error}
        </p>
      )}
    </div>
  );
}
