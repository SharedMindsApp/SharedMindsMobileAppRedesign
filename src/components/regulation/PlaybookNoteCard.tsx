import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { RegulationPlaybook } from '../../lib/regulation/playbookTypes';

interface PlaybookNoteCardProps {
  playbook: RegulationPlaybook;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PlaybookNoteCard({ playbook, onEdit, onDelete }: PlaybookNoteCardProps) {
  const hasContent =
    playbook.notes || (playbook.helps && playbook.helps.length > 0) || playbook.doesnt_help;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-blue-900">You've left yourself a note about this</p>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-blue-600 hover:text-blue-800 transition-colors"
              aria-label="Edit note"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-blue-600 hover:text-blue-800 transition-colors"
              aria-label="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {playbook.notes && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{playbook.notes}</p>
        </div>
      )}

      {playbook.helps && playbook.helps.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-2">What usually helps:</p>
          <div className="flex flex-wrap gap-2">
            {playbook.helps.map(help => (
              <span
                key={help}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
              >
                {help}
              </span>
            ))}
          </div>
        </div>
      )}

      {playbook.doesnt_help && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">What doesn't help:</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{playbook.doesnt_help}</p>
        </div>
      )}
    </div>
  );
}
