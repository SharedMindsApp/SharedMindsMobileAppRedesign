import { ArrowRight, Sparkles, CheckCircle2, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IndividualProfileAnswers } from '../../lib/individualProfileTypes';

interface CompletionScreenProps {
  answers: IndividualProfileAnswers;
  onContinue: () => void;
}

export function CompletionScreen({ answers, onContinue }: CompletionScreenProps) {
  const navigate = useNavigate();
  const getInsights = (): string[] => {
    const insights: string[] = [];

    if (answers.thinking_style.includes('visual')) {
      insights.push('You thrive with visual clarity');
    }

    if (answers.energy_pattern === 'evening') {
      insights.push('Your energy peaks in the evening');
    } else if (answers.energy_pattern === 'morning') {
      insights.push('You are a morning person');
    }

    if (answers.communication_style.includes('warm-friendly')) {
      insights.push('You prefer gentle, warm communication');
    } else if (answers.communication_style.includes('direct-concise')) {
      insights.push('You value direct, clear communication');
    }

    if (insights.length === 0) {
      insights.push('You have a unique way of experiencing the world');
      insights.push('Your patterns and rhythms are beautifully your own');
    }

    return insights.slice(0, 3);
  };

  const insights = getInsights();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <button
        onClick={() => navigate('/journey')}
        className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 hover:text-gray-900 z-50"
      >
        <Home size={20} />
        <span className="font-medium">Back to Journey</span>
      </button>

      <div className="max-w-2xl w-full">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-full blur-3xl -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-cyan-200/40 to-blue-200/40 rounded-full blur-3xl translate-y-40 -translate-x-40"></div>

          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-full flex items-center justify-center shadow-2xl animate-in zoom-in duration-500">
                  <CheckCircle2 size={56} className="text-white" />
                </div>
                <div className="absolute -inset-3 bg-gradient-to-br from-emerald-200 to-cyan-200 rounded-full blur-2xl opacity-60 animate-pulse"></div>
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Nice! You've unlocked a clearer picture of your mind.
              </h1>

              <p className="text-lg text-gray-700 leading-relaxed max-w-xl mx-auto">
                Your insights will help SharedMinds personalize everything — communication, routines, support suggestions, and stress predictions.
              </p>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl p-6 mb-8 border-2 border-emerald-200/50">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles size={24} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <h3 className="font-semibold text-lg text-gray-900">Your Personal Insights</h3>
              </div>

              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 animate-in slide-in-from-left duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={onContinue}
                className="group bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-bold text-lg px-10 py-5 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center gap-3"
              >
                <span>Continue My Journey</span>
                <ArrowRight size={24} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Your responses have been saved securely
          </p>
        </div>
      </div>
    </div>
  );
}
