/**
 * PremiumModeSwitcher - Lens-Style Perspective Switcher
 * 
 * Redesigned to feel like changing a lens, not navigating to a new screen.
 * Uses segmented control styling for a premium, calm feel.
 * 
 * Design Philosophy:
 * - Feels like a lens, not navigation
 * - Preserves state visually and emotionally
 * - No page resets, no "new screen" feeling
 */

import { CheckSquare, Repeat, Target, Award } from 'lucide-react';
import type { TrackerPerspective } from '../../../hooks/useTrackerPerspective';

export interface PremiumModeSwitcherProps {
  currentMode: TrackerPerspective;
  onModeChange: (mode: TrackerPerspective) => void;
  compact?: boolean;
}

export function PremiumModeSwitcher({
  currentMode,
  onModeChange,
  compact = false,
}: PremiumModeSwitcherProps) {
  const modes: Array<{ mode: TrackerPerspective; label: string; icon: React.ReactNode }> = [
    { mode: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} /> },
    { mode: 'habits', label: 'Habits', icon: <Repeat size={16} /> },
    { mode: 'goals', label: 'Goals', icon: <Target size={16} /> },
    { mode: 'skills', label: 'Skills', icon: <Award size={16} /> },
  ];

  const currentIndex = modes.findIndex(m => m.mode === currentMode);

  return (
    <div className={`
      relative
      inline-flex items-center gap-0.5
      ${compact ? 'p-0.5' : 'p-1'}
      bg-gray-100 rounded-xl
    `}>
      {/* Sliding Indicator */}
      <div
        className={`
          absolute
          ${compact ? 'h-[calc(100%-4px)]' : 'h-[calc(100%-8px)]'}
          bg-white
          rounded-lg
          shadow-sm
          transition-all duration-200 ease-out
          ${compact ? 'top-0.5' : 'top-1'}
        `}
        style={{
          width: `calc(${100 / modes.length}% - ${compact ? '2px' : '4px'})`,
          left: `calc(${currentIndex * (100 / modes.length)}% + ${compact ? '2px' : '4px'})`,
        }}
      />
      
      {modes.map(({ mode, label, icon }) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          className={`
            relative z-10
            flex items-center gap-1.5
            ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}
            rounded-lg
            text-sm font-medium
            transition-colors duration-200
            ${
              currentMode === mode
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }
          `}
          aria-label={`Switch to ${label} view`}
          aria-pressed={currentMode === mode}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
