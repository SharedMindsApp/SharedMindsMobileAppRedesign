/**
 * Event Distribution Page
 * 
 * Phase 4.4: Composition-only page component
 * 
 * Responsibilities:
 * - Composition only
 * - No permission checks
 * - No feature flag checks
 * - No API calls directly
 * 
 * Note: teamId must be determined from context (e.g., from project or user's teams).
 * This is a placeholder implementation - in practice, teamId should be derived from
 * the event/project context or user's team membership.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { EventDistributionLayout } from './EventDistributionLayout';
import { EventDistributionSection } from './EventDistributionSection';

export function EventDistributionPage() {
  const { trackId, eventId } = useParams<{ trackId: string; eventId: string }>();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!trackId || !eventId) {
    return null;
  }

  // TODO: teamId should be determined from context (project teams, user teams, etc.)
  // For now, this is a placeholder - the actual implementation should derive teamId
  // from the event/project context or user's team membership
  const teamId = ''; // This needs to be provided from context

  const handleDistributionChanged = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!teamId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Team context required for event distribution</p>
        </div>
      </div>
    );
  }

  return (
    <EventDistributionLayout
      trackId={trackId}
      distributionSection={
        <EventDistributionSection
          eventId={eventId}
          teamId={teamId}
          onDistributionChanged={handleDistributionChanged}
        />
      }
    >
      <div key={refreshKey} />
    </EventDistributionLayout>
  );
}
