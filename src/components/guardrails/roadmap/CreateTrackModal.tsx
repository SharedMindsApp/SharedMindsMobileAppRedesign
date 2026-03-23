import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';

interface CreateTrackModalProps {
  onClose: () => void;
  onCreate: (name: string, description?: string, color?: string, parentTrackId?: string | null) => Promise<void>;
  parentTrackId: string | null;
}

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

export function CreateTrackModal({ onClose, onCreate, parentTrackId }: CreateTrackModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onCreate(name.trim(), description.trim() || undefined, selectedColor || undefined, parentTrackId);
      // onClose is handled by parent after successful creation
    } catch (error: any) {
      console.error('Failed to create track:', error);
      alert(error.message || 'Failed to create track');
    } finally {
      setIsCreating(false);
    }
  };

  // Render form content (shared between mobile and desktop)
  const renderFormContent = () => (
    <>
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              className={`w-10 h-10 rounded-full transition-all min-w-[40px] min-h-[40px] ${
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
            className="mt-2 text-xs text-gray-600 hover:text-gray-800 min-h-[44px]"
          >
            Clear color
          </button>
        )}
      </div>
    </>
  );

  // Mobile: Bottom Sheet (Peek 40vh per audit)
  if (isMobile) {
    const header = (
      <h2 className="text-lg font-semibold text-gray-900">
        {parentTrackId ? 'Create Child Track' : 'Create Track'}
      </h2>
    );

    const footer = (
      <div className="flex gap-3 w-full">
        <button
          type="button"
          onClick={onClose}
          disabled={isCreating}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[44px]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!name.trim() || isCreating}
          className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus size={16} />
              Create
            </>
          )}
        </button>
      </div>
    );

    return (
      <BottomSheet
        isOpen={true}
        onClose={onClose}
        header={header}
        footer={footer}
        maxHeight="40vh"
        closeOnBackdrop={!isCreating}
        preventClose={isCreating}
      >
        <div className="px-4 py-4 space-y-4">
          {renderFormContent()}
        </div>
      </BottomSheet>
    );
  }

  // Desktop: Centered modal (unchanged)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {parentTrackId ? 'Create Child Track' : 'Create Track'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {renderFormContent()}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Track
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
