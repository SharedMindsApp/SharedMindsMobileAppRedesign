import { BrowserRouter, Navigate, Route, Routes, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { CoreDataProvider } from './data/CoreDataContext';
import { SessionsPage } from './features/sessions/SessionsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ActiveSessionPage } from './features/sessions/ActiveSessionPage';
import { JoinSessionPage } from './features/sessions/JoinSessionPage';
import { SessionSummaryPage } from '../components/sessions/SessionSummaryPage';
import { ConnectionsPage } from './features/connections/ConnectionsPage';
import { MembersDirectoryPage } from './features/people/MembersDirectoryPage';
import { MessagesPage } from './features/messages/MessagesPage';
import { MessageThreadPage } from './features/messages/MessageThreadPage';
import { CommunityFeedPage } from './features/community/CommunityFeedPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { ProfileSettingsPage } from './features/profile/ProfileSettingsPage';
import { OnboardingModal } from './features/onboarding/OnboardingModal';
import { ProgressPage } from './features/progress/ProgressPage';
import { TasksPage } from './features/tasks/TasksPage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { ProjectDetailPage } from './features/projects/ProjectDetailPage';
import { AcceptInvitePage } from './features/projects/AcceptInvitePage';
import { ReflectionPage } from './features/reflection/ReflectionPage';
// CalendarPage was removed — /sessions is now the calendar surface.
import { PantryPage } from './features/pantry/PantryPage';
import { JournalPage } from './features/journal/JournalPage';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AuthProvider as LegacyAuthProvider } from '../contexts/AuthContext';
import { AuthPage } from './auth/AuthPage';
import { Layout } from '../components/Layout';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminUsers } from '../components/admin/AdminUsers';
import { AdminAnalytics } from '../components/admin/AdminAnalytics';
import { AdminLogs } from '../components/admin/AdminLogs';
import { AdminSettings } from '../components/admin/AdminSettings';
import { AdminRecurringSessions } from '../components/admin/AdminRecurringSessions';
import { AdminModerationQueue } from '../components/admin/AdminModerationQueue';
import { UIPreferencesProvider } from '../contexts/UIPreferencesContext';
import { ViewAsProvider } from '../contexts/ViewAsContext';
import { ActiveDataProvider } from '../contexts/ActiveDataContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ActiveProjectProvider } from '../contexts/ActiveProjectContext';
import { RegulationProvider } from '../contexts/RegulationContext';
import { FocusSessionProvider } from '../contexts/FocusSessionContext';
import { MessagingDockProvider } from './features/messages/MessagingDockContext';

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

    // "Generic entry" = the *initial* landing path that the router redirects
    // away from on its own (e.g. `/` -> Navigate to /home). Only on these do
    // we attempt to restore the previously-stored route, so a refresh on any
    // real page (/sessions, /admin, /profile/xyz, etc.) preserves that page
    // instead of bouncing the user back to a different last-visited page.
    const isGenericEntryRoute = location.pathname === '/';

    // Restore the stored route only if we just mounted on `/` AND we haven't
    // already done so this session.
    if (!hasRestoredRef.current && isGenericEntryRoute) {
      const elapsed = Date.now() - mountTimeRef.current;

      if (elapsed < ROUTE_RESTORE_WINDOW_MS) {
        const storedRoute = getStoredCoreRoute();
        if (storedRoute && storedRoute !== currentRoute && storedRoute !== '/') {
          hasRestoredRef.current = true;
          navigate(storedRoute, { replace: true });
          return;
        }
      }
    }

    // Store every non-root route the user visits — this is the route we'll
    // restore on the next initial load.
    if (!isGenericEntryRoute) {
      hasRestoredRef.current = true;
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
            <Route path="people" element={<MembersDirectoryPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="messages/:conversationId" element={<MessageThreadPage />} />
            <Route path="community" element={<CommunityFeedPage />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="profile/:userId" element={<ProfilePage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="today" element={<Navigate to="/progress" replace />} />
            <Route path="check-ins" element={<Navigate to="/home" replace />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="invite/:token" element={<AcceptInvitePage />} />
            <Route path="reflection" element={<ReflectionPage />} />
            <Route path="calendar" element={<Navigate to="/sessions" replace />} />
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
            {/* Settings merged into /profile. Old links redirect to the Edit tab. */}
            <Route path="settings" element={<Navigate to="/profile?tab=edit" replace />} />
            <Route path="*" element={<Navigate to="/sessions" replace />} />
          </Route>

          {/* Admin section — uses its own AdminLayout, wrapped in legacy auth context */}
          <Route path="admin/*" element={
            !profileReady ? null : isAdmin ? (
              <LegacyAuthProvider>
                <Routes>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="moderation" element={<AdminModerationQueue />} />
                  <Route path="recurring-sessions" element={<AdminRecurringSessions />} />
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
                    <MessagingDockProvider>
                      <AppContent />
                    </MessagingDockProvider>
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
