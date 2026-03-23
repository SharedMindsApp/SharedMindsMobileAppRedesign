/**
 * Planner Guide - Mobile View
 * 
 * Phase 9: Mobile-first Planner feature guide using full screen.
 * Shows feature index first, then allows navigation between features.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { PlannerGuideCard } from './PlannerGuideCard';
import { PlannerFeaturesIndex } from './PlannerFeaturesIndex';
import { getPlannerGuideItem, getAllPlannerGuideItems, type PlannerGuideItem } from './plannerGuideContent';

interface PlannerGuideMobileProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  featureId?: string;
}

const SWIPE_THRESHOLD = 50; // Minimum swipe distance (px)
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity (px/ms)

export function PlannerGuideMobile({
  isOpen,
  onClose,
  onBack,
  featureId: initialFeatureId,
}: PlannerGuideMobileProps) {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(initialFeatureId || null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const features = getAllPlannerGuideItems();
  const currentFeature = selectedFeatureId ? getPlannerGuideItem(selectedFeatureId) : null;
  const currentIndex = selectedFeatureId ? features.findIndex(f => f.id === selectedFeatureId) : -1;
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= features.length - 1;

  // Reset swipe state when index changes
  useEffect(() => {
    if (!isOpen) return;
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [currentIndex, isOpen]);

  const handleSelectFeature = (featureId: string) => {
    setSelectedFeatureId(featureId);
  };

  const handleNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < features.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedFeatureId(features[currentIndex + 1].id);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentIndex, features, isTransitioning]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedFeatureId(features[currentIndex - 1].id);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentIndex, features, isTransitioning]);

  const handleBackToIndex = () => {
    setSelectedFeatureId(null);
  };

  // Swipe gesture handlers - only active when viewing a feature (not index)
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isTransitioning || !currentFeature) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, [isTransitioning, currentFeature]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current || isTransitioning || !currentFeature) return;

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
  }, [isTransitioning, currentFeature]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !isSwiping || isTransitioning || !currentFeature) {
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
  }, [isSwiping, isTransitioning, currentFeature, swipeOffset, isFirst, isLast, handleNext, handlePrevious]);

  // Add touch event listeners when viewing a feature
  useEffect(() => {
    if (!isOpen) return;
    
    const modal = modalRef.current;
    if (!modal || !currentFeature) return;

    modal.addEventListener('touchmove', handleTouchMove, { passive: false });
    modal.addEventListener('touchstart', handleTouchStart, { passive: true });
    modal.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      modal.removeEventListener('touchmove', handleTouchMove);
      modal.removeEventListener('touchstart', handleTouchStart);
      modal.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, currentFeature, handleTouchStart, handleTouchMove, handleTouchEnd]);

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
            {selectedFeatureId ? (
              <button
                onClick={handleBackToIndex}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to features"
              >
                <ArrowLeft size={20} className="text-gray-500" />
              </button>
            ) : onBack ? (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back"
              >
                <ArrowLeft size={20} className="text-gray-500" />
              </button>
            ) : null}
            <h2 className="text-xl font-semibold text-gray-900">
              {currentFeature ? currentFeature.title : 'Planner Features'}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto">
            {currentFeature ? (
              <div
                style={{
                  transform: `translateX(${swipeOffset}px)`,
                  opacity: isSwiping ? 0.7 : 1,
                  transition: isSwiping ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
                }}
              >
                <PlannerGuideCard feature={currentFeature} variant="mobile" />
                
                {/* Quick Navigation to Other Features */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    Other Features
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {features
                      .filter(f => f.id !== selectedFeatureId)
                      .slice(0, 6)
                      .map(feature => (
                        <button
                          key={feature.id}
                          onClick={() => handleSelectFeature(feature.id)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                          <span>{feature.icon}</span>
                          <span>{feature.title}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <PlannerFeaturesIndex
                features={features}
                onSelectFeature={handleSelectFeature}
                variant="mobile"
              />
            )}
          </div>
        </div>

        {/* Navigation Arrows (only when viewing a feature) */}
        {currentFeature && (
          <div className="sticky bottom-0 flex items-center justify-between px-4 py-4 border-t border-gray-200 bg-gray-50 safe-bottom">
            <button
              onClick={handlePrevious}
              disabled={currentIndex <= 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors min-h-[44px] ${
                currentIndex <= 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft size={20} />
              <span className="text-sm font-medium">Previous</span>
            </button>

            <span className="text-sm text-gray-500">
              {currentIndex + 1} of {features.length}
            </span>

            <button
              onClick={handleNext}
              disabled={currentIndex >= features.length - 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors min-h-[44px] ${
                currentIndex >= features.length - 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-sm font-medium">Next</span>
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
