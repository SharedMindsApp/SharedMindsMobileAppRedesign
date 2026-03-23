import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Loader2, Trash2, UserCircle, Edit2, X, Save, ArrowLeft } from 'lucide-react';
import {
  getUserHousehold,
  getHouseholdMembers,
  createMember,
  updateMember,
  deleteMember,
} from '../lib/household';
import { supabase, Member } from '../lib/supabase';

const MAX_MEMBERS = 4;
const ROLE_OPTIONS = ['ADHD', 'Partner', 'Parent', 'Child', 'Other'];

export function ManageMembers() {
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    age: '',
    role: 'ADHD',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    age: '',
    role: 'ADHD',
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/onboarding/household');
        return;
      }

      setCurrentUserId(user.id);

      const householdData = await getUserHousehold();
      if (!householdData) {
        navigate('/onboarding/household');
        return;
      }

      setHousehold(householdData);
      const membersData = await getHouseholdMembers(householdData.id);
      setMembers(membersData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load household data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addFormData.name.trim()) {
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

      const newMember = await createMember({
        household_id: household!.id,
        user_id: null,
        name: addFormData.name.trim(),
        age: addFormData.age ? parseInt(addFormData.age) : undefined,
        role: addFormData.role,
      });

      setMembers([...members, newMember]);
      setAddFormData({ name: '', age: '', role: 'ADHD' });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editFormData.name.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updatedMember = await updateMember(editingMember!.id, {
        name: editFormData.name.trim(),
        age: editFormData.age ? parseInt(editFormData.age) : undefined,
        role: editFormData.role,
      });

      setMembers(members.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
      setEditingMember(null);
    } catch (err) {
      console.error('Error updating member:', err);
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      setError(null);
      await deleteMember(memberId);
      setMembers(members.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error('Error deleting member:', err);
      setError('Failed to delete member');
    }
  };

  const startEditingMember = (member: Member) => {
    setEditingMember(member);
    setEditFormData({
      name: member.name,
      age: member.age?.toString() || '',
      role: member.role || 'ADHD',
    });
    setShowAddForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const canAddMore = members.length < MAX_MEMBERS;
  const householdOwner = members.find((m) => m.user_id === currentUserId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Users size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Members</h1>
          <p className="text-gray-600">
            {household?.name} • {members.length} / {MAX_MEMBERS} members
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {members.map((member) => {
              const isOwner = member.id === householdOwner?.id;
              const isEditing = editingMember?.id === member.id;

              if (isEditing) {
                return (
                  <form
                    key={member.id}
                    onSubmit={handleEditMember}
                    className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Edit Member</h3>
                      <button
                        type="button"
                        onClick={() => setEditingMember(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div>
                      <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="edit-name"
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-age" className="block text-sm font-medium text-gray-700 mb-2">
                        Age
                      </label>
                      <input
                        id="edit-age"
                        type="number"
                        value={editFormData.age}
                        onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={saving}
                        min="0"
                        max="120"
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-2">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="edit-role"
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={saving}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingMember(null)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving || !editFormData.name.trim()}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={18} />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-5 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <UserCircle size={40} className="text-gray-400" />
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {member.name}
                        {isOwner && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {member.role}
                        {member.age && ` • ${member.age} years old`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditingMember(member)}
                      className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit member"
                    >
                      <Edit2 size={18} />
                    </button>
                    {!isOwner && (
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!showAddForm && canAddMore && !editingMember && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 text-gray-600 hover:text-blue-600 font-medium py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Member
            </button>
          )}

          {showAddForm && (
            <form
              onSubmit={handleAddMember}
              className="bg-green-50 border-2 border-green-300 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add New Member</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddFormData({ name: '', age: '', role: 'ADHD' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <label htmlFor="add-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="add-name"
                  type="text"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                  placeholder="Enter name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="add-age" className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  id="add-age"
                  type="number"
                  value={addFormData.age}
                  onChange={(e) => setAddFormData({ ...addFormData, age: e.target.value })}
                  placeholder="Enter age"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                  min="0"
                  max="120"
                />
              </div>

              <div>
                <label htmlFor="add-role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="add-role"
                  value={addFormData.role}
                  onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddFormData({ name: '', age: '', role: 'ADHD' });
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !addFormData.name.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Add Member
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
