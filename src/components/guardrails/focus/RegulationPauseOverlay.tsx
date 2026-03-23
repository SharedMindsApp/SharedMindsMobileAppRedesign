import { useState, useEffect } from 'react';
import { Heart, Coffee, Utensils, Moon, CheckCircle } from 'lucide-react';

interface RegulationPauseOverlayProps {
  regulationType: 'hydrate' | 'stretch' | 'meal' | 'rest';
  message: string;
  mandatoryDelaySeconds?: number;
  onResume: () => void;
}

const regulationConfig = {
  hydrate: {
    icon: Coffee,
    title: 'Time to Hydrate',
    color: 'blue',
  },
  stretch: {
    icon: Heart,
    title: 'Time to Stretch',
    color: 'green',
  },
  meal: {
    icon: Utensils,
    title: 'Time for a Meal',
    color: 'orange',
  },
  rest: {
    icon: Moon,
    title: 'Time to Rest',
    color: 'purple',
  },
};

export function RegulationPauseOverlay({
  regulationType,
  message,
  mandatoryDelaySeconds = 0,
  onResume,
}: RegulationPauseOverlayProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(mandatoryDelaySeconds);
  const config = regulationConfig[regulationType];
  const Icon = config.icon;

  useEffect(() => {
    if (remainingSeconds > 0) {
      const interval = setInterval(() => {
        setRemainingSeconds(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [remainingSeconds]);

  const canResume = remainingSeconds === 0;

  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-900',
      icon: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-900',
      icon: 'text-green-600',
      button: 'bg-green-600 hover:bg-green-700',
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-900',
      icon: 'text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700',
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-900',
      icon: 'text-purple-600',
      button: 'bg-purple-600 hover:bg-purple-700',
    },
  };

  const colors = colorClasses[config.color as keyof typeof colorClasses];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 space-y-6 animate-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`w-24 h-24 ${colors.bg} rounded-full flex items-center justify-center`}>
            <Icon size={48} className={colors.icon} />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{config.title}</h2>
            <p className="text-lg text-gray-600">{message}</p>
          </div>
        </div>

        {mandatoryDelaySeconds > 0 && (
          <div className={`${colors.bg} rounded-xl p-6 text-center`}>
            {remainingSeconds > 0 ? (
              <>
                <div className="text-4xl font-bold mb-2" style={{ color: colors.icon.replace('text-', '') }}>
                  {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
                </div>
                <p className={`text-sm ${colors.text}`}>Minimum break time remaining</p>
              </>
            ) : (
              <>
                <CheckCircle size={32} className={`${colors.icon} mx-auto mb-2`} />
                <p className={`text-sm font-semibold ${colors.text}`}>Break complete!</p>
              </>
            )}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={onResume}
            disabled={!canResume}
            className={`w-full px-6 py-4 ${colors.button} text-white rounded-xl transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            <CheckCircle size={24} />
            {canResume ? "I've Done It — Resume" : 'Please complete your break'}
          </button>

          {!canResume && (
            <p className="text-xs text-center text-gray-500">
              This pause is required for your wellbeing
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
