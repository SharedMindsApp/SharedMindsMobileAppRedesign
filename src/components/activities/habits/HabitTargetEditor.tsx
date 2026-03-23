/**
 * Habit Target Editor
 * 
 * Progressive disclosure editor for setting habit targets.
 * Lightweight, optional, non-prescriptive.
 */

import { useState } from 'react';
import { Target, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { HabitTarget, HabitMetricType, HabitDirection } from '../../../lib/habits/habitsService';

interface HabitTargetEditorProps {
  defaultTarget?: HabitTarget;
  onTargetChange: (target: HabitTarget | null) => void;
  isMobile?: boolean;
}

export function HabitTargetEditor({ defaultTarget, onTargetChange, isMobile = false }: HabitTargetEditorProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [targetType, setTargetType] = useState<'none' | 'target'>(
    defaultTarget ? 'target' : 'none'
  );
  const [metricType, setMetricType] = useState<HabitMetricType>(
    defaultTarget?.metricType || 'boolean'
  );
  const [targetValue, setTargetValue] = useState<number | undefined>(
    defaultTarget?.targetValue
  );
  const [unit, setUnit] = useState<string>(defaultTarget?.unit || '');
  const [comparison, setComparison] = useState<HabitDirection>(
    defaultTarget?.comparison || 'at_least'
  );
  const [description, setDescription] = useState<string>(
    defaultTarget?.description || ''
  );

  // Update parent when target changes
  const updateTarget = (type: 'none' | 'target') => {
    setTargetType(type);
    if (type === 'none') {
      onTargetChange(null);
    } else {
      // Only create target if we have meaningful data
      if (metricType === 'boolean') {
        onTargetChange({
          metricType: 'boolean',
        });
      } else if (metricType === 'limit' || metricType === 'duration' || metricType === 'count') {
        if (targetValue !== undefined && targetValue > 0) {
          onTargetChange({
            metricType,
            targetValue,
            unit: unit || getDefaultUnit(metricType),
            comparison,
            description: description || generateDescription(metricType, targetValue, unit || getDefaultUnit(metricType), comparison),
          });
        } else {
          onTargetChange(null);
        }
      } else {
        onTargetChange({
          metricType,
          targetValue,
          unit,
          comparison,
          description,
        });
      }
    }
  };

  const getDefaultUnit = (type: HabitMetricType): string => {
    switch (type) {
      case 'duration':
      case 'minutes':
        return 'minutes';
      case 'limit':
        return 'cups';
      case 'count':
        return 'times';
      default:
        return '';
    }
  };

  const generateDescription = (
    type: HabitMetricType,
    value: number | undefined,
    unitStr: string,
    comp: HabitDirection
  ): string => {
    if (value === undefined) return '';
    const compText = comp === 'at_least' ? 'At least' : comp === 'at_most' ? 'Up to' : 'Exactly';
    return `${compText} ${value} ${unitStr}`;
  };

  // Auto-update description when values change
  const handleValueChange = (value: number | undefined) => {
    setTargetValue(value);
    if (value !== undefined && value > 0) {
      const newDesc = generateDescription(metricType, value, unit || getDefaultUnit(metricType), comparison);
      setDescription(newDesc);
    }
  };

  const handleComparisonChange = (comp: HabitDirection) => {
    setComparison(comp);
    if (targetValue !== undefined && targetValue > 0) {
      const newDesc = generateDescription(metricType, targetValue, unit || getDefaultUnit(metricType), comp);
      setDescription(newDesc);
    }
  };

  const handleMetricTypeChange = (type: HabitMetricType) => {
    setMetricType(type);
    const defaultUnit = getDefaultUnit(type);
    setUnit(defaultUnit);
    if (targetValue !== undefined && targetValue > 0) {
      const newDesc = generateDescription(type, targetValue, defaultUnit, comparison);
      setDescription(newDesc);
    }
  };

  return (
    <div className="space-y-2">
      {/* Toggle: Just mark done / Set a gentle target */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setShowEditor(false);
            updateTarget('none');
          }}
          className={`
            flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${targetType === 'none'
              ? 'bg-gray-100 text-gray-900 border-2 border-gray-300'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }
          `}
        >
          Just mark done
        </button>
        <button
          type="button"
          onClick={() => {
            setShowEditor(true);
            updateTarget('target');
          }}
          className={`
            flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5
            ${targetType === 'target'
              ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-300'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }
          `}
        >
          <Target size={14} />
          Set a gentle target
        </button>
      </div>

      {/* Progressive Editor - Only shown when "Set a gentle target" is selected */}
      {showEditor && targetType === 'target' && (
        <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Metric Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              What are you tracking?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleMetricTypeChange('limit')}
                className={`
                  px-3 py-2 rounded-lg text-xs font-medium transition-colors
                  ${metricType === 'limit'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                Limit
              </button>
              <button
                type="button"
                onClick={() => handleMetricTypeChange('duration')}
                className={`
                  px-3 py-2 rounded-lg text-xs font-medium transition-colors
                  ${metricType === 'duration'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                Duration
              </button>
              <button
                type="button"
                onClick={() => handleMetricTypeChange('count')}
                className={`
                  px-3 py-2 rounded-lg text-xs font-medium transition-colors
                  ${metricType === 'count'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                Count
              </button>
              <button
                type="button"
                onClick={() => handleMetricTypeChange('boolean')}
                className={`
                  px-3 py-2 rounded-lg text-xs font-medium transition-colors
                  ${metricType === 'boolean'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                Yes/No
              </button>
            </div>
          </div>

          {/* Target Value & Unit (for limit, duration, count) */}
          {(metricType === 'limit' || metricType === 'duration' || metricType === 'count') && (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target
                </label>
                <input
                  type="number"
                  min="0"
                  step={metricType === 'duration' ? 1 : metricType === 'limit' ? 0.5 : 1}
                  value={targetValue || ''}
                  onChange={(e) => handleValueChange(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 1"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    if (targetValue !== undefined && targetValue > 0) {
                      const newDesc = generateDescription(metricType, targetValue, e.target.value || getDefaultUnit(metricType), comparison);
                      setDescription(newDesc);
                    }
                  }}
                  placeholder={getDefaultUnit(metricType)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Comparison (for limit, duration, count) */}
          {(metricType === 'limit' || metricType === 'duration' || metricType === 'count') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Goal type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleComparisonChange('at_least')}
                  className={`
                    flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${comparison === 'at_least'
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }
                  `}
                >
                  At least
                </button>
                <button
                  type="button"
                  onClick={() => handleComparisonChange('at_most')}
                  className={`
                    flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${comparison === 'at_most'
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }
                  `}
                >
                  Up to
                </button>
                <button
                  type="button"
                  onClick={() => handleComparisonChange('exactly')}
                  className={`
                    flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${comparison === 'exactly'
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }
                  `}
                >
                  Exactly
                </button>
              </div>
            </div>
          )}

          {/* Preview Description */}
          {description && (
            <div className="text-xs text-gray-600 italic bg-white/60 px-2 py-1.5 rounded border border-indigo-100">
              "{description}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
