/**
 * Create Tracker Options Modal
 * 
 * Modal that appears when user clicks "Create" button,
 * allowing them to choose between creating a custom tracker
 * or browsing templates.
 */

import { X, Sparkles, FileText } from 'lucide-react';

interface CreateTrackerOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustom: () => void;
  onSelectTemplates: () => void;
}

export function CreateTrackerOptionsModal({
  isOpen,
  onClose,
  onSelectCustom,
  onSelectTemplates,
}: CreateTrackerOptionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Tracker</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Browse Templates Option */}
          <button
            onClick={() => {
              onSelectTemplates();
              onClose();
            }}
            className="w-full p-5 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                <FileText size={24} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Browse Templates
                </h3>
                <p className="text-sm text-gray-600">
                  Choose from pre-built tracker templates for common tracking needs
                </p>
              </div>
            </div>
          </button>

          {/* Create Custom Option */}
          <button
            onClick={() => {
              onSelectCustom();
              onClose();
            }}
            className="w-full p-5 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                <Sparkles size={24} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Create Custom Tracker
                </h3>
                <p className="text-sm text-gray-600">
                  Build your own tracker from scratch with custom fields and settings
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
