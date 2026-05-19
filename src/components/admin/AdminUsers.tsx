import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Edit, AlertCircle, CheckCircle, UserRound, Mail } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getUsers, updateUserRole, type User } from '../../lib/admin';
import { useAuth } from '../../contexts/AuthContext';

// ── Helpers ─────────────────────────────────────────────────────

const WORK_TYPE_LABELS: Record<string, string> = {
  designer: 'Designer', developer: 'Developer', writer: 'Writer',
  founder: 'Founder', filmmaker: 'Filmmaker', marketer: 'Marketer',
  consultant: 'Consultant', researcher: 'Researcher', other: 'Other',
};

const ROLE_BADGE: Record<string, string> = {
  admin:   'bg-violet-100 text-violet-700',
  premium: 'bg-teal-100 text-teal-700',
  free:    'bg-gray-100 text-gray-700',
};

function avatarHashClass(name: string): string {
  const colors = [
    'bg-violet-200 text-violet-700',
    'bg-blue-200 text-blue-700',
    'bg-emerald-200 text-emerald-700',
    'bg-amber-200 text-amber-700',
    'bg-rose-200 text-rose-700',
    'bg-indigo-200 text-indigo-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function lastSeenLabel(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Page ────────────────────────────────────────────────────────

export function AdminUsers() {
  const { user: currentUser, refreshProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<'free' | 'premium' | 'admin'>('free');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers({ limit: 500 });
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filter for instant search-as-you-type
  const visibleUsers = useMemo(() => {
    let out = users;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      out = out.filter((u) =>
        (u.display_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q),
      );
    }
    if (roleFilter !== 'all') {
      out = out.filter((u) => u.role === roleFilter);
    }
    return out;
  }, [users, searchQuery, roleFilter]);

  const handleUpdateRole = async (userId: string) => {
    try {
      await updateUserRole(userId, newRole);
      setSuccessMessage(`Role updated to ${newRole}`);
      setEditingUser(null);
      await loadUsers();
      // If the admin updated their own role, refresh the auth context so the
      // sidebar badge updates without needing a page reload.
      if (currentUser && userId === currentUser.id) {
        await refreshProfile();
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">User management</h1>
            <p className="text-gray-600">View and manage all user accounts.</p>
          </div>
          <p className="text-sm text-gray-500 tabular-nums">
            {visibleUsers.length} of {users.length} users
          </p>
        </div>

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
            <CheckCircle className="text-emerald-600 shrink-0" size={20} />
            <p className="text-emerald-900 text-sm font-semibold">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-900 text-sm font-semibold">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 p-5 border-b border-gray-100">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All roles</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-16 text-gray-500 text-sm">Loading users…</div>
          ) : visibleUsers.length === 0 ? (
            <EmptyState hasFilter={searchQuery !== '' || roleFilter !== 'all'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                    <th className="text-left py-3 px-5 font-semibold">User</th>
                    <th className="text-left py-3 px-5 font-semibold">Email</th>
                    <th className="text-left py-3 px-5 font-semibold">Role</th>
                    <th className="text-left py-3 px-5 font-semibold">Work types</th>
                    <th className="text-left py-3 px-5 font-semibold">Last seen</th>
                    <th className="text-left py-3 px-5 font-semibold">Joined</th>
                    <th className="text-right py-3 px-5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => {
                    const name = user.display_name ?? '(no name)';
                    const isEditing = editingUser === user.id;
                    return (
                      <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">

                        {/* User cell — avatar + name */}
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3 min-w-0">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={name}
                                className="w-8 h-8 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className={`w-8 h-8 rounded-lg ${avatarHashClass(name)} flex items-center justify-center font-bold text-sm shrink-0`}>
                                {name === '(no name)'
                                  ? <UserRound size={14} />
                                  : name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{name}</p>
                              {!user.onboarding_completed && (
                                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                                  Onboarding incomplete
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-5">
                          {user.email ? (
                            <a
                              href={`mailto:${user.email}`}
                              className="flex items-center gap-1.5 text-gray-700 hover:text-blue-600 truncate"
                            >
                              <Mail size={12} className="text-gray-400 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">unknown</span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="py-3 px-5">
                          {isEditing ? (
                            <select
                              value={newRole}
                              onChange={(e) => setNewRole(e.target.value as 'free' | 'premium' | 'admin')}
                              className="px-2.5 py-1 border border-gray-300 rounded text-xs"
                            >
                              <option value="free">Free</option>
                              <option value="premium">Premium</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGE[user.role] ?? ROLE_BADGE.free}`}>
                              {user.role}
                            </span>
                          )}
                        </td>

                        {/* Work types */}
                        <td className="py-3 px-5">
                          <div className="flex flex-wrap gap-1">
                            {(user.work_types ?? []).slice(0, 2).map((wt) => (
                              <span key={wt} className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold">
                                {WORK_TYPE_LABELS[wt] ?? wt}
                              </span>
                            ))}
                            {(user.work_types ?? []).length > 2 && (
                              <span className="text-[10px] text-gray-400 font-bold">+{(user.work_types ?? []).length - 2}</span>
                            )}
                            {(user.work_types ?? []).length === 0 && (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>
                        </td>

                        {/* Last seen */}
                        <td className="py-3 px-5 text-gray-600 text-xs">
                          {lastSeenLabel(user.last_sign_in_at)}
                        </td>

                        {/* Joined */}
                        <td className="py-3 px-5 text-gray-600 text-xs">
                          {new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-5 text-right">
                          {isEditing ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleUpdateRole(user.id)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingUser(user.id);
                                setNewRole(user.role);
                              }}
                              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-semibold"
                            >
                              <Edit size={12} />
                              Edit role
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="text-center py-16 px-5">
      <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 flex items-center justify-center mb-3">
        <UserRound size={20} className="text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-1">
        {hasFilter ? 'No users match these filters' : 'No users yet'}
      </p>
      <p className="text-xs text-gray-500">
        {hasFilter ? 'Try clearing the search or role filter.' : 'Once people sign up, they\'ll appear here.'}
      </p>
    </div>
  );
}
