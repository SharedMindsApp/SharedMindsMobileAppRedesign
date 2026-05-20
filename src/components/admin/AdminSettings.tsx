import { useEffect, useState, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Users,
  ToggleLeft,
  ToggleRight,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronRight,
  UserCog,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../core/auth/AuthProvider';
import {
  getAppConfig,
  setAppConfig,
  getUsers,
  updateUserRole,
  AppConfig,
  User,
} from '../../lib/admin';

// ---------------------------------------------------------------------------
// Toggle row
// ---------------------------------------------------------------------------
interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  saving: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}

function ToggleRow({ label, description, checked, saving, onChange, danger }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 min-w-0 pr-8">
        <p className={`text-sm font-medium ${danger ? 'text-red-700' : 'text-gray-900'}`}>
          {label}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={saving}
        className="flex-shrink-0 flex items-center gap-1.5 disabled:opacity-60"
        aria-label={checked ? 'Disable' : 'Enable'}
      >
        {saving ? (
          <Loader2 size={24} className="animate-spin text-gray-400" />
        ) : checked ? (
          <ToggleRight size={32} className={danger ? 'text-red-500' : 'text-blue-600'} />
        ) : (
          <ToggleLeft size={32} className="text-gray-300" />
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin user row
// ---------------------------------------------------------------------------
function AdminUserRow({ user, currentUserId, onDemote }: {
  user: User;
  currentUserId: string;
  onDemote: (id: string) => void;
}) {
  const isSelf = user.id === currentUserId;
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <span className="text-white text-sm font-semibold">
            {(user.display_name ?? 'A')[0].toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user.display_name ?? 'Unnamed'}
          {isSelf && <span className="ml-1.5 text-xs text-gray-400">(you)</span>}
        </p>
        <p className="text-xs text-gray-500 truncate">{user.email ?? '—'}</p>
      </div>
      {!isSelf && (
        <button
          onClick={() => onDemote(user.id)}
          className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-2.5 py-1 rounded-lg transition-colors"
        >
          Remove admin
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function AdminSettings() {
  const { profile } = useAuth();
  const currentUserId = profile?.id ?? '';

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const [defaultMinutes, setDefaultMinutes] = useState<string>('45');
  const [savingMinutes, setSavingMinutes] = useState(false);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, { users }] = await Promise.all([
        getAppConfig(),
        getUsers({ role: 'admin' }),
      ]);
      setConfig(cfg);
      setDefaultMinutes(String(cfg.default_session_minutes));
      setAdmins(users);
    } catch {
      showToast('err', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (key: 'signups_open' | 'maintenance_mode', value: boolean) => {
    if (!config) return;
    setSavingKey(key);
    const prev = { ...config };
    setConfig({ ...config, [key]: value });
    try {
      await setAppConfig(key, value, currentUserId);
      showToast('ok', 'Saved');
    } catch {
      setConfig(prev);
      showToast('err', 'Failed to save');
    } finally {
      setSavingKey(null);
    }
  };

  const saveMinutes = async () => {
    const val = parseInt(defaultMinutes, 10);
    if (isNaN(val) || val < 5 || val > 240) {
      showToast('err', 'Enter a value between 5 and 240 minutes');
      return;
    }
    setSavingMinutes(true);
    try {
      await setAppConfig('default_session_minutes', val, currentUserId);
      setConfig((c) => c ? { ...c, default_session_minutes: val } : c);
      showToast('ok', 'Saved');
    } catch {
      showToast('err', 'Failed to save');
    } finally {
      setSavingMinutes(false);
    }
  };

  const demoteAdmin = async (userId: string) => {
    if (!confirm('Remove admin role from this user?')) return;
    try {
      await updateUserRole(userId, 'free');
      setAdmins((prev) => prev.filter((u) => u.id !== userId));
      showToast('ok', 'Admin role removed');
    } catch {
      showToast('err', 'Failed to update role');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">System Settings</h1>
          <p className="text-gray-500 text-sm">
            Global platform controls — changes take effect immediately.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
            ${toast.type === 'ok'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'}`}
          >
            {toast.type === 'ok'
              ? <CheckCircle size={16} />
              : <AlertTriangle size={16} />}
            {toast.msg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-gray-500 py-8">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading settings…</span>
          </div>
        ) : (
          <>
            {/* Platform Status */}
            <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center gap-2">
                <SettingsIcon size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Platform Status
                </h2>
              </div>
              <div className="px-6">
                <ToggleRow
                  label="New signups open"
                  description="When off, the sign-up form shows a waitlist message and no new accounts can be created."
                  checked={config?.signups_open ?? true}
                  saving={savingKey === 'signups_open'}
                  onChange={(v) => toggle('signups_open', v)}
                />
              </div>
              <div className="px-6">
                <ToggleRow
                  label="Maintenance mode"
                  description="Shows a maintenance banner to all non-admin users. Admins can still access the full app."
                  checked={config?.maintenance_mode ?? false}
                  saving={savingKey === 'maintenance_mode'}
                  onChange={(v) => toggle('maintenance_mode', v)}
                  danger={config?.maintenance_mode}
                />
              </div>
            </section>

            {/* Session defaults */}
            <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Session Defaults
                </h2>
              </div>
              <div className="px-6 py-4">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Default session duration (minutes)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Pre-fills the duration picker when a user opens the Declare Session modal.
                  Members can always change it. Must be between 5 and 240.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={defaultMinutes}
                    onChange={(e) => setDefaultMinutes(e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={saveMinutes}
                    disabled={savingMinutes}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                      hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition-colors"
                  >
                    {savingMinutes && <Loader2 size={14} className="animate-spin" />}
                    Save
                  </button>
                </div>
              </div>
            </section>

            {/* Admin users */}
            <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Admin Users
                  </h2>
                  <span className="ml-1 text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">
                    {admins.length}
                  </span>
                </div>
                <Link
                  to="/admin/users"
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Promote a user <ChevronRight size={12} />
                </Link>
              </div>
              <div className="px-6 divide-y divide-gray-50">
                {admins.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">No admin users found.</p>
                ) : (
                  admins.map((user) => (
                    <AdminUserRow
                      key={user.id}
                      user={user}
                      currentUserId={currentUserId}
                      onDemote={demoteAdmin}
                    />
                  ))
                )}
              </div>
              <div className="px-6 py-3 bg-gray-50 rounded-b-xl">
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <UserCog size={12} />
                  To promote a user to admin, open their profile in the{' '}
                  <Link to="/admin/users" className="text-blue-600 hover:underline">
                    Users
                  </Link>{' '}
                  tab and change their role.
                </p>
              </div>
            </section>

            {/* Quick links */}
            <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Quick Links
                </h2>
              </div>
              {[
                { to: '/admin/users',               label: 'Manage users & roles' },
                { to: '/admin/recurring-sessions',  label: 'Recurring session templates' },
                { to: '/admin/analytics',           label: 'Platform analytics' },
                { to: '/admin/logs',                label: 'Activity logs' },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50
                    transition-colors group"
                >
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </Link>
              ))}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
