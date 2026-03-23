/**
 * Mind Mesh Workspace Helper
 *
 * Ensures a workspace exists for a given project.
 * Creates one if it doesn't exist.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useMindMeshWorkspace(projectId: string | null) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setWorkspaceId(null);
      return;
    }

    async function ensureWorkspace() {
      setLoading(true);
      setError(null);

      try {
        const { data: existingWorkspace, error: queryError } = await supabase
          .from('mindmesh_workspaces')
          .select('id')
          .eq('master_project_id', projectId)
          .maybeSingle();

        if (queryError) {
          throw queryError;
        }

        if (existingWorkspace) {
          setWorkspaceId(existingWorkspace.id);
          return;
        }

        const { data: newWorkspace, error: insertError } = await supabase
          .from('mindmesh_workspaces')
          .insert({
            master_project_id: projectId,
          })
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        setWorkspaceId(newWorkspace.id);
      } catch (err) {
        console.error('Error ensuring workspace:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setWorkspaceId(null);
      } finally {
        setLoading(false);
      }
    }

    ensureWorkspace();
  }, [projectId]);

  return { workspaceId, loading, error };
}
