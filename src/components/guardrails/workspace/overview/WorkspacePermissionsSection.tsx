/**
 * WorkspacePermissionsSection Component
 * 
 * Phase 6.2: Guardrails Permission Controls (Declarative Layer)
 * 
 * Displays permission summary and controls for tracks/subtracks in the workspace overview.
 * Provides read-first, control-second UX: summary by default, actions when permitted.
 * 
 * ARCHITECTURAL RULES (Phase 3.3/3.4 Compliance):
 * 
 * What this component CAN do:
 * - ✅ Display permission summary (read-only)
 * - ✅ Show "Grant Access" inline form (when edit permission granted)
 * - ✅ Link to advanced permissions page
 * - ✅ Use permission hooks only (no services/Supabase)
 * 
 * What this component MUST NOT do:
 * - ❌ Call resolver functions directly
 * - ❌ Import services or Supabase
 * - ❌ Check permissions in render bodies
 * - ❌ Create new permission logic
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, ExternalLink } from 'lucide-react';
import { ENABLE_ENTITY_GRANTS, ENABLE_CREATOR_RIGHTS } from '../../../../lib/featureFlags';
import { useEntityPermissions } from '../../../../hooks/permissions/useEntityPermissions';
import { useCanAccessTrack } from '../../../../hooks/permissions/useCanAccessTrack';
import { useCanEditTrack } from '../../../../hooks/permissions/useCanEditTrack';
import { useGrantEntityPermission } from '../../../../hooks/permissions/useGrantEntityPermission';
import { useCreatorRights } from '../../../../hooks/creator-rights/useCreatorRights';
import { useTrackCreator } from '../../../../hooks/tracks/useTrackCreator';
import type { EntityType, PermissionRole } from '../../../../lib/permissions/entityGrantsService';

export interface WorkspacePermissionsSectionProps {
  projectId: string;
  trackId: string;
  isSubtrack?: boolean;
}

export function WorkspacePermissionsSection({
  projectId,
  trackId,
  isSubtrack = false,
}: WorkspacePermissionsSectionProps) {
  const navigate = useNavigate();
  const entityType: EntityType = isSubtrack ? 'subtrack' : 'track';

  // Permission state
  const { canAccess, loading: accessPermissionLoading } = useCanAccessTrack(trackId);
  const { canEdit, loading: editPermissionLoading } = useCanEditTrack(trackId);
  const { data: grants, loading: grantsLoading, error: grantsError, refresh: refreshGrants } = useEntityPermissions({
    entityType,
    entityId: trackId,
  });

  // Creator rights (if enabled and applicable)
  const { creatorId, loading: creatorLoading } = useTrackCreator(trackId);
  const { data: isCreatorRightsRevoked, loading: creatorRightsLoading } = useCreatorRights({
    entityType,
    entityId: trackId,
    creatorUserId: creatorId || '',
  });

  // Grant permission mutation
  const { grantPermission, loading: grantLoading, error: grantError } = useGrantEntityPermission();

  // Inline grant form state
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantSubjectType, setGrantSubjectType] = useState<'user' | 'group'>('user');
  const [grantSubjectId, setGrantSubjectId] = useState('');
  const [grantRole, setGrantRole] = useState<PermissionRole>('viewer');

  // Loading state
  const loading = accessPermissionLoading || editPermissionLoading || grantsLoading || (ENABLE_CREATOR_RIGHTS && (creatorLoading || creatorRightsLoading));
  
  // Access level (simplified: Editor if canEdit, Viewer if canAccess but not canEdit)
  const accessLevel = canEdit === true ? 'Editor' : canAccess === true ? 'Viewer' : null;

  // Active grants count (excludes revoked)
  const activeGrants = grants?.filter((g) => !g.revokedAt) || [];
  const hasExplicitGrants = activeGrants.length > 0;
  const accessSource = hasExplicitGrants ? 'overridden' : 'inherited';

  // Handle grant permission
  const handleGrantPermission = async () => {
    if (!grantSubjectId) return;

    const result = await grantPermission({
      entityType,
      entityId: trackId,
      subjectType: grantSubjectType,
      subjectId: grantSubjectId,
      role: grantRole,
    });

    if (result) {
      setShowGrantForm(false);
      setGrantSubjectId('');
      setGrantRole('viewer');
      refreshGrants();
    }
  };

  // Handle navigate to advanced permissions
  const handleManageAdvanced = () => {
    navigate(`/projects/${projectId}/tracks/${trackId}/permissions`);
  };

  // Don't render if feature flag is off
  if (!ENABLE_ENTITY_GRANTS) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Access & Permissions</h3>
        </div>
        {!loading && canEdit && !showGrantForm && (
          <button
            onClick={() => setShowGrantForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>Grant Access</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="space-y-2">
            {/* Access Level */}
            {accessLevel && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Access Level:</span>
                <span className="text-sm font-medium text-gray-900">{accessLevel}</span>
              </div>
            )}

            {/* Access Source */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Access Source:</span>
              <span className="text-sm text-gray-900">
                {accessSource === 'inherited' ? (
                  <span className="text-gray-600">Inherited from project</span>
                ) : (
                  <span className="text-indigo-600">Overridden</span>
                )}
              </span>
            </div>

            {/* Explicit Grants */}
            {hasExplicitGrants && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Explicit Grants:</span>
                <span className="text-sm text-gray-900">
                  {activeGrants.length} {activeGrants.length === 1 ? 'grant' : 'grants'}
                </span>
              </div>
            )}

            {/* Creator Rights (if enabled and applicable) */}
            {ENABLE_CREATOR_RIGHTS && creatorId && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Creator Rights:</span>
                <span className={`text-sm font-medium ${isCreatorRightsRevoked ? 'text-red-600' : 'text-green-600'}`}>
                  {isCreatorRightsRevoked ? 'Revoked' : 'Active'}
                </span>
              </div>
            )}

            {/* Error display */}
            {grantsError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                <p className="text-sm text-yellow-800">Unable to load permissions. {grantsError}</p>
              </div>
            )}
          </div>

          {/* Grant Form (inline) */}
          {showGrantForm && canEdit && (
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Type</label>
                <select
                  value={grantSubjectType}
                  onChange={(e) => setGrantSubjectType(e.target.value as 'user' | 'group')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="group">Group</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {grantSubjectType === 'user' ? 'User ID' : 'Group ID'}
                </label>
                <input
                  type="text"
                  value={grantSubjectId}
                  onChange={(e) => setGrantSubjectId(e.target.value)}
                  placeholder={grantSubjectType === 'user' ? 'Enter user ID' : 'Enter group ID'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={grantRole}
                  onChange={(e) => setGrantRole(e.target.value as PermissionRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Viewer</option>
                  <option value="commenter">Commenter</option>
                  <option value="editor">Editor</option>
                </select>
              </div>

              {grantError && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <p className="text-sm text-red-800">{grantError}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setShowGrantForm(false);
                    setGrantSubjectId('');
                    setGrantRole('viewer');
                  }}
                  disabled={grantLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantPermission}
                  disabled={grantLoading || !grantSubjectId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {grantLoading ? 'Granting...' : 'Grant'}
                </button>
              </div>
            </div>
          )}

          {/* Actions (when edit permission granted) */}
          {!showGrantForm && canEdit && (
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={handleManageAdvanced}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ExternalLink size={16} />
                <span>Manage Advanced Permissions</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
