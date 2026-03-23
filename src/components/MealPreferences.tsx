import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  UtensilsCrossed,
  X,
  Plus,
  AlertCircle,
  Settings,
  Clock,
} from 'lucide-react';
import { getUserHousehold } from '../lib/household';
import { getHouseholdMembersList } from '../lib/household';
import { supabase } from '../lib/supabase';
import {
  getDietProfile,
  upsertDietProfile,
  DietProfile,
  DIET_TYPES,
  ALLERGIES,
  FASTING_TYPES,
  DAYS_OF_WEEK,
  MEAL_TIMES,
  MEAL_AVAILABILITY_OPTIONS,
} from '../lib/dietProfiles';
import { MealScheduleSettings } from './meal-planner/MealScheduleSettings';
import { useSpaceContext } from '../hooks/useSpaceContext';

type MemberProfile = {
  id: string;
  user_id: string | null;
  email: string;
  full_name?: string;
};

type MemberWithDiet = {
  member: MemberProfile;
  dietProfile: DietProfile | null;
};

export function MealPreferences() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [householdId, setHouseholdId] = useState<string>('');
  const [membersWithDiets, setMembersWithDiets] = useState<MemberWithDiet[]>([]);
  const [newAvoidItem, setNewAvoidItem] = useState<{ [key: string]: string }>({});
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  
  // Get current space ID for meal schedule settings
  const { currentSpaceId } = useSpaceContext(householdId);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const household = await getUserHousehold();

      if (!household) {
        navigate('/onboarding/household');
        return;
      }

      setHouseholdId(household.id);

      const householdMembers = await getHouseholdMembersList(household.id);
      const activeMembers = householdMembers.filter((m) => m.status === 'active' && m.user_id);

      const memberProfiles = await Promise.all(
        activeMembers.map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', member.user_id!)
            .maybeSingle();

          if (!profile) return null;

          const dietProfile = await getDietProfile(household.id, profile.id);

          return {
            member: profile,
            dietProfile,
          };
        })
      );

      setMembersWithDiets(memberProfiles.filter((m) => m !== null) as MemberWithDiet[]);
    } catch (err) {
      console.error('Error loading meal preferences:', err);
      setError('Failed to load meal preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await Promise.all(
        membersWithDiets.map(async ({ member, dietProfile }) => {
          if (dietProfile) {
            await upsertDietProfile({
              household_id: householdId,
              profile_id: member.id,
              diet_type: dietProfile.diet_type,
              allergies: dietProfile.allergies,
              avoid_list: dietProfile.avoid_list,
              fasting_schedule: dietProfile.fasting_schedule,
              weekly_schedule: dietProfile.weekly_schedule,
            });
          }
        })
      );

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadData();
    } catch (err) {
      console.error('Error saving meal preferences:', err);
      setError('Failed to save meal preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleDietType = (memberIndex: number, dietType: string) => {
    setMembersWithDiets((prev) => {
      const updated = [...prev];
      const current = updated[memberIndex];

      if (!current.dietProfile) {
        current.dietProfile = {
          id: '',
          household_id: householdId,
          profile_id: current.member.id,
          diet_type: [dietType],
          allergies: [],
          avoid_list: [],
          fasting_schedule: {},
          weekly_schedule: {},
          created_at: new Date().toISOString(),
        };
      } else {
        const types = current.dietProfile.diet_type;
        if (types.includes(dietType)) {
          current.dietProfile.diet_type = types.filter((t) => t !== dietType);
        } else {
          current.dietProfile.diet_type = [...types, dietType];
        }
      }

      return updated;
    });
  };

  const toggleAllergy = (memberIndex: number, allergy: string) => {
    setMembersWithDiets((prev) => {
      const updated = [...prev];
      const current = updated[memberIndex];

      if (!current.dietProfile) {
        current.dietProfile = {
          id: '',
          household_id: householdId,
          profile_id: current.member.id,
          diet_type: [],
          allergies: [allergy],
          avoid_list: [],
          fasting_schedule: {},
          weekly_schedule: {},
          created_at: new Date().toISOString(),
        };
      } else {
        const allergies = current.dietProfile.allergies;
        if (allergies.includes(allergy)) {
          current.dietProfile.allergies = allergies.filter((a) => a !== allergy);
        } else {
          current.dietProfile.allergies = [...allergies, allergy];
        }
      }

      return updated;
    });
  };

  const addAvoidItem = (memberIndex: number) => {
    const item = newAvoidItem[memberIndex]?.trim();
    if (!item) return;

    setMembersWithDiets((prev) => {
      const updated = [...prev];
      const current = updated[memberIndex];

      if (!current.dietProfile) {
        current.dietProfile = {
          id: '',
          household_id: householdId,
          profile_id: current.member.id,
          diet_type: [],
          allergies: [],
          avoid_list: [item],
          fasting_schedule: {},
          weekly_schedule: {},
          created_at: new Date().toISOString(),
        };
      } else {
        if (!current.dietProfile.avoid_list.includes(item)) {
          current.dietProfile.avoid_list = [...current.dietProfile.avoid_list, item];
        }
      }

      return updated;
    });

    setNewAvoidItem((prev) => ({ ...prev, [memberIndex]: '' }));
  };

  const removeAvoidItem = (memberIndex: number, item: string) => {
    setMembersWithDiets((prev) => {
      const updated = [...prev];
      const current = updated[memberIndex];

      if (current.dietProfile) {
        current.dietProfile.avoid_list = current.dietProfile.avoid_list.filter((i) => i !== item);
      }

      return updated;
    });
  };

  const updateFastingSchedule = (
    memberIndex: number,
    field: 'type' | 'start' | 'end',
    value: string
  ) => {
    setMembersWithDiets((prev) => {
      const updated = [...prev];
      const current = updated[memberIndex];

      if (!current.dietProfile) {
        current.dietProfile = {
          id: '',
          household_id: householdId,
          profile_id: current.member.id,
          diet_type: [],
          allergies: [],
          avoid_list: [],
          fasting_schedule: { [field]: value },
          weekly_schedule: {},
          created_at: new Date().toISOString(),
        };
      } else {
        current.dietProfile.fasting_schedule = {
          ...current.dietProfile.fasting_schedule,
          [field]: value,
        };
      }

      return updated;
    });
  };

  const updateWeeklySchedule = (
    memberIndex: number,
    day: string,
    meal: string,
    value: string
  ) => {
    setMembersWithDiets((prev) => {
      const updated = [...prev];
      const current = updated[memberIndex];

      if (!current.dietProfile) {
        current.dietProfile = {
          id: '',
          household_id: householdId,
          profile_id: current.member.id,
          diet_type: [],
          allergies: [],
          avoid_list: [],
          fasting_schedule: {},
          weekly_schedule: {
            [day]: { [meal]: value },
          },
          created_at: new Date().toISOString(),
        };
      } else {
        const daySchedule = current.dietProfile.weekly_schedule[day] || {};
        current.dietProfile.weekly_schedule = {
          ...current.dietProfile.weekly_schedule,
          [day]: {
            ...daySchedule,
            [meal]: value,
          },
        };
      }

      return updated;
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Meal Preferences</h1>
          <p className="text-gray-600">Manage dietary preferences for household members</p>
        </div>
        {currentSpaceId && (
          <button
            onClick={() => setShowScheduleSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Settings size={18} />
            <span className="hidden sm:inline">Meal Schedule</span>
            <span className="sm:hidden">Schedule</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">Meal preferences saved successfully!</p>
        </div>
      )}

      {membersWithDiets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <UtensilsCrossed size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Members</h3>
          <p className="text-gray-600">
            Add active members to your household to manage their meal preferences
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {membersWithDiets.map((memberWithDiet, memberIndex) => {
            const { member, dietProfile } = memberWithDiet;
            const displayName = member.full_name || member.email.split('@')[0];

            return (
              <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-teal-50">
                  <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
                  <p className="text-sm text-gray-600">{member.email}</p>
                </div>

                <div className="p-6 space-y-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Diet Type</h3>
                    <div className="flex flex-wrap gap-2">
                      {DIET_TYPES.map((type) => {
                        const isSelected = dietProfile?.diet_type.includes(type) || false;
                        return (
                          <button
                            key={type}
                            onClick={() => toggleDietType(memberIndex, type)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Allergies</h3>
                    <div className="flex flex-wrap gap-2">
                      {ALLERGIES.map((allergy) => {
                        const isSelected = dietProfile?.allergies.includes(allergy) || false;
                        return (
                          <button
                            key={allergy}
                            onClick={() => toggleAllergy(memberIndex, allergy)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              isSelected
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {allergy}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Foods to Avoid (Beyond Allergies)
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {dietProfile?.avoid_list.map((item) => (
                        <div
                          key={item}
                          className="px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium flex items-center gap-2"
                        >
                          {item}
                          <button
                            onClick={() => removeAvoidItem(memberIndex, item)}
                            className="hover:text-orange-900"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g., mushrooms, onions, spicy food"
                        value={newAvoidItem[memberIndex] || ''}
                        onChange={(e) =>
                          setNewAvoidItem((prev) => ({ ...prev, [memberIndex]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addAvoidItem(memberIndex);
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => addAvoidItem(memberIndex)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Fasting Schedule
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Fasting Type
                        </label>
                        <select
                          value={dietProfile?.fasting_schedule?.type || 'none'}
                          onChange={(e) =>
                            updateFastingSchedule(memberIndex, 'type', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {FASTING_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {dietProfile?.fasting_schedule?.type &&
                        dietProfile.fasting_schedule.type !== 'none' && (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Start Time (Fasting begins)
                              </label>
                              <input
                                type="time"
                                value={dietProfile?.fasting_schedule?.start || ''}
                                onChange={(e) =>
                                  updateFastingSchedule(memberIndex, 'start', e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                End Time (Eating begins)
                              </label>
                              <input
                                type="time"
                                value={dietProfile?.fasting_schedule?.end || ''}
                                onChange={(e) =>
                                  updateFastingSchedule(memberIndex, 'end', e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </>
                        )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Weekly Meal Availability
                    </h3>
                    <p className="text-xs text-gray-600 mb-4">
                      Track when this person eats meals at home or has special requirements
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left p-2 border-b-2 border-gray-300 text-sm font-semibold text-gray-700">
                              Day
                            </th>
                            {MEAL_TIMES.map((meal) => (
                              <th
                                key={meal}
                                className="text-center p-2 border-b-2 border-gray-300 text-sm font-semibold text-gray-700 capitalize"
                              >
                                {meal}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {DAYS_OF_WEEK.map((day) => (
                            <tr key={day}>
                              <td className="p-2 border-b border-gray-200 text-sm font-medium text-gray-700 capitalize">
                                {day}
                              </td>
                              {MEAL_TIMES.map((meal) => {
                                const value =
                                  dietProfile?.weekly_schedule?.[day]?.[meal] || 'normal';
                                return (
                                  <td key={meal} className="p-2 border-b border-gray-200">
                                    <select
                                      value={value}
                                      onChange={(e) =>
                                        updateWeeklySchedule(
                                          memberIndex,
                                          day,
                                          meal,
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      {MEAL_AVAILABILITY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      {MEAL_AVAILABILITY_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded ${option.color}`}>
                            {option.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => navigate('/settings')}
              className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save All
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Meal Schedule Settings Modal */}
      {showScheduleSettings && currentSpaceId && (
        <MealScheduleSettings
          spaceId={currentSpaceId}
          onClose={() => setShowScheduleSettings(false)}
        />
      )}
    </div>
  );
}
