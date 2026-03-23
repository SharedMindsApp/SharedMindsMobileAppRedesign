import { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { createOffshootIdea } from '../../../lib/guardrails';
import { BottomSheet } from '../../shared/BottomSheet';
import { showToast } from '../../Toast';

interface AddSideIdeaModalProps {
  masterProjectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddSideIdeaModal({
  masterProjectId,
  isOpen,
  onClose,
  onSuccess,
}: AddSideIdeaModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      await createOffshootIdea({
        master_project_id: masterProjectId,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create side idea:', error);
      showToast('error', 'Failed to create side idea. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Render form content (shared between mobile and desktop)
  const renderFormContent = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter idea title"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 min-h-[44px]"
          disabled={loading}
          required
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your idea (optional)"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
          disabled={loading}
        />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-xs text-yellow-900">
          Side ideas are quick thoughts or possibilities that might become roadmap items
          later. You can promote them to the roadmap when ready.
        </p>
      </div>
    </>
  );

  // Mobile: Bottom Sheet (Half-height 50vh per audit)
  if (isMobile) {
    const header = (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Lightbulb size={20} className="text-yellow-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Add Side Idea</h2>
      </div>
    );

    const footer = (
      <div className="flex gap-3 w-full">
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="flex-1 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg active:scale-[0.98] transition-all font-medium min-h-[44px]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={loading || !title.trim()}
          className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] font-medium"
        >
          <Lightbulb size={18} />
          Add Side Idea
        </button>
      </div>
    );

    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        header={header}
        footer={footer}
        maxHeight="50vh"
        closeOnBackdrop={!loading}
        preventClose={loading}
      >
        <div className="px-4 py-4 space-y-4">
          {renderFormContent()}
        </div>
      </BottomSheet>
    );
  }

  // Desktop: Centered modal (unchanged)
  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={handleClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Lightbulb size={20} className="text-yellow-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Add Side Idea</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {renderFormContent()}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                disabled={loading || !title.trim()}
              >
                <Lightbulb size={18} />
                Add Side Idea
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
