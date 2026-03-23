/**
 * Reflections Panel
 * 
 * Gentle reflection prompts for temporal views.
 * Narrative only, no comparisons, no metrics, no pressure.
 */

import { useState, useEffect } from 'react';
import { BookOpen, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getReflection,
  saveReflection,
  clearReflection,
  getScopeDate,
  getReflectionPrompt,
  type TemporalScope,
} from '../../../lib/planner/plannerIntentionsService';

interface ReflectionsPanelProps {
  userId: string;
  scope: TemporalScope;
  scopeDate?: Date;
}

export function ReflectionsPanel({ userId, scope, scopeDate = new Date() }: ReflectionsPanelProps) {
  const navigate = useNavigate();
  const [reflection, setReflection] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const dateString = getScopeDate(scope, scopeDate);
  const prompt = getReflectionPrompt(scope);

  useEffect(() => {
    loadReflection();
  }, [userId, scope, dateString]);

  async function loadReflection() {
    try {
      setLoading(true);
      const existing = await getReflection(userId, scope, dateString);
      if (existing) {
        setReflection(existing.reflection_text);
      } else {
        setReflection('');
      }
    } catch (error) {
      console.error('Error loading reflection:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!reflection.trim()) {
      // If empty, clear reflection
      await handleClear();
      return;
    }

    try {
      await saveReflection(userId, scope, dateString, reflection.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving reflection:', error);
    }
  }

  async function handleClear() {
    try {
      await clearReflection(userId, scope, dateString);
      setReflection('');
      setIsEditing(false);
    } catch (error) {
      console.error('Error clearing reflection:', error);
    }
  }

  if (loading) {
    return null; // Don't show anything while loading
  }

  // Empty state - show soft prompt
  if (!reflection && !isEditing) {
    return (
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={() => setIsEditing(true)}
          className="w-full text-left p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group"
        >
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 mb-1">{prompt}</div>
              <div className="text-xs text-gray-500">Optional reflection to inform your next planning cycle</div>
              <div className="text-xs text-blue-600 mt-2 hover:underline">
                For deeper journaling, visit Spaces →
              </div>
            </div>
          </div>
        </button>
      </div>
    );
  }

  // Editing or displaying reflection
  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700 mb-1">{prompt}</div>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Share what shifted, what mattered..."
                  className="w-full p-3 border border-gray-300 rounded-md bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
                  rows={4}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      loadReflection();
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700 mb-1">{prompt}</div>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{reflection}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Edit
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    onClick={handleClear}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
