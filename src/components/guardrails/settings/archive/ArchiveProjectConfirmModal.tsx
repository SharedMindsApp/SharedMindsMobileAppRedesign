import { Archive, AlertCircle, Loader2 } from 'lucide-react';
import type { MasterProject } from '../../../../lib/guardrailsTypes';

interface ArchiveProjectConfirmModalProps {
  project: MasterProject;
  onConfirm: () => void;
  onCancel: () => void;
  isArchiving: boolean;
}

export function ArchiveProjectConfirmModal({
  project,
  onConfirm,
  onCancel,
  isArchiving,
}: ArchiveProjectConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <Archive className="text-gray-600" size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Archive Project</h2>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Are you sure you want to archive <span className="font-semibold">"{project.name}"</span>?
          </p>

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">What happens when you archive:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Project moves to archived section</li>
                <li>No longer visible in main views</li>
                <li>Can be unarchived anytime</li>
                <li>All data is preserved</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isArchiving}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isArchiving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isArchiving ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Archiving...
              </>
            ) : (
              <>
                <Archive size={20} />
                Archive Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
