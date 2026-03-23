/**
 * Micro-Steps Panel (Tiny Wins)
 * 
 * Planning suggestions for micro-steps based on energy mode and context.
 * No completion tracking, no streaks, just planning suggestions.
 */

import { useState, useEffect } from 'react';
import { Target, Plus, X, GripVertical, Sparkles, Lightbulb } from 'lucide-react';
import { TaskBreakdownModal } from '../taskBreakdown/TaskBreakdownModal';
import { saveBreakdownSuggestion, type TaskBreakdownResult } from '../../../lib/planner/taskBreakdownService';
import {
  getMicroSteps,
  saveMicroStep,
  deleteMicroStep,
  reorderMicroSteps,
  getDueSoonTasks,
  type PlannerMicroStep,
} from '../../../lib/planner/plannerMicroStepsService';
import {
  generateAdaptivePlan,
  type EnergyMode,
  type AdaptivePlanSuggestion,
} from '../../../lib/planner/adaptivePlanEngine';
import type { PersonalCalendarEvent } from '../../../lib/personalSpaces/calendarService';

interface PlannerMicroStepsPanelProps {
  userId: string;
  date: Date;
  energyMode: EnergyMode;
  events: PersonalCalendarEvent[];
  onMicroStepAdded?: (microStep: string) => void;
}

export function PlannerMicroStepsPanel({
  userId,
  date,
  energyMode,
  events,
  onMicroStepAdded,
}: PlannerMicroStepsPanelProps) {
  const [microSteps, setMicroSteps] = useState<PlannerMicroStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newStepText, setNewStepText] = useState('');
  const [suggestion, setSuggestion] = useState<AdaptivePlanSuggestion | null>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  const dateString = date.toISOString().split('T')[0];

  useEffect(() => {
    loadMicroSteps();
    generateSuggestions();
  }, [userId, dateString, energyMode, events.length]);

  async function loadMicroSteps() {
    try {
      setLoading(true);
      const steps = await getMicroSteps(userId, dateString);
      setMicroSteps(steps);
    } catch (error) {
      console.error('Error loading micro-steps:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateSuggestions() {
    try {
      // Calculate calendar metrics
      const todayEventsCount = events.length;
      const todayBusyHours = calculateBusyHours(events);
      
      // Get tasks due soon (stub for now)
      const dueSoonTasks = await getDueSoonTasks(userId, 3);
      
      // Check if travel is active (stub for now)
      const isTravelActive = false; // TODO: Check from travel service
      
      // Generate adaptive plan
      const plan = generateAdaptivePlan({
        energyMode,
        todayEventsCount,
        todayBusyHours,
        dueSoonTasksCount: dueSoonTasks.length,
        isTravelActive,
      });
      
      setSuggestion(plan);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  }

  function calculateBusyHours(events: PersonalCalendarEvent[]): number {
    if (events.length === 0) return 0;
    
    // Rough estimate: assume each event is 1 hour
    // Could be improved with actual duration calculation
    const uniqueHours = new Set<number>();
    
    events.forEach(event => {
      const start = new Date(event.startAt);
      uniqueHours.add(start.getHours());
      if (event.endAt) {
        const end = new Date(event.endAt);
        uniqueHours.add(end.getHours());
      }
    });
    
    return uniqueHours.size;
  }

  async function handleAddStep() {
    if (!newStepText.trim()) {
      setIsAdding(false);
      return;
    }

    try {
      const order = microSteps.length;
      await saveMicroStep(userId, dateString, newStepText.trim(), order);
      setNewStepText('');
      setIsAdding(false);
      await loadMicroSteps();
    } catch (error) {
      console.error('Error adding micro-step:', error);
    }
  }

  async function handleDeleteStep(stepId: string) {
    try {
      await deleteMicroStep(stepId);
      await loadMicroSteps();
    } catch (error) {
      console.error('Error deleting micro-step:', error);
    }
  }

  async function handleUpdateStep(stepId: string, newText: string) {
    try {
      const step = microSteps.find(s => s.id === stepId);
      if (!step) return;
      
      await saveMicroStep(userId, dateString, newText, step.order, stepId);
      await loadMicroSteps();
    } catch (error) {
      console.error('Error updating micro-step:', error);
    }
  }

  async function handleAddToTinyWins(microStep: string) {
    try {
      const order = microSteps.length;
      await saveMicroStep(userId, dateString, microStep, order);
      await loadMicroSteps();
      onMicroStepAdded?.(microStep);
    } catch (error) {
      console.error('Error adding micro-step from breakdown:', error);
    }
  }

  async function handleSaveBreakdown(breakdown: TaskBreakdownResult) {
    try {
      await saveBreakdownSuggestion(userId, breakdown);
      // Optionally show a subtle success message
    } catch (error) {
      console.error('Error saving breakdown:', error);
    }
  }

  if (loading) {
    return null; // Don't show anything while loading
  }

  const hasSteps = microSteps.length > 0;
  const showSuggestions = suggestion && microSteps.length < suggestion.recommendedMicroStepCount;

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-purple-900 mb-0.5">Tiny Wins</div>
                <div className="text-xs text-purple-700">
                  {suggestion ? `${suggestion.defaultPlanStyle} • ${suggestion.tone} tone` : 'Micro-steps for today'}
                </div>
              </div>
              {!isAdding && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsBreakdownModalOpen(true)}
                    className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-md transition-colors"
                    title="Help me break this down"
                  >
                    <Lightbulb size={16} />
                  </button>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-md transition-colors"
                    title="Add micro-step"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Suggestions hint */}
            {showSuggestions && (
              <div className="mb-3 p-2 bg-purple-100/50 border border-purple-200 rounded-md">
                <div className="flex items-start gap-2">
                  <Sparkles size={14} className="text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-purple-800 mb-1">
                      Suggested: {suggestion.recommendedMicroStepCount} tiny wins for {energyMode} energy
                    </div>
                    <div className="text-xs text-purple-700">
                      Pick the first step, not the whole thing
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Adding new step */}
            {isAdding && (
              <div className="mb-3">
                <textarea
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  placeholder="Open the doc and write 3 bullet points..."
                  className="w-full p-2 border border-purple-300 rounded-md bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={2}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleAddStep();
                    } else if (e.key === 'Escape') {
                      setIsAdding(false);
                      setNewStepText('');
                    }
                  }}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleAddStep}
                    className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewStepText('');
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Micro-steps list */}
            {hasSteps ? (
              <div className="space-y-2">
                {microSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-2 p-2 bg-white/60 border border-purple-200 rounded-md hover:bg-white/80 transition-colors group"
                  >
                    <GripVertical size={14} className="text-purple-400 mt-1 flex-shrink-0 cursor-move" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 leading-relaxed">{step.step_text}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteStep(step.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : !isAdding && (
              <div className="text-center py-6">
                <p className="text-sm text-purple-700 mb-2">
                  {showSuggestions
                    ? `Try ${suggestion.recommendedMicroStepCount} tiny wins today`
                    : 'No tiny wins planned yet'}
                </p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  <Plus size={16} />
                  Add first tiny win
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Breakdown Modal */}
      <TaskBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        initialTaskTitle=""
        energyMode={energyMode}
        userId={userId}
        onAddToTinyWins={handleAddToTinyWins}
        onSaveBreakdown={handleSaveBreakdown}
      />
    </div>
  );
}
