/**
 * Grant Permission Section
 * 
 * Phase 4.1: Section component for granting permissions
 * 
 * Responsibilities:
 * - Rendered only if layout allows
 * - Contains action components
 * - No permission checks of its own
 */

import { GrantPermissionForm } from './GrantPermissionForm';

type GrantPermissionSectionProps = {
  trackId: string;
  onPermissionGranted?: () => void;
};

export function GrantPermissionSection({ trackId, onPermissionGranted }: GrantPermissionSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Grant Permission</h2>
      <GrantPermissionForm trackId={trackId} onPermissionGranted={onPermissionGranted} />
    </div>
  );
}
