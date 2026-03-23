import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { UserRole } from '../contexts/AuthContext';
import { useAuth } from '../core/auth/AuthProvider';

interface RequireRoleProps {
  children: ReactNode;
  role: UserRole | UserRole[];
}

export function RequireRole({ children, role }: RequireRoleProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/auth/login" replace />;
  }

  const allowedRoles = Array.isArray(role) ? role : [role];
  const hasAccess = (profile as any).role && allowedRoles.includes((profile as any).role);

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
