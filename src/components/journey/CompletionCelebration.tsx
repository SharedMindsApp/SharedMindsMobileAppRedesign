import { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';

interface CompletionCelebrationProps {
  sectionTitle: string;
  insight: string;
  onContinue: () => void;
}

export function CompletionCelebration({ sectionTitle, insight, onContinue }: CompletionCelebrationProps) {
  const { config } = useUIPreferences();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className={`max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-8 relative overflow-hidden">
          <div className="absolute inset-0">
            {!config.reducedMotion && (
              <>
                <Sparkles className="absolute top-4 left-4 text-white/30 animate-pulse" size={24} />
                <Sparkles className="absolute bottom-6 right-6 text-white/20 animate-pulse" size={20} style={{ animationDelay: '0.3s' }} />
                <Sparkles className="absolute top-1/2 right-8 text-white/25 animate-pulse" size={16} style={{ animationDelay: '0.6s' }} />
              </>
            )}
          </div>

          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Beautiful Work!</h2>
            <p className="text-white/90 text-lg">You completed</p>
            <p className="text-white font-semibold text-xl mt-1">{sectionTitle}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200 mb-6">
            <div className="flex items-start gap-3">
              <Sparkles size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-900 mb-1">Your Insight</p>
                <p className="text-green-800 leading-relaxed">{insight}</p>
              </div>
            </div>
          </div>

          <p className="text-gray-600 text-sm text-center mb-6 leading-relaxed">
            Take a moment to appreciate this step forward. You're building something meaningful.
          </p>

          <button
            onClick={onContinue}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            Continue Your Journey
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
