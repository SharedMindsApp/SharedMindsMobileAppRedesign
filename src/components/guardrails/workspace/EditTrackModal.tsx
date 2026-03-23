/**
 * EditTrackModal Component
 * 
 * Modal/Sheet for editing track or subtrack metadata.
 * Allows editing name, description, and color.
 * 
 * ARCHITECTURAL RULES:
 * - Uses service layer only (no direct Supabase queries)
 * - All mutations go through tracksHierarchy service
 * - Updates trigger callback to refresh workspace
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';

const TRACK_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#06B6D4', // cyan
];

interface EditTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  initialName: string;
  initialDescription: string | null;
  initialColor: string | null;
  onSave: (name: string, description: string | null, color: string | null) => Promise<void>;
}

export function EditTrackModal({
  isOpen,
  onClose,
  trackId,
  initialName,
  initialDescription,
  initialColor,
  onSave,
}: EditTrackModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || '');
  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Reset form when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription || '');
      setSelectedColor(initialColor);
      setError(null);
    }
  }, [isOpen, initialName, initialDescription, initialColor]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), description.trim() || null, selectedColor);
      onClose();
    } catch (error: any) {
      console.error('[EditTrackModal] Failed to update track:', error);
      setError(error.message || 'Failed to update track');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    setName(initialName);
    setDescription(initialDescription || '');
    setSelectedColor(initialColor);
    setError(null);
    onClose();
  };

  // Render form content (shared between mobile and desktop)
  const renderFormContent = () => (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Track Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Development, Marketing, Design"
          autoFocus
          required
          disabled={isSaving}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this track"
          rows={3}
          disabled={isSaving}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Color (Optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {TRACK_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color === selectedColor ? null : color)}
              disabled={isSaving}
              className={`w-10 h-10 rounded-full transition-all min-w-[40px] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed ${
                color === selectedColor
                  ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                  : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        {selectedColor && (
          <button
            type="button"
            onClick={() => setSelectedColor(null)}
            disabled={isSaving}
            className="mt-2 text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            Clear color
          </button>
        )}
      </div>
    </>
  );

  if (!isOpen) return null;

  // Mobile: Bottom Sheet
  if (isMobile) {
    const header = (
      <h2 className="text-lg font-semibold text-gray-900">Edit Track</h2>
    );

    const footer = (
      <div className="flex gap-3 w-full">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[44px]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!name.trim() || isSaving}
          className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>
    );

    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleCancel}
        header={header}
        footer={footer}
        maxHeight="70vh"
        closeOnBackdrop={!isSaving}
        preventClose={isSaving}
      >
        <div className="px-4 py-4 space-y-4">
          {renderFormContent()}
        </div>
      </BottomSheet>
    );
  }

  // Desktop: Centered modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Track</h2>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {renderFormContent()}
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!name.trim() || isSaving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
