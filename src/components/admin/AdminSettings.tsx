import { AdminLayout } from './AdminLayout';
import { Settings as SettingsIcon } from 'lucide-react';

export function AdminSettings() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Settings</h1>
          <p className="text-gray-600">Configure application settings and preferences</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <SettingsIcon className="mx-auto mb-4 text-gray-400" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Settings</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Configure system-wide settings, manage feature flags, and adjust application parameters.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
