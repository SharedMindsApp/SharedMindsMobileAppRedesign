/**
 * Reconfiguration Modal
 * 
 * Allows users to update their movement profile:
 * - Add/remove domains
 * - Update domain details
 * - Update movement level
 */

import { useState, useEffect } from 'react';
import { X, Loader2, Check as CheckIcon, Eye, EyeOff } from 'lucide-react';
import { Dumbbell, Footprints, Bike, Waves, Users, Target, Sword, Flower2, Heart, Activity } from 'lucide-react';
import { ReconfigurationService } from '../../lib/fitnessTracker/reconfigurationService';
import type { UserMovementProfile, MovementDomain, DomainDetail } from '../../lib/fitnessTracker/types';
import { showToast } from '../Toast';
import { getOptionIcon, getOptionIconColor } from '../../lib/fitnessTracker/optionIcons';
import { getSportEmoji } from '../../lib/fitnessTracker/sportEmojis';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import * as LucideIcons from 'lucide-react';

type ReconfigurationModalProps = {
  profile: UserMovementProfile;
  isOpen: boolean;
  onClose: () => void;
  onReconfigured: (newProfile: UserMovementProfile) => void;
};

export function ReconfigurationModal({
  profile,
  isOpen,
  onClose,
  onReconfigured,
}: ReconfigurationModalProps) {
  const [selectedDomains, setSelectedDomains] = useState<MovementDomain[]>(profile.primaryDomains || []);
  const [domainDetails, setDomainDetails] = useState<Record<MovementDomain, DomainDetail>>(profile.domainDetails || {});
  const [movementLevel, setMovementLevel] = useState<string>(profile.movementLevel || 'regular');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'domains' | 'details' | 'level'>('domains');
  const { getCustomOverride, updateCustomOverride } = useUIPreferences();

  const reconfigurationService = new ReconfigurationService();

  useEffect(() => {
    if (isOpen) {
      setSelectedDomains(profile.primaryDomains || []);
      setDomainDetails(profile.domainDetails || {});
      setMovementLevel(profile.movementLevel || 'regular');
      setStep('domains');
    }
  }, [isOpen, profile]);

  const movementDomains: Array<{ id: MovementDomain; label: string; icon: string; IconComponent: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'gym', label: 'Gym Training', icon: 'Dumbbell', IconComponent: Dumbbell },
    { id: 'running', label: 'Running / Walking', icon: 'Footprints', IconComponent: Footprints },
    { id: 'cycling', label: 'Cycling', icon: 'Bike', IconComponent: Bike },
    { id: 'swimming', label: 'Swimming', icon: 'Waves', IconComponent: Waves },
    { id: 'team_sports', label: 'Team Sports', icon: 'Users', IconComponent: Users },
    { id: 'individual_sports', label: 'Individual Sports', icon: 'Target', IconComponent: Target },
    { id: 'martial_arts', label: 'Martial Arts', icon: 'Sword', IconComponent: Sword },
    { id: 'yoga', label: 'Yoga / Mobility', icon: 'Flower2', IconComponent: Flower2 },
    { id: 'rehab', label: 'Rehab / Physio', icon: 'Heart', IconComponent: Heart },
    { id: 'other', label: 'Other', icon: 'Activity', IconComponent: Activity },
  ];

  const handleDomainToggle = (domain: MovementDomain) => {
    if (selectedDomains.includes(domain)) {
      setSelectedDomains(selectedDomains.filter(d => d !== domain));
    } else {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const handleDomainDetailUpdate = (domain: MovementDomain, detail: DomainDetail) => {
    setDomainDetails({
      ...domainDetails,
      [domain]: detail,
    });
  };

  const handleSubmit = async () => {
    if (selectedDomains.length === 0) {
      showToast('Please select at least one movement type', 'error');
      return;
    }

    try {
      setLoading(true);

      const result = await reconfigurationService.reconfigureTracker(profile.userId, {
        primaryDomains: selectedDomains,
        domainDetails,
        movementLevel: movementLevel as any,
      });

      if (result.success) {
        showToast(
          `Reconfiguration complete! ${result.trackersCreated > 0 ? `Created ${result.trackersCreated} new tracker${result.trackersCreated > 1 ? 's' : ''}.` : ''} ${result.trackersRemoved > 0 ? `Archived ${result.trackersRemoved} tracker${result.trackersRemoved > 1 ? 's' : ''}.` : ''}`,
          'success'
        );
        onReconfigured(result.newProfile);
        onClose();
      }
    } catch (error) {
      console.error('Reconfiguration failed:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to reconfigure tracker',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] flex flex-col">
        {/* Fixed Header - Not scrollable */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Update Movement Profile</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Adjust your movement preferences</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            disabled={loading}
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Tracker Visibility Settings */}
            {!getCustomOverride('bodyTransformationVisible', true) && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 sm:mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <EyeOff className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Body Transformation tracker is hidden</p>
                      <p className="text-xs text-gray-600">Restore it to track how your body adapts to training</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await updateCustomOverride('bodyTransformationVisible', true);
                      showToast('success', 'Body Transformation tracker restored');
                      window.dispatchEvent(new CustomEvent('body-transformation-visibility-changed'));
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Eye size={16} />
                    <span>Restore</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step Indicator */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
            <button
              onClick={() => setStep('domains')}
              className={`px-3 py-1 rounded ${step === 'domains' ? 'bg-blue-100 text-blue-700 font-medium' : ''}`}
              disabled={loading}
            >
              1. Domains
            </button>
            <span>→</span>
            <button
              onClick={() => setStep('details')}
              className={`px-3 py-1 rounded ${step === 'details' ? 'bg-blue-100 text-blue-700 font-medium' : ''}`}
              disabled={loading}
            >
              2. Details
            </button>
            <span>→</span>
            <button
              onClick={() => setStep('level')}
              className={`px-3 py-1 rounded ${step === 'level' ? 'bg-blue-100 text-blue-700 font-medium' : ''}`}
              disabled={loading}
            >
              3. Level
            </button>
          </div>

          {/* Step 1: Domain Selection */}
          {step === 'domains' && (
            <DomainSelectionStep
              domains={movementDomains}
              selectedDomains={selectedDomains}
              onToggle={handleDomainToggle}
              onNext={() => {
                if (selectedDomains.length > 0) {
                  setStep('details');
                } else {
                  showToast('Please select at least one movement type', 'error');
                }
              }}
            />
          )}

          {/* Step 2: Domain Details */}
          {step === 'details' && (
            <DomainDetailsStep
              selectedDomains={selectedDomains}
              domainDetails={domainDetails}
              onUpdate={handleDomainDetailUpdate}
              onBack={() => setStep('domains')}
              onNext={() => setStep('level')}
            />
          )}

          {/* Step 3: Level Selection */}
          {step === 'level' && (
            <LevelSelectionStep
              movementLevel={movementLevel}
              onSelect={setMovementLevel}
              onBack={() => setStep('details')}
              onSubmit={handleSubmit}
              loading={loading}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Domain Selection Step
function DomainSelectionStep({
  domains,
  selectedDomains,
  onToggle,
  onNext,
}: {
  domains: Array<{ id: MovementDomain; label: string; IconComponent: React.ComponentType<{ size?: number; className?: string }> }>;
  selectedDomains: MovementDomain[];
  onToggle: (domain: MovementDomain) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Movement Types</h3>
        <p className="text-sm text-gray-600">Select the types of movement you do (or want to track)</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {domains.map(domain => {
          const Icon = domain.IconComponent;
          const isSelected = selectedDomains.includes(domain.id);
          return (
            <button
              key={domain.id}
              onClick={() => onToggle(domain.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left relative ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <CheckIcon className="w-5 h-5 text-blue-600" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                <Icon size={20} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
                <div className="font-medium text-gray-900">{domain.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={selectedDomains.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Details
        </button>
      </div>
    </div>
  );
}

// Domain Details Step
function DomainDetailsStep({
  selectedDomains,
  domainDetails,
  onUpdate,
  onBack,
  onNext,
}: {
  selectedDomains: MovementDomain[];
  domainDetails: Record<MovementDomain, DomainDetail>;
  onUpdate: (domain: MovementDomain, detail: DomainDetail) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const getDomainQuestions = (domain: MovementDomain) => {
    switch (domain) {
      case 'gym':
        return {
          question: 'What do you usually do at the gym?',
          options: ['Cardio machines', 'Free weights', 'Machines', 'Classes', 'Mixed / varies'],
        };
      case 'running':
        return {
          question: 'What does this usually look like?',
          options: ['Casual walking', 'Running (easy pace)', 'Running (structured training)', 'Trail running', 'Mixed'],
        };
      case 'team_sports':
        return {
          question: 'What sports do you play?',
          options: [
            'Football / Soccer',
            'American Football',
            'Basketball',
            'Volleyball',
            'Beach Volleyball',
            'Handball',
            'Water Polo',
            'Rugby Union',
            'Rugby League',
            'Australian Rules Football',
            'Gaelic Football',
            'Ice Hockey',
            'Field Hockey',
            'Roller Hockey',
            'Baseball',
            'Softball',
            'Cricket',
            'Ultimate Frisbee',
            'Lacrosse',
            'Polo',
            'Netball',
            'Dodgeball',
            'Rowing (Team)',
            'Roller Derby',
            'Korfball',
            'Other',
          ],
        };
      case 'individual_sports':
        return {
          question: 'What sports do you play?',
          options: [
            // Most Popular Individual Sports
            'Tennis',
            'Golf',
            'Long Distance Running',
            'Road Cycling',
            'Marathon Running',
            'Trail Running',
            'Weightlifting',
            'CrossFit',
            // Very Popular Sports & Fitness
            'Table Tennis',
            'Badminton',
            'Mountain Biking',
            'Rock Climbing',
            'Open Water Swimming',
            'HIIT',
            'Pilates',
            'Calisthenics',
            // Popular Racket Sports
            'Squash',
            'Pickleball',
            'Racquetball',
            'Padel',
            // Popular Running & Endurance (Marathon already in most popular)
            'Ultra Running',
            'Track & Field',
            'Sprinting',
            'Cross-Country Running',
            // Popular Water Sports
            'Surfing',
            'Stand Up Paddleboarding (SUP)',
            'Open Water Swimming',
            'Diving',
            // Popular Winter Sports
            'Snowboarding',
            'Alpine Skiing',
            'Figure Skating',
            // Popular Fitness Classes
            'Zumba',
            'Aerobics',
            'Circuit Training',
            'Functional Fitness',
            'Step Aerobics',
            // Popular Action Sports
            'Skateboarding',
            'Bouldering',
            'Parkour',
            // Popular Strength & Conditioning
            'Powerlifting',
            'Kettlebell Training',
            'TRX / Suspension Training',
            // Cycling Variants
            'Indoor Cycling (Spin)',
            'BMX',
            'Track Cycling',
            // Multi-Sport
            'Triathlon',
            'Obstacle Course Racing (OCR)',
            // Other Water Sports
            'Wakeboarding',
            'Bodyboarding',
            'Kitesurfing',
            'Water Aerobics',
            // Other Winter Sports
            'Cross-Country Skiing',
            'Speed Skating',
            // Other Fitness Activities
            'Step Aerobics',
            'Dance Fitness',
            'Strongman',
            'Freerunning',
            // Target Sports
            'Archery',
            'Shooting',
            'Darts',
            // Track & Field Events
            'High Jump',
            'Long Jump',
            'Pole Vault',
            // Action Sports
            'Roller Skating',
            'Inline Skating',
            // Multi-Sport (Other)
            'Duathlon',
            'Adventure Racing',
            // Equestrian
            'Equestrian',
            'Riding',
            // Other
            'Other',
          ],
        };
      case 'martial_arts':
        return {
          question: 'What disciplines do you train?',
          options: [
            'Brazilian Jiu-Jitsu (BJJ)',
            'Boxing',
            'Wrestling',
            'Muay Thai',
            'Kickboxing',
            'Judo',
            'Mixed / MMA',
            'Other'
          ],
        };
      default:
        return {
          question: 'Tell us about your ' + domain,
          options: [],
        };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Tell Us More</h3>
        <p className="text-xs sm:text-sm text-gray-600">Update details for your selected movement types</p>
      </div>

      {selectedDomains.map(domain => {
        const questions = getDomainQuestions(domain);
        const currentDetail = domainDetails[domain] || {};
        const isMultiSelectField = domain === 'martial_arts' || domain === 'team_sports' || domain === 'individual_sports';
        const fieldName = 
          domain === 'martial_arts' ? 'disciplines' : 
          domain === 'team_sports' ? 'sports' : 
          domain === 'individual_sports' ? 'individualSports' : 
          'activities';
        const currentValues = currentDetail[fieldName] || [];

        const iconColor = getOptionIconColor(domain, '');

        return (
          <div key={domain} className="p-3 sm:p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">{questions.question}</h4>
            {questions.options.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-5">
                {questions.options.map(option => {
                  const isSelected = currentValues.includes(option);
                  const emoji = getSportEmoji(option);
                  const optionColor = getOptionIconColor(domain, option);

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          onUpdate(domain, {
                            ...currentDetail,
                            [fieldName]: currentValues.filter((a: string) => a !== option),
                          });
                        } else {
                          onUpdate(domain, { ...currentDetail, [fieldName]: [...currentValues, option] });
                        }
                      }}
                    className={`
                      relative flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all duration-200
                      ${isSelected 
                        ? 'shadow-md scale-[1.02]' 
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-100 hover:shadow-sm'
                      }
                      active:scale-[0.98]
                    `}
                      style={{
                        borderColor: isSelected ? optionColor : undefined,
                        backgroundColor: isSelected ? `${optionColor}15` : undefined,
                      }}
                    >
                      <div 
                        className={`text-2xl sm:text-3xl mb-1.5 sm:mb-2 transition-transform ${isSelected ? 'scale-110' : ''}`}
                        role="img"
                        aria-label={option}
                      >
                        {emoji}
                      </div>
                      <span className={`text-[10px] sm:text-xs font-medium text-center leading-tight px-0.5 sm:px-1 ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                        {option}
                      </span>
                      {isSelected && (
                        <div 
                          className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: optionColor }}
                        >
                          <CheckIcon size={10} className="sm:w-3 sm:h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                How often does this show up when life is normal?
              </label>
              <select
                value={currentDetail.frequency || ''}
                onChange={(e) => {
                  onUpdate(domain, {
                    ...currentDetail,
                    frequency: e.target.value as any,
                  });
                }}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg"
              >
                <option value="">Select frequency</option>
                <option value="rarely">Rarely</option>
                <option value="occasionally">Occasionally</option>
                <option value="regularly">Regularly</option>
                <option value="core_activity">Core activity</option>
              </select>
            </div>
          </div>
        );
      })}

      <div className="flex justify-between pt-3 sm:pt-4 gap-2 sm:gap-0">
        <button
          onClick={onBack}
          className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Next: Level
        </button>
      </div>
    </div>
  );
}

// Level Selection Step
function LevelSelectionStep({
  movementLevel,
  onSelect,
  onBack,
  onSubmit,
  loading,
}: {
  movementLevel: string;
  onSelect: (level: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const levels = [
    {
      value: 'casual',
      label: 'Casual',
      description: 'I move when I feel like it, no structure',
    },
    {
      value: 'regular',
      label: 'Regular',
      description: 'I try to stay consistent',
    },
    {
      value: 'structured',
      label: 'Structured',
      description: 'I follow plans or have goals',
    },
    {
      value: 'competitive',
      label: 'Competitive',
      description: 'I train for performance',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Movement Level</h3>
        <p className="text-sm text-gray-600">How would you describe your relationship with movement?</p>
      </div>

      <div className="space-y-3">
        {levels.map(level => (
          <button
            key={level.value}
            onClick={() => onSelect(level.value)}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              movementLevel === level.value
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900">{level.label}</div>
            <div className="text-sm text-gray-600 mt-1">{level.description}</div>
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Updating...' : 'Update Profile'}
        </button>
      </div>
    </div>
  );
}
