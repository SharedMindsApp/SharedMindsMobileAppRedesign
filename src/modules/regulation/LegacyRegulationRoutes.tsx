import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { AuthGuard } from '../../components/AuthGuard';
import { Layout } from '../../components/Layout';
import { BehavioralInsightsDashboard } from '../../components/behavioral-insights/BehavioralInsightsDashboard';
import { ContextsPage } from '../../components/interventions/ContextsPage';
import { CreateInterventionFlow } from '../../components/interventions/CreateInterventionFlow';
import { EditInterventionPage } from '../../components/interventions/EditInterventionPage';
import { GovernancePanel } from '../../components/interventions/GovernancePanel';
import { RegulationHubTabbed } from '../../components/interventions/RegulationHubTabbed';
import { RegulationUsePage } from '../../components/interventions/RegulationUsePage';
import { Stage3ErrorBoundary } from '../../components/interventions/Stage3ErrorBoundary';
import { DailyAlignmentPage } from '../../components/regulation/DailyAlignmentPage';
import { SignalDetailPage } from '../../components/regulation/SignalDetailPage';
import { TestingModePage } from '../../components/regulation/TestingModePage';
import { PersonalCalendarPage } from '../../components/personal-spaces/PersonalCalendarPage';

function withLayout(element: ReactNode) {
  return (
    <AuthGuard>
      <Layout>{element}</Layout>
    </AuthGuard>
  );
}

function withStage3Boundary(element: ReactNode, fallbackRoute = '/regulation') {
  return (
    <Stage3ErrorBoundary fallbackRoute={fallbackRoute}>
      {withLayout(element)}
    </Stage3ErrorBoundary>
  );
}

export function LegacyRegulationRoutes() {
  return (
    <>
      <Route
        path="/alignment"
        element={
          <AuthGuard>
            <DailyAlignmentPage />
          </AuthGuard>
        }
      />
      <Route
        path="/calendar/personal"
        element={
          <AuthGuard>
            <ErrorBoundary
              context="Personal Calendar"
              fallbackRoute="/planner"
              errorMessage="An error occurred while loading the personal calendar."
            >
              <PersonalCalendarPage />
            </ErrorBoundary>
          </AuthGuard>
        }
      />
      <Route
        path="/regulation"
        element={withStage3Boundary(<RegulationHubTabbed />, '/dashboard')}
      />
      <Route
        path="/regulation/signals/:signalId"
        element={withStage3Boundary(<SignalDetailPage />)}
      />
      <Route
        path="/regulation/create"
        element={withStage3Boundary(<CreateInterventionFlow />)}
      />
      <Route
        path="/regulation/edit/:id"
        element={withStage3Boundary(<EditInterventionPage />)}
      />
      <Route
        path="/regulation/use"
        element={withStage3Boundary(<RegulationUsePage />)}
      />
      <Route
        path="/regulation/contexts"
        element={withStage3Boundary(<ContextsPage />)}
      />
      <Route
        path="/regulation/governance"
        element={withStage3Boundary(<GovernancePanel />)}
      />
      <Route
        path="/regulation/testing"
        element={withStage3Boundary(<TestingModePage />)}
      />
      <Route path="/interventions" element={<Navigate to="/regulation" replace />} />
      <Route path="/interventions/create" element={<Navigate to="/regulation/create" replace />} />
      <Route path="/interventions/edit/:id" element={<Navigate to="/regulation/edit/:id" replace />} />
      <Route path="/interventions/use" element={<Navigate to="/regulation/use" replace />} />
      <Route path="/interventions/triggers" element={<Navigate to="/regulation/contexts" replace />} />
      <Route path="/interventions/governance" element={<Navigate to="/regulation/governance" replace />} />
      <Route
        path="/behavioral-insights"
        element={withLayout(<BehavioralInsightsDashboard />)}
      />
    </>
  );
}
