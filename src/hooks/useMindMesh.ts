/**
 * Mind Mesh V2 Data Hook
 *
 * Responsibilities:
 * - Fetch graph state from backend
 * - Execute intents via API
 * - Handle rollback
 * - Re-fetch after mutations
 *
 * Rules:
 * - No caching
 * - No optimistic updates
 * - Graph state always replaced, never merged
 * - Backend is single source of truth
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface MindMeshContainer {
  id: string;
  workspace_id: string;
  entity_id: string;
  entity_type: 'track' | 'roadmap_item' | 'side_project' | 'offshoot';
  state: 'ghost' | 'active';
  x: number;
  y: number;
  width: number;
  height: number;
  spawn_strategy: 'vertical_stack' | 'horizontal_row' | 'manual';
  layout_broken: boolean;
  user_positioned: boolean;
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string;
  title?: string;
  body?: string;
}

export interface MindMeshNode {
  id: string;
  workspace_id: string;
  source_port_id: string;
  target_port_id: string;
  source_generated: boolean;
  created_at: string;
}

export interface MindMeshPort {
  id: string;
  container_id: string;
  direction: 'parent' | 'child';
  entity_id: string;
  entity_type: 'track' | 'roadmap_item' | 'side_project' | 'offshoot';
  metadata?: {
    portDefinitionId?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface MindMeshCanvasLock {
  id: string;
  workspace_id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface MindMeshGraphState {
  containers: MindMeshContainer[];
  nodes: MindMeshNode[];
  ports: MindMeshPort[];
  visibility: Record<string, boolean>;
  lock: MindMeshCanvasLock | null;
}

export interface MindMeshIntent {
  type: 'MoveContainer' | 'ResizeContainer' | 'ActivateContainer' | 'DeactivateContainer' | 'DeleteContainer' | 'UpdateContainer' | 'CreateManualContainer' | 'CreateIntegratedTrack' | 'CreateIntegratedSubtrack' | 'CreateNode' | 'DeleteNode' | 'AcquireLock' | 'ReleaseLock' | 'UpdateTaskStatus' | 'MaterializeGhost';
  containerId?: string;
  newPosition?: { x: number; y: number };
  newDimensions?: { width: number; height: number };
  reason?: string;
  containerType?: 'idea' | 'note';
  position?: { x: number; y: number };
  title?: string;
  body?: string;
  name?: string;
  description?: string;
  color?: string;
  width?: number;
  height?: number;
  parentTrackId?: string;
  sourcePortId?: string;
  targetPortId?: string;
  nodeId?: string;
  entityId?: string;
  status?: string;
}

export interface OrchestrationResult {
  success: boolean;
  planId: string | null;
  executionResult: {
    success: boolean;
    mutatedEntities: string[];
    sideEffects: string[];
    failureCategory?: string;
    error?: string;
  } | null;
  planningErrors: string[];
  planningWarnings: string[];
  executionErrors: string[];
  executionWarnings: string[];
  failureStage?: 'planning' | 'execution';
  failureCategory?: string;
}

export interface RollbackResult {
  success: boolean;
  rolledBackPlanId: string | null;
  warnings: string[];
}

export interface ReconciliationError {
  isDuplicateError: boolean;
  duplicateCount: number;
  duplicates: Array<{
    entityType: string;
    entityId: string;
    containerCount: number;
    containerIds: string[];
  }>;
  workspaceId?: string;
}

export function useMindMesh(workspaceId: string | null) {
  const [graphState, setGraphState] = useState<MindMeshGraphState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconciliationError, setReconciliationError] = useState<ReconciliationError | null>(null);

  const fetchGraph = useCallback(async () => {
    if (!workspaceId) {
      setGraphState(null);
      return;
    }

    setLoading(true);
    setError(null);
    setReconciliationError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Phase 4: Network Resilience - Use networkRequest with timeout
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { networkRequest } = await import('../lib/networkRequest');
      
      const result = await networkRequest<{
        containers: any[];
        nodes: any[];
        ports: any[];
        visibility: Record<string, boolean>;
        lock: any;
        error?: string;
        details?: any;
      }>(
        `${supabaseUrl}/functions/v1/mindmesh-graph?workspaceId=${workspaceId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
          maxRetries: 2,
          context: { component: 'MindMesh', action: 'fetchGraph' },
        }
      );

      if (result.aborted) {
        throw new Error('Request was cancelled');
      }

      const response = result.response;
      const data = result.data;

      if (!response.ok) {
        // Check if this is a reconciliation error (duplicate containers)
        if (
          data?.error?.includes('data integrity') ||
          data?.error?.includes('Duplicate containers')
        ) {
          setReconciliationError({
            isDuplicateError: true,
            duplicateCount: data.details?.duplicateCount || 0,
            duplicates: data.details?.duplicates || [],
            workspaceId: data.details?.workspaceId,
          });
          throw new Error('Mind Mesh data integrity issue detected');
        }

        throw new Error(data?.error || 'Failed to fetch graph');
      }

      setGraphState({
        containers: data.containers || [],
        nodes: data.nodes || [],
        ports: data.ports || [],
        visibility: data.visibility || {},
        lock: data.lock || null,
      });
    } catch (err) {
      console.error('Error fetching graph:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setGraphState(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const executeIntent = useCallback(async (intent: MindMeshIntent): Promise<OrchestrationResult> => {
    if (!workspaceId) {
      throw new Error('No workspace ID');
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Phase 4: Network Resilience - Use networkRequest with timeout
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { networkRequest } = await import('../lib/networkRequest');
      
      const networkResult = await networkRequest<OrchestrationResult>(
        `${supabaseUrl}/functions/v1/mindmesh-intent`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspaceId,
            intent,
          }),
          timeout: 15000, // 15 second timeout for intent execution
          maxRetries: 2,
          context: { component: 'MindMesh', action: 'executeIntent' },
        }
      );

      if (networkResult.aborted) {
        throw new Error('Request was cancelled');
      }

      const result = networkResult.data;

      if (result.success) {
        await fetchGraph();
      } else {
        const planningErrors = result.planningErrors || [];
        const executionErrors = result.executionErrors || [];
        const errorMessage = result.error || result.message;

        setError(
          errorMessage ||
          planningErrors.concat(executionErrors).join(', ') ||
          'Intent execution failed'
        );
      }

      return result;
    } catch (err) {
      console.error('Error executing intent:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [workspaceId, fetchGraph]);

  const rollback = useCallback(async (): Promise<RollbackResult> => {
    if (!workspaceId) {
      throw new Error('No workspace ID');
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/mindmesh-rollback`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workspaceId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        await fetchGraph();
      } else {
        setError(result.warnings.join(', ') || 'Rollback failed');
      }

      return result;
    } catch (err) {
      console.error('Error rolling back:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [workspaceId, fetchGraph]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return {
    graphState,
    loading,
    error,
    reconciliationError,
    fetchGraph,
    executeIntent,
    rollback,
  };
}
