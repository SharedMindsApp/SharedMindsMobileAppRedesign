import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from './AuthContext';
import { setViewAsGetter } from './AuthContext';

interface ViewAsProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
}

interface ViewAsContextType {
  viewAsProfile: ViewAsProfile | null;
  isViewingAs: boolean;
  viewAsNeurotype: string | null;
  setViewAsUser: (userId: string | null) => Promise<void>;
  setViewAsRole: (role: UserRole | null) => void;
  setViewAsNeurotype: (neurotype: string | null) => void;
  clearViewAs: () => void;
}

const ViewAsContext = createContext<ViewAsContextType | undefined>(undefined);

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAsProfile, setViewAsProfile] = useState<ViewAsProfile | null>(null);
  const [viewAsRoleOnly, setViewAsRoleOnly] = useState<UserRole | null>(null);
  const [viewAsNeurotype, setViewAsNeurotypeState] = useState<string | null>(null);

  const setViewAsUser = async (userId: string | null) => {
    if (!userId) {
      setViewAsProfile(null);
      setViewAsRoleOnly(null);
      setViewAsNeurotypeState(null);
      localStorage.removeItem('viewAsUserId');
      localStorage.removeItem('viewAsRole');
      localStorage.removeItem('viewAsNeurotype');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setViewAsProfile(data);
        setViewAsRoleOnly(null);
        setViewAsNeurotypeState(null);
        localStorage.setItem('viewAsUserId', userId);
        localStorage.removeItem('viewAsRole');
        localStorage.removeItem('viewAsNeurotype');
      }
    } catch (error) {
      console.error('Error fetching view-as profile:', error);
    }
  };

  const setViewAsRole = (role: UserRole | null) => {
    if (!role) {
      setViewAsRoleOnly(null);
      setViewAsProfile(null);
      localStorage.removeItem('viewAsRole');
      localStorage.removeItem('viewAsUserId');
      return;
    }

    setViewAsRoleOnly(role);
    setViewAsProfile(null);
    localStorage.setItem('viewAsRole', role);
    localStorage.removeItem('viewAsUserId');
  };

  const setViewAsNeurotype = (neurotype: string | null) => {
    setViewAsNeurotypeState(neurotype);
    if (neurotype) {
      localStorage.setItem('viewAsNeurotype', neurotype);
    } else {
      localStorage.removeItem('viewAsNeurotype');
    }
  };

  const clearViewAs = () => {
    setViewAsProfile(null);
    setViewAsRoleOnly(null);
    setViewAsNeurotypeState(null);
    localStorage.removeItem('viewAsUserId');
    localStorage.removeItem('viewAsRole');
    localStorage.removeItem('viewAsNeurotype');
  };

  useEffect(() => {
    const savedUserId = localStorage.getItem('viewAsUserId');
    const savedRole = localStorage.getItem('viewAsRole') as UserRole | null;
    const savedNeurotype = localStorage.getItem('viewAsNeurotype');

    if (savedUserId) {
      setViewAsUser(savedUserId);
    } else if (savedRole) {
      setViewAsRole(savedRole);
    }

    if (savedNeurotype) {
      setViewAsNeurotypeState(savedNeurotype);
    }
  }, []);

  const isViewingAs = !!(viewAsProfile || viewAsRoleOnly);

  const effectiveProfile = viewAsProfile || (viewAsRoleOnly ? {
    id: 'view-as-role',
    user_id: 'view-as-role',
    email: null,
    full_name: `Viewing as ${viewAsRoleOnly}`,
    role: viewAsRoleOnly,
  } : null);

  useEffect(() => {
    setViewAsGetter(() => ({
      viewAsProfile: effectiveProfile,
      isViewingAs,
    }));
  }, [effectiveProfile, isViewingAs]);

  return (
    <ViewAsContext.Provider
      value={{
        viewAsProfile: effectiveProfile,
        isViewingAs,
        viewAsNeurotype,
        setViewAsUser,
        setViewAsRole,
        setViewAsNeurotype,
        clearViewAs,
      }}
    >
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const context = useContext(ViewAsContext);
  if (context === undefined) {
    throw new Error('useViewAs must be used within a ViewAsProvider');
  }
  return context;
}
