/**
 * Workspace Widget
 * 
 * A structured thinking and reference surface within Spaces. Enables users to
 * organize ideas, information, plans, and context using modular, collapsible
 * content units.
 * 
 * Phase 5 Features:
 * - Debounced auto-save
 * - Optimistic updates
 * - Keyboard shortcuts
 * - Enhanced drag feedback
 * - Smooth animations
 * - Improved loading/error states
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDebounce } from '../../../hooks/useDebounce';
import { FileText, Plus, Loader2, GripVertical, ChevronDown, ChevronRight, MoreVertical, Layers, X, List, Type, CheckSquare, AlertCircle, Code, Minus, Info, AlertTriangle, CheckCircle2, XCircle, Link as LinkIcon, Edit2, Trash2, Eye, Maximize2, ListChecks, ArrowLeft } from 'lucide-react';
import type { Page, WorkspaceUnit, WorkspaceUnitType, WorkspaceReferenceType } from '../../../lib/workspace/types';
import {
  getWorkspaceUnits,
  createWorkspaceUnit,
  updateWorkspaceUnit,
  deleteWorkspaceUnit,
  reorderWorkspaceUnits,
  buildWorkspaceUnitTree,
} from '../../../lib/workspace/workspaceService';
import { getPage, getRootPages, createPage, updatePage, archivePage, reorderPages } from '../../../lib/workspace/pageService';
import { showToast } from '../../Toast';
import type { WorkspaceContent } from '../../../lib/fridgeCanvasTypes';
import { isTextUnit, isBulletUnit, isGroupUnit, isChecklistUnit, isCalloutUnit, isCodeUnit, isDividerUnit, isReferenceUnit } from '../../../lib/workspace/types';
import { renderMarkdown } from '../../../lib/workspace/markdownRenderer';
import { WorkspaceReferencePicker } from './WorkspaceReferencePicker';
import { WorkspaceReferencePreview } from './WorkspaceReferencePreview';
import { FormattingToolbar } from './FormattingToolbar';
import { ContextualHints, analyzeContentForHints } from './ContextualHints';
import type { ContextualHint } from './ContextualHints';
import { PasteModeSelector, getPreferredPasteMode, savePreferredPasteMode, type PasteMode } from './PasteModeSelector';
import { parsePastedText, convertBlocksToWorkspaceUnits } from '../../../lib/workspace/pasteParser';
import { saveDraft, getDrafts, clearDraft, clearDrafts, hasUnsavedDrafts, restoreDrafts } from '../../../lib/workspace/draftStorage';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Page Item Component
interface SortablePageItemProps {
  page: Page;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (title: string) => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  showMenu: boolean;
  onMenuToggle: () => void;
  onDelete: () => void;
  onSelect: () => void;
  isDeleting: boolean;
}

function SortablePageItem({
  page,
  isEditing,
  editTitle,
  onEditTitleChange,
  onEditStart,
  onEditCancel,
  onEditSave,
  showMenu,
  onMenuToggle,
  onDelete,
  onSelect,
  isDeleting,
}: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg transition-all cursor-pointer ${
        isDragging ? 'shadow-lg z-50' : 'hover:bg-gray-50 hover:border-gray-300'
      }`}
      onClick={!isEditing ? onSelect : undefined}
    >
      <div className="flex items-center gap-2 p-3 sm:p-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-manipulation flex-shrink-0"
          title="Drag to reorder"
        >
          <GripVertical size={18} />
        </button>

        {/* Page Icon */}
        <FileText size={20} className="text-slate-600 flex-shrink-0" />

        {/* Page Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Auto-save will handle saving, just exit edit mode
                  onEditSave();
                } else if (e.key === 'Escape') {
                  onEditCancel();
                }
              }}
              onBlur={() => {
                // Auto-save will handle saving, just exit edit mode if title is valid
                if (editTitle.trim()) {
                  onEditSave();
                } else {
                  onEditCancel();
                }
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm font-medium"
              autoFocus
            />
          ) : (
            <>
              <p className="font-medium text-gray-900 truncate">{page.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(page.updated_at).toLocaleDateString()}
              </p>
            </>
          )}
        </div>

        {/* Menu Button */}
        {!isEditing && (
          <div className="relative flex-shrink-0" data-page-menu>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle();
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
              title="Page options"
            >
              <MoreVertical size={18} />
            </button>

            {/* Context Menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuToggle();
                  }}
                />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[160px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditStart();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Edit2 size={16} />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      onMenuToggle();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Select Arrow */}
        {!isEditing && !showMenu && (
          <div className="p-1 text-gray-400 flex-shrink-0">
            <ChevronRight size={18} />
          </div>
        )}

        {/* Deleting Indicator */}
        {isDeleting && (
          <div className="flex-shrink-0">
            <Loader2 size={18} className="animate-spin text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}

interface WorkspaceWidgetProps {
  content?: WorkspaceContent; // Optional for backward compatibility
  householdId?: string; // Optional for backward compatibility
  pageId?: string; // New: page ID for page-centric model
  viewMode?: 'icon' | 'mini' | 'large' | 'xlarge';
  onContentChange?: (content: WorkspaceContent) => void;
}

export function WorkspaceWidget({ content, householdId, pageId, viewMode = 'large', onContentChange }: WorkspaceWidgetProps) {
  // Extract pageId from content if not provided directly
  // Use useMemo to recalculate when content changes
  const effectivePageId = useMemo(() => pageId || content?.page_id, [pageId, content?.page_id]);
  
  const [page, setPage] = useState<Page | null>(null);
  const [flatUnits, setFlatUnits] = useState<WorkspaceUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set());
  const [showUnitMenu, setShowUnitMenu] = useState<string | null>(null);
  
  // Layer behavior: Track z-index for items (last interacted moves to top)
  const [itemZIndices, setItemZIndices] = useState<Map<string, number>>(new Map());
  const zIndexCounterRef = useRef(1);
  const [showReferencePicker, setShowReferencePicker] = useState<{ unitId?: string; type: WorkspaceReferenceType } | null>(null);
  const [showMobileAddMenu, setShowMobileAddMenu] = useState(false);
  const [savingUnits, setSavingUnits] = useState<Set<string>>(new Set());
  const [errorUnits, setErrorUnits] = useState<Set<string>>(new Set());
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline' | 'error'>('saved');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const pendingUpdatesRef = useRef<Map<string, Partial<WorkspaceUnit>>>(new Map());
  const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Track the currently focused/active block for cursor-position insertion
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const activeBlockIdRef = useRef<string | null>(null);
  
  // Sync ref with state
  useEffect(() => {
    activeBlockIdRef.current = activeBlockId;
  }, [activeBlockId]);
  
  // Handler to set active block (called from unit items on focus)
  const handleSetActiveBlock = useCallback((unitId: string | null) => {
    setActiveBlockId(unitId);
    activeBlockIdRef.current = unitId;
  }, []);
  
  // Removed: Free-writing mode state (no longer needed - everything is a block)
  
  // Contextual hints state
  const [contextualHints, setContextualHints] = useState<ContextualHint[]>([]);
  
  // Writing mode state
  const [writingMode, setWritingMode] = useState<'default' | 'focus' | 'outline' | 'reading'>('default');

  // Removed: handleCreateFirstUnit - no longer needed with unified block model

  // Create a new unit after the specified unit
  const handleCreateUnitAfter = async (afterUnitId: string, type: WorkspaceUnitType, content: any) => {
    const targetId = effectivePageId || page?.id;
    if (!targetId) return;

    try {
      const afterUnit = flatUnits.find(u => u.id === afterUnitId);
      if (!afterUnit) return;

      // Find next unit to calculate order_index
      const afterIndex = flatUnits.findIndex(u => u.id === afterUnitId);
      const nextUnit = afterIndex >= 0 && afterIndex < flatUnits.length - 1 
        ? flatUnits[afterIndex + 1] 
        : null;

      await createWorkspaceUnit({
        page_id: targetId,
        parent_id: afterUnit.parent_id,
        type,
        content,
        order_index: nextUnit ? (nextUnit.order_index + afterUnit.order_index) / 2 : afterUnit.order_index + 1,
      });

      await loadPage();
    } catch (error) {
      console.error('Failed to create unit after:', error);
      showToast('error', 'Failed to create content');
    }
  };

  // Handle structured paste - creates multiple units from parsed blocks
  const handleStructuredPaste = async (
    parsed: { blocks: any[]; originalText: string },
    afterUnitId: string,
    pasteStart: number,
    pasteEnd: number
  ) => {
    const targetId = effectivePageId || page?.id;
    if (!targetId) return;

    try {
      const afterUnit = flatUnits.find(u => u.id === afterUnitId);
      if (!afterUnit) return;

      // If pasting into a text unit, we may need to split it
      // For now, we'll create units after the current unit
      // The text before/after the paste position will remain in the original unit
      // TODO: Consider splitting the unit if paste is in the middle
      
      const afterIndex = flatUnits.findIndex(u => u.id === afterUnitId);
      const nextUnit = afterIndex >= 0 && afterIndex < flatUnits.length - 1 
        ? flatUnits[afterIndex + 1] 
        : null;
      
      let baseOrderIndex = afterUnit.order_index;
      const orderIncrement = nextUnit 
        ? (nextUnit.order_index - afterUnit.order_index) / (parsed.blocks.length + 1)
        : 1;

      // Track created units for parent relationships
      const createdUnitIds: string[] = [];
      const headingUnitMap = new Map<number, string>(); // level -> unitId

      for (let i = 0; i < parsed.blocks.length; i++) {
        const block = parsed.blocks[i];
        const orderIndex = baseOrderIndex + (i + 1) * orderIncrement;

        let unitType: WorkspaceUnitType;
        let unitContent: any;
        let parentId: string | undefined;

        switch (block.type) {
          case 'heading':
            unitType = 'group';
            unitContent = {
              title: block.content,
              summary: '',
            };
            // Set parent based on heading level
            if (block.level) {
              // Find parent heading at lower level
              for (let level = (block.level || 1) - 1; level >= 1; level--) {
                const parentUnitId = headingUnitMap.get(level);
                if (parentUnitId) {
                  parentId = parentUnitId;
                  break;
                }
              }
            }
            headingUnitMap.set(block.level || 1, `temp-${i}`);
            break;

          case 'list':
            unitType = 'bullet';
            unitContent = {
              items: block.items || [],
              ordered: false,
            };
            // Nest under most recent heading
            if (headingUnitMap.size > 0) {
              const lastLevel = Math.max(...Array.from(headingUnitMap.keys()));
              parentId = headingUnitMap.get(lastLevel);
            }
            break;

          case 'callout':
            unitType = 'callout';
            unitContent = {
              text: block.content,
              type: block.calloutType || 'info',
            };
            if (headingUnitMap.size > 0) {
              const lastLevel = Math.max(...Array.from(headingUnitMap.keys()));
              parentId = headingUnitMap.get(lastLevel);
            }
            break;

          case 'code':
            unitType = 'code';
            unitContent = {
              code: block.content,
              language: block.language || '',
            };
            if (headingUnitMap.size > 0) {
              const lastLevel = Math.max(...Array.from(headingUnitMap.keys()));
              parentId = headingUnitMap.get(lastLevel);
            }
            break;

          case 'quote':
            // Convert quotes to callouts
            unitType = 'callout';
            unitContent = {
              text: block.content,
              type: 'info' as const,
            };
            if (headingUnitMap.size > 0) {
              const lastLevel = Math.max(...Array.from(headingUnitMap.keys()));
              parentId = headingUnitMap.get(lastLevel);
            }
            break;

          case 'divider':
            unitType = 'divider';
            unitContent = {
              style: 'solid' as const,
            };
            break;

          case 'paragraph':
          default:
            unitType = 'text';
            // Use markdown formatting if inline formatting detected OR if content contains any markdown
            const hasAnyMarkdown = block.hasInlineFormatting || 
              /(\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*\n]+\*(?!\*)|(?<!_)_[^_\n]+_(?!_)|`[^`]+`|~~[^~]+~~|^#{1,6}\s+|```|^>\s+|^[-*]{3,}$|\[.*\]\(.*\))/m.test(block.content);
            const formatting = hasAnyMarkdown ? 'markdown' : 'plain';
            unitContent = {
              text: block.content,
              formatting: formatting as 'markdown' | 'plain',
            };
            if (headingUnitMap.size > 0) {
              const lastLevel = Math.max(...Array.from(headingUnitMap.keys()));
              parentId = headingUnitMap.get(lastLevel);
            }
            break;
        }

        // Resolve parent ID from temp IDs or actual IDs
        let resolvedParentId: string | undefined;
        if (parentId && parentId.startsWith('temp-')) {
          // Temp ID - find the corresponding created unit
          const tempIndex = parseInt(parentId.replace('temp-', ''));
          if (tempIndex >= 0 && tempIndex < createdUnitIds.length) {
            resolvedParentId = createdUnitIds[tempIndex];
          }
        } else if (parentId && !parentId.startsWith('temp-')) {
          // Already an actual ID (from headingUnitMap after update)
          resolvedParentId = parentId;
        } else {
          // No parent specified - use the afterUnit's parent
          resolvedParentId = afterUnit.parent_id;
        }

        const newUnit = await createWorkspaceUnit({
          page_id: targetId,
          parent_id: resolvedParentId,
          type: unitType,
          content: unitContent,
          order_index: orderIndex,
        });

        createdUnitIds.push(newUnit.id);
        
        // Update heading map with actual IDs
        if (block.type === 'heading' && block.level) {
          headingUnitMap.set(block.level, newUnit.id);
        }
      }

      await loadPage();
      // Silent success for automatic markdown conversion (expected behavior)
      // Toast only shown for explicit user actions via paste mode selector
    } catch (error) {
      console.error('Failed to create structured paste:', error);
      showToast('error', 'Failed to structure paste');
    }
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!showMobileAddMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-mobile-menu]')) {
        setShowMobileAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileAddMenu]);

  // Drag and drop sensors - configured to NOT interfere with text selection
  // Only activate drag when starting from drag handle, not from text content
  // The activationConstraint ensures drag only starts after moving 10px, allowing text selection to work
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { 
        distance: 10, // Must move 10px before drag activates - allows text selection to work
        // This prevents accidental drags when user is trying to select text
      } 
    }),
    useSensor(TouchSensor, { 
      activationConstraint: { 
        distance: 10, // Must move 10px before drag activates
        delay: 250, // 250ms delay to allow native long-press text selection on mobile
        // This ensures native OS selection handles appear before drag activates
      } 
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (effectivePageId) {
      loadPage();
    } else {
      // No pageId - this is the pages list view
      setPage(null);
      setFlatUnits([]);
      setCollapsedUnits(new Set());
      setLoading(false);
    }
  }, [effectivePageId]);

  // Online/offline status tracking
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSaveStatus('saving');
      // Try to sync pending updates when coming back online
      if (effectivePageId && pendingUpdatesRef.current.size > 0) {
        const syncPromises = Array.from(pendingUpdatesRef.current.entries()).map(
          async ([unitId, updates]) => {
            try {
              await updateWorkspaceUnit(unitId, updates);
              clearDraft(effectivePageId, unitId);
              pendingUpdatesRef.current.delete(unitId);
            } catch (error) {
              console.error('Failed to sync unit:', error);
            }
          }
        );
        Promise.all(syncPromises).then(() => {
          if (pendingUpdatesRef.current.size === 0) {
            setSaveStatus('saved');
          }
        });
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus('offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [effectivePageId]);

  // Save on navigation/blur
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (effectivePageId && (pendingUpdatesRef.current.size > 0 || hasUnsavedDrafts(effectivePageId))) {
        // Force save all pending updates
        const syncPromises = Array.from(pendingUpdatesRef.current.entries()).map(
          async ([unitId, updates]) => {
            try {
              if (isOnline) {
                await updateWorkspaceUnit(unitId, updates);
                clearDraft(effectivePageId, unitId);
              }
            } catch (error) {
              console.error('Failed to save on unload:', error);
            }
          }
        );
        // Use sendBeacon for critical saves if available
        Promise.all(syncPromises).catch(() => {
          // Drafts are already saved, so data is safe
        });
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden && effectivePageId && pendingUpdatesRef.current.size > 0) {
        // Save immediately when tab is hidden
        const syncPromises = Array.from(pendingUpdatesRef.current.entries()).map(
          async ([unitId, updates]) => {
            try {
              if (isOnline) {
                await updateWorkspaceUnit(unitId, updates);
                clearDraft(effectivePageId, unitId);
                pendingUpdatesRef.current.delete(unitId);
              }
            } catch (error) {
              console.error('Failed to save on visibility change:', error);
            }
          }
        );
        Promise.all(syncPromises).then(() => {
          if (pendingUpdatesRef.current.size === 0) {
            setSaveStatus('saved');
          }
        });
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [effectivePageId, isOnline]);

  const loadPage = async () => {
    if (!effectivePageId) return;
    
    try {
      setLoading(true);
      const p = await getPage(effectivePageId);
      
      if (p) {
        setPage(p);
        let workspaceUnits = await getWorkspaceUnits(p.id);
        
        // Restore drafts if any exist
        workspaceUnits = await restoreDrafts(p.id, workspaceUnits);
        
        // UNIFIED BLOCK MODEL: Ensure there's always at least one empty paragraph block
        // This eliminates the need for a separate empty state textarea
        if (workspaceUnits.length === 0) {
          try {
            const firstBlock = await createWorkspaceUnit({
              page_id: p.id,
              type: 'text',
              content: { text: '', formatting: 'plain' },
            });
            workspaceUnits = [firstBlock];
          } catch (error) {
            console.error('Failed to create initial block:', error);
            // Continue with empty array if creation fails
          }
        }
        
        setFlatUnits(workspaceUnits);
        
        // Load collapse state from database
        const collapsed = new Set<string>();
        workspaceUnits.forEach(unit => {
          if (unit.is_collapsed) {
            collapsed.add(unit.id);
          }
        });
        setCollapsedUnits(collapsed);
        
        // Clear drafts after successful load
        clearDrafts(p.id);
        setSaveStatus('saved');
      } else {
        setPage(null);
        setFlatUnits([]);
        setCollapsedUnits(new Set());
      }
    } catch (error) {
      console.error('Failed to load page:', error);
      // If offline, try to load from drafts
      if (!isOnline && effectivePageId) {
        const drafts = getDrafts(effectivePageId);
        if (drafts.length > 0) {
          setFlatUnits(drafts as any);
          setSaveStatus('offline');
        } else {
          showToast('error', 'Failed to load page');
        }
      } else {
        showToast('error', 'Failed to load page');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pages list view state (when no pageId is provided)
  const [pages, setPages] = useState<Page[]>([]);
  const [showCreatePageModal, setShowCreatePageModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [creatingPage, setCreatingPage] = useState(false);
  const [showPageMenu, setShowPageMenu] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editPageTitle, setEditPageTitle] = useState('');
  const debouncedPageTitle = useDebounce(editPageTitle, 500);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);

  // Load pages list when no pageId is provided
  useEffect(() => {
    if (!effectivePageId && householdId) {
      loadPages();
    }
  }, [effectivePageId, householdId]);

  // Close page menu when clicking outside
  useEffect(() => {
    if (!showPageMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-page-menu]')) {
        setShowPageMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPageMenu]);

  const loadPages = async () => {
    if (!householdId) return;
    
    try {
      setLoading(true);
      // For now, only show root pages (top-level pages with no parent)
      const rootPages = await getRootPages(householdId);
      setPages(rootPages);
    } catch (error) {
      console.error('Failed to load pages:', error);
      showToast('error', 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    if (!householdId || !newPageTitle.trim()) return;
    
    try {
      setCreatingPage(true);
      const newPage = await createPage({
        space_id: householdId,
        title: newPageTitle.trim(),
      });
      
      if (newPage) {
        setNewPageTitle('');
        setShowCreatePageModal(false);
        await loadPages();
        showToast('success', 'Page created');
        
        // If onContentChange is provided, update the widget content with the new page
        if (onContentChange) {
          onContentChange({ page_id: newPage.id });
        }
      }
    } catch (error) {
      console.error('Failed to create page:', error);
      showToast('error', 'Failed to create page');
    } finally {
      setCreatingPage(false);
    }
  };

  const handleRenamePage = async (pageId: string, newTitle: string, autoSave: boolean = false) => {
    if (!newTitle.trim()) return;
    
    try {
      console.log('Saving page title to Supabase:', pageId, newTitle);
      const updated = await updatePage(pageId, { title: newTitle.trim() });
      if (updated) {
        console.log('Successfully saved page title to Supabase:', pageId);
        if (pageId === effectivePageId) {
          setPage(updated);
        }
        if (!autoSave) {
          // Only clear editing state on manual save
          setEditingPageId(null);
          setEditPageTitle('');
        }
        await loadPages();
        if (!autoSave) {
          showToast('success', 'Page renamed');
        }
      }
    } catch (error) {
      console.error('Failed to rename page in Supabase:', error);
      if (!autoSave) {
        showToast('error', 'Failed to rename page');
      }
    }
  };

  // Auto-save page title when debounced value changes
  useEffect(() => {
    if (!editingPageId || !debouncedPageTitle.trim()) return;
    
    const currentPage = pages.find(p => p.id === editingPageId);
    if (!currentPage) return;
    
    // Only auto-save if the debounced value differs from the current page title
    if (debouncedPageTitle.trim() !== currentPage.title.trim()) {
      handleRenamePage(editingPageId, debouncedPageTitle, true);
    }
  }, [debouncedPageTitle, editingPageId]);

  const handleDeletePage = async (pageIdToDelete: string) => {
    try {
      setDeletingPageId(pageIdToDelete);
      const success = await archivePage(pageIdToDelete);
      
      if (success) {
        setShowDeleteConfirm(null);
        setShowPageMenu(null);
        await loadPages();
        showToast('success', 'Page deleted');
        
        // If the deleted page was the current page, redirect to pages list
        if (pageIdToDelete === effectivePageId && onContentChange) {
          onContentChange({ page_id: undefined });
        }
      } else {
        showToast('error', 'Failed to delete page');
      }
    } catch (error) {
      console.error('Failed to delete page:', error);
      showToast('error', 'Failed to delete page');
    } finally {
      setDeletingPageId(null);
    }
  };

  const handlePageDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !householdId) return;
    
    const activeIndex = pages.findIndex(p => p.id === active.id);
    const overIndex = pages.findIndex(p => p.id === over.id);
    
    if (activeIndex === -1 || overIndex === -1) return;
    
    // Optimistic update
    const newPages = [...pages];
    const [movedPage] = newPages.splice(activeIndex, 1);
    newPages.splice(overIndex, 0, movedPage);
    setPages(newPages);
    
    try {
      // Calculate new order indices using fractional indexing
      const orders = newPages.map((p, idx) => ({
        id: p.id,
        order_index: idx + 1,
        parent_page_id: null, // Root pages for now
      }));
      
      const success = await reorderPages(householdId, orders);
      
      if (!success) {
        // Rollback on failure
        await loadPages();
        showToast('error', 'Failed to reorder pages');
      }
    } catch (error) {
      console.error('Failed to reorder pages:', error);
      // Rollback on failure
      await loadPages();
      showToast('error', 'Failed to reorder pages');
    }
  };

  // Build tree from flat units, respecting collapsed state
  const treeUnits = useMemo(() => {
    const tree = buildWorkspaceUnitTree(flatUnits);
    return filterCollapsedUnits(tree, collapsedUnits);
  }, [flatUnits, collapsedUnits]);

  // Get all unit IDs for sortable context
  const unitIds = useMemo(() => {
    const getAllIds = (units: WorkspaceUnit[]): string[] => {
      const ids: string[] = [];
      for (const unit of units) {
        ids.push(unit.id);
        if (unit.children && unit.children.length > 0 && !collapsedUnits.has(unit.id)) {
          ids.push(...getAllIds(unit.children));
        }
      }
      return ids;
    };
    return getAllIds(treeUnits);
  }, [treeUnits, collapsedUnits]);


  // Parse text input to detect block patterns
  const parseBlockPattern = (text: string): { type: WorkspaceUnitType; content: any; remainingText: string } | null => {
    const trimmed = text.trim();
    
    // Heading patterns: #, ##, ###
    if (trimmed.startsWith('###')) {
      const title = trimmed.slice(3).trim();
      return {
        type: 'group',
        content: { title, summary: '' },
        remainingText: ''
      };
    } else if (trimmed.startsWith('##')) {
      const title = trimmed.slice(2).trim();
      return {
        type: 'group',
        content: { title, summary: '' },
        remainingText: ''
      };
    } else if (trimmed.startsWith('#')) {
      const title = trimmed.slice(1).trim();
      return {
        type: 'group',
        content: { title, summary: '' },
        remainingText: ''
      };
    }
    
    // Divider pattern: ---
    if (trimmed === '---' || trimmed.startsWith('---')) {
      return {
        type: 'divider',
        content: { style: 'solid' as const },
        remainingText: ''
      };
    }
    
    // Bullet list pattern: - or *
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const item = trimmed.slice(2).trim();
      return {
        type: 'bullet',
        content: { items: item ? [item] : [], ordered: false },
        remainingText: ''
      };
    }
    
    // Checklist pattern: []
    if (trimmed.startsWith('[ ] ') || trimmed.startsWith('[] ')) {
      const item = trimmed.slice(4).trim();
      return {
        type: 'checklist',
        content: { items: item ? [{ text: item, completed: false }] : [] },
        remainingText: ''
      };
    }
    
    return null;
  };

  // INSERT AT CURSOR POSITION: Refactored to insert blocks at the active block position
  const handleAddUnit = async (type: WorkspaceUnitType, parentId?: string, afterUnitId?: string) => {
    const targetId = effectivePageId || page?.id;
    if (!targetId) return;

    try {
      // Determine insertion position: use afterUnitId if provided, otherwise use activeBlockId
      const insertAfterId = afterUnitId || activeBlockIdRef.current;
      let insertAfterUnit: WorkspaceUnit | undefined;
      let orderIndex: number | undefined;
      let insertParentId: string | undefined = parentId;

      if (insertAfterId) {
        insertAfterUnit = flatUnits.find(u => u.id === insertAfterId);
        if (insertAfterUnit) {
          // Use the same parent as the unit we're inserting after
          insertParentId = insertParentId || insertAfterUnit.parent_id;
          
          // Calculate order_index using fractional indexing
          const afterIndex = flatUnits.findIndex(u => u.id === insertAfterId);
          const nextUnit = afterIndex >= 0 && afterIndex < flatUnits.length - 1 
            ? flatUnits[afterIndex + 1] 
            : null;
          
          if (nextUnit && nextUnit.parent_id === insertParentId) {
            // Insert between current and next unit
            orderIndex = (insertAfterUnit.order_index + nextUnit.order_index) / 2;
          } else {
            // Insert after current unit (at the end of siblings)
            orderIndex = insertAfterUnit.order_index + 1;
          }
        }
      }

      let unitContent;
      if (type === 'text') {
        unitContent = { text: '', formatting: 'plain' as const };
      } else if (type === 'bullet') {
        unitContent = { items: [], ordered: false };
      } else if (type === 'group') {
        unitContent = { title: '', summary: '' };
      } else if (type === 'checklist') {
        unitContent = { items: [] };
      } else if (type === 'callout') {
        unitContent = { text: '', type: 'info' as const };
      } else if (type === 'code') {
        unitContent = { code: '', language: '' };
      } else if (type === 'divider') {
        unitContent = { style: 'solid' as const };
      } else if (type === 'reference') {
        // Reference units need to be created via picker
        setShowReferencePicker({ type: 'planner_event' });
        return;
      } else {
        return;
      }

      const newUnit = await createWorkspaceUnit({
        page_id: targetId,
        parent_id: insertParentId,
        type,
        content: unitContent,
        order_index: orderIndex,
      });

      // Reload to get the new unit in the list
      await loadPage();
      
      // Focus the newly created block
      setActiveBlockId(newUnit.id);
      activeBlockIdRef.current = newUnit.id;
      
      // Scroll to the new block and focus it after a brief delay
      setTimeout(() => {
        const element = document.querySelector(`[data-unit-id="${newUnit.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Try to focus the textarea inside the new block
          const textarea = element.querySelector('textarea');
          if (textarea) {
            textarea.focus();
          }
        }
      }, 100);
    } catch (error) {
      console.error('Failed to add unit:', error);
      showToast('error', 'Failed to add unit');
    }
  };

  // Optimistic update with debounced save and draft storage
  const handleUpdateUnit = useCallback(async (unitId: string, updates: Partial<WorkspaceUnit>) => {
    if (!effectivePageId) {
      console.warn('Cannot save: no effectivePageId');
      return;
    }
    
    const unit = flatUnits.find(u => u.id === unitId);
    if (!unit) {
      console.warn('Cannot save: unit not found', unitId);
      return;
    }
    
    // Clear any existing timeout for this unit
    const existingTimeout = saveTimeoutsRef.current.get(unitId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      saveTimeoutsRef.current.delete(unitId);
    }
    
    // Optimistic update: update UI immediately
    setFlatUnits(prev => prev.map(u => 
      u.id === unitId ? { ...u, ...updates } : u
    ));
    
    // Store pending update
    pendingUpdatesRef.current.set(unitId, updates);
    
    // Save to draft storage immediately (offline safety)
    const updatedUnit = { ...unit, ...updates };
    saveDraft(effectivePageId, {
      id: unitId,
      page_id: effectivePageId,
      content: updatedUnit.content,
      type: updatedUnit.type,
      updated_at: new Date().toISOString(),
      local_version: Date.now(),
    });
    
    // Clear any previous error
    setErrorUnits(prev => {
      const next = new Set(prev);
      next.delete(unitId);
      return next;
    });
    
    // Mark as saving
    setSavingUnits(prev => new Set(prev).add(unitId));
    setSaveStatus('saving');
    
    // Debounce the actual save (300ms)
    const saveTimeout = setTimeout(async () => {
      try {
        // Always attempt to save to Supabase (will fail gracefully if offline)
        console.log('Saving unit to Supabase:', unitId, updates);
        await updateWorkspaceUnit(unitId, updates);
        console.log('Successfully saved unit to Supabase:', unitId);
        
        pendingUpdatesRef.current.delete(unitId);
        saveTimeoutsRef.current.delete(unitId);
        clearDraft(effectivePageId, unitId);
        
        // Update save status if no more pending saves
        if (pendingUpdatesRef.current.size === 0) {
          setSaveStatus('saved');
        }
      } catch (error) {
        console.error('Failed to update unit in Supabase:', error);
        setErrorUnits(prev => new Set(prev).add(unitId));
        
        // If offline or network error, show offline status; otherwise show error
        const isNetworkError = error && (
          (error as any).code === 'PGRST301' || 
          (error as any).message?.includes('network') ||
          (error as any).message?.includes('fetch') ||
          !navigator.onLine
        );
        
        if (isNetworkError || !navigator.onLine) {
          setSaveStatus('offline');
        } else {
          setSaveStatus('error');
        }
        
        // Keep draft if save failed
        // Don't revert optimistic update - keep draft visible
      } finally {
        setSavingUnits(prev => {
          const next = new Set(prev);
          next.delete(unitId);
          return next;
        });
      }
    }, 300);
    
    // Store timeout for this specific unit
    saveTimeoutsRef.current.set(unitId, saveTimeout);
  }, [effectivePageId, flatUnits, isOnline]);

  const handleDeleteUnit = async (unitId: string) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return;

    try {
      await deleteWorkspaceUnit(unitId);
      if (pageId) {
        await loadPage();
      } else if (page) {
        await loadPage();
      }
    } catch (error) {
      console.error('Failed to delete unit:', error);
      showToast('error', 'Failed to delete unit');
    }
  };

  // Enhanced conversion function to support all block types (for inline markdown transformations)
  const handleConvertUnit = async (unitId: string, newType: WorkspaceUnitType, newContent?: any) => {
    const unit = flatUnits.find(u => u.id === unitId);
    if (!unit) return;

    try {
      const targetId = effectivePageId || page?.id;
      if (!targetId) return;

      // If newContent is provided, use it; otherwise, convert from existing content
      let content = newContent;
      
      if (!content) {
        // Default conversions
        if (newType === 'text') {
          if (isBulletUnit(unit)) {
            content = { text: unit.content.items.join('\n'), formatting: 'plain' as const };
          } else if (isChecklistUnit(unit)) {
            content = { text: unit.content.items.map(item => item.text).join('\n'), formatting: 'plain' as const };
          } else if (isGroupUnit(unit)) {
            content = { text: unit.content.title || '', formatting: 'plain' as const };
          } else if (isCalloutUnit(unit)) {
            content = { text: unit.content.text, formatting: 'plain' as const };
          } else if (isCodeUnit(unit)) {
            content = { text: unit.content.code, formatting: 'plain' as const };
          } else {
            content = { text: '', formatting: 'plain' as const };
          }
        } else if (newType === 'bullet') {
          if (isTextUnit(unit)) {
            content = { items: unit.content.text.split('\n').filter(l => l.trim()), ordered: false };
          } else {
            content = { items: [], ordered: false };
          }
        } else if (newType === 'checklist') {
          if (isTextUnit(unit)) {
            content = { items: unit.content.text.split('\n').filter(l => l.trim()).map(text => ({ text, completed: false })) };
          } else {
            content = { items: [] };
          }
        } else if (newType === 'group') {
          if (isTextUnit(unit)) {
            content = { title: unit.content.text.split('\n')[0] || '', summary: unit.content.text.split('\n').slice(1).join('\n') || undefined };
          } else {
            content = { title: '', summary: undefined };
          }
        } else if (newType === 'divider') {
          content = { style: 'solid' as const };
        } else if (newType === 'code') {
          if (isTextUnit(unit)) {
            content = { code: unit.content.text, language: undefined };
          } else {
            content = { code: '', language: undefined };
          }
        } else if (newType === 'callout') {
          if (isTextUnit(unit)) {
            content = { text: unit.content.text, type: 'info' as const };
          } else {
            content = { text: '', type: 'info' as const };
          }
        }
      }

      // Type conversion requires deleting and recreating the unit
      // Delete the old unit
      await deleteWorkspaceUnit(unitId);
      
      // Create new unit with the same position
      await createWorkspaceUnit({
        page_id: targetId,
        parent_id: unit.parent_id,
        type: newType,
        content: content,
        order_index: unit.order_index,
      });

      await loadPage();
      setShowUnitMenu(null);
    } catch (error) {
      console.error('Failed to convert unit:', error);
      showToast('error', 'Failed to convert unit');
    }
  };

  const handleToggleCollapse = async (unitId: string) => {
    const unit = flatUnits.find(u => u.id === unitId);
    if (!unit) return;

    const newCollapsedState = !collapsedUnits.has(unitId);
    
    // Update local state immediately
    setCollapsedUnits(prev => {
      const next = new Set(prev);
      if (newCollapsedState) {
        next.add(unitId);
      } else {
        next.delete(unitId);
      }
      return next;
    });

    // Persist to database
    try {
      await updateWorkspaceUnit(unitId, {
        is_collapsed: newCollapsedState,
      });
    } catch (error) {
      console.error('Failed to update collapse state:', error);
      // Revert local state on error
      setCollapsedUnits(prev => {
        const next = new Set(prev);
        if (newCollapsedState) {
          next.delete(unitId);
        } else {
          next.add(unitId);
        }
        return next;
      });
    }
  };

  const handleCollapseAll = async () => {
    const allGroups = flatUnits.filter(u => u.type === 'group');
    const allGroupIds = new Set(allGroups.map(u => u.id));
    setCollapsedUnits(allGroupIds);

    // Persist all collapse states
    try {
      await Promise.all(
        allGroups.map(group =>
          updateWorkspaceUnit(group.id, { is_collapsed: true })
        )
      );
    } catch (error) {
      console.error('Failed to collapse all:', error);
    }
  };

  const handleExpandAll = async () => {
    const collapsedGroups = flatUnits.filter(u => u.type === 'group' && collapsedUnits.has(u.id));
    setCollapsedUnits(new Set());

    // Persist all expand states
    try {
      await Promise.all(
        collapsedGroups.map(group =>
          updateWorkspaceUnit(group.id, { is_collapsed: false })
        )
      );
    } catch (error) {
      console.error('Failed to expand all:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: any) => {
    if (event.over) {
      setDragOverId(event.over.id as string);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverId(null);

    if (!over || active.id === over.id) return;

    const activeUnit = flatUnits.find(u => u.id === active.id);
    const overUnit = flatUnits.find(u => u.id === over.id);
    
    if (!activeUnit || !overUnit) return;

    // Check if we're nesting (dragging into a group)
    const isNesting = isGroupUnit(overUnit) && activeUnit.parent_id !== overUnit.id;
    
    // Check if we're unnesting (dragging out of a group to root level or different parent)
    const isUnnesting = activeUnit.parent_id && (
      !isGroupUnit(overUnit) || // Dragging to non-group
      (isGroupUnit(overUnit) && overUnit.id !== activeUnit.parent_id) // Dragging to different group
    );

    if (isNesting) {
      // Nest the active unit inside the over unit
      const siblings = flatUnits.filter(u => u.parent_id === overUnit.id);
      const newOrderIndex = siblings.length > 0 
        ? Math.max(...siblings.map(u => u.order_index)) + 1 
        : 1;

      try {
        await updateWorkspaceUnit(activeUnit.id, {
          parent_id: overUnit.id,
          order_index: newOrderIndex,
        });
        if (pageId) {
          await loadPage();
        } else {
          await loadPage();
        }
      } catch (error) {
        console.error('Failed to nest unit:', error);
        showToast('error', 'Failed to nest unit');
      }
      return;
    }

    if (isUnnesting) {
      // Unnest: move to new parent (or root if overUnit is not a group)
      const newParentId = isGroupUnit(overUnit) ? overUnit.id : null;
      const siblings = flatUnits.filter(u => u.parent_id === newParentId);
      const newOrderIndex = siblings.length > 0 
        ? Math.max(...siblings.map(u => u.order_index)) + 1 
        : 1;

      try {
        await updateWorkspaceUnit(activeUnit.id, {
          parent_id: newParentId || undefined,
          order_index: newOrderIndex,
        });
        if (pageId) {
          await loadPage();
        } else {
          await loadPage();
        }
      } catch (error) {
        console.error('Failed to unnest unit:', error);
        showToast('error', 'Failed to unnest unit');
      }
      return;
    }

    // Regular reordering (same parent level)
    const siblings = flatUnits.filter(u => u.parent_id === activeUnit.parent_id);
    const activeIndex = siblings.findIndex(u => u.id === active.id);
    const overIndex = siblings.findIndex(u => u.id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    // Optimistic update: reorder immediately
    const reordered = arrayMove(siblings, activeIndex, overIndex);
    const reorderedIds = reordered.map(u => u.id);
    setFlatUnits(prev => {
      const otherUnits = prev.filter(u => u.parent_id !== activeUnit.parent_id);
      return [...otherUnits, ...reordered];
    });
    
    // Calculate new order indices (fractional indexing)
    const orders = reordered.map((unit, idx) => {
      const prevOrder = idx > 0 ? reordered[idx - 1].order_index : 0;
      const nextOrder = idx < reordered.length - 1 ? reordered[idx + 1].order_index : prevOrder + 2;
      // Use midpoint for fractional indexing
      const newOrder = idx === 0 ? 1 : (prevOrder + nextOrder) / 2;
      return {
        id: unit.id,
        order_index: newOrder,
        parent_id: unit.parent_id,
      };
    });

    const targetId = effectivePageId || page?.id;
    if (!targetId) return;

    try {
      await reorderWorkspaceUnits(targetId, orders);
      // Reload to ensure consistency
      if (pageId) {
        await loadPage();
      } else {
        await loadPage();
      }
    } catch (error) {
      console.error('Failed to reorder units:', error);
      showToast('error', 'Failed to reorder units');
      // Revert on error
      if (pageId) {
        await loadPage();
      } else {
        await loadPage();
      }
    }
  };

  // Helper to get content preview from units
  const getContentPreview = useCallback(() => {
    if (flatUnits.length === 0) return null;
    
    // Get first few non-empty units for preview
    const previewUnits = flatUnits
      .filter(unit => {
        if (isTextUnit(unit)) return unit.content.text?.trim();
        if (isBulletUnit(unit)) return unit.content.items?.length > 0;
        if (isChecklistUnit(unit)) return unit.content.items?.length > 0;
        if (isGroupUnit(unit)) return unit.content.title?.trim();
        if (isCalloutUnit(unit)) return unit.content.text?.trim();
        return false;
      })
      .slice(0, 3);
    
    return previewUnits.map(unit => {
      if (isTextUnit(unit)) {
        const text = unit.content.text?.trim() || '';
        return { type: 'text', content: text.substring(0, 60) };
      }
      if (isBulletUnit(unit)) {
        const firstItem = unit.content.items?.[0] || '';
        return { type: 'bullet', content: firstItem.substring(0, 50) };
      }
      if (isChecklistUnit(unit)) {
        const firstItem = unit.content.items?.[0]?.text || '';
        return { type: 'checklist', content: firstItem.substring(0, 50) };
      }
      if (isGroupUnit(unit)) {
        return { type: 'group', content: unit.content.title || 'Group' };
      }
      if (isCalloutUnit(unit)) {
        const text = unit.content.text?.trim() || '';
        return { type: 'callout', content: text.substring(0, 50) };
      }
      return null;
    }).filter(Boolean);
  }, [flatUnits]);

  // Helper to get unit type counts
  const getUnitTypeCounts = useCallback(() => {
    const counts = {
      text: 0,
      bullet: 0,
      checklist: 0,
      group: 0,
      callout: 0,
      code: 0,
      reference: 0,
    };
    
    flatUnits.forEach(unit => {
      if (isTextUnit(unit)) counts.text++;
      else if (isBulletUnit(unit)) counts.bullet++;
      else if (isChecklistUnit(unit)) counts.checklist++;
      else if (isGroupUnit(unit)) counts.group++;
      else if (isCalloutUnit(unit)) counts.callout++;
      else if (isCodeUnit(unit)) counts.code++;
      else if (isReferenceUnit(unit)) counts.reference++;
    });
    
    return counts;
  }, [flatUnits]);

  if (viewMode === 'icon') {
    const preview = getContentPreview();
    const displayTitle = page?.title || 'Workspace';
    const unitCount = flatUnits.length;
    
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-2 border-slate-200 rounded-2xl p-3 relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-2 left-2 w-8 h-8 border border-slate-400 rounded"></div>
          <div className="absolute top-6 left-6 w-4 h-4 border border-slate-400 rounded"></div>
          <div className="absolute bottom-4 right-4 w-6 h-6 border border-slate-400 rounded"></div>
        </div>
        
        {/* Main icon */}
        <div className="relative z-10 flex items-center justify-center mb-2">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm">
            <Layers size={28} className="text-slate-700" />
          </div>
        </div>
        
        {/* Page title or workspace name */}
        {displayTitle && (
          <p className="text-[10px] font-semibold text-slate-800 text-center line-clamp-1 mb-1 relative z-10 max-w-full px-1">
            {displayTitle}
          </p>
        )}
        
        {/* Content preview or unit count */}
        {preview && preview.length > 0 ? (
          <div className="relative z-10 w-full mt-1 space-y-0.5">
            {preview.slice(0, 2).map((item, idx) => (
              item && (
                <div key={idx} className="flex items-start gap-1 px-1">
                  <span className="text-[8px] text-slate-500 mt-0.5 flex-shrink-0">
                    {item.type === 'bullet' ? '•' : item.type === 'checklist' ? '☐' : item.type === 'group' ? '▸' : '—'}
                  </span>
                  <p className="text-[8px] text-slate-600 line-clamp-1 flex-1 min-w-0">
                    {item.content}
                  </p>
                </div>
              )
            ))}
          </div>
        ) : unitCount > 0 ? (
          <p className="text-[9px] text-slate-500 text-center relative z-10">
            {unitCount} {unitCount === 1 ? 'block' : 'blocks'}
          </p>
        ) : (
          <p className="text-[9px] text-slate-400 italic text-center relative z-10">
            Empty
          </p>
        )}
      </div>
    );
  }

  if (viewMode === 'mini') {
    const unitCount = flatUnits.length;
    const displayTitle = page?.title || 'Workspace';
    const preview = getContentPreview();
    const typeCounts = getUnitTypeCounts();
    const totalTypes = Object.values(typeCounts).filter(c => c > 0).length;
    
    return (
      <div className="w-full h-full p-4 flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-2 border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-1.5 shadow-sm">
            <Layers size={16} className="text-slate-700" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-slate-900 block truncate">
              {displayTitle}
            </span>
            {page && page.title !== displayTitle && (
              <span className="text-[10px] text-slate-500">Workspace</span>
            )}
          </div>
        </div>
        
        {/* Content Preview */}
        {preview && preview.length > 0 ? (
          <div className="flex-1 overflow-hidden space-y-1.5 mb-3">
            {preview.map((item, idx) => (
              item && (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-400 mt-0.5 flex-shrink-0 text-[10px]">
                    {item.type === 'bullet' ? '•' : 
                     item.type === 'checklist' ? '☐' : 
                     item.type === 'group' ? '▸' : 
                     item.type === 'callout' ? 'ℹ' : '—'}
                  </span>
                  <p className="text-xs text-slate-700 line-clamp-2 flex-1 min-w-0 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              )
            ))}
          </div>
        ) : unitCount > 0 ? (
          <div className="flex-1 flex items-center justify-center mb-3">
            <p className="text-xs text-slate-500 italic text-center">
              {unitCount} {unitCount === 1 ? 'block' : 'blocks'} • {totalTypes} {totalTypes === 1 ? 'type' : 'types'}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center mb-3">
            <p className="text-xs text-slate-400 italic text-center">
              Empty workspace
            </p>
          </div>
        )}
        
        {/* Footer with stats */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            {typeCounts.text > 0 && (
              <span className="flex items-center gap-1">
                <Type size={10} />
                {typeCounts.text}
              </span>
            )}
            {typeCounts.bullet > 0 && (
              <span className="flex items-center gap-1">
                <List size={10} />
                {typeCounts.bullet}
              </span>
            )}
            {typeCounts.checklist > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare size={10} />
                {typeCounts.checklist}
              </span>
            )}
            {typeCounts.group > 0 && (
              <span className="flex items-center gap-1">
                <Layers size={10} />
                {typeCounts.group}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500">
            {unitCount} {unitCount === 1 ? 'unit' : 'units'}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen-safe bg-gray-50 safe-top safe-bottom flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <Loader2 size={40} className="animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading page...</p>
          <p className="text-sm text-gray-400 mt-2">Organizing your thoughts...</p>
        </div>
      </div>
    );
  }

  // Pages list view (when no pageId is provided)
  if (!effectivePageId) {
    if (loading) {
      return (
        <div className="min-h-screen-safe bg-gray-50 safe-top safe-bottom flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-slate-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading pages...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen-safe bg-gray-50 safe-top safe-bottom">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm safe-top">
          {/* Save Status Indicator */}
          {effectivePageId && (
            <div className="px-3 sm:px-4 py-1.5 flex items-center justify-end gap-2 text-xs">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle2 size={12} />
                  <span>Saved</span>
                </div>
              )}
              {saveStatus === 'offline' && (
                <div className="flex items-center gap-1.5 text-amber-600">
                  <AlertCircle size={12} />
                  <span>Offline — changes saved locally</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-red-600">
                  <XCircle size={12} />
                  <span>Save failed</span>
                </div>
              )}
            </div>
          )}
          <div className="px-2 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-lg">
                  <FileText size={20} className="text-slate-600" />
                </div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900">Pages</h1>
              </div>
              <button
                onClick={() => setShowCreatePageModal(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Create Page</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pages List */}
        <div className="p-3 sm:p-4">
          {pages.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-base sm:text-lg text-gray-600 font-medium mb-1">No pages yet</p>
              <p className="text-sm text-gray-500 mb-6 px-4">
                Create your first page to start organizing your thoughts and ideas
              </p>
              <button
                onClick={() => setShowCreatePageModal(true)}
                className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus size={18} />
                Create Page
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handlePageDragEnd}
            >
              <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {pages.map((p) => (
                    <SortablePageItem
                      key={p.id}
                      page={p}
                      isEditing={editingPageId === p.id}
                      editTitle={editPageTitle}
                      onEditTitleChange={setEditPageTitle}
                      onEditStart={() => {
                        setEditingPageId(p.id);
                        setEditPageTitle(p.title);
                        setShowPageMenu(null);
                      }}
                      onEditCancel={() => {
                        setEditingPageId(null);
                        setEditPageTitle('');
                      }}
                      onEditSave={() => handleRenamePage(p.id, editPageTitle)}
                      showMenu={showPageMenu === p.id}
                      onMenuToggle={() => setShowPageMenu(showPageMenu === p.id ? null : p.id)}
                      onDelete={() => setShowDeleteConfirm(p.id)}
                      onSelect={() => {
                        if (onContentChange) {
                          onContentChange({ page_id: p.id });
                        }
                      }}
                      isDeleting={deletingPageId === p.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Create Page Modal */}
        {showCreatePageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 safe-top safe-bottom">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Page</h2>
              <input
                type="text"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPageTitle.trim()) {
                    handleCreatePage();
                  } else if (e.key === 'Escape') {
                    setShowCreatePageModal(false);
                    setNewPageTitle('');
                  }
                }}
                placeholder="Page title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCreatePageModal(false);
                    setNewPageTitle('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePage}
                  disabled={!newPageTitle.trim() || creatingPage}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creatingPage ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 safe-top safe-bottom">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Page</h2>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this page? This will also delete all content in the page. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={!!deletingPageId}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePage(showDeleteConfirm)}
                  disabled={!!deletingPageId}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deletingPageId ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Page view (when pageId is provided)
  if (!page) {
    if (loading) {
      return (
        <div className="min-h-screen-safe bg-gray-50 safe-top safe-bottom flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-slate-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading page...</p>
          </div>
        </div>
      );
    }

    // Page not found
    return (
      <div className="min-h-screen-safe bg-gray-50 safe-top safe-bottom flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-1">Page not found</p>
          <p className="text-sm text-gray-500">
            The page you're looking for doesn't exist or has been archived.
          </p>
        </div>
      </div>
    );
  }

  const currentTitle = page.title;

  const activeUnit = activeId ? flatUnits.find(u => u.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragCancel={() => {
        setActiveId(null);
        setDragOverId(null);
      }}
    >
      <div className="flex-1 min-h-0 bg-gradient-to-br from-stone-50 via-neutral-50 to-stone-100 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-stone-200 shadow-sm transition-shadow flex-shrink-0">
          {/* Save Status Indicator */}
          <div className="px-2 sm:px-4 py-1 flex items-center justify-end gap-2 text-xs">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Loader2 size={12} className="animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 size={12} />
                <span>Saved</span>
              </div>
            )}
            {saveStatus === 'offline' && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <AlertCircle size={12} />
                <span className="hidden sm:inline">Offline — changes saved locally</span>
                <span className="sm:hidden">Offline</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-red-600">
                <XCircle size={12} />
                <span>Save failed</span>
              </div>
            )}
          </div>
          <div className="px-2 sm:px-4 py-2 sm:py-3">
            {/* Mobile Header */}
            <div className="flex items-center justify-between mb-2 sm:hidden">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Back Button */}
                <button
                  onClick={() => {
                    if (onContentChange) {
                      onContentChange({ page_id: undefined });
                    }
                  }}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="Back to Pages"
                  aria-label="Back to Pages"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="p-1.5 bg-stone-100 rounded-lg flex-shrink-0">
                  <Layers size={20} className="text-stone-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base font-bold text-stone-900 truncate">
                    {currentTitle}
                  </h1>
                  <p className="text-xs text-stone-500">Your working surface</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Writing Mode Switcher (Desktop) */}
                <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1 mr-2">
                  <button
                    onClick={() => setWritingMode('default')}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      writingMode === 'default' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Default mode"
                  >
                    <Type size={14} />
                  </button>
                  <button
                    onClick={() => setWritingMode('focus')}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      writingMode === 'focus' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Focus mode - hide UI chrome"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <button
                    onClick={() => setWritingMode('outline')}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      writingMode === 'outline' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Outline mode - show structure only"
                  >
                    <ListChecks size={14} />
                  </button>
                  <button
                    onClick={() => setWritingMode('reading')}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      writingMode === 'reading' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Reading mode - optimized typography"
                  >
                    <Eye size={14} />
                  </button>
                </div>
                {treeUnits.length > 0 && (
                  <>
                    <button
                      onClick={handleCollapseAll}
                      className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Collapse all"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      onClick={handleExpandAll}
                      className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Expand all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
                <div className="relative" data-mobile-menu>
                  <button
                    onClick={() => setShowMobileAddMenu(!showMobileAddMenu)}
                    className="p-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 active:bg-slate-800 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="Add content"
                  >
                    <Plus size={18} />
                  </button>
                  {showMobileAddMenu && (
                    <>
                      <div 
                        className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                        onClick={() => setShowMobileAddMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-48 max-h-[70vh] overflow-y-auto">
                      {/* Text blocks are implicit - removed "Add Text" option */}
                      <button
                        onClick={() => { handleAddUnit('bullet', undefined, activeBlockId || undefined); setShowMobileAddMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 border-b border-gray-100 touch-manipulation min-h-[44px]"
                      >
                        <List size={16} />
                        List
                      </button>
                      <button
                        onClick={() => { handleAddUnit('checklist', undefined, activeBlockId || undefined); setShowMobileAddMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 border-b border-gray-100 touch-manipulation min-h-[44px]"
                      >
                        <CheckSquare size={16} />
                        Checklist
                      </button>
                      <button
                        onClick={() => { handleAddUnit('group', undefined, activeBlockId || undefined); setShowMobileAddMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 border-b border-gray-100 touch-manipulation min-h-[44px]"
                      >
                        <Layers size={16} />
                        Group
                      </button>
                      <button
                        onClick={() => { handleAddUnit('callout', undefined, activeBlockId || undefined); setShowMobileAddMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 border-b border-gray-100 touch-manipulation min-h-[44px]"
                      >
                        <AlertCircle size={16} />
                        Callout
                      </button>
                      <button
                        onClick={() => { handleAddUnit('code', undefined, activeBlockId || undefined); setShowMobileAddMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 border-b border-gray-100 touch-manipulation min-h-[44px]"
                      >
                        <Code size={16} />
                        Code
                      </button>
                      <button
                        onClick={() => { handleAddUnit('divider', undefined, activeBlockId || undefined); setShowMobileAddMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 border-b border-gray-100 touch-manipulation min-h-[44px]"
                      >
                        <Minus size={16} />
                        Divider
                      </button>
                      <button
                        onClick={() => { setShowReferencePicker({ type: 'planner_event' }); setShowMobileAddMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 touch-manipulation min-h-[44px]"
                      >
                        <LinkIcon size={16} />
                        Reference
                      </button>
                    </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden sm:flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Back Button */}
                <button
                  onClick={() => {
                    if (onContentChange) {
                      onContentChange({ page_id: undefined });
                    }
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  title="Back to Pages"
                  aria-label="Back to Pages"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="p-2 bg-slate-100 rounded-lg">
                  <FileText size={24} className="text-slate-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {currentTitle}
                  </h1>
                  <p className="text-sm text-gray-600">Structured thinking and reference</p>
                </div>
              </div>
              <div className="flex gap-2">
                {treeUnits.length > 0 && (
                  <>
                    <button
                      onClick={handleCollapseAll}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      title="Collapse all groups"
                    >
                      Collapse All
                    </button>
                    <button
                      onClick={handleExpandAll}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      title="Expand all groups"
                    >
                      Expand All
                    </button>
                  </>
                )}
                <div className="flex gap-1">
                  {/* Text blocks are implicit - removed "Add Text" button */}
                  <button
                    onClick={() => handleAddUnit('bullet', undefined, activeBlockId || undefined)}
                    className="px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                    title="Add bullet list"
                  >
                    <List size={14} />
                    <span className="hidden md:inline">List</span>
                  </button>
                  <button
                    onClick={() => handleAddUnit('group', undefined, activeBlockId || undefined)}
                    className="px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                    title="Add collapsible group"
                  >
                    <Layers size={14} />
                    <span className="hidden md:inline">Group</span>
                  </button>
                  <button
                    onClick={() => handleAddUnit('checklist', undefined, activeBlockId || undefined)}
                    className="px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                    title="Add checklist"
                  >
                    <CheckSquare size={14} />
                    <span className="hidden md:inline">Checklist</span>
                  </button>
                  <button
                    onClick={() => handleAddUnit('callout', undefined, activeBlockId || undefined)}
                    className="px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                    title="Add callout"
                  >
                    <AlertCircle size={14} />
                    <span className="hidden lg:inline">Callout</span>
                  </button>
                  <button
                    onClick={() => handleAddUnit('code', undefined, activeBlockId || undefined)}
                    className="px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                    title="Add code block"
                  >
                    <Code size={14} />
                    <span className="hidden lg:inline">Code</span>
                  </button>
                  <button
                    onClick={() => handleAddUnit('divider', undefined, activeBlockId || undefined)}
                    className="px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                    title="Add divider"
                  >
                    <Minus size={14} />
                    <span className="hidden lg:inline">Divider</span>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowReferencePicker({ type: 'planner_event' })}
                      className="px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                      title="Add reference"
                    >
                      <LinkIcon size={14} />
                      <span className="hidden lg:inline">Reference</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 min-h-0 flex flex-col ${
          writingMode === 'focus' ? '' :
          writingMode === 'reading' ? '' :
          ''
        }`}>
          {/* UNIFIED BLOCK MODEL: Always render blocks, never a separate textarea */}
          {/* NO overflow here - page container handles scrolling */}
          {treeUnits.length > 0 && (
            <div className={`flex-1 min-h-0 pb-safe w-full ${
              writingMode === 'focus' ? 'px-0 py-4 sm:px-4 sm:py-6 sm:max-w-5xl sm:mx-auto' :
              writingMode === 'reading' ? 'px-0 py-4 sm:px-4 sm:py-6 sm:max-w-4xl sm:mx-auto' :
              'px-0 py-3 sm:px-4 sm:py-4'
            }`}>
            <SortableContext items={unitIds} strategy={verticalListSortingStrategy}>
              <div className={`space-y-1 transition-opacity ${
                writingMode === 'outline' ? 'opacity-60' : ''
              }`}>
            <WorkspaceUnitList
              units={treeUnits}
              onUpdate={handleUpdateUnit}
              onDelete={handleDeleteUnit}
              onAddChild={handleAddUnit}
              onConvert={handleConvertUnit}
              onToggleCollapse={handleToggleCollapse}
              collapsedUnits={collapsedUnits}
              showUnitMenu={showUnitMenu}
              setShowUnitMenu={setShowUnitMenu}
              setShowReferencePicker={setShowReferencePicker}
              savingUnits={savingUnits}
              errorUnits={errorUnits}
              dragOverId={dragOverId}
              parseBlockPattern={parseBlockPattern}
              onCreateUnitAfter={handleCreateUnitAfter}
              onStructuredPaste={handleStructuredPaste}
              onSetActiveBlock={handleSetActiveBlock}
            />
              </div>
            </SortableContext>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeUnit ? (
            <div className="bg-white border-2 border-slate-300 rounded-lg shadow-lg p-3 opacity-90">
              {isTextUnit(activeUnit) && (
                <p className="text-sm text-gray-700 line-clamp-2">
                  {activeUnit.content.text || 'Text section'}
                </p>
              )}
              {isBulletUnit(activeUnit) && (
                <p className="text-sm text-gray-700">
                  {activeUnit.content.items.length} {activeUnit.content.items.length === 1 ? 'item' : 'items'}
                </p>
              )}
              {isChecklistUnit(activeUnit) && (
                <p className="text-sm text-gray-700">
                  {activeUnit.content.items.length} {activeUnit.content.items.length === 1 ? 'item' : 'items'}
                </p>
              )}
              {isGroupUnit(activeUnit) && (
                <p className="text-sm text-gray-700 font-medium">
                  {activeUnit.content.title || 'Group'}
                </p>
              )}
              {isCalloutUnit(activeUnit) && (
                <p className="text-sm text-gray-700 line-clamp-2">
                  {activeUnit.content.text || 'Callout'}
                </p>
              )}
              {isCodeUnit(activeUnit) && (
                <p className="text-sm text-gray-700 font-mono">
                  {activeUnit.content.language || 'code'}
                </p>
              )}
              {isDividerUnit(activeUnit) && (
                <div className="w-full h-px bg-gray-300"></div>
              )}
              {isReferenceUnit(activeUnit) && (
                <p className="text-sm text-gray-700">
                  {activeUnit.content.display_text || 'Reference'}
                </p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {/* Reference Picker Modal */}
      {showReferencePicker && (
        <WorkspaceReferencePicker
          isOpen={true}
          referenceType={showReferencePicker.type}
          onSelect={async (item) => {
            const targetId = effectivePageId || page?.id;
            if (!targetId) return;

            try {
              // If updating existing reference unit
              if (showReferencePicker.unitId) {
                const unit = flatUnits.find(u => u.id === showReferencePicker.unitId);
                if (unit && isReferenceUnit(unit)) {
                  await updateWorkspaceUnit(showReferencePicker.unitId, {
                    content: {
                      ...unit.content,
                      reference_type: showReferencePicker.type,
                      reference_id: item.id,
                      display_text: item.title,
                    },
                  });
                  if (pageId) {
                    await loadPage();
                  } else {
                    await loadPage();
                  }
                  setShowReferencePicker(null);
                  return;
                }
              }

              // Create new reference unit
              await createWorkspaceUnit({
                page_id: targetId,
                parent_id: showReferencePicker.unitId,
                type: 'reference',
                content: {
                  reference_type: showReferencePicker.type,
                  reference_id: item.id,
                  display_text: item.title,
                },
              });

              if (pageId) {
                await loadPage();
              } else {
                await loadPage();
              }
              setShowReferencePicker(null);
            } catch (error) {
              console.error('Failed to create reference unit:', error);
              showToast('error', 'Failed to create reference');
            }
          }}
          onUrlSelect={async (url) => {
            const targetId = effectivePageId || page?.id;
            if (!targetId) return;

            try {
              // If updating existing reference unit
              if (showReferencePicker.unitId) {
                const unit = flatUnits.find(u => u.id === showReferencePicker.unitId);
                if (unit && isReferenceUnit(unit)) {
                  await updateWorkspaceUnit(showReferencePicker.unitId, {
                    content: {
                      ...unit.content,
                      reference_type: 'url',
                      reference_url: url,
                      display_text: url,
                    },
                  });
                  if (pageId) {
                    await loadPage();
                  } else {
                    await loadPage();
                  }
                  setShowReferencePicker(null);
                  return;
                }
              }

              // Create new URL reference unit
              await createWorkspaceUnit({
                page_id: targetId,
                parent_id: showReferencePicker.unitId,
                type: 'reference',
                content: {
                  reference_type: 'url',
                  reference_url: url,
                  display_text: url,
                },
              });

              if (pageId) {
                await loadPage();
              } else {
                await loadPage();
              }
              setShowReferencePicker(null);
            } catch (error) {
              console.error('Failed to create URL reference:', error);
              showToast('error', 'Failed to create reference');
            }
          }}
          onClose={() => setShowReferencePicker(null)}
        />
      )}
      
      {/* Contextual Hints */}
      <ContextualHints
        hints={contextualHints}
        onDismiss={(hintId) => {
          setContextualHints(hints => hints.filter(h => h.id !== hintId));
        }}
      />
    </DndContext>
  );
}

// Helper: Filter collapsed units from tree
function filterCollapsedUnits(units: WorkspaceUnit[], collapsed: Set<string>): WorkspaceUnit[] {
  return units.map(unit => {
    if (collapsed.has(unit.id)) {
      return { ...unit, children: [] };
    }
    if (unit.children && unit.children.length > 0) {
      return { ...unit, children: filterCollapsedUnits(unit.children, collapsed) };
    }
    return unit;
  });
}

interface WorkspaceUnitListProps {
  units: WorkspaceUnit[];
  onUpdate: (id: string, updates: Partial<WorkspaceUnit>) => void;
  onDelete: (id: string) => void;
  onAddChild: (type: WorkspaceUnitType, parentId?: string) => void;
  onConvert: (id: string, newType: WorkspaceUnitType, newContent?: any) => void | Promise<void>;
  onToggleCollapse: (id: string) => void;
  collapsedUnits: Set<string>;
  showUnitMenu: string | null;
  setShowUnitMenu: (id: string | null) => void;
  setShowReferencePicker: (picker: { unitId?: string; type: WorkspaceReferenceType } | null) => void;
  level?: number;
  savingUnits?: Set<string>;
  errorUnits?: Set<string>;
  dragOverId?: string | null;
  parseBlockPattern?: (text: string) => { type: WorkspaceUnitType; content: any; remainingText: string } | null;
  onCreateUnitAfter?: (afterUnitId: string, type: WorkspaceUnitType, content: any) => Promise<void>;
  onStructuredPaste?: (parsed: { blocks: any[]; originalText: string }, afterUnitId: string, pasteStart: number, pasteEnd: number) => Promise<void>;
  onSetActiveBlock?: (unitId: string | null) => void;
}

function WorkspaceUnitList({
  units,
  onUpdate,
  onDelete,
  onAddChild,
  onConvert,
  onToggleCollapse,
  collapsedUnits,
  showUnitMenu,
  setShowUnitMenu,
  setShowReferencePicker,
  level = 0,
  savingUnits = new Set(),
  errorUnits = new Set(),
  dragOverId = null,
  parseBlockPattern,
  onCreateUnitAfter,
  onStructuredPaste,
  onSetActiveBlock,
}: WorkspaceUnitListProps) {
  return (
    <>
      {units.map((unit) => (
        <SortableWorkspaceUnitItem
          key={unit.id}
          unit={unit}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddChild={onAddChild}
          onConvert={onConvert}
          onToggleCollapse={onToggleCollapse}
          collapsedUnits={collapsedUnits}
          showUnitMenu={showUnitMenu}
          setShowUnitMenu={setShowUnitMenu}
          setShowReferencePicker={setShowReferencePicker}
          level={level}
        isSaving={savingUnits?.has(unit.id) || false}
        hasError={errorUnits?.has(unit.id) || false}
        isDragOver={dragOverId === unit.id}
        savingUnits={savingUnits}
        errorUnits={errorUnits}
        dragOverId={dragOverId}
        parseBlockPattern={parseBlockPattern}
        onCreateUnitAfter={onCreateUnitAfter}
        onStructuredPaste={onStructuredPaste}
        onSetActiveBlock={onSetActiveBlock}
        />
      ))}
    </>
  );
}

interface SortableWorkspaceUnitItemProps {
  unit: WorkspaceUnit;
  onUpdate: (id: string, updates: Partial<WorkspaceUnit>) => void;
  onDelete: (id: string) => void;
  onAddChild: (type: WorkspaceUnitType, parentId?: string) => void;
  onConvert: (id: string, newType: WorkspaceUnitType, newContent?: any) => void | Promise<void>;
  onToggleCollapse: (id: string) => void;
  collapsedUnits: Set<string>;
  showUnitMenu: string | null;
  setShowUnitMenu: (id: string | null) => void;
  setShowReferencePicker: (picker: { unitId?: string; type: WorkspaceReferenceType } | null) => void;
  level: number;
  isSaving?: boolean;
  hasError?: boolean;
  isDragOver?: boolean;
  savingUnits?: Set<string>;
  errorUnits?: Set<string>;
  dragOverId?: string | null;
  parseBlockPattern?: (text: string) => { type: WorkspaceUnitType; content: any; remainingText: string } | null;
  onCreateUnitAfter?: (afterUnitId: string, type: WorkspaceUnitType, content: any) => Promise<void>;
  onStructuredPaste?: (parsed: { blocks: any[]; originalText: string }, afterUnitId: string, pasteStart: number, pasteEnd: number) => Promise<void>;
  onSetActiveBlock?: (unitId: string | null) => void;
}

function SortableWorkspaceUnitItem({
  unit,
  onUpdate,
  onDelete,
  onAddChild,
  onConvert,
  onToggleCollapse,
  collapsedUnits,
  showUnitMenu,
  setShowUnitMenu,
  setShowReferencePicker,
  level,
  isSaving = false,
  hasError = false,
  isDragOver = false,
  savingUnits = new Set(),
  errorUnits = new Set(),
  dragOverId = null,
  parseBlockPattern,
  onCreateUnitAfter,
  onStructuredPaste,
  onSetActiveBlock,
}: SortableWorkspaceUnitItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.4 : 1,
    scale: isDragging ? 0.95 : 1,
  };

  const isCollapsed = collapsedUnits.has(unit.id);
  const hasChildren = unit.children && unit.children.length > 0;

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        // Ensure text selection is enabled on sortable container
        // Drag only activates from drag handle, not from this container
        userSelect: 'text',
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
        msUserSelect: 'text',
      }}
      className={`relative transition-all duration-200 ${
        isDragging ? 'z-50 shadow-2xl' : ''
      }`}
      // Do NOT apply drag listeners to this container - only to drag handle
      // This ensures text selection works normally
    >
      <WorkspaceUnitItem
        unit={unit}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onAddChild={onAddChild}
        onConvert={onConvert}
        onToggleCollapse={onToggleCollapse}
        collapsedUnits={collapsedUnits}
        showUnitMenu={showUnitMenu}
        setShowUnitMenu={setShowUnitMenu}
        setShowReferencePicker={setShowReferencePicker}
        level={level}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        isSaving={isSaving}
        hasError={hasError}
        isDragOver={isDragOver}
        savingUnits={savingUnits}
        errorUnits={errorUnits}
        dragOverId={dragOverId}
        parseBlockPattern={parseBlockPattern}
        onCreateUnitAfter={onCreateUnitAfter}
        onStructuredPaste={onStructuredPaste}
        onSetActiveBlock={onSetActiveBlock}
      />
    </div>
  );
}

interface WorkspaceUnitItemProps {
  unit: WorkspaceUnit;
  onUpdate: (id: string, updates: Partial<WorkspaceUnit>) => void;
  onDelete: (id: string) => void;
  onAddChild: (type: WorkspaceUnitType, parentId?: string) => void;
  onConvert: (id: string, newType: WorkspaceUnitType, newContent?: any) => void | Promise<void>;
  onToggleCollapse: (id: string) => void;
  collapsedUnits: Set<string>;
  showUnitMenu: string | null;
  setShowUnitMenu: (id: string | null) => void;
  setShowReferencePicker: (picker: { unitId?: string; type: WorkspaceReferenceType } | null) => void;
  level: number;
  dragHandleProps?: any;
  isDragging?: boolean;
  isSaving?: boolean;
  hasError?: boolean;
  isDragOver?: boolean;
  savingUnits?: Set<string>;
  errorUnits?: Set<string>;
  dragOverId?: string | null;
  parseBlockPattern?: (text: string) => { type: WorkspaceUnitType; content: any; remainingText: string } | null;
  onCreateUnitAfter?: (afterUnitId: string, type: WorkspaceUnitType, content: any) => Promise<void>;
  onStructuredPaste?: (parsed: { blocks: any[]; originalText: string }, afterUnitId: string, pasteStart: number, pasteEnd: number) => Promise<void>;
  onSetActiveBlock?: (unitId: string | null) => void;
}

function WorkspaceUnitItem({
  unit,
  onUpdate,
  onDelete,
  onAddChild,
  onConvert,
  onToggleCollapse,
  collapsedUnits,
  showUnitMenu,
  setShowUnitMenu,
  setShowReferencePicker,
  level,
  dragHandleProps,
  isDragging,
  isSaving = false,
  hasError = false,
  isDragOver = false,
  savingUnits = new Set(),
  errorUnits = new Set(),
  dragOverId = null,
  parseBlockPattern,
  onCreateUnitAfter,
  onStructuredPaste,
  onSetActiveBlock,
}: WorkspaceUnitItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [textSelection, setTextSelection] = useState<{ text: string; start: number; end: number } | null>(null);
  const [pasteModeSelector, setPasteModeSelector] = useState<{
    position: { top: number; left: number };
    originalText: string;
    parsedBlocks: any[];
    unitId: string;
    pasteStart: number;
    pasteEnd: number;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const debouncedEditValue = useDebounce(editValue, 500);

  const isCollapsed = collapsedUnits.has(unit.id);
  const hasChildren = unit.children && unit.children.length > 0;

  useEffect(() => {
    if (isTextUnit(unit)) {
      setEditValue(unit.content.text);
    } else if (isBulletUnit(unit)) {
      setEditValue(unit.content.items.join('\n'));
    } else if (isGroupUnit(unit)) {
      setEditValue(unit.content.title || '');
    } else if (isChecklistUnit(unit)) {
      setEditValue(unit.content.items.map(item => item.text).join('\n'));
    } else if (isCalloutUnit(unit)) {
      setEditValue(unit.content.text);
    } else if (isCodeUnit(unit)) {
      setEditValue(unit.content.code);
    }
  }, [unit, isEditing, isEditingTitle]);

  // Auto-save on debounced value change
  // For text units: always editable (no isEditing check needed)
  // For other units: only save when in edit mode
  useEffect(() => {
    // Text units are always editable, so skip isEditing check
    if (!isTextUnit(unit) && !isEditing && !isEditingTitle) return;
    
    const currentValue = isTextUnit(unit) ? unit.content.text :
      isBulletUnit(unit) ? unit.content.items.join('\n') :
      isGroupUnit(unit) ? (unit.content.title || '') :
      isChecklistUnit(unit) ? unit.content.items.map(item => item.text).join('\n') :
      isCalloutUnit(unit) ? unit.content.text :
      isCodeUnit(unit) ? unit.content.code : '';
    
    // Only save if debounced value differs from saved value and matches current edit value
    if (debouncedEditValue !== currentValue && debouncedEditValue === editValue) {
      handleSaveDebounced();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedEditValue, editValue, isEditing, isEditingTitle]);

  // Helper function to detect markdown syntax in text (ChatGPT-compatible)
  const detectMarkdown = useCallback((text: string): boolean => {
    if (!text) return false;
    // Comprehensive markdown detection for ChatGPT-style content
    const markdownPatterns = [
      // Headings: # ## ### #### ##### ######
      /^#{1,6}\s+.+$/m,
      // Bold: **text** or __text__
      /\*\*[^*]+\*\*|__[^_]+__/,
      // Italic: *text* or _text_ (but not ** or __)
      /(?<!\*)\*[^*\n]+\*(?!\*)|(?<!_)_[^_\n]+_(?!_)/,
      // Inline code: `code`
      /`[^`]+`/,
      // Strikethrough: ~~text~~
      /~~[^~]+~~/,
      // Lists: - * • or numbered 1. 2. etc.
      /^[\s]*[-*•]\s+.+$/m,
      /^[\s]*\d+\.\s+.+$/m,
      // Code blocks: ```language or ```
      /```[\s\S]*?```/,
      // Block quotes: > text
      /^>\s+.+$/m,
      // Dividers: --- or ***
      /^[-*]{3,}$/m,
      // Links: [text](url)
      /\[([^\]]+)\]\(([^)]+)\)/,
    ];
    return markdownPatterns.some(pattern => pattern.test(text));
  }, []);

  const handleSaveDebounced = useCallback(() => {
    if (isTextUnit(unit)) {
      // Auto-detect markdown and set formatting accordingly
      const hasMarkdown = detectMarkdown(debouncedEditValue);
      const formatting = hasMarkdown ? 'markdown' : (unit.content.formatting || 'plain');
      
      onUpdate(unit.id, {
        content: { ...unit.content, text: debouncedEditValue, formatting: formatting as 'markdown' | 'plain' },
      });
    } else if (isBulletUnit(unit)) {
      onUpdate(unit.id, {
        content: {
          ...unit.content,
          items: debouncedEditValue.split('\n').filter(line => line.trim()),
        },
      });
    } else if (isGroupUnit(unit)) {
      onUpdate(unit.id, {
        content: { ...unit.content, title: debouncedEditValue },
      });
    } else if (isChecklistUnit(unit)) {
      // Preserve completed state when editing
      const lines = debouncedEditValue.split('\n').filter(line => line.trim());
      const existingItems = unit.content.items;
      const items = lines.map((text, idx) => {
        // Try to match with existing item to preserve completed state
        const existing = existingItems.find(item => item.text === text);
        return {
          text,
          completed: existing ? existing.completed : false,
        };
      });
      onUpdate(unit.id, {
        content: { items },
      });
    } else if (isCalloutUnit(unit)) {
      onUpdate(unit.id, {
        content: { text: debouncedEditValue, type: unit.content.type },
      });
    } else if (isCodeUnit(unit)) {
      onUpdate(unit.id, {
        content: { code: debouncedEditValue, language: unit.content.language },
      });
    }
  }, [unit, debouncedEditValue, onUpdate]);

  const handleSave = () => {
    // Auto-save will handle saving via debounced value
    // Just exit edit mode
    setIsEditing(false);
    setIsEditingTitle(false);
  };

  const handleToggleChecklistItem = (index: number) => {
    if (!isChecklistUnit(unit)) return;
    const newItems = [...unit.content.items];
    const item = newItems[index];
    newItems[index] = {
      text: item.text,
      completed: !item.completed,
    };
    onUpdate(unit.id, {
      content: { items: newItems },
    });
  };

  // Apply formatting to selected text
  const handleApplyFormat = useCallback((format: 'bold' | 'italic' | 'underline' | 'code' | 'strikethrough' | 'clear') => {
    if (!textareaRef.current || !isTextUnit(unit) || unit.content.formatting !== 'markdown') return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editValue.substring(start, end);

    if (!selectedText && format !== 'clear') return;

    let newText = editValue;
    let newStart = start;
    let newEnd = end;

    if (format === 'clear') {
      // Remove all markdown formatting from selected text
      const cleared = selectedText
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/~~(.+?)~~/g, '$1');
      newText = editValue.substring(0, start) + cleared + editValue.substring(end);
      newEnd = start + cleared.length;
    } else {
      // Apply formatting
      let formatted: string;
      switch (format) {
        case 'bold':
          formatted = `**${selectedText}**`;
          break;
        case 'italic':
          formatted = `*${selectedText}*`;
          break;
        case 'underline':
          formatted = `_${selectedText}_`;
          break;
        case 'code':
          formatted = `\`${selectedText}\``;
          break;
        case 'strikethrough':
          formatted = `~~${selectedText}~~`;
          break;
        default:
          return;
      }
      newText = editValue.substring(0, start) + formatted + editValue.substring(end);
      newEnd = start + formatted.length;
    }

    setEditValue(newText);
    
    // Restore selection after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(newStart, newEnd);
        textareaRef.current.focus();
      }
    }, 0);
  }, [unit, editValue]);

  // Track text selection
  const handleTextSelection = useCallback(() => {
    if (!textareaRef.current || !isTextUnit(unit)) {
      setTextSelection(null);
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editValue.substring(start, end);

    if (selectedText && start !== end) {
      setTextSelection({ text: selectedText, start, end });
    } else {
      setTextSelection(null);
    }
  }, [unit, editValue]);

  // Handle copy, cut, paste, select all
  const handleCopy = useCallback(() => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const selectedText = editValue.substring(textarea.selectionStart, textarea.selectionEnd);
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = selectedText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
      showToast('success', 'Copied to clipboard');
    }
  }, [editValue, showToast]);

  const handleCut = useCallback(() => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editValue.substring(start, end);
    
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = selectedText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
      
      // Remove selected text
      const newText = editValue.substring(0, start) + editValue.substring(end);
      setEditValue(newText);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(start, start);
          textareaRef.current.focus();
        }
      }, 0);
      
      showToast('success', 'Cut to clipboard');
    }
  }, [editValue, showToast]);

  const handlePaste = useCallback(async () => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    
    try {
      const text = await navigator.clipboard.readText();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = editValue.substring(0, start) + text + editValue.substring(end);
      setEditValue(newText);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(start + text.length, start + text.length);
          textareaRef.current.focus();
        }
      }, 0);
    } catch (err) {
      // Fallback: trigger native paste event
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      textarea.dispatchEvent(pasteEvent);
    }
  }, [editValue]);

  const handleSelectAll = useCallback(() => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    textarea.select();
    textarea.setSelectionRange(0, editValue.length);
    handleTextSelection();
  }, [editValue, handleTextSelection]);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    // Keyboard shortcuts: Cmd/Ctrl + A/C/X/V
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    
    if (modKey) {
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleSelectAll();
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        // Allow default copy behavior, but also track selection
        handleTextSelection();
        return;
      }
      if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        handleCut();
        return;
      }
      if (e.key === 'v' || e.key === 'V') {
        // Let the paste handler in onPaste handle it
        // This ensures smart paste rules are applied
        return;
      }
    }
    
    // Enter: Create new block or save
    if (e.key === 'Enter' && !e.shiftKey) {
      if (isTextUnit(unit) && parseBlockPattern && onCreateUnitAfter) {
        e.preventDefault();
        const text = editValue.trim();
        
        // Save current unit first
        handleSave();
        
        // Check for block patterns at the start of the line
        const lines = editValue.split('\n');
        const lastLine = lines[lines.length - 1] || '';
        const pattern = parseBlockPattern(lastLine);
        
        if (pattern) {
          // Create new block based on pattern
          await onCreateUnitAfter(unit.id, pattern.type, pattern.content);
        } else if (text) {
          // Regular text - create new text unit
          await onCreateUnitAfter(unit.id, 'text', { text: '', formatting: 'plain' as const });
        }
      } else if (isGroupUnit(unit)) {
        e.preventDefault();
        handleSave();
      }
      // Shift+Enter: new line in textareas
    } 
    // Tab: Indent (nest) or move to next field
    else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab: Outdent (unnest) - move unit to parent level
        if (unit.parent_id && onUpdate) {
          onUpdate(unit.id, {
            parent_id: undefined, // Move to root level
          });
        }
      } else {
        // Tab: Indent (nest) - find previous sibling and nest under it
        // This is a simplified implementation - in a full version, we'd need
        // access to the full unit tree to find the previous sibling
        // For now, we'll just insert tab characters in text units
        if (isTextUnit(unit) || isBulletUnit(unit) || isChecklistUnit(unit)) {
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = editValue.substring(0, start) + '  ' + editValue.substring(end);
            setEditValue(newValue);
            setTimeout(() => {
              if (textarea) {
                textarea.setSelectionRange(start + 2, end + 2);
                textarea.focus();
              }
            }, 0);
          }
        }
      }
    }
    // Escape: Cancel editing
    else if (e.key === 'Escape') {
      setIsEditing(false);
      setIsEditingTitle(false);
      // Reset to original value
      if (isTextUnit(unit)) {
        setEditValue(unit.content.text);
      } else if (isBulletUnit(unit)) {
        setEditValue(unit.content.items.join('\n'));
      } else if (isGroupUnit(unit)) {
        setEditValue(unit.content.title || '');
      } else if (isChecklistUnit(unit)) {
        setEditValue(unit.content.items.map(item => item.text).join('\n'));
      } else if (isCalloutUnit(unit)) {
        setEditValue(unit.content.text);
      } else if (isCodeUnit(unit)) {
        setEditValue(unit.content.code);
      }
    }
    // Arrow keys: Navigate between units (future enhancement)
    // Ctrl/Cmd + S: Save
    else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const indent = level * (isMobile ? 4 : 20);
  const borderLeft = level > 0 ? 'border-l-2 border-slate-200' : '';

  return (
    <div 
      data-unit-id={unit.id}
      className={`group ${borderLeft} transition-all duration-200 ${
        isDragOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''
      } ${hasError ? 'ring-2 ring-red-400' : ''}`}
      style={{ 
        marginLeft: `${indent}px`, 
        paddingLeft: level > 0 ? (isMobile ? '2px' : '12px') : '0',
        // Ensure text selection is enabled on this container
        userSelect: 'text',
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
        msUserSelect: 'text',
      }}
    >
      <div className={`flex items-start gap-1 sm:gap-2 py-1.5 sm:py-3 rounded-lg transition-all duration-200 ${
        isDragging ? 'bg-slate-100 shadow-lg scale-95' : 
        isDragOver ? 'bg-blue-50 border-2 border-blue-300' :
        hasError ? 'bg-red-50 border border-red-300' :
        'hover:bg-gray-50 active:bg-gray-100 border border-transparent'
      }`}>
        {/* Drag Handle - Only this element should trigger drag, not text content */}
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-1.5 sm:p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
          title="Drag to reorder"
          style={{
            // Disable text selection on drag handle only
            userSelect: 'none',
            WebkitUserSelect: 'none',
            // Prevent drag handle from interfering with text selection
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => {
            // Stop propagation to prevent text selection when clicking drag handle
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            // Stop propagation to prevent text selection when touching drag handle
            e.stopPropagation();
          }}
        >
          <GripVertical size={18} className="sm:w-4 sm:h-4 text-gray-400" />
        </div>

        {/* Collapse/Expand Button (for groups) */}
        {isGroupUnit(unit) && (
          <button
            onClick={() => onToggleCollapse(unit.id)}
            className="p-1.5 sm:p-1 hover:bg-gray-200 active:bg-gray-300 rounded transition-colors touch-manipulation min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronRight size={18} className="sm:w-4 sm:h-4 text-gray-500" />
            ) : (
              <ChevronDown size={18} className="sm:w-4 sm:h-4 text-gray-500" />
            )}
          </button>
        )}

        {/* Saving/Error Indicator */}
        {isSaving && (
          <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-gray-500">
            <Loader2 size={12} className="animate-spin" />
            <span className="hidden sm:inline">Saving...</span>
          </div>
        )}
        {hasError && !isSaving && (
          <div className="absolute top-2 right-2 text-xs text-red-600" title="Save failed">
            ⚠️
          </div>
        )}

        {/* Unit Content - Must allow native text selection */}
        <div 
          className="flex-1 min-w-0 w-full px-2 sm:px-0"
          style={{
            // Ensure text selection is enabled on content wrapper
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text',
          }}
        >
          {isGroupUnit(unit) ? (
            <>
              {isEditingTitle ? (
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  placeholder="Group title..."
                  className="w-full px-2 sm:px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 font-medium select-text"
                />
              ) : (
                <div
                  onClick={() => setIsEditingTitle(true)}
                  className="cursor-text px-2 py-1 rounded hover:bg-white transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 select-text">
                    {unit.content.title || <span className="text-gray-400 italic">Untitled group</span>}
                  </h3>
                  {unit.content.summary && (
                    <p className="text-sm text-gray-600 mt-1">{unit.content.summary}</p>
                  )}
                </div>
              )}
            </>
          ) : isEditing ? (
            <div className="space-y-2">
              {isTextUnit(unit) && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <button
                    onClick={() => {
                      onUpdate(unit.id, {
                        content: {
                          ...unit.content,
                          formatting: unit.content.formatting === 'markdown' ? 'plain' : 'markdown',
                        },
                      });
                    }}
                    className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    {unit.content.formatting === 'markdown' ? 'Markdown' : 'Plain Text'}
                  </button>
                  {unit.content.formatting === 'markdown' && (
                    <span className="text-gray-400">Supports **bold**, *italic*, `code`, [links](url), headers, lists</span>
                  )}
                </div>
              )}
              {isCodeUnit(unit) && (
                <select
                  value={unit.content.language || ''}
                  onChange={(e) => {
                    onUpdate(unit.id, {
                      content: { ...unit.content, language: e.target.value },
                    });
                  }}
                  className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Plain Text</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="json">JSON</option>
                  <option value="sql">SQL</option>
                  <option value="bash">Bash</option>
                </select>
              )}
              <textarea
                ref={textareaRef}
                value={editValue}
                onFocus={() => {
                  // Track active block for cursor-position insertion
                  if (onSetActiveBlock) {
                    onSetActiveBlock(unit.id);
                  }
                }}
                onBlur={(e) => {
                  // Save on blur
                  handleSave();
                  
                  // Clear active block after a short delay (allows clicking buttons)
                  setTimeout(() => {
                    if (onSetActiveBlock) {
                      // Only clear if focus didn't move to another unit
                      const activeElement = document.activeElement;
                      if (!activeElement || !activeElement.closest(`[data-unit-id]`)) {
                        onSetActiveBlock(null);
                      }
                    }
                  }, 200);
                }}
                onChange={async (e) => {
                  const newValue = e.target.value;
                  setEditValue(newValue);
                  handleTextSelection();
                  
                  // INLINE MARKDOWN TRANSFORMATION: Detect patterns and transform blocks
                  // This makes markdown work like Notion - typing ## Heading transforms the block
                  if (isTextUnit(unit) && parseBlockPattern && onConvert) {
                    const lines = newValue.split('\n');
                    const lastLine = lines[lines.length - 1] || '';
                    
                    // Check if the last line matches a block pattern (e.g., ## Heading, - item)
                    // Only transform if the line ends with a space (user just typed space after pattern)
                    if (lastLine.endsWith(' ')) {
                      const trimmed = lastLine.trim();
                      const pattern = parseBlockPattern(trimmed);
                      
                      if (pattern) {
                        // Transform the block type
                        const remainingText = lines.slice(0, -1).join('\n');
                        const patternContent = pattern.content;
                        
                        // Prepare content for the new block type
                        let newContent: any;
                        if (pattern.type === 'group') {
                          // For headings, extract the title
                          const title = typeof patternContent === 'object' && patternContent && 'title' in patternContent 
                            ? patternContent.title || trimmed.replace(/^#+\s*/, '')
                            : trimmed.replace(/^#+\s*/, '');
                          newContent = { title, summary: remainingText || undefined };
                        } else if (pattern.type === 'bullet') {
                          const items = typeof patternContent === 'object' && patternContent && 'items' in patternContent
                            ? patternContent.items
                            : [trimmed.replace(/^[-*]\s*/, '')];
                          newContent = { items, ordered: false };
                        } else if (pattern.type === 'checklist') {
                          const items = typeof patternContent === 'object' && patternContent && 'items' in patternContent
                            ? patternContent.items.map((text: string) => ({ text, completed: false }))
                            : [{ text: trimmed.replace(/^\[\s*\]\s*/, ''), completed: false }];
                          newContent = { items };
                        } else if (pattern.type === 'divider') {
                          newContent = { style: 'solid' as const };
                        } else if (pattern.type === 'code') {
                          const code = typeof patternContent === 'object' && patternContent && 'code' in patternContent
                            ? patternContent.code
                            : remainingText || trimmed.replace(/^```\w*\s*/, '');
                          newContent = { code, language: undefined };
                        } else {
                          // For other types, keep as text but update content
                          await onUpdate(unit.id, {
                            content: { ...unit.content, text: remainingText || trimmed },
                          });
                          return; // Exit early - no conversion needed
                        }
                        
                        // Convert the block
                        await onConvert(unit.id, pattern.type, newContent);
                        
                        // Clear the input to prevent duplicate content
                        setEditValue(remainingText);
                      }
                    }
                  }
                }}
                onSelect={handleTextSelection}
                onMouseUp={handleTextSelection}
                onTouchEnd={() => {
                  // Track selection after native touch selection completes
                  // Don't interfere with native selection - just track it for formatting toolbar
                  setTimeout(() => {
                    handleTextSelection();
                  }, 100);
                }}
                // Removed custom onTouchStart handler - let browser handle native long-press selection
                onPaste={async (e) => {
                  // Smart Paste Rules Engine
                  e.preventDefault();
                  
                  const pastedText = e.clipboardData.getData('text/plain');
                  const pastedHtml = e.clipboardData.getData('text/html');
                  
                  // Normalize HTML paste to plain text (preserve markdown semantics)
                  let cleanedText = pastedText;
                  if (pastedHtml && pastedHtml.length > 0) {
                    // Create a temporary DOM element to parse HTML
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = pastedHtml;
                    
                    // Convert HTML to plain text while preserving structure
                    // This handles styled HTML from ChatGPT/other sources
                    cleanedText = tempDiv.innerText || tempDiv.textContent || pastedText;
                    
                    // Clean up any remaining HTML entities
                    cleanedText = cleanedText
                      .replace(/&nbsp;/g, ' ')
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'")
                      .replace(/&apos;/g, "'");
                  }
                  
                  const textarea = textareaRef.current;
                  if (!textarea) return;
                  
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  
                  // Parse the pasted text
                  const parsed = parsePastedText(cleanedText);
                  
                  // Check if content has clear Markdown structure (ChatGPT-compatible)
                  const hasMarkdownStructure = parsed.blocks.some(block => 
                    block.type === 'heading' || 
                    block.type === 'code' || 
                    block.type === 'list' || 
                    block.type === 'callout' || 
                    block.type === 'quote' ||
                    block.type === 'divider' ||
                    block.hasInlineFormatting
                  );
                  
                  // Also check for markdown using comprehensive detection
                  const hasMarkdown = detectMarkdown(cleanedText);
                  
                  // If markdown is detected, ALWAYS convert to structured blocks
                  // This ensures markdown symbols are never visible in view mode
                  // Priority: If ANY markdown structure is detected, convert immediately
                  if (hasMarkdownStructure && onStructuredPaste) {
                    // Auto-convert markdown to structured blocks
                    // This creates proper units (headings, lists, etc.) instead of text with markdown
                    await onStructuredPaste(parsed, unit.id, start, end);
                    return; // Exit early - paste is handled
                  } else if (hasMarkdown && parsed.blocks.length > 0 && onStructuredPaste) {
                    // Even if structure isn't clear, if markdown is detected, convert to structured blocks
                    // This handles cases like single heading or single list
                    await onStructuredPaste(parsed, unit.id, start, end);
                    return; // Exit early - paste is handled
                  } else if (parsed.blocks.length > 1 || parsed.confidence !== 'low') {
                    // Multiple blocks but no clear markdown - show paste mode selector
                    const rect = textarea.getBoundingClientRect();
                    setPasteModeSelector({
                      position: {
                        top: rect.top + (start === end ? rect.height / 2 : 0),
                        left: rect.left + 10,
                      },
                      originalText: cleanedText,
                      parsedBlocks: parsed.blocks,
                      unitId: unit.id,
                      pasteStart: start,
                      pasteEnd: end,
                    });
                  } else {
                    // Single block, no markdown - paste as plain text
                    const newValue = editValue.substring(0, start) + cleanedText + editValue.substring(end);
                    setEditValue(newValue);
                    
                    // Only set markdown formatting if detected (but don't create structured blocks)
                    if (hasMarkdown && isTextUnit(unit)) {
                      onUpdate(unit.id, {
                        content: { ...unit.content, text: newValue, formatting: 'markdown' as const },
                      });
                    } else if (isTextUnit(unit) && unit.content.formatting === 'markdown') {
                      // Preserve existing markdown formatting
                      onUpdate(unit.id, {
                        content: { ...unit.content, text: newValue },
                      });
                    }
                    
                    setTimeout(() => {
                      if (textarea) {
                        textarea.setSelectionRange(start + cleanedText.length, start + cleanedText.length);
                        textarea.focus();
                      }
                    }, 0);
                  }
                }}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-full px-2 sm:px-2 py-2 sm:py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none font-mono text-base sm:text-sm select-text"
                style={{
                  // Enable full native text selection on mobile and desktop
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                  WebkitTouchCallout: 'default',
                  // Allow native text selection gestures - don't use touch-manipulation on textareas
                  touchAction: 'auto', // Changed from 'manipulation' to allow native selection
                  MozUserSelect: 'text',
                  msUserSelect: 'text',
                  // Ensure textarea allows all native selection behaviors
                  pointerEvents: 'auto',
                }}
                rows={
                  isBulletUnit(unit) ? Math.max(3, unit.content.items.length + 1) :
                  isChecklistUnit(unit) ? Math.max(3, unit.content.items.length + 1) :
                  isCodeUnit(unit) ? 10 :
                  3
                }
                placeholder={
                  isCodeUnit(unit) ? 'Enter code...' :
                  isCalloutUnit(unit) ? 'Enter callout text...' :
                  isChecklistUnit(unit) ? 'Enter items, one per line...' :
                  'Start writing...'
                }
              />
              {/* Formatting Toolbar */}
              {isTextUnit(unit) && textSelection && (
                <FormattingToolbar
                  selection={textSelection}
                  onFormat={handleApplyFormat}
                  onCopy={handleCopy}
                  onCut={handleCut}
                  onPaste={handlePaste}
                  onSelectAll={handleSelectAll}
                  onClose={() => setTextSelection(null)}
                  isMobile={isMobile}
                />
              )}
              
              {/* Paste Mode Selector */}
              {pasteModeSelector && pasteModeSelector.unitId === unit.id && (
                <PasteModeSelector
                  position={pasteModeSelector.position}
                  onSelect={async (mode) => {
                    savePreferredPasteMode(mode);
                    
                    if (mode === 'structured' && pasteModeSelector.parsedBlocks.length > 1 && onStructuredPaste) {
                      const parsed = {
                        blocks: pasteModeSelector.parsedBlocks,
                        originalText: pasteModeSelector.originalText,
                      };
                      await onStructuredPaste(
                        parsed,
                        pasteModeSelector.unitId,
                        pasteModeSelector.pasteStart,
                        pasteModeSelector.pasteEnd
                      );
                    } else if (mode === 'formatted') {
                      // Formatted mode - preserve markdown, detect and set formatting
                      const cleaned = pasteModeSelector.originalText
                        .replace(/<[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&apos;/g, "'");
                      const textarea = textareaRef.current;
                      if (textarea) {
                        const newValue = editValue.substring(0, pasteModeSelector.pasteStart) + 
                                       cleaned + 
                                       editValue.substring(pasteModeSelector.pasteEnd);
                        setEditValue(newValue);
                        
                        // Auto-detect markdown in formatted paste
                        const hasMarkdown = detectMarkdown(cleaned);
                        if (hasMarkdown && isTextUnit(unit)) {
                          onUpdate(unit.id, {
                            content: { ...unit.content, text: newValue, formatting: 'markdown' as const },
                          });
                        }
                        
                        setTimeout(() => {
                          if (textarea) {
                            textarea.setSelectionRange(
                              pasteModeSelector.pasteStart + cleaned.length,
                              pasteModeSelector.pasteStart + cleaned.length
                            );
                            textarea.focus();
                          }
                        }, 0);
                      }
                    } else {
                      // Plain text - clean and paste (strip markdown if desired, but preserve text)
                      const cleaned = pasteModeSelector.originalText
                        .replace(/<[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&apos;/g, "'");
                      const textarea = textareaRef.current;
                      if (textarea) {
                        const newValue = editValue.substring(0, pasteModeSelector.pasteStart) + 
                                       cleaned + 
                                       editValue.substring(pasteModeSelector.pasteEnd);
                        setEditValue(newValue);
                        
                        // For plain text, don't auto-detect markdown (user explicitly chose plain)
                        // But if unit is already markdown, preserve that state
                        if (isTextUnit(unit) && unit.content.formatting === 'markdown') {
                          // Keep markdown formatting if unit was already markdown
                          onUpdate(unit.id, {
                            content: { ...unit.content, text: newValue },
                          });
                        }
                        
                        setTimeout(() => {
                          if (textarea) {
                            textarea.setSelectionRange(
                              pasteModeSelector.pasteStart + cleaned.length,
                              pasteModeSelector.pasteStart + cleaned.length
                            );
                            textarea.focus();
                          }
                        }, 0);
                      }
                    }
                    
                    setPasteModeSelector(null);
                  }}
                  onRevert={() => {
                    // Revert to original state (no paste applied)
                    setPasteModeSelector(null);
                  }}
                  onClose={() => setPasteModeSelector(null)}
                />
              )}
            </div>
          ) : (
            <div
              onClick={() => !isDividerUnit(unit) && setIsEditing(true)}
              className={`px-0 sm:px-2 py-1 rounded transition-colors ${isDividerUnit(unit) ? '' : 'cursor-text hover:bg-white'}`}
            >
              {isTextUnit(unit) ? (
                // NOTION-STYLE: Always contentEditable, never static text
                // For markdown, we'll render as plain text in contentEditable (markdown symbols visible while editing)
                <div
                  ref={contentEditableRef}
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck
                  onInput={(e) => {
                    const newText = e.currentTarget.textContent || '';
                    setEditValue(newText);
                    // Auto-save will handle via debouncedEditValue
                  }}
                  onBlur={() => {
                    handleSave();
                  }}
                  onFocus={() => {
                    if (onSetActiveBlock) {
                      onSetActiveBlock(unit.id);
                    }
                  }}
                  onPaste={(e) => {
                    // Let native paste work, then handle smart paste
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData('text/plain');
                    const selection = window.getSelection();
                    if (!selection || selection.rangeCount === 0) return;
                    
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    const textNode = document.createTextNode(pastedText);
                    range.insertNode(textNode);
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    // Trigger input event for auto-save
                    const inputEvent = new Event('input', { bubbles: true });
                    e.currentTarget.dispatchEvent(inputEvent);
                  }}
                  className="outline-none whitespace-pre-wrap text-gray-700 text-sm sm:text-base leading-relaxed w-full min-h-[1.5em]"
                  style={{
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    MozUserSelect: 'text',
                    msUserSelect: 'text',
                    WebkitTouchCallout: 'default',
                    touchAction: 'auto',
                  }}
                  data-placeholder={unit.content.text ? '' : 'Start writing...'}
                >
                  {unit.content.text || ''}
                </div>
              ) : isBulletUnit(unit) ? (
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm sm:text-base w-full select-text">
                  {unit.content.items.length > 0 ? (
                    unit.content.items.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))
                  ) : (
                    <li className="text-gray-400 italic">Click to add items...</li>
                  )}
                </ul>
              ) : isChecklistUnit(unit) ? (
                <div className="space-y-2">
                  {unit.content.items.length > 0 ? (
                    unit.content.items.map((item, idx) => (
                      <label key={idx} className="flex items-start gap-2.5 sm:gap-2 cursor-pointer group touch-manipulation min-h-[44px] sm:min-h-0 py-1">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleChecklistItem(idx)}
                          className="mt-1 w-5 h-5 sm:w-4 sm:h-4 text-slate-600 border-gray-300 rounded focus:ring-slate-500 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={`flex-1 text-sm sm:text-base leading-relaxed select-text ${item.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                          {item.text}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-gray-400 italic text-sm sm:text-base">Click to add items...</p>
                  )}
                </div>
              ) : isCalloutUnit(unit) ? (
                <div className={`w-full p-3 rounded-lg border-l-4 select-text ${
                  unit.content.type === 'info' ? 'bg-blue-50 border-blue-500 text-blue-900' :
                  unit.content.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-900' :
                  unit.content.type === 'success' ? 'bg-green-50 border-green-500 text-green-900' :
                  'bg-red-50 border-red-500 text-red-900'
                }`}>
                  <div className="flex items-start gap-2">
                    {unit.content.type === 'info' && <Info size={18} className="flex-shrink-0 mt-0.5" />}
                    {unit.content.type === 'warning' && <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />}
                    {unit.content.type === 'success' && <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />}
                    {unit.content.type === 'error' && <XCircle size={18} className="flex-shrink-0 mt-0.5" />}
                    <p className="flex-1">
                      {unit.content.text || <span className="opacity-60 italic">Click to add callout text...</span>}
                    </p>
                  </div>
                </div>
              ) : isCodeUnit(unit) ? (
                <div className="w-full bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto select-text">
                  {unit.content.language && (
                    <div className="text-xs text-gray-400 mb-2 uppercase">{unit.content.language}</div>
                  )}
                  <pre className="text-sm font-mono">
                    <code>{unit.content.code || <span className="text-gray-500 italic">Click to add code...</span>}</code>
                  </pre>
                </div>
              ) : isDividerUnit(unit) ? (
                <div className={`w-full my-2 ${
                  unit.content.style === 'dashed' ? 'border-t-2 border-dashed border-gray-300' :
                  unit.content.style === 'dotted' ? 'border-t-2 border-dotted border-gray-300' :
                  'border-t-2 border-solid border-gray-300'
                }`}></div>
              ) : isReferenceUnit(unit) ? (
                <WorkspaceReferencePreview
                  content={unit.content}
                  onNavigate={() => setShowUnitMenu(null)}
                />
              ) : null}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 opacity-100 sm:opacity-0 transition-opacity">
          <div className="relative">
            <button
              onClick={() => setShowUnitMenu(showUnitMenu === unit.id ? null : unit.id)}
              className="p-1.5 sm:p-1 hover:bg-gray-200 active:bg-gray-300 rounded touch-manipulation min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              title="More options"
            >
              <MoreVertical size={18} className="sm:w-3.5 sm:h-3.5 text-gray-600" />
            </button>
            {showUnitMenu === unit.id && (
              <>
                <div 
                  className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                  onClick={() => setShowUnitMenu(null)}
                />
                <div className="fixed sm:absolute right-2 sm:right-0 top-auto sm:top-8 bottom-16 sm:bottom-auto bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[200px] sm:min-w-[180px] max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
                {isTextUnit(unit) && (
                  <>
                    <button
                      onClick={() => {
                        onUpdate(unit.id, {
                          content: {
                            ...unit.content,
                            formatting: unit.content.formatting === 'markdown' ? 'plain' : 'markdown',
                          },
                        });
                        setShowUnitMenu(null);
                      }}
                      className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 touch-manipulation min-h-[44px] sm:min-h-0"
                    >
                      <FileText size={16} className="sm:w-3.5 sm:h-3.5" />
                      {unit.content.formatting === 'markdown' ? 'Switch to Plain Text' : 'Switch to Markdown'}
                    </button>
                    <button
                      onClick={() => onConvert(unit.id, 'bullet')}
                      className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 touch-manipulation min-h-[44px] sm:min-h-0"
                    >
                      <List size={16} className="sm:w-3.5 sm:h-3.5" />
                      Convert to List
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                  </>
                )}
                {isBulletUnit(unit) && (
                  <>
                    <button
                      onClick={() => onConvert(unit.id, 'text')}
                      className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 touch-manipulation min-h-[44px] sm:min-h-0"
                    >
                      <Type size={16} className="sm:w-3.5 sm:h-3.5" />
                      Convert to Text
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                  </>
                )}
                {isCalloutUnit(unit) && (
                  <>
                    <div className="px-4 py-2 sm:px-3 sm:py-2 text-xs font-semibold text-gray-500 uppercase">Callout Type</div>
                    {(['info', 'warning', 'success', 'error'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          onUpdate(unit.id, {
                            content: { ...unit.content, type },
                          });
                          setShowUnitMenu(null);
                        }}
                        className={`w-full text-left px-4 py-3 sm:px-3 sm:py-2 text-sm hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 touch-manipulation min-h-[44px] sm:min-h-0 ${
                          unit.content.type === type ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {type === 'info' && <Info size={16} className="sm:w-3.5 sm:h-3.5" />}
                        {type === 'warning' && <AlertTriangle size={16} className="sm:w-3.5 sm:h-3.5" />}
                        {type === 'success' && <CheckCircle2 size={16} className="sm:w-3.5 sm:h-3.5" />}
                        {type === 'error' && <XCircle size={16} className="sm:w-3.5 sm:h-3.5" />}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                    <div className="border-t border-gray-200 my-1"></div>
                  </>
                )}
                {isCodeUnit(unit) && (
                  <>
                    <div className="px-4 py-2 sm:px-3 sm:py-2 text-xs font-semibold text-gray-500 uppercase">Language</div>
                    {(['javascript', 'typescript', 'python', 'html', 'css', 'json', 'sql', 'bash'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          onUpdate(unit.id, {
                            content: { ...unit.content, language: lang },
                          });
                          setShowUnitMenu(null);
                        }}
                        className={`w-full text-left px-4 py-3 sm:px-3 sm:py-2 text-sm hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 touch-manipulation min-h-[44px] sm:min-h-0 ${
                          unit.content.language === lang ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <Code size={16} className="sm:w-3.5 sm:h-3.5" />
                        {lang}
                      </button>
                    ))}
                    <div className="border-t border-gray-200 my-1"></div>
                  </>
                )}
                {isDividerUnit(unit) && (
                  <>
                    <div className="px-4 py-2 sm:px-3 sm:py-2 text-xs font-semibold text-gray-500 uppercase">Style</div>
                    {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => {
                          onUpdate(unit.id, {
                            content: { style },
                          });
                          setShowUnitMenu(null);
                        }}
                        className={`w-full text-left px-4 py-3 sm:px-3 sm:py-2 text-sm hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 touch-manipulation min-h-[44px] sm:min-h-0 ${
                          unit.content.style === style ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <Minus size={16} className="sm:w-3.5 sm:h-3.5" />
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                    <div className="border-t border-gray-200 my-1"></div>
                  </>
                )}
                {isReferenceUnit(unit) && (
                  <>
                    <button
                      onClick={() => {
                        setShowReferencePicker({ unitId: unit.id, type: unit.content.reference_type });
                        setShowUnitMenu(null);
                      }}
                      className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 touch-manipulation min-h-[44px] sm:min-h-0"
                    >
                      <LinkIcon size={16} className="sm:w-3.5 sm:h-3.5" />
                      Change Reference
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                  </>
                )}
                {(isGroupUnit(unit) || isTextUnit(unit) || isBulletUnit(unit) || isChecklistUnit(unit)) && (
                  <>
                    {/* Text blocks are implicit - removed "Add Text Child" option */}
                    <button
                      onClick={() => onAddChild('bullet', unit.id)}
                      className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 touch-manipulation min-h-[44px] sm:min-h-0"
                    >
                      <Plus size={16} className="sm:w-3.5 sm:h-3.5" />
                      Add List Child
                    </button>
                    <button
                      onClick={() => onAddChild('checklist', unit.id)}
                      className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-2 touch-manipulation min-h-[44px] sm:min-h-0"
                    >
                      <Plus size={16} className="sm:w-3.5 sm:h-3.5" />
                      Add Checklist Child
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                  </>
                )}
                <button
                  onClick={() => {
                    onDelete(unit.id);
                    setShowUnitMenu(null);
                  }}
                  className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center gap-2 touch-manipulation min-h-[44px] sm:min-h-0"
                >
                  <X size={16} className="sm:w-3.5 sm:h-3.5" />
                  Delete
                </button>
              </div>
                </>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div className="mt-1 ml-2 sm:ml-4 animate-fade-in">
          <SortableContext items={unit.children!.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <WorkspaceUnitList
              units={unit.children!}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onConvert={onConvert}
              onToggleCollapse={onToggleCollapse}
              collapsedUnits={collapsedUnits}
              showUnitMenu={showUnitMenu}
              setShowUnitMenu={setShowUnitMenu}
              setShowReferencePicker={setShowReferencePicker}
              level={level + 1}
              savingUnits={savingUnits || new Set()}
              errorUnits={errorUnits || new Set()}
              dragOverId={dragOverId || null}
            />
          </SortableContext>
        </div>
      )}
    </div>
  );
}
