import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EncryptionProvider } from './contexts/EncryptionContext';
import { ViewAsProvider } from './contexts/ViewAsContext';
import { UIPreferencesProvider } from './contexts/UIPreferencesContext';
import { ActiveProjectProvider } from './contexts/ActiveProjectContext';
import { ActiveTrackProvider } from './contexts/ActiveTrackContext';
import { FocusSessionProvider } from './contexts/FocusSessionContext';
import { RegulationProvider } from './contexts/RegulationContext';
import { AIChatWidgetProvider } from './contexts/AIChatWidgetContext';
import { ActiveDataProvider } from './contexts/ActiveDataContext';
import { ForegroundTriggersProvider } from './contexts/ForegroundTriggersContext';
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import { AppBootProvider, useAppBoot } from './contexts/AppBootContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppBootScreen } from './components/AppBootScreen';
import { startHealthMonitoring } from './lib/connectionHealth';
import { NotFoundRedirect } from './components/NotFoundRedirect';
import { RootRedirect } from './components/RootRedirect';
import { Layout } from './components/Layout';
import { RouteGlitchEffect } from './components/RouteGlitchEffect';
import { Dashboard } from './components/Dashboard';
import { HouseholdOnboarding } from './components/HouseholdOnboarding';
import { MembersOnboarding } from './components/MembersOnboarding';
import { ManageMembers } from './components/ManageMembers';
import { HouseholdMembersPage } from './components/HouseholdMembersPage';
import { ProfessionalAccessManagement } from './components/ProfessionalAccessManagement';
import { AcceptInvite } from './components/AcceptInvite';
import { ReportViewer } from './components/ReportViewer';
import { ProfileSettings } from './components/ProfileSettings';
import { Signup } from './components/Signup';
import { Login } from './components/Login';
import { ResetPassword } from './components/ResetPassword';
import { OAuthCallback } from './components/OAuthCallback';
import { AuthGuard } from './components/AuthGuard';
import { GuestGuard } from './components/GuestGuard';
import { RequireRole } from './components/RequireRole';
import { Landing } from './components/Landing';
import { HowItWorks } from './components/HowItWorks';
import { isStandaloneApp } from './lib/appContext';
import { AppRouteGuard } from './components/AppRouteGuard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminHouseholds } from './components/admin/AdminHouseholds';
import { AdminReports } from './components/admin/AdminReports';
import { AdminAnalytics } from './components/admin/AdminAnalytics';
import { AdminLogs } from './components/admin/AdminLogs';
import { AdminSettings } from './components/admin/AdminSettings';
import { AdminAIProvidersPage } from './components/admin/AdminAIProvidersPage';
import { AdminAIRoutingPage } from './components/admin/AdminAIRoutingPage';
import { ProfessionalDashboard } from './components/professional/ProfessionalDashboard';
import { ProfessionalHouseholdInsights } from './components/professional/ProfessionalHouseholdInsights';
import { ProfessionalOnboarding } from './components/professional/ProfessionalOnboarding';
import { ProfessionalRequestAccess } from './components/professional/ProfessionalRequestAccess';
import { ConversationListPage } from './components/messaging/ConversationListPage';
import { ConversationPage } from './components/messaging/ConversationPage';
import { NewConversationPage } from './components/messaging/NewConversationPage';
import { AddParticipantsPage } from './components/messaging/AddParticipantsPage';
import { UIPreferencesSettings } from './components/UIPreferencesSettings';
import { BrainProfileOnboarding } from './components/BrainProfileOnboarding';
import { BrainProfileCards } from './components/BrainProfileCards';
import { InsightJourney } from './components/journey/InsightJourney';
import { IndividualProfileFlow } from './components/individual-profile/IndividualProfileFlow';
import { CalendarPageWrapper } from './components/CalendarPageWrapper';
import { InsightsDashboard } from './components/insights/InsightsDashboard';
import { MealPreferences } from './components/MealPreferences';
import { MobileModeContainer } from './components/mobile/MobileModeContainer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LegacyGuardrailsRoutes } from './modules/guardrails/LegacyGuardrailsRoutes';
import { LegacyPlannerRoutes } from './modules/planner/LegacyPlannerRoutes';
import { LegacyRegulationRoutes } from './modules/regulation/LegacyRegulationRoutes';
import { LegacySpacesRoutes } from './modules/spaces/LegacySpacesRoutes';
import { LegacyTrackingRoutes } from './modules/tracking/LegacyTrackingRoutes';

type LegacyAppProps = {
  basename?: string;
};

