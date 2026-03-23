/**
 * RoadmapOnboardingCarousel
 * 
 * Phase 5: Mobile-first carousel component for empty roadmap onboarding.
 * 
 * Features:
 * - Horizontal swipeable cards
 * - Auto-advance every 5 seconds
 * - Pause auto-advance on user interaction
 * - Pagination dots
 * - Smooth CSS transitions
 */

import { useState, useEffect, useRef } from 'react';
import { RoadmapOnboardingCard, ONBOARDING_CARDS, type OnboardingCardData } from './RoadmapOnboardingCard';

const SWIPE_THRESHOLD = 50; // Minimum swipe distance (px)
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum swipe velocity (px/ms)
const AUTO_ADVANCE_INTERVAL = 5000; // 5 seconds

interface RoadmapOnboardingCarouselProps {
  onCardClick?: (cardId: string) => void;
}

export function RoadmapOnboardingCarousel({ onCardClick }: RoadmapOnboardingCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(false);
  
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentCard = ONBOARDING_CARDS[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === ONBOARDING_CARDS.length - 1;

  // Reset swipe state when index changes
  useEffect(() => {
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [currentIndex]);

  // Auto-advance functionality
  useEffect(() => {
    // Clear any existing timer
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
    }

    // Don't auto-advance if paused, transitioning, swiping, or on last card
    if (autoAdvancePaused || isTransitioning || isSwiping || isLast) {
      return;
    }

    // Set up auto-advance timer
    autoAdvanceTimerRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev < ONBOARDING_CARDS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, AUTO_ADVANCE_INTERVAL);

    // Cleanup
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
      }
    };
  }, [currentIndex, autoAdvancePaused, isTransitioning, isSwiping, isLast]);

  // Pause auto-advance on any user interaction
  const pauseAutoAdvance = () => {
    setAutoAdvancePaused(true);
    // Resume after 10 seconds of inactivity
    setTimeout(() => {
      setAutoAdvancePaused(false);
    }, 10000);
  };

  function handleNext() {
    if (!isLast && !isTransitioning) {
      pauseAutoAdvance();
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsTransitioning(false);
      }, 150);
    }
  }

  function handlePrevious() {
    if (!isFirst && !isTransitioning) {
      pauseAutoAdvance();
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setIsTransitioning(false);
      }, 150);
    }
  }

  function goToCard(index: number) {
    if (index !== currentIndex && !isTransitioning) {
      pauseAutoAdvance();
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(index);
        setIsTransitioning(false);
      }, 150);
    }
  }

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    pauseAutoAdvance();
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isTransitioning) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    // Only trigger swipe if horizontal movement is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      // Don't call preventDefault() on passive events - just update state
      setIsSwiping(true);
      setSwipeOffset(Math.max(-100, Math.min(100, deltaX)));
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

    // Determine if swipe threshold or velocity threshold was met
    if (Math.abs(swipeOffset) >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY_THRESHOLD) {
      if (swipeOffset < 0 && !isLast) {
        handleNext();
      } else if (swipeOffset > 0 && !isFirst) {
        handlePrevious();
      } else {
        setSwipeOffset(0);
      }
    } else {
      setSwipeOffset(0);
    }

    touchStartRef.current = null;
    setIsSwiping(false);
  };

  // Click handler for card navigation (future deep-linking)
  const handleCardClick = () => {
    if (onCardClick && currentCard) {
      onCardClick(currentCard.id);
    }
  };

  return (
    <div className="w-full">
      {/* Carousel Container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y pinch-zoom' }}
      >
        {/* Card Wrapper with Transform */}
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${swipeOffset}px))`,
            opacity: isSwiping ? 0.85 : 1,
            willChange: isSwiping ? 'transform' : 'auto',
          }}
        >
          {ONBOARDING_CARDS.map((card, index) => (
            <div
              key={card.id}
              className="w-full flex-shrink-0 px-4"
              onClick={handleCardClick}
              style={{ cursor: onCardClick ? 'pointer' : 'default' }}
            >
              <RoadmapOnboardingCard
                card={card}
                isActive={true}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {ONBOARDING_CARDS.map((_, index) => (
          <button
            key={index}
            onClick={() => goToCard(index)}
            className={`
              rounded-full transition-all duration-200
              ${index === currentIndex
                ? 'w-8 h-2 bg-blue-600'
                : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
              }
            `}
            aria-label={`Go to card ${index + 1}`}
            aria-current={index === currentIndex ? 'true' : 'false'}
          />
        ))}
      </div>

      {/* Optional: Previous/Next buttons (hidden on mobile, visible on desktop) */}
      <div className="hidden md:flex items-center justify-between mt-6 px-4">
        <button
          onClick={handlePrevious}
          disabled={isFirst || isTransitioning}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${isFirst || isTransitioning
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
          `}
          aria-label="Previous card"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={isLast || isTransitioning}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${isLast || isTransitioning
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
          `}
          aria-label="Next card"
        >
          Next
        </button>
      </div>
    </div>
  );
}
