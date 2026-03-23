import {
  Lock,
  Sunrise,
  ListChecks,
  MessageCircle,
  Home,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { FeatureWithUnlockStatus } from '../../lib/featureTypes';

interface FeatureCardProps {
  feature: FeatureWithUnlockStatus;
  onClick: () => void;
  showUnlockAnimation?: boolean;
  reducedMotion?: boolean;
}

const ICON_MAP: Record<string, any> = {
  'sunrise': Sunrise,
  'list-checks': ListChecks,
  'message-circle': MessageCircle,
  'home': Home,
  'trending-up': TrendingUp,
  'sparkles': Sparkles,
};

export function FeatureCard({
  feature,
  onClick,
  showUnlockAnimation = false,
  reducedMotion = false
}: FeatureCardProps) {
  const IconComponent = ICON_MAP[feature.icon] || Sparkles;
  const isLocked = !feature.isUnlocked;

  const transitionClass = reducedMotion ? '' : 'transition-all duration-300';
  const animationClass = reducedMotion || !showUnlockAnimation ? '' : 'animate-in zoom-in duration-500';

  return (
    <button
      onClick={onClick}
      disabled={isLocked && !onClick}
      className={`
        group relative w-full rounded-2xl p-6 shadow-lg border-2
        ${isLocked
          ? 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-xl'
          : 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200 hover:border-emerald-300 hover:shadow-xl'
        }
        ${transitionClass}
        ${animationClass}
        hover:scale-[1.02] active:scale-[0.98]
        text-left
      `}
    >
      {showUnlockAnimation && !reducedMotion && (
        <>
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-2xl blur opacity-30 animate-pulse"></div>
          <div className="absolute top-2 right-2 animate-in zoom-in duration-300">
            <Sparkles size={20} className="text-emerald-500" />
          </div>
        </>
      )}

      <div className="relative flex items-start gap-4">
        <div
          className={`
            flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center
            ${isLocked
              ? 'bg-gray-200 text-gray-500'
              : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
            }
            ${transitionClass}
          `}
        >
          <IconComponent size={28} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className={`
              text-lg font-bold
              ${isLocked ? 'text-gray-600' : 'text-gray-900'}
            `}>
              {feature.name}
            </h3>

            {isLocked && (
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center
                ${!reducedMotion && 'group-hover:scale-110 group-hover:rotate-3'}
                ${transitionClass}
              `}>
                <Lock size={16} className="text-gray-500" />
              </div>
            )}

            {!isLocked && (
              <div className="flex-shrink-0 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                Unlocked!
              </div>
            )}
          </div>

          <p className={`
            text-sm leading-relaxed
            ${isLocked ? 'text-gray-500' : 'text-gray-700'}
          `}>
            {feature.description}
          </p>

          {isLocked && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full w-0 bg-gray-400 rounded-full"></div>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap font-medium">
                Tap to unlock
              </span>
            </div>
          )}

          {!isLocked && (
            <div className={`
              mt-3 text-sm font-medium text-emerald-600 flex items-center gap-2
              ${!reducedMotion && 'group-hover:gap-3'}
              ${transitionClass}
            `}>
              <span>Open feature</span>
              <span className="text-emerald-400">→</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
