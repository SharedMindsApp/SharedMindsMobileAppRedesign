import { X, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface Props {
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; color: string }) => Promise<void>;
}

const PURPLE_SHADES = [
  '#A855F7',
  '#9333EA',
  '#7C3AED',
  '#6D28D9',
  '#5B21B6',
  '#C084FC',
  '#E9D5FF',
  '#DDD6FE',
];

export function CreateSideProjectModal({ onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#A855F7');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        color: selectedColor,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create side project:', error);
      // Phase 5A: Use toast instead of alert
      const { showToast } = await import('../../../components/Toast');
      showToast('error', 'Failed to create side project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 safe-top safe-bottom">
      <div className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-lg w-full max-h-screen-safe overflow-hidden flex flex-col overscroll-contain">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Create Side Project</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Prototype Mobile App, Research AI Tools..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              A side project is an idea that deserves space, but not center stage.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What is this side project about? What are you exploring?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Color Theme
            </label>
            <div className="grid grid-cols-8 gap-2">
              {PURPLE_SHADES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    selectedColor === color
                      ? 'border-gray-900 scale-110 shadow-md'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Side projects use purple color family for visual distinction
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
              <Sparkles size={16} />
              What happens next?
            </h3>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Your side project will appear in Roadmap, TaskFlow, and Mind Mesh</li>
              <li>• Assign tasks and ideas to it as you explore</li>
              <li>• Convert it to a Master Project when it grows</li>
              <li>• Archive it if the exploration ends</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Create Side Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
