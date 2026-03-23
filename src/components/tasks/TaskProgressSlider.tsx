/**
 * TaskProgressSlider - Draggable progress slider for tasks (0-100%)
 * 
 * Phase 6: Progress control for tasks with drag, tap, and keyboard support.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface TaskProgressSliderProps {
  taskId: string;
  currentProgress: number; // 0-100
  onProgressChange: (taskId: string, progress: number) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md'; // Size variant
  showLabel?: boolean; // Show percentage label
}

export function TaskProgressSlider({
  taskId,
  currentProgress,
  onProgressChange,
  disabled = false,
  size = 'md',
  showLabel = true,
}: TaskProgressSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(currentProgress);
  const [isUpdating, setIsUpdating] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Sync local progress with current progress when it changes externally
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(currentProgress);
    }
  }, [currentProgress, isDragging]);

  // Calculate progress from mouse/touch position
  const getProgressFromPosition = useCallback((clientX: number): number => {
    if (!sliderRef.current) return localProgress;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    // Round to nearest 5% for better UX
    return Math.round(percentage / 5) * 5;
  }, [localProgress]);

  // Update progress and sync to server
  const updateProgress = useCallback(
    async (newProgress: number) => {
      const clampedProgress = Math.max(0, Math.min(100, newProgress));
      setLocalProgress(clampedProgress);

      if (!disabled) {
        setIsUpdating(true);
        try {
          await onProgressChange(taskId, clampedProgress);
        } catch (err) {
          console.error('[TaskProgressSlider] Error updating progress:', err);
          // Revert on error
          setLocalProgress(currentProgress);
        } finally {
          setIsUpdating(false);
        }
      }
    },
    [taskId, onProgressChange, disabled, currentProgress]
  );

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
      const newProgress = getProgressFromPosition(e.clientX);
      updateProgress(newProgress);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const progress = getProgressFromPosition(moveEvent.clientX);
        setLocalProgress(progress);
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        const finalProgress = getProgressFromPosition(upEvent.clientX);
        updateProgress(finalProgress);
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [disabled, getProgressFromPosition, updateProgress]
  );

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
      const touch = e.touches[0];
      const newProgress = getProgressFromPosition(touch.clientX);
      updateProgress(newProgress);

      const handleTouchMove = (moveEvent: TouchEvent) => {
        moveEvent.preventDefault();
        const touch = moveEvent.touches[0];
        const progress = getProgressFromPosition(touch.clientX);
        setLocalProgress(progress);
      };

      const handleTouchEnd = (endEvent: TouchEvent) => {
        endEvent.preventDefault();
        if (endEvent.changedTouches.length > 0) {
          const touch = endEvent.changedTouches[0];
          const finalProgress = getProgressFromPosition(touch.clientX);
          updateProgress(finalProgress);
        }
        setIsDragging(false);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
    },
    [disabled, getProgressFromPosition, updateProgress]
  );

  // Click/tap on track
  const handleTrackClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const newProgress = getProgressFromPosition(clientX);
      updateProgress(newProgress);
    },
    [disabled, getProgressFromPosition, updateProgress]
  );

  // Keyboard support (arrow keys adjust by 5%)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      let delta = 0;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        delta = -5;
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        delta = 5;
      } else if (e.key === 'Home') {
        delta = -localProgress;
      } else if (e.key === 'End') {
        delta = 100 - localProgress;
      }

      if (delta !== 0) {
        e.preventDefault();
        const newProgress = localProgress + delta;
        updateProgress(newProgress);
      }
    },
    [disabled, localProgress, updateProgress]
  );

  const displayProgress = isDragging ? localProgress : currentProgress;
  const height = size === 'sm' ? 'h-1.5' : 'h-2';
  const thumbSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Progress Slider */}
      <div
        ref={sliderRef}
        className={`flex-1 ${height} bg-gray-200 rounded-full relative cursor-pointer transition-opacity ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'
        }`}
        onClick={handleTrackClick}
        onTouchStart={handleTrackClick}
        role="slider"
        aria-label="Task progress"
        aria-valuenow={displayProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        {/* Filled portion */}
        <div
          className={`${height} bg-blue-600 rounded-full transition-all duration-150 ${
            isDragging || isUpdating ? '' : 'transition-colors'
          }`}
          style={{ width: `${displayProgress}%` }}
        />

        {/* Thumb */}
        <div
          ref={thumbRef}
          className={`absolute ${thumbSize} -top-0.5 -translate-x-1/2 bg-blue-600 rounded-full border-2 border-white shadow-md transition-all ${
            disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          } ${isDragging ? 'scale-110' : ''} ${
            size === 'sm' ? 'top-[-2px]' : 'top-[-2px]'
          }`}
          style={{ left: `${displayProgress}%` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          role="button"
          aria-label="Drag to adjust progress"
        />
      </div>

      {/* Percentage Label */}
      {showLabel && displayProgress > 0 && (
        <span
          className={`text-xs font-medium text-gray-600 tabular-nums min-w-[2.5rem] text-right ${
            size === 'sm' ? 'text-[10px]' : 'text-xs'
          }`}
        >
          {displayProgress}%
        </span>
      )}
    </div>
  );
}
