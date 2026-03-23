/**
 * Todo Breakdown Modal (Phase 1)
 * 
 * AI-powered task breakdown for personal todos.
 * Phase 1: Simple, explicit context only. No learning, no inference.
 */

import { useState } from 'react';
import { X, Sparkles, Target, CheckCircle2 } from 'lucide-react';
import {
  generateAITaskBreakdown,
  saveTaskBreakdown,
  type TaskBreakdownResult,
} from '../../../lib/intelligentTodoService';
import type { TaskBreakdownContext } from '../../../lib/planner/taskBreakdownService';
import { showToast } from '../../Toast';

interface TodoBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  taskId: string;
  userId: string;
  onBreakdownSaved?: () => void;
}

export function TodoBreakdownModal({
  isOpen,
  onClose,
  taskTitle,
  taskId,
  userId,
  onBreakdownSaved,
}: TodoBreakdownModalProps) {
  const [context, setContext] = useState<TaskBreakdownContext | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [breakdown, setBreakdown] = useState<TaskBreakdownResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!taskTitle.trim()) return;

    setIsGenerating(true);
    try {
      const result = await generateAITaskBreakdown({
        taskTitle,
        context: context || undefined,
        userId,
      });
      setBreakdown(result);
    } catch (error) {
      console.error('Error generating breakdown:', error);
      showToast('error', 'Failed to generate breakdown. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!breakdown) return;

    setIsSaving(true);
    try {
      await saveTaskBreakdown(taskId, breakdown, userId);
      showToast('success', 'Breakdown saved! You can now work through the steps.');
      onBreakdownSaved?.();
      handleClose();
    } catch (error) {
      console.error('Error saving breakdown:', error);
      showToast('error', 'Failed to save breakdown. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setBreakdown(null);
    setContext(null);
    onClose();
  };

  const contextOptions: Array<{ id: TaskBreakdownContext; label: string }> = [
    { id: 'too_big', label: 'Too big' },
    { id: 'dont_know_where_to_start', label: "Don't know where to start" },
    { id: 'boring_low_energy', label: 'Boring / low energy' },
    { id: 'time_pressure', label: 'Time pressure' },
    { id: 'emotional_resistance', label: 'Emotional resistance' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Break this down</h2>
              <p className="text-xs text-gray-500 mt-0.5">Make it easier to start</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!breakdown ? (
            <>
              {/* Task Title Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task
                </label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                  {taskTitle}
                </div>
              </div>

              {/* Context Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What feels hard about this? <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {contextOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setContext(option.id)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-colors text-left ${
                        context === option.id
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  You can skip this — sometimes seeing it smaller is enough.
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Break it down
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Generated Micro-Steps */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Micro-steps</h3>
                </div>
                <div className="space-y-2">
                  {breakdown.microSteps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm text-gray-800 leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
                {breakdown.encouragementMessage && (
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-700 italic">{breakdown.encouragementMessage}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  {isSaving ? 'Saving...' : 'Save breakdown'}
                </button>
                
                <button
                  onClick={() => setBreakdown(null)}
                  className="w-full px-6 py-3 bg-white border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
                >
                  Generate different breakdown
                </button>
                
                <button
                  onClick={handleClose}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
