import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { AuthGuard } from '../../components/AuthGuard';
import { Layout } from '../../components/Layout';
import { ActivitySpacePage } from '../../components/fitness-tracker/ActivitySpacePage';
import { DiscoveryWizard } from '../../components/fitness-tracker/DiscoveryWizard';
import { FitnessSessionsCalendarPage } from '../../components/fitness-tracker/FitnessSessionsCalendarPage';
import { FitnessTrackerHomePage } from '../../components/fitness-tracker/FitnessTrackerHomePage';
import { RecipeDetailPage } from '../../components/recipes/RecipeDetailPage';
import { ContextEventsPage } from '../../components/tracker-studio/ContextEventsPage';
import { CreateGlobalTemplatePage } from '../../components/tracker-studio/CreateGlobalTemplatePage';
import { CreateTrackerFromScratchPage } from '../../components/tracker-studio/CreateTrackerFromScratchPage';
import { CrossTrackerInsightsPage } from '../../components/tracker-studio/CrossTrackerInsightsPage';
import { MyTrackersPage } from '../../components/tracker-studio/MyTrackersPage';
import { TemplateImportPage } from '../../components/tracker-studio/TemplateImportPage';
import { TrackerDetailPage } from '../../components/tracker-studio/TrackerDetailPage';
import { TrackerTemplatesPage } from '../../components/tracker-studio/TrackerTemplatesPage';

function withLayout(element: ReactNode) {
  return (
    <AuthGuard>
      <Layout>{element}</Layout>
    </AuthGuard>
  );
}

function withAuthOnly(element: ReactNode) {
  return <AuthGuard>{element}</AuthGuard>;
}

export function LegacyTrackingRoutes() {
  return (
    <>
      <Route path="/tracker-studio" element={withLayout(<MyTrackersPage />)} />
      <Route path="/tracker-studio/templates" element={withLayout(<TrackerTemplatesPage />)} />
      <Route path="/tracker-studio/my-trackers" element={withLayout(<MyTrackersPage />)} />
      <Route path="/tracker-studio/create" element={withLayout(<CreateTrackerFromScratchPage />)} />
      <Route path="/tracker-studio/tracker/:trackerId" element={withLayout(<TrackerDetailPage />)} />
      <Route path="/tracker-studio/templates/import/:token" element={withLayout(<TemplateImportPage />)} />
      <Route path="/tracker-studio/templates/create-global" element={withLayout(<CreateGlobalTemplatePage />)} />
      <Route path="/tracker-studio/context" element={withLayout(<ContextEventsPage />)} />
      <Route path="/tracker-studio/insights" element={withLayout(<CrossTrackerInsightsPage />)} />
      <Route path="/fitness-tracker" element={withLayout(<FitnessTrackerHomePage />)} />
      <Route path="/fitness-tracker/activity/:activityId" element={withLayout(<ActivitySpacePage />)} />
      <Route path="/fitness-tracker/calendar" element={withAuthOnly(<FitnessSessionsCalendarPage />)} />
      <Route path="/fitness-tracker/discovery" element={withLayout(<DiscoveryWizard />)} />
      <Route path="/recipes/:recipeId" element={withLayout(<RecipeDetailPage />)} />
    </>
  );
}
