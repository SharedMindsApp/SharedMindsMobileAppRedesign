/**
 * Create Group Button
 * 
 * Phase 4.0: Action component for creating groups
 * 
 * Responsibilities:
 * - Uses mutation hook (useCreateGroup)
 * - Handles loading + error states
 * - No feature flags
 * - No section-level checks
 */

import { useState } from 'react';
import { useCreateGroup } from '../../hooks/groups/useCreateGroup';

type CreateGroupButtonProps = {
  teamId: string;
  onGroupCreated?: () => void;
};

export function CreateGroupButton({ teamId, onGroupCreated }: CreateGroupButtonProps) {
  const { createGroup, loading, error } = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await createGroup({
      teamId,
      name,
      description: description || undefined,
    });

    if (result) {
      setName('');
      setDescription('');
      if (onGroupCreated) {
        onGroupCreated();
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
        <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-1">
          Group Name
        </label>
        <input
          id="group-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Enter group name"
        />
      </div>

      <div>
        <label htmlFor="group-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          id="group-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Enter group description"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Create Group'}
      </button>
    </form>
  );
}
