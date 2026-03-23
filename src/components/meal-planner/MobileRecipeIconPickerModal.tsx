import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { RecipeIconLibrary } from '../../lib/recipeIcons';

interface MobileRecipeIconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIconName: string | null;
  onSave: (iconName: string | null) => Promise<void>;
}

export function MobileRecipeIconPickerModal({
  isOpen,
  onClose,
  currentIconName,
  onSave
}: MobileRecipeIconPickerModalProps) {
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
    <div className="fixed inset-0 bg-white z-[125] flex flex-col">
      <div className="bg-orange-500 px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleClose}
          className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <h2 className="text-lg font-semibold text-white flex-1">
          Choose Recipe Icon
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
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
              <p className="text-gray-400 text-sm">No icon selected</p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Select Icon
          </label>
          <div className="grid grid-cols-5 gap-2">
            {RecipeIconLibrary.map(icon => (
              <button
                key={icon.id}
                onClick={() => setSelectedIconName(icon.id)}
                className={`p-3 rounded-lg border-2 transition-all active:scale-95 ${
                  selectedIconName === icon.id
                    ? 'border-orange-500 bg-orange-50 scale-105'
                    : 'border-gray-200'
                }`}
                title={icon.label}
              >
                <div className="text-2xl">{icon.icon}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setSelectedIconName(null)}
          className="text-sm text-gray-600 underline mb-4"
        >
          Clear icon
        </button>
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Icon'}
        </button>
      </div>
    </div>
  );
}
