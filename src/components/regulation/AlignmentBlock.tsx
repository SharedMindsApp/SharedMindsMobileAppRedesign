import { useState } from 'react';
import { Clock, ChevronDown, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import type { AlignmentBlockWithMicrotasks } from '../../lib/regulation/dailyAlignmentTypes';
import {
  addMicrotask,
  toggleMicrotask,
  updateMicrotask,
  deleteMicrotask,
  deleteBlock,
  updateBlock,
} from '../../lib/regulation/dailyAlignmentService';
import { DURATION_OPTIONS } from '../../lib/regulation/dailyAlignmentTypes';

interface AlignmentBlockProps {
  block: AlignmentBlockWithMicrotasks;
  onUpdate: () => void;
}

export function AlignmentBlock({ block, onUpdate }: AlignmentBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [newMicrotaskText, setNewMicrotaskText] = useState('');
  const [editingMicrotaskId, setEditingMicrotaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [changingDuration, setChangingDuration] = useState(false);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  const getDurationLabel = (minutes: number): string => {
    const option = DURATION_OPTIONS.find(opt => opt.minutes === minutes);
    return option?.label || `${minutes} min`;
  };

  const handleAddMicrotask = async () => {
    if (!newMicrotaskText.trim()) return;

    const result = await addMicrotask(block.id, newMicrotaskText.trim());
    if (result) {
      setNewMicrotaskText('');
      onUpdate();
    }
  };

  const handleToggleMicrotask = async (microtaskId: string, currentState: boolean) => {
    const success = await toggleMicrotask(microtaskId, !currentState);
    if (success) {
      onUpdate();
    }
  };

  const handleStartEdit = (microtaskId: string, description: string) => {
    setEditingMicrotaskId(microtaskId);
    setEditingText(description);
  };

  const handleSaveEdit = async () => {
    if (!editingMicrotaskId || !editingText.trim()) return;

    const success = await updateMicrotask(editingMicrotaskId, editingText.trim());
    if (success) {
      setEditingMicrotaskId(null);
      setEditingText('');
      onUpdate();
    }
  };

  const handleDeleteMicrotask = async (microtaskId: string) => {
    const success = await deleteMicrotask(microtaskId);
    if (success) {
      onUpdate();
    }
  };

  const handleDeleteBlock = async () => {
    if (!confirm('Remove this block from your alignment?')) return;

    const success = await deleteBlock(block.id);
    if (success) {
      onUpdate();
    }
  };

  const handleChangeDuration = async (newDuration: number) => {
    const success = await updateBlock(block.id, { duration_minutes: newDuration });
    if (success) {
      setChangingDuration(false);
      onUpdate();
    }
  };

  const completedCount = block.microtasks.filter(m => m.is_completed).length;
  const totalCount = block.microtasks.length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{formatTime(block.start_time)}</span>
              {changingDuration ? (
                <div className="flex items-center gap-1">
                  {DURATION_OPTIONS.map(option => (
                    <button
                      key={option.minutes}
                      onClick={() => handleChangeDuration(option.minutes)}
                      className={`px-2 py-0.5 text-xs rounded ${
                        block.duration_minutes === option.minutes
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setChangingDuration(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 ml-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setChangingDuration(true)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {getDurationLabel(block.duration_minutes)}
                </button>
              )}
              <span className="text-xs text-gray-400 capitalize">({block.item_type})</span>
            </div>
            <h4 className="text-sm font-semibold text-gray-900">{block.item_title}</h4>

            {totalCount > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                {completedCount} of {totalCount} steps completed
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {block.microtasks.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleDeleteBlock}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Remove block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2">
            <div className="space-y-1.5">
              {block.microtasks.map((microtask) => (
                <div key={microtask.id} className="flex items-start gap-2 group">
                  <button
                    onClick={() => handleToggleMicrotask(microtask.id, microtask.is_completed)}
                    className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      microtask.is_completed
                        ? 'bg-green-500 border-green-500 animate-[pulse_0.3s_ease-in-out]'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {microtask.is_completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {editingMicrotaskId === microtask.id ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditingMicrotaskId(null);
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        onClick={() => handleStartEdit(microtask.id, microtask.description)}
                        className={`flex-1 text-sm cursor-pointer ${
                          microtask.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'
                        }`}
                      >
                        {microtask.description}
                      </span>
                      <button
                        onClick={() => handleDeleteMicrotask(microtask.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-600 rounded transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <input
                type="text"
                value={newMicrotaskText}
                onChange={(e) => setNewMicrotaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMicrotask()}
                placeholder="Add a step (optional)"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddMicrotask}
                disabled={!newMicrotaskText.trim()}
                className="p-1 text-blue-600 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed rounded"
                title="Add step"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
