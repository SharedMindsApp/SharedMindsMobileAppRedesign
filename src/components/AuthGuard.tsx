/**
 * FIXED: Removed redundant auth check - now relies on AuthContext
 * AuthContext already handles auth state globally, so we just use it here
 */

import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../core/auth/AuthProvider';

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();
  const { user, loading } = useAuth(); // Use AuthContext instead of doing our own check
  const isAuthenticated = !!user;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Phase 8C: Always redirect to login after logout
    window.location.href = '/auth/login';
  };

  const handleGoToLogin = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  const handleGoHome = async () => {
    await supabase.auth.signOut();
    // Phase 8C: Always redirect to login (no landing page)
    window.location.href = '/auth/login';
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
          <button
            onClick={handleSignOut}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut size={16} className="mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Phase 8C: Always redirect unauthenticated users to /login
    return <Navigate to="/auth/login" replace />;
  }

  // Phase 8C: If authenticated user is on /login or /, redirect to dashboard
  if (location.pathname === '/auth/login' || location.pathname === '/') {
    // Always redirect authenticated users to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
