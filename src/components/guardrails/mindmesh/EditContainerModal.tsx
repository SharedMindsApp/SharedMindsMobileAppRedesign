import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface EditContainerModalProps {
  containerId: string;
  initialTitle: string;
  initialBody: string;
  isGhost?: boolean;
  onSave: (title: string, body: string) => void;
  onActivate?: () => void;
  onClose: () => void;
}

export function EditContainerModal({
  containerId,
  initialTitle,
  initialBody,
  isGhost = false,
  onSave,
  onActivate,
  onClose,
}: EditContainerModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);

  useEffect(() => {
    setTitle(initialTitle);
    setBody(initialBody);
  }, [containerId, initialTitle, initialBody]);

  const handleSave = () => {
    onSave(title, body);
    onClose();
  };

  const handleActivate = () => {
    if (onActivate) {
      onActivate();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Edit Container</h2>
            {isGhost && (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded border border-gray-300">
                Ghost (Not Materialized)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isGhost && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                This is a ghost container from the Guardrails system. Click "Activate Container" to materialize it and make it editable.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isGhost}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              placeholder="Container title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              disabled={isGhost}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              placeholder="Container content"
            />
          </div>
        </div>

        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          {isGhost && onActivate ? (
            <button
              onClick={handleActivate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check size={16} />
              Activate Container
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {!isGhost && (
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
