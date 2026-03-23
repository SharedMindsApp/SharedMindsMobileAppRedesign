import { useState, useEffect } from 'react';
import { Target, Plus, X } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { getDomains } from '../../../lib/guardrails';
import { getDomainConfig } from '../../../lib/guardrails/domainConfig';
import type { Domain } from '../../../lib/guardrailsTypes';

// Domain-aware goal suggestions
const GOAL_SUGGESTIONS: Record<string, string[]> = {
  health: [
    'Improve overall fitness',
    'Increase energy levels',
    'Lose weight',
    'Build strength',
    'Improve mobility',
    'Reduce stress',
    'Create sustainable habits',
    'Improve confidence',
  ],
  personal: [
    'Improve work-life balance',
    'Build better relationships',
    'Increase financial security',
    'Develop new skills',
    'Create more time for hobbies',
    'Improve mental wellbeing',
    'Enhance personal growth',
    'Achieve life balance',
  ],
  work: [
    'Advance career',
    'Increase productivity',
    'Develop leadership skills',
    'Improve work satisfaction',
    'Build professional network',
    'Learn new technologies',
    'Achieve better work-life balance',
    'Increase income',
  ],
  startup: [
    'Launch successful product',
    'Build sustainable business',
    'Achieve product-market fit',
    'Grow customer base',
    'Increase revenue',
    'Build strong team',
    'Create scalable operations',
    'Establish brand presence',
  ],
  creative: [
    'Complete creative project',
    'Share work with audience',
    'Develop creative skills',
    'Build creative portfolio',
    'Express artistic vision',
    'Connect with creative community',
    'Monetize creative work',
    'Explore new mediums',
  ],
  passion: [
    'Master new skill',
    'Complete passion project',
    'Share passion with others',
    'Build community around interest',
    'Turn passion into career',
    'Explore new aspects',
    'Create meaningful work',
    'Achieve personal fulfillment',
  ],
};

export function WizardStepGoals() {
  const { state, setAspirationalGoals, setPrimaryAspirationalGoal } = useProjectWizard();
  const [domain, setDomain] = useState<Domain | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(state.aspirationalGoals || []);
  const [customGoal, setCustomGoal] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(state.primaryAspirationalGoal || null);

  // Load domain to get goal suggestions
  useEffect(() => {
    async function loadDomain() {
      if (state.domainId) {
        try {
          const domains = await getDomains();
          const selectedDomain = domains.find(d => d.id === state.domainId);
          setDomain(selectedDomain || null);
        } catch (error) {
          console.error('Failed to load domain:', error);
        }
      }
    }

    loadDomain();
  }, [state.domainId]);

  // Get goal suggestions for the domain
  const domainGoals = domain ? GOAL_SUGGESTIONS[domain.name.toLowerCase()] || GOAL_SUGGESTIONS.personal : GOAL_SUGGESTIONS.personal;

  // Sync state when goals change
  useEffect(() => {
    setAspirationalGoals(selectedGoals);
  }, [selectedGoals, setAspirationalGoals]);

  useEffect(() => {
    setPrimaryAspirationalGoal(primaryGoal);
  }, [primaryGoal, setPrimaryAspirationalGoal]);

  const handleToggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      // Deselect
      const newGoals = selectedGoals.filter(g => g !== goal);
      setSelectedGoals(newGoals);
      // If this was the primary goal, clear it
      if (primaryGoal === goal) {
        setPrimaryGoal(null);
      }
    } else {
      // Select (if under limit)
      if (selectedGoals.length < 5) {
        setSelectedGoals([...selectedGoals, goal]);
      }
    }
  };

  const handleAddCustomGoal = () => {
    if (customGoal.trim() && selectedGoals.length < 5 && !selectedGoals.includes(customGoal.trim())) {
      setSelectedGoals([...selectedGoals, customGoal.trim()]);
      setCustomGoal('');
    }
  };

  const handleRemoveGoal = (goal: string) => {
    const newGoals = selectedGoals.filter(g => g !== goal);
    setSelectedGoals(newGoals);
    if (primaryGoal === goal) {
      setPrimaryGoal(null);
    }
  };

  const handleSetPrimary = (goal: string) => {
    setPrimaryGoal(primaryGoal === goal ? null : goal);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">
          Choose What This Project Is For
        </h2>
        <p className="text-gray-600 text-base md:text-lg mb-3 md:mb-4 px-2">
          These aren't tasks or targets.
          <br />
          They're the reasons you're creating this project.
          <br className="hidden md:block" />
          <span className="text-xs md:text-sm text-gray-500">You can change them later.</span>
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Goal Selection Chips */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Select up to 5 goals (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {domainGoals.map((goal) => {
              const isSelected = selectedGoals.includes(goal);
              const isDisabled = !isSelected && selectedGoals.length >= 5;
              
              return (
                <button
                  key={goal}
                  type="button"
                  onClick={() => handleToggleGoal(goal)}
                  disabled={isDisabled}
                  className={`
                    px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all min-h-[36px] md:min-h-[40px]
                    ${isSelected
                      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                      : isDisabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }
                  `}
                >
                  {goal}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Goal Input */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Add your own goal (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomGoal();
                }
              }}
              placeholder="Enter a custom goal..."
              disabled={selectedGoals.length >= 5}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={handleAddCustomGoal}
              disabled={!customGoal.trim() || selectedGoals.length >= 5 || selectedGoals.includes(customGoal.trim())}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          {selectedGoals.length >= 5 && (
            <p className="mt-2 text-sm text-gray-500">
              You've reached the maximum of 5 goals. Remove one to add another.
            </p>
          )}
        </div>

        {/* Selected Goals Display */}
        {selectedGoals.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Selected Goals ({selectedGoals.length}/5)
            </label>
            <div className="space-y-2">
              {selectedGoals.map((goal) => (
                <div
                  key={goal}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(goal)}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                        ${primaryGoal === goal
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Target className={`w-4 h-4 ${primaryGoal === goal ? 'text-white' : 'text-gray-500'}`} />
                      {primaryGoal === goal ? 'Most Important' : 'Mark as Most Important'}
                    </button>
                    <span className="text-gray-900 flex-1">{goal}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveGoal(goal)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove goal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {selectedGoals.length > 1 && (
              <p className="mt-3 text-sm text-gray-500">
                💡 <strong>Tip:</strong> Mark one goal as "Most Important" to help focus your project.
              </p>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <div className="font-semibold mb-1">What are aspirational goals?</div>
              <p className="text-blue-800">
                These are the reasons your project exists—the positive changes you want it to bring to your life.
                They're about motivation and direction, not specific tasks or metrics. You can always refine these later.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

