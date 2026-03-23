/**
 * Phase 8C: RootRedirect Component
 * FIXED: Removed redundant auth check - now relies on AuthContext
 * 
 * Makes / a redirect-only route.
 * - Authenticated users → /dashboard
 * - Unauthenticated users → /auth/login
 * 
 * Mobile devices: Ensures authenticated mobile users always go to /dashboard on initial load
 * 
 * No UI is rendered at / - it's purely a routing decision.
 */

import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../core/auth/AuthProvider';

export function RootRedirect() {
  const { user, loading } = useAuth(); // Use AuthContext instead of doing our own check
  const isAuthenticated = !!user;

  // Show minimal loading during auth check (handled by AuthContext)
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
        </div>
      </div>
    );
  }

  // Phase 8C: Redirect based on auth state from AuthContext
  // Mobile and desktop: Always redirect authenticated users to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Phase 8C: Unauthenticated users always go to login
  return <Navigate to="/auth/login" replace />;
}


