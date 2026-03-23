/**
 * Tracker Ownership Selector
 * 
 * Progressive disclosure component for selecting where a tracker lives:
 * - Personal (just me)
 * - Household (shared with household)
 * - Team (shared with team, optionally scoped to group)
 */

import { useState, useEffect } from 'react';
import { User, Users, Home, ChevronDown } from 'lucide-react';
import type { TrackerOwnerType } from '../../../lib/activities/activityTypes';
import { getUserHousehold } from '../../../lib/household';
import { getUserTeams } from '../../../lib/teams';
import { listUserGroups } from '../../../lib/groups/teamGroupMembersService';
import { supabase } from '../../../lib/supabase';

interface TrackerOwnershipSelectorProps {
  userId: string;
  selectedOwnerType: TrackerOwnerType;
  selectedHouseholdId?: string;
  selectedTeamId?: string;
  selectedTeamGroupId?: string;
  onOwnershipChange: (ownership: {
    ownerType: TrackerOwnerType;
    householdId?: string;
    teamId?: string;
    teamGroupId?: string;
  }) => void;
  isMobile?: boolean;
}

interface Household {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

interface TeamGroup {
  id: string;
  name: string;
}

export function TrackerOwnershipSelector({
  userId,
  selectedOwnerType,
  selectedHouseholdId,
  selectedTeamId,
  selectedTeamGroupId,
  onOwnershipChange,
  isMobile = false,
}: TrackerOwnershipSelectorProps) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Load households and teams
  useEffect(() => {
    const loadOwnershipOptions = async () => {
      setLoading(true);
      try {
        // Load household
        const household = await getUserHousehold();
        if (household) {
          setHouseholds([{ id: household.id, name: household.name || 'My Household' }]);
        }

        // Load teams
        const userTeams = await getUserTeams();
        setTeams(userTeams.map(t => ({ id: t.id, name: t.name })));
      } catch (error) {
        console.error('[TrackerOwnershipSelector] Error loading ownership options:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOwnershipOptions();
  }, [userId]);

  // Load team groups when team is selected
  useEffect(() => {
    const loadTeamGroups = async () => {
      if (selectedOwnerType === 'team' && selectedTeamId) {
        try {
          // Get profile ID for user
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (profile) {
            const groups = await listUserGroups(selectedTeamId, profile.id);
            setTeamGroups(groups.map(g => ({ id: g.id, name: g.name })));
          }
        } catch (error) {
          console.error('[TrackerOwnershipSelector] Error loading team groups:', error);
          setTeamGroups([]);
        }
      } else {
        setTeamGroups([]);
      }
    };

    loadTeamGroups();
  }, [selectedOwnerType, selectedTeamId, userId]);

  const handleOwnerTypeChange = (type: TrackerOwnerType) => {
    if (type === 'user') {
      onOwnershipChange({ ownerType: 'user' });
    } else if (type === 'household' && households.length > 0) {
      onOwnershipChange({
        ownerType: 'household',
        householdId: households[0].id,
      });
    } else if (type === 'team' && teams.length > 0) {
      onOwnershipChange({
        ownerType: 'team',
        teamId: teams[0].id,
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Ownership Type Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Where does this live?
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleOwnerTypeChange('user')}
            className={`
              px-3 py-2.5 rounded-lg text-sm font-medium transition-all
              flex flex-col items-center gap-1.5
              ${selectedOwnerType === 'user'
                ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-300'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }
            `}
          >
            <User size={18} />
            <span>Just me</span>
          </button>
          
          {households.length > 0 && (
            <button
              type="button"
              onClick={() => handleOwnerTypeChange('household')}
              disabled={loading}
              className={`
                px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                flex flex-col items-center gap-1.5
                ${selectedOwnerType === 'household'
                  ? 'bg-amber-50 text-amber-700 border-2 border-amber-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }
                disabled:opacity-50
              `}
            >
              <Home size={18} />
              <span>Household</span>
            </button>
          )}
          
          {teams.length > 0 && (
            <button
              type="button"
              onClick={() => handleOwnerTypeChange('team')}
              disabled={loading}
              className={`
                px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                flex flex-col items-center gap-1.5
                ${selectedOwnerType === 'team'
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }
                disabled:opacity-50
              `}
            >
              <Users size={18} />
              <span>Team</span>
            </button>
          )}
        </div>
      </div>

      {/* Team Selection (if team selected) */}
      {selectedOwnerType === 'team' && teams.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Select team
          </label>
          <select
            value={selectedTeamId || ''}
            onChange={(e) => {
              onOwnershipChange({
                ownerType: 'team',
                teamId: e.target.value,
                teamGroupId: undefined, // Reset group when team changes
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Team Group Selection (optional, if team selected) */}
      {selectedOwnerType === 'team' && selectedTeamId && teamGroups.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Team group (optional)
          </label>
          <select
            value={selectedTeamGroupId || ''}
            onChange={(e) => {
              onOwnershipChange({
                ownerType: 'team',
                teamId: selectedTeamId,
                teamGroupId: e.target.value || undefined,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All team members</option>
            {teamGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Info Text */}
      {selectedOwnerType !== 'user' && (
        <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          {selectedOwnerType === 'household' && (
            <>Household members can join and track this habit individually.</>
          )}
          {selectedOwnerType === 'team' && (
            <>Team members can join and track this habit individually.</>
          )}
        </div>
      )}
    </div>
  );
}
