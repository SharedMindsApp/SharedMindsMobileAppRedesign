/**
 * CreateEditSideProjectBottomSheet - Mobile create/edit for side projects
 * 
 * Features:
 * - Minimal required fields (title only)
 * - Description optional and expandable
 * - Color picker (optional, behind "More options")
 * - Bottom sheet on mobile, modal on desktop
 */

import { useState, useEffect } from 'react';
import { Sparkles, Plus, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';
import type { TrackWithStats } from '../../../lib/guardrails/trackService';

interface CreateEditSideProjectBottomSheetProps {
  masterProjectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; color: string }) => Promise<void>;
  project?: TrackWithStats | null;
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

export function CreateEditSideProjectBottomSheet({
  masterProjectId,
  isOpen,
  onClose,
  onSubmit,
  project = null,
}: CreateEditSideProjectBottomSheetProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#A855F7');
  const [loading, setLoading] = useState(false);

  const isEditing = !!project;

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      if (project) {
        setTitle(project.name);
        setDescription(project.description || '');
        setShowDescription(!!project.description);
        setSelectedColor(project.color || '#A855F7');
      } else {
        setTitle('');
        setDescription('');
        setShowDescription(false);
        setSelectedColor('#A855F7');
      }
      setShowMoreOptions(false);
    }
  }, [isOpen, project]);

  const handleSave = async () => {
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        color: selectedColor,
      });
      setTitle('');
      setDescription('');
      setShowDescription(false);
      setShowMoreOptions(false);
      onClose();
    } catch (error) {
      console.error('Failed to save side project:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Name *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Prototype Mobile App..."
          autoFocus
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base"
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
              Description (optional)
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
            placeholder="What is this side project about?"
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base resize-none"
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

      {showMoreOptions ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Color Theme
            </label>
            <button
              onClick={() => setShowMoreOptions(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronUp size={16} />
            </button>
          </div>
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
                disabled={loading}
              />
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowMoreOptions(true)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          disabled={loading}
        >
          <ChevronDown size={16} />
          <span>More options</span>
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
        className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>{isEditing ? 'Saving...' : 'Creating...'}</span>
          </>
        ) : (
          <>
            {isEditing ? <Save size={16} /> : <Plus size={16} />}
            <span>{isEditing ? 'Save' : 'Create'}</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Side Project' : 'Create Side Project'}
      footer={renderFooter()}
      maxHeight="70vh"
      preventClose={loading}
    >
      {renderContent()}
    </BottomSheet>
  );
}

