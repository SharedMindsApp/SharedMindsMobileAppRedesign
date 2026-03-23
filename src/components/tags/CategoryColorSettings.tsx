/**
 * Category Color Settings Component
 * 
 * Allows users to customize color presets for each tag category.
 * Used in both ProfileSettings and PlannerSettings.
 */

import { useState, useEffect } from 'react';
import { Tag, Save, Loader2 } from 'lucide-react';
import {
  getCategoryColorSettings,
  updateCategoryColorSettings,
  DEFAULT_CATEGORY_COLORS,
  type CategoryType,
} from '../../lib/tags/categoryColorSettings';
import { ColorPicker } from './ColorPicker';
import { FEATURE_CONTEXT_TAGGING } from '../../lib/featureFlags';

interface CategoryColorSettingsProps {
  userId: string;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<CategoryType, string> = {
  goal: 'Goals',
  habit: 'Habits',
  project: 'Projects',
  trip: 'Trips',
  task: 'Tasks',
  meeting: 'Meetings',
  event: 'Events',
  track: 'Tracks',
  subtrack: 'Subtracks',
};

export function CategoryColorSettings({ userId, compact = false }: CategoryColorSettingsProps) {
  const [settings, setSettings] = useState<Partial<Record<CategoryType, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const currentSettings = await getCategoryColorSettings(userId);
      setSettings(currentSettings);
    } catch (err) {
      console.error('[CategoryColorSettings] Error loading settings:', err);
      setError('Failed to load category color settings');
      // Use defaults on error
      setSettings(DEFAULT_CATEGORY_COLORS);
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (category: CategoryType, color: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: color,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await updateCategoryColorSettings(userId, settings);
      setSuccess('Category colors updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('[CategoryColorSettings] Error saving settings:', err);
      setError(err.message || 'Failed to save category color settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_CATEGORY_COLORS);
  };

  if (!FEATURE_CONTEXT_TAGGING) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const categories: CategoryType[] = ['goal', 'habit', 'project', 'trip', 'task', 'meeting', 'event', 'track', 'subtrack'];

  return (
    <div className="space-y-4">
      <div>
        <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 mb-2 flex items-center gap-2`}>
          <Tag size={compact ? 18 : 20} />
          Tag Category Colors
        </h3>
        <p className="text-sm text-gray-600">
          Customize the default colors for tags in each category. These colors will be used when creating new tags.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="space-y-3">
        {categories.map(category => (
          <div
            key={category}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 min-w-[100px]">
                {CATEGORY_LABELS[category]}
              </span>
              <ColorPicker
                value={settings[category] || DEFAULT_CATEGORY_COLORS[category]}
                onChange={(color) => handleColorChange(category, color)}
                defaultColor={DEFAULT_CATEGORY_COLORS[category]}
                compact={compact}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Changes
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}






