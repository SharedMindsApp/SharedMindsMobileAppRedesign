/**
 * Create Group Section
 * 
 * Phase 4.0: Section component for creating groups
 * 
 * Responsibilities:
 * - Rendered only if layout allows
 * - Contains action components
 * - No permission checks of its own
 */

import { CreateGroupButton } from './CreateGroupButton';

type CreateGroupSectionProps = {
  teamId: string;
  onGroupCreated?: () => void;
};

export function CreateGroupSection({ teamId, onGroupCreated }: CreateGroupSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Group</h2>
      <CreateGroupButton teamId={teamId} onGroupCreated={onGroupCreated} />
    </div>
  );
}
