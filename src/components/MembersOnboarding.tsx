import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Loader2, Trash2, UserCircle, LogOut } from 'lucide-react';
import { getUserHousehold, getHouseholdMembers, createMember, deleteMember } from '../lib/household';
import { supabase, Member } from '../lib/supabase';
import { useAuth } from '../core/auth/AuthProvider';

const MAX_MEMBERS = 4;
const MIN_MEMBERS = 1;

const ROLE_OPTIONS = ['ADHD', 'Partner', 'Parent', 'Child', 'Other'];

export function MembersOnboarding() {
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    role: 'ADHD',
  });
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const householdData = await getUserHousehold();

      if (!householdData) {
        navigate('/onboarding/household');
        return;
      }

      setHousehold(householdData);
      const membersData = await getHouseholdMembers(householdData.id);
      setMembers(membersData);

      if (membersData.length === 0) {
        setShowForm(true);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load household data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (members.length >= MAX_MEMBERS) {
      setError(`Maximum ${MAX_MEMBERS} members allowed`);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isFirstMember = members.length === 0;

      const newMember = await createMember({
        household_id: household!.id,
        user_id: isFirstMember ? user!.id : null,
        name: formData.name.trim(),
        age: formData.age ? parseInt(formData.age) : undefined,
        role: formData.role,
      });

      setMembers([...members, newMember]);
      setFormData({ name: '', age: '', role: 'ADHD' });
      setShowForm(false);
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      setError(null);
      await deleteMember(memberId);
      setMembers(members.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error('Error deleting member:', err);
      setError('Failed to delete member');
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const canAddMore = members.length < MAX_MEMBERS;
  const canContinue = members.length >= MIN_MEMBERS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <button
        onClick={signOut}
        className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-colors"
      >
        <LogOut size={18} />
        <span className="text-sm font-medium">Log Out</span>
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Users size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Household Members</h1>
          <p className="text-gray-600">
            Add up to {MAX_MEMBERS} members who will participate (optional)
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="font-semibold text-blue-600">Step 2 of 2</span>
              <span>•</span>
              <span>Add Members</span>
            </div>
            <div className="text-sm text-gray-600">
              {members.length} / {MAX_MEMBERS} members
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {members.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Current Members
              </h3>
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <UserCircle size={24} className="text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-600">
                        {member.role}
                        {member.age && ` • ${member.age} years old`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!showForm && canAddMore && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 text-gray-600 hover:text-blue-600 font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Member
            </button>
          )}

          {showForm && (
            <form onSubmit={handleAddMember} className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                New Member
              </h3>

              <div>
                <label htmlFor="memberName" className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="memberName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="memberAge" className="block text-sm font-medium text-gray-700 mb-2">
                  Age (optional)
                </label>
                <input
                  id="memberAge"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="Enter age"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                  min="0"
                  max="120"
                />
              </div>

              <div>
                <label htmlFor="memberRole" className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="memberRole"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ name: '', age: '', role: 'ADHD' });
                    setError(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Member'
                  )}
                </button>
              </div>
            </form>
          )}

          {!showForm && (
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={handleContinue}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Continue to Dashboard
              </button>
              {members.length === 1 && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  You can add more members later from your dashboard
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
