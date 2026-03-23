import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, Coffee, Utensils } from 'lucide-react';
import type { DailyAlignmentSettings, BlockedTime } from '../../lib/regulation/dailyAlignmentTypes';
import { getAlignmentSettings, updateAlignmentSettings } from '../../lib/regulation/dailyAlignmentService';
import { BottomSheet } from '../shared/BottomSheet';
import { showToast } from '../Toast';

interface AlignmentSettingsModalProps {
  userId: string;
  onClose: () => void;
}

export function AlignmentSettingsModal({ userId, onClose }: AlignmentSettingsModalProps) {
  const [settings, setSettings] = useState<DailyAlignmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [initialSettingsJson, setInitialSettingsJson] = useState<string | null>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    setLoading(true);
    const data = await getAlignmentSettings(userId);
    setSettings(data);
    setInitialSettingsJson(JSON.stringify(data));
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    const success = await updateAlignmentSettings(userId, {
      work_start_time: settings.work_start_time,
      work_end_time: settings.work_end_time,
      lunch_break_start: settings.lunch_break_start,
      lunch_break_duration: settings.lunch_break_duration,
      enable_morning_break: settings.enable_morning_break,
      morning_break_start: settings.morning_break_start,
      morning_break_duration: settings.morning_break_duration,
      enable_afternoon_break: settings.enable_afternoon_break,
      afternoon_break_start: settings.afternoon_break_start,
      afternoon_break_duration: settings.afternoon_break_duration,
      blocked_times: settings.blocked_times,
    });

    setSaving(false);

    if (success) {
      onClose();
    }
  };

  const isDirty =
    !!settings && !!initialSettingsJson && JSON.stringify(settings) !== initialSettingsJson;

  const requestClose = () => {
    if (saving) return;
    if (isMobile && isDirty) {
      showToast('warning', 'You have unsaved changes. Save or tap Cancel to discard.');
      return;
    }
    onClose();
  };

  const addBlockedTime = () => {
    if (!settings) return;

    const newBlockedTime: BlockedTime = {
      start_time: '14:00:00',
      end_time: '15:00:00',
      label: 'Focus Time',
    };

    setSettings({
      ...settings,
      blocked_times: [...settings.blocked_times, newBlockedTime],
    });
  };

  const removeBlockedTime = (index: number) => {
    if (!settings) return;

    setSettings({
      ...settings,
      blocked_times: settings.blocked_times.filter((_, i) => i !== index),
    });
  };

  const updateBlockedTime = (index: number, field: keyof BlockedTime, value: string) => {
    if (!settings) return;

    const updated = [...settings.blocked_times];
    updated[index] = { ...updated[index], [field]: value };

    setSettings({
      ...settings,
      blocked_times: updated,
    });
  };

  if (loading || !settings) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full">
          <div className="text-center py-8 text-gray-500">Loading settings...</div>
        </div>
      </div>
    );
  }

  // Mobile: Bottom Sheet (Half-height 60vh per audit) + sticky footer
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={true}
        onClose={requestClose}
        header={<h2 className="text-lg font-semibold text-gray-900">Daily Alignment Settings</h2>}
        footer={
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all font-medium min-h-[44px]"
              disabled={saving}
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px]"
              type="button"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
        maxHeight="60vh"
        closeOnBackdrop={!saving && !isDirty}
        preventClose={saving || isDirty}
      >
        <div className="space-y-6">
          {/* Working Hours */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Working Hours</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={settings.work_start_time}
                  onChange={(e) => setSettings({ ...settings, work_start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={settings.work_end_time}
                  onChange={(e) => setSettings({ ...settings, work_end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Lunch Break */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-4">
              <Utensils className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">Lunch Break</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={settings.lunch_break_start || ''}
                  onChange={(e) => setSettings({ ...settings, lunch_break_start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="120"
                  step="15"
                  value={settings.lunch_break_duration}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lunch_break_duration: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Morning Break */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-semibold text-gray-900">Morning Break</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.enable_morning_break}
                  onChange={(e) =>
                    setSettings({ ...settings, enable_morning_break: e.target.checked })
                  }
                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Enable</span>
              </label>
            </div>

            {settings.enable_morning_break && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={settings.morning_break_start || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, morning_break_start: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    step="5"
                    value={settings.morning_break_duration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        morning_break_duration: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Afternoon Break */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-semibold text-gray-900">Afternoon Break</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.enable_afternoon_break}
                  onChange={(e) =>
                    setSettings({ ...settings, enable_afternoon_break: e.target.checked })
                  }
                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Enable</span>
              </label>
            </div>

            {settings.enable_afternoon_break && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={settings.afternoon_break_start || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, afternoon_break_start: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    step="5"
                    value={settings.afternoon_break_duration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        afternoon_break_duration: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Blocked Times */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Blocked Time Slots</h3>
              <button
                onClick={addBlockedTime}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors min-h-[44px]"
                type="button"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Block
              </button>
            </div>

            <div className="space-y-3">
              {settings.blocked_times.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No blocked times</p>
              ) : (
                settings.blocked_times.map((blocked, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg border border-red-200">
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Start</label>
                        <input
                          type="time"
                          value={blocked.start_time}
                          onChange={(e) => updateBlockedTime(index, 'start_time', e.target.value)}
                          className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">End</label>
                        <input
                          type="time"
                          value={blocked.end_time}
                          onChange={(e) => updateBlockedTime(index, 'end_time', e.target.value)}
                          className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => removeBlockedTime(index)}
                          className="w-full px-2 py-2 text-red-600 hover:bg-red-50 rounded transition-colors min-h-[44px]"
                          type="button"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={blocked.label}
                      onChange={(e) => updateBlockedTime(index, 'label', e.target.value)}
                      placeholder="Label (e.g., School pickup)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </BottomSheet>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Daily Alignment Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Working Hours */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Working Hours</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={settings.work_start_time}
                  onChange={(e) =>
                    setSettings({ ...settings, work_start_time: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={settings.work_end_time}
                  onChange={(e) =>
                    setSettings({ ...settings, work_end_time: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Lunch Break */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-4">
              <Utensils className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">Lunch Break</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={settings.lunch_break_start || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, lunch_break_start: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="120"
                  step="15"
                  value={settings.lunch_break_duration}
                  onChange={(e) =>
                    setSettings({ ...settings, lunch_break_duration: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Morning Break */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-semibold text-gray-900">Morning Break</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enable_morning_break}
                  onChange={(e) =>
                    setSettings({ ...settings, enable_morning_break: e.target.checked })
                  }
                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Enable</span>
              </label>
            </div>

            {settings.enable_morning_break && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.morning_break_start || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, morning_break_start: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    step="5"
                    value={settings.morning_break_duration}
                    onChange={(e) =>
                      setSettings({ ...settings, morning_break_duration: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Afternoon Break */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-semibold text-gray-900">Afternoon Break</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enable_afternoon_break}
                  onChange={(e) =>
                    setSettings({ ...settings, enable_afternoon_break: e.target.checked })
                  }
                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Enable</span>
              </label>
            </div>

            {settings.enable_afternoon_break && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.afternoon_break_start || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, afternoon_break_start: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    step="5"
                    value={settings.afternoon_break_duration}
                    onChange={(e) =>
                      setSettings({ ...settings, afternoon_break_duration: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Blocked Times */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Blocked Time Slots</h3>
              <button
                onClick={addBlockedTime}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Block
              </button>
            </div>

            <div className="space-y-3">
              {settings.blocked_times.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No blocked times</p>
              ) : (
                settings.blocked_times.map((blocked, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg border border-red-200">
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Start
                        </label>
                        <input
                          type="time"
                          value={blocked.start_time}
                          onChange={(e) =>
                            updateBlockedTime(index, 'start_time', e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          End
                        </label>
                        <input
                          type="time"
                          value={blocked.end_time}
                          onChange={(e) =>
                            updateBlockedTime(index, 'end_time', e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => removeBlockedTime(index)}
                          className="w-full px-2 py-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={blocked.label}
                      onChange={(e) =>
                        updateBlockedTime(index, 'label', e.target.value)
                      }
                      placeholder="Label (e.g., School pickup)"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
