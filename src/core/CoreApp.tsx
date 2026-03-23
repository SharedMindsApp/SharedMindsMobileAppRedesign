import { BrowserRouter, Navigate, Route, Routes, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { CoreDataProvider } from './data/CoreDataContext';
import { TodayPage } from './features/today/TodayPage';
import { TasksPage } from './features/tasks/TasksPage';
import { CheckInsPage } from './features/checkins/CheckInsPage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { PantryPage } from './features/pantry/PantryPage';
import { JournalPage } from './features/journal/JournalPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AuthPage } from './auth/AuthPage';
import { Layout } from '../components/Layout';
import { UIPreferencesProvider } from '../contexts/UIPreferencesContext';
import { ViewAsProvider } from '../contexts/ViewAsContext';
import { ActiveDataProvider } from '../contexts/ActiveDataContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ActiveProjectProvider } from '../contexts/ActiveProjectContext';
import { RegulationProvider } from '../contexts/RegulationContext';

const LAST_ROUTE_STORAGE_KEY = 'sharedminds:last-core-route';
const ROUTE_RESTORE_WINDOW_MS = 3000; // Allow restoration within 3s of mount

function getStoredCoreRoute(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_ROUTE_STORAGE_KEY);
}

function RoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();
  const mountTimeRef = useRef(Date.now());
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    const currentRoute = `${location.pathname}${location.search}${location.hash}`;
    const isGenericEntryRoute =
      location.pathname === '/' ||
      location.pathname === '/dashboard' ||
      location.pathname === '/today';

    // Attempt to restore a stored route if we've landed on a generic page
    // within a short window after mount (handles auth redirects on refresh)
    if (!hasRestoredRef.current && isGenericEntryRoute) {
      const elapsed = Date.now() - mountTimeRef.current;

      if (elapsed < ROUTE_RESTORE_WINDOW_MS) {
        const storedRoute = getStoredCoreRoute();
        if (storedRoute && storedRoute !== currentRoute) {
          hasRestoredRef.current = true;
          navigate(storedRoute, { replace: true });
          return;
        }
      }
    }

    // Store the current route (skip generic entry routes to avoid overwriting
    // the real last page with a redirect destination)
    if (!isGenericEntryRoute) {
      hasRestoredRef.current = true; // We're on a real page, stop trying to restore
      window.localStorage.setItem(LAST_ROUTE_STORAGE_KEY, currentRoute);
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}

function AppContent() {
  const { user, loading, profileReady, canAccessPantry } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <CoreDataProvider>
      <BrowserRouter>
        <RoutePersistence />
        <Routes>
          <Route path="/" element={<Layout><Outlet /></Layout>}>
            <Route index element={<Navigate to="/today" replace />} />
            <Route path="dashboard" element={<Navigate to="/today" replace />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="check-ins" element={<CheckInsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route
              path="pantry/*"
              element={
                // Don't redirect until the profile has actually loaded —
                // otherwise the background fetchProfile race causes a premature
                // redirect to /today before canAccessPantry is known.
                !profileReady
                  ? null
                  : canAccessPantry
                  ? <PantryPage />
                  : <Navigate to="/today" replace />
              }
            />
            <Route path="journal" element={<JournalPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CoreDataProvider>
  );
}

export default function CoreApp() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ViewAsProvider>
          <ActiveDataProvider>
            <UIPreferencesProvider>
              <ActiveProjectProvider>
                <RegulationProvider>
                  <AppContent />
                </RegulationProvider>
              </ActiveProjectProvider>
            </UIPreferencesProvider>
          </ActiveDataProvider>
        </ViewAsProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
