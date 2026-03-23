import { Route } from 'react-router-dom';
import { AuthGuard } from '../../components/AuthGuard';
import { AdminGuardrailsLayout } from '../../components/admin/guardrails/AdminGuardrailsLayout';
import { AdminProjectTypesPage } from '../../components/admin/guardrails/AdminProjectTypesPage';
import { AdminProjectTypeTagsPage } from '../../components/admin/guardrails/AdminProjectTypeTagsPage';
import { AdminSubtracksPage } from '../../components/admin/guardrails/AdminSubtracksPage';
import { AdminTagsPage } from '../../components/admin/guardrails/AdminTagsPage';
import { AdminTemplatesPage } from '../../components/admin/guardrails/AdminTemplatesPage';
import { AdminTemplateSubtracksPage } from '../../components/admin/guardrails/AdminTemplateSubtracksPage';
import { AdminTemplateTagsPage } from '../../components/admin/guardrails/AdminTemplateTagsPage';
import { GuardrailsLayout } from '../../components/guardrails/GuardrailsLayout';
import { GuardrailsAIChatsPage } from '../../components/guardrails/GuardrailsAIChatsPage';
import { GuardrailsDashboard } from '../../components/guardrails/GuardrailsDashboard';
import { GuardrailsMindMesh } from '../../components/guardrails/GuardrailsMindMesh';
import { GuardrailsOffshoots } from '../../components/guardrails/GuardrailsOffshoots';
import { GuardrailsRegulation } from '../../components/guardrails/GuardrailsRegulation';
import { GuardrailsRoadmap } from '../../components/guardrails/GuardrailsRoadmap';
import { GuardrailsSessions } from '../../components/guardrails/GuardrailsSessions';
import { GuardrailsSideProjects } from '../../components/guardrails/GuardrailsSideProjects';
import { GuardrailsTaskFlow } from '../../components/guardrails/GuardrailsTaskFlow';
import { ProjectWelcomePage } from '../../components/guardrails/ProjectWelcomePage';
import { FocusAnalytics } from '../../components/guardrails/focus/FocusAnalytics';
import { FocusModeLive } from '../../components/guardrails/focus/FocusModeLive';
import { FocusModeStart } from '../../components/guardrails/focus/FocusModeStart';
import { FocusSessionsHistory } from '../../components/guardrails/focus/FocusSessionsHistory';
import { SessionSummaryPage } from '../../components/guardrails/focus/SessionSummaryPage';
import { ProjectNodesPage } from '../../components/guardrails/nodes/ProjectNodesPage';
import { OffshootIdeaDetail } from '../../components/guardrails/offshoots/OffshootIdeaDetail';
import { PeoplePage } from '../../components/guardrails/people/PeoplePage';
import { ProjectRealityCheckPage } from '../../components/guardrails/reality/ProjectRealityCheckPage';
import { ProjectRoadmapPage } from '../../components/guardrails/roadmap/ProjectRoadmapPage';
import { ArchiveManagementPage } from '../../components/guardrails/settings/ArchiveManagementPage';
import { SideProjectDetail } from '../../components/guardrails/side-projects/SideProjectDetail';
import { ProjectTaskFlowPage } from '../../components/guardrails/taskflow/ProjectTaskFlowPage';
import { ProjectWizard } from '../../components/guardrails/wizard/ProjectWizard';
import { TrackWorkspace } from '../../components/guardrails/workspace/TrackWorkspace';
import { SubtrackWorkspace } from '../../components/guardrails/workspace/SubtrackWorkspace';
import { RequireActiveProjectADC } from '../../components/guardrails/RequireActiveProjectADC';
import { TeamGroupsPage } from '../../components/groups/TeamGroupsPage';
import { TeamGroupsRouteGuard } from '../../components/groups/TeamGroupsRouteGuard';
import { OffshootIdeaDetailPage } from '../../components/OffshootIdeaDetailPage';
import { OffshootIdeasListPage } from '../../components/OffshootIdeasListPage';
import { SideProjectsPage } from '../../components/SideProjectsPage';
import { TrackPermissionsPage } from '../../components/track-permissions/TrackPermissionsPage';
import { TrackPermissionsRouteGuard } from '../../components/track-permissions/TrackPermissionsRouteGuard';

export function LegacyGuardrailsRoutes() {
  return (
    <>
      <Route
        path="/guardrails/wizard"
        element={
          <AuthGuard>
            <ProjectWizard />
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <GuardrailsDashboard />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/dashboard"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <GuardrailsDashboard />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/people"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <PeoplePage />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/ai-chats"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <GuardrailsAIChatsPage />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/roadmap"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <GuardrailsRoadmap />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/taskflow"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <GuardrailsTaskFlow />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/mindmesh"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <GuardrailsMindMesh />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/side-projects"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <GuardrailsSideProjects />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/offshoots"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <GuardrailsOffshoots />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/side-projects/:id"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <SideProjectDetail />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/offshoots/:id"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <OffshootIdeaDetail />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/sessions"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <GuardrailsSessions />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/regulation"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <GuardrailsRegulation />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/settings/archive"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <ArchiveManagementPage />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/projects/:projectId/welcome"
        element={
          <AuthGuard>
            <ProjectWelcomePage />
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/projects/:masterProjectId/roadmap"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <ProjectRoadmapPage />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/projects/:masterProjectId/nodes"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <ProjectNodesPage />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/projects/:masterProjectId/taskflow"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <ProjectTaskFlowPage />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/projects/:masterProjectId/reality"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <ProjectRealityCheckPage />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/projects/:masterProjectId/workspace/track/:trackId/subtrack/:subtrackId"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <SubtrackWorkspace />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/projects/:masterProjectId/workspace/track/:trackId"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <TrackWorkspace />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/projects/:masterProjectId/side-projects"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <SideProjectsPage />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/projects/:masterProjectId/offshoots"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <OffshootIdeasListPage />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/offshoots/:offshootId"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <OffshootIdeaDetailPage />
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/focus"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <FocusModeStart />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/focus/live"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <FocusModeLive />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/focus/summary/:sessionId"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <SessionSummaryPage />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/focus/sessions"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <FocusSessionsHistory />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/guardrails/focus/analytics"
        element={
          <AuthGuard>
            <GuardrailsLayout>
              <RequireActiveProjectADC>
                <FocusAnalytics />
              </RequireActiveProjectADC>
            </GuardrailsLayout>
          </AuthGuard>
        }
      />
      <Route path="/admin/guardrails" element={<AdminGuardrailsLayout />}>
        <Route path="project-types" element={<AdminProjectTypesPage />} />
        <Route path="templates" element={<AdminTemplatesPage />} />
        <Route path="subtracks" element={<AdminSubtracksPage />} />
        <Route path="tags" element={<AdminTagsPage />} />
        <Route path="template-tags" element={<AdminTemplateTagsPage />} />
        <Route path="project-type-tags" element={<AdminProjectTypeTagsPage />} />
        <Route path="template-subtracks" element={<AdminTemplateSubtracksPage />} />
      </Route>
      <Route
        path="/teams/:teamId/groups"
        element={
          <AuthGuard>
            <TeamGroupsRouteGuard>
              <TeamGroupsPage />
            </TeamGroupsRouteGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/projects/:projectId/tracks/:trackId/permissions"
        element={
          <AuthGuard>
            <TrackPermissionsRouteGuard>
              <TrackPermissionsPage />
            </TrackPermissionsRouteGuard>
          </AuthGuard>
        }
      />
    </>
  );
}
