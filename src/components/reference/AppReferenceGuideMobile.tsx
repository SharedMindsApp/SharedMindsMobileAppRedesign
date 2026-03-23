/**
 * App Reference Guide - Mobile View
 * 
 * Enhanced mobile-first experience with swipe gestures, premium visuals,
 * and reduced cognitive overload.
 */

import { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReferenceCard } from './ReferenceCard';
import { getAllReferenceItems, type ReferenceItem } from './referenceContent';
import { WidgetGuide } from './WidgetGuide';
import { GuardrailsGuide } from './GuardrailsGuide';
import { PlannerGuide } from './PlannerGuide';
import { ProjectsGuide } from './ProjectsGuide';
import { CalendarGuide } from './CalendarGuide';
import { SharedSpacesGuide } from './SharedSpacesGuide';
import { SharedMindsOverview } from './SharedMindsOverview';
import { HouseholdGuide } from './HouseholdGuide';
import { PeopleGuide } from './PeopleGuide';
import { TrackersGuide } from './TrackersGuide';
import { TripsGuide } from './TripsGuide';
import { TeamsGuide } from './TeamsGuide';

interface AppReferenceGuideMobileProps {
  isOpen: boolean;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50; // Minimum swipe distance (px)
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity (px/ms)

export function AppReferenceGuideMobile({
  isOpen,
  onClose,
}: AppReferenceGuideMobileProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // FIXED: Store app guide state in sessionStorage to preserve across reloads
  useEffect(() => {
    if (isOpen) {
      sessionStorage.setItem('app_guide_open', 'true');
      // Also store current index to restore position
      sessionStorage.setItem('app_guide_index', currentIndex.toString());
    } else {
      sessionStorage.removeItem('app_guide_open');
      sessionStorage.removeItem('app_guide_index');
    }
  }, [isOpen, currentIndex]);
  
  const [showWidgetGuide, setShowWidgetGuide] = useState(false);
  const [showGuardrailsGuide, setShowGuardrailsGuide] = useState(false);
  const [showPlannerGuide, setShowPlannerGuide] = useState(false);
  const [showProjectsGuide, setShowProjectsGuide] = useState(false);
  const [showCalendarGuide, setShowCalendarGuide] = useState(false);
  const [showSharedSpacesGuide, setShowSharedSpacesGuide] = useState(false);
  const [showSharedMindsOverview, setShowSharedMindsOverview] = useState(false);
  const [showHouseholdGuide, setShowHouseholdGuide] = useState(false);
  const [showPeopleGuide, setShowPeopleGuide] = useState(false);
  const [showTrackersGuide, setShowTrackersGuide] = useState(false);
  const [showTripsGuide, setShowTripsGuide] = useState(false);
  const [showTeamsGuide, setShowTeamsGuide] = useState(false);
  const [guardrailsSection, setGuardrailsSection] = useState<string | null>(null);
  
  const items = getAllReferenceItems();
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  // FIXED: Restore current index from sessionStorage when guide opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const savedIndex = sessionStorage.getItem('app_guide_index');
      if (savedIndex) {
        const index = parseInt(savedIndex, 10);
        if (!isNaN(index) && index >= 0 && index < items.length) {
          setCurrentIndex(index);
        }
      }
    }
  }, [isOpen, items.length]);

  // Reset swipe state when index changes
  useEffect(() => {
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [currentIndex]);

  function handleNext() {
    if (!isLast && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsTransitioning(false);
      }, 150);
    }
  }

  function handlePrevious() {
    if (!isFirst && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setIsTransitioning(false);
      }, 150);
    }
  }

  // Swipe gesture handlers - using native TouchEvent for non-passive listener
  const handleTouchStart = (e: TouchEvent) => {
    if (isTransitioning) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartRef.current || isTransitioning) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only handle horizontal swipes (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
      setIsSwiping(true);
      // Clamp swipe offset for visual feedback
      const clampedOffset = Math.max(-100, Math.min(100, deltaX));
      setSwipeOffset(clampedOffset);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !isSwiping || isTransitioning) {
      touchStartRef.current = null;
      setIsSwiping(false);
      setSwipeOffset(0);
      return;
    }

    const touchDuration = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(swipeOffset) / touchDuration;

    // Determine swipe action
    if (Math.abs(swipeOffset) >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY_THRESHOLD) {
      if (swipeOffset < 0 && !isLast) {
        // Swipe left → Next
        handleNext();
      } else if (swipeOffset > 0 && !isFirst) {
        // Swipe right → Previous
        handlePrevious();
      } else {
        // Reset if swipe wasn't enough or at boundary
        setSwipeOffset(0);
      }
    } else {
      // Reset if swipe wasn't sufficient
      setSwipeOffset(0);
    }

    touchStartRef.current = null;
    setIsSwiping(false);
  };

  // Use ref for touch events to allow preventDefault (non-passive listener)
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal || !isOpen) return;

    // Add non-passive touchmove listener to allow preventDefault
    // touchstart and touchend can remain passive for better performance
    modal.addEventListener('touchmove', handleTouchMove, { passive: false });
    modal.addEventListener('touchstart', handleTouchStart, { passive: true });
    modal.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      modal.removeEventListener('touchmove', handleTouchMove);
      modal.removeEventListener('touchstart', handleTouchStart);
      modal.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, isTransitioning, isSwiping, swipeOffset, isFirst, isLast]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Full Screen Modal */}
      <div 
        ref={modalRef}
        className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-white to-gray-50 safe-top safe-bottom"
        style={{
          overscrollBehavior: 'contain', // FIXED: Prevent pull-to-refresh when guide is open
        }}
      >
        {/* Header - Minimal and Clean */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-5 py-4 flex items-center justify-between z-20 safe-top">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              App Guide
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentIndex + 1} of {items.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors touch-manipulation"
            aria-label="Close"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Progress Indicator - Subtle and Elegant */}
        <div className="px-5 py-3 bg-white/50 backdrop-blur-sm border-b border-gray-100">
          <div className="flex justify-center gap-1.5 max-w-md mx-auto">
            {items.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 bg-blue-600'
                    : index < currentIndex
                    ? 'w-2 bg-blue-300'
                    : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card Container - Swipeable & Scrollable */}
        <div 
          ref={cardContainerRef}
          className="flex-1 overflow-y-auto relative px-5 py-6"
          style={{
            touchAction: 'pan-y',
            overscrollBehavior: 'contain', // FIXED: Prevent pull-to-refresh on guide content
          }}
        >
          <div 
            className="flex items-start justify-center transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(${swipeOffset}px)`,
              opacity: isSwiping ? 0.7 : 1,
            }}
          >
            <div className="w-full max-w-md">
              <ReferenceCard 
                item={currentItem} 
                variant="mobile"
                onShowWidgetGuide={() => setShowWidgetGuide(true)}
                onShowGuardrailsGuide={() => {
                  setGuardrailsSection(null);
                  setShowGuardrailsGuide(true);
                }}
                onShowPlannerGuide={() => setShowPlannerGuide(true)}
                onShowProjectsGuide={() => setShowProjectsGuide(true)}
                onShowCalendarGuide={() => setShowCalendarGuide(true)}
                onShowSharedSpacesGuide={() => setShowSharedSpacesGuide(true)}
                onShowSharedMindsOverview={() => setShowSharedMindsOverview(true)}
                onShowHouseholdGuide={() => setShowHouseholdGuide(true)}
                onShowPeopleGuide={() => setShowPeopleGuide(true)}
                onShowTrackersGuide={() => setShowTrackersGuide(true)}
                onShowTripsGuide={() => setShowTripsGuide(true)}
                onShowTeamsGuide={() => setShowTeamsGuide(true)}
              />
            </div>
          </div>

          {/* Swipe Hint - Show on first card */}
          {currentIndex === 0 && !isSwiping && (
            <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
              <div className="bg-gray-900/80 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm animate-pulse">
                Swipe to explore →
              </div>
            </div>
          )}
        </div>

        {/* Navigation - Large Touch Targets */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-5 py-4 safe-bottom">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button
              onClick={handlePrevious}
              disabled={isFirst || isTransitioning}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all touch-manipulation min-h-[48px] ${
                isFirst || isTransitioning
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 bg-gray-100 active:bg-gray-200 active:scale-95'
              }`}
            >
              <ChevronLeft size={22} />
              <span className="text-sm font-medium">Previous</span>
            </button>

            <div className="flex-1 flex justify-center">
              <div className="text-xs text-gray-400 font-medium">
                {currentItem.title}
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={isLast || isTransitioning}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all touch-manipulation min-h-[48px] ${
                isLast || isTransitioning
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 bg-gray-100 active:bg-gray-200 active:scale-95'
              }`}
            >
              <span className="text-sm font-medium">Next</span>
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Sub-guides */}
      <WidgetGuide
        isOpen={showWidgetGuide}
        onClose={() => setShowWidgetGuide(false)}
        onBack={() => setShowWidgetGuide(false)}
      />
      <GuardrailsGuide
        isOpen={showGuardrailsGuide}
        onClose={() => {
          setShowGuardrailsGuide(false);
          setGuardrailsSection(null);
        }}
        onBack={() => {
          setShowGuardrailsGuide(false);
          setGuardrailsSection(null);
        }}
        sectionId={guardrailsSection || undefined}
      />
      <PlannerGuide
        isOpen={showPlannerGuide}
        onClose={() => setShowPlannerGuide(false)}
        onBack={() => setShowPlannerGuide(false)}
      />
      <ProjectsGuide
        isOpen={showProjectsGuide}
        onClose={() => setShowProjectsGuide(false)}
        onBack={() => setShowProjectsGuide(false)}
      />
      <CalendarGuide
        isOpen={showCalendarGuide}
        onClose={() => setShowCalendarGuide(false)}
        onBack={() => setShowCalendarGuide(false)}
      />
      <SharedSpacesGuide
        isOpen={showSharedSpacesGuide}
        onClose={() => setShowSharedSpacesGuide(false)}
        onBack={() => setShowSharedSpacesGuide(false)}
      />
      <SharedMindsOverview
        isOpen={showSharedMindsOverview}
        onClose={() => setShowSharedMindsOverview(false)}
        onBack={() => setShowSharedMindsOverview(false)}
      />
      <HouseholdGuide
        isOpen={showHouseholdGuide}
        onClose={() => setShowHouseholdGuide(false)}
        onBack={() => setShowHouseholdGuide(false)}
      />
      <PeopleGuide
        isOpen={showPeopleGuide}
        onClose={() => setShowPeopleGuide(false)}
        onBack={() => setShowPeopleGuide(false)}
      />
      <TrackersGuide
        isOpen={showTrackersGuide}
        onClose={() => setShowTrackersGuide(false)}
        onBack={() => setShowTrackersGuide(false)}
      />
      <TripsGuide
        isOpen={showTripsGuide}
        onClose={() => setShowTripsGuide(false)}
        onBack={() => setShowTripsGuide(false)}
      />
      <TeamsGuide
        isOpen={showTeamsGuide}
        onClose={() => setShowTeamsGuide(false)}
        onBack={() => setShowTeamsGuide(false)}
      />
    </>
  );
}
