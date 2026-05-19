import { createContext, useContext, ReactNode } from 'react';

/**
 * Placeholder for the pre-pivot active-project concept.
 *
 * The legacy guardrails system tracked an "active project" across the app —
 * users selected a project context and the rest of the UI scoped to it.
 * The new SharedMinds product doesn't have projects yet (planned MVP build).
 * Until that ships, this context returns null + no-op setters so any code
 * still referencing it doesn't crash.
 *
 * When the new lite Projects feature is built, we'll either replace this
 * file with a real implementation or remove the references entirely.
 */

interface PlaceholderProject {
  id: string;
  name: string;
}

interface ActiveProjectContextType {
  activeProjectId: string | null;
  activeProject: PlaceholderProject | null;
  setActiveProject: (project: PlaceholderProject | null) => Promise<void>;
  clearActiveProject: () => Promise<void>;
  loading: boolean;
}

const ActiveProjectContext = createContext<ActiveProjectContextType | undefined>(undefined);

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const value: ActiveProjectContextType = {
    activeProjectId: null,
    activeProject: null,
    setActiveProject: async () => {},
    clearActiveProject: async () => {},
    loading: false,
  };

  return (
    <ActiveProjectContext.Provider value={value}>
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject(): ActiveProjectContextType {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx) {
    throw new Error('useActiveProject must be used within ActiveProjectProvider');
  }
  return ctx;
}
