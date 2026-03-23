import { useState } from 'react';
import { X } from 'lucide-react';
import { RecipeIconLibrary } from '../../lib/recipeIcons';

interface RecipeIconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIconName: string | null;
  onSave: (iconName: string | null) => Promise<void>;
}

export function RecipeIconPickerModal({
  isOpen,
  onClose,
  currentIconName,
  onSave
}: RecipeIconPickerModalProps) {
  const [selectedIconName, setSelectedIconName] = useState<string | null>(currentIconName);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedIconName);
      onClose();
    } catch (error) {
      console.error('Failed to save icon:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedIconName(currentIconName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[115] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Choose Recipe Icon</h2>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Preview
            </label>
            <div className="h-20 bg-gray-50 rounded-lg flex items-center justify-center">
              {selectedIconName ? (
                <div className="text-6xl animate-fadeIn">
                  {RecipeIconLibrary.find(i => i.id === selectedIconName)?.icon}
                </div>
              ) : (
                <p className="text-gray-400">No icon selected</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Select Icon
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-80 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {RecipeIconLibrary.map(icon => (
                <button
                  key={icon.id}
                  onClick={() => setSelectedIconName(icon.id)}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-110 ${
                    selectedIconName === icon.id
                      ? 'border-orange-500 bg-orange-50 scale-105'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                  title={icon.label}
                >
                  <div className="text-3xl">{icon.icon}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setSelectedIconName(null)}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear icon
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Icon'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
