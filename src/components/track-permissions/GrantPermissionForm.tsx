/**
 * Grant Permission Form
 * 
 * Phase 4.1: Action component for granting permissions
 * 
 * Responsibilities:
 * - Uses mutation hook (useGrantEntityPermission)
 * - Handles loading + error states
 * - Hidden entirely if parent doesn't render it
 */

import { useState } from 'react';
import { useGrantEntityPermission } from '../../hooks/permissions/useGrantEntityPermission';

type GrantPermissionFormProps = {
  trackId: string;
  onPermissionGranted?: () => void;
};

export function GrantPermissionForm({ trackId, onPermissionGranted }: GrantPermissionFormProps) {
  const { grantPermission, loading, error } = useGrantEntityPermission();
  const [subjectType, setSubjectType] = useState<'user' | 'group'>('user');
  const [subjectId, setSubjectId] = useState('');
  const [role, setRole] = useState<'editor' | 'commenter' | 'viewer'>('viewer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await grantPermission({
      entityType: 'track',
      entityId: trackId,
      subjectType,
      subjectId: subjectId.trim(),
      role,
    });

    if (result) {
      setSubjectId('');
      if (onPermissionGranted) {
        onPermissionGranted();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="subject-type" className="block text-sm font-medium text-gray-700 mb-1">
          Subject Type
        </label>
        <select
          id="subject-type"
          value={subjectType}
          onChange={(e) => setSubjectType(e.target.value as 'user' | 'group')}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="user">User</option>
          <option value="group">Group</option>
        </select>
      </div>

      <div>
        <label htmlFor="subject-id" className="block text-sm font-medium text-gray-700 mb-1">
          {subjectType === 'user' ? 'User ID' : 'Group ID'}
        </label>
        <input
          id="subject-id"
          type="text"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          disabled={loading}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder={`Enter ${subjectType} ID`}
        />
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="viewer">Viewer</option>
          <option value="commenter">Commenter</option>
          <option value="editor">Editor</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading || !subjectId.trim()}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Granting...' : 'Grant Permission'}
      </button>
    </form>
  );
}
