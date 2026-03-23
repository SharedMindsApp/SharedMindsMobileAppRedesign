/**
 * Phase 1: Critical Load Protection - Added timeout protection
 * FIXED: Removed redundant auth check - now relies on AuthContext
 */

import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../core/auth/AuthProvider';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth(); // Use AuthContext instead of doing our own check
  const isAuthenticated = !!user;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f9] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}
