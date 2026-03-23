/**
 * SharedSpaceMenu Component
 * 
 * Bottom sheet menu for switching between spaces.
 * Always uses BottomSheet component which handles mobile/desktop rendering.
 */

import { Home, Users, User, Check, Settings, Plus } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import type { SharedSpace } from './SharedSpaceSwitcher';

interface SharedSpaceMenuProps {
  isOpen: boolean;
  onClose: () => void;
  personalSpace: SharedSpace | null;
  sharedSpaces: SharedSpace[];
  currentMode: 'personal' | 'shared';
  currentSharedSpace: SharedSpace | null;
  onSelect: (space: SharedSpace) => void;
  onManageSpaces?: () => void;
  onCreateHousehold?: () => void;
  onCreateTeam?: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

export function SharedSpaceMenu({
  isOpen,
  onClose,
  personalSpace,
  sharedSpaces,
  currentMode,
  currentSharedSpace,
  onSelect,
  onManageSpaces,
  onCreateHousehold,
  onCreateTeam,
  triggerRef,
}: SharedSpaceMenuProps) {
  // Group shared spaces by type
  const householdSpaces = sharedSpaces.filter(s => s.type === 'household');
  const teamSpaces = sharedSpaces.filter(s => s.type === 'team');

  const renderSpaceItem = (space: SharedSpace, isSelected: boolean, isPersonal: boolean = false) => {
    const Icon = space.icon;

    return (
      <button
        key={space.id}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect(space);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect(space);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect(space);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all min-h-[52px] ${
          isSelected
            ? 'bg-blue-50 text-blue-700 shadow-sm'
            : 'hover:bg-gray-50 active:bg-gray-100 text-gray-700'
        } ${isPersonal ? 'border border-gray-200' : ''}`}
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-selected={isSelected}
        role="option"
        type="button"
      >
        <div className={`flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
          <Icon size={22} />
        </div>
        <span className="flex-1 font-medium text-base">{space.name}</span>
        {isSelected && (
          <div className="flex-shrink-0">
            <Check size={20} className="text-blue-600" />
          </div>
        )}
      </button>
    );
  };

  // Always use BottomSheet - it handles mobile (bottom sheet) vs desktop (modal) internally
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Switch Space"
      maxHeight="85vh"
      showCloseButton={true}
      closeOnBackdrop={true}
    >
      <div className="space-y-6 pb-4">
        {/* PERSONAL - Mode Switch Section */}
        {personalSpace && (
          <div className="px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
              Personal
            </h3>
            <div className="space-y-1">
              {renderSpaceItem(personalSpace, currentMode === 'personal', true)}
            </div>
            {currentMode === 'personal' && (
              <p className="text-xs text-gray-400 mt-2 px-2">
                Your personal workspace
              </p>
            )}
          </div>
        )}

        {/* SHARED - Households and Teams */}
        {(householdSpaces.length > 0 || teamSpaces.length > 0) && (
          <div className="px-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
              Shared
            </h3>
            <div className="space-y-1">
              {/* Households */}
              {householdSpaces.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-400 mb-2 px-2">Households</h4>
                  <div className="space-y-1">
                    {householdSpaces.map(space => 
                      renderSpaceItem(space, currentMode === 'shared' && currentSharedSpace?.id === space.id)
                    )}
                  </div>
                </div>
              )}
              
              {/* Teams */}
              {teamSpaces.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-400 mb-2 px-2">Teams</h4>
                  <div className="space-y-1">
                    {teamSpaces.map(space => 
                      renderSpaceItem(space, currentMode === 'shared' && currentSharedSpace?.id === space.id)
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!personalSpace && sharedSpaces.length === 0 && (
          <div className="text-center text-gray-500 py-8 px-4">
            <p className="text-sm">No spaces available</p>
          </div>
        )}

        {/* Shared-only UI: Only show when in shared mode */}
        {currentMode === 'shared' && (
          <>
            {/* Create options - only in shared mode */}
            {(onCreateHousehold || onCreateTeam) && (
              <div className="pt-4 border-t border-gray-200 mt-4 space-y-1 px-2">
                {onCreateHousehold && (
                  <button
                    onClick={() => {
                      onClose();
                      onCreateHousehold();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors min-h-[44px] active:bg-gray-100 text-gray-700"
                  >
                    <Plus size={20} className="text-blue-600" />
                    <Home size={20} className="text-blue-600" />
                    <span className="flex-1 font-medium">Create Household</span>
                  </button>
                )}
                {onCreateTeam && (
                  <button
                    onClick={() => {
                      onClose();
                      onCreateTeam();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors min-h-[44px] active:bg-gray-100 text-gray-700"
                  >
                    <Plus size={20} className="text-purple-600" />
                    <Users size={20} className="text-purple-600" />
                    <span className="flex-1 font-medium">Create Team</span>
                  </button>
                )}
              </div>
            )}

            {/* Manage Shared Spaces option - only in shared mode */}
            {onManageSpaces && (
              <div className="pt-2 border-t border-gray-200 mt-2 px-2">
                <button
                  onClick={() => {
                    onClose();
                    onManageSpaces();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors min-h-[44px] active:bg-gray-100 text-gray-700"
                >
                  <Settings size={20} className="text-gray-500" />
                  <span className="flex-1 font-medium">Manage Shared Spaces</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
