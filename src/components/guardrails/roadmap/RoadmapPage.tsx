/**
 * RoadmapPage Component
 * 
 * Phase 0 Architectural Lock-In: Main Roadmap Page Container
 * Phase 1: Projection Pipeline Rebuild (Read-Only, Hierarchy-Correct)
 * Phase 2: Roadmap Timeline Views (Daily / Weekly / Monthly) + Interactive Buckets
 * Phase 2 Status: COMPLETE ✅
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Orchestrate roadmap UI components
 * - ✅ Handle navigation and routing
 * - ✅ Manage modals/sheets for creation (delegates to workspaces)
 * - ✅ Coordinate UI state across child components
 * - ✅ Coordinate view mode switching (Week/Month)
 * - ✅ Manage Bottom Sheet state across views
 * 
 * What this component MUST NOT do:
 * - ❌ Mutate domain data directly
 * - ❌ Query Supabase directly
 * - ❌ Implement business logic
 * - ❌ Filter tracks based on item presence
 * - ❌ Own workspace functionality
 * 
 * Phase 2 Integration:
 * - ✅ Week View (Primary experience)
 * - ✅ Month View (Aggregation-first overview)
 * - ⏸️ Daily View (Deferred to Phase 3 - requires workspace awareness, task-level intent, contextual density rules)
 * 
 * Note: Creation handlers delegate to workspace services - the roadmap itself
 * does not own creation logic. This maintains separation of concerns.
 * 
 * ⚠️ CRITICAL VALIDATION (Phase 2):
 * - Roadmap NEVER mutates domain data (read-only projection)
 * - Roadmap NEVER queries Supabase (consumes projection only)
 * - Tracks/subtracks ALWAYS render even when empty
 * - Empty buckets are VALID UI states
 * - Item presence NEVER affects visibility (visibility controlled by visibility_state/includeInRoadmap only)
 * 
 * See: docs/ARCHITECTURE_TRACKS_ROADMAP.md for full architectural documentation.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProjectHeaderTabs } from '../ProjectHeaderTabs';
import { PillActionNav } from '../../shared/PillActionNav';
import { RoadmapSettingsSheet } from './RoadmapSettingsSheet';
import { RoadmapQuickActionsSheet, type RoadmapActionContext } from './RoadmapQuickActionsSheet';
import { RoadmapSearchSheet } from './RoadmapSearchSheet';
import { ProjectSettingsDrawer } from '../settings/ProjectSettingsDrawer';
import { CreateTrackModal } from './CreateTrackModal';
import { CreateRoadmapItemSheet } from './CreateRoadmapItemSheet';
import { RoadmapViewSwitcher } from './RoadmapViewSwitcher';
import { RoadmapWeekView } from './views/RoadmapWeekView';
import { RoadmapMonthView } from './views/RoadmapMonthView';
import { RoadmapDayView } from './views/RoadmapDayView';
import { RoadmapBucketBottomSheet } from './RoadmapBucketBottomSheet';
import { RoadmapEmptyState } from './RoadmapEmptyState';
import { Settings, Zap } from 'lucide-react';
import { updateTrackInstance } from '../../../lib/guardrails/sharedTrackService';
import { createTrack } from '../../../lib/guardrails/trackService';
import { createRoadmapItem, updateRoadmapItem } from '../../../lib/guardrails/roadmapService';
import type { RoadmapItem } from '../../../lib/guardrails/coreTypes';
import { useAuth } from '../../../contexts/AuthContext';
import { useRoadmapProjection, useRoadmapUIState } from '../../../hooks/useRoadmapProjection';
import type { TrackInstanceVisibility } from '../../../lib/guardrails/tracksTypes';
import type { TimeBucket } from '../../../lib/guardrails/roadmapTimeline';
import { startOfWeek } from '../../../lib/guardrails/roadmapTimeline';

interface RoadmapPageProps {
  masterProjectId: string;
  masterProjectName: string;
}

/**
 * RoadmapPage Component
 * 
 * Phase 0 Architectural Lock-In: Main Roadmap Page Container
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this component CAN do:
 * - ✅ Orchestrate roadmap UI components
 * - ✅ Handle navigation and routing
 * - ✅ Manage modals/sheets for creation (delegates to workspaces)
 * - ✅ Coordinate UI state across child components
 * 
 * What this component MUST NOT do:
 * - ❌ Mutate domain data directly
 * - ❌ Implement business logic
 * - ❌ Filter tracks based on item presence
 * - ❌ Own workspace functionality
 * 
 * Note: Creation handlers delegate to workspace services - the roadmap itself
 * does not own creation logic. This maintains separation of concerns.
 * 
 * See: docs/ARCHITECTURE_TRACKS_ROADMAP.md for full architectural documentation.
 */
