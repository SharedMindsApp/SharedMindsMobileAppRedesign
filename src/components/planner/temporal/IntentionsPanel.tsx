/**
 * Intentions Panel
 * 
 * Lightweight panel for setting forward-looking intentions.
 * No tracking, no completion states, just optional planning notes.
 */

import { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';
import {
  getIntention,
  saveIntention,
  clearIntention,
  getScopeDate,
  type TemporalScope,
} from '../../../lib/planner/plannerIntentionsService';

interface IntentionsPanelProps {
  userId: string;
  scope: TemporalScope;
  scopeDate?: Date;
}

export function IntentionsPanel({ userId, scope, scopeDate = new Date() }: IntentionsPanelProps) {
  const [intention, setIntention] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const dateString = getScopeDate(scope, scopeDate);

  useEffect(() => {
    loadIntention();
  }, [userId, scope, dateString]);

  async function loadIntention() {
    try {
      setLoading(true);
      const existing = await getIntention(userId, scope, dateString);
      if (existing) {
        setIntention(existing.intention_text);
      } else {
        setIntention('');
      }
    } catch (error) {
      console.error('Error loading intention:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!intention.trim()) {
      // If empty, clear intention
      await handleClear();
      return;
    }

    try {
      await saveIntention(userId, scope, dateString, intention.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving intention:', error);
    }
  }

  async function handleClear() {
    try {
      await clearIntention(userId, scope, dateString);
      setIntention('');
      setIsEditing(false);
    } catch (error) {
      console.error('Error clearing intention:', error);
    }
  }

  if (loading) {
    return null; // Don't show anything while loading
  }

  // Empty state - show soft prompt to add intention
  if (!intention && !isEditing) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setIsEditing(true)}
          className="w-full text-left p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700">Today's intention</div>
              <div className="text-xs text-gray-500 mt-0.5">What would you like to focus on?</div>
            </div>
          </div>
        </button>
      </div>
    );
  }

  // Editing or displaying intention
  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="Focus on calm progress..."
                  className="w-full p-2 border border-blue-300 rounded-md bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      loadIntention();
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-medium text-blue-900 uppercase tracking-wide">Intention</div>
                <p className="text-sm text-gray-800 leading-relaxed">{intention}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-blue-700 hover:text-blue-900 font-medium"
                  >
                    Edit
                  </button>
                  <span className="text-blue-300">•</span>
                  <button
                    onClick={handleClear}
                    className="text-xs text-blue-700 hover:text-blue-900 font-medium"
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
