import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { setActiveProjectId as setADCProjectId } from '../state/activeDataContext';
import type { MasterProject } from '../lib/guardrailsTypes';
import { useAuth } from '../core/auth/AuthProvider';
import { supabase } from '../lib/supabase';
import {
  getActiveProject,
  setActiveProject as setActiveProjectInDb,
  clearActiveProject as clearActiveProjectInDb,
  migrateActiveProjectFromLocalStorage,
} from '../lib/guardrails/activeProjectService';

interface ActiveProjectContextType {
  activeProjectId: string | null;
  activeProject: MasterProject | null;
  setActiveProject: (project: MasterProject | null) => Promise<void>;
  clearActiveProject: () => Promise<void>;
  loading: boolean;
}

const ActiveProjectContext = createContext<ActiveProjectContextType | undefined>(undefined);

// Keep localStorage keys for migration and temporary cache
const STORAGE_KEY = 'guardrails_active_project_id';
const STORAGE_PROJECT_KEY = 'guardrails_active_project';

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Optimistically load from localStorage on initial mount for faster UI
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  const [activeProject, setActiveProjectState] = useState<MasterProject | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PROJECT_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('[ActiveProjectContext] Failed to parse stored project:', e);
        }
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const initializedUserIdRef = useRef<string | null>(null);

  // Reset state when user logs out (user becomes null)
  useEffect(() => {
    if (!user) {
      // User logged out - clear local state but DON'T clear database
      // The active project will persist in the database for next login
      setActiveProjectId(null);
      setActiveProjectState(null);
      setInitialized(false);
      initializedUserIdRef.current = null;
      setLoading(false);
      setADCProjectId(null, null);
      // Clear localStorage cache on logout (will be reloaded from DB on next login)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_PROJECT_KEY);
        localStorage.removeItem('active_project_user_id');
      }
    }
  }, [user]);

  // Load active project from database when user is available
  useEffect(() => {
    async function loadActiveProject() {
      // Only load if we have a user
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const currentUserId = user.id;

      // Check if we've already loaded for this user
      if (initializedUserIdRef.current === currentUserId && initialized) {
        setLoading(false);
        return;
      }

      // If user changed, reset state first (but keep optimistic localStorage load)
      if (initializedUserIdRef.current && initializedUserIdRef.current !== currentUserId) {
        // Different user - clear everything
        setActiveProjectId(null);
        setActiveProjectState(null);
        setInitialized(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_PROJECT_KEY);
          localStorage.removeItem('active_project_user_id');
        }
      }

      try {
        setLoading(true);

        // Always try database first (source of truth)
        const dbResult = await getActiveProject(currentUserId);

        if (dbResult?.activeProjectId && dbResult?.project) {
          // Database has the active project - use it (overrides localStorage)
          setActiveProjectId(dbResult.activeProjectId);
          setActiveProjectState(dbResult.project);
          setADCProjectId(dbResult.activeProjectId, dbResult.project.domain_id);

          // Update localStorage cache
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, dbResult.activeProjectId);
            localStorage.setItem(STORAGE_PROJECT_KEY, JSON.stringify(dbResult.project));
            localStorage.setItem('active_project_user_id', currentUserId);
          }
        } else {
          // Database doesn't have active project - check localStorage for migration
          if (typeof window !== 'undefined') {
            const storedId = localStorage.getItem(STORAGE_KEY);
            const storedProject = localStorage.getItem(STORAGE_PROJECT_KEY);
            const storedUserId = localStorage.getItem('active_project_user_id');

            // If we have localStorage data, validate and use it
            if (storedId && storedProject) {
              if (storedUserId && storedUserId !== currentUserId) {
                // Different user - clear this data
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(STORAGE_PROJECT_KEY);
                localStorage.removeItem('active_project_user_id');
                setActiveProjectId(null);
                setActiveProjectState(null);
                setADCProjectId(null, null);
              } else {
                // Same user or unmarked (assume current user) - validate and use
                try {
                  const parsedProject = JSON.parse(storedProject);

                  // Verify the project still exists, isn't archived, and user has access
                  const { data: projectExists, error: projectError } = await supabase
                    .from('master_projects')
                    .select('id')
                    .eq('id', parsedProject.id)
                    .eq('is_archived', false)
                    .maybeSingle();

                  if (projectExists && !projectError) {
                    // Project exists - verify user has access via project_users
                    const { data: accessCheck } = await supabase
                      .from('project_users')
                      .select('master_project_id')
                      .eq('user_id', currentUserId)
                      .eq('master_project_id', parsedProject.id)
                      .is('archived_at', null)
                      .maybeSingle();

                    if (accessCheck) {
                      // Project exists and user has access - use it and migrate to database
                      setActiveProjectId(parsedProject.id);
                      setActiveProjectState(parsedProject);
                      setADCProjectId(parsedProject.id, parsedProject.domain_id);
                      localStorage.setItem('active_project_user_id', currentUserId);

                      // Try to save to database (non-blocking, will create or update)
                      setActiveProjectInDb(currentUserId, parsedProject.id).catch(err => {
                        console.error('[ActiveProjectContext] Failed to save active project to database:', err);
                      });
                    } else {
                      // User doesn't have access anymore - clear
                      localStorage.removeItem(STORAGE_KEY);
                      localStorage.removeItem(STORAGE_PROJECT_KEY);
                      localStorage.removeItem('active_project_user_id');
                      setActiveProjectId(null);
                      setActiveProjectState(null);
                      setADCProjectId(null, null);
                    }
                  } else {
                    // Project doesn't exist or was archived - clear localStorage
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(STORAGE_PROJECT_KEY);
                    localStorage.removeItem('active_project_user_id');
                    setActiveProjectId(null);
                    setActiveProjectState(null);
                    setADCProjectId(null, null);
                  }
                } catch (e) {
                  console.error('[ActiveProjectContext] Failed to parse localStorage project:', e);
                  // Clear invalid localStorage
                  localStorage.removeItem(STORAGE_KEY);
                  localStorage.removeItem(STORAGE_PROJECT_KEY);
                  localStorage.removeItem('active_project_user_id');
                  setActiveProjectId(null);
                  setActiveProjectState(null);
                  setADCProjectId(null, null);
                }
              }
            } else {
              // No active project anywhere
              setActiveProjectId(null);
              setActiveProjectState(null);
              setADCProjectId(null, null);
            }
          } else {
            // No localStorage - ensure state is cleared
            setActiveProjectId(null);
            setActiveProjectState(null);
            setADCProjectId(null, null);
          }
        }
      } catch (error) {
        console.error('[ActiveProjectContext] Error loading active project:', error);
        // On error, keep localStorage cache if available (for same user)
        if (typeof window !== 'undefined') {
          const storedUserId = localStorage.getItem('active_project_user_id');
          const storedId = localStorage.getItem(STORAGE_KEY);
          const storedProject = localStorage.getItem(STORAGE_PROJECT_KEY);
          if (storedId && storedProject && (storedUserId === currentUserId || !storedUserId)) {
            try {
              const parsedProject = JSON.parse(storedProject);
              setActiveProjectId(parsedProject.id);
              setActiveProjectState(parsedProject);
              setADCProjectId(parsedProject.id, parsedProject.domain_id);
              localStorage.setItem('active_project_user_id', currentUserId);
            } catch (e) {
              console.error('[ActiveProjectContext] Failed to parse fallback project:', e);
            }
          }
        }
      } finally {
        setLoading(false);
        setInitialized(true);
        initializedUserIdRef.current = currentUserId;
      }
    }

    loadActiveProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user.id - track initialization internally

  // Sync ADC when project changes after initialization
  useEffect(() => {
    if (initialized && activeProject) {
      setADCProjectId(activeProject.id, activeProject.domain_id);
    } else if (initialized && !activeProject) {
      setADCProjectId(null, null);
    }
  }, [activeProject, initialized]);

  // Set active project (updates database and state)
  const setActiveProject = useCallback(async (project: MasterProject | null) => {
    if (!user?.id) {
      console.error('[ActiveProjectContext] Cannot set active project: User not authenticated');
      throw new Error('Cannot set active project: User not authenticated');
    }

    try {
      // Update database first (source of truth)
      await setActiveProjectInDb(user.id, project?.id || null);

      // Update local state
      setActiveProjectId(project?.id || null);
      setActiveProjectState(project);

      // Update localStorage cache
      if (typeof window !== 'undefined') {
        if (project) {
          localStorage.setItem(STORAGE_KEY, project.id);
          localStorage.setItem(STORAGE_PROJECT_KEY, JSON.stringify(project));
          localStorage.setItem('active_project_user_id', user.id);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_PROJECT_KEY);
          localStorage.setItem('active_project_user_id', user.id);
        }
      }

      // Sync to ADC
      if (project) {
        setADCProjectId(project.id, project.domain_id);
      } else {
        setADCProjectId(null, null);
      }
    } catch (error) {
      console.error('[ActiveProjectContext] Failed to set active project:', error);
      throw error; // Re-throw so UI can handle the error
    }
  }, [user?.id]);

  // Clear active project
  const clearActiveProject = useCallback(async () => {
    await setActiveProject(null);
  }, [setActiveProject]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      activeProjectId,
      activeProject,
      setActiveProject,
      clearActiveProject,
      loading,
    }),
    [activeProjectId, activeProject, setActiveProject, clearActiveProject, loading]
  );

  return (
    <ActiveProjectContext.Provider value={value}>
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject() {
  const context = useContext(ActiveProjectContext);
  if (context === undefined) {
    throw new Error('useActiveProject must be used within an ActiveProjectProvider');
  }
  return context;
}
