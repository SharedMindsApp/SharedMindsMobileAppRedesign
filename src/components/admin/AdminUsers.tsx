import { useEffect, useState } from 'react';
import { Search, Filter, Edit, AlertCircle, CheckCircle, Brain } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getUsers, updateUserRole, updateUserNeurotype, User } from '../../lib/admin';
import { supabase } from '../../lib/supabase';
import { NeurotypeProfile } from '../../lib/uiPreferencesTypes';

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingNeurotype, setEditingNeurotype] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<'free' | 'premium' | 'admin'>('free');
  const [newNeurotypeId, setNewNeurotypeId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [neurotypeProfiles, setNeurotypeProfiles] = useState<NeurotypeProfile[]>([]);

  useEffect(() => {
    loadUsers();
    loadNeurotypeProfiles();
  }, [searchQuery, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers({
        search: searchQuery || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        limit: 100,
      });
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadNeurotypeProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('neurotype_profiles')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      setNeurotypeProfiles(data || []);
    } catch (err) {
      console.error('Failed to load neurotype profiles:', err);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    try {
      const memberLimit = newRole === 'free' ? 2 : newRole === 'premium' ? 4 : undefined;
      await updateUserRole(userId, newRole, memberLimit);
      setSuccessMessage(`User role updated to ${newRole}`);
      setEditingUser(null);
      await loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  const handleUpdateNeurotype = async (userId: string) => {
    try {
      if (!newNeurotypeId) {
        setError('Please select a neurotype');
        return;
      }
      await updateUserNeurotype(userId, newNeurotypeId);
      const selectedProfile = neurotypeProfiles.find(p => p.id === newNeurotypeId);
      setSuccessMessage(`Neurotype updated to ${selectedProfile?.display_name || 'selected profile'}`);
      setEditingNeurotype(null);
      await loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user neurotype');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-violet-100 text-violet-700';
      case 'premium':
        return 'bg-teal-100 text-teal-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getNeurotypeBadgeColor = (neurotype: string | undefined) => {
    switch (neurotype) {
      case 'adhd':
        return 'bg-orange-100 text-orange-700';
      case 'autism':
        return 'bg-blue-100 text-blue-700';
      case 'anxiety':
        return 'bg-purple-100 text-purple-700';
      case 'dyslexia':
        return 'bg-green-100 text-green-700';
      case 'neurotypical':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">View and manage all user accounts</p>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="text-green-600" size={24} />
            <p className="text-green-900">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Neurotype UI</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{user.full_name}</span>
                          {user.neurotype && user.neurotype !== 'neurotypical' && (
                            <Brain size={16} className="text-blue-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{user.email}</td>
                      <td className="py-3 px-4">
                        {editingUser === user.user_id ? (
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as 'free' | 'premium' | 'admin')}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="free">Free</option>
                            <option value="premium">Premium</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                            {user.role.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingNeurotype === user.user_id ? (
                          <select
                            value={newNeurotypeId}
                            onChange={(e) => setNewNeurotypeId(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm w-full"
                          >
                            <option value="">Select Neurotype</option>
                            {neurotypeProfiles.map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.display_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getNeurotypeBadgeColor(user.neurotype)}`}>
                              {user.neurotype_display_name || 'Neurotypical'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-2">
                          {editingUser === user.user_id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateRole(user.user_id)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingUser(user.user_id);
                                setNewRole(user.role);
                              }}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                            >
                              <Edit size={14} />
                              <span>Edit Role</span>
                            </button>
                          )}
                          {editingNeurotype === user.user_id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateNeurotype(user.user_id)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingNeurotype(null)}
                                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingNeurotype(user.user_id);
                                const currentProfile = neurotypeProfiles.find(
                                  p => p.name === user.neurotype
                                );
                                setNewNeurotypeId(currentProfile?.id || '');
                              }}
                              className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm"
                            >
                              <Brain size={14} />
                              <span>Edit Neurotype</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
