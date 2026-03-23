/**
 * Developer Testing Panel for Context Events
 *
 * Allows manual emission of foreground context events to test intervention triggers.
 * This helps developers and users understand when interventions would appear.
 *
 * CRITICAL: This does NOT add new functionality - it only exposes existing Stage 3.3 logic.
 */

import { useState } from 'react';
import { useForegroundTriggers } from '../../contexts/ForegroundTriggersContext';
import type { ForegroundContextEvent } from '../../lib/interventions/stage3_3-types';
import { Zap, Info } from 'lucide-react';

export function ContextEventTester() {
  const { emitContextEvent } = useForegroundTriggers();
  const [showPanel, setShowPanel] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const contextEvents: Array<{ event: ForegroundContextEvent; label: string; description: string }> = [
    {
      event: 'project_opened',
      label: 'Project Opened',
      description: 'Simulates opening a project'
    },
    {
      event: 'focus_mode_started',
      label: 'Focus Mode Started',
      description: 'Simulates starting a focus session'
    },
    {
      event: 'task_created',
      label: 'Task Created',
      description: 'Simulates creating a new task'
    },
    {
      event: 'task_completed',
      label: 'Task Completed',
      description: 'Simulates completing a task'
    },
  ];

  async function handleEmitEvent(event: ForegroundContextEvent) {
    setLastEvent(event);
    await emitContextEvent(event);
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
      >
        {showPanel ? '▼' : '▶'} Test Context Events (Developer Tool)
      </button>

      {showPanel && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-4">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Test context triggers</p>
              <p className="text-gray-600">
                Click a button to manually emit a context event. If any intervention is configured to trigger on that event, it will appear.
                This uses the existing Stage 3.3 foreground router - no new logic.
              </p>
            </div>
          </div>

          {lastEvent && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Last emitted: <span className="font-medium">{lastEvent}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {contextEvents.map(({ event, label, description }) => (
              <button
                key={event}
                onClick={() => handleEmitEvent(event)}
                className="flex flex-col items-start gap-2 p-3 bg-white border border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-blue-600" />
                  <span className="font-medium text-gray-900 text-sm">{label}</span>
                </div>
                <p className="text-xs text-gray-600">{description}</p>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            No events are logged. This panel exists for testing only.
          </p>
        </div>
      )}
    </div>
  );
}
