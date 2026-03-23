/**
 * Body Profile Setup Modal
 * 
 * Fun, engaging wizard for setting up body profile
 * All fields optional - no pressure, just helpful context
 */

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BodyMeasurementService } from '../../lib/fitnessTracker/bodyMeasurementService';
import type { BodyProfile } from '../../lib/fitnessTracker/bodyTransformationTypes';
import { X, ArrowRight, ArrowLeft, Check, Loader2, Sparkles } from 'lucide-react';
import { showToast } from '../Toast';

type BodyProfileSetupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

type Step = 1 | 2 | 3;

export function BodyProfileSetupModal({ isOpen, onClose, onComplete }: BodyProfileSetupModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const measurementService = new BodyMeasurementService();

  // Form state (all optional)
  const [heightCm, setHeightCm] = useState<string>('');
  const [sex, setSex] = useState<BodyProfile['sex'] | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [currentBodyweightKg, setCurrentBodyweightKg] = useState<string>('');
  const [trainingBackground, setTrainingBackground] = useState<string>('');
  const [athleteFlag, setAthleteFlag] = useState<boolean>(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [measurementUnit, setMeasurementUnit] = useState<'cm' | 'in'>('cm');
  const [weighInSchedule, setWeighInSchedule] = useState<BodyProfile['weighInSchedule'] | ''>('');

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as Step);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const profile: Partial<BodyProfile> = {
        heightCm: heightCm ? parseInt(heightCm) : undefined,
        sex: sex || undefined,
        dateOfBirth: dateOfBirth || undefined,
        currentBodyweightKg: currentBodyweightKg ? parseFloat(currentBodyweightKg) : undefined,
        trainingBackground: trainingBackground || undefined,
        athleteFlag,
        weightUnit,
        measurementUnit,
        weighInSchedule: weighInSchedule || undefined,
      };

      await measurementService.upsertProfile(user.id, profile);
      showToast('Profile set up! You can update it anytime.', 'success');
      onComplete();
    } catch (error) {
      console.error('Failed to save profile:', error);
      showToast('Failed to save profile. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = step === 1 ? true : step === 2 ? true : true; // All steps optional

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative">
          {/* Header with progress */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 rounded-t-2xl sm:rounded-t-3xl z-10">
            <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-0.5 sm:mb-1">Set Up Your Body Profile</h2>
                <p className="text-white/90 text-xs sm:text-sm">All fields are optional - tell us what you're comfortable sharing</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                    s <= step ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
            <p className="text-white/80 text-xs mt-1.5 sm:mt-2">Step {step} of 3</p>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 md:p-8">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in">
                <div className="text-center mb-4 sm:mb-5 md:mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-blue-100 rounded-xl sm:rounded-2xl mb-3 sm:mb-4">
                    <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">Basic Information</h3>
                  <p className="text-sm sm:text-base text-gray-600 px-2">Help us understand your body better (optional, of course!)</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="e.g. 175"
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Current Weight ({weightUnit})
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={currentBodyweightKg}
                        onChange={(e) => setCurrentBodyweightKg(e.target.value)}
                        placeholder="e.g. 70"
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <select
                        value={weightUnit}
                        onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lb')}
                        className="px-2.5 sm:px-3 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="kg">kg</option>
                        <option value="lb">lb</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Sex (optional)
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as BodyProfile['sex'] | '')}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Date of Birth (optional)
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Training Background */}
            {step === 2 && (
              <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in">
                <div className="text-center mb-4 sm:mb-5 md:mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-purple-100 rounded-xl sm:rounded-2xl mb-3 sm:mb-4">
                    <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">Training Background</h3>
                  <p className="text-sm sm:text-base text-gray-600 px-2">Tell us a bit about your fitness journey</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Training Background (optional)
                  </label>
                  <textarea
                    value={trainingBackground}
                    onChange={(e) => setTrainingBackground(e.target.value)}
                    placeholder="e.g., 'Been lifting for 3 years', 'Just started running', 'Play basketball regularly'"
                    rows={4}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 bg-purple-50 rounded-lg sm:rounded-xl border border-purple-200">
                  <input
                    type="checkbox"
                    id="athlete-flag"
                    checked={athleteFlag}
                    onChange={(e) => setAthleteFlag(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0"
                  />
                  <label htmlFor="athlete-flag" className="text-xs sm:text-sm text-gray-700 cursor-pointer">
                    I'm a competitive athlete
                  </label>
                </div>
              </div>
            )}

            {/* Step 3: Preferences */}
            {step === 3 && (
              <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in">
                <div className="text-center mb-4 sm:mb-5 md:mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-pink-100 rounded-xl sm:rounded-2xl mb-3 sm:mb-4">
                    <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-pink-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">Preferences</h3>
                  <p className="text-sm sm:text-base text-gray-600 px-2">Set up how you'd like to track (we'll never nag you!)</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Measurement Units
                  </label>
                  <select
                    value={measurementUnit}
                    onChange={(e) => setMeasurementUnit(e.target.value as 'cm' | 'in')}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
                  >
                    <option value="cm">Centimeters (cm)</option>
                    <option value="in">Inches (in)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Weigh-In Schedule (optional - for gentle reminders only)
                  </label>
                  <select
                    value={weighInSchedule}
                    onChange={(e) => setWeighInSchedule(e.target.value as BodyProfile['weighInSchedule'] | '')}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
                  >
                    <option value="">No reminders (I'll log when I want)</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi_weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="ad_hoc">When I remember</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1.5 sm:mt-2">We'll never nag you - these are gentle suggestions you can ignore anytime</p>
                </div>

                <div className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg sm:rounded-xl border border-blue-200">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5 sm:mb-1">All Set!</p>
                      <p className="text-xs sm:text-sm text-gray-700">You can change any of this later. Ready to start tracking how your body adapts to your training?</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 sm:pt-5 md:pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={step === 1 ? onClose : handleBack}
                className="px-4 sm:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg sm:rounded-xl transition-colors font-medium flex items-center gap-1.5 sm:gap-2"
                disabled={loading}
              >
                {step === 1 ? (
                  <>Cancel</>
                ) : (
                  <>
                    <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span>Back</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={loading || !canProceed}
                className="px-5 sm:px-7 md:px-8 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : step === 3 ? (
                  <>
                    <Check size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">Complete Setup</span>
                    <span className="sm:hidden">Complete</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
