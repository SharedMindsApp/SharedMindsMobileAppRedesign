/**
 * App Settings Modal
 * 
 * Configure monitoring, notifications, and lockout rules for a specific app.
 */

import { useState } from 'react';
import { X, TrendingUp, Bell, Lock, Save, Smartphone } from 'lucide-react';
import type { InstalledApp, AppRule } from '../ScreenTimeAppView';

interface AppSettingsModalProps {
  app: InstalledApp;
  existingRule?: AppRule;
  onSave: (rule: AppRule) => void;
  onClose: () => void;
}

export function AppSettingsModal({
  app,
  existingRule,
  onSave,
  onClose,
}: AppSettingsModalProps) {
  const [monitorUsage, setMonitorUsage] = useState(existingRule?.monitorUsage ?? false);
  
  // Notification settings
  const [notificationEnabled, setNotificationEnabled] = useState(existingRule?.notificationRule?.enabled ?? false);
  const [notificationTrigger, setNotificationTrigger] = useState<'visit_count' | 'time_limit' | 'daily_total'>(
    existingRule?.notificationRule?.trigger ?? 'visit_count'
  );
  const [notificationThreshold, setNotificationThreshold] = useState(
    existingRule?.notificationRule?.threshold ?? 5
  );
  const [notificationMessage, setNotificationMessage] = useState(
    existingRule?.notificationRule?.message ?? `You've used ${app.name} ${existingRule?.notificationRule?.threshold || 5} times today.`
  );

  // Lockout settings
  const [lockoutEnabled, setLockoutEnabled] = useState(existingRule?.lockoutRule?.enabled ?? false);
  const [lockoutTrigger, setLockoutTrigger] = useState<'visit_count_per_hour' | 'daily_time_limit' | 'schedule'>(
    existingRule?.lockoutRule?.trigger ?? 'visit_count_per_hour'
  );
  const [lockoutThreshold, setLockoutThreshold] = useState(
    existingRule?.lockoutRule?.threshold ?? 3
  );
  const [lockoutDuration, setLockoutDuration] = useState(
    existingRule?.lockoutRule?.duration ?? 15
  );
  const [lockoutCooldown, setLockoutCooldown] = useState(
    existingRule?.lockoutRule?.cooldown ?? 0
  );

  const handleSave = () => {
    const rule: AppRule = {
      appId: app.id,
      monitorUsage,
      notificationRule: notificationEnabled ? {
        enabled: true,
        trigger: notificationTrigger,
        threshold: notificationThreshold,
        message: notificationMessage,
      } : undefined,
      lockoutRule: lockoutEnabled ? {
        enabled: true,
        trigger: lockoutTrigger,
        threshold: lockoutThreshold,
        duration: lockoutDuration,
        cooldown: lockoutCooldown > 0 ? lockoutCooldown : undefined,
      } : undefined,
    };

    onSave(rule);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {app.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{app.name}</h2>
              <p className="text-sm text-gray-600">Configure monitoring and blocking rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Monitor Usage */}
          <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                <TrendingUp className="text-indigo-600" size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Monitor Usage</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={monitorUsage}
                      onChange={(e) => setMonitorUsage(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  Track how much time you spend using {app.name} and view usage statistics.
                </p>
              </div>
            </div>
          </div>

          {/* Notification Rules */}
          <div className="p-5 bg-blue-50 rounded-xl border-2 border-blue-200">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Bell className="text-blue-600" size={24} />
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
                    <p className="text-sm text-gray-600">Get notified when usage reaches certain thresholds</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationEnabled}
                      onChange={(e) => setNotificationEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {notificationEnabled && (
                  <div className="space-y-4 pl-14">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Trigger When
                      </label>
                      <select
                        value={notificationTrigger}
                        onChange={(e) => setNotificationTrigger(e.target.value as any)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      >
                        <option value="visit_count">After N visits in one day</option>
                        <option value="time_limit">After N minutes of use</option>
                        <option value="daily_total">Daily total reaches N minutes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {notificationTrigger === 'visit_count' 
                          ? 'Number of Visits'
                          : notificationTrigger === 'time_limit'
                          ? 'Minutes of Use'
                          : 'Daily Total (minutes)'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={notificationThreshold}
                        onChange={(e) => setNotificationThreshold(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                      {notificationTrigger === 'visit_count' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Example: "You've used {app.name} {notificationThreshold} times today."
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notification Message (optional)
                      </label>
                      <textarea
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                        rows={2}
                        placeholder={`Custom message when notification is triggered...`}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lockout Rules */}
          <div className="p-5 bg-red-50 rounded-xl border-2 border-red-200">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <Lock className="text-red-600" size={24} />
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Lock App</h3>
                    <p className="text-sm text-gray-600">Block access to {app.name} based on usage patterns</p>
                    <p className="text-xs text-amber-700 mt-1 font-medium">
                      ⚠️ Requires native app connection for full functionality
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockoutEnabled}
                      onChange={(e) => setLockoutEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                {lockoutEnabled && (
                  <div className="space-y-4 pl-14">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lock When
                      </label>
                      <select
                        value={lockoutTrigger}
                        onChange={(e) => setLockoutTrigger(e.target.value as any)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                      >
                        <option value="visit_count_per_hour">After N visits per hour</option>
                        <option value="daily_time_limit">Daily time limit reached</option>
                        <option value="schedule">During scheduled time</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {lockoutTrigger === 'visit_count_per_hour'
                          ? 'Visits per Hour'
                          : lockoutTrigger === 'daily_time_limit'
                          ? 'Daily Time Limit (minutes)'
                          : 'Start Time'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={lockoutThreshold}
                        onChange={(e) => setLockoutThreshold(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                      />
                      {lockoutTrigger === 'visit_count_per_hour' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Example: Lock after {lockoutThreshold} visits within 1 hour
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lockout Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        value={lockoutDuration}
                        onChange={(e) => setLockoutDuration(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        How long the app will be locked after trigger
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cooldown Period (minutes, optional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={lockoutCooldown}
                        onChange={(e) => setLockoutCooldown(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                        placeholder="0 = no cooldown"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Wait time before app can be unlocked after lockout ends
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            <Save size={18} />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
