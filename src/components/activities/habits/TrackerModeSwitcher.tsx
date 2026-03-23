/**
 * Tracker Mode Switcher
 * 
 * Persistent switcher for switching between different tracker perspectives:
 * - Tasks
 * - Habits (default)
 * - Goals
 * - Skills
 * 
 * This is perspective switching, not navigation. UI state is preserved.
 */

import { CheckSquare, Repeat, Target, Award } from 'lucide-react';
import type { TrackerPerspective } from '../../../hooks/useTrackerPerspective';

// Re-export for backward compatibility
export type TrackerMode = TrackerPerspective;

export interface TrackerModeSwitcherProps {
  currentMode: TrackerPerspective;
  onModeChange: (mode: TrackerPerspective) => void;
  compact?: boolean;
}

export function TrackerModeSwitcher({
  currentMode,
  onModeChange,
  compact = false,
}: TrackerModeSwitcherProps) {
  const modes: Array<{ mode: TrackerMode; label: string; icon: React.ReactNode }> = [
    { mode: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} /> },
    { mode: 'habits', label: 'Habits', icon: <Repeat size={16} /> },
    { mode: 'goals', label: 'Goals', icon: <Target size={16} /> },
    { mode: 'skills', label: 'Skills', icon: <Award size={16} /> },
  ];

  return (
    <div className={`flex items-center gap-1 ${compact ? 'p-2' : 'p-3'} bg-gray-50 rounded-lg border border-gray-200`}>
      {modes.map(({ mode, label, icon }) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentMode === mode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
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
