import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { BRAIN_PROFILE_QUESTIONS, Question } from '../lib/brainProfileTypes';
import { saveBrainProfile, BrainProfileAnswers } from '../lib/brainProfile';

export function BrainProfileOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = BRAIN_PROFILE_QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / BRAIN_PROFILE_QUESTIONS.length) * 100;

  const handleOptionToggle = (optionId: string) => {
    const currentAnswers = answers[currentQuestion.id] || [];
    const isSelected = currentAnswers.includes(optionId);
    const maxSelections = currentQuestion.maxSelections || Infinity;

    let newAnswers: string[];
    if (isSelected) {
      newAnswers = currentAnswers.filter(id => id !== optionId);
    } else {
      if (currentAnswers.length >= maxSelections) {
        newAnswers = [...currentAnswers.slice(1), optionId];
      } else {
        newAnswers = [...currentAnswers, optionId];
      }
    }

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: newAnswers,
    }));
  };

  const isOptionSelected = (optionId: string): boolean => {
    return (answers[currentQuestion.id] || []).includes(optionId);
  };

  const canProceed = (): boolean => {
    const currentAnswers = answers[currentQuestion.id] || [];
    const minSelections = currentQuestion.minSelections || 0;
    return currentAnswers.length >= minSelections;
  };

  const handleNext = () => {
    if (currentStep < BRAIN_PROFILE_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: [],
    }));
    if (currentStep < BRAIN_PROFILE_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileAnswers: BrainProfileAnswers = {
        processing_style: answers['processing_style'] || [],
        task_style: answers['task_style'] || [],
        time_relationship: answers['time_relationship'] || [],
        sensory_needs: answers['sensory_needs'] || [],
        communication_preference: answers['communication_preference'] || [],
        overwhelm_triggers: answers['overwhelm_triggers'] || [],
        stress_helpers: answers['stress_helpers'] || [],
        avoid_behaviors: answers['avoid_behaviors'] || [],
        understanding_needs: answers['understanding_needs'] || [],
        support_style: answers['support_style'] || [],
      };

      await saveBrainProfile(profileAnswers);
      navigate('/brain-profile/cards');
    } catch (err) {
      console.error('Error saving brain profile:', err);
      setError('Failed to save your profile. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate('/dashboard');
  };

  const getStepInfo = () => {
    if (currentStep < 3) return 'Step 1: How Does Your Brain Work?';
    if (currentStep < 7) return 'Step 2: What Helps You Function Day to Day?';
    return 'Step 3: How Should Others Communicate With You?';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Brain Profile</h1>
              <p className="text-sm text-gray-600">{getStepInfo()}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">
            Question {currentStep + 1} of {BRAIN_PROFILE_QUESTIONS.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentQuestion.title}
          </h2>
          {currentQuestion.maxSelections && (
            <p className="text-sm text-gray-600 mb-6">
              Select up to {currentQuestion.maxSelections} option{currentQuestion.maxSelections > 1 ? 's' : ''}
            </p>
          )}

          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const selected = isOptionSelected(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionToggle(option.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selected
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center transition-colors ${
                        selected
                          ? 'bg-blue-600'
                          : 'bg-gray-100 border-2 border-gray-300'
                      }`}
                    >
                      {selected && <Check size={16} className="text-white" />}
                    </div>
                    <span className={`text-base ${selected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                      {option.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleSkip}
            className="mt-6 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            I'm not sure - skip this question
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              'Saving...'
            ) : currentStep === BRAIN_PROFILE_QUESTIONS.length - 1 ? (
              <>
                Complete
                <Check size={20} />
              </>
            ) : (
              <>
                Next
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
