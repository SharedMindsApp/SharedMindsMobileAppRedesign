/**
 * Guardrails Guide - Mobile View
 * 
 * Phase 9: Mobile-first Guardrails feature guide using full screen.
 * Shows feature index first, then allows navigation between features.
 */

import { useState, useRef, useEffect } from 'react';
import { X, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { GuardrailsGuideCard } from './GuardrailsGuideCard';
import { GuardrailsFeaturesIndex } from './GuardrailsFeaturesIndex';
import { getGuardrailsGuideItem, getAllGuardrailsGuideItems, type GuardrailsGuideItem } from './guardrailsGuideContent';

interface GuardrailsGuideMobileProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  sectionId?: string;
}

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export function GuardrailsGuideMobile({
  isOpen,
  onClose,
  onBack,
  sectionId: initialSectionId,
}: GuardrailsGuideMobileProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(initialSectionId || null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const features = getAllGuardrailsGuideItems();
  const currentFeature = selectedSectionId ? getGuardrailsGuideItem(selectedSectionId) : null;
  const currentIndex = selectedSectionId ? features.findIndex(f => f.id === selectedSectionId) : -1;
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= features.length - 1;

  useEffect(() => {
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [currentIndex]);

  if (!isOpen) return null;

  const handleSelectFeature = (featureId: string) => {
    setSelectedSectionId(featureId);
  };

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < features.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedSectionId(features[currentIndex + 1].id);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedSectionId(features[currentIndex - 1].id);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handleBackToIndex = () => {
    setSelectedSectionId(null);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (isTransitioning || !currentFeature) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartRef.current || isTransitioning || !currentFeature) return;
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
    if (!touchStartRef.current || !isSwiping || isTransitioning || !currentFeature) {
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
    if (!modal || !isOpen || !currentFeature) return;
    modal.addEventListener('touchmove', handleTouchMove, { passive: false });
    modal.addEventListener('touchstart', handleTouchStart, { passive: true });
    modal.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      modal.removeEventListener('touchmove', handleTouchMove);
      modal.removeEventListener('touchstart', handleTouchStart);
      modal.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, isTransitioning, isSwiping, swipeOffset, isFirst, isLast, currentFeature]);

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
            {selectedSectionId ? (
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
              {currentFeature ? currentFeature.title : 'Guardrails Features'}
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
                <GuardrailsGuideCard feature={currentFeature} variant="mobile" />
                
                {/* Quick Navigation to Other Features */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    Other Features
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {features
                      .filter(f => f.id !== selectedSectionId)
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
              <GuardrailsFeaturesIndex
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
