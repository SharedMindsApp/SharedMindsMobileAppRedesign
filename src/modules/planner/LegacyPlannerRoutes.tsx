import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { AuthGuard } from '../../components/AuthGuard';
import { Layout } from '../../components/Layout';
import { PlannerAreas } from '../../components/planner/PlannerAreas';
import { PlannerCalendar } from '../../components/planner/PlannerCalendar';
import { PlannerFinance } from '../../components/planner/PlannerFinance';
import { PlannerHousehold } from '../../components/planner/PlannerHousehold';
import { PlannerPlanning } from '../../components/planner/PlannerPlanning';
import { PlannerReview } from '../../components/planner/PlannerReview';
import { PlannerShell } from '../../components/planner/PlannerShell';
import { PlannerSocial } from '../../components/planner/PlannerSocial';
import { PlannerTasks } from '../../components/planner/PlannerTasks';
import { PlannerToday } from '../../components/planner/PlannerToday';
import { PlannerVision } from '../../components/planner/PlannerVision';
import { PlannerWeek } from '../../components/planner/PlannerWeek';
import { PlannerWork } from '../../components/planner/PlannerWork';
import { PlannerMonth } from '../../components/planner/PlannerMonth';
import { PlannerQuarter } from '../../components/planner/PlannerQuarter';
import { PlannerYear } from '../../components/planner/PlannerYear';
import { Assignments } from '../../components/planner/education/Assignments';
import { CourseInfo } from '../../components/planner/education/CourseInfo';
import { LearningSchedule } from '../../components/planner/education/LearningSchedule';
import { LessonPlanning } from '../../components/planner/education/LessonPlanning';
import { ProgressMetrics } from '../../components/planner/education/ProgressMetrics';
import { ReadingResources } from '../../components/planner/education/ReadingResources';
import { ResearchProjects } from '../../components/planner/education/ResearchProjects';
import { RevisionReview } from '../../components/planner/education/RevisionReview';
import { DebtsAndCommitments } from '../../components/planner/finance/DebtsAndCommitments';
import { FinancialOverview } from '../../components/planner/finance/FinancialOverview';
import { FinancialReflectionView } from '../../components/planner/finance/FinancialReflectionView';
import { IncomeCashFlowView } from '../../components/planner/finance/IncomeCashFlowView';
import { InvestmentsAndAssets } from '../../components/planner/finance/InvestmentsAndAssets';
import { ProtectionAndInsurance } from '../../components/planner/finance/ProtectionAndInsurance';
import { RetirementPlanning } from '../../components/planner/finance/RetirementPlanning';
import { SavingsAndSafetyNets } from '../../components/planner/finance/SavingsAndSafetyNets';
import { SpendingAndExpenses } from '../../components/planner/finance/SpendingAndExpenses';
import { HouseholdCleaning } from '../../components/planner/household/HouseholdCleaning';
import { HouseholdGroceries } from '../../components/planner/household/HouseholdGroceries';
import { HouseholdMeals } from '../../components/planner/household/HouseholdMeals';
import { DailyTimeline } from '../../components/planner/planning/DailyTimeline';
import { EventPlanner } from '../../components/planner/planning/EventPlanner';
import { GoalActionPlan } from '../../components/planner/planning/GoalActionPlan';
import { GoalPlanner } from '../../components/planner/planning/GoalPlanner';
import { PriorityPlanner } from '../../components/planner/planning/PriorityPlanner';
import { UnifiedTodoList } from '../../components/planner/planning/UnifiedTodoList';
import { WeeklyOverview } from '../../components/planner/planning/WeeklyOverview';
import { MindfulnessMeditationView } from '../../components/planner/selfcare/MindfulnessMeditationView';
import { SelfCareRoutines } from '../../components/planner/selfcare/SelfCareRoutines';
import { WellnessGoals } from '../../components/planner/selfcare/WellnessGoals';
import { CreateTripPage } from '../../components/planner/travel/CreateTripPage';
import { TripDetailPage } from '../../components/planner/travel/TripDetailPage';
import { TripListPage } from '../../components/planner/travel/TripListPage';
import { CareerPurpose } from '../../components/planner/vision/CareerPurpose';
import { FiveYearOutlook } from '../../components/planner/vision/FiveYearOutlook';
import { LifeVision } from '../../components/planner/vision/LifeVision';
import { LongTermGoals } from '../../components/planner/vision/LongTermGoals';
import { MonthlyVisionCheckinView } from '../../components/planner/vision/MonthlyVisionCheckinView';
import { RelationshipVision } from '../../components/planner/vision/RelationshipVision';
import { ValuesAlignment } from '../../components/planner/vision/ValuesAlignment';
import { VisionAreas } from '../../components/planner/vision/VisionAreas';
import { VisionBoard } from '../../components/planner/vision/VisionBoard';
import { CareerDevelopment } from '../../components/planner/work/CareerDevelopment';
import { Communications } from '../../components/planner/work/Communications';
import { DailyWorkFlow } from '../../components/planner/work/DailyWorkFlow';
import { ProjectHub } from '../../components/planner/work/ProjectHub';
import { TaskActionLists } from '../../components/planner/work/TaskActionLists';
import { WeeklyFocus } from '../../components/planner/work/WeeklyFocus';
import { WorkNotes } from '../../components/planner/work/WorkNotes';
import { ActiveCalendarContextProvider } from '../../contexts/ActiveCalendarContext';
import { ActiveTaskContextProvider } from '../../contexts/ActiveTaskContext';

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

