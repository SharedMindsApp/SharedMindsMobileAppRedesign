/**
 * Habit Participant Management Sheet
 * 
 * Allows users to manage participants for household/team habits:
 * - View current participants
 * - Add household/team members
 * - Remove participants
 * - Toggle participant/observer roles
 */

import { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, Eye, UserCheck, Search } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';
import { Avatar } from '../../messaging/Avatar';
import { supabase } from '../../../lib/supabase';
import { getTrackerParticipants, joinTracker, leaveTracker, updateParticipation } from '../../../lib/activities/trackerParticipationService';
import type { TrackerParticipant, ParticipantRole } from '../../../lib/activities/activityTypes';
import { getHouseholdMembersList, getUserHousehold } from '../../../lib/household';
import { getUserTeams } from '../../../lib/teams';
import type { Activity } from '../../../lib/activities/activityTypes';
import { updateActivity } from '../../../lib/activities/activityService';
import { emitNotificationIntent } from '../../../lib/notificationResolver';

interface HabitParticipantManagementSheetProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Activity;
  userId: string;
  onUpdate: () => void;
}

interface AvailableMember {
  userId: string;
  profileId: string;
  name: string;
  email?: string;
  isParticipating: boolean;
  role?: ParticipantRole;
  householdId?: string; // For personal habit conversion
  teamId?: string; // For personal habit conversion
  householdName?: string; // Display name for household
  teamName?: string; // Display name for team
}

