/**
 * Stage 3.2: Manual Interventions Page
 *
 * Dedicated page for manually invoking interventions.
 * Provides clear entry points and framing.
 *
 * CRITICAL: Nothing happens automatically. User must click.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InterventionRegistryEntry } from '../../lib/interventions/stage3_1-types';
import { ManualInterventionLauncher } from './ManualInterventionLauncher';
import { InterventionInvocationModal } from './InterventionInvocationModal';
import { ContextEventTester } from './ContextEventTester';
import { Settings, Info } from 'lucide-react';

export function ManualInterventionsPage() {
  const navigate = useNavigate();
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionRegistryEntry | null>(null);

  function handleInvoke(intervention: InterventionRegistryEntry) {
    setSelectedIntervention(intervention);
  }

  function handleClose() {
    setSelectedIntervention(null);
  }

  function handleInterventionChanged() {
    setSelectedIntervention(null);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Use Interventions</h1>
          <p className="text-gray-600 mt-2">
            Click to use any intervention you created. Nothing happens automatically.
          </p>
        </div>
        <button
          onClick={() => navigate('/interventions')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-5 h-5" />
          Manage Interventions
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">How this works:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• Interventions only run when you click them</li>
              <li>• Nothing is tracked - no views, no completions, no metrics</li>
              <li>• You can pause, edit, or disable anytime</li>
              <li>• If Safe Mode is on, all interventions are paused</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Interventions</h2>
        <ManualInterventionLauncher onInvoke={handleInvoke} />

        <ContextEventTester />
      </div>

      {selectedIntervention && (
        <InterventionInvocationModal
          intervention={selectedIntervention}
          onClose={handleClose}
          onInterventionChanged={handleInterventionChanged}
        />
      )}
    </div>
  );
}
