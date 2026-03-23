import { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuestionWrapperProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  canProgress: boolean;
  questionNumber: number;
}

export function QuestionWrapper({
  children,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  canProgress,
  questionNumber,
}: QuestionWrapperProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-stone-50 to-amber-50 flex items-center justify-center p-4">
      <button
        onClick={() => navigate('/journey')}
        className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 hover:text-gray-900 z-50"
      >
        <Home size={20} />
        <span className="font-medium hidden sm:inline">Back to Journey</span>
      </button>

      <div className="max-w-3xl w-full">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/50"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Previous</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">
              Question {questionNumber} of {totalSteps}
            </span>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 md:p-12 mb-6 animate-in slide-in-from-right duration-300">
          {children}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i < currentStep
                    ? 'w-8 bg-gradient-to-r from-amber-500 to-orange-500'
                    : i === currentStep
                    ? 'w-12 bg-gradient-to-r from-orange-500 to-rose-500'
                    : 'w-6 bg-gray-200'
                }`}
              ></div>
            ))}
          </div>

          <button
            onClick={onNext}
            disabled={!canProgress}
            className={`group flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
              canProgress
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>Next</span>
            <ArrowRight size={20} className={canProgress ? 'transition-transform group-hover:translate-x-1' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}
