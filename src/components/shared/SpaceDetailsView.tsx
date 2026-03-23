/**
 * Space Details View Component
 * 
 * Shows detailed information and management options for a space
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Home, Users, User, Shield, Bell, Eye, AlertTriangle, Trash2, UserMinus, Crown } from 'lucide-react';
import { getSpaceDetails, leaveSpace, updateMemberRole, removeMember, transferOwnership, deleteSpace, type SpaceDetails } from '../../lib/sharedSpacesManagement';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmDialog } from '../ConfirmDialog';
import { GroupsSection } from './GroupsSection';

interface SpaceDetailsViewProps {
  spaceId: string;
  onBack: () => void;
  onSpaceUpdated: () => void;
}

export function SpaceDetailsView({
  spaceId,
  onBack,
  onSpaceUpdated,
}: SpaceDetailsViewProps) {
  const { profile } = useAuth();
  const [space, setSpace] = useState<SpaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'members' | 'groups' | 'permissions' | 'visibility' | 'danger'>('overview');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferTargetMemberId, setTransferTargetMemberId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSpaceDetails();
  }, [spaceId]);

  const loadSpaceDetails = async () => {
    setLoading(true);
    try {
      const details = await getSpaceDetails(spaceId);
      setSpace(details);
    } catch (error) {
      console.error('Error loading space details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!space) return;
    setActionLoading(true);
    try {
      await leaveSpace(spaceId);
      setShowLeaveConfirm(false);
      onSpaceUpdated();
      onBack();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to leave space');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!space) return;
    setActionLoading(true);
    try {
      await deleteSpace(spaceId);
      setShowDeleteConfirm(false);
      onSpaceUpdated();
      onBack();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete space');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!space || !transferTargetMemberId) return;
    setActionLoading(true);
    try {
      await transferOwnership(spaceId, transferTargetMemberId);
      setShowTransferConfirm(false);
      setTransferTargetMemberId(null);
      await loadSpaceDetails();
      onSpaceUpdated();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to transfer ownership');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'owner' | 'admin' | 'member' | 'viewer') => {
    setActionLoading(true);
    try {
      await updateMemberRole(spaceId, memberId, newRole);
      await loadSpaceDetails();
      onSpaceUpdated();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    setActionLoading(true);
    try {
      await removeMember(spaceId, memberId);
      await loadSpaceDetails();
      onSpaceUpdated();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !space) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Loading space details...</p>
      </div>
    );
  }

  const isOwner = space.currentUserRole === 'owner';
  const isAdmin = space.currentUserRole === 'admin' || isOwner;
  const canManageOthers = isAdmin;
  const Icon = space.type === 'household' ? Home : Users;
  const currentUserMember = space.members.find(m => m.userId === profile?.id);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className={`p-2 rounded-lg ${
          space.type === 'household' ? 'bg-blue-50' : 'bg-purple-50'
        }`}>
          <Icon
            size={24}
            className={space.type === 'household' ? 'text-blue-600' : 'text-purple-600'}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">{space.name}</h2>
          <p className="text-sm text-gray-500">
            {space.memberCount} member{space.memberCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto flex-shrink-0">
        <button
          onClick={() => setActiveSection('overview')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 min-h-[44px] whitespace-nowrap ${
            activeSection === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveSection('members')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 min-h-[44px] whitespace-nowrap ${
            activeSection === 'members'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Members
        </button>
        {space.type === 'team' && canManageOthers && (
          <button
            onClick={() => setActiveSection('groups')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 min-h-[44px] whitespace-nowrap ${
              activeSection === 'groups'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Groups
          </button>
        )}
        {canManageOthers && (
          <button
            onClick={() => setActiveSection('permissions')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 min-h-[44px] whitespace-nowrap ${
              activeSection === 'permissions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Permissions
          </button>
        )}
        <button
          onClick={() => setActiveSection('visibility')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 min-h-[44px] whitespace-nowrap ${
            activeSection === 'visibility'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Visibility
        </button>
        <button
          onClick={() => setActiveSection('danger')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 min-h-[44px] whitespace-nowrap ${
            activeSection === 'danger'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Danger Zone
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeSection === 'overview' && (
          <OverviewSection space={space} />
        )}

        {activeSection === 'members' && (
          <MembersSection
            space={space}
            canManageOthers={canManageOthers}
            onUpdateRole={handleUpdateRole}
            onRemoveMember={handleRemoveMember}
            actionLoading={actionLoading}
          />
        )}

        {activeSection === 'groups' && space.type === 'team' && space.contextId && (
          <GroupsSection
            teamId={space.contextId}
            canManage={canManageOthers}
            teamMembers={space.members}
          />
        )}

        {activeSection === 'permissions' && (
          <PermissionsSection space={space} />
        )}

        {activeSection === 'visibility' && (
          <VisibilitySection space={space} />
        )}

        {activeSection === 'danger' && (
          <DangerZoneSection
            space={space}
            isOwner={isOwner}
            isAdmin={isAdmin}
            onLeave={() => setShowLeaveConfirm(true)}
            onDelete={() => setShowDeleteConfirm(true)}
            onTransferOwnership={(memberId) => {
              setTransferTargetMemberId(memberId);
              setShowTransferConfirm(true);
            }}
            members={space.members}
            actionLoading={actionLoading}
          />
        )}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
        title="Leave Space"
        message={`Are you sure you want to leave "${space.name}"? You will lose access to all shared content.`}
        confirmText="Leave"
        confirmVariant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Space"
        message={`Are you sure you want to delete "${space.name}"? This action cannot be undone. All data will be permanently deleted.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showTransferConfirm}
        onClose={() => {
          setShowTransferConfirm(false);
          setTransferTargetMemberId(null);
        }}
        onConfirm={handleTransferOwnership}
        title="Transfer Ownership"
        message={`Are you sure you want to transfer ownership? You will become an admin.`}
        confirmText="Transfer"
        confirmVariant="primary"
        loading={actionLoading}
      />
    </div>
  );
}

// Section Components

function OverviewSection({ space }: { space: SpaceDetails }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
        <p className="text-gray-600">
          {space.description || 'No description provided.'}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Role</h3>
        <div className="flex items-center gap-2">
          <span className={`text-sm px-3 py-1.5 rounded font-medium ${
            space.currentUserRole === 'owner' ? 'bg-purple-100 text-purple-700' :
            space.currentUserRole === 'admin' ? 'bg-blue-100 text-blue-700' :
            space.currentUserRole === 'member' ? 'bg-gray-100 text-gray-700' :
            'bg-gray-50 text-gray-600'
          }`}>
            {space.currentUserRole ? space.currentUserRole.charAt(0).toUpperCase() + space.currentUserRole.slice(1) : 'Unknown'}
          </span>
          {space.currentUserStatus === 'pending' && (
            <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
              Pending
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{space.memberCount}</div>
            <div className="text-sm text-gray-600">Members</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MembersSection({
  space,
  canManageOthers,
  onUpdateRole,
  onRemoveMember,
  actionLoading,
}: {
  space: SpaceDetails;
  canManageOthers: boolean;
  onUpdateRole: (memberId: string, role: 'owner' | 'admin' | 'member' | 'viewer') => void;
  onRemoveMember: (memberId: string) => void;
  actionLoading: boolean;
}) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700';
      case 'admin': return 'bg-blue-100 text-blue-700';
      case 'member': return 'bg-gray-100 text-gray-700';
      case 'viewer': return 'bg-gray-50 text-gray-600';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Members</h3>
        {canManageOthers && (
          <button
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium min-h-[44px]"
            disabled
            title="Invite feature coming soon"
          >
            <span className="hidden sm:inline">Invite Member</span>
            <span className="sm:hidden">Invite</span>
          </button>
        )}
      </div>

      <div className="space-y-2 sm:space-y-3">
        {space.members.map((member) => (
          <div
            key={member.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User size={20} className="text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate text-sm sm:text-base">
                  {member.userName || member.userEmail || 'Unknown User'}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">
                  {member.userEmail}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {canManageOthers && member.status === 'active' ? (
                <>
                  {member.role !== 'owner' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Role:</label>
                        <select
                          value={member.role}
                          onChange={(e) => onUpdateRole(member.id, e.target.value as any)}
                          disabled={actionLoading}
                          className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>
                      <button
                        onClick={() => onRemoveMember(member.id)}
                        disabled={actionLoading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
                        title="Remove member"
                      >
                        <UserMinus size={18} />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded font-medium ${getRoleColor(member.role)}`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500">(Cannot change)</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded font-medium ${getRoleColor(member.role)}`}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                  {member.status === 'pending' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                      Pending
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PermissionsSection({ space }: { space: SpaceDetails }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Capabilities</h3>
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={18} className="text-purple-600" />
              <h4 className="font-semibold text-gray-900">Owner</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1 ml-6">
              <li>• Full access to all features</li>
              <li>• Manage members and roles</li>
              <li>• Transfer ownership</li>
              <li>• Delete space</li>
              <li>• Configure settings</li>
            </ul>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={18} className="text-blue-600" />
              <h4 className="font-semibold text-gray-900">Admin</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1 ml-6">
              <li>• Invite and remove members</li>
              <li>• Change member roles (except owner)</li>
              <li>• Moderate content</li>
              <li>• Configure calendar & widgets</li>
            </ul>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User size={18} className="text-gray-600" />
              <h4 className="font-semibold text-gray-900">Member</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1 ml-6">
              <li>• Create and edit own content</li>
              <li>• View members</li>
              <li>• Manage self-only settings</li>
            </ul>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={18} className="text-gray-500" />
              <h4 className="font-semibold text-gray-900">Viewer</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1 ml-6">
              <li>• Read-only access</li>
              <li>• View content and members</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function VisibilitySection({ space }: { space: SpaceDetails }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Visibility Settings</h3>
        <p className="text-sm text-gray-600 mb-4">
          Control where this space appears and how you receive notifications.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Show in Calendar</div>
              <div className="text-sm text-gray-600">Display events from this space in your calendar</div>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 text-blue-600 rounded"
              disabled
              title="Coming soon"
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Show in Widgets</div>
              <div className="text-sm text-gray-600">Include this space in widget views</div>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 text-blue-600 rounded"
              disabled
              title="Coming soon"
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Show in Search</div>
              <div className="text-sm text-gray-600">Make this space searchable</div>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 text-blue-600 rounded"
              disabled
              title="Coming soon"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="font-medium text-gray-900 mb-2">Notification Preferences</div>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[44px]"
              disabled
              title="Coming soon"
            >
              <option>All notifications</option>
              <option>Mentions only</option>
              <option>None</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function DangerZoneSection({
  space,
  isOwner,
  isAdmin,
  onLeave,
  onDelete,
  onTransferOwnership,
  members,
  actionLoading,
}: {
  space: SpaceDetails;
  isOwner: boolean;
  isAdmin: boolean;
  onLeave: () => void;
  onDelete: () => void;
  onTransferOwnership: (memberId: string) => void;
  members: SpaceDetails['members'];
  actionLoading: boolean;
}) {
  const otherOwners = members.filter(m => m.role === 'owner' && m.status === 'active');
  const canLeave = !isOwner || otherOwners.length > 1;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Danger Zone</h3>
            <p className="text-sm text-red-700">
              These actions are permanent and cannot be undone. Please proceed with caution.
            </p>
          </div>
        </div>
      </div>

      {/* Leave Space */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">Leave Space</h4>
            <p className="text-sm text-gray-600">
              {isOwner && otherOwners.length === 1
                ? 'You are the last owner. Transfer ownership before leaving.'
                : 'Remove yourself from this space. You can be re-invited later.'}
            </p>
          </div>
          <button
            onClick={onLeave}
            disabled={!canLeave || actionLoading}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors min-h-[44px] ${
              canLeave
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            Leave
          </button>
        </div>
      </div>

      {/* Transfer Ownership (Owner only) */}
      {isOwner && (
        <div className="p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Transfer Ownership</h4>
            <p className="text-sm text-gray-600 mb-3">
              Transfer ownership to another member. You will become an admin.
            </p>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 min-h-[44px]"
              onChange={(e) => {
                if (e.target.value) {
                  onTransferOwnership(e.target.value);
                }
              }}
              disabled={actionLoading}
            >
              <option value="">Select a member...</option>
              {members
                .filter(m => m.role !== 'owner' && m.status === 'active')
                .map(m => (
                  <option key={m.id} value={m.id}>
                    {m.userName || m.userEmail || 'Unknown User'} ({m.role})
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Step Down to Member (Admin only) */}
      {isAdmin && !isOwner && (
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Step Down to Member</h4>
              <p className="text-sm text-gray-600">
                Remove your admin privileges and become a regular member.
              </p>
            </div>
            <button
              onClick={async () => {
                const currentMember = space.members.find(m => m.userId === profile?.id);
                if (currentMember && confirm('Are you sure you want to step down to member? You will lose admin privileges.')) {
                  await handleUpdateRole(currentMember.id, 'member');
                }
              }}
              disabled={actionLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm min-h-[44px]"
            >
              Step Down
            </button>
          </div>
        </div>
      )}

      {/* Delete Space (Owner only) */}
      {isOwner && (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-red-900 mb-1">Delete Space</h4>
              <p className="text-sm text-red-700">
                Permanently delete this space and all its data. This cannot be undone.
              </p>
            </div>
            <button
              onClick={onDelete}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm min-h-[44px] flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
