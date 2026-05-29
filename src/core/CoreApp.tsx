import { BrowserRouter, Navigate, Route, Routes, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, lazy, Suspense } from 'react';
import { CoreDataProvider } from './data/CoreDataContext';

// ── Eager: critical-path components that block initial render ──
// AuthPage shows for logged-out users (first paint!), OnboardingWizard
// shows for incomplete profiles. Layout is the chrome. SharedProjectPage
// is rendered without router for /shared/:token public links.
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AuthProvider as LegacyAuthProvider } from '../contexts/AuthContext';
import { AuthPage } from './auth/AuthPage';
import { Layout } from '../components/Layout';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { SharedProjectPage } from './features/projects/SharedProjectPage';

// ── Lazy: every authenticated route becomes its own chunk ──
// Each named-export gets the `m => ({ default: m.X })` adapter so it
// satisfies React.lazy's default-export contract. The user only pays
// the network cost for the route they land on. Modals + DailyMeeting
// further lazy-load inside their owning page chunks.
//
// Why this matters: before this change, /sessions cold-loaded ~1.5MB
// (~375KB gzipped) of JS containing every screen + the video stack.
// After, /sessions ships only what CalendarView + its immediate
// dependencies need; the rest streams in as the user navigates.

const SessionsPage          = lazy(() => import('./features/sessions/SessionsPage').then(m => ({ default: m.SessionsPage })));
const DashboardPage         = lazy(() => import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ActiveSessionPage     = lazy(() => import('./features/sessions/ActiveSessionPage').then(m => ({ default: m.ActiveSessionPage })));
const JoinSessionPage       = lazy(() => import('./features/sessions/JoinSessionPage').then(m => ({ default: m.JoinSessionPage })));
const SessionSummaryPage    = lazy(() => import('../components/sessions/SessionSummaryPage').then(m => ({ default: m.SessionSummaryPage })));
const ConnectionsPage       = lazy(() => import('./features/connections/ConnectionsPage').then(m => ({ default: m.ConnectionsPage })));
const MessagesPage          = lazy(() => import('./features/messages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const MessageThreadPage     = lazy(() => import('./features/messages/MessageThreadPage').then(m => ({ default: m.MessageThreadPage })));
const NotificationsPage     = lazy(() => import('./features/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const CommunityFeedPage     = lazy(() => import('./features/community/CommunityFeedPage').then(m => ({ default: m.CommunityFeedPage })));
const ProfilePage           = lazy(() => import('./features/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ProfileSettingsPage   = lazy(() => import('./features/profile/ProfileSettingsPage').then(m => ({ default: m.ProfileSettingsPage })));
const ProgressPage          = lazy(() => import('./features/progress/ProgressPage').then(m => ({ default: m.ProgressPage })));
const TasksPage             = lazy(() => import('./features/tasks/TasksPage').then(m => ({ default: m.TasksPage })));
const ProjectsPage          = lazy(() => import('./features/projects/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ProjectDetailPage     = lazy(() => import('./features/projects/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })));
const AcceptInvitePage      = lazy(() => import('./features/projects/AcceptInvitePage').then(m => ({ default: m.AcceptInvitePage })));
const AcceptSessionInvitePage = lazy(() => import('./features/sessions/AcceptSessionInvitePage').then(m => ({ default: m.AcceptSessionInvitePage })));
const AcceptCreditInvitePage = lazy(() => import('./features/profile/AcceptCreditInvitePage').then(m => ({ default: m.AcceptCreditInvitePage })));
const ReflectionPage        = lazy(() => import('./features/reflection/ReflectionPage').then(m => ({ default: m.ReflectionPage })));
const PantryPage            = lazy(() => import('./features/pantry/PantryPage').then(m => ({ default: m.PantryPage })));
const JournalPage           = lazy(() => import('./features/journal/JournalPage').then(m => ({ default: m.JournalPage })));

// Admin pages — only loaded when an admin navigates to /admin/*. Most
// users never see these so keeping them lazy is pure win.
const AdminDashboard        = lazy(() => import('../components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminUsers            = lazy(() => import('../components/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminAnalytics        = lazy(() => import('../components/admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminLogs             = lazy(() => import('../components/admin/AdminLogs').then(m => ({ default: m.AdminLogs })));
const AdminSettings         = lazy(() => import('../components/admin/AdminSettings').then(m => ({ default: m.AdminSettings })));
const AdminRecurringSessions = lazy(() => import('../components/admin/AdminRecurringSessions').then(m => ({ default: m.AdminRecurringSessions })));
const AdminModerationQueue  = lazy(() => import('../components/admin/AdminModerationQueue').then(m => ({ default: m.AdminModerationQueue })));
const AdminSafetyEscalation = lazy(() => import('../components/admin/AdminSafetyEscalation').then(m => ({ default: m.AdminSafetyEscalation })));
const AdminChangelog        = lazy(() => import('../components/admin/AdminChangelog').then(m => ({ default: m.AdminChangelog })));
const AdminHeatmaps         = lazy(() => import('../components/admin/AdminHeatmaps').then(m => ({ default: m.AdminHeatmaps })));

const TermsOfServicePage    = lazy(() => import('./features/legal/LegalPages').then(m => ({ default: m.TermsOfServicePage })));
const PrivacyPolicyPage     = lazy(() => import('./features/legal/LegalPages').then(m => ({ default: m.PrivacyPolicyPage })));

// MembersDirectoryPage is currently routed via ConnectionsPage (people
// nav goes through the connections page) — keeping the import path
// here in case it's revived as its own route later.
// const MembersDirectoryPage = lazy(() => import('./features/people/MembersDirectoryPage').then(m => ({ default: m.MembersDirectoryPage })));
import { UIPreferencesProvider } from '../contexts/UIPreferencesContext';
import { ViewAsProvider } from '../contexts/ViewAsContext';
import { ActiveDataProvider } from '../contexts/ActiveDataContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ActiveProjectProvider } from '../contexts/ActiveProjectContext';
import { RegulationProvider } from '../contexts/RegulationContext';
import { FocusSessionProvider } from '../contexts/FocusSessionContext';
import { MessagingDockProvider } from './features/messages/MessagingDockContext';

/** Suspense fallback for lazy-loaded routes. Renders in the page
 *  content area while the route chunk streams in; the Layout chrome
 *  (header, nav, bell) stays visible because it wraps this fallback.
 *  Intentionally minimal — most chunks load in <200ms on a warm cache,
 *  so a heavy skeleton would flash awkwardly. The soft pulse signals
 *  "loading" without committing to a specific layout shape. */
function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-20" role="status" aria-label="Loading">
      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

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

/** Detect the public /shared/:token path without depending on react-router.
 *  Returns the token (everything after /shared/) or null. We run this
 *  before the auth gate so unauthenticated recipients can land on the
 *  accountability view without seeing the AuthPage first. */
function getPublicShareToken(): string | null {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  const m = /^\/shared\/([^/?#]+)/.exec(path);
  return m ? decodeURIComponent(m[1]) : null;
}

function AppContent() {
  const { user, loading, profileReady, isAdmin, profile, refreshProfile } = useAuth();

  // Public share view bypasses everything — no auth, no onboarding, no
  // Layout. The page is self-contained and reads its own data via the
  // SECURITY DEFINER RPC.
  const shareToken = getPublicShareToken();
  if (shareToken) {
    return <SharedProjectPage token={shareToken} />;
  }

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

  // Show the compulsory v2 wizard for any user who hasn't completed it.
  // `wizard_v2_completed_at` is NULL for all existing users (new column) so
  // this catches both brand-new signups and existing users who haven't gone
  // through the new setup flow yet.
  if (profileReady && profile && !profile.wizard_v2_completed_at) {
    return <OnboardingWizard onComplete={refreshProfile} />;
  }

  return (
    <CoreDataProvider>
      <BrowserRouter>
        <RoutePersistence />
        <Routes>
          {/* Layout wraps an Outlet → Suspense → child route element.
              Putting Suspense INSIDE the Layout keeps the nav bar +
              bottom tab bar visible while a route chunk streams in;
              only the page content area shows the fallback. */}
          <Route path="/" element={<Layout><Suspense fallback={<RouteFallback />}><Outlet /></Suspense></Layout>}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="dashboard" element={<Navigate to="/home" replace />} />
            <Route path="home" element={<DashboardPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="session/:sessionId" element={<ActiveSessionPage />} />
            <Route path="session/:sessionId/summary" element={<SessionSummaryPage />} />
            <Route path="join/:joinCode" element={<JoinSessionPage />} />
            <Route path="connections" element={<ConnectionsPage />} />
            <Route path="people" element={<ConnectionsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="messages/:conversationId" element={<MessageThreadPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
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
            <Route path="session-invite/:token" element={<AcceptSessionInvitePage />} />
            <Route path="credit-invite/:token" element={<AcceptCreditInvitePage />} />
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
            <Route path="terms" element={<TermsOfServicePage />} />
            <Route path="privacy" element={<PrivacyPolicyPage />} />
            <Route path="*" element={<Navigate to="/sessions" replace />} />
          </Route>

          {/* Admin section — uses its own AdminLayout, wrapped in legacy auth context */}
          <Route path="admin/*" element={
            !profileReady ? null : isAdmin ? (
              <LegacyAuthProvider>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="moderation" element={<AdminModerationQueue />} />
                    <Route path="safety" element={<AdminSafetyEscalation />} />
                    <Route path="recurring-sessions" element={<AdminRecurringSessions />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="heatmaps" element={<AdminHeatmaps />} />
                    <Route path="logs" element={<AdminLogs />} />
                    <Route path="changelog" element={<AdminChangelog />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Routes>
                </Suspense>
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
