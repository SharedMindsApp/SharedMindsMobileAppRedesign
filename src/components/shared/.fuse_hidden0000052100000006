/**
 * SharedSpaceSwitcher Component
 * 
 * Header component that allows users to switch between:
 * - Personal space
 * - Household spaces
 * - Team spaces
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveData } from '../../contexts/ActiveDataContext';
import type { SpaceContextType } from '../../lib/spaceTypes';
import { supabase } from '../../lib/supabase';

// Space Mode: Personal is a mode, not a space
type SpaceMode = 'personal' | 'shared';

export interface SharedSpace {
  id: string;
  name: string;
  type: SpaceContextType;
  icon: typeof Home | typeof Users | typeof User;
}

// Import after type definition to avoid circular dependency
import { SharedSpaceMenu } from './SharedSpaceMenu';

interface SharedSpaceSwitcherProps {
  onManageSpaces?: () => void;
  onCreateHousehold?: () => void;
  onCreateTeam?: () => void;
}

export function SharedSpaceSwitcher({ onManageSpaces, onCreateHousehold, onCreateTeam }: SharedSpaceSwitcherProps = {}) {
  const { user, profile } = useAuth();
  const { state: adcState, setSpaceContext } = useActiveData();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [spaces, setSpaces] = useState<SharedSpace[]>([]);
  const [personalSpace, setPersonalSpace] = useState<SharedSpace | null>(null);
  const [sharedSpaces, setSharedSpaces] = useState<SharedSpace[]>([]);
  const [currentMode, setCurrentMode] = useState<SpaceMode>('personal');
  const [currentSharedSpace, setCurrentSharedSpace] = useState<SharedSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Load spaces on mount and when profile changes
  useEffect(() => {
    if (user) {
      loadSpaces();
    }
  }, [user, profile?.id]);

  // Update current mode and space based on route and ADC state
  useEffect(() => {
    updateCurrentModeAndSpace();
  }, [adcState.activeSpaceType, adcState.activeSpaceId, spaces, location.pathname]);

  // Proof logging: Track isOpen state changes
  useEffect(() => {
    console.log('[SpaceSwitcher] isOpen changed:', isOpen, {
      pathname: location.pathname,
      time: Date.now(),
    });
  }, [isOpen, location.pathname]);

  // Proof logging: Track when sheet should render
  useEffect(() => {
    if (isOpen) {
      console.log('[SpaceSwitcher] Sheet should render via portal', {
        pathname: location.pathname,
        time: Date.now(),
      });
    }
  }, [isOpen, location.pathname]);

  const loadSpaces = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get profile ID (use from context if available, otherwise fetch)
      let profileId: string | null = null;
      if (profile) {
        profileId = profile.id;
      } else {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        profileId = profileData?.id || null;
      }

      if (!profileId) {
        setLoading(false);
        return;
      }

      // Get personal space (spaces with context_type = 'personal')
      // Use user's full name for personal space display
      let personalSpaces: Array<{ id: string; name: string; type: 'personal' }> = [];
      const { data: personalMemberships } = await supabase
        .from('space_members')
        .select('space_id, spaces!inner(id, name, context_type)')
        .eq('user_id', profileId)
        .eq('status', 'active')
        .eq('spaces.context_type', 'personal')
        .limit(1);

      if (personalMemberships && personalMemberships.length > 0) {
        // Get user's full name for personal space - fetch if not in context
        let displayName = profile?.full_name;
        if (!displayName) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', profileId)
            .maybeSingle();
          displayName = profileData?.full_name || user?.email?.split('@')[0] || 'Personal Space';
        }
        
        personalSpaces = personalMemberships
          .filter(m => m.spaces && (m.spaces as any).context_type === 'personal')
          .map(m => ({
            id: (m.spaces as any).id,
            name: displayName || 'Personal Space',
            type: 'personal' as const,
          }));
      }

      // Get household spaces (spaces with context_type = 'household')
      let householdSpaces: Array<{ id: string; name: string; type: 'household' }> = [];
      const { data: householdMemberships } = await supabase
        .from('space_members')
        .select('space_id, spaces!inner(id, name, context_type, context_id)')
        .eq('user_id', profileId)
        .eq('status', 'active')
        .eq('spaces.context_type', 'household');

      if (householdMemberships) {
        householdSpaces = householdMemberships
          .filter(m => m.spaces && (m.spaces as any).context_type === 'household')
          .map(m => ({
            id: (m.spaces as any).id,
            name: (m.spaces as any).name || 'Unnamed Household',
            type: 'household' as const,
          }));
      }

      // Get team spaces (spaces with context_type = 'team')
      let teamSpaces: Array<{ id: string; name: string; type: 'team' }> = [];
      const { data: teamMemberships } = await supabase
        .from('space_members')
        .select('space_id, spaces!inner(id, name, context_type, context_id)')
        .eq('user_id', profileId)
        .eq('status', 'active')
        .eq('spaces.context_type', 'team');

      if (teamMemberships) {
        teamSpaces = teamMemberships
          .filter(m => m.spaces && (m.spaces as any).context_type === 'team')
          .map(m => ({
            id: (m.spaces as any).id,
            name: (m.spaces as any).name || 'Unnamed Team',
            type: 'team' as const,
          }));
      }

      // Separate Personal from Shared spaces
      const personal = personalSpaces.length > 0 ? personalSpaces.map(s => ({ ...s, icon: User }))[0] : null;
      const shared: SharedSpace[] = [
        ...householdSpaces.map(s => ({ ...s, icon: Home })),
        ...teamSpaces.map(s => ({ ...s, icon: Users })),
      ];

      setPersonalSpace(personal);
      setSharedSpaces(shared);
      setSpaces(personal ? [personal, ...shared] : shared);
    } catch (error) {
      console.error('Error loading spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine current mode from route and update state accordingly
  const updateCurrentModeAndSpace = () => {
    const path = location.pathname;
    
    // Check route to determine mode
    if (path === '/spaces/personal' || path.startsWith('/spaces/personal/')) {
      // Personal Mode
      setCurrentMode('personal');
      setCurrentSharedSpace(null);
      
      // Update ADC to personal mode (clear spaceId)
      if (adcState.activeSpaceType !== 'personal' || adcState.activeSpaceId !== null) {
        setSpaceContext('personal', null);
      }
    } else if (path.startsWith('/spaces/') && path !== '/spaces/shared') {
      // Shared Mode - extract spaceId from route
      const match = path.match(/^\/spaces\/([^/]+)/);
      const spaceIdFromRoute = match ? match[1] : null;
      
      if (spaceIdFromRoute && spaceIdFromRoute !== 'personal' && spaceIdFromRoute !== 'shared') {
        // Find space in all spaces (includes both personal and shared)
        const space = spaces.find(s => s.id === spaceIdFromRoute && s.type !== 'personal');
        if (space) {
          setCurrentMode('shared');
          setCurrentSharedSpace(space);
          
          // Update ADC to shared mode
          if (adcState.activeSpaceType !== 'shared' || adcState.activeSpaceId !== spaceIdFromRoute) {
            setSpaceContext('shared', spaceIdFromRoute);
          }
          return;
        }
      }
      
      // Fallback: if we're on a shared route but space not found, default to personal
      setCurrentMode('personal');
      setCurrentSharedSpace(null);
      setSpaceContext('personal', null);
    } else {
      // Default to personal mode
      setCurrentMode('personal');
      setCurrentSharedSpace(null);
      
      if (adcState.activeSpaceType !== 'personal' || adcState.activeSpaceId !== null) {
        setSpaceContext('personal', null);
      }
    }
  };

  const handleSpaceSelect = (space: SharedSpace) => {
    setIsOpen(false);
    
    // Explicit mode-aware selection (but gesture-agnostic)
    if (space.type === 'personal') {
      // Personal Space: Mode switch, not space selection
      // Clear shared context and switch to Personal Mode
      setSpaceContext('personal', null);
      setCurrentMode('personal');
      setCurrentSharedSpace(null);
      navigate('/spaces/personal');
      return;
    }
    
    // Shared Space: Set shared mode and space
    setSpaceContext('shared', space.id);
    setCurrentMode('shared');
    setCurrentSharedSpace(space);
    navigate(`/spaces/${space.id}`);
  };

  // Determine display name and icon based on current mode
  const getDisplayInfo = () => {
    if (loading) {
      return {
        icon: User,
        name: profile?.full_name || 'Loading...',
        label: 'Switch Space'
      };
    }
    
    if (currentMode === 'personal') {
      return {
        icon: User,
        name: personalSpace?.name || profile?.full_name || 'Personal Space',
        label: 'Switch Space'
      };
    } else {
      return {
        icon: currentSharedSpace?.icon || Home,
        name: currentSharedSpace?.name || 'Shared Space',
        label: `Switch Space: ${currentSharedSpace?.name || 'Shared'}`
      };
    }
  };

  const displayInfo = getDisplayInfo();
  const Icon = displayInfo.icon;

  // Proof logging: Open function with logging
  const open = () => {
    console.log('[SpaceSwitcher] open() called', {
      pathname: location.pathname,
      currentMode,
      time: Date.now(),
    });
    setIsOpen(true);
  };

  return (
    <div 
      className="relative" 
      data-gesture-exempt="true"
      data-space-switcher="true"
      style={{ 
        pointerEvents: 'auto', 
        zIndex: 41,
        touchAction: 'manipulation'
      }}
    >
      <button
        ref={triggerRef}
        onPointerDownCapture={(e) => {
          console.log('[SpaceSwitcher] pointerDownCapture', {
            target: e.target,
            currentTarget: e.currentTarget,
            time: Date.now(),
          });
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          console.log('[SpaceSwitcher] pointerDown', {
            target: e.target,
            currentTarget: e.currentTarget,
            time: Date.now(),
          });
          e.preventDefault();
          e.stopPropagation();
          open();
        }}
        onClick={(e) => {
          console.log('[SpaceSwitcher] click fallback', {
            target: e.target,
            currentTarget: e.currentTarget,
            time: Date.now(),
          });
          e.preventDefault();
          e.stopPropagation();
          open();
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] cursor-pointer relative z-[41]"
        style={{ 
          pointerEvents: 'auto', 
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        }}
        aria-label={displayInfo.label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        type="button"
      >
        <Icon size={18} className="text-gray-600 flex-shrink-0" />
        <span className="truncate max-w-[200px] sm:max-w-none">{displayInfo.name}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Render sheet via portal to document.body to avoid overflow/clipping issues */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            pointerEvents: 'auto',
          }}
          data-space-switcher-portal="true"
        >
          <SharedSpaceMenu
            isOpen={isOpen}
            onClose={() => {
              console.log('[SpaceSwitcher] close() called');
              setIsOpen(false);
            }}
            personalSpace={personalSpace}
            sharedSpaces={sharedSpaces}
            currentMode={currentMode}
            currentSharedSpace={currentSharedSpace}
            onSelect={handleSpaceSelect}
            onManageSpaces={currentMode === 'shared' ? onManageSpaces : undefined}
            onCreateHousehold={currentMode === 'shared' ? onCreateHousehold : undefined}
            onCreateTeam={currentMode === 'shared' ? onCreateTeam : undefined}
            triggerRef={triggerRef}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
