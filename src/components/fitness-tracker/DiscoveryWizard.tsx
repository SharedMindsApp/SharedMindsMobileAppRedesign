/**
 * Fitness Tracker Discovery Wizard
 * 
 * Multi-step wizard to discover user's movement patterns
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Footprints, Bike, Waves, Users, Target, Sword, Flower2, Heart, Activity, AlertTriangle, Plus, X, Check as CheckIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOptionIcon, getOptionIconColor } from '../../lib/fitnessTracker/optionIcons';
import { getSportEmoji } from '../../lib/fitnessTracker/sportEmojis';
import * as LucideIcons from 'lucide-react';
import { DiscoveryService } from '../../lib/fitnessTracker/discoveryService';
import { FitnessTrackerService } from '../../lib/fitnessTracker/fitnessTrackerService';
import { InjuryService } from '../../lib/fitnessTracker/injuryService';
import type { MovementDomain, DomainDetail, Injury } from '../../lib/fitnessTracker/types';
import { showToast } from '../Toast';

type DiscoveryStep = 1 | 2 | 3 | 4;

export function DiscoveryWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<DiscoveryStep>(1);
  const [selectedDomains, setSelectedDomains] = useState<MovementDomain[]>([]);
  const [domainDetails, setDomainDetails] = useState<Record<MovementDomain, DomainDetail>>({});
  const [movementLevel, setMovementLevel] = useState<'casual' | 'regular' | 'structured' | 'competitive' | null>(null);
  const [injuries, setInjuries] = useState<Omit<Injury, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]>([]);
  const [loading, setLoading] = useState(false);
  
  const discoveryService = new DiscoveryService();
  const fitnessTrackerService = new FitnessTrackerService();
  const injuryService = new InjuryService();
  
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
      const newDetails = { ...domainDetails };
      delete newDetails[domain];
      setDomainDetails(newDetails);
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
  
  const handleComplete = async () => {
    if (!user) return;
    
    if (selectedDomains.length === 0) {
      showToast('Please select at least one movement type', 'error');
      return;
    }
    
    setLoading(true);
    try {
      // Complete discovery
      const profile = await discoveryService.completeDiscovery(user.id, {
        primaryDomains: selectedDomains,
        domainDetails,
        movementLevel: movementLevel || undefined,
      });
      
      // Save injuries if any were added
      if (injuries.length > 0) {
        await Promise.all(
          injuries.map(injury => 
            injuryService.createInjury(user.id, injury)
          )
        );
      }
      
      // Create the single unified Fitness Tracker
      const tracker = await fitnessTrackerService.createTrackersFromProfile(profile);
      
      showToast('Fitness Tracker created successfully!', 'success');
      
      // Navigate to trackers page
      navigate('/tracker-studio/my-trackers');
    } catch (error) {
      console.error('Discovery failed:', error);
      showToast(error instanceof Error ? error.message : 'Failed to complete discovery', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Fitness Tracker Setup
        </h1>
        <p className="text-gray-600">
          Let's learn about your movement patterns to build a personalized tracker for you.
        </p>
      </div>
      
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Step {step} of 4</span>
          <span className="text-sm text-gray-500">
            {step === 1 && 'Select Movement Types'}
            {step === 2 && 'Tell Us More'}
            {step === 3 && 'Movement Level'}
            {step === 4 && 'Health & Injuries (Optional)'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Step 1: Domain Selection */}
      {step === 1 && (
        <DomainSelectionStep
          domains={movementDomains}
          selectedDomains={selectedDomains}
          onToggle={handleDomainToggle}
          onNext={() => {
            if (selectedDomains.length > 0) {
              setStep(2);
            } else {
              showToast('Please select at least one movement type', 'error');
            }
          }}
        />
      )}
      
      {/* Step 2: Domain Details */}
      {step === 2 && (
        <DomainDetailsStep
          selectedDomains={selectedDomains}
          domainDetails={domainDetails}
          onUpdate={handleDomainDetailUpdate}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      
      {/* Step 3: Level Detection */}
      {step === 3 && (
        <LevelDetectionStep
          movementLevel={movementLevel}
          onSelect={setMovementLevel}
          onBack={() => setStep(2)}
          onSkip={() => setStep(4)}
          onComplete={() => setStep(4)}
          loading={loading}
        />
      )}
      
      {/* Step 4: Injuries / Health Conditions */}
      {step === 4 && (
        <InjuriesStep
          injuries={injuries}
          selectedDomains={selectedDomains}
          onInjuriesChange={setInjuries}
          onBack={() => setStep(3)}
          onSkip={handleComplete}
          onComplete={handleComplete}
          loading={loading}
        />
      )}
    </div>
  );
}

