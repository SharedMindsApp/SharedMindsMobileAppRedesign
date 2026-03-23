import { Route } from 'react-router-dom';
import { AuthGuard } from '../../components/AuthGuard';
import { PageView } from '../../components/pages/PageView';
import { PersonalSpacePage } from '../../components/PersonalSpacePage';
import { SharedSpacesListPage } from '../../components/SharedSpacesListPage';
import { SpaceViewPage } from '../../components/SpaceViewPage';
import { SpacesIndexPage } from '../../components/SpacesIndexPage';
import { Layout } from '../../components/Layout';
import { WidgetAppView } from '../../components/spaces/WidgetAppView';

export function LegacySpacesRoutes() {
  return (
    <>
      <Route
        path="/spaces"
        element={
          <AuthGuard>
            <Layout>
              <SpacesIndexPage />
            </Layout>
          </AuthGuard>
        }
      />
      <Route
        path="/spaces/personal"
        element={
          <AuthGuard>
            <PersonalSpacePage />
          </AuthGuard>
        }
      />
      <Route
        path="/spaces/shared"
        element={
          <AuthGuard>
            <SharedSpacesListPage />
          </AuthGuard>
        }
      />
      <Route
        path="/spaces/:spaceId"
        element={
          <AuthGuard>
            <SpaceViewPage />
          </AuthGuard>
        }
      />
      <Route
        path="/spaces/:spaceId/app/:widgetId"
        element={
          <AuthGuard>
            <WidgetAppView />
          </AuthGuard>
        }
      />
      <Route
        path="/spaces/:spaceId/pages/:pageId"
        element={
          <AuthGuard>
            <PageView />
          </AuthGuard>
        }
      />
    </>
  );
}
