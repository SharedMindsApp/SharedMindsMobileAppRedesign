/**
 * Project-Scoped Personal Calendar Sharing Panel
 * 
 * Phase 8: UI for managing project-scoped personal calendar sharing.
 * 
 * Location: Project Settings → Calendar → "Personal Calendar Access"
 * 
 * Allows users to:
 * - Share their personal calendar (for events from this project) with collaborators
 * - Set read/write permissions
 * - Revoke access
 * - See who has access to project events in their personal calendar
 */

import { useState, useEffect } from 'react';
import { Users, Eye, Edit, X, Plus, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
  getPersonalCalendarSharesForOwner,
  createPersonalCalendarShare,
  updatePersonalCalendarShare,
  deletePersonalCalendarShare,
  type PersonalCalendarShare,
  type PersonalCalendarAccessLevel,
} from '../../../lib/personalSpaces/personalCalendarSharing';
import { showToast } from '../../Toast';
import { ConfirmDialogInline } from '../../ConfirmDialogInline';

interface ProjectPersonalCalendarSharingPanelProps {
  projectId: string;
  projectName: string;
}

export function ProjectPersonalCalendarSharingPanel({
  projectId,
  projectName,
}: ProjectPersonalCalendarSharingPanelProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shares, setShares] = useState<PersonalCalendarShare[]>([]);
  const [showAddShare, setShowAddShare] = useState(false);
  const [newShareEmail, setNewShareEmail] = useState('');
  const [newShareAccessLevel, setNewShareAccessLevel] = useState<PersonalCalendarAccessLevel>('read');
  const [showWriteConfirm, setShowWriteConfirm] = useState(false);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadShares();
    }
  }, [user, projectId]);

  async function loadShares() {
    if (!user) return;

    try {
      setLoading(true);
      const allShares = await getPersonalCalendarSharesForOwner(user.id);
      // Filter to project-scoped shares for this project
      setShares(allShares.filter(share => 
        share.scope_type === 'project' && share.project_id === projectId
      ));
    } catch (error) {
      console.error('[ProjectPersonalCalendarSharingPanel] Error loading shares:', error);
      showToast('Failed to load calendar shares', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddShare() {
    if (!user || !newShareEmail.trim()) return;

    try {
      setSaving(true);

      // TODO: Look up user by email
      const sharedWithUserId = await lookupUserIdByEmail(newShareEmail.trim());
      if (!sharedWithUserId) {
        showToast('User not found', 'error');
        return;
      }

      if (newShareAccessLevel === 'write') {
        // Show confirmation for write access
        setShowWriteConfirm(true);
        return;
      }

      await createPersonalCalendarShare({
        owner_user_id: user.id,
        shared_with_user_id: sharedWithUserId,
        access_level: newShareAccessLevel,
        scope_type: 'project',
        project_id: projectId,
      });

      showToast('Calendar access granted', 'success');
      setNewShareEmail('');
      setNewShareAccessLevel('read');
      setShowAddShare(false);
      await loadShares();
    } catch (error) {
      console.error('[ProjectPersonalCalendarSharingPanel] Error creating share:', error);
      showToast('Failed to grant calendar access', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmWriteShare() {
    if (!user || !newShareEmail.trim()) return;

    try {
      setSaving(true);

      const sharedWithUserId = await lookupUserIdByEmail(newShareEmail.trim());
      if (!sharedWithUserId) {
        showToast('User not found', 'error');
        return;
      }

      await createPersonalCalendarShare({
        owner_user_id: user.id,
        shared_with_user_id: sharedWithUserId,
        access_level: 'write',
        scope_type: 'project',
        project_id: projectId,
      });

      showToast('Write access granted', 'success');
      setNewShareEmail('');
      setNewShareAccessLevel('read');
      setShowAddShare(false);
      setShowWriteConfirm(false);
      await loadShares();
    } catch (error) {
      console.error('[ProjectPersonalCalendarSharingPanel] Error creating share:', error);
      showToast('Failed to grant write access', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateAccessLevel(shareId: string, newLevel: PersonalCalendarAccessLevel) {
    if (!user) return;

    if (newLevel === 'write') {
      setShowWriteConfirm(true);
      // Store share ID for update
      setRevokingShareId(shareId); // Reuse this state for update confirmation
      return;
    }

    try {
      setSaving(true);
      await updatePersonalCalendarShare(shareId, { access_level: newLevel });
      showToast('Access level updated', 'success');
      await loadShares();
    } catch (error) {
      console.error('[ProjectPersonalCalendarSharingPanel] Error updating share:', error);
      showToast('Failed to update access level', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRevokeShare(shareId: string) {
    if (!user) return;

    try {
      setSaving(true);
      await deletePersonalCalendarShare(shareId);
      showToast('Access revoked', 'success');
      await loadShares();
    } catch (error) {
      console.error('[ProjectPersonalCalendarSharingPanel] Error revoking share:', error);
      showToast('Failed to revoke access', 'error');
    } finally {
      setSaving(false);
      setRevokingShareId(null);
    }
  }

  // Look up user ID by email
  async function lookupUserIdByEmail(email: string): Promise<string | null> {
    try {
      // Query profiles table by email
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        console.error('[ProjectPersonalCalendarSharingPanel] Error looking up user:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('[ProjectPersonalCalendarSharingPanel] Error looking up user:', error);
      return null;
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Calendar Access</h3>
        <p className="text-sm text-gray-600 mb-4">
          Allow collaborators to see or edit events from <strong>{projectName}</strong> in your personal calendar.
          This only affects events synced from this project, not your other personal calendar events.
        </p>
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-800">
            Project-scoped sharing only applies to events from this Guardrails project. Other personal calendar events remain private.
          </p>
        </div>
      </div>

      {/* Add Share Section */}
      {!showAddShare ? (
        <button
          onClick={() => setShowAddShare(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Grant calendar access
        </button>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collaborator email
            </label>
            <input
              type="email"
              value={newShareEmail}
              onChange={(e) => setNewShareEmail(e.target.value)}
              placeholder="collaborator@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permission level
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accessLevel"
                  value="read"
                  checked={newShareAccessLevel === 'read'}
                  onChange={() => setNewShareAccessLevel('read')}
                  className="text-blue-600"
                  disabled={saving}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-gray-500" />
                    <span className="font-medium">Read-only</span>
                  </div>
                  <p className="text-sm text-gray-500 ml-6">Can view project events in your calendar</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accessLevel"
                  value="write"
                  checked={newShareAccessLevel === 'write'}
                  onChange={() => setNewShareAccessLevel('write')}
                  className="text-blue-600"
                  disabled={saving}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Edit size={16} className="text-gray-500" />
                    <span className="font-medium">Read & Write</span>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">Warning</span>
                  </div>
                  <p className="text-sm text-gray-500 ml-6">Can create, edit, and delete project events in your calendar</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleAddShare}
              disabled={saving || !newShareEmail.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Grant access
            </button>
            <button
              onClick={() => {
                setShowAddShare(false);
                setNewShareEmail('');
                setNewShareAccessLevel('read');
              }}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing Shares List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : shares.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No one has access to project events in your calendar yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">People with access</h4>
          {shares.map((share) => (
            <div
              key={share.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {/* TODO: Fetch and display user name */}
                    User {share.shared_with_user_id.slice(0, 8)}
                  </span>
                  {share.access_level === 'write' && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Can edit
                    </span>
                  )}
                  {share.access_level === 'read' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded flex items-center gap-1">
                      <Eye size={12} />
                      Read-only
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Access granted {new Date(share.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={share.access_level}
                  onChange={(e) => handleUpdateAccessLevel(share.id, e.target.value as PersonalCalendarAccessLevel)}
                  disabled={saving}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="read">Read-only</option>
                  <option value="write">Read & Write</option>
                </select>
                <button
                  onClick={() => setRevokingShareId(share.id)}
                  disabled={saving}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Revoke access"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Write Access Confirmation Modal */}
      {showWriteConfirm && (
        <ConfirmDialogInline
          isOpen={showWriteConfirm}
          onClose={() => {
            setShowWriteConfirm(false);
            setNewShareAccessLevel('read');
          }}
          onConfirm={handleConfirmWriteShare}
          title="Grant write access?"
          message={`Write access allows this person to create, edit, and delete events from "${projectName}" in your personal calendar. This is a powerful permission. Are you sure?`}
          confirmText="Grant write access"
          cancelText="Cancel"
          variant="danger"
        />
      )}

      {/* Revoke Confirmation Modal */}
      {revokingShareId && (
        <ConfirmDialogInline
          isOpen={!!revokingShareId}
          onClose={() => setRevokingShareId(null)}
          onConfirm={() => handleRevokeShare(revokingShareId!)}
          title="Revoke access?"
          message="This person will no longer be able to view or edit project events in your personal calendar."
          confirmText="Revoke access"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  );
}
