import { useState } from 'react';
import { X, Coffee, Brain, Target, Sparkles } from 'lucide-react';

interface StartRitualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const ritualSteps = [
  {
    id: 'hydrate',
    title: 'Hydrate',
    description: 'Grab water or your favorite beverage',
    icon: Coffee,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'clear-mind',
    title: 'Clear Your Mind',
    description: 'Take 3 deep breaths to center yourself',
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'set-intention',
    title: 'Set Intention',
    description: 'What do you want to accomplish this session?',
    icon: Target,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'ready',
    title: 'Ready to Focus',
    description: 'Let\'s make this session count',
    icon: Sparkles,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
];

export function StartRitualModal({ isOpen, onClose, onComplete }: StartRitualModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const step = ritualSteps[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === ritualSteps.length - 1;

  function handleNext() {
    setCompletedSteps(prev => new Set(prev).add(step.id));

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }

  function handleSkip() {
    onClose();
    onComplete();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Focus Ritual</h2>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex justify-between mb-8">
            {ritualSteps.map((s, index) => (
              <div
                key={s.id}
                className={`flex-1 h-1 rounded-full mx-1 transition-colors ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="text-center mb-8">
            <div className={`w-20 h-20 ${step.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <StepIcon size={40} className={step.color} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-gray-600">{step.description}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
            >
              Skip Ritual
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold"
            >
              {isLastStep ? 'Start Focus' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