function plannerPlaceholder(title: string) {
  return withLayout(
    <PlannerShell>
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
          <p className="text-slate-600">Coming soon</p>
        </div>
      </div>
    </PlannerShell>,
  );
}

export function LegacyPlannerRoutes() {
  return (
    <>
      <Route path="/planner/today" element={withLayout(<PlannerToday />)} />
      <Route path="/planner/week" element={withLayout(<PlannerWeek />)} />
      <Route path="/planner/month" element={withLayout(<PlannerMonth />)} />
      <Route path="/planner/quarter" element={withLayout(<PlannerQuarter />)} />
      <Route path="/planner/year" element={withLayout(<PlannerYear />)} />
      <Route path="/planner" element={withAuthOnly(<Navigate to="/planner/today" replace />)} />
      <Route path="/planner/index" element={withAuthOnly(<Navigate to="/planner/today" replace />)} />
      <Route
        path="/planner/calendar"
        element={
          <AuthGuard>
            <ActiveCalendarContextProvider>
              <Layout>
                <ErrorBoundary
                  context="Planner Calendar"
                  fallbackRoute="/planner"
                  errorMessage="An error occurred while loading the planner calendar."
                >
                  <PlannerCalendar />
                </ErrorBoundary>
              </Layout>
            </ActiveCalendarContextProvider>
          </AuthGuard>
        }
      />
      <Route
        path="/planner/tasks"
        element={
          <AuthGuard>
            <ActiveTaskContextProvider>
              <Layout>
                <ErrorBoundary
                  context="Planner Tasks"
                  fallbackRoute="/planner"
                  errorMessage="An error occurred while loading tasks."
                >
                  <PlannerTasks />
                </ErrorBoundary>
              </Layout>
            </ActiveTaskContextProvider>
          </AuthGuard>
        }
      />
      <Route path="/planner/personal" element={withAuthOnly(<Navigate to="/planner/today?area=personal" replace />)} />
      <Route path="/planner/work" element={withLayout(<PlannerWork />)} />
      <Route path="/planner/work/daily" element={withLayout(<DailyWorkFlow />)} />
      <Route path="/planner/work/weekly" element={withLayout(<WeeklyFocus />)} />
      <Route path="/planner/work/projects" element={withLayout(<ProjectHub />)} />
      <Route path="/planner/work/tasks" element={withLayout(<TaskActionLists />)} />
      <Route path="/planner/work/communications" element={withLayout(<Communications />)} />
      <Route path="/planner/work/career" element={withLayout(<CareerDevelopment />)} />
      <Route path="/planner/work/notes" element={withLayout(<WorkNotes />)} />
      <Route path="/planner/education" element={withAuthOnly(<Navigate to="/planner/today?area=personal" replace />)} />
      <Route path="/planner/education/schedule" element={withLayout(<LearningSchedule />)} />
      <Route path="/planner/education/assignments" element={withLayout(<Assignments />)} />
      <Route path="/planner/education/courses" element={withLayout(<CourseInfo />)} />
      <Route path="/planner/education/revision" element={withLayout(<RevisionReview />)} />
      <Route path="/planner/education/projects" element={withLayout(<ResearchProjects />)} />
      <Route path="/planner/education/progress" element={withLayout(<ProgressMetrics />)} />
      <Route path="/planner/education/resources" element={withLayout(<ReadingResources />)} />
      <Route path="/planner/education/lesson" element={withLayout(<LessonPlanning />)} />
      <Route path="/planner/finance" element={withLayout(<PlannerFinance />)} />
      <Route path="/planner/finance/overview" element={withLayout(<FinancialOverview />)} />
      <Route path="/planner/finance/income" element={withLayout(<IncomeCashFlowView />)} />
      <Route path="/planner/finance/expenses" element={withLayout(<SpendingAndExpenses />)} />
      <Route path="/planner/finance/savings" element={withLayout(<SavingsAndSafetyNets />)} />
      <Route path="/planner/finance/investments" element={withLayout(<InvestmentsAndAssets />)} />
      <Route path="/planner/finance/debts" element={withLayout(<DebtsAndCommitments />)} />
      <Route path="/planner/finance/insurance" element={withLayout(<ProtectionAndInsurance />)} />
      <Route path="/planner/finance/retirement" element={withLayout(<RetirementPlanning />)} />
      <Route path="/planner/finance/reflection" element={withLayout(<FinancialReflectionView />)} />
      <Route path="/planner/budget" element={withAuthOnly(<Navigate to="/planner/today?area=financial" replace />)} />
      <Route path="/planner/vision" element={withLayout(<PlannerVision />)} />
      <Route path="/planner/vision/life" element={withLayout(<LifeVision />)} />
      <Route path="/planner/vision/goals" element={withLayout(<LongTermGoals />)} />
      <Route path="/planner/vision/five-year" element={withLayout(<FiveYearOutlook />)} />
      <Route path="/planner/vision/areas" element={withLayout(<VisionAreas />)} />
      <Route path="/planner/vision/board" element={withLayout(<VisionBoard />)} />
      <Route path="/planner/vision/checkin" element={withLayout(<MonthlyVisionCheckinView />)} />
      <Route path="/planner/vision/career" element={withLayout(<CareerPurpose />)} />
      <Route path="/planner/vision/relationships" element={withLayout(<RelationshipVision />)} />
      <Route path="/planner/vision/values" element={withLayout(<ValuesAlignment />)} />
      <Route path="/planner/planning" element={withLayout(<PlannerPlanning />)} />
      <Route path="/planner/planning/goals" element={withLayout(<GoalPlanner />)} />
      <Route path="/planner/planning/priorities" element={withLayout(<PriorityPlanner />)} />
      <Route path="/planner/planning/todos" element={withLayout(<UnifiedTodoList />)} />
      <Route path="/planner/planning/events" element={withLayout(<EventPlanner />)} />
      <Route path="/planner/planning/weekly" element={withLayout(<WeeklyOverview />)} />
      <Route path="/planner/planning/daily" element={withLayout(<DailyTimeline />)} />
      <Route path="/planner/planning/goal-actions" element={withLayout(<GoalActionPlan />)} />
      <Route path="/planner/household" element={withLayout(<PlannerHousehold />)} />
      <Route path="/planner/household/meals" element={withLayout(<HouseholdMeals />)} />
      <Route path="/planner/household/overview" element={plannerPlaceholder('Household Overview')} />
      <Route path="/planner/household/chores" element={plannerPlaceholder('Chores & Responsibilities')} />
      <Route path="/planner/household/groceries" element={withLayout(<HouseholdGroceries />)} />
      <Route path="/planner/household/cleaning" element={withLayout(<HouseholdCleaning />)} />
      <Route path="/planner/household/appointments" element={plannerPlaceholder('Appointments & Events')} />
      <Route path="/planner/household/calendar" element={plannerPlaceholder('Family Calendar')} />
      <Route path="/planner/household/notes" element={plannerPlaceholder('Household Notes')} />
      <Route path="/planner/selfcare" element={withAuthOnly(<Navigate to="/planner/today?area=personal" replace />)} />
      <Route path="/planner/selfcare/goals" element={withLayout(<WellnessGoals />)} />
      <Route path="/planner/selfcare/mindfulness" element={withLayout(<MindfulnessMeditationView />)} />
      <Route path="/planner/selfcare/routines" element={withLayout(<SelfCareRoutines />)} />
      <Route path="/planner/travel/new" element={withAuthOnly(<CreateTripPage />)} />
      <Route path="/planner/travel/trips" element={withLayout(<TripListPage />)} />
      <Route path="/planner/travel/:tripId" element={withAuthOnly(<TripDetailPage />)} />
      <Route path="/planner/travel" element={withAuthOnly(<Navigate to="/planner/today?area=travel" replace />)} />
      <Route path="/planner/review" element={withLayout(<PlannerReview />)} />
      <Route path="/planner/areas" element={withLayout(<PlannerAreas />)} />
      <Route path="/planner/social" element={withLayout(<PlannerSocial />)} />
      <Route path="/planner/journal" element={withAuthOnly(<Navigate to="/planner/today" replace />)} />
    </>
  );
}
