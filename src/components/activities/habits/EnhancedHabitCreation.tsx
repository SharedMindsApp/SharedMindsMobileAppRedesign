/**
 * Enhanced Habit Creation Component
 * 
 * Combines category-based discovery, free-text input, and intelligent suggestions
 * in a colorful, intuitive interface.
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Sparkles, 
  X, 
  CheckCircle2, 
  Calendar,
  PenTool,
  Search,
  Lightbulb,
  User,
  Home,
  Users,
  ChevronDown
} from 'lucide-react';
import { HABIT_CATEGORIES, getSuggestedCategories, type HabitCategory } from '../../../lib/habits/habitCategories';
import { createHabitActivity, listHabits, type HabitTarget } from '../../../lib/habits/habitsService';
import { getIntelligentHabitSuggestions } from '../../../lib/habits/habitSuggestionEngine';
import { scheduleHabit, type HabitScheduleConfig } from '../../../lib/habits/habitScheduleService';
import { HabitScheduleSheet } from './HabitScheduleSheet';
import { HabitTargetEditor } from './HabitTargetEditor';
import { TrackerOwnershipSelector } from './TrackerOwnershipSelector';
import { CollaborationModeSelector } from './CollaborationModeSelector';
import type { Activity, CollaborationMode } from '../../../lib/activities/activityTypes';

// Color mapping for categories
const CATEGORY_COLORS: Record<string, {
  gradient: string;
  border: string;
  iconBg: string;
  icon: string;
  button: string;
  buttonHover: string;
  bg: string;
}> = {
  amber: {
    gradient: 'from-amber-50 via-orange-50/50 to-amber-100/30',
    border: 'border-amber-200',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    icon: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700',
    buttonHover: 'hover:bg-amber-700',
    bg: 'bg-amber-50/50',
  },
  indigo: {
    gradient: 'from-indigo-50 via-blue-50/50 to-indigo-100/30',
    border: 'border-indigo-200',
    iconBg: 'bg-gradient-to-br from-indigo-400 to-blue-500',
    icon: 'text-indigo-600',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    buttonHover: 'hover:bg-indigo-700',
    bg: 'bg-indigo-50/50',
  },
  emerald: {
    gradient: 'from-emerald-50 via-green-50/50 to-emerald-100/30',
    border: 'border-emerald-200',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-green-500',
    icon: 'text-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    buttonHover: 'hover:bg-emerald-700',
    bg: 'bg-emerald-50/50',
  },
  purple: {
    gradient: 'from-purple-50 via-violet-50/50 to-purple-100/30',
    border: 'border-purple-200',
    iconBg: 'bg-gradient-to-br from-purple-400 to-violet-500',
    icon: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    buttonHover: 'hover:bg-purple-700',
    bg: 'bg-purple-50/50',
  },
  rose: {
    gradient: 'from-rose-50 via-pink-50/50 to-rose-100/30',
    border: 'border-rose-200',
    iconBg: 'bg-gradient-to-br from-rose-400 to-pink-500',
    icon: 'text-rose-600',
    button: 'bg-rose-600 hover:bg-rose-700',
    buttonHover: 'hover:bg-rose-700',
    bg: 'bg-rose-50/50',
  },
  slate: {
    gradient: 'from-slate-50 via-gray-50/50 to-slate-100/30',
    border: 'border-slate-200',
    iconBg: 'bg-gradient-to-br from-slate-400 to-gray-500',
    icon: 'text-slate-600',
    button: 'bg-slate-600 hover:bg-slate-700',
    buttonHover: 'hover:bg-slate-700',
    bg: 'bg-slate-50/50',
  },
  gray: {
    gradient: 'from-gray-50 via-slate-50/50 to-gray-100/30',
    border: 'border-gray-200',
    iconBg: 'bg-gradient-to-br from-gray-400 to-slate-500',
    icon: 'text-gray-600',
    button: 'bg-gray-600 hover:bg-gray-700',
    buttonHover: 'hover:bg-gray-700',
    bg: 'bg-gray-50/50',
  },
  green: {
    gradient: 'from-green-50 via-emerald-50/50 to-green-100/30',
    border: 'border-green-200',
    iconBg: 'bg-gradient-to-br from-green-400 to-emerald-500',
    icon: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
    buttonHover: 'hover:bg-green-700',
    bg: 'bg-green-50/50',
  },
};

interface EnhancedHabitCreationProps {
  userId: string;
  existingHabits: Activity[];
  onHabitCreated: () => void;
  activeDate?: string;
  compact?: boolean;
}

export function EnhancedHabitCreation({
  userId,
  existingHabits,
  onHabitCreated,
  activeDate,
  compact = false,
}: EnhancedHabitCreationProps) {
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | null>(null);
  const [freeText, setFreeText] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  const [intelligentSuggestions, setIntelligentSuggestions] = useState<Array<{
    title: string;
    description: string;
    reason?: string;
    source?: string;
  }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [categories, setCategories] = useState<HabitCategory[]>(HABIT_CATEGORIES);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [justCreatedHabit, setJustCreatedHabit] = useState<Activity | null>(null);
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<HabitTarget | null>(null);
  const [showTargetEditor, setShowTargetEditor] = useState(false);
  const [selectedOwnership, setSelectedOwnership] = useState<{
    ownerType: 'user' | 'household' | 'team';
    householdId?: string;
    teamId?: string;
    teamGroupId?: string;
  }>({ ownerType: 'user' });
  const [showOwnershipSelector, setShowOwnershipSelector] = useState(false);
  const [collaborationMode, setCollaborationMode] = useState<'collaborative' | 'visible' | 'competitive'>('collaborative');
  const [showCollaborationMode, setShowCollaborationMode] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const suggested = await getSuggestedCategories(userId, existingHabits.length);
        setCategories(suggested);
      } catch (error) {
        console.error('[EnhancedHabitCreation] Error loading categories:', error);
        setCategories(HABIT_CATEGORIES);
      }
    };
    loadCategories();
  }, [userId, existingHabits.length]);

  // Load intelligent suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        setLoadingSuggestions(true);
        const suggestions = await getIntelligentHabitSuggestions(userId, existingHabits, {
          date: activeDate,
        });
        setIntelligentSuggestions(suggestions.slice(0, 3)); // Show top 3
      } catch (error) {
        console.error('[EnhancedHabitCreation] Error loading suggestions:', error);
        setIntelligentSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    loadSuggestions();
  }, [userId, existingHabits.length, activeDate]);

  const handleCreateHabit = async (
    title: string, 
    categoryId?: string, 
    shouldSchedule?: boolean,
    target?: HabitTarget | null
  ) => {
    if (!title.trim() || creating) return;

    setCreating(title);
    try {
      const category = categoryId ? HABIT_CATEGORIES.find(c => c.id === categoryId) : null;
      const isBreakHabit = category?.type === 'break';
      
      // Use target if provided, otherwise default to boolean
      const metricType = target?.metricType || 'boolean';
      const metricUnit = target?.unit;
      const targetValue = target?.targetValue;
      const direction = target?.comparison;

      const result = await createHabitActivity(userId, {
        title: title.trim(),
        description: target?.description || undefined,
        polarity: isBreakHabit ? 'break' : 'build',
        metric_type: metricType,
        metric_unit: metricUnit,
        target_value: targetValue,
        direction: direction,
        startDate: new Date().toISOString(),
        repeatType: 'daily',
        autoGenerateTags: true,
        // Ownership
        owner_type: selectedOwnership.ownerType,
        household_owner_id: selectedOwnership.householdId,
        team_owner_id: selectedOwnership.teamId,
        team_group_id: selectedOwnership.teamGroupId,
        // Collaboration mode (only for household/team habits)
        collaboration_mode: selectedOwnership.ownerType !== 'user' ? collaborationMode : undefined,
      });

      // Get the created habit
      const habits = await listHabits(userId);
      const newHabit = habits.find(h => h.id === result.activityId);

      setFreeText('');
      
      // If shouldSchedule, open schedule sheet
      if (shouldSchedule && newHabit) {
        setJustCreatedHabit(newHabit);
        setShowScheduleSheet(true);
      } else {
        onHabitCreated();
      }
    } catch (error) {
      console.error('[EnhancedHabitCreation] Error creating habit:', error);
      alert('Failed to create habit. Please try again.');
    } finally {
      setCreating(null);
    }
  };

  const handleFreeTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (freeText.trim()) {
      handleCreateHabit(freeText.trim(), undefined, false, selectedTarget);
      setSelectedTarget(null); // Reset after creation
    }
  };

  // If category is selected, show category picker panel
  if (selectedCategory) {
    return (
      <CategoryPickerPanel
        category={selectedCategory}
        userId={userId}
        onHabitCreated={() => {
          onHabitCreated();
          setSelectedCategory(null);
        }}
        onClose={() => setSelectedCategory(null)}
        compact={compact}
        isMobile={isMobile}
      />
    );
  }

  return (
    <div className={isMobile ? 'mb-4' : 'mb-6'}>
      {/* Free Text Input - Always visible */}
      <div className="mb-4">
        <form onSubmit={handleFreeTextSubmit} className="relative">
          <div className="relative">
            <PenTool 
              size={isMobile ? 16 : 18} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
            />
            <input
              ref={inputRef}
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Type a habit you want to track..."
              className={`
                w-full
                ${isMobile ? 'pl-10 pr-32 py-2.5 text-sm' : 'pl-12 pr-40 py-3 text-base'}
                rounded-xl
                border-2 border-gray-200
                focus:border-indigo-400
                focus:ring-2 focus:ring-indigo-100
                bg-white
                text-gray-900
                placeholder:text-gray-400
                transition-all duration-200
              `}
              disabled={!!creating}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (freeText.trim()) {
                    handleCreateHabit(freeText.trim(), undefined, true, selectedTarget);
                    setSelectedTarget(null); // Reset after creation
                  }
                }}
                disabled={!freeText.trim() || !!creating}
                className={`
                  ${isMobile ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-1.5 text-xs'}
                  rounded-lg
                  font-medium
                  text-indigo-600
                  bg-indigo-50
                  hover:bg-indigo-100
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  flex items-center gap-1
                  active:scale-[0.98]
                `}
                title="Add and schedule"
              >
                <Calendar size={isMobile ? 10 : 12} />
              </button>
              <button
                type="submit"
                disabled={!freeText.trim() || !!creating}
                className={`
                  ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}
                  rounded-lg
                  font-medium
                  text-white
                  bg-gradient-to-r from-indigo-500 to-purple-600
                  hover:from-indigo-600 hover:to-purple-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  flex items-center gap-1.5
                  active:scale-[0.98]
                `}
              >
                {creating === freeText.trim() ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus size={isMobile ? 12 : 14} />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Progressive Target Editor - Only shown when user has entered text */}
          {freeText.trim() && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Ownership Selector */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowOwnershipSelector(!showOwnershipSelector)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  <span className="flex items-center gap-2">
                    {selectedOwnership.ownerType === 'user' && <User size={16} />}
                    {selectedOwnership.ownerType === 'household' && <Home size={16} />}
                    {selectedOwnership.ownerType === 'team' && <Users size={16} />}
                    <span>
                      {selectedOwnership.ownerType === 'user' && 'Personal'}
                      {selectedOwnership.ownerType === 'household' && 'Household'}
                      {selectedOwnership.ownerType === 'team' && 'Team'}
                    </span>
                  </span>
                  <ChevronDown size={16} className={showOwnershipSelector ? 'rotate-180' : ''} />
                </button>
                {showOwnershipSelector && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <TrackerOwnershipSelector
                      userId={userId}
                      selectedOwnerType={selectedOwnership.ownerType}
                      selectedHouseholdId={selectedOwnership.householdId}
                      selectedTeamId={selectedOwnership.teamId}
                      selectedTeamGroupId={selectedOwnership.teamGroupId}
                      onOwnershipChange={(ownership) => {
                        setSelectedOwnership(ownership);
                        // Show collaboration mode selector when household/team is selected
                        if (ownership.ownerType !== 'user') {
                          setShowCollaborationMode(true);
                        } else {
                          setShowCollaborationMode(false);
                        }
                      }}
                      isMobile={isMobile}
                    />
                  </div>
                )}
              </div>
              
              {/* Collaboration Mode Selector - Only for household/team habits */}
              {selectedOwnership.ownerType !== 'user' && (
                <div className="mt-3">
                  {showCollaborationMode ? (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <CollaborationModeSelector
                        selectedMode={collaborationMode}
                        onModeChange={setCollaborationMode}
                        isMobile={isMobile}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCollaborationMode(true)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                    >
                      <span className="flex items-center gap-2">
                        <span>How should this habit work?</span>
                      </span>
                      <ChevronDown size={16} />
                    </button>
                  )}
                </div>
              )}
              
              {/* Target Editor */}
              <HabitTargetEditor
                defaultTarget={undefined} // Could check if habit title matches a suggested habit with defaultTarget
                onTargetChange={setSelectedTarget}
                isMobile={isMobile}
              />
            </div>
          )}
        </form>
      </div>

      {/* Intelligent Suggestions (if available) */}
      {intelligentSuggestions.length > 0 && !loadingSuggestions && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={isMobile ? 14 : 16} className="text-amber-500" />
            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 font-medium`}>
              Suggestions for you
            </p>
          </div>
          <div className={`flex flex-wrap ${isMobile ? 'gap-2' : 'gap-2.5'}`}>
            {intelligentSuggestions.map((suggestion, index) => (
              <button
                key={`intelligent-${index}`}
                onClick={() => {
                  // Check if suggestion has a defaultTarget
                  const suggestedHabit = categories
                    .flatMap(c => c.suggestedHabits)
                    .find(sh => sh.title === suggestion.title);
                  handleCreateHabit(suggestion.title, undefined, false, suggestedHabit?.defaultTarget || null);
                }}
                disabled={!!creating}
                className={`
                  group
                  inline-flex items-center gap-2
                  ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'}
                  rounded-lg
                  bg-gradient-to-r from-amber-50 to-orange-50
                  border border-amber-200
                  hover:border-amber-300
                  hover:from-amber-100 hover:to-orange-100
                  text-gray-700
                  font-medium
                  transition-all duration-200
                  hover:shadow-sm
                  disabled:opacity-50 disabled:cursor-not-allowed
                  animate-in fade-in slide-in-from-left-2
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Sparkles size={isMobile ? 12 : 14} className="text-amber-500" />
                <span>{suggestion.title}</span>
                {suggestion.reason && (
                  <span className="text-[10px] text-gray-500 hidden group-hover:inline">
                    {suggestion.reason}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Toggle */}
      <div className="mb-3">
        <button
          onClick={() => setShowCategories(!showCategories)}
          className={`
            w-full
            ${isMobile ? 'px-4 py-2.5 text-sm' : 'px-5 py-3 text-base'}
            rounded-xl
            border-2 border-dashed border-gray-300
            hover:border-indigo-400
            bg-gradient-to-r from-white to-gray-50/50
            hover:from-indigo-50/30 hover:to-purple-50/30
            text-gray-700
            font-medium
            transition-all duration-200
            flex items-center justify-center gap-2
            active:scale-[0.98]
          `}
        >
          <Search size={isMobile ? 16 : 18} className="text-gray-500" />
          <span>{showCategories ? 'Hide' : 'Browse'} categories</span>
        </button>
      </div>

      {/* Category Grid */}
      {showCategories && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <p className={`${isMobile ? 'text-[10px] mb-2' : 'text-xs mb-3'} text-gray-500 font-medium`}>
            Choose a category to explore habits
          </p>
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-2.5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'}`}>
            {categories.map((category, index) => {
              const Icon = category.icon;
              const colors = CATEGORY_COLORS[category.accentColor] || CATEGORY_COLORS.gray;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                    group
                    relative
                    ${isMobile ? 'p-3' : 'p-4'}
                    rounded-xl
                    bg-gradient-to-br ${colors.gradient}
                    border ${colors.border}
                    hover:border-opacity-60
                    hover:shadow-md
                    transition-all duration-200
                    animate-in fade-in zoom-in
                    overflow-hidden
                  `}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Icon */}
                  <div className={`
                    ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}
                    rounded-xl
                    ${colors.iconBg}
                    flex items-center justify-center
                    mb-2
                    group-hover:scale-110
                    transition-transform duration-200
                    shadow-sm
                  `}>
                    <Icon size={isMobile ? 18 : 20} className="text-white" />
                  </div>
                  
                  {/* Category Name */}
                  <h3 className={`
                    ${isMobile ? 'text-xs' : 'text-sm'}
                    font-semibold
                    text-gray-900
                    mb-0.5
                    text-left
                  `}>
                    {category.name}
                  </h3>
                  
                  {/* Description */}
                  <p className={`
                    ${isMobile ? 'text-[10px]' : 'text-xs'}
                    text-gray-600
                    line-clamp-2
                    text-left
                  `}>
                    {category.description}
                  </p>

                  {/* Hover indicator */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-xl" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Category Picker Panel (simplified version)
interface CategoryPickerPanelProps {
  category: HabitCategory;
  userId: string;
  onHabitCreated: () => void;
  onClose: () => void;
  compact?: boolean;
  isMobile?: boolean;
}

function CategoryPickerPanel({
  category,
  userId,
  onHabitCreated,
  onClose,
  compact = false,
  isMobile = false,
}: CategoryPickerPanelProps) {
  const [creating, setCreating] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [justCreatedHabit, setJustCreatedHabit] = useState<Activity | null>(null);
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [selectedHabitTitle, setSelectedHabitTitle] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<HabitTarget | null>(null);
  const Icon = category.icon;
  const colors = CATEGORY_COLORS[category.accentColor] || CATEGORY_COLORS.gray;

  const handleAddHabit = async (habitTitle: string, shouldSchedule: boolean = false, target?: HabitTarget | null) => {
    if (creating) return;
    setCreating(habitTitle);
    try {
      const isBreakHabit = category.type === 'break';
      const suggestedHabit = category.suggestedHabits.find(sh => sh.title === habitTitle);
      const habitTarget = target || suggestedHabit?.defaultTarget || null;
      
      const metricType = habitTarget?.metricType || 'boolean';
      const metricUnit = habitTarget?.unit;
      const targetValue = habitTarget?.targetValue;
      const direction = habitTarget?.comparison;
      
      const result = await createHabitActivity(userId, {
        title: habitTitle,
        description: habitTarget?.description || undefined,
        polarity: isBreakHabit ? 'break' : 'build',
        metric_type: metricType,
        metric_unit: metricUnit,
        target_value: targetValue,
        direction: direction,
        startDate: new Date().toISOString(),
        repeatType: 'daily',
        autoGenerateTags: true,
      });
      
      // Get the created habit
      const habits = await listHabits(userId);
      const newHabit = habits.find(h => h.id === result.activityId);
      
      if (shouldSchedule && newHabit) {
        // Open schedule sheet
        setJustCreatedHabit(newHabit);
        setShowScheduleSheet(true);
      } else {
        setJustCreated(habitTitle);
        onHabitCreated();
        setTimeout(() => setJustCreated(null), 2000);
      }
    } catch (error) {
      console.error('[CategoryPickerPanel] Error creating habit:', error);
      alert('Failed to create habit. Please try again.');
    } finally {
      setCreating(null);
    }
  };


  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`${isMobile ? 'p-2' : 'p-2.5'} rounded-xl ${colors.iconBg} shadow-sm`}>
              <Icon size={isMobile ? 18 : 20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`${isMobile ? 'text-base' : compact ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 mb-1`}>
                {category.name}
              </h2>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 leading-relaxed`}>
                {category.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0"
            aria-label="Close"
          >
            <X size={isMobile ? 16 : 18} />
          </button>
        </div>
      </div>

      {/* Suggested Habits List */}
      <div className={`space-y-2 ${isMobile ? 'sm:space-y-2.5' : 'space-y-2.5'}`}>
        {category.suggestedHabits.map((habit, index) => {
          const isCreating = creating === habit.title;
          const wasJustCreated = justCreated === habit.title;

          return (
            <div
              key={index}
              className={`
                group
                ${isMobile ? 'p-3' : 'p-4'}
                rounded-xl
                bg-white
                border-2 ${colors.border}
                hover:border-opacity-60
                hover:shadow-md
                transition-all duration-200
                animate-in fade-in slide-in-from-left-2
                ${wasJustCreated ? `ring-2 ring-offset-2 ${colors.border} ${colors.bg}` : ''}
              `}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900 mb-1`}>
                    {habit.title}
                  </h3>
                  {habit.intent && (
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 leading-relaxed mb-2`}>
                      {habit.intent}
                    </p>
                  )}
                  {habit.reason && (
                    <div className={`inline-flex items-center gap-1.5 ${isMobile ? 'px-2 py-0.5' : 'px-2.5 py-1'} rounded-md ${colors.bg} border ${colors.border}`}>
                      <Sparkles size={isMobile ? 10 : 12} className={colors.icon} />
                      <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} ${colors.icon}`}>{habit.reason}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (selectedHabitTitle === habit.title && selectedTarget !== undefined) {
                      handleAddHabit(habit.title, false, selectedTarget);
                      setSelectedHabitTitle(null);
                      setSelectedTarget(null);
                    } else {
                      setSelectedHabitTitle(habit.title);
                    }
                  }}
                  disabled={isCreating || wasJustCreated}
                  className={`
                    flex-shrink-0
                    ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}
                    rounded-lg
                    font-semibold
                    transition-all duration-200
                    flex items-center gap-2
                    ${
                      wasJustCreated
                        ? `${colors.bg} ${colors.icon} border-2 ${colors.border}`
                        : selectedHabitTitle === habit.title && selectedTarget !== undefined
                        ? 'bg-indigo-600 text-white'
                        : `${colors.button} text-white`
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                    active:scale-[0.98]
                  `}
                >
                  {wasJustCreated ? (
                    <>
                      <CheckCircle2 size={isMobile ? 14 : 16} />
                      <span>Added</span>
                    </>
                  ) : isCreating ? (
                    <>
                      <div className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} border-2 border-white border-t-transparent rounded-full animate-spin`} />
                      <span>Adding...</span>
                    </>
                  ) : selectedHabitTitle === habit.title && selectedTarget !== undefined ? (
                    <>
                      <CheckCircle2 size={isMobile ? 14 : 16} />
                      <span>Confirm</span>
                    </>
                  ) : (
                    <>
                      <Plus size={isMobile ? 14 : 16} />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Progressive Target Editor - Shown when habit is selected */}
              {selectedHabitTitle === habit.title && (
                <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <HabitTargetEditor
                    defaultTarget={habit.defaultTarget}
                    onTargetChange={(target) => {
                      setSelectedTarget(target);
                      // Auto-confirm if target is set
                      if (target) {
                        setTimeout(() => {
                          handleAddHabit(habit.title, false, target);
                          setSelectedHabitTitle(null);
                          setSelectedTarget(null);
                        }, 100);
                      }
                    }}
                    isMobile={isMobile}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {justCreated && (
        <div className={`mt-4 sm:mt-6 ${isMobile ? 'p-3' : 'p-4'} bg-gradient-to-r ${colors.gradient} rounded-xl border-2 ${colors.border} animate-in fade-in slide-in-from-bottom-2`}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={isMobile ? 14 : 16} className={colors.icon} />
            <p className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900`}>
              Habit added!
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onClose}
              className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} bg-white border-2 ${colors.border} rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors`}
            >
              Done
            </button>
            {/* Optional: Add to calendar */}
            <button
              onClick={async () => {
                try {
                  const habits = await listHabits(userId);
                  const newHabit = habits.find(h => h.title === justCreated);
                  if (newHabit) {
                    setJustCreatedHabit(newHabit);
                    setShowScheduleSheet(true);
                  }
                } catch (err) {
                  console.error('[CategoryPickerPanel] Error opening schedule:', err);
                }
              }}
              className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1.5`}
            >
              <Calendar size={isMobile ? 12 : 14} />
              Add to calendar
            </button>
            <button
              onClick={() => setJustCreated(null)}
              className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} font-semibold ${colors.icon} hover:opacity-80 transition-colors`}
            >
              Add another
            </button>
          </div>
        </div>
      )}

      {/* Schedule Sheet for newly created habit */}
      {justCreatedHabit && showScheduleSheet && (
        <HabitScheduleSheet
          isOpen={showScheduleSheet}
          onClose={() => {
            setShowScheduleSheet(false);
            setJustCreatedHabit(null);
            if (justCreated) {
              setJustCreated(null);
            }
            onHabitCreated();
          }}
          habit={justCreatedHabit}
          userId={userId}
          isMobile={isMobile}
          onScheduleUpdated={() => {
            setShowScheduleSheet(false);
            setJustCreatedHabit(null);
            if (justCreated) {
              setJustCreated(null);
            }
            onHabitCreated();
          }}
        />
      )}
    </div>
  );
}

