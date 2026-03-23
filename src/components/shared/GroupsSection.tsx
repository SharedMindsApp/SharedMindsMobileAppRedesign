/**
 * Groups Section Component
 * 
 * Displays and manages team groups within team settings
 */

import { useState, useEffect } from 'react';
import { Plus, Users, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listGroups, createGroup, archiveGroup, type TeamGroup } from '../../lib/groups/teamGroupsService';
import { listMembers, addMember, removeMember, getMemberCounts } from '../../lib/groups/teamGroupMembersService';
import type { SpaceMember } from '../../lib/sharedSpacesManagement';

interface GroupsSectionProps {
  teamId: string;
  canManage: boolean;
  teamMembers: SpaceMember[];
}

export function GroupsSection({ teamId, canManage, teamMembers }: GroupsSectionProps) {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>({}); // groupId -> userId[]
  const [groupMemberCounts, setGroupMemberCounts] = useState<Record<string, number>>({}); // groupId -> count
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});

  // Form state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  useEffect(() => {
    loadGroups();
  }, [teamId]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listGroups(teamId);
      const activeGroups = data.filter(g => !g.archivedAt);
      setGroups(activeGroups);
      
      // Load member counts for all groups
      if (activeGroups.length > 0) {
        const groupIds = activeGroups.map(g => g.id);
        const counts = await getMemberCounts(groupIds);
        setGroupMemberCounts(counts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    try {
      setLoadingMembers(prev => ({ ...prev, [groupId]: true }));
      const members = await listMembers(groupId);
      const memberIds = members.map(m => m.userId);
      setGroupMembers(prev => ({
        ...prev,
        [groupId]: memberIds,
      }));
      // Update count when we load full member list
      setGroupMemberCounts(prev => ({
        ...prev,
        [groupId]: memberIds.length,
      }));
    } catch (err) {
      console.error('Error loading group members:', err);
    } finally {
      setLoadingMembers(prev => ({ ...prev, [groupId]: false }));
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !groupName.trim()) return;

    try {
      setError(null);
      await createGroup(teamId, groupName.trim(), groupDescription.trim() || undefined, profile.id);
      setGroupName('');
      setGroupDescription('');
      setShowCreateForm(false);
      await loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    }
  };

  const handleArchiveGroup = async (groupId: string) => {
    if (!profile || !confirm('Are you sure you want to archive this group?')) return;

    try {
      setError(null);
      await archiveGroup(groupId, profile.id);
      await loadGroups();
      setGroupMembers(prev => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive group');
    }
  };

  const handleToggleMember = async (groupId: string, userId: string) => {
    if (!profile) return;

    const isMember = groupMembers[groupId]?.includes(userId);
    
    try {
      setError(null);
      if (isMember) {
        await removeMember(groupId, userId, profile.id);
      } else {
        await addMember(groupId, userId, profile.id);
      }
      await loadGroupMembers(groupId);
      // Update count immediately
      const newCount = isMember 
        ? (groupMemberCounts[groupId] || 0) - 1
        : (groupMemberCounts[groupId] || 0) + 1;
      setGroupMemberCounts(prev => ({
        ...prev,
        [groupId]: Math.max(0, newCount),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group membership');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Create Group Form */}
      {canManage && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={20} />
              Create Group
            </button>
          ) : (
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name *
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <label htmlFor="group-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="group-description"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter group description"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setGroupName('');
                    setGroupDescription('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No groups yet. Create your first group to organize team members.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              teamMembers={teamMembers}
              canManage={canManage}
              groupMemberIds={groupMembers[group.id] || []}
              memberCount={groupMemberCounts[group.id] || 0}
              loadingMembers={loadingMembers[group.id]}
              onLoadMembers={() => {
                if (!groupMembers[group.id] && !loadingMembers[group.id]) {
                  loadGroupMembers(group.id);
                }
              }}
              onToggleMember={(userId) => handleToggleMember(group.id, userId)}
              onArchive={() => handleArchiveGroup(group.id)}
              isExpanded={selectedGroup === group.id}
              onToggleExpand={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface GroupCardProps {
  group: TeamGroup;
  teamMembers: SpaceMember[];
  canManage: boolean;
  groupMemberIds: string[];
  memberCount: number;
  loadingMembers: boolean;
  onLoadMembers: () => void;
  onToggleMember: (userId: string) => void;
  onArchive: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function GroupCard({
  group,
  teamMembers,
  canManage,
  groupMemberIds,
  memberCount,
  loadingMembers,
  onLoadMembers,
  onToggleMember,
  onArchive,
  isExpanded,
  onToggleExpand,
}: GroupCardProps) {
  useEffect(() => {
    if (isExpanded) {
      onLoadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Users size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
            {canManage && (
              <button
                onClick={onArchive}
                className="ml-auto p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Archive group"
              >
                <X size={18} />
              </button>
            )}
          </div>
          {group.description && (
            <p className="text-sm text-gray-600 mb-3">{group.description}</p>
          )}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
            <button
              onClick={onToggleExpand}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {isExpanded ? 'Hide members' : 'Show members'}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {loadingMembers ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Select Members</h4>
              {teamMembers
                .filter(m => m.status === 'active')
                .map((member) => {
                  const isSelected = groupMemberIds.includes(member.userId);
                  return (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleMember(member.userId)}
                        disabled={!canManage}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {member.userName || member.userEmail || 'Unknown User'}
                        </div>
                        {member.userEmail && member.userName && (
                          <div className="text-xs text-gray-500">{member.userEmail}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              {teamMembers.filter(m => m.status === 'active').length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No active team members</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
