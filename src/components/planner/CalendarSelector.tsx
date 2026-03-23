/**
 * Calendar Selector Component
 * 
 * Allows users to switch between:
 * - My Calendar (personal)
 * - Household Calendar (if available)
 * - Shared Calendars (calendars shared with me)
 */

import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, Check, Users, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BottomSheet } from '../shared/BottomSheet';
import {
  type ActiveCalendarContext,
  createPersonalContext,
  isContextReadOnly,
  getContextKey,
  getPermissionLabel,
} from '../../lib/personalSpaces/activeCalendarContext';
import { getReceivedCalendarShares, type CalendarShare } from '../../lib/personalSpaces/calendarSharingService';
import { getUserHousehold } from '../../lib/household';

interface CalendarSelectorProps {
  activeContext: ActiveCalendarContext;
  onContextChange: (context: ActiveCalendarContext) => void;
  onRevokedAccess?: () => void;
}

export function CalendarSelector({
  activeContext,
  onContextChange,
  onRevokedAccess,
}: CalendarSelectorProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sharedCalendars, setSharedCalendars] = useState<CalendarShare[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load shared calendars and household
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load shared calendars
        const shares = await getReceivedCalendarShares(user.id);
        const activeShares = shares.filter(s => s.status === 'active');
        setSharedCalendars(activeShares);

        // Load household
        const household = await getUserHousehold();
        if (household) {
          // Get the household ID - it might be in different fields depending on structure
          setHouseholdId(household.id || (household as any).household_id || null);
        }
      } catch (error) {
        console.error('[CalendarSelector] Error loading calendars:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Validate active context separately (only for shared calendars)
  // This runs when the context changes to a shared calendar or when user loads
  useEffect(() => {
    if (!user || activeContext.kind !== 'shared') return;

    const validateContext = async () => {
      try {
        const shares = await getReceivedCalendarShares(user.id);
        const activeShares = shares.filter(s => s.status === 'active');
        const shareExists = activeShares.some(s => s.id === activeContext.shareId);
        
        if (!shareExists) {
          // Share was revoked, fallback to personal
          const personalContext = createPersonalContext(user.id);
          onContextChange(personalContext);
          if (onRevokedAccess) {
            onRevokedAccess();
          }
        }
      } catch (error) {
        console.error('[CalendarSelector] Error validating context:', error);
      }
    };

    // Only validate if context is shared
    validateContext();
    // Validate when shareId changes or when user loads (only for shared contexts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContext.kind === 'shared' ? activeContext.shareId : '', user?.id]);

  const handleSelectContext = (context: ActiveCalendarContext) => {
    // Guard: Ensure context is valid before switching
    if (!user) {
      console.warn('[CalendarSelector] Attempted to select context without user');
      return;
    }

    // Use centralized context key generation for change detection
    const currentKey = getContextKey(activeContext);
    const newKey = getContextKey(context);

    if (currentKey === newKey) {
      // Same context, just close the selector
      setIsOpen(false);
      return;
    }

    onContextChange(context);
    setIsOpen(false);
  };

  const getDisplayLabel = (context: ActiveCalendarContext): string => {
    if (context.kind === 'personal') return 'My Calendar';
    if (context.kind === 'household') return 'Household';
    if (context.kind === 'shared') return context.ownerName;
    return 'Calendar';
  };

  // Use centralized permission label utility
  const getDisplaySubtext = (context: ActiveCalendarContext): string | null => {
    return getPermissionLabel(context);
  };

  const renderOptions = () => {
    if (!user) return null;

    return (
      <div>
        {/* Personal Calendar */}
        <button
          onClick={() => handleSelectContext(createPersonalContext(user.id))}
          className="w-full py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-between group rounded-lg"
        >
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            <div>
              <div className="font-medium text-gray-900">My Calendar</div>
            </div>
          </div>
          {activeContext.kind === 'personal' && (
            <Check className="w-5 h-5 text-blue-600" />
          )}
        </button>

        {/* Household Calendar */}
        {householdId && (
          <button
            onClick={() =>
              handleSelectContext({
                kind: 'household',
                householdId,
                label: 'Household',
                permission: 'write',
              })
            }
            className="w-full py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-between group rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">Household</div>
              </div>
            </div>
            {activeContext.kind === 'household' && activeContext.householdId === householdId && (
              <Check className="w-5 h-5 text-blue-600" />
            )}
          </button>
        )}

        {/* Shared Calendars */}
        {sharedCalendars.length > 0 && (
          <>
            <div className="py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Shared with me
            </div>
            {sharedCalendars.map((share) => (
              <button
                key={share.id}
                onClick={() =>
                  handleSelectContext({
                    kind: 'shared',
                    ownerUserId: share.owner_user_id,
                    ownerName: share.owner_name || share.owner_email || 'Unknown',
                    shareId: share.id,
                    permission: share.permission,
                  })
                }
                className="w-full py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-between group rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Calendar className="w-5 h-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {share.owner_name || share.owner_email || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {share.permission === 'read' ? 'Read-only' : 'Write access'}
                    </div>
                  </div>
                </div>
                {activeContext.kind === 'shared' && activeContext.shareId === share.id && (
                  <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </>
        )}

        {sharedCalendars.length === 0 && !householdId && (
          <div className="py-3 text-sm text-gray-500 text-center">
            No shared calendars available
          </div>
        )}
      </div>
    );
  };

  // Always reflect the current active context (defensive: ensure selector is in sync)
  const displayLabel = getDisplayLabel(activeContext);
  const displaySubtext = getDisplaySubtext(activeContext);
  const isReadOnly = isContextReadOnly(activeContext);
  
  // Guard: Ensure active context is valid
  if (!activeContext || !user) {
    return null;
  }

  // Render header with back button for mobile
  const renderMobileHeader = () => (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setIsOpen(false)}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0 -ml-2"
        aria-label="Back"
      >
        <ArrowLeft size={20} className="text-gray-700" />
      </button>
      <h2 className="text-lg font-semibold text-gray-900">Select Calendar</h2>
    </div>
  );

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 min-h-[44px]"
          disabled={loading}
          aria-label="Select calendar"
        >
          <Calendar className="w-4 h-4" />
          <span className="flex-1 text-left min-w-0 truncate">{displayLabel}</span>
          {displaySubtext && (
            <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
              {displaySubtext}
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        <BottomSheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          header={renderMobileHeader()}
          maxHeight="85vh"
          showCloseButton={false}
          closeOnBackdrop={true}
        >
          {renderOptions()}
        </BottomSheet>
      </>
    );
  }

  // Desktop: Dropdown
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        disabled={loading}
      >
        <Calendar className="w-4 h-4" />
        <span className="flex-1 text-left">{displayLabel}</span>
        {displaySubtext && (
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
            {displaySubtext}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            {renderOptions()}
          </div>
        </>
      )}
    </div>
  );
}
