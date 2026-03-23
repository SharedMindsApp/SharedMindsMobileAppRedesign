import { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Eye, Edit, Trash2, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  grantTrackerPermission,
  revokeTrackerPermission,
  listTrackerPermissions,
  type TrackerPermissionGrant,
} from '../../lib/trackerStudio/trackerPermissionService';
import { resolveTrackerPermissions } from '../../lib/trackerStudio/trackerPermissionResolver';

type TrackerSharingDrawerProps = {
  trackerId: string;
  isOpen: boolean;
  onClose: () => void;
};

type AccessLevel = 'viewer' | 'editor';

interface UserWithGrant {
  profileId: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: AccessLevel;
  grantId: string;
  grantedAt: string;
}

export function TrackerSharingDrawer({
  trackerId,
  isOpen,
  onClose,
}: TrackerSharingDrawerProps) {
  const [grants, setGrants] = useState<UserWithGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AccessLevel>('viewer');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (isOpen && trackerId) {
      loadPermissions();
      checkCanManage();
    }
  }, [isOpen, trackerId]);

  const checkCanManage = async () => {
    try {
      const permissions = await resolveTrackerPermissions(trackerId);
      setCanManage(permissions.canManage);
    } catch (err) {
      console.error('Failed to check permissions:', err);
      setCanManage(false);
    }
  };

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const permissionGrants = await listTrackerPermissions(trackerId);

      // Get user details for each grant
      const grantsWithUsers: UserWithGrant[] = [];
      for (const grant of permissionGrants) {
        // Get profile and user details
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', grant.subjectId)
          .maybeSingle();

        if (profileError || !profile) {
          console.error('Failed to load profile for grant:', grant.id);
          continue;
        }

        grantsWithUsers.push({
          profileId: profile.id,
          userId: profile.id,
          email: profile.email || 'Unknown',
          fullName: profile.full_name,
          role: grant.permissionRole,
          grantId: grant.id,
          grantedAt: grant.grantedAt,
        });
      }

      setGrants(grantsWithUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setInviting(true);
      setError(null);

      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail.trim().toLowerCase())
        .maybeSingle();

      if (profileError || !profile) {
        setError('User not found with that email address');
        return;
      }

      // Grant permission
      await grantTrackerPermission(trackerId, profile.id, inviteRole);

      // Reload permissions
      await loadPermissions();

      // Reset form
      setInviteEmail('');
      setInviteRole('viewer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (grantId: string) => {
    if (!confirm('Are you sure you want to revoke this user\'s access?')) {
      return;
    }

    try {
      await revokeTrackerPermission(grantId);
      await loadPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke access');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 md:items-center">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Share Tracker</h2>
            <p className="text-sm text-gray-600 mt-1">Manage who can view or edit this tracker</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Current Access */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Current Access</h3>
            {loading ? (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">Loading...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Owner (always shown) */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Owner</p>
                      <p className="text-xs text-gray-500">Full control</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-600 bg-gray-200 px-2 py-1 rounded">
                    Owner
                  </span>
                </div>

                {/* Shared users */}
                {grants.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No one else has access to this tracker
                  </p>
                ) : (
                  grants.map((grant) => (
                    <div
                      key={grant.grantId}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {grant.fullName || grant.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{grant.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            grant.role === 'editor'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {grant.role === 'editor' ? 'Editor' : 'Viewer'}
                        </span>
                        {canManage && (
                          <button
                            onClick={() => handleRevoke(grant.grantId)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Revoke access"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Invite User */}
          {canManage && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Invite User</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">
                    Access Level
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="invite-role"
                        value="viewer"
                        checked={inviteRole === 'viewer'}
                        onChange={() => setInviteRole('viewer')}
                        className="text-blue-600"
                      />
                      <Eye size={18} className="text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Viewer</p>
                        <p className="text-xs text-gray-500">Can view tracker and entries</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="invite-role"
                        value="editor"
                        checked={inviteRole === 'editor'}
                        onChange={() => setInviteRole('editor')}
                        className="text-blue-600"
                      />
                      <Edit size={18} className="text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Editor</p>
                        <p className="text-xs text-gray-500">Can view and edit entries</p>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <UserPlus size={18} />
                  {inviting ? 'Inviting...' : 'Invite User'}
                </button>
              </div>
            </div>
          )}

          {!canManage && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                Only the tracker owner can manage sharing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
