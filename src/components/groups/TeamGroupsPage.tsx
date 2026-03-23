/**
 * Team Groups Page
 * 
 * Phase 4.0: Composition-only page component
 * 
 * Responsibilities:
 * - Composition only
 * - No permission checks
 * - No feature flag checks
 * - No API calls directly
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TeamGroupsLayout } from './TeamGroupsLayout';
import { GroupsList } from './GroupsList';
import { CreateGroupSection } from './CreateGroupSection';

export function TeamGroupsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!teamId) {
    return null;
  }

  const handleGroupCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <TeamGroupsLayout
      teamId={teamId}
      createGroupSection={<CreateGroupSection teamId={teamId} onGroupCreated={handleGroupCreated} />}
    >
      <GroupsList key={refreshKey} teamId={teamId} />
    </TeamGroupsLayout>
  );
}
