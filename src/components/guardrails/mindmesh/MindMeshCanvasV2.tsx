/**
 * Mind Mesh V2 Canvas - Minimal UI Integration
 *
 * Responsibilities:
 * - Render containers at (x, y) positions from backend
 * - Render nodes as straight lines
 * - Handle drag to move containers
 * - Handle click to activate ghosts
 * - No local mutations
 * - Backend is single source of truth
 *
 * Rules:
 * - No optimistic updates
 * - No caching
 * - No layout logic
 * - Truthful rendering only
 *
 * Updated: 2024-12-17 - Fixed callback dependency order
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMindMesh } from '../../../hooks/useMindMesh';
import type { MindMeshContainer, MindMeshIntent, MindMeshNode } from '../../../hooks/useMindMesh';
import { Loader2, AlertCircle, ChevronDown, ChevronUp, CreditCard as Edit2, Trash2, Link, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { LockStatusBar } from './LockStatusBar';
import { MindMeshToolbar } from './MindMeshToolbar';
import { CanvasHelpPanel } from './CanvasHelpPanel';
import { EmptyCanvasGuide } from './EmptyCanvasGuide';
import { GhostExplainer } from './GhostExplainer';
import { LockedCanvasGuide } from './LockedCanvasGuide';
import { ContainerHoverPreview } from './ContainerHoverPreview';
import { ContainerInspector } from './ContainerInspector';
import { NodeHoverPreview } from './NodeHoverPreview';
import { NodeInspector } from './NodeInspector';
import { RelationshipTypeSelector } from './RelationshipTypeSelector';
import { EditContainerModal } from './EditContainerModal';
import { TrackNamePrompt } from './TrackNamePrompt';
import { InlineContainerEditor } from './InlineContainerEditor';
import { TaskStatusToggle } from './TaskStatusToggle';
import { EventDateDisplay } from './EventDateDisplay';
import { ContainerPort } from './ContainerPort';
import { ConfirmDialog } from '../../ConfirmDialog';
import { fetchContainerMetadata, type ContainerMetadata } from '../../../lib/mindmesh-v2/containerMetadata';
import {
  createNodeMetadata,
  getRelationshipVisualStyle,
  type NodeMetadata,
} from '../../../lib/mindmesh-v2/nodeMetadata';
import type { RelationshipType } from '../../../lib/mindmesh-v2/types';
import { supabase } from '../../../lib/supabase';
import {
  deriveTaskStatus,
  deriveEventStatus,
  getTaskStatusDisplay,
  getEventStatusDisplay,
} from '../../../lib/taskEventViewModel';
import {
  inferContainerType,
  getVisualTreatment,
  showsStatusBadge,
  canHavePorts,
  getPortDefinitions,
  getDynamicPortDefinitions,
  getAvailablePortsForTarget,
  type ContainerType,
  type PortType,
  type ContainerPosition,
  type ConnectionData,
} from '../../../lib/mindmesh-v2/containerCapabilities';
import {
  createDefaultVisibilityState,
  filterVisibleContainers,
  filterVisibleNodes,
  toggleTrackCollapse,
  setGlobalSubtracksVisibility,
  isTrackCollapsed,
  stateToViewMode,
  countHiddenContainers,
  type HierarchyVisibilityState,
  type HierarchyViewMode,
} from '../../../lib/mindmesh-v2/visibility';

interface MindMeshCanvasV2Props {
  workspaceId: string;
}

export function MindMeshCanvasV2({ workspaceId }: MindMeshCanvasV2Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { graphState, loading, error, reconciliationError, executeIntent, rollback, fetchGraph } = useMindMesh(workspaceId);
  const [draggingContainer, setDraggingContainer] = useState<{
    id: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    currentX?: number;
    currentY?: number;
  } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [dismissedEmptyGuide, setDismissedEmptyGuide] = useState(false);
  const [dismissedGhostExplainer, setDismissedGhostExplainer] = useState(false);
  const [dismissedLockedGuide, setDismissedLockedGuide] = useState(false);
  const [viewport, setViewport] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const [panningCanvas, setPanningCanvas] = useState<{ startX: number; startY: number; startTranslateX: number; startTranslateY: number } | null>(null);
  const [hoveredContainer, setHoveredContainer] = useState<MindMeshContainer | null>(null);
  const [hoveredMetadata, setHoveredMetadata] = useState<ContainerMetadata | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<MindMeshContainer | null>(null);
  const [resizingContainer, setResizingContainer] = useState<{
    id: string;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
    currentWidth?: number;
    currentHeight?: number;
  } | null>(null);
  const [selectedMetadata, setSelectedMetadata] = useState<ContainerMetadata | null>(null);
  const [clickStart, setClickStart] = useState<{ x: number; y: number; time: number; containerId?: string } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<MindMeshNode | null>(null);
  const [hoveredNodeMetadata, setHoveredNodeMetadata] = useState<NodeMetadata | null>(null);
  const [hoveredNodePosition, setHoveredNodePosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<MindMeshNode | null>(null);
  const [selectedNodeMetadata, setSelectedNodeMetadata] = useState<NodeMetadata | null>(null);
  const [relationshipCreationMode, setRelationshipCreationMode] = useState(false);
  const [relationshipSource, setRelationshipSource] = useState<MindMeshContainer | null>(null);
  const [relationshipTarget, setRelationshipTarget] = useState<MindMeshContainer | null>(null);
  const [relationshipGhostLine, setRelationshipGhostLine] = useState<{ x: number; y: number } | null>(null);
  const [showRelationshipTypeSelector, setShowRelationshipTypeSelector] = useState(false);
  const [relationshipTypeSelectorPosition, setRelationshipTypeSelectorPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [portConnectionSource, setPortConnectionSource] = useState<{ containerId: string; portType: PortType; portId: string } | null>(null);
  const [portConnectionError, setPortConnectionError] = useState<string | null>(null);
  const [portConnectionPreview, setPortConnectionPreview] = useState<{ x: number; y: number } | null>(null);
  const [containerCreationMode, setContainerCreationMode] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [trackCreationMode, setTrackCreationMode] = useState(false);
  const [trackCreationPosition, setTrackCreationPosition] = useState<{ x: number; y: number } | null>(null);
  const [showTrackNamePrompt, setShowTrackNamePrompt] = useState(false);
  const [trackCreationError, setTrackCreationError] = useState<string | null>(null);
  const [subtrackCreationMode, setSubtrackCreationMode] = useState(false);
  const [subtrackParent, setSubtrackParent] = useState<MindMeshContainer | null>(null);
  const [subtrackCreationPosition, setSubtrackCreationPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSubtrackNamePrompt, setShowSubtrackNamePrompt] = useState(false);
  const [subtrackCreationError, setSubtrackCreationError] = useState<string | null>(null);
  const [collapsedContainers, setCollapsedContainers] = useState<Set<string>>(new Set());
  const [editingContainer, setEditingContainer] = useState<MindMeshContainer | null>(null);
  const [roadmapItemsData, setRoadmapItemsData] = useState<Map<string, any>>(new Map());
  const [deleteContainerId, setDeleteContainerId] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [hierarchyVisibility, setHierarchyVisibility] = useState<HierarchyVisibilityState>(
    createDefaultVisibilityState()
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const backgroundClickStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const lock = graphState?.lock || null;
  const isLockHolder = lock && user && lock.user_id === user.id;
  const isLockExpired = lock && new Date(lock.expires_at) < new Date();
  const canEdit = !lock || isLockExpired || isLockHolder;

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return { x: screenX, y: screenY };

    const x = (screenX - canvasRect.left - viewport.translateX) / viewport.scale;
    const y = (screenY - canvasRect.top - viewport.translateY) / viewport.scale;
    return { x, y };
  }, [viewport]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.1, viewport.scale + delta), 3);

    if (newScale === viewport.scale) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    const scaleFactor = newScale / viewport.scale;
    const newTranslateX = mouseX - (mouseX - viewport.translateX) * scaleFactor;
    const newTranslateY = mouseY - (mouseY - viewport.translateY) * scaleFactor;

    setViewport({
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY,
    });
  }, [viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Handle container resize with global mouse listeners
  useEffect(() => {
    if (!resizingContainer) return;

    let lastWidth = resizingContainer.startWidth;
    let lastHeight = resizingContainer.startHeight;

    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizingContainer.startX;
      const deltaY = e.clientY - resizingContainer.startY;
      lastWidth = Math.max(150, resizingContainer.startWidth + deltaX / viewport.scale);
      lastHeight = Math.max(100, resizingContainer.startHeight + deltaY / viewport.scale);

      // Update state for real-time visual feedback
      setResizingContainer(prev => prev ? {
        ...prev,
        currentWidth: lastWidth,
        currentHeight: lastHeight,
      } : null);
    };

    const handleResizeEnd = async () => {
      const intent: MindMeshIntent = {
        type: 'ResizeContainer',
        containerId: resizingContainer.id,
        newDimensions: {
          width: lastWidth,
          height: lastHeight,
        },
      };

      setResizingContainer(null);
      setExecuting(true);

      try {
        await executeIntent(intent);
      } catch (err) {
        console.error('Resize failed:', err);
        setLockError('Failed to resize container. Please try again.');
        setTimeout(() => setLockError(null), 3000);
      } finally {
        setExecuting(false);
      }
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [resizingContainer, viewport.scale, executeIntent]);

  const handleCanvasPanStart = useCallback((e: React.MouseEvent) => {
    // Don't start panning in container creation mode
    if (containerCreationMode) {
      return;
    }

    // Deselect container when clicking on canvas background
    setSelectedContainer(null);

    setPanningCanvas({
      startX: e.clientX,
      startY: e.clientY,
      startTranslateX: viewport.translateX,
      startTranslateY: viewport.translateY,
    });
  }, [viewport, containerCreationMode]);

  const handleCanvasPanMove = useCallback((e: React.MouseEvent) => {
    if (!panningCanvas) return;

    const dx = e.clientX - panningCanvas.startX;
    const dy = e.clientY - panningCanvas.startY;

    setViewport({
      ...viewport,
      translateX: panningCanvas.startTranslateX + dx,
      translateY: panningCanvas.startTranslateY + dy,
    });
  }, [panningCanvas, viewport]);

  const handleCanvasPanEnd = useCallback(() => {
    setPanningCanvas(null);
  }, []);

  const handleToggleRelationshipMode = useCallback(() => {
    setRelationshipCreationMode(prev => !prev);
    setRelationshipSource(null);
    setRelationshipTarget(null);
    setRelationshipGhostLine(null);
    setShowRelationshipTypeSelector(false);
    setPortConnectionSource(null);
    setPortConnectionPreview(null);
    setPortConnectionError(null);
  }, []);

  const handlePortClick = useCallback(async (containerId: string, portType: PortType, portId: string) => {
    console.log('[Port Click]', { containerId, portType, portId, hasSource: !!portConnectionSource, relationshipCreationMode });

    if (!relationshipCreationMode) {
      console.warn('[Port Click] Not in relationship creation mode');
      return;
    }
    if (!graphState) {
      console.warn('[Port Click] No graph state');
      return;
    }

    // If no source set, this is the source port
    if (!portConnectionSource) {
      // Source must be an output port
      if (portType !== 'output') {
        const msg = 'Connection must start from an output port (right side)';
        console.warn('[Port Click]', msg);
        setPortConnectionError(msg);
        setTimeout(() => setPortConnectionError(null), 3000);
        return;
      }

      console.log('[Port Click] Set as source port');
      setPortConnectionSource({ containerId, portType, portId });
      setPortConnectionError(null);
      return;
    }

    // If source is set, this is the target port
    let sourceContainerId = portConnectionSource.containerId;
    let sourcePortId = portConnectionSource.portId;
    let sourcePortType = portConnectionSource.portType;
    let targetContainerId = containerId;
    let targetPortId = portId;
    let targetPortType = portType;

    // Validate connection
    if (sourceContainerId === targetContainerId) {
      const msg = 'Cannot connect a container to itself';
      console.warn('[Port Click]', msg);
      setPortConnectionError(msg);
      setTimeout(() => setPortConnectionError(null), 3000);
      return;
    }

    // If source is an input port, we need to swap source and target
    // Connections always go from output to input
    if (sourcePortType === 'input') {
      if (targetPortType !== 'output') {
        const msg = 'When starting from an input port, must end at an output port';
        console.warn('[Port Click]', msg);
        setPortConnectionError(msg);
        setTimeout(() => setPortConnectionError(null), 5000);
        return;
      }
      // Swap source and target
      [sourceContainerId, targetContainerId] = [targetContainerId, sourceContainerId];
      [sourcePortId, targetPortId] = [targetPortId, sourcePortId];
      [sourcePortType, targetPortType] = [targetPortType, sourcePortType];
      console.log('[Port Click] Swapped source and target (started from input port)');
    } else {
      // Source is output port, target must be input
      if (targetPortType !== 'input') {
        const msg = 'When starting from an output port, must end at an input port';
        console.warn('[Port Click]', msg);
        setPortConnectionError(msg);
        setTimeout(() => setPortConnectionError(null), 5000);
        return;
      }
    }

    console.log('[Port Click] Attempting connection:', {
      source: { containerId: sourceContainerId, portId: sourcePortId, portType: sourcePortType },
      target: { containerId: targetContainerId, portId: targetPortId, portType: targetPortType }
    });

    // Create or find ports in the database
    setExecuting(true);
    try {
      const { supabase } = await import('../../../lib/supabase');

      console.log('[Port Click] Finding or creating ports...');

      // Find or create source port
      let sourcePort = graphState.ports.find(
        p => p.container_id === sourceContainerId && p.metadata?.portDefinitionId === sourcePortId
      );

      console.log('[Port Click] Source port search result:', sourcePort ? 'Found existing' : 'Need to create');

      if (!sourcePort) {
        console.log('[Port Click] Creating source port:', { container_id: sourceContainerId, port_type: 'output', label: sourcePortId });
        const { data: newSourcePort, error: sourceError } = await supabase
          .from('mindmesh_ports')
          .insert({
            container_id: sourceContainerId,
            port_type: 'output',
            label: sourcePortId,
            metadata: { portDefinitionId: sourcePortId },
          })
          .select()
          .single();

        if (sourceError) {
          console.error('[Port Click] Source port creation failed:', sourceError);
          throw new Error(`Failed to create source port: ${sourceError.message}`);
        }

        console.log('[Port Click] Source port created:', newSourcePort);
        sourcePort = {
          id: newSourcePort.id,
          container_id: newSourcePort.container_id,
          direction: 'parent' as const,
          entity_id: sourceContainerId,
          entity_type: 'track' as const,
          metadata: newSourcePort.metadata,
          created_at: newSourcePort.created_at,
        };
      }

      // Find or create target port
      let targetPort = graphState.ports.find(
        p => p.container_id === targetContainerId && p.metadata?.portDefinitionId === targetPortId
      );

      console.log('[Port Click] Target port search result:', targetPort ? 'Found existing' : 'Need to create');

      if (!targetPort) {
        console.log('[Port Click] Creating target port:', { container_id: targetContainerId, port_type: 'input', label: targetPortId });
        const { data: newTargetPort, error: targetError } = await supabase
          .from('mindmesh_ports')
          .insert({
            container_id: targetContainerId,
            port_type: 'input',
            label: targetPortId,
            metadata: { portDefinitionId: targetPortId },
          })
          .select()
          .single();

        if (targetError) {
          console.error('[Port Click] Target port creation failed:', targetError);
          throw new Error(`Failed to create target port: ${targetError.message}`);
        }

        console.log('[Port Click] Target port created:', newTargetPort);
        targetPort = {
          id: newTargetPort.id,
          container_id: newTargetPort.container_id,
          direction: 'child' as const,
          entity_id: targetContainerId,
          entity_type: 'track' as const,
          metadata: newTargetPort.metadata,
          created_at: newTargetPort.created_at,
        };
      }

      // Create the connection via intent
      const intent: MindMeshIntent = {
        type: 'CreateManualNode',
        sourcePortId: sourcePort.id,
        targetPortId: targetPort.id,
        relationshipType: 'depends_on',
        relationshipDirection: 'forward',
      };

      console.log('[Port Click] Executing CreateManualNode intent:', intent);

      const result = await executeIntent(intent);

      console.log('[Port Click] Intent result:', result);

      if (result.success) {
        console.log('[Port Click] Connection created successfully!');
        setPortConnectionSource(null);
        setPortConnectionPreview(null);
        setPortConnectionError(null);
        await fetchGraph();
      } else {
        const errorMsg = result.executionErrors?.join(', ') || 'Failed to create connection';
        console.error('[Port Click] Connection failed:', errorMsg);
        setPortConnectionError(errorMsg);
        setTimeout(() => setPortConnectionError(null), 5000);
      }
    } catch (err: any) {
      console.error('[Port Click] Port connection error:', err);
      setPortConnectionError(err.message || 'Failed to create connection');
      setTimeout(() => setPortConnectionError(null), 5000);
    } finally {
      setExecuting(false);
    }
  }, [relationshipCreationMode, portConnectionSource, graphState, executeIntent, fetchGraph]);

  const handlePortDoubleClick = useCallback(async (containerId: string, portType: PortType, portId: string) => {
    console.log('[Port Double Click]', { containerId, portType, portId, hasSource: !!portConnectionSource });

    if (!graphState) {
      console.warn('[Port Double Click] No graph state');
      return;
    }

    // Check if this port already has a connection
    const existingPort = graphState.ports.find(
      p => p.container_id === containerId && p.metadata?.portDefinitionId === portId
    );

    if (existingPort) {
      // Check if there's a node connected to this port
      const connectedNode = graphState.nodes.find(
        node => node.source_port_id === existingPort.id || node.target_port_id === existingPort.id
      );

      if (connectedNode) {
        console.log('[Port Double Click] Port has existing connection, deleting node:', connectedNode.id);
        // Delete the existing connection
        setExecuting(true);
        setPortConnectionError(null);

        const intent: MindMeshIntent = {
          type: 'DeleteNode',
          nodeId: connectedNode.id,
        };

        try {
          const result = await executeIntent(intent);

          if (result.success) {
            console.log('[Port Double Click] Connection deleted successfully');
            setPortConnectionSource(null);
            setPortConnectionPreview(null);
            setRelationshipCreationMode(false);
            await fetchGraph();
          } else {
            const errorMsg = result.executionErrors?.join(', ') || 'Failed to delete connection';
            console.error('[Port Double Click] Deletion failed:', errorMsg);
            setPortConnectionError(errorMsg);
            setTimeout(() => setPortConnectionError(null), 5000);
          }
        } catch (err: any) {
          console.error('[Port Double Click] Deletion error:', err);
          setPortConnectionError(err.message || 'Failed to delete connection');
          setTimeout(() => setPortConnectionError(null), 5000);
        } finally {
          setExecuting(false);
        }
        return;
      }
    }

    // If no source set, this is the source port - start connection mode
    if (!portConnectionSource) {
      console.log('[Port Double Click] Starting connection mode with source port');
      // Enable connection mode - allow starting from any port
      setRelationshipCreationMode(true);
      setPortConnectionSource({ containerId, portType, portId });
      setPortConnectionError(null);
      return;
    }

    // If source is set, this completes the connection (same as single click)
    await handlePortClick(containerId, portType, portId);
  }, [portConnectionSource, graphState, handlePortClick, executeIntent, fetchGraph]);

  const handleToggleContainerCreationMode = useCallback(() => {
    setContainerCreationMode(prev => !prev);
  }, []);

  const handleToggleTrackCreationMode = useCallback(() => {
    if (!canEdit && !trackCreationMode) {
      setTrackCreationError('Canvas lock required. Click "Acquire Lock" to enable editing.');
      return;
    }
    setTrackCreationMode(prev => !prev);
    setTrackCreationPosition(null);
    setShowTrackNamePrompt(false);
    setTrackCreationError(null);
  }, [canEdit, trackCreationMode]);

  const handleToggleSubtrackCreationMode = useCallback(() => {
    if (!canEdit && !subtrackCreationMode) {
      setSubtrackCreationError('Canvas lock required. Click "Acquire Lock" to enable editing.');
      return;
    }
    setSubtrackCreationMode(prev => !prev);
    setSubtrackParent(null);
    setSubtrackCreationPosition(null);
    setShowSubtrackNamePrompt(false);
    setSubtrackCreationError(null);
  }, [canEdit, subtrackCreationMode]);

  const handleHierarchyViewChange = useCallback((mode: HierarchyViewMode) => {
    if (mode === 'tracks_only') {
      setHierarchyVisibility(setGlobalSubtracksVisibility(hierarchyVisibility, true));
    } else {
      setHierarchyVisibility(setGlobalSubtracksVisibility(hierarchyVisibility, false));
    }
  }, [hierarchyVisibility]);

  const handleTrackNameConfirm = useCallback(async (name: string) => {
    if (!trackCreationPosition || !graphState?.workspace) return;

    const intent: MindMeshIntent = {
      type: 'CreateIntegratedTrack',
      position: trackCreationPosition,
      name,
      width: 300,
      height: 200,
    };

    setExecuting(true);
    setTrackCreationError(null);
    try {
      const result = await executeIntent(intent);
      if (result && result.planningErrors && result.planningErrors.length > 0) {
        setTrackCreationError(result.planningErrors.join(', '));
      } else if (result && result.executionErrors && result.executionErrors.length > 0) {
        setTrackCreationError(result.executionErrors.join(', '));
      } else {
        setShowTrackNamePrompt(false);
        setTrackCreationMode(false);
        setTrackCreationPosition(null);
        await fetchGraph();
      }
    } catch (err: any) {
      setTrackCreationError(err.message || 'Failed to create track');
    } finally {
      setExecuting(false);
    }
  }, [trackCreationPosition, graphState, executeIntent, fetchGraph]);

  const handleTrackNameCancel = useCallback(() => {
    setShowTrackNamePrompt(false);
    setTrackCreationPosition(null);
    setTrackCreationError(null);
  }, []);

  const handleSubtrackContainerClick = useCallback((container: MindMeshContainer, e: React.MouseEvent) => {
    if (!subtrackCreationMode) return;

    // Only allow tracks as parents
    if (container.entity_type !== 'track') {
      setSubtrackCreationError('Subtracks must belong to a Track');
      return;
    }

    // Set parent and position for subtrack
    setSubtrackParent(container);
    // Position relative to parent (below and to the right)
    setSubtrackCreationPosition({
      x: container.x + 50,
      y: container.y + container.height + 50,
    });
    setShowSubtrackNamePrompt(true);
    setSubtrackCreationError(null);
  }, [subtrackCreationMode]);

  const handleSubtrackNameConfirm = useCallback(async (name: string) => {
    if (!subtrackCreationPosition || !subtrackParent || !graphState?.workspace) return;

    const intent: MindMeshIntent = {
      type: 'CreateIntegratedSubtrack',
      parentTrackId: subtrackParent.entity_id,
      position: subtrackCreationPosition,
      name,
      width: 300,
      height: 200,
    };

    setExecuting(true);
    setSubtrackCreationError(null);
    try {
      const result = await executeIntent(intent);
      if (result && result.planningErrors && result.planningErrors.length > 0) {
        setSubtrackCreationError(result.planningErrors.join(', '));
      } else if (result && result.executionErrors && result.executionErrors.length > 0) {
        setSubtrackCreationError(result.executionErrors.join(', '));
      } else {
        setShowSubtrackNamePrompt(false);
        setSubtrackCreationMode(false);
        setSubtrackParent(null);
        setSubtrackCreationPosition(null);
        await fetchGraph();
      }
    } catch (err: any) {
      setSubtrackCreationError(err.message || 'Failed to create subtrack');
    } finally {
      setExecuting(false);
    }
  }, [subtrackCreationPosition, subtrackParent, graphState, executeIntent, fetchGraph]);

  const handleSubtrackNameCancel = useCallback(() => {
    setShowSubtrackNamePrompt(false);
    setSubtrackParent(null);
    setSubtrackCreationPosition(null);
    setSubtrackCreationError(null);
  }, []);


  const handleRelationshipContainerClick = useCallback((container: MindMeshContainer, e: React.MouseEvent) => {
    if (!relationshipCreationMode) return;

    if (!relationshipSource) {
      setRelationshipSource(container);
    } else if (relationshipSource.id !== container.id) {
      setRelationshipTarget(container);
      setRelationshipTypeSelectorPosition({ x: e.clientX, y: e.clientY });
      setShowRelationshipTypeSelector(true);
    }
  }, [relationshipCreationMode, relationshipSource]);

  const handleCancelRelationshipCreation = useCallback(() => {
    setRelationshipSource(null);
    setRelationshipTarget(null);
    setRelationshipGhostLine(null);
    setShowRelationshipTypeSelector(false);
    setPortConnectionSource(null);
    setPortConnectionPreview(null);
    setPortConnectionError(null);
    setRelationshipCreationMode(false);
  }, []);

  const handleRelationshipTypeSelect = useCallback(async (relationshipType: RelationshipType) => {
    if (!relationshipSource || !relationshipTarget || !graphState) {
      return;
    }

    setShowRelationshipTypeSelector(false);
    setExecuting(true);

    try {
      const sourcePort = graphState.ports.find(p => p.containerId === relationshipSource.id);
      const targetPort = graphState.ports.find(p => p.containerId === relationshipTarget.id);

      if (!sourcePort || !targetPort) {
        setLockError('Containers must have ports to create relationships');
        return;
      }

      const intent = {
        type: 'CreateManualNode' as const,
        sourcePortId: sourcePort.id,
        targetPortId: targetPort.id,
        relationshipType: relationshipType,
        relationshipDirection: 'forward' as const,
      };

      await executeIntent(intent);

      setRelationshipSource(null);
      setRelationshipTarget(null);
      setRelationshipGhostLine(null);
    } catch (err) {
      setLockError(err instanceof Error ? err.message : 'Failed to create relationship');
    } finally {
      setExecuting(false);
    }
  }, [relationshipSource, relationshipTarget, graphState, executeIntent]);

  const handleMouseDown = useCallback((e: React.MouseEvent, container: MindMeshContainer) => {
    e.stopPropagation(); // Prevent canvas background handlers from firing

    setClickStart({
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      containerId: container.id,
    });

    if (relationshipCreationMode) return;
    if (containerCreationMode) return;
    if (container.state === 'ghost') return;
    if (!canEdit) return;

    // Only allow dragging if the container is already selected
    if (selectedContainer?.id !== container.id) {
      // Not selected yet - don't allow dragging, just wait for mouseUp to select
      return;
    }

    // Already selected - allow dragging
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setDraggingContainer({
      id: container.id,
      startX: container.x,
      startY: container.y,
      offsetX: canvasPos.x - container.x,
      offsetY: canvasPos.y - container.y,
    });
  }, [canEdit, screenToCanvas, relationshipCreationMode, containerCreationMode, selectedContainer]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (panningCanvas) {
      handleCanvasPanMove(e);
      return;
    }

    // Update port connection preview line
    if (relationshipCreationMode && portConnectionSource && !draggingContainer) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setPortConnectionPreview(canvasPos);
      return;
    }

    if (relationshipCreationMode && relationshipSource && !draggingContainer) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setRelationshipGhostLine(canvasPos);
      return;
    }

    if (!draggingContainer) return;

    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    const newX = canvasPos.x - draggingContainer.offsetX;
    const newY = canvasPos.y - draggingContainer.offsetY;

    setDraggingContainer(prev => prev ? {
      ...prev,
      currentX: newX,
      currentY: newY,
    } : null);
  }, [draggingContainer, panningCanvas, handleCanvasPanMove, screenToCanvas, relationshipCreationMode, relationshipSource, portConnectionSource]);

  const handleMouseUp = useCallback(async (e: React.MouseEvent, container?: MindMeshContainer) => {
    if (panningCanvas) {
      handleCanvasPanEnd();
      return;
    }

    if (!draggingContainer && clickStart && container) {
      e.stopPropagation(); // Prevent canvas background handlers from firing

      const dx = Math.abs(e.clientX - clickStart.x);
      const dy = Math.abs(e.clientY - clickStart.y);
      const dt = Date.now() - clickStart.time;

      if (dx < 5 && dy < 5 && dt < 300) {
        if (relationshipCreationMode) {
          handleRelationshipContainerClick(container, e);
          setClickStart(null);
          return;
        }

        if (subtrackCreationMode) {
          handleSubtrackContainerClick(container, e);
          setClickStart(null);
          return;
        }

        if (container.state === 'ghost') {
          const intent: MindMeshIntent = {
            type: 'ActivateContainer',
            containerId: container.id,
            reason: 'user_clicked',
          };

          setExecuting(true);

          try {
            await executeIntent(intent);
          } catch (err) {
            console.error('Activation failed:', err);
          } finally {
            setExecuting(false);
          }
        } else {
          // Single click on non-ghost container = select it
          setSelectedContainer(container);
        }
      }

      setClickStart(null);
      return;
    }

    if (!draggingContainer) return;

    const newX = draggingContainer.currentX ?? draggingContainer.startX;
    const newY = draggingContainer.currentY ?? draggingContainer.startY;

    if (newX === draggingContainer.startX && newY === draggingContainer.startY) {
      setDraggingContainer(null);
      setClickStart(null);
      return;
    }

    const draggedContainer = graphState?.containers.find(c => c.id === draggingContainer.id);
    const isLocalOnlyContainer = draggedContainer && (!draggedContainer.entity_id || draggedContainer.entity_id.trim() === '');

    setDraggingContainer(null);
    setClickStart(null);
    setExecuting(true);

    try {
      if (isLocalOnlyContainer) {
        const { supabase } = await import('../../../lib/supabase');
        const { error } = await supabase
          .from('mindmesh_containers')
          .update({
            x_position: Math.round(newX),
            y_position: Math.round(newY),
            updated_at: new Date().toISOString(),
          })
          .eq('id', draggingContainer.id);

        if (error) {
          console.error('Local container move failed:', error);
        } else {
          await fetchGraph();
        }
      } else {
        const intent: MindMeshIntent = {
          type: 'MoveContainer',
          containerId: draggingContainer.id,
          newPosition: { x: Math.round(newX), y: Math.round(newY) },
        };
        await executeIntent(intent);
      }
    } catch (err) {
      console.error('Move failed:', err);
    } finally {
      setExecuting(false);
    }
  }, [draggingContainer, panningCanvas, clickStart, handleCanvasPanEnd, executeIntent, relationshipCreationMode, subtrackCreationMode, handleRelationshipContainerClick, handleSubtrackContainerClick, graphState, fetchGraph]);

  const handleRollback = useCallback(async () => {
    setExecuting(true);

    try {
      await rollback();
    } catch (err) {
      console.error('Rollback failed:', err);
    } finally {
      setExecuting(false);
    }
  }, [rollback]);

  const handleAcquireLock = useCallback(async () => {
    setExecuting(true);
    setLockError(null);

    const intent: MindMeshIntent = {
      type: 'AcquireLock',
    };

    try {
      const result = await executeIntent(intent);
      if (!result.success) {
        setLockError(result.executionErrors.join(', ') || 'Failed to acquire lock');
      }
    } catch (err) {
      console.error('Lock acquisition failed:', err);
      setLockError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setExecuting(false);
    }
  }, [executeIntent]);

  const handleReleaseLock = useCallback(async () => {
    setExecuting(true);
    setLockError(null);

    const intent: MindMeshIntent = {
      type: 'ReleaseLock',
    };

    try {
      const result = await executeIntent(intent);
      if (!result.success) {
        setLockError(result.executionErrors.join(', ') || 'Failed to release lock');
      }
    } catch (err) {
      console.error('Lock release failed:', err);
      setLockError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setExecuting(false);
    }
  }, [executeIntent]);

  const handleUpdateContainer = useCallback(async (containerId: string, title: string, body: string) => {
    setExecuting(true);

    const intent: MindMeshIntent = {
      type: 'UpdateContainer',
      containerId,
      title,
      body,
    };

    try {
      const result = await executeIntent(intent);
      if (!result.success) {
        console.error('Container update failed:', result.executionErrors);
      }
    } catch (err) {
      console.error('Container update failed:', err);
    } finally {
      setExecuting(false);
    }
  }, [executeIntent]);

  const handleActivateGhost = useCallback(async (containerId: string) => {
    setExecuting(true);

    const intent: MindMeshIntent = {
      type: 'MaterializeGhost',
      containerId,
    };

    try {
      const result = await executeIntent(intent);
      if (!result.success) {
        console.error('Ghost activation failed:', result.executionErrors);
      }
    } catch (err) {
      console.error('Ghost activation failed:', err);
    } finally {
      setExecuting(false);
      setEditingContainer(null);
    }
  }, [executeIntent]);

  const handleDeleteContainer = useCallback((containerId: string) => {
    setDeleteContainerId(containerId);
  }, []);

  const confirmDeleteContainer = useCallback(async () => {
    if (!deleteContainerId) return;

    setExecuting(true);

    const intent: MindMeshIntent = {
      type: 'DeleteContainer',
      containerId: deleteContainerId,
    };

    try {
      const result = await executeIntent(intent);
      if (!result.success) {
        console.error('Container deletion failed:', result.executionErrors);
      }
    } catch (err) {
      console.error('Container deletion failed:', err);
    } finally {
      setExecuting(false);
      setDeleteContainerId(null);
    }
  }, [deleteContainerId, executeIntent]);

  const handleInlineContentSave = useCallback(async (containerId: string, title: string, body: string) => {
    setExecuting(true);

    const intent: MindMeshIntent = {
      type: 'UpdateContainer',
      containerId,
      title,
      body,
    };

    try {
      const result = await executeIntent(intent);
      if (!result.success) {
        console.error('Inline content update failed:', result.executionErrors);
        setLockError('Failed to save changes. Please try again.');
        setTimeout(() => setLockError(null), 3000);
      }
    } catch (err) {
      console.error('Inline content update failed:', err);
      setLockError('Failed to save changes. Please try again.');
      setTimeout(() => setLockError(null), 3000);
    } finally {
      setExecuting(false);
    }
  }, [executeIntent]);

  const handleTaskStatusChange = useCallback(async (containerId: string, entityId: string, newStatus: string) => {
    setExecuting(true);

    const intent: MindMeshIntent = {
      type: 'UpdateTaskStatus',
      containerId,
      entityId,
      status: newStatus,
    };

    try {
      const result = await executeIntent(intent);
      if (!result.success) {
        console.error('Task status update failed:', result.executionErrors);
        setLockError('Failed to update status. Please try again.');
        setTimeout(() => setLockError(null), 3000);
      }
    } catch (err) {
      console.error('Task status update failed:', err);
      setLockError('Failed to update status. Please try again.');
      setTimeout(() => setLockError(null), 3000);
    } finally {
      setExecuting(false);
    }
  }, [executeIntent]);

  const handleContainerHover = useCallback((e: React.MouseEvent, container: MindMeshContainer) => {
    if (draggingContainer || panningCanvas) return;

    setHoveredContainer(container);
    setHoverPosition({ x: e.clientX, y: e.clientY });
  }, [draggingContainer, panningCanvas]);

  const handleContainerLeave = useCallback(() => {
    setHoveredContainer(null);
    setHoverPosition(null);
    setHoveredMetadata(null);
  }, []);

  const handleCloseInspector = useCallback(() => {
    setSelectedContainer(null);
    setSelectedMetadata(null);
  }, []);

  const handleNodeHover = useCallback((e: React.MouseEvent, node: MindMeshNode) => {
    if (draggingContainer || panningCanvas) return;

    setHoveredNode(node);
    setHoveredNodePosition({ x: e.clientX, y: e.clientY });
  }, [draggingContainer, panningCanvas]);

  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null);
    setHoveredNodePosition(null);
    setHoveredNodeMetadata(null);
  }, []);

  const handleNodeClick = useCallback((e: React.MouseEvent, node: MindMeshNode) => {
    e.stopPropagation();
    setSelectedNode(node);
    setSelectedContainer(null);
  }, []);

  const handleCloseNodeInspector = useCallback(() => {
    setSelectedNode(null);
    setSelectedNodeMetadata(null);
  }, []);

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    setExecuting(true);
    setOperationError(null);

    const intent: MindMeshIntent = {
      type: 'DeleteNode',
      nodeId,
    };

    try {
      const result = await executeIntent(intent);

      if (result.success) {
        setSelectedNode(null);
        setSelectedNodeMetadata(null);
        await fetchGraph();
      } else {
        console.error('Node deletion failed:', result.executionErrors);
        setOperationError('Failed to delete connection: ' + (result.executionErrors?.join(', ') || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Node deletion error:', err);
      setOperationError('Failed to delete connection: ' + (err.message || 'Unknown error'));
    } finally {
      setExecuting(false);
    }
  }, [executeIntent, fetchGraph]);

  useEffect(() => {
    if (lockError) {
      const timer = setTimeout(() => setLockError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lockError]);

  useEffect(() => {
    if (operationError) {
      const timer = setTimeout(() => setOperationError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [operationError]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (containerCreationMode) {
          setContainerCreationMode(false);
        } else if (relationshipCreationMode) {
          handleCancelRelationshipCreation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [relationshipCreationMode, containerCreationMode, handleCancelRelationshipCreation]);

  useEffect(() => {
    const visibleContainers = graphState?.containers.filter(
      c => graphState.visibility[c.id] !== false
    ) || [];
    const activeContainers = visibleContainers.filter(c => c.state !== 'ghost');

    if (activeContainers.length > 0 && !dismissedGhostExplainer) {
      setDismissedGhostExplainer(true);
    }
  }, [graphState?.containers, graphState?.visibility, dismissedGhostExplainer]);

  useEffect(() => {
    if (!hoveredContainer) {
      setHoveredMetadata(null);
      return;
    }

    let cancelled = false;

    fetchContainerMetadata(hoveredContainer).then(metadata => {
      if (!cancelled) {
        setHoveredMetadata(metadata);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hoveredContainer]);

  useEffect(() => {
    if (!selectedContainer) {
      setSelectedMetadata(null);
      return;
    }

    let cancelled = false;

    fetchContainerMetadata(selectedContainer).then(metadata => {
      if (!cancelled) {
        setSelectedMetadata(metadata);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedContainer]);

  useEffect(() => {
    if (!hoveredNode || !graphState) {
      setHoveredNodeMetadata(null);
      return;
    }

    const sourcePort = graphState.ports.find(p => p.id === hoveredNode.source_port_id);
    const targetPort = graphState.ports.find(p => p.id === hoveredNode.target_port_id);

    if (!sourcePort || !targetPort) {
      setHoveredNodeMetadata(null);
      return;
    }

    const sourceContainer = graphState.containers.find(c => c.id === sourcePort.container_id);
    const targetContainer = graphState.containers.find(c => c.id === targetPort.container_id);

    if (!sourceContainer || !targetContainer) {
      setHoveredNodeMetadata(null);
      return;
    }

    let cancelled = false;

    Promise.all([
      fetchContainerMetadata(sourceContainer),
      fetchContainerMetadata(targetContainer),
    ]).then(([sourceMetadata, targetMetadata]) => {
      if (cancelled) return;

      const metadata = createNodeMetadata(
        hoveredNode,
        sourcePort,
        targetPort,
        sourceContainer,
        targetContainer,
        sourceMetadata?.title || 'Unknown',
        targetMetadata?.title || 'Unknown'
      );

      setHoveredNodeMetadata(metadata);
    });

    return () => {
      cancelled = true;
    };
  }, [hoveredNode, graphState]);

  useEffect(() => {
    if (!selectedNode || !graphState) {
      setSelectedNodeMetadata(null);
      return;
    }

    const sourcePort = graphState.ports.find(p => p.id === selectedNode.source_port_id);
    const targetPort = graphState.ports.find(p => p.id === selectedNode.target_port_id);

    if (!sourcePort || !targetPort) {
      setSelectedNodeMetadata(null);
      return;
    }

    const sourceContainer = graphState.containers.find(c => c.id === sourcePort.container_id);
    const targetContainer = graphState.containers.find(c => c.id === targetPort.container_id);

    if (!sourceContainer || !targetContainer) {
      setSelectedNodeMetadata(null);
      return;
    }

    let cancelled = false;

    Promise.all([
      fetchContainerMetadata(sourceContainer),
      fetchContainerMetadata(targetContainer),
    ]).then(([sourceMetadata, targetMetadata]) => {
      if (cancelled) return;

      const metadata = createNodeMetadata(
        selectedNode,
        sourcePort,
        targetPort,
        sourceContainer,
        targetContainer,
        sourceMetadata?.title || 'Unknown',
        targetMetadata?.title || 'Unknown'
      );

      setSelectedNodeMetadata(metadata);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedNode, graphState]);

  const getEntityLabel = (container: MindMeshContainer): string => {
    if (container.title || container.body) {
      return container.title || container.body || 'Untitled';
    }
    return container.entity_id ? `${container.entity_type} ${container.entity_id.slice(0, 8)}` : 'Empty container';
  };

  // Fetch roadmap items data for task/event containers
  useEffect(() => {
    if (!graphState?.containers) return;

    const roadmapItemContainers = graphState.containers.filter(
      c => c.entity_type === 'roadmap_item' && c.entity_id
    );

    if (roadmapItemContainers.length === 0) {
      setRoadmapItemsData(new Map());
      return;
    }

    let cancelled = false;

    (async () => {
      const itemIds = roadmapItemContainers.map(c => c.entity_id!);

      const { data, error } = await supabase
        .from('roadmap_items')
        .select('id, type, status, metadata, start_date, end_date')
        .in('id', itemIds);

      if (cancelled) return;

      if (error) {
        console.error('Failed to fetch roadmap items data:', error);
        return;
      }

      if (data) {
        const dataMap = new Map(data.map(item => [item.id, item]));
        setRoadmapItemsData(dataMap);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [graphState?.containers]);

  const findConnectedContainers = (
    sourceContainerId: string,
    targetContainerId: string
  ): { source: MindMeshContainer | undefined; target: MindMeshContainer | undefined } => {
    const source = graphState?.containers.find(c => c.id === sourceContainerId);
    const target = graphState?.containers.find(c => c.id === targetContainerId);
    return { source, target };
  };

  if (loading && !graphState) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Mind Mesh...</p>
        </div>
      </div>
    );
  }

  if (error && !graphState) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">Error Loading Graph</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!graphState) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-gray-500">No graph data</p>
      </div>
    );
  }

  // Apply both backend visibility and hierarchy visibility filters
  const backendVisibleContainers = graphState.containers.filter(
    c => graphState.visibility[c.id] !== false
  );
  const visibleContainers = filterVisibleContainers(
    backendVisibleContainers,
    hierarchyVisibility
  );

  // Filter nodes by visibility (both endpoints must be visible)
  const visibleNodes = filterVisibleNodes(
    graphState.nodes,
    hierarchyVisibility,
    graphState.containers,
    graphState.ports
  );

  // Helper function to get display position for any container
  const getDisplayPosition = (container: MindMeshContainer) => {
    const isDragging = draggingContainer?.id === container.id;
    const isResizing = resizingContainer?.id === container.id;

    return {
      x: isDragging && draggingContainer?.currentX !== undefined
        ? draggingContainer.currentX
        : container.x,
      y: isDragging && draggingContainer?.currentY !== undefined
        ? draggingContainer.currentY
        : container.y,
      width: isResizing && resizingContainer?.currentWidth !== undefined
        ? resizingContainer.currentWidth
        : container.width,
      height: isResizing && resizingContainer?.currentHeight !== undefined
        ? resizingContainer.currentHeight
        : container.height,
    };
  };

  // Prepare dynamic port calculation data with display positions
  const containerPositions: ContainerPosition[] = graphState.containers.map(c => {
    const displayPos = getDisplayPosition(c);
    return {
      id: c.id,
      x: displayPos.x,
      y: displayPos.y,
      width: displayPos.width,
      height: displayPos.height,
    };
  });

  const connections: ConnectionData[] = graphState.nodes
    .map(node => {
      const sourcePort = graphState.ports.find(p => p.id === node.source_port_id);
      const targetPort = graphState.ports.find(p => p.id === node.target_port_id);

      if (!sourcePort || !targetPort) return null;

      // Get logical port IDs from metadata if available, otherwise fall back to UUID
      const sourceLogicalPortId = sourcePort.metadata?.portDefinitionId || sourcePort.id;
      const targetLogicalPortId = targetPort.metadata?.portDefinitionId || targetPort.id;

      return {
        sourceContainerId: sourcePort.container_id,
        targetContainerId: targetPort.container_id,
        sourcePortId: sourceLogicalPortId,
        targetPortId: targetLogicalPortId,
      };
    })
    .filter((conn): conn is ConnectionData => conn !== null);

  const activeContainers = visibleContainers.filter(c => c.state !== 'ghost');
  const ghostContainers = visibleContainers.filter(c => c.state === 'ghost');
  const hasNoContainers = visibleContainers.length === 0;
  const hasOnlyGhosts = activeContainers.length === 0 && ghostContainers.length > 0;
  const firstGhost = ghostContainers[0];

  const showEmptyGuide = hasNoContainers && !dismissedEmptyGuide && !showHelp;
  const showGhostExplainer = hasOnlyGhosts && !dismissedGhostExplainer && !showHelp && firstGhost;
  const showLockedGuide = !canEdit && lock && !isLockHolder && !dismissedLockedGuide && !showHelp && !hasNoContainers;

  // CRITICAL: If reconciliation error detected, show blocking error and stop rendering
  if (reconciliationError && reconciliationError.isDuplicateError) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-red-50 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white border-2 border-red-500 rounded-lg shadow-xl p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-red-900 mb-2">
                Mind Mesh Data Integrity Issue
              </h2>
              <p className="text-red-800 mb-4">
                Duplicate containers detected. Multiple containers exist for the same Guardrails entity, which violates the one-to-one mapping requirement.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-red-900 mb-2">Detected Issues:</h3>
                <p className="text-sm text-red-800 mb-3">
                  {reconciliationError.duplicateCount} duplicate(s) found
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reconciliationError.duplicates.map((dup, idx) => (
                    <div key={idx} className="bg-white border border-red-300 rounded p-3 text-sm">
                      <div className="font-mono text-red-900 mb-1">
                        {dup.entityType}:{dup.entityId}
                      </div>
                      <div className="text-red-700">
                        {dup.containerCount} containers: {dup.containerIds.slice(0, 3).join(', ')}
                        {dup.containerIds.length > 3 && ` +${dup.containerIds.length - 3} more`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-amber-900 mb-2">Action Required:</h3>
                <p className="text-sm text-amber-800">
                  Manual database cleanup is required before Mind Mesh can be used. This is a critical data integrity issue that cannot be auto-repaired.
                  Contact your system administrator or database administrator to resolve the duplicate containers.
                </p>
              </div>

              <div className="text-xs text-gray-600 font-mono">
                Workspace ID: {reconciliationError.workspaceId}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-50 flex flex-col">
      {/* Header with Navigation */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/guardrails/dashboard')}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
          aria-label="Back to Guardrails"
        >
          <ChevronLeft size={20} />
          <span>Back to Guardrails</span>
        </button>
        <div className="flex-1"></div>
        {/* Lock Status Bar in Header */}
        <div className="flex-shrink-0">
          <LockStatusBar
            lock={lock}
            onAcquireLock={handleAcquireLock}
            onReleaseLock={handleReleaseLock}
            executing={executing}
            error={lockError}
          />
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden">

        {/* Operation Error Banner */}
        {operationError && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl">
            <div className="bg-red-50 border-2 border-red-500 rounded-lg shadow-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">{operationError}</p>
            </div>
            <button
              onClick={() => setOperationError(null)}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              ×
            </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-50">
        <MindMeshToolbar
          onRollback={handleRollback}
          onShowHelp={() => setShowHelp(true)}
          onToggleRelationshipMode={handleToggleRelationshipMode}
          onToggleContainerCreationMode={handleToggleContainerCreationMode}
          onToggleTrackCreationMode={handleToggleTrackCreationMode}
          onToggleSubtrackCreationMode={handleToggleSubtrackCreationMode}
          onHierarchyViewChange={handleHierarchyViewChange}
          hierarchyViewMode={stateToViewMode(hierarchyVisibility)}
          hiddenContainerCount={countHiddenContainers(backendVisibleContainers, hierarchyVisibility)}
          canRollback={true}
          executing={executing}
          canEdit={canEdit}
          relationshipCreationMode={relationshipCreationMode}
          containerCreationMode={containerCreationMode}
          trackCreationMode={trackCreationMode}
          subtrackCreationMode={subtrackCreationMode}
          containerCount={visibleContainers.length}
          nodeCount={visibleNodes.length}
        />
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="absolute top-36 left-4 z-50">
          <CanvasHelpPanel
            onClose={() => setShowHelp(false)}
            canEdit={canEdit}
          />
          </div>
        )}

        {/* Execution Status */}
        {executing && (
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
            <Loader2 className="animate-spin h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-600 font-medium">Executing...</span>
          </div>
        )}

        {/* General Error Display */}
        {error && (
          <div className="absolute top-36 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-300 rounded-lg max-w-md shadow-sm">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        {/* Track Creation Error Display */}
        {trackCreationError && (
          <div className="absolute top-36 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-300 rounded-lg max-w-md shadow-sm">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm text-red-600 font-medium block">Track Creation Failed</span>
              <span className="text-sm text-red-600">{trackCreationError}</span>
            </div>
            <button
              onClick={() => setTrackCreationError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Subtrack Creation Error Display */}
        {subtrackCreationError && (
          <div className="absolute top-36 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-300 rounded-lg max-w-md shadow-sm">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm text-red-600 font-medium block">Subtrack Creation Failed</span>
              <span className="text-sm text-red-600">{subtrackCreationError}</span>
            </div>
            <button
              onClick={() => setSubtrackCreationError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Port Connection Error Display */}
        {portConnectionError && (
          <div className="absolute top-36 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-300 rounded-lg max-w-md shadow-sm">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm text-red-600 font-medium block">Port Connection Failed</span>
              <span className="text-sm text-red-600">{portConnectionError}</span>
            </div>
            <button
              onClick={() => setPortConnectionError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Connection Mode Help Banner */}
        {relationshipCreationMode && !portConnectionError && (
          <div className="absolute top-36 left-4 z-50 flex items-center gap-3 px-4 py-3 bg-green-50 border-2 border-green-400 rounded-lg max-w-lg shadow-lg">
          <Link className="h-5 w-5 text-green-600 flex-shrink-0 animate-pulse" />
          <div className="flex-1">
            <span className="text-sm text-green-800 font-semibold block">Connection Mode Active</span>
            <span className="text-sm text-green-700">
              {portConnectionSource
                ? 'Now click an input port (left side) on the target container to complete the connection'
                : 'Double-click an output port (right side) on the source container to begin'}
            </span>
          </div>
          <button
            onClick={handleCancelRelationshipCreation}
            className="text-green-700 hover:text-green-900 text-xs font-medium px-2 py-1 bg-green-100 hover:bg-green-200 rounded"
          >
              Cancel (ESC or Right-Click)
            </button>
          </div>
        )}

        {/* Empty Canvas Guide */}
        {showEmptyGuide && (
          <EmptyCanvasGuide onDismiss={() => setDismissedEmptyGuide(true)} />
        )}

        {/* Ghost Explainer */}
        {showGhostExplainer && firstGhost && (
          <GhostExplainer
            position={{
              x: (firstGhost.x + firstGhost.width + 20) * viewport.scale + viewport.translateX,
              y: firstGhost.y * viewport.scale + viewport.translateY,
            }}
            onDismiss={() => setDismissedGhostExplainer(true)}
          />
        )}

        {/* Locked Canvas Guide */}
        {showLockedGuide && (
          <LockedCanvasGuide
            lockedBy={lock?.user_id}
            onDismiss={() => setDismissedLockedGuide(true)}
          />
        )}

        {/* Canvas */}
        <div
        ref={canvasRef}
        className="relative w-full h-full"
        style={{
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: `${20 * viewport.scale}px ${20 * viewport.scale}px`,
          backgroundPosition: `${viewport.translateX}px ${viewport.translateY}px`,
          cursor: containerCreationMode
            ? 'crosshair'
            : relationshipCreationMode
            ? 'crosshair'
            : panningCanvas
            ? 'grabbing'
            : draggingContainer
            ? 'move'
            : 'grab',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleCanvasPanStart}
        onContextMenu={(e) => {
          e.preventDefault();
          if (relationshipCreationMode) {
            handleCancelRelationshipCreation();
          }
        }}
      >
        {/* Content wrapper with transform */}
        <div
          style={{
            transform: `translate(${viewport.translateX}px, ${viewport.translateY}px) scale(${viewport.scale})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {/* Background hit layer for container creation */}
          {containerCreationMode && (
            <div
              className="absolute top-0 left-0"
              style={{
                width: '10000px',
                height: '10000px',
                zIndex: 0,
                pointerEvents: 'auto',
                cursor: 'crosshair',
              }}
              onMouseDown={(e) => {
                // Deselect container when clicking on background
                if (e.target === e.currentTarget) {
                  setSelectedContainer(null);
                }

                if (e.target === e.currentTarget && containerCreationMode) {
                  console.log('[MindMesh] Background mouseDown at screen:', e.clientX, e.clientY);
                  e.stopPropagation();
                  const canvasPos = screenToCanvas(e.clientX, e.clientY);
                  backgroundClickStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
                  setDragPreview({ startX: canvasPos.x, startY: canvasPos.y, endX: canvasPos.x, endY: canvasPos.y });
                }
                if (e.target === e.currentTarget && trackCreationMode) {
                  e.stopPropagation();
                  const canvasPos = screenToCanvas(e.clientX, e.clientY);
                  backgroundClickStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
                }
              }}
              onMouseMove={(e) => {
                if (e.target === e.currentTarget && backgroundClickStartRef.current && dragPreview && containerCreationMode) {
                  const canvasPos = screenToCanvas(e.clientX, e.clientY);
                  setDragPreview(prev => prev ? { ...prev, endX: canvasPos.x, endY: canvasPos.y } : null);
                }
              }}
              onMouseUp={async (e) => {
                // Handle track creation
                if (trackCreationMode && e.target === e.currentTarget && backgroundClickStartRef.current) {
                  const clickDuration = Date.now() - backgroundClickStartRef.current.time;
                  const clickDistX = Math.abs(e.clientX - backgroundClickStartRef.current.x);
                  const clickDistY = Math.abs(e.clientY - backgroundClickStartRef.current.y);

                  // Only treat as click if < 300ms and < 5px movement
                  if (clickDuration < 300 && clickDistX < 5 && clickDistY < 5) {
                    const canvasPos = screenToCanvas(e.clientX, e.clientY);
                    setTrackCreationPosition(canvasPos);
                    setShowTrackNamePrompt(true);
                    setTrackCreationError(null);
                  }

                  backgroundClickStartRef.current = null;
                  return;
                }

                // Handle container creation
                if (!containerCreationMode || e.target !== e.currentTarget || !backgroundClickStartRef.current) {
                  console.log('[MindMesh] Background mouseUp ignored - not in creation mode or target mismatch');
                  backgroundClickStartRef.current = null;
                  setDragPreview(null);
                  return;
                }

                console.log('[MindMesh] Background mouseUp at screen:', e.clientX, e.clientY);
                e.stopPropagation();

                if (dragPreview) {
                  const x = Math.min(dragPreview.startX, dragPreview.endX);
                  const y = Math.min(dragPreview.startY, dragPreview.endY);
                  const width = Math.max(Math.abs(dragPreview.endX - dragPreview.startX), 280);
                  const height = Math.max(Math.abs(dragPreview.endY - dragPreview.startY), 200);

                  const position = { x, y };
                  console.log('[MindMesh] Creating container at:', position, 'with size:', { width, height });

                  const intent: MindMeshIntent = {
                    type: 'CreateManualContainer',
                    containerType: 'idea',
                    position,
                    title: 'New Idea',
                    body: '',
                    width,
                    height,
                  };

                  setExecuting(true);
                  try {
                    await executeIntent(intent);
                    console.log('[MindMesh] Container created successfully');
                    setContainerCreationMode(false);
                  } catch (err) {
                    console.error('[MindMesh] Container creation failed:', err);
                  } finally {
                    setExecuting(false);
                  }
                }

                backgroundClickStartRef.current = null;
                setDragPreview(null);
              }}
            />
          )}

          {/* Render nodes (lines) first so they appear below containers */}
          <svg
            className="absolute top-0 left-0 w-full h-full"
            style={{
              zIndex: 1,
              pointerEvents: containerCreationMode ? 'none' : 'auto',
            }}
          >
          <defs>
            {/* Arrow marker definitions */}
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
            </marker>
            <marker
              id="arrowhead-hovered"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#60a5fa" />
            </marker>
          </defs>
          {visibleNodes.map(node => {
            const sourcePort = graphState.ports.find(p => p.id === node.source_port_id);
            const targetPort = graphState.ports.find(p => p.id === node.target_port_id);

            if (!sourcePort || !targetPort) return null;

            const sourceContainer = graphState.containers.find(c => c.id === sourcePort.container_id);
            const targetContainer = graphState.containers.find(c => c.id === targetPort.container_id);

            if (!sourceContainer || !targetContainer) return null;
            // Visibility already checked by visibleNodes filter

            // Get dynamic port positions for both containers using display positions
            const sourceContainerType = inferContainerType(sourceContainer.entity_type, sourceContainer.metadata);
            const targetContainerType = inferContainerType(targetContainer.entity_type, targetContainer.metadata);

            const sourceDisplayPos = getDisplayPosition(sourceContainer);
            const targetDisplayPos = getDisplayPosition(targetContainer);

            const sourceContainerPos: ContainerPosition = {
              id: sourceContainer.id,
              x: sourceDisplayPos.x,
              y: sourceDisplayPos.y,
              width: sourceDisplayPos.width,
              height: sourceDisplayPos.height,
            };

            const targetContainerPos: ContainerPosition = {
              id: targetContainer.id,
              x: targetDisplayPos.x,
              y: targetDisplayPos.y,
              width: targetDisplayPos.width,
              height: targetDisplayPos.height,
            };

            const sourcePorts = getDynamicPortDefinitions(
              sourceContainerType,
              sourceContainer.id,
              sourceContainerPos,
              containerPositions,
              connections
            );

            const targetPorts = getDynamicPortDefinitions(
              targetContainerType,
              targetContainer.id,
              targetContainerPos,
              containerPositions,
              connections
            );

            // Find the actual port definitions using logical port IDs
            const sourceLogicalPortId = sourcePort.metadata?.portDefinitionId || sourcePort.id;
            const targetLogicalPortId = targetPort.metadata?.portDefinitionId || targetPort.id;

            const sourcePortDef = sourcePorts?.find(p => p.id === sourceLogicalPortId);
            const targetPortDef = targetPorts?.find(p => p.id === targetLogicalPortId);

            if (!sourcePortDef || !targetPortDef) return null;

            // Calculate port positions based on dynamic port positions
            const getPortCoords = (containerPos: ContainerPosition, portDef: typeof sourcePortDef) => {
              const isTopPort = portDef.id.includes('top');
              const isBottomPort = portDef.id.includes('bottom');

              let x = containerPos.x;
              let y = containerPos.y + containerPos.height * 0.5; // Default center

              switch (portDef.position) {
                case 'left':
                  x = containerPos.x;
                  if (isTopPort) y = containerPos.y + containerPos.height * 0.2;
                  else if (isBottomPort) y = containerPos.y + containerPos.height * 0.8;
                  break;
                case 'right':
                  x = containerPos.x + containerPos.width;
                  if (isTopPort) y = containerPos.y + containerPos.height * 0.2;
                  else if (isBottomPort) y = containerPos.y + containerPos.height * 0.8;
                  break;
                case 'top':
                  x = containerPos.x + containerPos.width / 2;
                  y = containerPos.y;
                  break;
                case 'bottom':
                  x = containerPos.x + containerPos.width / 2;
                  y = containerPos.y + containerPos.height;
                  break;
              }

              return { x, y };
            };

            const { x: x1, y: y1 } = getPortCoords(sourceContainerPos, sourcePortDef);
            const { x: x2, y: y2 } = getPortCoords(targetContainerPos, targetPortDef);

            const relationType = sourcePort.direction === 'parent' && targetPort.direction === 'child'
              ? (sourcePort.entity_type === 'track' && targetPort.entity_type === 'roadmap_item'
                  ? 'hierarchy'
                  : sourcePort.entity_type === 'roadmap_item' && targetPort.entity_type === 'roadmap_item'
                  ? 'composition'
                  : 'hierarchy')
              : sourcePort.entity_type === 'offshoot' || targetPort.entity_type === 'offshoot'
              ? 'ideation'
              : sourcePort.entity_type === 'roadmap_item' && targetPort.entity_type === 'roadmap_item'
              ? 'dependency'
              : 'reference';

            const visualStyle = getRelationshipVisualStyle(relationType, node.source_generated);
            const isHovered = hoveredNode?.id === node.id;
            const isSelected = selectedNode?.id === node.id;

            // Create curved path
            const dx = x2 - x1;
            const dy = y2 - y1;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Bezier curve control points based on port directions
            let path: string;
            let hitPath: string;

            if (sourcePortDef.position === 'right' && targetPortDef.position === 'left') {
              // Right to left: horizontal curve
              const curveDistance = Math.min(distance * 0.5, 100);
              path = `M ${x1} ${y1} C ${x1 + curveDistance} ${y1}, ${x2 - curveDistance} ${y2}, ${x2} ${y2}`;
              hitPath = path;
            } else if (sourcePortDef.position === 'bottom' && targetPortDef.position === 'top') {
              // Bottom to top: vertical curve
              const curveDistance = Math.min(distance * 0.5, 100);
              path = `M ${x1} ${y1} C ${x1} ${y1 + curveDistance}, ${x2} ${y2 - curveDistance}, ${x2} ${y2}`;
              hitPath = path;
            } else {
              // Default: curved line
              const curveDistance = Math.min(distance * 0.3, 50);
              path = `M ${x1} ${y1} C ${x1 + dx * 0.3} ${y1 + dy * 0.3}, ${x2 - dx * 0.3} ${y2 - dy * 0.3}, ${x2} ${y2}`;
              hitPath = path;
            }

            // Calculate midpoint for arrow (approximate center of bezier curve)
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            // Calculate arrow angle at midpoint
            const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

            return (
              <g key={node.id}>
                {/* Invisible hit area for easier selection */}
                <path
                  d={hitPath}
                  stroke="transparent"
                  strokeWidth={12 / viewport.scale}
                  fill="none"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleNodeHover(e, node)}
                  onMouseLeave={handleNodeLeave}
                  onClick={(e) => handleNodeClick(e, node)}
                />
                {/* Visible curved line */}
                <path
                  d={path}
                  stroke={isSelected ? '#ef4444' : isHovered ? '#60a5fa' : visualStyle.color}
                  strokeWidth={(isSelected || isHovered ? visualStyle.strokeWidth + 1 : visualStyle.strokeWidth) / viewport.scale}
                  strokeDasharray={visualStyle.dashArray ? `${parseFloat(visualStyle.dashArray.split(',')[0]) / viewport.scale},${parseFloat(visualStyle.dashArray.split(',')[1]) / viewport.scale}` : undefined}
                  fill="none"
                  pointerEvents="none"
                />
                {/* Direction arrow at midpoint */}
                {!node.source_generated && ( // Only show arrow for manual connections
                  <g transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
                    <polygon
                      points="-4,-3 4,0 -4,3"
                      fill={isSelected ? '#ef4444' : isHovered ? '#60a5fa' : visualStyle.color}
                      stroke="none"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Ghost line for relationship creation */}
        {relationshipSource && relationshipGhostLine && (
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 5 }}
          >
            <line
              x1={relationshipSource.x + relationshipSource.width / 2}
              y1={relationshipSource.y + relationshipSource.height / 2}
              x2={relationshipGhostLine.x}
              y2={relationshipGhostLine.y}
              stroke="#10b981"
              strokeWidth={3 / viewport.scale}
              strokeDasharray={`${10 / viewport.scale},${5 / viewport.scale}`}
              opacity={0.6}
            />
          </svg>
        )}

        {/* Port connection preview line */}
        {portConnectionSource && portConnectionPreview && (() => {
          const sourceContainer = graphState?.containers.find(c => c.id === portConnectionSource.containerId);
          if (!sourceContainer) return null;

          // Get dynamic port position for the source port
          const sourceContainerType = inferContainerType(sourceContainer.entity_type, sourceContainer.metadata);
          const sourceContainerPos: ContainerPosition = {
            id: sourceContainer.id,
            x: sourceContainer.x,
            y: sourceContainer.y,
            width: sourceContainer.width,
            height: sourceContainer.height,
          };

          const sourcePorts = getDynamicPortDefinitions(
            sourceContainerType,
            sourceContainer.id,
            sourceContainerPos,
            containerPositions,
            connections
          );

          const sourcePortDef = sourcePorts?.find(p => p.id === portConnectionSource.portId);
          if (!sourcePortDef) return null;

          // Calculate source port coordinates
          const isTopPort = portConnectionSource.portId.includes('top');
          const isBottomPort = portConnectionSource.portId.includes('bottom');

          let sourceX = sourceContainer.x;
          let sourceY = sourceContainer.y + sourceContainer.height * 0.5;

          switch (sourcePortDef.position) {
            case 'left':
              sourceX = sourceContainer.x;
              if (isTopPort) sourceY = sourceContainer.y + sourceContainer.height * 0.2;
              else if (isBottomPort) sourceY = sourceContainer.y + sourceContainer.height * 0.8;
              break;
            case 'right':
              sourceX = sourceContainer.x + sourceContainer.width;
              if (isTopPort) sourceY = sourceContainer.y + sourceContainer.height * 0.2;
              else if (isBottomPort) sourceY = sourceContainer.y + sourceContainer.height * 0.8;
              break;
            case 'top':
              sourceX = sourceContainer.x + sourceContainer.width / 2;
              sourceY = sourceContainer.y;
              break;
            case 'bottom':
              sourceX = sourceContainer.x + sourceContainer.width / 2;
              sourceY = sourceContainer.y + sourceContainer.height;
              break;
          }

          return (
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 4 }}
            >
              <line
                x1={sourceX}
                y1={sourceY}
                x2={portConnectionPreview.x}
                y2={portConnectionPreview.y}
                stroke="#10b981"
                strokeWidth={3 / viewport.scale}
                strokeDasharray={`${10 / viewport.scale},${5 / viewport.scale}`}
                opacity={0.7}
              />
            </svg>
          );
        })()}

        {/* Drag preview for container creation */}
        {dragPreview && (
          <div
            className="absolute pointer-events-none border-2 border-blue-500 bg-blue-50/30 rounded-lg"
            style={{
              left: `${Math.min(dragPreview.startX, dragPreview.endX)}px`,
              top: `${Math.min(dragPreview.startY, dragPreview.endY)}px`,
              width: `${Math.abs(dragPreview.endX - dragPreview.startX)}px`,
              height: `${Math.abs(dragPreview.endY - dragPreview.startY)}px`,
              zIndex: 5,
            }}
          >
            <div className="p-3 text-sm text-blue-600 font-medium">
              New Container
            </div>
          </div>
        )}

        {/* Render containers */}
        {visibleContainers.map(container => {
          const isGhost = container.state === 'ghost';
          const isDragging = draggingContainer?.id === container.id;
          const isResizing = resizingContainer?.id === container.id;
          const isRelationshipSource = relationshipSource?.id === container.id;
          const isValidRelationshipTarget = relationshipCreationMode && relationshipSource && relationshipSource.id !== container.id;
          const isValidSubtrackParent = subtrackCreationMode && container.entity_type === 'track' && !isGhost;
          const isIntegrated = container.entity_id && container.entity_id.trim() !== '';

          // Infer container type and get visual treatment
          const containerType = inferContainerType(container.entity_type, container.metadata);
          const visualTreatment = getVisualTreatment(containerType);
          const shouldShowStatusBadge = showsStatusBadge(containerType);

          // Use helper function to get display position
          const displayPos = getDisplayPosition(container);
          const { x: displayX, y: displayY, width: displayWidth, height: displayHeight } = displayPos;

          // Determine styling based on state and type
          let borderColor = visualTreatment.borderColor;
          let backgroundColor = visualTreatment.backgroundColor;
          let additionalClasses = '';
          const isSelected = selectedContainer?.id === container.id;

          if (isRelationshipSource) {
            borderColor = '#10B981';
            backgroundColor = '#F0FDF4';
            additionalClasses = 'shadow-lg ring-4 ring-green-300 cursor-pointer';
          } else if (isValidRelationshipTarget) {
            borderColor = '#3B82F6';
            backgroundColor = '#EFF6FF';
            additionalClasses = 'shadow-lg cursor-pointer hover:ring-4 hover:ring-blue-300';
          } else if (isValidSubtrackParent) {
            borderColor = '#8B5CF6';
            backgroundColor = '#F5F3FF';
            additionalClasses = 'shadow-lg cursor-pointer hover:ring-4 hover:ring-indigo-300';
          } else if (isGhost) {
            borderColor = '#D1D5DB';
            backgroundColor = '#FFFFFF';
            additionalClasses = 'border-dashed cursor-pointer hover:bg-white/90 opacity-50';
          } else if (!canEdit) {
            borderColor = '#9CA3AF';
            backgroundColor = '#FFFFFF';
            additionalClasses = 'shadow-md cursor-not-allowed opacity-60';
          } else if (isSelected) {
            // Selected container gets enhanced visual treatment and can be dragged
            borderColor = visualTreatment.borderColor;
            backgroundColor = visualTreatment.backgroundColor;
            additionalClasses = 'shadow-xl ring-4 ring-blue-400 cursor-move opacity-100';
          } else {
            // Non-selected containers show pointer cursor (must double-click to select first)
            borderColor = visualTreatment.borderColor;
            backgroundColor = visualTreatment.backgroundColor;
            additionalClasses = 'shadow-md cursor-pointer opacity-100 hover:shadow-lg transition-shadow';
          }

          if (isDragging) {
            additionalClasses += ' !opacity-70';
          }

          return (
            <div
              key={container.id}
              id={`container-${container.id}`}
              className={`absolute rounded-lg ${additionalClasses}`}
              style={{
                left: `${displayX}px`,
                top: `${displayY}px`,
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                zIndex: isDragging ? 100 : isRelationshipSource ? 50 : 10,
                borderWidth: `${2 / viewport.scale}px`,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                borderStyle: isGhost ? 'dashed' : 'solid',
                transition: (isDragging || isResizing) ? 'none' : 'all 0.15s',
              }}
              onMouseDown={(e) => handleMouseDown(e, container)}
              onMouseUp={(e) => handleMouseUp(e, container)}
              onMouseEnter={(e) => handleContainerHover(e, container)}
              onMouseLeave={handleContainerLeave}
            >
              <div className="p-3 h-full flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  {/* Type Badge */}
                  <span className="text-sm">{visualTreatment.badgeIcon}</span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: visualTreatment.primaryColor }}
                  >
                    {visualTreatment.badgeLabel}
                  </span>
                  {isGhost && (
                    <span className="text-xs font-medium text-gray-500 ml-1">
                      (Ghost)
                    </span>
                  )}

                  {/* Task/Event Status Badge */}
                  {shouldShowStatusBadge && container.entity_type === 'roadmap_item' && container.entity_id && (() => {
                    const roadmapItem = roadmapItemsData.get(container.entity_id);
                    if (!roadmapItem) return null;

                    const isTask = roadmapItem.type === 'task';
                    const isEvent = roadmapItem.type === 'event';

                    if (!isTask && !isEvent) return null;

                    if (isTask) {
                      const status = deriveTaskStatus(roadmapItem.status);
                      const isCompleted = status === 'completed';

                      return (
                        <TaskStatusToggle
                          status={status}
                          isCompleted={isCompleted}
                          canEdit={canEdit && !isGhost}
                          onStatusChange={(newStatus) => handleTaskStatusChange(container.id, container.entity_id!, newStatus)}
                        />
                      );
                    } else {
                      const status = deriveEventStatus(
                        roadmapItem.metadata?.startsAt || roadmapItem.start_date,
                        roadmapItem.metadata?.endsAt || roadmapItem.end_date
                      );
                      const display = getEventStatusDisplay(status);
                      const isCompleted = status === 'completed';

                      return (
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${display.bgColor} ${display.color} border ${display.borderColor} ${isCompleted ? 'opacity-50' : ''}`}>
                          <span>📅</span>
                          <span className="text-[10px] font-medium">{display.label}</span>
                        </div>
                      );
                    }
                  })()}

                  <div className="ml-auto flex items-center gap-1">
                    {/* Collapse/Expand button for Track containers */}
                    {containerType === 'track' && (
                      <button
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHierarchyVisibility(toggleTrackCollapse(hierarchyVisibility, container.id));
                        }}
                        title={isTrackCollapsed(container.id, hierarchyVisibility) ? 'Expand subtracks' : 'Collapse subtracks'}
                      >
                        {isTrackCollapsed(container.id, hierarchyVisibility) ? (
                          <ChevronUp size={16} className="text-gray-600" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-600" />
                        )}
                      </button>
                    )}

                    {canEdit && !relationshipCreationMode && (
                      <>
                        <button
                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingContainer(container);
                          }}
                          title={isGhost ? "View / Activate" : "Edit"}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContainer(container.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </>
                    )}
                    {!relationshipCreationMode && (container.body || (!container.title && !container.body)) && (
                      <button
                        className="p-1 hover:bg-gray-100 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollapsedContainers(prev => {
                            const next = new Set(prev);
                            if (next.has(container.id)) {
                              next.delete(container.id);
                            } else {
                              next.add(container.id);
                            }
                            return next;
                          });
                        }}
                      >
                        {collapsedContainers.has(container.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {!collapsedContainers.has(container.id) && (
                  <>
                    <InlineContainerEditor
                      containerId={container.id}
                      containerType={containerType}
                      title={container.title || ''}
                      body={container.body || ''}
                      isGhost={isGhost}
                      canEdit={canEdit}
                      onSave={(title, body) => handleInlineContentSave(container.id, title, body)}
                    />

                    {/* Event date display */}
                    {containerType === 'event' && container.entity_type === 'roadmap_item' && container.entity_id && (() => {
                      const roadmapItem = roadmapItemsData.get(container.entity_id);
                      if (!roadmapItem) return null;

                      return (
                        <EventDateDisplay
                          startDate={roadmapItem.metadata?.startsAt || roadmapItem.start_date}
                          endDate={roadmapItem.metadata?.endsAt || roadmapItem.end_date}
                          isGhost={isGhost}
                        />
                      );
                    })()}

                    {!container.title && !container.body && containerType !== 'note' && containerType !== 'idea' && (
                      <div className={`text-sm ${isGhost ? 'text-gray-500' : 'text-gray-900'}`}>
                        {getEntityLabel(container)}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Render Ports if container supports them (not on ghost containers) */}
              {!isGhost && canHavePorts(containerType) && (() => {
                // Use dynamic port positioning based on connected containers
                const containerPos: ContainerPosition = {
                  id: container.id,
                  x: displayX,
                  y: displayY,
                  width: displayWidth,
                  height: displayHeight,
                };

                const ports = getDynamicPortDefinitions(
                  containerType,
                  container.id,
                  containerPos,
                  containerPositions,
                  connections
                );

                if (!ports) return null;

                const isSourceContainer = portConnectionSource?.containerId === container.id;
                const canBeTarget = portConnectionSource && portConnectionSource.containerId !== container.id;

                // Calculate available ports based on relative position to source container
                let availablePortIds: string[] = [];
                if (canBeTarget && portConnectionSource) {
                  // Find the source container position
                  const sourceContainer = visibleContainers.find(c => c.id === portConnectionSource.containerId);
                  if (sourceContainer) {
                    const sourceDisplayPos = getDisplayPosition(sourceContainer);
                    const sourceContainerPos: ContainerPosition = {
                      id: sourceContainer.id,
                      x: sourceDisplayPos.x,
                      y: sourceDisplayPos.y,
                      width: sourceDisplayPos.width,
                      height: sourceDisplayPos.height,
                    };
                    const sourceType = inferContainerType(sourceContainer.entity_type, sourceContainer.metadata);
                    availablePortIds = getAvailablePortsForTarget(sourceContainerPos, containerPos, sourceType);
                  }
                }

                return ports.map((port) => {
                  // Determine port availability:
                  // - If no source selected yet: any port can be clicked to start connection
                  // - If source selected: depends on source port type
                  //   - If source is output: target must be input in correct position
                  //   - If source is input: target must be output in correct position
                  let isPortAvailable = true;
                  if (!portConnectionSource) {
                    // No source selected - any port can be clicked to start
                    isPortAvailable = true;
                  } else if (canBeTarget) {
                    // Source selected - check compatibility based on source port type
                    if (portConnectionSource.portType === 'output') {
                      // Source is output, target must be input
                      isPortAvailable = port.type === 'input' && availablePortIds.includes(port.id);
                    } else {
                      // Source is input, target must be output
                      isPortAvailable = port.type === 'output' && availablePortIds.includes(port.id);
                    }
                  } else {
                    // This is the source container
                    isPortAvailable = false;
                  }

                  return (
                    <ContainerPort
                      key={port.id}
                      port={port}
                      containerId={container.id}
                      containerWidth={displayWidth}
                      containerHeight={displayHeight}
                      isConnectionMode={relationshipCreationMode}
                      isSourcePort={isSourceContainer && portConnectionSource.portId === port.id}
                      isValidTarget={canBeTarget && port.type === 'input' && portConnectionSource.portType === 'output' && isPortAvailable}
                      isAvailable={isPortAvailable}
                      canEdit={canEdit}
                      scale={viewport.scale}
                      isContainerSelected={selectedContainer?.id === container.id}
                      onPortClick={handlePortClick}
                      onPortDoubleClick={handlePortDoubleClick}
                    />
                  );
                });
              })()}

              {/* Resize Handle (bottom-right corner) - only visible when selected */}
              {!isGhost && canEdit && !relationshipCreationMode && isSelected && (
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-blue-500 rounded-tl opacity-50 hover:opacity-100 transition-opacity"
                  style={{
                    zIndex: 200,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingContainer({
                      id: container.id,
                      startWidth: container.width,
                      startHeight: container.height,
                      startX: e.clientX,
                      startY: e.clientY,
                    });
                  }}
                  title="Drag to resize"
                />
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* Container Hover Preview */}
      {hoveredContainer && hoveredMetadata && hoverPosition && !hoveredNode && (
        <ContainerHoverPreview
          container={hoveredContainer}
          position={hoverPosition}
          title={hoveredMetadata.title}
          sourceLabel={hoveredMetadata.sourceLabel}
          sourceIcon={hoveredMetadata.sourceIcon}
        />
      )}

      {/* Node Hover Preview */}
      {hoveredNode && hoveredNodeMetadata && hoveredNodePosition && (
        <NodeHoverPreview
          relationshipLabel={hoveredNodeMetadata.relationshipLabel}
          directionLabel={hoveredNodeMetadata.directionLabel}
          isAutoGenerated={hoveredNodeMetadata.isAutoGenerated}
          position={hoveredNodePosition}
        />
      )}

      {/* Container Inspector */}
      {selectedContainer && !selectedNode && graphState && graphState.workspace && (
        <ContainerInspector
          container={selectedContainer}
          metadata={selectedMetadata}
          onClose={handleCloseInspector}
          onRefresh={fetchGraph}
          workspaceData={{
            context: {
              userId: user!.id,
              workspaceId: graphState.workspace.id,
              timestamp: new Date().toISOString(),
              workspace: graphState.workspace,
              currentLock: graphState.lock,
              containers: graphState.containers,
              nodes: graphState.nodes,
              ports: graphState.ports,
              references: graphState.references,
            },
          }}
        />
      )}

      {/* Node Inspector */}
      {selectedNode && selectedNodeMetadata && (
        <NodeInspector
          metadata={selectedNodeMetadata}
          createdAt={selectedNode.created_at}
          nodeId={selectedNode.id}
          canEdit={canEdit}
          onClose={handleCloseNodeInspector}
          onDelete={handleDeleteNode}
        />
      )}

      {/* Relationship Type Selector */}
      {showRelationshipTypeSelector && (
        <RelationshipTypeSelector
          position={relationshipTypeSelectorPosition}
          onSelect={handleRelationshipTypeSelect}
          onCancel={handleCancelRelationshipCreation}
        />
      )}
      </div>
      {/* End Main Canvas Area */}

      {/* Modals - Outside canvas area for proper z-index */}
      {/* Delete Container Confirmation */}
      <ConfirmDialog
        isOpen={deleteContainerId !== null}
        onClose={() => setDeleteContainerId(null)}
        onConfirm={confirmDeleteContainer}
        title="Delete Container"
        message="Are you sure you want to delete this container? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Edit Container Modal */}
      {editingContainer && (
        <EditContainerModal
          containerId={editingContainer.id}
          initialTitle={editingContainer.title || ''}
          initialBody={editingContainer.body || ''}
          isGhost={editingContainer.state === 'ghost'}
          onSave={(title, body) => handleUpdateContainer(editingContainer.id, title, body)}
          onActivate={editingContainer.state === 'ghost' ? () => handleActivateGhost(editingContainer.id) : undefined}
          onClose={() => setEditingContainer(null)}
        />
      )}

      {/* Track Name Prompt Modal */}
      <TrackNamePrompt
        isOpen={showTrackNamePrompt}
        title="Create Track"
        placeholder="Enter track name..."
        onConfirm={handleTrackNameConfirm}
        onCancel={() => {
          setShowTrackNamePrompt(false);
          setTrackCreationError(null);
        }}
        error={trackCreationError}
      />

      {/* Subtrack Name Prompt Modal */}
      <TrackNamePrompt
        isOpen={showSubtrackNamePrompt}
        title={`Create Subtrack under "${subtrackParent?.title || 'Track'}"`}
        placeholder="Enter subtrack name..."
        onConfirm={handleSubtrackNameConfirm}
        onCancel={() => {
          setShowSubtrackNamePrompt(false);
          setSubtrackCreationError(null);
          setSubtrackParent(null);
        }}
        error={subtrackCreationError}
      />
    </div>
  );
}
