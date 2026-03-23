/**
 * Stage 4.6: Testing Utilities Panel (Enhanced Interactive Version)
 *
 * Interactive panel for simulating events to test signal computation.
 * Includes visual feedback, event history, and quick actions.
 *
 * IMPORTANT: Simulated events do NOT persist.
 * They exist in-memory only for testing.
 */

import { useState } from 'react';
import { Beaker, Play, X, RotateCcw, Zap, Activity, CheckCircle } from 'lucide-react';
import { createSimulatedEvent, type SimulatedEvent } from '../../lib/regulation/testingModeService';

interface TestingUtilitiesPanelProps {
  onSimulate: (events: SimulatedEvent[]) => void;
  onClose: () => void;
}

interface EventTemplate {
  id: string;
  label: string;
  description: string;
  eventType: string;
  context: Record<string, any>;
  icon: typeof Activity;
  color: string;
}

export function TestingUtilitiesPanel({ onSimulate, onClose }: TestingUtilitiesPanelProps) {
  const [simulatedEvents, setSimulatedEvents] = useState<SimulatedEvent[]>([]);
  const [lastSimulated, setLastSimulated] = useState<string | null>(null);

  const eventTemplates: EventTemplate[] = [
    {
      id: 'project_opened',
      label: 'Project Opened',
      description: 'Simulate opening a project',
      eventType: 'project_opened',
      context: { project_id: `test-${Date.now()}`, project_name: 'Test Project' },
      icon: Activity,
      color: 'blue'
    },
    {
      id: 'task_created',
      label: 'Task Created',
      description: 'Simulate creating a new task',
      eventType: 'task_created',
      context: { task_id: `task-${Date.now()}`, project_id: 'test-project' },
      icon: CheckCircle,
      color: 'green'
    },
    {
      id: 'roadmap_item_added',
      label: 'Roadmap Item',
      description: 'Add item to roadmap',
      eventType: 'roadmap_item_added',
      context: { item_id: `item-${Date.now()}`, item_type: 'milestone' },
      icon: Zap,
      color: 'purple'
    },
    {
      id: 'focus_mode_started',
      label: 'Focus Mode',
      description: 'Start a focus session',
      eventType: 'focus_mode_started',
      context: { session_id: `session-${Date.now()}` },
      icon: Beaker,
      color: 'orange'
    }
  ];

  const colorClasses = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-300', icon: 'text-blue-600', button: 'bg-blue-500 hover:bg-blue-600' },
    green: { bg: 'bg-green-50', border: 'border-green-300', icon: 'text-green-600', button: 'bg-green-500 hover:bg-green-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-300', icon: 'text-purple-600', button: 'bg-purple-500 hover:bg-purple-600' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-300', icon: 'text-orange-600', button: 'bg-orange-500 hover:bg-orange-600' }
  };

  const handleSimulateEvent = (template: EventTemplate) => {
    const event = createSimulatedEvent(template.eventType, template.context);
    const updated = [...simulatedEvents, event];
    setSimulatedEvents(updated);
    onSimulate(updated);
    setLastSimulated(template.id);
    setTimeout(() => setLastSimulated(null), 2000);
  };

  const handleClear = () => {
    setSimulatedEvents([]);
    onSimulate([]);
    setLastSimulated(null);
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl border-2 border-amber-300 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <Beaker className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-lg">Testing Utilities</div>
            <div className="text-xs text-amber-100">Simulate events to test signal computation</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Important Notice */}
        <div className="bg-white border-2 border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Beaker className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">Simulated Events Only</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Events created here exist in-memory only and do NOT persist. They do not affect your actual data or create real records.
                This is purely for testing signal logic.
              </p>
            </div>
          </div>
        </div>

        {/* Event Templates Grid */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Event Simulation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eventTemplates.map((template) => {
              const colors = colorClasses[template.color as keyof typeof colorClasses];
              const Icon = template.icon;
              const wasJustSimulated = lastSimulated === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => handleSimulateEvent(template)}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left group ${
                    wasJustSimulated
                      ? `${colors.bg} ${colors.border} scale-[1.02]`
                      : `bg-white border-gray-200 hover:${colors.border} hover:scale-[1.01]`
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center border ${colors.border}`}>
                      <Icon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 mb-0.5">{template.label}</div>
                      <div className="text-xs text-gray-600">{template.description}</div>
                    </div>
                    <div className={`flex-shrink-0 w-8 h-8 ${colors.button} rounded-lg flex items-center justify-center transition-all ${
                      wasJustSimulated ? 'scale-110' : 'group-hover:scale-110'
                    }`}>
                      {wasJustSimulated ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>

                  {wasJustSimulated && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-300">
                        <CheckCircle className="w-3 h-3" />
                        Simulated!
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Event History */}
        {simulatedEvents.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-gray-300 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Event History</h3>
                <p className="text-xs text-gray-600 mt-0.5">{simulatedEvents.length} events simulated</p>
              </div>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Clear All
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-50 rounded-lg border border-gray-200 p-3">
              {simulatedEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-600">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{event.event_type}</div>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {simulatedEvents.length === 0 && (
          <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <Beaker className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">No events simulated yet</p>
            <p className="text-xs text-gray-500 mt-1">Click any event above to start testing</p>
          </div>
        )}
      </div>
    </div>
  );
}
