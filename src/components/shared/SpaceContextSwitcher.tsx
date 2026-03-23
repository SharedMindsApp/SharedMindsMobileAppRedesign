/**
 * Space Context Switcher
 * 
 * Allows users to switch between Personal, Household, and Team contexts
 * for widgets that support multiple spaces.
 */

import { useState } from 'react';
import { User, Home, Users, ChevronDown } from 'lucide-react';
import { useSpaceContext, type SpaceOption } from '../../hooks/useSpaceContext';

interface SpaceContextSwitcherProps {
  currentSpaceId: string;
  onSpaceChange: (spaceId: string) => void;
  availableSpaces?: SpaceOption[];
  className?: string;
}

export function SpaceContextSwitcher({ 
  currentSpaceId, 
  onSpaceChange, 
  availableSpaces: providedSpaces,
  className = '' 
}: SpaceContextSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // If spaces are provided, use them; otherwise the hook will load them
  // This allows the switcher to work standalone or with the hook
  const spaces: SpaceOption[] = providedSpaces || [];

  const currentSpace = spaces.find(s => s.id === currentSpaceId);
  
  // Map space type to icon
  const getIcon = (type?: string) => {
    switch (type) {
      case 'personal': return User;
      case 'household': return Home;
      case 'team': return Users;
      default: return Home;
    }
  };
  
  const CurrentIcon = getIcon(currentSpace?.type);

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'personal': return 'Personal';
      case 'household': return 'Household';
      case 'team': return 'Team';
      default: return 'Space';
    }
  };

  if (spaces.length === 0) {
    return null; // Don't show switcher if no spaces available
  }

  if (spaces.length === 1) {
    // Only one space, just show label
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <CurrentIcon size={16} />
        <span>{currentSpace?.name || 'Space'}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 transition-colors text-sm"
      >
        <CurrentIcon size={14} className="text-stone-600 flex-shrink-0" />
        <span className="font-medium text-stone-700 truncate max-w-[120px]">{currentSpace?.name || 'Select Space'}</span>
        <span className="text-xs text-stone-500 hidden sm:inline">({getTypeLabel(currentSpace?.type || 'household')})</span>
        <ChevronDown size={12} className="text-stone-500 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 bg-white border border-stone-300 rounded-lg shadow-lg z-[60] min-w-[200px] max-w-[90vw] sm:max-w-[300px] max-h-[300px] overflow-y-auto">
            {spaces.map((space) => {
              const SpaceIcon = getIcon(space.type);
              const isSelected = space.id === currentSpaceId;
              
              return (
                <button
                  key={space.id}
                  onClick={() => {
                    onSpaceChange(space.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-stone-50 transition-colors ${
                    isSelected ? 'bg-stone-100' : ''
                  }`}
                >
                  <SpaceIcon size={16} className="text-stone-600" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-stone-900 truncate">{space.name}</div>
                    <div className="text-xs text-stone-500">{getTypeLabel(space.type)}</div>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-stone-500" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
