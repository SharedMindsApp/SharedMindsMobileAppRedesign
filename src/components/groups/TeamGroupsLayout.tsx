/**
 * Team Groups Layout
 * 
 * Phase 4.0: Permission-aware layout for team groups management
 * 
 * Responsibilities:
 * - Feature flag check (ENABLE_GROUPS)
 * - Section-level permission check (useCanManageTeamGroups)
 * - Structural gating of group management section
 */

import { ENABLE_GROUPS } from '../../lib/featureFlags';
import { useCanManageTeamGroups } from '../../hooks/groups/useCanManageTeamGroups';

type TeamGroupsLayoutProps = {
  teamId: string;
  children: React.ReactNode;
  createGroupSection?: React.ReactNode;
};

export function TeamGroupsLayout({ teamId, children, createGroupSection }: TeamGroupsLayoutProps) {
  if (!ENABLE_GROUPS) {
    return null;
  }

  const { canManage, loading } = useCanManageTeamGroups(teamId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Team Groups</h1>
        {canManage && createGroupSection && (
          <div className="mb-8">
            {createGroupSection}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