export function RoadmapPage({ masterProjectId, masterProjectName }: RoadmapPageProps) {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [mobileMenuSide, setMobileMenuSide] = useState<'left' | 'right' | null>(null);
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  
  // Phase 7: Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchScope, setSearchScope] = useState<'roadmap' | 'project'>('roadmap');
  
  // Phase 2: Note: InfiniteRoadmapView refs removed (Phase 2 views handle state internally)
  // Phase 2 views (Week/Month) do not use zoom levels - they use viewMode instead
  
  // Phase 2: Get projection for action context and refresh capability
  const projection = useRoadmapProjection(masterProjectId);
  const { setHighlighted, setTrackCollapsed, uiState, setViewMode, navigateWeekWindow, navigateToDayView, navigateBackToWeekView, setAnchorDate, navigateMonthWindow, navigateToToday } = useRoadmapUIState(masterProjectId);
  
  // Phase 2: Bottom Sheet state (shared across views)
  const [bucketBottomSheet, setBucketBottomSheet] = useState<{
    isOpen: boolean;
    bucket: TimeBucket | null;
  }>({
    isOpen: false,
    bucket: null,
  });
  
  // Phase 5: Creation modal states
  const [createTrackModal, setCreateTrackModal] = useState<{ open: boolean; parentTrackId: string | null }>({
    open: false,
    parentTrackId: null,
  });
  const [createItemModal, setCreateItemModal] = useState<{ open: boolean; trackId?: string; itemType?: 'task' | 'event' | 'milestone' }>({
    open: false,
  });
  
  // Phase 6a: Edit item state
  const [editItem, setEditItem] = useState<RoadmapItem | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase 4.0: Basic keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Close modals and sheets
      if (e.key === 'Escape') {
        // Close bucket bottom sheet
        if (bucketBottomSheet.isOpen) {
          setBucketBottomSheet({ isOpen: false, bucket: null });
          e.preventDefault();
          return;
        }
        // Close settings sheet
        if (settingsOpen) {
          setSettingsOpen(false);
          setMobileMenuSide(null);
          e.preventDefault();
          return;
        }
        // Close quick actions sheet
        if (quickActionsOpen) {
          setQuickActionsOpen(false);
          setMobileMenuSide(null);
          e.preventDefault();
          return;
        }
        // Close search sheet
        if (searchOpen) {
          setSearchOpen(false);
          e.preventDefault();
          return;
        }
        // Close project settings drawer
        if (projectSettingsOpen) {
          setProjectSettingsOpen(false);
          e.preventDefault();
          return;
        }
        // Close create track modal
        if (createTrackModal.open) {
          setCreateTrackModal({ open: false, parentTrackId: null });
          e.preventDefault();
          return;
        }
        // Close create item modal
        if (createItemModal.open) {
          setCreateItemModal({ open: false });
          e.preventDefault();
          return;
        }
        // Close edit item
        if (editItem) {
          setEditItem(null);
          e.preventDefault();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bucketBottomSheet.isOpen, settingsOpen, quickActionsOpen, searchOpen, projectSettingsOpen, createTrackModal.open, createItemModal.open, editItem]);

  const handleSettingsClick = () => {
    // Toggle settings sheet
    if (settingsOpen) {
      setSettingsOpen(false);
      setMobileMenuSide(null);
    } else {
      setSettingsOpen(true);
      setMobileMenuSide('left');
      // Close quick actions sheet if open
      if (quickActionsOpen) {
        setQuickActionsOpen(false);
      }
    }
  };

  // Phase 4a: Quick Actions replaces Share button
  const handleQuickActionsClick = () => {
    // Toggle quick actions sheet
    if (quickActionsOpen) {
      setQuickActionsOpen(false);
      setMobileMenuSide(null);
    } else {
      setQuickActionsOpen(true);
      setMobileMenuSide('right');
      // Close settings sheet if open
      if (settingsOpen) {
        setSettingsOpen(false);
      }
    }
  };

  // Phase 2: Callback to update track instance
  // Note: Phase 2 views use projection.refresh() directly (no refs needed)
  const handleUpdateTrackInstance = useCallback(async (
    trackId: string,
    updates: { includeInRoadmap?: boolean; visibilityState?: TrackInstanceVisibility }
  ): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const result = await updateTrackInstance(trackId, masterProjectId, updates);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update track instance');
    }

    // Refresh projection to reflect changes
    await projection.refresh();
  }, [user?.id, masterProjectId, projection]);

  // Phase 4: Callback to open Project Settings
  const handleOpenProjectSettings = useCallback(() => {
    setProjectSettingsOpen(true);
  }, []);

  // Phase 5: Compute action context from projection
  const actionContext = useMemo<RoadmapActionContext>(() => {
    // Find focused track (if any)
    const focusedTrack = projection.tracks.find(t => t.uiState.focused);
    
    // Aggregate canEdit permission (true if any track is editable)
    const canEdit = projection.tracks.some(t => t.canEdit);
    
    return {
      projectId: masterProjectId,
      defaultTrackId: projection.tracks.length > 0 ? projection.tracks[0].track.id : undefined,
      focusedTrackId: focusedTrack?.track.id,
      canEdit,
    };
  }, [projection, masterProjectId]);

  // Phase 5: Creation handlers
  const handleCreateTrack = useCallback(async (name: string, description?: string, color?: string, parentTrackId?: string | null) => {
    const effectiveParentTrackId = parentTrackId !== undefined ? parentTrackId : createTrackModal.parentTrackId;
    
    const newTrack = await createTrack({
      masterProjectId,
      name,
      description,
      color,
      parentTrackId: effectiveParentTrackId || undefined,
      category: 'main',
      includeInRoadmap: true,
    });
    
    // Phase 5: Expand newly created track by default (via UI state)
    if (newTrack) {
      setTrackCollapsed(newTrack.id, false); // false = expanded
    }
    
    // Refresh projection after creation
    await projection.refresh();
    
    // Close modal after successful creation
    setCreateTrackModal({ open: false, parentTrackId: null });
  }, [masterProjectId, createTrackModal.parentTrackId, setTrackCollapsed, projection]);

  const handleCreateItem = useCallback(async (data: {
    trackId: string;
    subtrackId?: string;
    type: string;
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => {
    if (!data.trackId) {
      throw new Error('Track ID is required to create a roadmap item');
    }
    
    // Phase 5: If subtrackId is provided, use it as the trackId (subtracks are tracks with parentTrackId)
    // Otherwise, use the trackId directly
    const effectiveTrackId = data.subtrackId || data.trackId;
    
    await createRoadmapItem({
      masterProjectId,
      trackId: effectiveTrackId,
      type: data.type as any,
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate || null,
      status: (data.status as any) || 'not_started',
    });
    
    // Refresh projection after creation
    await projection.refresh();
    
    // Close modal after successful creation
    setCreateItemModal({ open: false });
  }, [masterProjectId, projection]);

  // Phase 5: Quick Actions handlers
  const handleAddTrack = useCallback(() => {
    setCreateTrackModal({ open: true, parentTrackId: null });
  }, []);

  const handleAddSubtrack = useCallback((parentTrackId?: string) => {
    setCreateTrackModal({ open: true, parentTrackId: parentTrackId || null });
  }, []);

  const handleAddTask = useCallback((trackId?: string) => {
    setCreateItemModal({ open: true, trackId, itemType: 'task' });
  }, []);

  const handleAddEvent = useCallback((trackId?: string) => {
    setCreateItemModal({ open: true, trackId, itemType: 'event' });
  }, []);

  const handleAddMilestone = useCallback((trackId?: string) => {
    setCreateItemModal({ open: true, trackId, itemType: 'milestone' });
  }, []);

  // Phase 6a: Edit item handlers
  const handleEditItem = useCallback((item: RoadmapItem) => {
    setEditItem(item);
    setCreateItemModal({ open: false }); // Close create modal if open
  }, []);

  const handleUpdateItem = useCallback(async (data: {
    trackId: string;
    subtrackId?: string;
    type: string;
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => {
    if (!editItem) {
      throw new Error('No item selected for editing');
    }

    // Phase 6a: Determine effective trackId (use subtrackId if provided, otherwise trackId)
    const effectiveTrackId = data.subtrackId || data.trackId;
    
    // Build update input (only include fields that are provided)
    const updateInput: any = {
      title: data.title,
      description: data.description,
      status: data.status,
    };

    // Add dates based on item type
    if (editItem.type === 'task') {
      // Tasks use endDate as due date
      if (data.endDate !== undefined) {
        updateInput.endDate = data.endDate || null;
      }
    } else if (editItem.type === 'event' || editItem.type === 'milestone') {
      // Events and milestones use startDate and endDate
      if (data.startDate !== undefined) {
        updateInput.startDate = data.startDate || null;
      }
      if (data.endDate !== undefined) {
        updateInput.endDate = data.endDate || null;
      }
    }

    // Track/subtrack changes
    if (effectiveTrackId !== editItem.trackId) {
      updateInput.trackId = effectiveTrackId;
    }
    if (data.subtrackId !== editItem.subtrackId) {
      // Note: UpdateRoadmapItemInput doesn't have subtrackId in type, but the function handles it
      (updateInput as any).subtrackId = data.subtrackId || null;
    }

    await updateRoadmapItem(editItem.id, updateInput);

    // Refresh projection after update
    await projection.refresh();

    // Close edit modal
    setEditItem(null);
  }, [editItem, projection]);

  const handleCloseEditItem = useCallback(() => {
    setEditItem(null);
  }, []);

  // Phase 7: Search handlers
  const handleSearchClick = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const handleSelectTrack = useCallback((trackId: string) => {
    // Phase 7: For now, just highlight the track (UI-only)
    // Future: Could implement track filtering or focusing
    console.log('[RoadmapPage] Track selected:', trackId);
  }, []);

  const handleSelectSubtrack = useCallback((subtrackId: string, parentTrackId: string) => {
    // Phase 7: For now, just highlight the subtrack (UI-only)
    console.log('[RoadmapPage] Subtrack selected:', subtrackId, 'parent:', parentTrackId);
  }, []);

  const handleSelectItem = useCallback((itemId: string, trackId: string, subtrackId?: string) => {
    // Phase 7: For now, just highlight the item (UI-only)
    // Future: Could open item detail drawer or scroll to item
    console.log('[RoadmapPage] Item selected:', itemId, 'track:', trackId, 'subtrack:', subtrackId);
  }, []);

  const handleSetHighlight = useCallback((id: string) => {
    // Phase 7: Use UI state to highlight entity (UI-only, no persistence)
    // Highlight the track/subtrack/item using UI state
    setHighlighted(id, true);
    
    // Auto-clear highlight after 3 seconds
    setTimeout(() => {
      setHighlighted(id, false);
    }, 3000);
  }, [setHighlighted]);

  // Phase 2: Handle bucket click (opens Bottom Sheet)
  const handleBucketClick = useCallback((bucket: TimeBucket, _scope: { type: 'track' | 'subtrack'; id: string; name: string }) => {
    setBucketBottomSheet({
      isOpen: true,
      bucket,
    });
  }, []);

  // Phase 2: Handle Bottom Sheet close
  const handleBucketBottomSheetClose = useCallback(() => {
    setBucketBottomSheet({
      isOpen: false,
      bucket: null,
    });
  }, []);

  // Phase 3.9: Get anchor date from UI state (defaults to today if not set)
  const anchorDate = useMemo(() => {
    return uiState.anchorDate ? new Date(uiState.anchorDate) : new Date();
  }, [uiState.anchorDate]);

  // Phase 3.9: Handle week header click (switch to Day view)
  const handleWeekHeaderClick = useCallback((weekStartDate: string) => {
    navigateToDayView(weekStartDate);
  }, [navigateToDayView]);

  // Phase 3.9: Handle month click (switch to Week view with month anchor)
  const handleMonthClick = useCallback((monthStartDate: string) => {
    // Set anchor to first day of month and switch to week view
    const monthDate = new Date(monthStartDate);
    const weekStart = startOfWeek(monthDate);
    setAnchorDate(weekStart.toISOString().split('T')[0]);
    setViewMode('week');
  }, [setAnchorDate, setViewMode]);

  // Phase 3.9: Handle back from Day view
  const handleBackFromDayView = useCallback(() => {
    navigateBackToWeekView();
  }, [navigateBackToWeekView]);

  // Phase 2: Render view based on viewMode
  // ⚠️ CRITICAL VALIDATION (Phase 2):
  // - Roadmap NEVER mutates domain data (read-only projection)
  // - Roadmap NEVER queries Supabase (consumes projection only)
  // - Tracks/subtracks ALWAYS render even when empty
  // - Empty buckets are VALID UI states
  // - Item presence NEVER affects visibility (visibility controlled by visibility_state/includeInRoadmap only)
  const renderRoadmapView = () => {
    // Track-First Rendering: Use WeekView for all devices (mobile-first)
    // Mobile devices will use horizontal scrolling for the timeline
    // On desktop, use Phase 2 views based on viewMode
    // Daily View deferred to Phase 3 (requires workspace awareness, task-level intent, contextual density rules)
    switch (uiState.viewMode) {
      case 'week':
        return (
          <RoadmapWeekView
            projection={projection}
            anchorDate={anchorDate}
            masterProjectId={masterProjectId}
            onBucketClick={handleBucketClick}
            onWeekHeaderClick={handleWeekHeaderClick}
            onNavigateWeek={navigateWeekWindow}
            onNavigateToToday={navigateToToday}
          />
        );
      case 'month':
        return (
          <RoadmapMonthView
            projection={projection}
            anchorDate={anchorDate}
            masterProjectId={masterProjectId}
            onBucketClick={handleBucketClick}
            onMonthClick={handleMonthClick}
            onNavigateMonth={navigateMonthWindow}
            onNavigateToToday={navigateToToday}
          />
        );
      case 'day':
        // Phase 3.9: Day View implementation
        return (
          <RoadmapDayView
            projection={projection}
            anchorDate={anchorDate}
            masterProjectId={masterProjectId}
            onBucketClick={handleBucketClick}
            onBack={handleBackFromDayView}
          />
        );
      default:
        // Default to Week View
        return (
          <RoadmapWeekView
            projection={projection}
            anchorDate={anchorDate}
            masterProjectId={masterProjectId}
            onBucketClick={handleBucketClick}
            onWeekHeaderClick={handleWeekHeaderClick}
            onNavigateWeek={navigateWeekWindow}
            onNavigateToToday={navigateToToday}
          />
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ProjectHeaderTabs
        masterProjectId={masterProjectId}
        projectName={masterProjectName}
        onSearchClick={handleSearchClick}
      />
      
      {/* Phase 2: View Switcher (desktop only) */}
      {!isMobile && (
        <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
          <RoadmapViewSwitcher
            viewMode={uiState.viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      )}

      {/* Phase 2: Render view based on viewMode (or mobile timeline) */}
      {/* Track-First Rendering: Only show global empty state when zero tracks exist */}
      {!projection.loading && projection.tracks.length === 0 ? (
        <RoadmapEmptyState
          masterProjectId={masterProjectId}
        />
      ) : (
        renderRoadmapView()
      )}

      {/* Mobile Bottom Navigation - Pill-style action nav */}
      <PillActionNav
        leftAction={{
          label: 'Settings',
          icon: <Settings size={20} />,
          onPress: handleSettingsClick,
        }}
        rightAction={{
          label: 'Actions',
          icon: <Zap size={20} />,
          onPress: handleQuickActionsClick,
        }}
        visible={isMobile}
        leftActive={mobileMenuSide === 'left'}
        rightActive={mobileMenuSide === 'right'}
      />

                  {/* Phase 4: Settings Sheet with functional controls */}
                  {/* Phase 2: Note: currentZoomLevel removed (Phase 2 views use viewMode instead) */}
                  <RoadmapSettingsSheet
                    isOpen={settingsOpen}
                    onClose={() => {
                      setSettingsOpen(false);
                      setMobileMenuSide(null);
                    }}
                    masterProjectId={masterProjectId}
                    currentZoomLevel="week"
                    onZoomLevelChange={() => {}}
                    onUpdateTrackInstance={handleUpdateTrackInstance}
                    onOpenProjectSettings={handleOpenProjectSettings}
                  />

      {/* Phase 4: Project Settings Drawer */}
      <ProjectSettingsDrawer
        isOpen={projectSettingsOpen}
        onClose={() => setProjectSettingsOpen(false)}
        projectId={masterProjectId}
        projectName={masterProjectName}
      />

      {/* Phase 5: Quick Actions Sheet with wired creation flows */}
      <RoadmapQuickActionsSheet
        isOpen={quickActionsOpen}
        onClose={() => {
          setQuickActionsOpen(false);
          setMobileMenuSide(null);
        }}
        actionContext={actionContext}
        onAddTrack={handleAddTrack}
        onAddSubtrack={handleAddSubtrack}
        onAddTask={handleAddTask}
        onAddEvent={handleAddEvent}
        onAddMilestone={handleAddMilestone}
      />

      {/* Phase 5: Create Track Modal (handles both tracks and subtracks) */}
      {createTrackModal.open && (
        <CreateTrackModal
          onClose={() => setCreateTrackModal({ open: false, parentTrackId: null })}
          onCreate={handleCreateTrack}
          parentTrackId={createTrackModal.parentTrackId}
        />
      )}

      {/* Phase 5: Create Roadmap Item Sheet (Task/Event/Milestone) */}
      {createItemModal.open && createItemModal.itemType && (
        <CreateRoadmapItemSheet
          isOpen={true}
          onClose={() => setCreateItemModal({ open: false })}
          projection={projection}
          preselectTrackId={createItemModal.trackId}
          preselectType={createItemModal.itemType}
          canEdit={actionContext.canEdit}
          mode="create"
          onSubmit={handleCreateItem}
        />
      )}

      {/* Phase 6a: Edit Roadmap Item Sheet */}
      {editItem && (
        <CreateRoadmapItemSheet
          isOpen={true}
          onClose={handleCloseEditItem}
          projection={projection}
          canEdit={actionContext.canEdit}
          mode="edit"
          initialValues={editItem}
          onSubmit={handleUpdateItem}
        />
      )}

      {/* Phase 7: Search Sheet */}
      <RoadmapSearchSheet
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        projection={projection}
        searchScope={searchScope}
        onSearchScopeChange={setSearchScope}
        onSelectTrack={handleSelectTrack}
        onSelectSubtrack={handleSelectSubtrack}
        onSelectItem={handleSelectItem}
        onSetHighlight={handleSetHighlight}
      />

      {/* Phase 2: Bucket Bottom Sheet (shared across views) */}
      <RoadmapBucketBottomSheet
        isOpen={bucketBottomSheet.isOpen}
        onClose={handleBucketBottomSheetClose}
        bucket={bucketBottomSheet.bucket}
        projection={projection}
      />
    </div>
  );
}
