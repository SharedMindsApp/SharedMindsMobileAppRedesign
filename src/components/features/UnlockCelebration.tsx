import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { FeatureWithUnlockStatus } from '../../lib/featureTypes';

interface UnlockCelebrationProps {
  feature: FeatureWithUnlockStatus;
  onClose: () => void;
  reducedMotion?: boolean;
}

export function UnlockCelebration({
  feature,
  onClose,
  reducedMotion = false
}: UnlockCelebrationProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`
          relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-3xl shadow-2xl max-w-2xl w-full p-8 md:p-12
          ${!reducedMotion && 'animate-in zoom-in-95 duration-500'}
        `}
      >
        {!reducedMotion && (
          <>
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-full blur-3xl -translate-y-48 translate-x-48"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-cyan-200/40 to-blue-200/40 rounded-full blur-3xl translate-y-40 -translate-x-40"></div>
          </>
        )}

        <div className="relative">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className={`
                  w-28 h-28 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-full flex items-center justify-center shadow-2xl
                  ${!reducedMotion && 'animate-in zoom-in duration-500'}
                `}>
                  <CheckCircle2 size={56} className="text-white" />
                </div>
                {!reducedMotion && (
                  <div className="absolute -inset-3 bg-gradient-to-br from-emerald-200 to-cyan-200 rounded-full blur-2xl opacity-60 animate-pulse"></div>
                )}
              </div>
            </div>

            <div className={`${!reducedMotion && 'animate-in slide-in-from-bottom-4 duration-500 delay-200'}`}>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Feature Unlocked!
              </h1>

              <p className="text-xl text-gray-700 leading-relaxed max-w-xl mx-auto mb-2">
                You've unlocked <span className="font-bold text-emerald-600">{feature.name}</span>
              </p>

              <p className="text-base text-gray-600 leading-relaxed max-w-lg mx-auto">
                This tool is now personalised just for you. Use it anytime to make your day smoother.
              </p>
            </div>
          </div>

          <div className={`
            bg-white/90 backdrop-blur-sm rounded-2xl p-6 mb-8 border-2 border-emerald-200/50
            ${!reducedMotion && 'animate-in slide-in-from-bottom-4 duration-500 delay-300'}
          `}>
            <div className="flex items-start gap-3 mb-4">
              <Sparkles size={24} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <h3 className="font-bold text-lg text-gray-900">What you can do now:</h3>
            </div>

            <p className="text-gray-700 leading-relaxed">
              {feature.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onClose}
              className={`
                group bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500
                hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600
                text-white font-bold text-lg px-10 py-5 rounded-2xl shadow-lg
                flex items-center justify-center gap-3
                hover:shadow-xl hover:scale-105 active:scale-95
                ${!reducedMotion && 'transition-all duration-300'}
              `}
            >
              <span>Continue Journey</span>
              <ArrowRight size={24} className={`${!reducedMotion && 'group-hover:translate-x-1 transition-transform'}`} />
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 leading-relaxed">
              <span className="font-semibold">Beautiful work!</span> Keep going to unlock even more tools.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
