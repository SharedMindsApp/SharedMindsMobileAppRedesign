import { useState } from 'react';
import { Sparkles, Heart, Lightbulb, Save, ArrowRight, HelpCircle, Unlock } from 'lucide-react';

export interface InsightSummary {
  id: string;
  title: string;
  coreInsight: string;
  brainTip: string;
  featureTeaser?: string;
  savedToProfile: boolean;
}

interface InsightSummaryRevealCardProps {
  insight: InsightSummary;
  sectionTitle: string;
  onSaveToProfile: () => Promise<void>;
  onContinue: () => void;
  reducedMotion?: boolean;
}

export function InsightSummaryRevealCard({
  insight,
  sectionTitle,
  onSaveToProfile,
  onContinue,
  reducedMotion = false
}: InsightSummaryRevealCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(insight.savedToProfile);

  const handleSave = async () => {
    if (hasSaved) return;

    setIsSaving(true);
    try {
      await onSaveToProfile();
      setHasSaved(true);
    } catch (error) {
      console.error('Failed to save insight:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const transitionClass = reducedMotion ? '' : 'transition-all duration-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-black/30 via-black/40 to-black/30 backdrop-blur-sm">
      <div
        className={`
          max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden
          ${reducedMotion ? '' : 'animate-in zoom-in-95 fade-in duration-500'}
        `}
      >
        <div className="relative bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 p-8 overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            {!reducedMotion && (
              <>
                <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-amber-300 to-orange-300 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-6 left-6 w-20 h-20 bg-gradient-to-br from-rose-300 to-pink-300 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-gradient-to-br from-orange-300 to-amber-300 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              </>
            )}
          </div>

          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-2xl mb-4 shadow-lg">
              <Sparkles size={32} className="text-white" />
            </div>
            <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-2">
              Module Complete
            </h3>
            <p className="text-gray-700 font-medium">{sectionTitle}</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Heart size={20} className="text-rose-500" />
              <h2 className="text-2xl font-bold text-gray-900">
                Your Personal Insight
              </h2>
            </div>
            <p className="text-xl font-bold text-gray-800 leading-relaxed px-2">
              {insight.title}
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl p-6 border-2 border-emerald-200/60 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                <Sparkles size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-emerald-900 mb-2 uppercase tracking-wide">
                  What This Means
                </h4>
                <p className="text-gray-800 leading-loose text-base">
                  {insight.coreInsight}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200/60 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                <Lightbulb size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-amber-900 mb-2 uppercase tracking-wide">
                  Try This
                </h4>
                <p className="text-gray-800 leading-loose text-base font-medium">
                  {insight.brainTip}
                </p>
              </div>
            </div>
          </div>

          {insight.featureTeaser && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200 flex items-center gap-3">
              <Unlock size={20} className="text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-900 font-medium leading-relaxed">
                {insight.featureTeaser}
              </p>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleSave}
              disabled={hasSaved || isSaving}
              className={`
                w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500
                hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600
                disabled:from-gray-300 disabled:via-gray-300 disabled:to-gray-300
                text-white font-bold py-4 px-6 rounded-xl shadow-lg
                flex items-center justify-center gap-3
                ${!reducedMotion && 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'}
                ${transitionClass}
                disabled:cursor-not-allowed disabled:hover:scale-100
              `}
            >
              {hasSaved ? (
                <>
                  <Sparkles size={22} />
                  <span>Saved to Your Brain Profile</span>
                </>
              ) : (
                <>
                  <Save size={22} />
                  <span>{isSaving ? 'Saving...' : 'Save to My Brain Profile'}</span>
                </>
              )}
            </button>

            <button
              onClick={onContinue}
              className={`
                w-full bg-gradient-to-r from-blue-500 to-teal-500
                hover:from-blue-600 hover:to-teal-600
                text-white font-bold py-4 px-6 rounded-xl shadow-lg
                flex items-center justify-center gap-3
                ${!reducedMotion && 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'}
                ${transitionClass}
              `}
            >
              <span>Continue Your Journey</span>
              <ArrowRight size={22} />
            </button>
          </div>

          <div className="relative text-center pt-2">
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              className={`
                text-sm text-gray-500 hover:text-gray-700 font-medium
                inline-flex items-center gap-1.5
                ${transitionClass}
              `}
            >
              <HelpCircle size={16} />
              <span>Why am I seeing this?</span>
            </button>

            {showTooltip && (
              <div
                className={`
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72
                  bg-gray-900 text-white text-xs leading-relaxed p-4 rounded-xl shadow-xl
                  ${reducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-200'}
                `}
              >
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                  <div className="border-8 border-transparent border-t-gray-900"></div>
                </div>
                This insight was generated based on your responses to help you understand yourself better.
                It's tailored to your unique brain and experiences.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
