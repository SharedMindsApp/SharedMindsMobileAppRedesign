import { BrowserRouter, Navigate, Route, Routes, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { CoreDataProvider } from './data/CoreDataContext';
import { SessionsPage } from './features/sessions/SessionsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ActiveSessionPage } from './features/sessions/ActiveSessionPage';
import { JoinSessionPage } from './features/sessions/JoinSessionPage';
import { SessionSummaryPage } from '../components/sessions/SessionSummaryPage';
import { ConnectionsPage } from './features/connections/ConnectionsPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { OnboardingModal } from './features/onboarding/OnboardingModal';
import { ProgressPage } from './features/progress/ProgressPage';
import { TasksPage } from './features/tasks/TasksPage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { PantryPage } from './features/pantry/PantryPage';
import { JournalPage } from './features/journal/JournalPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AuthProvider as LegacyAuthProvider } from '../contexts/AuthContext';
import { AuthPage } from './auth/AuthPage';
import { Layout } from '../components/Layout';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminUsers } from '../components/admin/AdminUsers';
import { AdminAnalytics } from '../components/admin/AdminAnalytics';
import { AdminLogs } from '../components/admin/AdminLogs';
import { AdminSettings } from '../components/admin/AdminSettings';
import { UIPreferencesProvider } from '../contexts/UIPreferencesContext';
import { ViewAsProvider } from '../contexts/ViewAsContext';
import { ActiveDataProvider } from '../contexts/ActiveDataContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ActiveProjectProvider } from '../contexts/ActiveProjectContext';
import { RegulationProvider } from '../contexts/RegulationContext';
import { FocusSessionProvider } from '../contexts/FocusSessionContext';

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
      location.pathname === '/home' ||
      location.pathname === '/dashboard' ||
      location.pathname === '/today' ||
      location.pathname === '/progress' ||
      location.pathname === '/sessions' ||
      location.pathname.startsWith('/join/');

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
  const { user, loading, profileReady, isAdmin, profile, refreshProfile } = useAuth();

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

  // Show onboarding for new users once profile is loaded
  if (profileReady && profile && profile.onboarding_completed === false) {
    return <OnboardingModal onComplete={refreshProfile} />;
  }

  return (
    <CoreDataProvider>
      <BrowserRouter>
        <RoutePersistence />
        <Routes>
          <Route path="/" element={<Layout><Outlet /></Layout>}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="dashboard" element={<Navigate to="/home" replace />} />
            <Route path="home" element={<DashboardPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="session/:sessionId" element={<ActiveSessionPage />} />
            <Route path="session/:sessionId/summary" element={<SessionSummaryPage />} />
            <Route path="join/:joinCode" element={<JoinSessionPage />} />
            <Route path="connections" element={<ConnectionsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/:userId" element={<ProfilePage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="today" element={<Navigate to="/progress" replace />} />
            <Route path="check-ins" element={<Navigate to="/home" replace />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route
              path="pantry/*"
              element={
                !profileReady
                  ? null
                  : isAdmin
                  ? <PantryPage />
                  : <Navigate to="/sessions" replace />
              }
            />
            <Route
              path="journal"
              element={
                !profileReady
                  ? null
                  : isAdmin
                  ? <JournalPage />
                  : <Navigate to="/sessions" replace />
              }
            />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/sessions" replace />} />
          </Route>

          {/* Admin section — uses its own AdminLayout, wrapped in legacy auth context */}
          <Route path="admin/*" element={
            !profileReady ? null : isAdmin ? (
              <LegacyAuthProvider>
                <Routes>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="logs" element={<AdminLogs />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Routes>
              </LegacyAuthProvider>
            ) : <Navigate to="/sessions" replace />
          } />
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
                  <FocusSessionProvider>
                    <AppContent />
                  </FocusSessionProvider>
                </RegulationProvider>
              </ActiveProjectProvider>
            </UIPreferencesProvider>
          </ActiveDataProvider>
        </ViewAsProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
