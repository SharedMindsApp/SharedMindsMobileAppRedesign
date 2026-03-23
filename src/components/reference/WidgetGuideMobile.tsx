/**
 * Widget Guide - Mobile View
 * 
 * Phase 9: Mobile-first widget guide using full screen with swipeable cards.
 */

import { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { WidgetGuideCard } from './WidgetGuideCard';
import { getAllWidgetGuideItems, type WidgetGuideItem } from './widgetGuideContent';

interface WidgetGuideMobileProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export function WidgetGuideMobile({
  isOpen,
  onClose,
  onBack,
}: WidgetGuideMobileProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const widgets = getAllWidgetGuideItems();
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const currentWidget = widgets[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === widgets.length - 1;

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

  const handleTouchStart = (e: TouchEvent) => {
    if (isTransitioning) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartRef.current || isTransitioning) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
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

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal || !isOpen) return;
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
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Full Screen Modal */}
      <div 
        ref={modalRef}
        className="fixed inset-0 z-50 flex flex-col bg-white safe-top safe-bottom"
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10 safe-top">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back"
              >
                <ArrowLeft size={20} className="text-gray-500" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              Widgets in Spaces
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
          {widgets.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-blue-600'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Card Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div 
            className="max-w-md mx-auto"
            style={{
              transform: `translateX(${swipeOffset}px)`,
              opacity: isSwiping ? 0.7 : 1,
              transition: isSwiping ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
            }}
          >
            <WidgetGuideCard widget={currentWidget} variant="mobile" />
          </div>
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 flex items-center justify-between px-4 py-4 border-t border-gray-200 bg-gray-50 safe-bottom">
          <button
            onClick={handlePrevious}
            disabled={isFirst}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors min-h-[44px] ${
              isFirst
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-medium">Previous</span>
          </button>

          <span className="text-sm text-gray-500">
            {currentIndex + 1} of {widgets.length}
          </span>

          <button
            onClick={handleNext}
            disabled={isLast}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors min-h-[44px] ${
              isLast
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-sm font-medium">Next</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </>
  );
}