// Step 1: Domain Selection
function DomainSelectionStep({
  domains,
  selectedDomains,
  onToggle,
  onNext,
}: {
  domains: Array<{ id: MovementDomain; label: string; icon: string; IconComponent: React.ComponentType<{ size?: number; className?: string }> }>;
  selectedDomains: MovementDomain[];
  onToggle: (domain: MovementDomain) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          What kinds of movement are part of your life?
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Select anything that applies — you can change this later.
        </p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {domains.map(domain => {
          const Icon = domain.IconComponent;
          return (
            <button
              key={domain.id}
              onClick={() => onToggle(domain.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedDomains.includes(domain.id)
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={20} className={selectedDomains.includes(domain.id) ? 'text-blue-600' : 'text-gray-500'} />
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
          Continue
        </button>
      </div>
    </div>
  );
}

// Step 2: Domain Details
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
            // Ball Sports
            'Football / Soccer',
            'American Football',
            'Basketball',
            'Volleyball',
            'Beach Volleyball',
            'Handball',
            'Water Polo',
            // Rugby & Similar
            'Rugby Union',
            'Rugby League',
            'Australian Rules Football',
            'Gaelic Football',
            // Hockey Variants
            'Ice Hockey',
            'Field Hockey',
            'Roller Hockey',
            // Baseball & Cricket
            'Baseball',
            'Softball',
            'Cricket',
            // Other Team Sports
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Tell us more about your movement
        </h2>
        <p className="text-gray-600 text-sm">
          A few quick questions to personalize your tracker.
        </p>
      </div>
      
      {selectedDomains.map(domain => {
        const questions = getDomainQuestions(domain);
        const currentDetail = domainDetails[domain] || {};
        
        // For martial_arts, team_sports, and individual_sports, store in specific fields
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
            <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">{questions.question}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
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
            
            <div className="mt-3 sm:mt-4">
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
          Continue
        </button>
      </div>
    </div>
  );
}

// Step 3: Level Detection
function LevelDetectionStep({
  movementLevel,
  onSelect,
  onBack,
  onSkip,
  onComplete,
  loading,
}: {
  movementLevel: string | null;
  onSelect: (level: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Just one more question (optional)
        </h2>
        <p className="text-gray-600 text-sm">
          How would you describe your relationship with movement?
        </p>
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
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            disabled={loading}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={onComplete}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 4: Injuries / Health Conditions
function InjuriesStep({
  injuries,
  selectedDomains,
  onInjuriesChange,
  onBack,
  onSkip,
  onComplete,
  loading,
}: {
  injuries: Omit<Injury, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[];
  selectedDomains: MovementDomain[];
  onInjuriesChange: (injuries: Omit<Injury, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  loading: boolean;
}) {
  const [editingInjury, setEditingInjury] = useState<Omit<Injury, 'id' | 'userId' | 'createdAt' | 'updatedAt'> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const bodyAreas = [
    'head', 'neck', 'upper_back', 'lower_back', 'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle', 'chest', 'core', 'other'
  ];

  const handleAddInjury = () => {
    setEditingInjury({
      name: '',
      type: 'current',
      bodyArea: '',
      severity: undefined,
      startedDate: undefined,
      resolvedDate: undefined,
      affectedActivities: [],
      limitations: '',
      notes: '',
    });
    setShowAddForm(true);
  };

  const handleSaveInjury = () => {
    if (!editingInjury || !editingInjury.name || !editingInjury.bodyArea) return;
    
    const updatedInjuries = [...injuries, editingInjury];
    onInjuriesChange(updatedInjuries);
    setEditingInjury(null);
    setShowAddForm(false);
  };

  const handleRemoveInjury = (index: number) => {
    const updatedInjuries = injuries.filter((_, i) => i !== index);
    onInjuriesChange(updatedInjuries);
  };

  const formatBodyArea = (area: string) => {
    return area.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Any injuries or health conditions? (Optional)
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          This helps us provide personalized recommendations and track your recovery.
          You can add current or historical injuries. We'll use this to suggest safer activities and monitor your progress.
        </p>
      </div>

      {/* Existing injuries list */}
      {injuries.length > 0 && (
        <div className="space-y-3">
          {injuries.map((injury, index) => (
            <div key={index} className="p-4 border-2 border-gray-200 rounded-lg bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={18} className="text-orange-500" />
                    <span className="font-medium text-gray-900">{injury.name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      injury.type === 'current' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {injury.type === 'current' ? 'Current' : 'Historical'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatBodyArea(injury.bodyArea)}
                    {injury.severity && ` • ${injury.severity.charAt(0).toUpperCase() + injury.severity.slice(1)}`}
                    {injury.affectedActivities && injury.affectedActivities.length > 0 && (
                      <span> • Affects: {injury.affectedActivities.join(', ')}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveInjury(index)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add injury form */}
      {showAddForm && editingInjury && (
        <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Injury/Condition Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editingInjury.name}
              onChange={(e) => setEditingInjury({ ...editingInjury, name: e.target.value })}
              placeholder="e.g., Lower back pain, Left knee ACL"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={editingInjury.type}
                onChange={(e) => setEditingInjury({ ...editingInjury, type: e.target.value as 'current' | 'historical' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="current">Current</option>
                <option value="historical">Historical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body Area <span className="text-red-500">*</span>
              </label>
              <select
                value={editingInjury.bodyArea}
                onChange={(e) => setEditingInjury({ ...editingInjury, bodyArea: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select area...</option>
                {bodyAreas.map(area => (
                  <option key={area} value={area}>{formatBodyArea(area)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity (optional)
            </label>
            <select
              value={editingInjury.severity || ''}
              onChange={(e) => setEditingInjury({ ...editingInjury, severity: e.target.value as any || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Not specified</option>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Affects which activities? (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedDomains.map(domain => (
                <label key={domain} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={editingInjury.affectedActivities?.includes(domain) || false}
                    onChange={(e) => {
                      const current = editingInjury.affectedActivities || [];
                      const updated = e.target.checked
                        ? [...current, domain]
                        : current.filter(d => d !== domain);
                      setEditingInjury({ ...editingInjury, affectedActivities: updated });
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{domain}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveInjury}
              disabled={!editingInjury.name || !editingInjury.bodyArea}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Injury
            </button>
            <button
              onClick={() => {
                setEditingInjury(null);
                setShowAddForm(false);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add button (if form not showing) */}
      {!showAddForm && (
        <button
          onClick={handleAddInjury}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Add Injury or Health Condition
        </button>
      )}

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            disabled={loading}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={onComplete}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}
