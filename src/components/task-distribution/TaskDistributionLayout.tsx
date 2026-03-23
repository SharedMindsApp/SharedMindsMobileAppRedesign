/**
 * Task Distribution Layout
 * 
 * Phase 4.3: Permission-aware layout for task distribution management
 * 
 * Responsibilities:
 * - Feature flag check (ENABLE_GROUP_DISTRIBUTION)
 * - Section-level permission check (useCanEditTrack)
 * - Structural gating of task distribution section
 */

import { ENABLE_GROUP_DISTRIBUTION } from '../../lib/featureFlags';
import { useCanEditTrack } from '../../hooks/permissions/useCanEditTrack';

type TaskDistributionLayoutProps = {
  trackId: string;
  children: React.ReactNode;
  distributionSection?: React.ReactNode;
};

export function TaskDistributionLayout({ trackId, children, distributionSection }: TaskDistributionLayoutProps) {
  if (!ENABLE_GROUP_DISTRIBUTION) {
    return null;
  }

  const { canEdit, loading } = useCanEditTrack(trackId);

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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Task Distribution</h1>
        {canEdit && distributionSection && (
          <div className="mb-8">
            {distributionSection}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
