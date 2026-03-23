import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '../core/auth/AuthProvider';
import { supabase } from '../lib/supabase';

type GuestGuardProps = {
  children: React.ReactNode;
};

export function GuestGuard({ children }: GuestGuardProps) {
  const { user, loading: authLoading } = useAuth(); // Use AuthContext as single source of truth
  const [loading, setLoading] = useState(true);
  const [hasHousehold, setHasHousehold] = useState<boolean | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Check household only if authenticated
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!isAuthenticated) {
      setLoading(false);
      setHasHousehold(null);
      return;
    }

    // User is authenticated, check household
    const checkUserHousehold = async (userId: string) => {
      try {
        // Get user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (!profile) {
          setHasHousehold(false);
          setLoading(false);
          return;
        }

        // Check if user is a member of any household space (context_type = 'household')
        const { data: householdMembership } = await supabase
          .from('space_members')
          .select('space_id, spaces!inner(type)')
          .eq('user_id', profile.id)
          .eq('status', 'active')
          .eq('spaces.type', 'shared')
          .maybeSingle();

        setHasHousehold(!!householdMembership);
      } catch (error) {
        console.error('Error checking household:', error);
        setHasHousehold(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserHousehold(user.id);
  }, [isAuthenticated, authLoading, user?.id]);

  // Timeout handling
  useEffect(() => {
    if (!authLoading && loading) {
      const timeoutId = setTimeout(() => {
        setTimedOut(true);
        setLoading(false);
        setErrorMessage('Page load timed out. Please check your connection and try again.');
      }, 10000);

      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, loading]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    // Always redirect to login after logout
    window.location.replace('/auth/login');
  };

  const handleGoToLogin = () => {
    window.location.href = '/auth/login';
  };

  const handleGoHome = () => {
    // Phase 8C: Always redirect to login (no landing page)
    window.location.href = '/auth/login';
  };

  if (timedOut && errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
            <p className="text-gray-600">{errorMessage}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoToLogin}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Login
            </button>
            <button
              onClick={handleGoToLogin}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Go to Login
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-3">
              Need to clear your session?
            </p>
            <button
              onClick={handleSignOut}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut size={16} className="mr-2" />
              Clear Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Phase 8C: Authenticated users should not see guest pages
    if (hasHousehold) {
      return <Navigate to="/planner/calendar?view=month" replace />;
    } else {
      return <Navigate to="/onboarding/household" replace />;
    }
  }

  // Phase 8C: Unauthenticated users can access guest pages (login, signup, etc.)
  return <>{children}</>;
}
