import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface MiniCelebrationProps {
  onComplete: () => void;
  reducedMotion?: boolean;
}

export function MiniCelebration({ onComplete, reducedMotion = false }: MiniCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (reducedMotion) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={`
          relative transition-all duration-500
          ${isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
        `}
      >
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-full opacity-20 blur-2xl animate-pulse"></div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <Sparkles size={40} className="text-white" />
            </div>
          </div>

          <div className="absolute top-2 right-2 w-3 h-3 bg-amber-300 rounded-full animate-ping" style={{ animationDelay: '0.1s' }}></div>
          <div className="absolute bottom-4 left-3 w-2 h-2 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
          <div className="absolute top-6 left-2 w-2.5 h-2.5 bg-rose-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-2 right-4 w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{ animationDelay: '0.7s' }}></div>
        </div>

        <p className="text-center mt-4 text-lg font-semibold text-amber-900 animate-pulse">
          Beautiful work!
        </p>
      </div>
    </div>
  );
}
