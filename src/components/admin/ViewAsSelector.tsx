import { useState, useEffect } from 'react';
import { Eye, X, User, Shield, Brain } from 'lucide-react';
import { useViewAs } from '../../contexts/ViewAsContext';
import { supabase } from '../../lib/supabase';
import type { UserRole } from '../../contexts/AuthContext';
import type { NeurotypeProfile } from '../../lib/uiPreferencesTypes';

interface UserOption {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
}

export function ViewAsSelector() {
  const { viewAsProfile, isViewingAs, viewAsNeurotype, setViewAsUser, setViewAsRole, setViewAsNeurotype, clearViewAs } = useViewAs();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [neurotypeProfiles, setNeurotypeProfiles] = useState<NeurotypeProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadUsers();
    loadNeurotypeProfiles();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
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
    } catch (error) {
      console.error('Error loading neurotype profiles:', error);
    }
  };

  const handleSelectUser = async (userId: string) => {
    await setViewAsUser(userId);
    setShowDropdown(false);
  };

  const handleSelectRole = (role: UserRole) => {
    setViewAsRole(role);
    setShowDropdown(false);
  };

  const handleSelectNeurotype = (neurotypeName: string) => {
    setViewAsNeurotype(neurotypeName);
    setShowDropdown(false);
  };

  const handleClearNeurotype = () => {
    setViewAsNeurotype(null);
    setShowDropdown(false);
  };

  const roles: UserRole[] = ['free', 'premium', 'admin'];

  const neurotypeColors: Record<string, string> = {
    neurotypical: 'bg-gray-100 text-gray-800',
    adhd: 'bg-blue-100 text-blue-800',
    autism: 'bg-purple-100 text-purple-800',
    dyslexia: 'bg-green-100 text-green-800',
    anxiety: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="relative">
      {(isViewingAs || viewAsNeurotype) && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye size={20} className="text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Viewing As</p>
                {viewAsProfile && (
                  <>
                    <p className="text-sm text-amber-700">{viewAsProfile.full_name}</p>
                    <p className="text-xs text-amber-600 uppercase">{viewAsProfile.role}</p>
                  </>
                )}
                {viewAsNeurotype && (
                  <p className="text-sm text-amber-700 flex items-center gap-1">
                    <Brain size={14} />
                    {viewAsNeurotype}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={clearViewAs}
              className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
              title="Exit view-as mode"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Eye size={20} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">View As User/Role</span>
        </button>

        {showDropdown && (
          <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-auto">
            <div className="p-3 border-b border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                <Shield size={14} />
                View as Role
              </h4>
            </div>
            <div className="p-2">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => handleSelectRole(role)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded transition-colors flex items-center justify-between"
                >
                  <span className="capitalize">{role}</span>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded uppercase">
                    {role}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                <Brain size={14} />
                View as Neurotype
              </h4>
            </div>
            <div className="p-2">
              {viewAsNeurotype && (
                <button
                  onClick={handleClearNeurotype}
                  className="w-full text-left px-3 py-2 mb-2 text-sm bg-red-50 hover:bg-red-100 rounded transition-colors flex items-center justify-between"
                >
                  <span className="text-red-700 font-medium">Clear Neurotype Override</span>
                  <X size={16} className="text-red-600" />
                </button>
              )}
              {neurotypeProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelectNeurotype(profile.name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Brain size={16} className="text-gray-600" />
                    <span>{profile.display_name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${neurotypeColors[profile.name] || 'bg-gray-100 text-gray-600'}`}>
                    {profile.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                <User size={14} />
                View as Specific User
              </h4>
            </div>
            <div className="p-2 max-h-64 overflow-auto">
              {loading ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">No users found</div>
              ) : (
                users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded uppercase">
                        {user.role}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
