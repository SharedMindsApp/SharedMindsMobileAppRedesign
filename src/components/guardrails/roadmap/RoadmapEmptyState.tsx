/**
 * RoadmapEmptyState Component
 * 
 * Track-First Empty State for Roadmap
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * This component ONLY renders when:
 * - projection.tracks.length === 0
 * 
 * This component MUST NEVER render when:
 * - Tracks exist but have no items (tracks still render)
 * - Items exist but are filtered out (tracks still render)
 * 
 * The empty state is GLOBAL and track-scoped, not item-scoped.
 */

import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import type { RoadmapProjection } from '../../../lib/guardrails/roadmapProjectionTypes';

/**
 * Check if a roadmap projection represents an empty project.
 * 
 * A project is considered empty when:
 * 1. No tracks exist at all (projection.tracks.length === 0)
 * 
 * A project is NOT considered empty when:
 * - Tracks exist but have zero items
 * - Tracks exist but have zero subtracks
 * - Tracks/subtracks exist but items.length === 0
 * 
 * Phase 1 Rules:
 * - Empty state check is based ONLY on track count
 * - Item count is NEVER used to determine empty state
 * - Tracks render even with zero items (empty timeline is valid)
 */
export function isProjectionEmpty(projection: RoadmapProjection): boolean {
  // If loading, don't show empty state yet
  if (projection.loading) {
    return false;
  }

  // Only show empty state if there are no tracks at all
  // Item count is NEVER used to determine empty state
  // If tracks exist (even without items), show the roadmap with tracks
  return projection.tracks.length === 0;
}

export interface RoadmapEmptyStateProps {
  masterProjectId?: string;
  projection?: RoadmapProjection;
}

export function RoadmapEmptyState({ masterProjectId, projection }: RoadmapEmptyStateProps) {
  const navigate = useNavigate();

  // Always navigate to wizard to set up project correctly
  const handleLaunchWizard = () => {
    if (masterProjectId) {
      // Navigate to wizard with project parameter for quick setup
      navigate(`/guardrails/wizard?project=${masterProjectId}`);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <Rocket className="w-8 h-8" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No tracks yet
        </h3>
        <p className="text-gray-600 mb-6">
          Set up your project structure using the quick setup wizard to get started with your roadmap.
        </p>
        <button
          onClick={handleLaunchWizard}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Rocket size={16} />
          <span>Launch Quick Setup</span>
        </button>
      </div>
    </div>
  );
}
