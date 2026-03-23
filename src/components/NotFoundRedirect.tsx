/**
 * Phase 8B: NotFoundRedirect Component
 * 
 * Safe fallback for unmatched routes.
 * Redirects users back into the app shell instead of showing a blank screen.
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../core/auth/AuthProvider';
import { Dashboard } from './Dashboard';
import { Landing } from './Landing';

export function NotFoundRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Phase 8B: Log the unmatched route for debugging (dev only)
    if (import.meta.env.DEV) {
      console.warn(`[NotFoundRedirect] Unmatched route: ${location.pathname}`);
    }

    // Phase 8B: If user is authenticated, redirect to dashboard
    // Otherwise, redirect to landing page
    // This ensures users never see a blank screen
    if (user) {
      // Small delay to allow auth state to settle
      const timer = setTimeout(() => {
        if (location.pathname !== '/dashboard') {
          navigate('/dashboard', { replace: true });
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Not authenticated, redirect to landing
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

  // Phase 8B: Show appropriate content while redirecting
  // This prevents blank screen flash
  if (user) {
    return <Dashboard />;
  }

  return <Landing />;
}