// Phase 8: Wrapper to show boot screen when auth is stuck (must be inside AuthProvider)
function AppBootScreenWrapper() {
  const { state } = useAppBoot();
  const { loading: authLoading } = useAuth();
  const showStuckAuth = state.status === 'ready' && authLoading && state.elapsedTime > 10000;
  
  if (!showStuckAuth) return null;
  
  return (
    <div className="fixed inset-0 z-[9999] bg-white">
      <AppBootScreen />
    </div>
  );
}

// Phase 8: Inner app component that manages boot state
function AppContent({ basename }: LegacyAppProps) {
  const { state, setStatus, setServiceWorkerState } = useAppBoot();

  // Phase 8: Monitor service worker state
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const controller = navigator.serviceWorker.controller;
      if (controller) {
        setServiceWorkerState('controlling');
      } else {
        navigator.serviceWorker.ready.then(() => {
          setServiceWorkerState('registered');
        });
      }

      // Phase 8: Listen for service worker update events
      const handleUpdateAvailable = () => {
        setStatus('update-available');
      };

      const handleRegistrationFailed = () => {
        setServiceWorkerState('broken');
      };

      window.addEventListener('sw-update-available', handleUpdateAvailable);
      window.addEventListener('sw-registration-failed', handleRegistrationFailed);

      return () => {
        window.removeEventListener('sw-update-available', handleUpdateAvailable);
        window.removeEventListener('sw-registration-failed', handleRegistrationFailed);
      };
    }
  }, [setStatus, setServiceWorkerState]);

  // Phase 10: Optimized boot sequence - event-driven, no artificial delays
  useEffect(() => {
    // Immediately transition to ready - let AuthContext and other providers handle loading
    // Boot screen will show as overlay if auth is still loading
    if (state.status === 'initializing') {
      setStatus('ready');
    }
  }, [state.status, setStatus]);

  // Phase 11: Start connection health monitoring when app is ready
  useEffect(() => {
    if (state.status === 'ready') {
      startHealthMonitoring();
      return () => {
        // Cleanup will be handled when component unmounts
      };
    }
  }, [state.status]);

  // Phase 10: Render app immediately, boot screen is shown as overlay during auth loading
  // This allows contexts to start initializing in parallel rather than sequentially
  // AppBootScreen will handle detecting stuck auth states internally
  const showBootOverlay = state.status !== 'ready';

  return (
    <>
      {showBootOverlay && (
        <div className="fixed inset-0 z-[9999] bg-white">
          <AppBootScreen />
        </div>
      )}
    <BrowserRouter basename={basename}>
      <AuthProvider>
        {/* AppBootScreen also shows when auth is stuck, must be inside AuthProvider */}
        <AppBootScreenWrapper />
        <NotificationProvider>
          <ViewAsProvider>
            <ActiveDataProvider>
              <UIPreferencesProvider>
                <ActiveProjectProvider>
                  <ActiveTrackProvider>
                    <RegulationProvider>
                      <FocusSessionProvider>
                        <EncryptionProvider>
                          <AIChatWidgetProvider>
                        <ForegroundTriggersProvider>
                          <NetworkStatusProvider>
                            <AppRouteGuard>
                            <RouteGlitchEffect />
                              <Routes>
          {/* Phase 8C: Root route is redirect-only, no UI rendered */}
          <Route
            path="/"
            element={<RootRedirect />}
          />

          <Route
            path="/how-it-works"
            element={<HowItWorks />}
          />

          <Route
            path="/auth/signup"
            element={
              <GuestGuard>
                <Signup />
              </GuestGuard>
            }
          />
          <Route
            path="/auth/login"
            element={
              <GuestGuard>
                <Login />
              </GuestGuard>
            }
          />
          <Route path="/auth/reset" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />

          <Route
            path="/invite/accept"
            element={
              <AuthGuard>
                <AcceptInvite />
              </AuthGuard>
            }
          />

          <Route
            path="/onboarding/household"
            element={
              <AuthGuard>
                <HouseholdOnboarding />
              </AuthGuard>
            }
          />
          <Route
            path="/onboarding/members"
            element={
              <AuthGuard>
                <MembersOnboarding />
              </AuthGuard>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Layout>
                  <Dashboard />
                </Layout>
              </AuthGuard>
            }
          />
          <LegacyRegulationRoutes />
          <LegacySpacesRoutes />
          <Route
            path="/mobile"
            element={
              <AuthGuard>
                <MobileModeContainer />
              </AuthGuard>
            }
          />
          <Route
            path="/calendar"
            element={
              <AuthGuard>
                <ErrorBoundary
                  context="Calendar"
                  fallbackRoute="/planner"
                  errorMessage="An error occurred while loading the calendar."
                >
                  <CalendarPageWrapper />
                </ErrorBoundary>
              </AuthGuard>
            }
          />
          <Route
            path="/insights/:householdId"
            element={
              <AuthGuard>
                <InsightsDashboard />
              </AuthGuard>
            }
          />
          <LegacyGuardrailsRoutes />
          <Route
            path="/journey"
            element={
              <AuthGuard>
                <Layout>
                  <InsightJourney />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/journey/individual-profile"
            element={
              <AuthGuard>
                <IndividualProfileFlow />
              </AuthGuard>
            }
          />
          <Route
            path="/report"
            element={
              <AuthGuard>
                <Layout>
                  <ReportViewer />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <Layout>
                  <ProfileSettings />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/members"
            element={
              <AuthGuard>
                <Layout>
                  <ManageMembers />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/household-access"
            element={
              <AuthGuard>
                <Layout>
                  <HouseholdMembersPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/professional-access"
            element={
              <AuthGuard>
                <Layout>
                  <ProfessionalAccessManagement />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/ui-preferences"
            element={
              <AuthGuard>
                <UIPreferencesSettings />
              </AuthGuard>
            }
          />
          <Route
            path="/settings/meal-preferences"
            element={
              <AuthGuard>
                <Layout>
                  <MealPreferences />
                </Layout>
              </AuthGuard>
            }
          />

          <Route
            path="/messages"
            element={
              <AuthGuard>
                <Layout>
                  <ConversationListPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/messages/new"
            element={
              <AuthGuard>
                <Layout>
                  <NewConversationPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <AuthGuard>
                <Layout>
                  <ConversationPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/messages/:conversationId/add"
            element={
              <AuthGuard>
                <Layout>
                  <AddParticipantsPage />
                </Layout>
              </AuthGuard>
            }
          />

          <Route
            path="/brain-profile/onboarding"
            element={
              <AuthGuard>
                <BrainProfileOnboarding />
              </AuthGuard>
            }
          />
          <Route
            path="/brain-profile/cards"
            element={
              <AuthGuard>
                <BrainProfileCards />
              </AuthGuard>
            }
          />

          <Route
            path="/professional/onboarding"
            element={
              <AuthGuard>
                <ProfessionalOnboarding />
              </AuthGuard>
            }
          />
          <Route
            path="/professional/dashboard"
            element={
              <AuthGuard>
                <Layout>
                  <ProfessionalDashboard />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/professional/households/:householdId"
            element={
              <AuthGuard>
                <Layout>
                  <ProfessionalHouseholdInsights />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/professional/request-access"
            element={
              <AuthGuard>
                <Layout>
                  <ProfessionalRequestAccess />
                </Layout>
              </AuthGuard>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole role="admin">
                <AdminUsers />
              </RequireRole>
            }
          />
          <Route
            path="/admin/households"
            element={
              <RequireRole role="admin">
                <AdminHouseholds />
              </RequireRole>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RequireRole role="admin">
                <AdminReports />
              </RequireRole>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <RequireRole role="admin">
                <AdminAnalytics />
              </RequireRole>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <RequireRole role="admin">
                <AdminLogs />
              </RequireRole>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireRole role="admin">
                <AdminSettings />
              </RequireRole>
            }
          />
          <Route
            path="/admin/ai-providers"
            element={
              <RequireRole role="admin">
                <AdminAIProvidersPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/ai-routing"
            element={
              <RequireRole role="admin">
                <AdminAIRoutingPage />
              </RequireRole>
            }
          />
          <LegacyPlannerRoutes />
          <LegacyTrackingRoutes />
          {/* Phase 8B: Catch-all route for unmatched paths */}
          <Route
            path="*"
            element={<NotFoundRedirect />}
          />
                              </Routes>
                            </AppRouteGuard>
                          </NetworkStatusProvider>
                        </ForegroundTriggersProvider>
                        </AIChatWidgetProvider>
                      </EncryptionProvider>
                    </FocusSessionProvider>
                  </RegulationProvider>
                </ActiveTrackProvider>
              </ActiveProjectProvider>
            </UIPreferencesProvider>
          </ActiveDataProvider>
        </ViewAsProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
    </>
  );
}

// Phase 8: Main App component with boot system and error boundary
function LegacyApp({ basename }: LegacyAppProps) {
  return (
    <AppErrorBoundary>
      <AppBootProvider>
        <AppContent basename={basename} />
      </AppBootProvider>
    </AppErrorBoundary>
  );
}

export default LegacyApp;
