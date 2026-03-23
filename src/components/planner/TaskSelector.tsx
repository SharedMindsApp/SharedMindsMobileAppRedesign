/**
 * Task Selector Component
 * 
 * Allows users to switch between:
 * - My Tasks (personal)
 * - Household Tasks (if available)
 * - Shared Task Lists (task lists shared with me)
 */

import { useState, useEffect, useRef } from 'react';
import { CheckSquare, ChevronDown, Check, Users, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BottomSheet } from '../shared/BottomSheet';
import {
  type ActiveTaskContext,
  createPersonalTaskContext,
  isTaskContextReadOnly,
  getTaskContextKey,
  getTaskPermissionLabel,
} from '../../lib/personalSpaces/activeTaskContext';
import { getReceivedTaskShares, type TaskShare } from '../../lib/personalSpaces/taskSharingService';
import { getUserHousehold } from '../../lib/household';

interface TaskSelectorProps {
  activeContext: ActiveTaskContext;
  onContextChange: (context: ActiveTaskContext) => void;
  onRevokedAccess?: () => void;
}

export function TaskSelector({
  activeContext,
  onContextChange,
  onRevokedAccess,
}: TaskSelectorProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sharedTaskLists, setSharedTaskLists] = useState<TaskShare[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load shared task lists and household
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load shared task lists
        const shares = await getReceivedTaskShares(user.id);
        const activeShares = shares.filter(s => s.status === 'active');
        setSharedTaskLists(activeShares);

        // Load household
        const household = await getUserHousehold();
        if (household) {
          // Get the household ID - it might be in different fields depending on structure
          setHouseholdId(household.id || (household as any).household_id || null);
        }
      } catch (error) {
        console.error('[TaskSelector] Error loading task lists:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Validate active context separately (only for shared task lists)
  // This runs when the context changes to a shared task list or when user loads
  useEffect(() => {
    if (!user || activeContext.kind !== 'shared') return;

    const validateContext = async () => {
      try {
        const shares = await getReceivedTaskShares(user.id);
        const activeShares = shares.filter(s => s.status === 'active');
        const shareExists = activeShares.some(s => s.id === activeContext.shareId);
        
        if (!shareExists) {
          // Share was revoked, fallback to personal
          const personalContext = createPersonalTaskContext(user.id);
          onContextChange(personalContext);
          if (onRevokedAccess) {
            onRevokedAccess();
          }
        }
      } catch (error) {
        console.error('[TaskSelector] Error validating context:', error);
      }
    };

    // Only validate if context is shared
    validateContext();
    // Validate when shareId changes or when user loads (only for shared contexts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContext.kind === 'shared' ? activeContext.shareId : '', user?.id]);

  const handleSelectContext = (context: ActiveTaskContext) => {
    // Guard: Ensure context is valid before switching
    if (!user) {
      console.warn('[TaskSelector] Attempted to select context without user');
      return;
    }

    // Use centralized context key generation for change detection
    const currentKey = getTaskContextKey(activeContext);
    const newKey = getTaskContextKey(context);

    if (currentKey === newKey) {
      // Same context, just close the selector
      setIsOpen(false);
      return;
    }

    onContextChange(context);
    setIsOpen(false);
  };

  const getDisplayLabel = (context: ActiveTaskContext): string => {
    if (context.kind === 'personal') return 'My Tasks';
    if (context.kind === 'household') return 'Household';
    if (context.kind === 'shared') return context.ownerName;
    return 'Tasks';
  };

  // Use centralized permission label utility
  const getDisplaySubtext = (context: ActiveTaskContext): string | null => {
    return getTaskPermissionLabel(context);
  };

  const renderOptions = () => {
    if (!user) return null;

    return (
      <div>
        {/* Personal Tasks */}
        <button
          onClick={() => handleSelectContext(createPersonalTaskContext(user.id))}
          className="w-full py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-between group rounded-lg"
        >
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            <div>
              <div className="font-medium text-gray-900">My Tasks</div>
            </div>
          </div>
          {activeContext.kind === 'personal' && (
            <Check className="w-5 h-5 text-blue-600" />
          )}
        </button>

        {/* Household Tasks */}
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

        {/* Shared Task Lists */}
        {sharedTaskLists.length > 0 && (
          <>
            <div className="py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Shared with me
            </div>
            {sharedTaskLists.map((share) => (
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
                  <CheckSquare className="w-5 h-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
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

        {sharedTaskLists.length === 0 && !householdId && (
          <div className="py-3 text-sm text-gray-500 text-center">
            No shared task lists available
          </div>
        )}
      </div>
    );
  };

  // Always reflect the current active context (defensive: ensure selector is in sync)
  const displayLabel = getDisplayLabel(activeContext);
  const displaySubtext = getDisplaySubtext(activeContext);
  const isReadOnly = isTaskContextReadOnly(activeContext);
  
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
      <h2 className="text-lg font-semibold text-gray-900">Select Task List</h2>
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
          aria-label="Select task list"
        >
          <CheckSquare className="w-4 h-4" />
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
          maxHeight="95vh"
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
        <CheckSquare className="w-4 h-4" />
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
