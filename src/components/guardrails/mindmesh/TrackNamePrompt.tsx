/**
 * Track Name Prompt Modal
 *
 * Simple modal for entering track/subtrack name during creation.
 * Blocks until user provides name or cancels.
 */

import { useState } from 'react';
import { X } from 'lucide-react';

interface TrackNamePromptProps {
  isOpen: boolean;
  title: string;
  placeholder: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  error?: string | null;
}

export function TrackNamePrompt({
  isOpen,
  title,
  placeholder,
  onConfirm,
  onCancel,
  error,
}: TrackNamePromptProps) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="track-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="track-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum 200 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
