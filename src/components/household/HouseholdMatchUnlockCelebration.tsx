import { useEffect, useState } from 'react';
import { Users, Sparkles, Heart } from 'lucide-react';

interface HouseholdMatchUnlockCelebrationProps {
  onComplete: () => void;
  reducedMotion?: boolean;
}

export function HouseholdMatchUnlockCelebration({
  onComplete,
  reducedMotion = false,
}: HouseholdMatchUnlockCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [stage, setStage] = useState<'appear' | 'celebrate' | 'fade'>('appear');

  useEffect(() => {
    setIsVisible(true);
    setStage('appear');

    const celebrateTimer = setTimeout(() => {
      setStage('celebrate');
    }, 500);

    const fadeTimer = setTimeout(() => {
      setStage('fade');
      setIsVisible(false);
    }, 2500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(celebrateTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (reducedMotion) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20">
      <div
        className={`
          relative transition-all duration-500
          ${stage === 'appear' && 'scale-75 opacity-0'}
          ${stage === 'celebrate' && 'scale-100 opacity-100'}
          ${stage === 'fade' && 'scale-110 opacity-0'}
        `}
      >
        <div className="relative w-48 h-48">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-full opacity-20 blur-3xl animate-pulse"></div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <Users size={56} className="text-white" />
              </div>

              <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <Sparkles size={24} className="text-white" />
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-4 w-4 h-4 bg-amber-300 rounded-full animate-ping" style={{ animationDelay: '0.1s' }}></div>
          <div className="absolute bottom-8 left-4 w-3 h-3 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
          <div className="absolute top-8 left-2 w-3.5 h-3.5 bg-rose-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-4 right-6 w-3 h-3 bg-pink-300 rounded-full animate-ping" style={{ animationDelay: '0.7s' }}></div>

          <div className="absolute top-12 -left-4 w-6 h-6 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}>
            <Heart size={16} className="text-white m-1" />
          </div>
          <div className="absolute bottom-12 -right-4 w-6 h-6 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.6s' }}>
            <Heart size={16} className="text-white m-1" />
          </div>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-2xl font-bold text-gray-900 animate-pulse">
            Household Match Unlocked!
          </p>
          <p className="text-base text-gray-700 font-medium">
            See how you work together
          </p>
        </div>
      </div>
    </div>
  );
}
