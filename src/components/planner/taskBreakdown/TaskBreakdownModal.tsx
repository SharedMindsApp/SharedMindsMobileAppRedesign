/**
 * Task Breakdown Modal (Cognitive Unblocker)
 * 
 * Helps users break down overwhelming tasks into tiny wins.
 * Only shown when explicitly requested - no auto-prompts.
 */

import { useState, useEffect } from 'react';
import { X, Sparkles, Target, ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  generateTaskBreakdown,
  getUserBreakdownPatterns,
  type TaskBreakdownContext,
  type TaskBreakdownResult,
  type UserBreakdownPattern,
} from '../../../lib/planner/taskBreakdownService';
import type { EnergyMode } from '../../../lib/planner/adaptivePlanEngine';

interface TaskBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTaskTitle: string;
  taskId?: string; // Guardrails task ID (optional)
  energyMode?: EnergyMode; // Current energy mode (for adaptation)
  userId?: string; // User ID (for pattern analysis)
  onAddToTinyWins?: (microStep: string) => void;
  onSaveBreakdown?: (breakdown: TaskBreakdownResult) => void;
}

export function TaskBreakdownModal({
  isOpen,
  onClose,
  initialTaskTitle,
  taskId,
  energyMode,
  userId,
  onAddToTinyWins,
  onSaveBreakdown,
}: TaskBreakdownModalProps) {
  const [taskTitle, setTaskTitle] = useState(initialTaskTitle);
  const [context, setContext] = useState<TaskBreakdownContext | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [breakdown, setBreakdown] = useState<TaskBreakdownResult | null>(null);
  const [selectedMicroStep, setSelectedMicroStep] = useState<string | null>(null);
  const [userPatterns, setUserPatterns] = useState<UserBreakdownPattern | null>(null);
  const [suggestedContexts, setSuggestedContexts] = useState<TaskBreakdownContext[]>([]);

  // Load user patterns when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadUserPatterns();
    }
  }, [isOpen, userId]);

  async function loadUserPatterns() {
    if (!userId) return;
    
    try {
      const patterns = await getUserBreakdownPatterns(userId);
      setUserPatterns(patterns);
      
      // Suggest contexts based on user patterns
      if (patterns.preferredContexts.length > 0) {
        setSuggestedContexts(patterns.preferredContexts);
      }
    } catch (error) {
      console.error('Error loading user patterns:', error);
    }
  }

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!taskTitle.trim()) return;

    setIsGenerating(true);
    setSelectedMicroStep(null); // Reset selection when generating new breakdown
    try {
      // Generate breakdown with energy mode and user patterns for adaptation
      const result = await generateTaskBreakdown(
        taskTitle,
        context,
        energyMode,
        userPatterns || undefined
      );
      setBreakdown(result);
    } catch (error) {
      console.error('Error generating breakdown:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePickOne = () => {
    if (!selectedMicroStep || !onAddToTinyWins) return;
    
    onAddToTinyWins(selectedMicroStep);
    handleClose();
  };

  const handleSaveBreakdown = () => {
    if (!breakdown || !onSaveBreakdown) return;
    
    onSaveBreakdown({
      ...breakdown,
      taskId,
    });
    handleClose();
  };

  const handleClose = () => {
    setBreakdown(null);
    setContext(null);
    setSelectedMicroStep(null);
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
              <h2 className="text-lg font-semibold text-gray-900">Let's make this easier</h2>
              <p className="text-xs text-gray-500 mt-0.5">Break it down into tiny wins</p>
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
              {/* Task Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What do you need to do?
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Write report, Clean kitchen..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Context (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What feels hard about this? <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                {suggestedContexts.length > 0 && (
                  <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
                    <p className="text-xs text-purple-700 mb-1">
                      Based on your patterns, you often select:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {suggestedContexts.map((suggestedCtx) => {
                        const option = contextOptions.find(o => o.id === suggestedCtx);
                        if (!option) return null;
                        return (
                          <button
                            key={suggestedCtx}
                            onClick={() => setContext(suggestedCtx)}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded border border-purple-300 hover:bg-purple-200 transition-colors"
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {contextOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setContext(option.id)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-colors text-left ${
                        context === option.id
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : suggestedContexts.includes(option.id)
                          ? 'border-purple-200 bg-purple-50/50 text-gray-700 hover:border-purple-300'
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
                {userPatterns && userPatterns.cognitiveOverloadLevel === 'high' && (
                  <p className="text-xs text-purple-600 mt-1 italic">
                    We'll keep it extra simple based on your patterns.
                  </p>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!taskTitle.trim() || isGenerating}
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
                  <h3 className="text-sm font-semibold text-gray-900">Tiny wins</h3>
                </div>
                <div className="space-y-2">
                  {breakdown.microSteps.map((step, index) => (
                    <label
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedMicroStep === step
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="micro-step"
                        value={step}
                        checked={selectedMicroStep === step}
                        onChange={(e) => setSelectedMicroStep(e.target.value)}
                        className="mt-1"
                      />
                      <span className="flex-1 text-sm text-gray-800 leading-relaxed">{step}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {onAddToTinyWins && (
                  <button
                    onClick={handlePickOne}
                    disabled={!selectedMicroStep}
                    className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <ArrowRight size={18} />
                    Pick one tiny win for today
                  </button>
                )}
                
                {onSaveBreakdown && (
                  <button
                    onClick={handleSaveBreakdown}
                    className="w-full px-6 py-3 bg-white border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Save these as a flexible plan
                  </button>
                )}
                
                <button
                  onClick={handleClose}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Just show me — don't save
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