export function HabitParticipantManagementSheet({
  isOpen,
  onClose,
  habit,
  userId,
  onUpdate,
}: HabitParticipantManagementSheetProps) {
  const [participants, setParticipants] = useState<TrackerParticipant[]>([]);
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  const ownerType = (habit as any).owner_type || 'user';
  const householdOwnerId = (habit as any).household_owner_id;
  const teamOwnerId = (habit as any).team_owner_id;
  const isPersonal = ownerType === 'user';

  // Load participants and available members
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, habit.id, householdOwnerId, teamOwnerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load current participants
      const currentParticipants = await getTrackerParticipants(habit.id);
      setParticipants(currentParticipants);

      // Load available members based on ownership type
      let members: AvailableMember[] = [];

      if (ownerType === 'household' && householdOwnerId) {
        // Get household name
        const { data: householdSpace } = await supabase
          .from('spaces')
          .select('name')
          .eq('id', householdOwnerId)
          .maybeSingle();
        
        const householdName = householdSpace?.name || 'Household';

        // Get household members from space_members (households are stored as spaces)
        const { data: householdMembers } = await supabase
          .from('space_members')
          .select(`
            user_id,
            profiles:user_id (
              id,
              user_id,
              full_name,
              email
            )
          `)
          .eq('space_id', householdOwnerId)
          .in('status', ['pending', 'active']);

        if (householdMembers) {
          members = householdMembers
            .filter((hm: any) => hm.user_id && hm.profiles)
            .map((hm: any) => {
              const profile = hm.profiles;
              const participant = currentParticipants.find(p => p.user_id === profile.user_id);
              return {
                userId: profile.user_id,
                profileId: profile.id,
                name: profile.full_name || profile.email || 'User',
                email: profile.email || undefined,
                isParticipating: !!participant,
                role: participant?.role,
                householdName,
              };
            });
        }
      } else if (ownerType === 'team' && teamOwnerId) {
        // Get team name
        const { data: team } = await supabase
          .from('teams')
          .select('name')
          .eq('id', teamOwnerId)
          .maybeSingle();
        
        const teamName = team?.name || 'Team';

        // Get team members
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select(`
            user_id,
            profiles:user_id (
              id,
              user_id,
              full_name,
              email
            )
          `)
          .eq('team_id', teamOwnerId)
          .eq('status', 'active');

        if (teamMembers) {
          members = teamMembers
            .filter((tm: any) => tm.profiles)
            .map((tm: any) => {
              const profile = tm.profiles;
              const participant = currentParticipants.find(p => p.user_id === profile.user_id);
              return {
                userId: profile.user_id,
                profileId: profile.id,
                name: profile.full_name || profile.email || 'User',
                email: profile.email || undefined,
                isParticipating: !!participant,
                role: participant?.role,
                teamName,
              };
            });
        }
      } else if (isPersonal) {
        // For personal habits, load user's household and team members
        const allMembers: AvailableMember[] = [];

        // Get household members
        const household = await getUserHousehold();
        if (household) {
          const { data: householdMembers } = await supabase
            .from('space_members')
            .select(`
              user_id,
              profiles:user_id (
                id,
                user_id,
                full_name,
                email
              )
            `)
            .eq('space_id', household.id)
            .in('status', ['pending', 'active'])
            .neq('user_id', userId); // Exclude current user

          if (householdMembers) {
            householdMembers
              .filter((hm: any) => hm.user_id && hm.profiles)
              .forEach((hm: any) => {
                const profile = hm.profiles;
                const participant = currentParticipants.find(p => p.user_id === profile.user_id);
                allMembers.push({
                  userId: profile.user_id,
                  profileId: profile.id,
                  name: profile.full_name || profile.email || 'User',
                  email: profile.email || undefined,
                  isParticipating: !!participant,
                  role: participant?.role,
                  householdId: household.id, // Store for conversion
                  householdName: household.name, // Display name
                });
              });
          }
        }

        // Get team members
        const teams = await getUserTeams();
        for (const team of teams) {
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select(`
              user_id,
              profiles:user_id (
                id,
                user_id,
                full_name,
                email
              )
            `)
            .eq('team_id', team.id)
            .eq('status', 'active');

          if (teamMembers) {
            teamMembers
              .filter((tm: any) => tm.profiles && tm.user_id !== userId)
              .forEach((tm: any) => {
                const profile = tm.profiles;
                // Check if already added from household
                const existingMember = allMembers.find(m => m.userId === profile.user_id);
                const participant = currentParticipants.find(p => p.user_id === profile.user_id);
                
                if (!existingMember) {
                  allMembers.push({
                    userId: profile.user_id,
                    profileId: profile.id,
                    name: profile.full_name || profile.email || 'User',
                    email: profile.email || undefined,
                    isParticipating: !!participant,
                    role: participant?.role,
                    teamId: team.id, // Store for conversion
                    teamName: team.name, // Display name
                  });
                } else {
                  // If member exists from household, add team info too
                  existingMember.teamId = team.id;
                  existingMember.teamName = team.name;
                }
              });
          }
        }

        members = allMembers;
      }

      setAvailableMembers(members);
    } catch (error) {
      console.error('[HabitParticipantManagementSheet] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async (member: AvailableMember) => {
    setUpdating(prev => new Set(prev).add(member.userId));
    try {
      // If this is a personal habit and this is the first participant, convert it
      if (isPersonal && participants.length === 0) {
        // Determine if member is from household or team
        let newOwnerType: 'household' | 'team' = 'household';
        let newHouseholdOwnerId: string | undefined = member.householdId;
        let newTeamOwnerId: string | undefined = member.teamId;

        // If member has both household and team, prefer household
        if (!newHouseholdOwnerId && member.teamId) {
          newOwnerType = 'team';
          newTeamOwnerId = member.teamId;
        }

        if (!newHouseholdOwnerId && !newTeamOwnerId) {
          // Fallback: try to get user's household
          const household = await getUserHousehold();
          if (household) {
            newOwnerType = 'household';
            newHouseholdOwnerId = household.id;
          } else {
            throw new Error('Cannot determine household or team for conversion');
          }
        }

        // Convert habit to household/team owned
        await updateActivity(habit.id, {
          metadata: {
            ...habit.metadata,
            // Preserve collaboration_mode if it exists
            collaboration_mode: habit.metadata?.collaboration_mode || 'collaborative',
          },
        });

        // Update ownership fields directly via Supabase
        const updateData: Record<string, any> = {
          owner_type: newOwnerType,
          updated_at: new Date().toISOString(),
        };

        if (newOwnerType === 'household' && newHouseholdOwnerId) {
          updateData.household_owner_id = newHouseholdOwnerId;
          updateData.team_owner_id = null;
          updateData.team_group_id = null;
        } else if (newOwnerType === 'team' && newTeamOwnerId) {
          updateData.team_owner_id = newTeamOwnerId;
          updateData.household_owner_id = null;
          updateData.team_group_id = null;
        }

        const { error: updateError } = await supabase
          .from('activities')
          .update(updateData)
          .eq('id', habit.id);

        if (updateError) {
          throw new Error(`Failed to convert habit: ${updateError.message}`);
        }

        // Reload habit data to get updated ownership
        const { data: updatedHabit } = await supabase
          .from('activities')
          .select('*')
          .eq('id', habit.id)
          .single();

        if (updatedHabit) {
          // Update local habit reference (this will trigger a reload in parent)
          Object.assign(habit, updatedHabit);
        }
      }

      // Add participant (this will auto-join them)
      await joinTracker({
        activityId: habit.id,
        userId: member.userId,
        role: 'participant',
      });

      // Send notification to invited user
      try {
        await emitNotificationIntent({
          userId: member.userId,
          feature: 'habit',
          signalType: 'update',
          title: `Invited to habit: ${habit.title}`,
          body: `${habit.title} has been shared with you. Tap to join.`,
          sourceType: 'habit',
          sourceId: habit.id,
          actionUrl: `/tracker?habit_id=${habit.id}`,
        });
      } catch (notifError) {
        // Non-fatal - notification failure shouldn't block adding participant
        console.warn('[HabitParticipantManagementSheet] Failed to send notification:', notifError);
      }

      await loadData();
      onUpdate();
    } catch (error) {
      console.error('[HabitParticipantManagementSheet] Error adding participant:', error);
      alert('Failed to add participant. Please try again.');
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(member.userId);
        return next;
      });
    }
  };

  const handleRemoveParticipant = async (memberUserId: string) => {
    setUpdating(prev => new Set(prev).add(memberUserId));
    try {
      await leaveTracker(habit.id, memberUserId);
      await loadData();
      onUpdate();
    } catch (error) {
      console.error('[HabitParticipantManagementSheet] Error removing participant:', error);
      alert('Failed to remove participant. Please try again.');
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(memberUserId);
        return next;
      });
    }
  };

  const handleToggleRole = async (memberUserId: string, currentRole: ParticipantRole) => {
    setUpdating(prev => new Set(prev).add(memberUserId));
    try {
      const newRole: ParticipantRole = currentRole === 'participant' ? 'observer' : 'participant';
      await updateParticipation(habit.id, memberUserId, {
        role: newRole,
      });
      await loadData();
      onUpdate();
    } catch (error) {
      console.error('[HabitParticipantManagementSheet] Error updating role:', error);
      alert('Failed to update role. Please try again.');
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(memberUserId);
        return next;
      });
    }
  };

  const filteredMembers = availableMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const participatingMembers = filteredMembers.filter(m => m.isParticipating);
  const availableToAdd = filteredMembers.filter(m => !m.isParticipating);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Manage Participants">
      <div className="space-y-4">
        {/* Info for personal habits */}
        {isPersonal && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-800">
              Adding someone will convert this to a shared habit. They'll receive an invite to join.
            </p>
          </div>
        )}

        {/* Search - Show for all habits */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Current Participants */}
            {participatingMembers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Participants ({participatingMembers.length})
                </h3>
                <div className="space-y-2">
                  {participatingMembers.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar
                          userId={member.profileId}
                          name={member.name}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.name}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {member.role && (
                              <p className="text-xs text-gray-500">
                                {member.role === 'participant' ? 'Can check in' : 'Observer'}
                              </p>
                            )}
                            {(member.householdName || member.teamName) && (
                              <span className="text-xs text-gray-400">•</span>
                            )}
                            {member.householdName && (
                              <p className="text-xs text-indigo-600">
                                🏠 {member.householdName}
                              </p>
                            )}
                            {member.teamName && (
                              <p className="text-xs text-blue-600">
                                👥 {member.teamName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Toggle Role Button */}
                        {member.role && (
                          <button
                            onClick={() => handleToggleRole(member.userId, member.role!)}
                            disabled={updating.has(member.userId)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                            title={member.role === 'participant' ? 'Switch to observer' : 'Switch to participant'}
                          >
                            {member.role === 'participant' ? (
                              <Eye size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>
                        )}
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveParticipant(member.userId)}
                          disabled={updating.has(member.userId)}
                          className="p-1.5 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Remove participant"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available to Add */}
            {availableToAdd.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Add Members ({availableToAdd.length})
                </h3>
                <div className="space-y-2">
                  {availableToAdd.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar
                          userId={member.profileId}
                          name={member.name}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.name}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {member.email && (
                              <p className="text-xs text-gray-500 truncate">
                                {member.email}
                              </p>
                            )}
                            {(member.householdName || member.teamName) && member.email && (
                              <span className="text-xs text-gray-400">•</span>
                            )}
                            {member.householdName && (
                              <p className="text-xs text-indigo-600">
                                🏠 {member.householdName}
                              </p>
                            )}
                            {member.teamName && (
                              <p className="text-xs text-blue-600">
                                👥 {member.teamName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleAddParticipant(member)}
                        disabled={updating.has(member.userId)}
                        className="p-1.5 text-indigo-600 hover:text-indigo-700 transition-colors disabled:opacity-50"
                        title="Add participant"
                      >
                        {updating.has(member.userId) ? (
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <UserPlus size={16} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No members found' : 'No members available'}
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
