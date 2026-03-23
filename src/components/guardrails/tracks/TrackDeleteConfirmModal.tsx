import { AlertTriangle, X } from 'lucide-react';

interface TrackDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trackName: string;
  itemCount?: number;
}

export function TrackDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  trackName,
  itemCount = 0,
}: TrackDeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Delete Track</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-gray-700 mb-3">
            Are you sure you want to delete the track <span className="font-semibold">"{trackName}"</span>?
          </p>

          {itemCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-900">
                This track has <span className="font-semibold">{itemCount}</span> {itemCount === 1 ? 'item' : 'items'} assigned to it.
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              Deleting this track will NOT delete its tasks or roadmap items. They will simply become unassigned.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Track
          </button>
        </div>
      </div>
    </div>
  );
}
