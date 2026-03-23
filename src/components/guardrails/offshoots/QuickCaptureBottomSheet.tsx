/**
 * QuickCaptureBottomSheet - Instant offshoot idea capture
 * 
 * Features:
 * - Minimal required input (title only)
 * - Description optional and expandable
 * - Auto-assigns source and timestamp
 * - Returns user immediately to list after save
 * - Must take ≤2 seconds
 */

import { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';
import { createOffshootIdea } from '../../../lib/guardrails';
import { showToast } from '../../Toast';

interface QuickCaptureBottomSheetProps {
  masterProjectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickCaptureBottomSheet({
  masterProjectId,
  isOpen,
  onClose,
  onSuccess,
}: QuickCaptureBottomSheetProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setShowDescription(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      await createOffshootIdea({
        master_project_id: masterProjectId,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      showToast('success', 'Idea captured');
      setTitle('');
      setDescription('');
      setShowDescription(false);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to capture idea:', error);
      showToast('error', 'Failed to capture idea. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What's on your mind? *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quick idea title..."
          autoFocus
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && title.trim()) {
              e.preventDefault();
              handleSave();
            }
          }}
        />
      </div>

      {showDescription ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              More details (optional)
            </label>
            <button
              onClick={() => setShowDescription(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronUp size={16} />
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any additional context..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base resize-none"
            disabled={loading}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowDescription(true)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          disabled={loading}
        >
          <ChevronDown size={16} />
          <span>Add description (optional)</span>
        </button>
      )}
    </div>
  );

  const renderFooter = () => (
    <div className="flex gap-3 p-4 border-t border-gray-200">
      <button
        onClick={onClose}
        disabled={loading}
        className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={!title.trim() || loading}
        className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Plus size={16} />
            <span>Capture</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Capture Idea"
      footer={renderFooter()}
      maxHeight="60vh"
      preventClose={loading}
    >
      {renderContent()}
    </BottomSheet>
  );
}

