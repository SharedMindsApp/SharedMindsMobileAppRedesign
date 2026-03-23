/**
 * Active Project Service
 * 
 * Manages user's active Guardrails project persistence in the database.
 * Replaces localStorage-based storage with database-backed storage for:
 * - Cross-device synchronization
 * - Server-side validation
 * - Better reliability
 */

import { supabase } from '../supabase';
import type { MasterProject } from '../guardrailsTypes';

export interface UserActiveProject {
  user_id: string;
  active_project_id: string | null;
  selected_at: string;
  updated_at: string;
}

/**
 * Get the user's active project from the database
 * Returns null if no active project is set
 */
export async function getActiveProject(userId: string): Promise<{
  activeProjectId: string | null;
  project: MasterProject | null;
} | null> {
  try {
    // Use the RPC function to get project data efficiently
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_active_project', {
      p_user_id: userId,
    });

    if (rpcError) {
      console.warn('[activeProjectService] RPC function failed, falling back to direct query:', rpcError);
      
      // If RPC fails (e.g., function doesn't exist yet or other error), fall back to direct query
      const { data, error } = await supabase
        .from('user_active_projects')
        .select('active_project_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine (user doesn't have active project yet)
        console.error('[activeProjectService] Failed to query user_active_projects:', error);
        // Return null instead of throwing - user just doesn't have an active project
        return { activeProjectId: null, project: null };
      }

      if (!data || !data.active_project_id) {
        return { activeProjectId: null, project: null };
      }

      // Fetch full project data
      const { data: project, error: projectError } = await supabase
        .from('master_projects')
        .select('*')
        .eq('id', data.active_project_id)
        .eq('is_archived', false)
        .maybeSingle();

      if (projectError || !project) {
        // Project might have been deleted or archived
        // Clear the active project silently
        try {
          await clearActiveProject(userId);
        } catch (clearError) {
          console.error('[activeProjectService] Failed to clear invalid active project:', clearError);
        }
        return { activeProjectId: null, project: null };
      }

      return {
        activeProjectId: project.id,
        project: project as MasterProject,
      };
    }

    // RPC returned data (returns TABLE, so it's an array)
    if (!rpcData || rpcData.length === 0) {
      return { activeProjectId: null, project: null };
    }

    const result = rpcData[0];
    
    // If active_project_id is null or project_data is null, user has no active project
    if (!result.active_project_id || !result.project_data) {
      return { activeProjectId: null, project: null };
    }

    return {
      activeProjectId: result.active_project_id,
      project: result.project_data as MasterProject,
    };
  } catch (error) {
    console.error('[activeProjectService] Error getting active project:', error);
    // Don't throw - return null so the app can continue without an active project
    return { activeProjectId: null, project: null };
  }
}

/**
 * Set the user's active project
 * Validates that the user has access to the project before setting it
 */
export async function setActiveProject(
  userId: string,
  projectId: string | null
): Promise<void> {
  try {
    // Verify authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('[activeProjectService] Authentication error:', authError);
      throw new Error(`Authentication error: ${authError.message}`);
    }
    
    if (!authUser || authUser.id !== userId) {
      console.error('[activeProjectService] User ID mismatch:', {
        authUserId: authUser?.id,
        providedUserId: userId,
      });
      throw new Error('User ID mismatch - authentication required');
    }
  } catch (authCheckError) {
    console.error('[activeProjectService] Failed to verify authentication:', authCheckError);
    throw authCheckError;
  }

  try {
    // If setting to null, just upsert with null (clears active project but keeps row)
    if (projectId === null) {
      const { data, error } = await supabase
        .from('user_active_projects')
        .upsert(
          {
            user_id: userId,
            active_project_id: null,
            selected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select();

      if (error) {
        console.error('[activeProjectService] Failed to clear active project:', {
          message: error.message,
          code: error.code,
          hint: error.hint,
          userId,
        });
        throw new Error(`Failed to clear active project: ${error.message}${error.hint ? ` (${error.hint})` : ''}`);
      }

      return;
    }

    // Validate that user has access to the project
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_users')
      .select('master_project_id')
      .eq('user_id', userId)
      .eq('master_project_id', projectId)
      .is('archived_at', null)
      .maybeSingle();

    if (accessError) {
      console.error('[activeProjectService] Error checking project access:', accessError);
      throw new Error(`Failed to verify project access: ${accessError.message}`);
    }

    if (!projectAccess) {
      throw new Error('You do not have access to this project');
    }

    // Verify project exists and is not archived
    const { data: project, error: projectError } = await supabase
      .from('master_projects')
      .select('id')
      .eq('id', projectId)
      .eq('is_archived', false)
      .maybeSingle();

    if (projectError) {
      console.error('[activeProjectService] Error verifying project:', projectError);
      throw new Error(`Failed to verify project: ${projectError.message}`);
    }

    if (!project) {
      throw new Error('Project not found or has been archived');
    }

    // Upsert the active project
    const { data, error } = await supabase
      .from('user_active_projects')
      .upsert(
        {
          user_id: userId,
          active_project_id: projectId,
          selected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select();

    if (error) {
      console.error('[activeProjectService] Failed to upsert active project:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
        projectId,
      });
      throw new Error(`Failed to set active project: ${error.message}${error.hint ? ` (${error.hint})` : ''}`);
    }
  } catch (error) {
    console.error('[activeProjectService] Error setting active project:', error);
    throw error;
  }
}

/**
 * Clear the user's active project (set to null)
 */
export async function clearActiveProject(userId: string): Promise<void> {
  await setActiveProject(userId, null);
}

/**
 * Migrate active project from localStorage to database
 * Called during initialization if localStorage has data but database doesn't
 */
export async function migrateActiveProjectFromLocalStorage(
  userId: string,
  projectId: string | null,
  project: MasterProject | null
): Promise<void> {
  if (!projectId || !project) {
    return;
  }

  try {
    // Check if user already has an active project in database
    const existing = await getActiveProject(userId);
    
    // If database already has a project, don't overwrite (database is source of truth)
    if (existing?.activeProjectId) {
      console.log('[activeProjectService] Database already has active project, skipping migration');
      return;
    }

    // Validate access before migrating
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_users')
      .select('master_project_id')
      .eq('user_id', userId)
      .eq('master_project_id', projectId)
      .is('archived_at', null)
      .maybeSingle();

    if (accessError || !projectAccess) {
      console.warn('[activeProjectService] User does not have access to localStorage project, skipping migration');
      return;
    }

    // Verify project still exists and is not archived
    const { data: projectExists, error: projectError } = await supabase
      .from('master_projects')
      .select('id')
      .eq('id', projectId)
      .eq('is_archived', false)
      .maybeSingle();

    if (projectError || !projectExists) {
      console.warn('[activeProjectService] localStorage project no longer exists, skipping migration');
      return;
    }

    // Migrate to database
    await setActiveProject(userId, projectId);
    console.log('[activeProjectService] Successfully migrated active project from localStorage to database');
  } catch (error) {
    console.error('[activeProjectService] Error migrating active project:', error);
    // Don't throw - migration failure shouldn't block app initialization
  }
}
