import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Archive, ArchiveRestore, Mail, Briefcase, Eye, Shield, UserPlus, Users2, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { useActiveDataContext } from '../../../state/useActiveDataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getPeopleByProject, archivePerson, unarchivePerson } from '../../../lib/guardrails/peopleService';
import { getAssignmentCountsByProject } from '../../../lib/guardrails/assignmentService';
import { getProjectUsers, addUserToProject, updateUserRole, removeUserFromProject, canUserManageProjectUsers, type ProjectUser, type ProjectUserRole } from '../../../lib/guardrails/projectUserService';
import { supabase } from '../../../lib/supabase';
import type { Person } from '../../../lib/guardrails';
import { AddEditPersonModal } from './AddEditPersonModal';
import { PersonAssignmentsDrawer } from './PersonAssignmentsDrawer';

type TabType = 'users' | 'people' | 'teams';

interface ProjectUserWithProfile extends ProjectUser {
  email: string | null;
  fullName: string | null;
}

export function PeoplePage() {
  const { activeProjectId } = useActiveDataContext();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  
  // People state (existing)
  const [people, setPeople] = useState<Person[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<Map<string, number>>(new Map());
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [viewingPerson, setViewingPerson] = useState<Person | null>(null);
  
  // Project Users state (new)
  const [projectUsers, setProjectUsers] = useState<ProjectUserWithProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ProjectUserWithProfile | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<ProjectUserRole>('viewer');

  useEffect(() => {
    if (activeProjectId) {
      loadPeople();
      loadAssignmentCounts();
      loadProjectUsers();
      checkCanManageUsers();
    } else {
      setPeople([]);
      setAssignmentCounts(new Map());
      setProjectUsers([]);
      setPeopleLoading(false);
      setUsersLoading(false);
    }
  }, [activeProjectId, showArchived]);

  async function checkCanManageUsers() {
    if (!activeProjectId || !user?.id) {
      setCanManageUsers(false);
      return;
    }
    try {
      const canManage = await canUserManageProjectUsers(user.id, activeProjectId);
      setCanManageUsers(canManage);
    } catch (error) {
      console.error('Failed to check manage users permission:', error);
      setCanManageUsers(false);
    }
  }

  async function loadPeople() {
    if (!activeProjectId) return;
    setPeopleLoading(true);
    try {
      const data = await getPeopleByProject(activeProjectId, showArchived);
      setPeople(data);
    } catch (error) {
      console.error('Failed to load people:', error);
    } finally {
      setPeopleLoading(false);
    }
  }

  async function loadAssignmentCounts() {
    if (!activeProjectId) return;
    try {
      const counts = await getAssignmentCountsByProject(activeProjectId);
      const countMap = new Map(counts.map(c => [c.personId, c.assignmentCount]));
      setAssignmentCounts(countMap);
    } catch (error) {
      console.error('Failed to load assignment counts:', error);
    }
  }

  async function loadProjectUsers() {
    if (!activeProjectId) return;
    setUsersLoading(true);
    try {
      const users = await getProjectUsers(activeProjectId, false);
      
      // Fetch user profile information for each user
      const usersWithProfiles: ProjectUserWithProfile[] = await Promise.all(
        users.map(async (user) => {
          try {
            // project_users.user_id references auth.users.id, need to get profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', user.userId)
              .maybeSingle();
            
            return {
              ...user,
              email: profile?.email || null,
              fullName: profile?.full_name || null,
            };
          } catch (error) {
            console.error(`Failed to load profile for user ${user.userId}:`, error);
            return {
              ...user,
              email: null,
              fullName: null,
            };
          }
        })
      );
      
      setProjectUsers(usersWithProfiles);
    } catch (error) {
      console.error('Failed to load project users:', error);
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleArchive(person: Person) {
    try {
      await archivePerson(person.id);
      loadPeople();
    } catch (error) {
      console.error('Failed to archive person:', error);
      alert('Failed to archive person');
    }
  }

  async function handleUnarchive(person: Person) {
    try {
      await unarchivePerson(person.id);
      loadPeople();
    } catch (error) {
      console.error('Failed to unarchive person:', error);
      alert('Failed to unarchive person');
    }
  }

  async function handleAddUser() {
    if (!activeProjectId || !user?.id || !newUserEmail) return;
    
    try {
      // Find user by email
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('email', newUserEmail)
        .maybeSingle();
      
      if (!profiles || !profiles.user_id) {
        alert('User not found with that email address');
        return;
      }
      
      await addUserToProject({
        userId: profiles.user_id,
        masterProjectId: activeProjectId,
        role: newUserRole,
      });
      
      setNewUserEmail('');
      setNewUserRole('viewer');
      setIsAddUserModalOpen(false);
      loadProjectUsers();
    } catch (error) {
      console.error('Failed to add user:', error);
      alert(error instanceof Error ? error.message : 'Failed to add user to project');
    }
  }

  async function handleUpdateUserRole(user: ProjectUserWithProfile, newRole: ProjectUserRole) {
    if (!activeProjectId) return;
    
    try {
      await updateUserRole(user.userId, activeProjectId, { role: newRole });
      loadProjectUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert('Failed to update user role');
    }
  }

  async function handleRemoveUser(user: ProjectUserWithProfile) {
    if (!activeProjectId) return;
    
    if (!confirm(`Remove ${user.fullName || user.email || user.userId} from this project?`)) {
      return;
    }
    
    try {
      await removeUserFromProject(user.userId, activeProjectId);
      loadProjectUsers();
    } catch (error) {
      console.error('Failed to remove user:', error);
      alert('Failed to remove user from project');
    }
  }

  function handleSave() {
    loadPeople();
    loadAssignmentCounts();
  }

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Project</h2>
          <p className="text-gray-600">Select a project from the Dashboard to manage people.</p>
        </div>
      </div>
    );
  }

  const activePeople = people.filter(p => !p.archived);
  const archivedPeople = people.filter(p => p.archived);

  const roleColors: Record<ProjectUserRole, string> = {
    owner: 'bg-purple-100 text-purple-800',
    editor: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-800',
  };

  const roleLabels: Record<ProjectUserRole, string> = {
    owner: 'Owner',
    editor: 'Editor',
    viewer: 'Viewer',
  };

  return (
    <div className="h-full bg-slate-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users size={32} />
              People & Access
            </h1>
            <p className="text-gray-600 mt-1">Manage project access and people</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield size={18} />
                Project Users
              </div>
            </button>
            <button
              onClick={() => setActiveTab('people')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'people'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users2 size={18} />
                People
              </div>
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'teams'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users2 size={18} />
                Teams & Groups
              </div>
            </button>
          </nav>
        </div>

        {/* Project Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                Project Users ({projectUsers.length})
              </h2>
              {canManageUsers && (
                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserPlus size={18} />
                  Add User
                </button>
              )}
            </div>

            {usersLoading ? (
              <div className="p-8 text-center text-gray-600">Loading...</div>
            ) : projectUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                <Shield size={48} className="mx-auto text-gray-300 mb-4" />
                <p>No users added yet.</p>
                {canManageUsers && (
                  <p className="text-sm mt-2">Click "Add User" to grant access to this project.</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {projectUsers.map((projectUser) => (
                  <div
                    key={projectUser.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">
                            {projectUser.fullName || projectUser.email || projectUser.userId}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[projectUser.role]}`}>
                            {roleLabels[projectUser.role]}
                          </span>
                        </div>
                        {projectUser.email && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                            <Mail size={14} />
                            <span>{projectUser.email}</span>
                          </div>
                        )}
                      </div>
                      {canManageUsers && (
                        <div className="flex items-center gap-2">
                          <select
                            value={projectUser.role}
                            onChange={(e) => handleUpdateUserRole(projectUser, e.target.value as ProjectUserRole)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="owner">Owner</option>
                          </select>
                          <button
                            onClick={() => handleRemoveUser(projectUser)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove user"
                          >
                            <UserX size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* People Tab (Existing) */}
        {activeTab === 'people' && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  Active People ({activePeople.length})
                </h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    <Archive size={16} />
                    {showArchived ? 'Hide' : 'Show'} Archived ({archivedPeople.length})
                  </button>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={20} />
                    Add Person
                  </button>
                </div>
              </div>

              {peopleLoading ? (
                <div className="p-8 text-center text-gray-600">Loading...</div>
              ) : activePeople.length === 0 && !showArchived ? (
                <div className="p-8 text-center text-gray-600">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p>No people added yet.</p>
                  <p className="text-sm mt-2">Click "Add Person" to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {activePeople.map(person => (
                    <div
                      key={person.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{person.name}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            {person.role && (
                              <div className="flex items-center gap-1">
                                <Briefcase size={14} />
                                <span>{person.role}</span>
                              </div>
                            )}
                            {person.email && (
                              <div className="flex items-center gap-1">
                                <Mail size={14} />
                                <span>{person.email}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="text-gray-600">Assigned to </span>
                            <span className="font-medium text-gray-900">
                              {assignmentCounts.get(person.id) || 0}
                            </span>
                            <span className="text-gray-600"> item(s)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingPerson(person)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View assignments"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => setEditingPerson(person)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit person"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Archive ${person.name}?`)) {
                                handleArchive(person);
                              }
                            }}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Archive person"
                          >
                            <Archive size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {showArchived && archivedPeople.length > 0 && (
                    <>
                      <div className="p-4 bg-gray-50">
                        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                          Archived People
                        </h3>
                      </div>
                      {archivedPeople.map(person => (
                        <div
                          key={person.id}
                          className="p-4 bg-gray-50 opacity-75"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-700">{person.name}</h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                {person.role && (
                                  <div className="flex items-center gap-1">
                                    <Briefcase size={14} />
                                    <span>{person.role}</span>
                                  </div>
                                )}
                                {person.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail size={14} />
                                    <span>{person.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnarchive(person)}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Unarchive person"
                            >
                              <ArchiveRestore size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Teams & Groups Tab */}
        {activeTab === 'teams' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={24} />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Teams & Groups</h2>
                <p className="text-gray-600 mb-4">
                  Teams and groups are managed separately from projects. Teams are organizational units that can have multiple groups for organizing members.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> To manage teams and groups, navigate to the Teams section. Teams are independent organizational units and are not tied to specific projects.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add User to Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Level
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as ProjectUserRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsAddUserModalOpen(false);
                  setNewUserEmail('');
                  setNewUserRole('viewer');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Modals */}
      {isAddModalOpen && (
        <AddEditPersonModal
          masterProjectId={activeProjectId}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleSave}
        />
      )}

      {editingPerson && (
        <AddEditPersonModal
          masterProjectId={activeProjectId}
          person={editingPerson}
          onClose={() => setEditingPerson(null)}
          onSave={handleSave}
        />
      )}

      {viewingPerson && (
        <PersonAssignmentsDrawer
          person={viewingPerson}
          onClose={() => setViewingPerson(null)}
        />
      )}
    </div>
  );
}