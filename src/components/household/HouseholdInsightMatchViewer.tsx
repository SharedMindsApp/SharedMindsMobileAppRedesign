import { useState, useEffect } from 'react';
import {
  MessageCircle,
  Calendar,
  Volume2,
  HeartPulse,
  CheckSquare,
  Users,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Save,
  Sparkles,
  ArrowRight,
  Unlock,
} from 'lucide-react';
import { InsightCard } from '../../lib/householdInsightMatch';

interface HouseholdInsightMatchViewerProps {
  insightCards: InsightCard[];
  onSaveToProfile: () => Promise<void>;
  onClose: () => void;
  reducedMotion?: boolean;
}

const ICON_MAP = {
  'message-circle': MessageCircle,
  'calendar': Calendar,
  'volume-2': Volume2,
  'heart-pulse': HeartPulse,
  'check-square': CheckSquare,
  'users': Users,
  'list-checks': ListChecks,
};

const CATEGORY_COLORS = {
  communication: 'from-blue-400 to-cyan-500',
  routine: 'from-amber-400 to-orange-500',
  sensory: 'from-purple-400 to-pink-500',
  stress: 'from-rose-400 to-red-500',
  task: 'from-emerald-400 to-teal-500',
  needs: 'from-indigo-400 to-blue-500',
  actions: 'from-green-400 to-emerald-500',
};

const CATEGORY_BG = {
  communication: 'from-blue-50 to-cyan-50',
  routine: 'from-amber-50 to-orange-50',
  sensory: 'from-purple-50 to-pink-50',
  stress: 'from-rose-50 to-red-50',
  task: 'from-emerald-50 to-teal-50',
  needs: 'from-indigo-50 to-blue-50',
  actions: 'from-green-50 to-emerald-50',
};

export function HouseholdInsightMatchViewer({
  insightCards,
  onSaveToProfile,
  onClose,
  reducedMotion = false,
}: HouseholdInsightMatchViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const currentCard = insightCards[currentIndex];
  const isFirstCard = currentIndex === 0;
  const isLastCard = currentIndex === insightCards.length - 1;
  const IconComponent = ICON_MAP[currentCard.icon as keyof typeof ICON_MAP] || Sparkles;

  const handleNext = () => {
    if (!isLastCard) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstCard) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSave = async () => {
    if (hasSaved) return;

    setIsSaving(true);
    try {
      await onSaveToProfile();
      setHasSaved(true);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      handleNext();
    }

    if (touchStart - touchEnd < -75) {
      handlePrevious();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const transitionClass = reducedMotion ? '' : 'transition-all duration-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-black/30 via-black/40 to-black/30 backdrop-blur-sm">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className={`relative bg-gradient-to-br ${CATEGORY_COLORS[currentCard.category]} p-6 overflow-hidden`}>
          <div className="absolute inset-0 opacity-20">
            {!reducedMotion && (
              <>
                <div className="absolute top-4 right-4 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-4 left-4 w-24 h-24 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </>
            )}
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <IconComponent size={24} className="text-gray-800" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium uppercase tracking-wide">
                  {currentCard.category}
                </p>
                <p className="text-white text-xs">
                  Card {currentIndex + 1} of {insightCards.length}
                </p>
              </div>
            </div>

            {currentCard.strengthBased && (
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <p className="text-white text-xs font-semibold">Strength</p>
              </div>
            )}
          </div>
        </div>

        <div
          className="p-8 space-y-6"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-900 leading-snug">
              {currentCard.title}
            </h2>
            <p className="text-lg font-semibold text-gray-700">
              {currentCard.summary}
            </p>
          </div>

          <div className={`bg-gradient-to-br ${CATEGORY_BG[currentCard.category]} rounded-2xl p-6 border-2 border-gray-200/50 shadow-sm`}>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
              What This Means
            </h3>
            <p className="text-gray-800 leading-loose text-base">
              {currentCard.explanation}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200/60 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                <Sparkles size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-green-900 mb-2 uppercase tracking-wide">
                  Try This
                </h4>
                <p className="text-green-800 leading-loose text-base font-medium">
                  {currentCard.tryThis}
                </p>
              </div>
            </div>
          </div>

          {currentCard.featureTeaser && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200 flex items-center gap-3">
              <Unlock size={20} className="text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-900 font-medium leading-relaxed">
                {currentCard.featureTeaser}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handlePrevious}
              disabled={isFirstCard}
              className={`
                p-3 rounded-xl border-2 border-gray-300
                hover:border-gray-400 hover:bg-gray-50
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent
                ${transitionClass}
              `}
              aria-label="Previous card"
            >
              <ChevronLeft size={24} className="text-gray-700" />
            </button>

            <div className="flex-1 flex items-center justify-center gap-2">
              {insightCards.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`
                    h-2 rounded-full ${transitionClass}
                    ${index === currentIndex ? 'w-8 bg-gray-800' : 'w-2 bg-gray-300 hover:bg-gray-400'}
                  `}
                  aria-label={`Go to card ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={isLastCard}
              className={`
                p-3 rounded-xl border-2 border-gray-300
                hover:border-gray-400 hover:bg-gray-50
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent
                ${transitionClass}
              `}
              aria-label="Next card"
            >
              <ChevronRight size={24} className="text-gray-700" />
            </button>
          </div>

          {isLastCard && (
            <div className="space-y-3 pt-4 border-t-2 border-gray-200">
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
                    <span>Saved to Household Profile</span>
                  </>
                ) : (
                  <>
                    <Save size={22} />
                    <span>{isSaving ? 'Saving...' : 'Save to Household Profile'}</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className={`
                  w-full bg-gradient-to-r from-blue-500 to-teal-500
                  hover:from-blue-600 hover:to-teal-600
                  text-white font-bold py-4 px-6 rounded-xl shadow-lg
                  flex items-center justify-center gap-3
                  ${!reducedMotion && 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'}
                  ${transitionClass}
                `}
              >
                <span>Show Me More Tips</span>
                <ArrowRight size={22} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
