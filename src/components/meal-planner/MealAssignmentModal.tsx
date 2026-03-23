/**
 * Meal Assignment Modal
 * 
 * Modal for assigning prepared meals to meal slots
 */

import { useState, useEffect } from 'react';
import { X, Package, Calendar, Users, Loader2, AlertCircle } from 'lucide-react';
import { 
  createMealAssignment, 
  getPreparedMeals,
  type PreparedMeal,
  type CreateMealAssignmentInput 
} from '../../lib/mealPrepService';
import { showToast } from '../Toast';
import { useAuth } from '../../contexts/AuthContext';
import { useMealSchedule } from '../../hooks/useMealSchedule';
// Helper function to get the next 7 days starting from today
function getNext7Days(startDate: Date = new Date()): Array<{ date: Date; dayName: string; dayOfWeek: number; weekStartDate: string }> {
  const days: Array<{ date: Date; dayName: string; dayOfWeek: number; weekStartDate: string }> = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Calculate week_start_date (Sunday of the week containing this date)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - dayOfWeek);
    const weekStartDate = weekStart.toISOString().split('T')[0];
    
    days.push({
      date,
      dayName,
      dayOfWeek,
      weekStartDate,
    });
  }
  
  return days;
}

interface MealAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  weekStartDate: string;
  dayOfWeek: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  onSuccess?: () => void;
}

export function MealAssignmentModal({
  isOpen,
  onClose,
  spaceId,
  weekStartDate,
  dayOfWeek,
  mealType,
  onSuccess,
}: MealAssignmentModalProps) {
  const { user } = useAuth();
  const { getMealSlotsForDay } = useMealSchedule(spaceId);
  const [preparedMeals, setPreparedMeals] = useState<PreparedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<PreparedMeal | null>(null);
  const [servingsUsed, setServingsUsed] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPreparedMeals();
    }
  }, [isOpen, spaceId]);

  const loadPreparedMeals = async () => {
    setLoading(true);
    try {
      const meals = await getPreparedMeals(spaceId, false); // Exclude exhausted
      setPreparedMeals(meals);
    } catch (error) {
      console.error('Failed to load prepared meals:', error);
      showToast('error', 'Failed to load prepared meals');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!user || !selectedMeal) return;

    if (servingsUsed <= 0) {
      showToast('error', 'Servings must be greater than 0');
      return;
    }

    if (servingsUsed > selectedMeal.remaining_servings) {
      showToast('error', `Only ${selectedMeal.remaining_servings} servings remaining`);
      return;
    }

    setSaving(true);
    try {
      const input: CreateMealAssignmentInput = {
        prepared_meal_id: selectedMeal.id,
        space_id: spaceId,
        week_start_date: weekStartDate,
        day_of_week: dayOfWeek,
        meal_type: mealType,
        servings_used: servingsUsed,
      };

      await createMealAssignment(user.id, input);
      
      showToast('success', `Assigned ${servingsUsed} serving${servingsUsed !== 1 ? 's' : ''} of ${selectedMeal.recipe_name}`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error: any) {
      console.error('Failed to assign meal:', error);
      showToast('error', error.message || 'Failed to assign meal');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Get day info for display
  const today = new Date();
  const displayDays = getNext7Days(today);
  const dayInfo = displayDays.find(d => d.dayOfWeek === dayOfWeek);
  const dateStr = dayInfo?.date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  }) || '';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 safe-top safe-bottom">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package size={24} className="text-white" />
              <h2 className="text-xl font-bold text-white">Assign Prepared Meal</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-xl p-2 transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
          <div className="mt-2 text-orange-100 text-sm">
            {dayInfo?.dayName} {dateStr} • {mealType}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : preparedMeals.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">No prepared meals available</p>
              <p className="text-sm text-gray-500">
                Create a meal prep from a recipe to assign it to meal slots
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select Prepared Meal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Prepared Meal
                </label>
                <div className="space-y-2">
                  {preparedMeals.map((meal) => (
                    <button
                      key={meal.id}
                      onClick={() => {
                        setSelectedMeal(meal);
                        setServingsUsed(Math.min(1, meal.remaining_servings));
                      }}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedMeal?.id === meal.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{meal.recipe_name}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Users size={14} />
                              <span>{meal.remaining_servings} remaining</span>
                            </div>
                            {meal.prepared_at && (
                              <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                <span>
                                  {new Date(meal.prepared_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                          {meal.notes && (
                            <p className="text-xs text-gray-500 mt-1">{meal.notes}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Servings Input */}
              {selectedMeal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How many servings?
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max={selectedMeal.remaining_servings}
                    step="0.5"
                    value={servingsUsed}
                    onChange={(e) => setServingsUsed(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-lg font-semibold"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: {selectedMeal.remaining_servings} servings
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={saving || !selectedMeal || servingsUsed <= 0 || servingsUsed > (selectedMeal?.remaining_servings || 0)}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Package size={18} />
                Assign Meal
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
