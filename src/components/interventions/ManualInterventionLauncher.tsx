/**
 * Stage 3.2: Manual Intervention Launcher
 *
 * Provides explicit entry points for user to manually invoke interventions.
 *
 * CRITICAL: Nothing happens automatically. User must click.
 * NO triggers, schedulers, or automation of any kind.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveInterventionsForManualInvocation } from '../../lib/interventions/stage3_2-invocation';
import type { InterventionRegistryEntry } from '../../lib/interventions/stage3_1-types';
import { INTERVENTION_METADATA } from '../../lib/interventions/stage3_1-types';
import { Play, AlertCircle } from 'lucide-react';

interface ManualInterventionLauncherProps {
  onInvoke: (intervention: InterventionRegistryEntry) => void;
}

export function ManualInterventionLauncher({ onInvoke }: ManualInterventionLauncherProps) {
  const { user, safeModeEnabled } = useAuth();
  const [interventions, setInterventions] = useState<InterventionRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInterventions();
  }, [user, safeModeEnabled]);

  async function loadInterventions() {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getActiveInterventionsForManualInvocation(user.id);
      setInterventions(data);
    } catch (err) {
      console.error('Failed to load interventions:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (safeModeEnabled) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">Interventions are paused while Safe Mode is active.</p>
            <p className="text-sm text-blue-700 mt-1">You can turn Safe Mode off to use them again.</p>
          </div>
        </div>
      </div>
    );
  }

  if ((interventions ?? []).length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">No active interventions.</p>
        <p className="text-xs mt-1">Create and enable interventions to see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Click to use any intervention you created. Nothing happens automatically.
      </p>

      <div className="space-y-2">
        {(interventions ?? []).map((intervention) => {
          const metadata = INTERVENTION_METADATA[intervention.intervention_key];

          if (!metadata) {
            if (import.meta.env.DEV) {
              console.warn('[ManualInterventionLauncher] Missing metadata for:', intervention.intervention_key);
            }
            return null;
          }

          return (
            <button
              key={intervention.id}
              onClick={() => onInvoke(intervention)}
              className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">{metadata?.name ?? 'Unknown'}</h3>
                  {intervention.why_text && (
                    <p className="text-xs text-gray-600 mt-1">{intervention.why_text}</p>
                  )}
                </div>
                <Play className="w-5 h-5 text-blue-600 flex-shrink-0 ml-3" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
