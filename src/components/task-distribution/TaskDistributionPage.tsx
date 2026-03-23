/**
 * Task Distribution Page
 * 
 * Phase 4.3: Composition-only page component
 * 
 * Responsibilities:
 * - Composition only
 * - No permission checks
 * - No feature flag checks
 * - No API calls directly
 * 
 * Note: teamId must be determined from context (e.g., from project or user's teams).
 * This is a placeholder implementation - in practice, teamId should be derived from
 * the task/project context or user's team membership.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TaskDistributionLayout } from './TaskDistributionLayout';
import { TaskDistributionSection } from './TaskDistributionSection';

export function TaskDistributionPage() {
  const { trackId, taskId } = useParams<{ trackId: string; taskId: string }>();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!trackId || !taskId) {
    return null;
  }

  // TODO: teamId should be determined from context (project teams, user teams, etc.)
  // For now, this is a placeholder - the actual implementation should derive teamId
  // from the task/project context or user's team membership
  const teamId = ''; // This needs to be provided from context

  const handleDistributionChanged = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!teamId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Team context required for task distribution</p>
        </div>
      </div>
    );
  }

  return (
    <TaskDistributionLayout
      trackId={trackId}
      distributionSection={
        <TaskDistributionSection
          taskId={taskId}
          teamId={teamId}
          onDistributionChanged={handleDistributionChanged}
        />
      }
    >
      <div key={refreshKey} />
    </TaskDistributionLayout>
  );
}
