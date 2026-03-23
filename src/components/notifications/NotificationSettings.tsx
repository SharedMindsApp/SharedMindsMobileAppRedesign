/**
 * Notification Settings
 * 
 * User-facing notification preferences.
 * Allows control over notification categories and push notifications.
 */

import { useState, useEffect } from 'react';
import { Bell, Smartphone, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../lib/notifications';
import {
  isPushSupported,
  getPushPermission,
  requestPushPermission,
  registerPushNotification,
  unregisterPushNotification,
} from '../../lib/pushNotificationService';
import type { NotificationPreferences } from '../../lib/notificationTypes';

export function NotificationSettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pushSupported = isPushSupported();
  const [pushPermission, setPushPermission] = useState(getPushPermission());

  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const prefs = await getNotificationPreferences(user.id);

      if (!prefs) {
        // Create default preferences with only base columns (always safe)
        // Extended columns will be added by updateNotificationPreferences if they exist
        const defaultPrefs: Partial<NotificationPreferences> = {
          notifications_enabled: true,
          push_enabled: false,
          do_not_disturb: false,
          calendar_reminders: true,
          guardrails_updates: true,
          planner_alerts: true,
          system_messages: true,
          calendar_reminders_push: false,
          guardrails_updates_push: false,
          planner_alerts_push: false,
          system_messages_push: false,
          // Extended columns (will be filtered if they don't exist)
          tracker_reminders: false,
          habit_reminders: false,
          sleep_reminders: false,
          routine_reminders: false,
          tracker_reminders_push: false,
          habit_reminders_push: false,
          sleep_reminders_push: false,
          routine_reminders_push: false,
        };
        
        const created = await updateNotificationPreferences(user.id, defaultPrefs);
        // Ensure extended columns have defaults if they weren't returned
        setPreferences({
          ...created,
          tracker_reminders: created.tracker_reminders ?? false,
          habit_reminders: created.habit_reminders ?? false,
          sleep_reminders: created.sleep_reminders ?? false,
          routine_reminders: created.routine_reminders ?? false,
          tracker_reminders_push: created.tracker_reminders_push ?? false,
          habit_reminders_push: created.habit_reminders_push ?? false,
          sleep_reminders_push: created.sleep_reminders_push ?? false,
          routine_reminders_push: created.routine_reminders_push ?? false,
        });
      } else {
        setPreferences(prefs);
      }
    } catch (err) {
      console.error('[NotificationSettings] Error loading preferences:', err);
      setError('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreference = async (updates: Partial<NotificationPreferences>) => {
    if (!user?.id || !preferences) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updated = await updateNotificationPreferences(user.id, updates);
      setPreferences(updated);
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('[NotificationSettings] Error updating preferences:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePush = async () => {
    if (!pushSupported) {
      setError('Push notifications are not supported on this device');
      return;
    }

    try {
      setError(null);
      const permission = await requestPushPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        await registerPushNotification(user!.id);
        await handleUpdatePreference({ push_enabled: true });
        setSuccess('Push notifications enabled');
      } else if (permission === 'denied') {
        setError('Push notifications were denied. Please enable them in your browser settings.');
      }
    } catch (err) {
      console.error('[NotificationSettings] Error enabling push:', err);
      setError('Failed to enable push notifications');
    }
  };

  const handleDisablePush = async () => {
    try {
      setError(null);
      await unregisterPushNotification();
      await handleUpdatePreference({ push_enabled: false });
      setSuccess('Push notifications disabled');
    } catch (err) {
      console.error('[NotificationSettings] Error disabling push:', err);
      setError('Failed to disable push notifications');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading notification settings...</p>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load notification settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Settings</h2>
        <p className="text-sm text-gray-600 mb-6">
          Control what notifications you receive and how you receive them
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Global Toggles */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Global Settings</h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">Enable Notifications</p>
              <p className="text-sm text-gray-600">Receive notifications in the app</p>
            </div>
          </div>
          <button
            onClick={() =>
              handleUpdatePreference({ notifications_enabled: !preferences.notifications_enabled })
            }
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.notifications_enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {pushSupported && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-600">Receive notifications even when app is closed</p>
                {pushPermission === 'denied' && (
                  <p className="text-xs text-red-600 mt-1">
                    Push notifications blocked. Enable in browser settings.
                  </p>
                )}
              </div>
            </div>
            {preferences.push_enabled ? (
              <button
                onClick={handleDisablePush}
                disabled={saving}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Disable
              </button>
            ) : (
              <button
                onClick={handleEnablePush}
                disabled={saving || pushPermission === 'denied'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Enable
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {preferences.do_not_disturb ? (
              <VolumeX className="w-5 h-5 text-gray-600" />
            ) : (
              <Volume2 className="w-5 h-5 text-gray-600" />
            )}
            <div>
              <p className="font-medium text-gray-900">Do Not Disturb</p>
              <p className="text-sm text-gray-600">Temporarily pause all notifications</p>
            </div>
          </div>
          <button
            onClick={() => handleUpdatePreference({ do_not_disturb: !preferences.do_not_disturb })}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.do_not_disturb ? 'bg-orange-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.do_not_disturb ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Category Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Notification Categories</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose which types of notifications you want to receive
        </p>

        {/* Calendar Reminders */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-gray-900">Calendar Reminders</p>
              <p className="text-sm text-gray-600">Upcoming events and schedule changes</p>
            </div>
            <button
              onClick={() =>
                handleUpdatePreference({ calendar_reminders: !preferences.calendar_reminders })
              }
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.calendar_reminders ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.calendar_reminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {preferences.push_enabled && (
            <div className="ml-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">Also send as push notification</p>
              <button
                onClick={() =>
                  handleUpdatePreference({
                    calendar_reminders_push: !preferences.calendar_reminders_push,
                  })
                }
                disabled={saving || !preferences.calendar_reminders}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  preferences.calendar_reminders_push && preferences.calendar_reminders
                    ? 'bg-purple-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    preferences.calendar_reminders_push && preferences.calendar_reminders
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Guardrails Updates */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-gray-900">Guardrails Updates</p>
              <p className="text-sm text-gray-600">Project progress and task updates</p>
            </div>
            <button
              onClick={() =>
                handleUpdatePreference({ guardrails_updates: !preferences.guardrails_updates })
              }
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.guardrails_updates ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.guardrails_updates ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {preferences.push_enabled && (
            <div className="ml-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">Also send as push notification</p>
              <button
                onClick={() =>
                  handleUpdatePreference({
                    guardrails_updates_push: !preferences.guardrails_updates_push,
                  })
                }
                disabled={saving || !preferences.guardrails_updates}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  preferences.guardrails_updates_push && preferences.guardrails_updates
                    ? 'bg-purple-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    preferences.guardrails_updates_push && preferences.guardrails_updates
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Planner Alerts */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-gray-900">Planner Alerts</p>
              <p className="text-sm text-gray-600">Reminders for tasks and planning activities</p>
            </div>
            <button
              onClick={() => handleUpdatePreference({ planner_alerts: !preferences.planner_alerts })}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.planner_alerts ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.planner_alerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {preferences.push_enabled && (
            <div className="ml-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">Also send as push notification</p>
              <button
                onClick={() =>
                  handleUpdatePreference({ planner_alerts_push: !preferences.planner_alerts_push })
                }
                disabled={saving || !preferences.planner_alerts}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  preferences.planner_alerts_push && preferences.planner_alerts
                    ? 'bg-purple-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    preferences.planner_alerts_push && preferences.planner_alerts
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* System Messages */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-gray-900">System Messages</p>
              <p className="text-sm text-gray-600">Important updates and announcements</p>
            </div>
            <button
              onClick={() => handleUpdatePreference({ system_messages: !preferences.system_messages })}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.system_messages ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.system_messages ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {preferences.push_enabled && (
            <div className="ml-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">Also send as push notification</p>
              <button
                onClick={() =>
                  handleUpdatePreference({ system_messages_push: !preferences.system_messages_push })
                }
                disabled={saving || !preferences.system_messages}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  preferences.system_messages_push && preferences.system_messages
                    ? 'bg-purple-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    preferences.system_messages_push && preferences.system_messages
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Tracker Reminders */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-gray-900">Tracker Reminders</p>
              <p className="text-sm text-gray-600">Reminders to log tracker entries and missed actions</p>
            </div>
            <button
              onClick={() => handleUpdatePreference({ tracker_reminders: !preferences.tracker_reminders })}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.tracker_reminders ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.tracker_reminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {preferences.push_enabled && (
            <div className="ml-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">Also send as push notification</p>
              <button
                onClick={() =>
                  handleUpdatePreference({ tracker_reminders_push: !preferences.tracker_reminders_push })
                }
                disabled={saving || !preferences.tracker_reminders}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  preferences.tracker_reminders_push && preferences.tracker_reminders
                    ? 'bg-purple-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    preferences.tracker_reminders_push && preferences.tracker_reminders
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Habit Reminders */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-gray-900">Habit Reminders</p>
              <p className="text-sm text-gray-600">Reminders to complete habits and streak updates</p>
            </div>
            <button
              onClick={() => handleUpdatePreference({ habit_reminders: !preferences.habit_reminders })}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.habit_reminders ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.habit_reminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {preferences.push_enabled && (
            <div className="ml-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">Also send as push notification</p>
              <button
                onClick={() =>
                  handleUpdatePreference({ habit_reminders_push: !preferences.habit_reminders_push })
                }
                disabled={saving || !preferences.habit_reminders}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  preferences.habit_reminders_push && preferences.habit_reminders
                    ? 'bg-purple-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    preferences.habit_reminders_push && preferences.habit_reminders
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Sleep Reminders */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-gray-900">Sleep Reminders</p>
              <p className="text-sm text-gray-600">Bedtime reminders and sleep summaries</p>
            </div>
            <button
              onClick={() => handleUpdatePreference({ sleep_reminders: !preferences.sleep_reminders })}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.sleep_reminders ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.sleep_reminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {preferences.push_enabled && (
            <div className="ml-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">Also send as push notification</p>
              <button
                onClick={() =>
                  handleUpdatePreference({ sleep_reminders_push: !preferences.sleep_reminders_push })
                }
                disabled={saving || !preferences.sleep_reminders}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  preferences.sleep_reminders_push && preferences.sleep_reminders
                    ? 'bg-purple-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    preferences.sleep_reminders_push && preferences.sleep_reminders
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Routine Reminders */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-gray-900">Routine Reminders</p>
              <p className="text-sm text-gray-600">Reminders for routine start and completion</p>
            </div>
            <button
              onClick={() => handleUpdatePreference({ routine_reminders: !preferences.routine_reminders })}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.routine_reminders ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.routine_reminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {preferences.push_enabled && (
            <div className="ml-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">Also send as push notification</p>
              <button
                onClick={() =>
                  handleUpdatePreference({ routine_reminders_push: !preferences.routine_reminders_push })
                }
                disabled={saving || !preferences.routine_reminders}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  preferences.routine_reminders_push && preferences.routine_reminders
                    ? 'bg-purple-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    preferences.routine_reminders_push && preferences.routine_reminders
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Explainability */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">About Notifications</h4>
        <p className="text-sm text-blue-800 mb-3">
          Notifications are always opt-in. Creating a tracker, habit, or reminder does not automatically enable notifications. You control what you receive and how you receive it.
        </p>
        <p className="text-sm text-blue-800">
          <strong>Important:</strong> Features may suggest notification options, but notifications are only sent if you explicitly enable them here. You can change these settings at any time.
        </p>
      </div>
    </div>
  );
}
