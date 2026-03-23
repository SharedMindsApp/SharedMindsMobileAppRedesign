import { X, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { FeatureWithUnlockStatus } from '../../lib/featureTypes';

interface FeatureUnlockModalProps {
  feature: FeatureWithUnlockStatus;
  onStartUnlocking: () => void;
  onClose: () => void;
  reducedMotion?: boolean;
}

const STAGE_NAMES: Record<string, string> = {
  'individual': 'You, as an Individual',
  'daily_life': 'You in Daily Life',
  'relationships': 'You in Relationships',
  'home': 'You in Your Home'
};

export function FeatureUnlockModal({
  feature,
  onStartUnlocking,
  onClose,
  reducedMotion = false
}: FeatureUnlockModalProps) {
  const transitionClass = reducedMotion ? '' : 'transition-all duration-300';
  const stageName = STAGE_NAMES[feature.unlock_requirement] || 'the questionnaire';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`
          relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8
          ${!reducedMotion && 'animate-in zoom-in-95 duration-300'}
        `}
      >
        <button
          onClick={onClose}
          className={`
            absolute top-4 right-4 w-10 h-10 rounded-full
            flex items-center justify-center
            text-gray-400 hover:text-gray-600 hover:bg-gray-100
            ${transitionClass}
          `}
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className={`
            inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4
            bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100
            ${!reducedMotion && 'animate-pulse'}
          `}>
            <Lock size={36} className="text-amber-600" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            This feature is waiting for you!
          </h2>

          <p className="text-gray-600 text-lg leading-relaxed">
            To personalise this tool for your unique mind, we just need to learn a little more about you.
          </p>
        </div>

        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 rounded-2xl p-6 mb-6 border-2 border-amber-200/50">
          <div className="flex items-start gap-3 mb-4">
            <Sparkles size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <h3 className="font-bold text-lg text-gray-900">{feature.name}</h3>
          </div>

          <p className="text-gray-700 leading-relaxed mb-4">
            {feature.microcopy}
          </p>

          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100/50 rounded-lg px-3 py-2">
            <span className="font-medium">Takes about 5-7 minutes</span>
            <span className="text-amber-400">•</span>
            <span>No rush</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            <span className="font-semibold text-gray-900">What you'll do:</span>
            <br />
            Complete the <span className="font-medium text-gray-900">"{stageName}"</span> section.
            Once you're done, this feature becomes your daily companion.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onStartUnlocking}
            className={`
              flex-1 group
              bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500
              hover:from-amber-600 hover:via-orange-600 hover:to-rose-600
              text-white font-bold text-lg px-6 py-4 rounded-xl shadow-lg
              flex items-center justify-center gap-3
              hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
              ${transitionClass}
            `}
          >
            <span>Start Unlocking</span>
            <ArrowRight size={20} className={`${!reducedMotion && 'group-hover:translate-x-1'} ${transitionClass}`} />
          </button>

          <button
            onClick={onClose}
            className={`
              px-6 py-4 rounded-xl font-semibold text-gray-600
              hover:bg-gray-100 hover:text-gray-900
              ${transitionClass}
            `}
          >
            Not now
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Your future features are waiting...
        </p>
      </div>
    </div>
  );
}
