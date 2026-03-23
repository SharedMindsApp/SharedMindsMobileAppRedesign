/**
 * Assign Track Modal
 * 
 * Modal for assigning tracks/subtracks to users or groups by granting entity permissions.
 * Can be opened from roadmap views via the 3-dots menu.
 */

import { useState } from 'react';
import { X, Users, User } from 'lucide-react';
import { useGrantEntityPermission } from '../../../hooks/permissions/useGrantEntityPermission';
import { ENABLE_ENTITY_GRANTS } from '../../../lib/featureFlags';

type AssignTrackModalProps = {
  entityType: 'track' | 'subtrack';
  entityId: string;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: () => void;
};

export function AssignTrackModal({
  entityType,
  entityId,
  entityName,
  isOpen,
  onClose,
  onAssigned,
}: AssignTrackModalProps) {
  const { grantPermission, loading, error } = useGrantEntityPermission();
  const [subjectType, setSubjectType] = useState<'user' | 'group'>('user');
  const [subjectId, setSubjectId] = useState('');
  const [role, setRole] = useState<'editor' | 'commenter' | 'viewer'>('viewer');

  if (!ENABLE_ENTITY_GRANTS) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectId.trim()) {
      return;
    }

    const result = await grantPermission({
      entityType,
      entityId,
      subjectType,
      subjectId: subjectId.trim(),
      role,
    });

    if (result) {
      setSubjectId('');
      if (onAssigned) {
        onAssigned();
      }
      onClose();
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSubjectId('');
      setSubjectType('user');
      setRole('viewer');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assign {entityType === 'track' ? 'Track' : 'Subtrack'}</h2>
            <p className="text-sm text-gray-600 mt-1">{entityName}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="subject-type" className="block text-sm font-medium text-gray-700 mb-1">
              Assign To
            </label>
            <select
              id="subject-type"
              value={subjectType}
              onChange={(e) => {
                setSubjectType(e.target.value as 'user' | 'group');
                setSubjectId('');
              }}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="user">User</option>
              <option value="group">Group</option>
            </select>
          </div>

          <div>
            <label htmlFor="subject-id" className="block text-sm font-medium text-gray-700 mb-1">
              {subjectType === 'user' ? (
                <span className="flex items-center gap-2">
                  <User size={16} />
                  User ID
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Users size={16} />
                  Group ID
                </span>
              )}
            </label>
            <input
              id="subject-id"
              type="text"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={loading}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={`Enter ${subjectType === 'user' ? 'user' : 'group'} ID`}
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the {subjectType === 'user' ? 'user' : 'group'} ID to grant access
            </p>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'editor' | 'commenter' | 'viewer')}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="viewer">Viewer - Can view only</option>
              <option value="commenter">Commenter - Can view and comment</option>
              <option value="editor">Editor - Can view, comment, and edit</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !subjectId.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium min-h-[44px]"
            >
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}