import { PlannerShell } from './PlannerShell';
import { Target, CheckSquare, Calendar, CalendarDays, Clock, Lightbulb, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';

export function PlannerPlanning() {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Goal Planner',
      description: 'Connect long-term goals to active planning',
      icon: Target,
      path: '/planner/planning/goals',
      color: 'blue'
    },
    {
      title: 'Priority Planner',
      description: 'Decide what matters now',
      icon: Zap,
      path: '/planner/planning/priorities',
      color: 'amber'
    },
    {
      title: 'To-Do List',
      description: 'Unified task execution view',
      icon: CheckSquare,
      path: '/planner/planning/todos',
      color: 'emerald'
    },
    {
      title: 'Event Planner',
      description: 'Forward planning for key dates',
      icon: Calendar,
      path: '/planner/planning/events',
      color: 'rose'
    },
    {
      title: 'Weekly Overview',
      description: 'See the week as a whole',
      icon: CalendarDays,
      path: '/planner/planning/weekly',
      color: 'violet'
    },
    {
      title: 'Daily Timeline',
      description: 'Gentle structure for the day',
      icon: Clock,
      path: '/planner/planning/daily',
      color: 'cyan'
    },
    {
      title: 'Goal Action Plan',
      description: 'Break goals into meaningful steps',
      icon: Lightbulb,
      path: '/planner/planning/goal-actions',
      color: 'yellow'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
    violet: 'bg-violet-100 text-violet-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    yellow: 'bg-yellow-100 text-yellow-700'
  };

  const mobileFeatures: LifeAreaFeature[] = features.map(f => ({
    id: f.path,
    icon: f.icon,
    label: f.title,
    description: f.description,
    route: f.path,
  }));

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Planning</h1>
          <p className="text-xs md:text-sm text-gray-500">Turning intention into action</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu features={mobileFeatures} className="mb-4 md:mb-6" themeColor="violet" />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.path}
                onClick={() => navigate(feature.path)}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all text-left group"
              >
                <div className={`w-12 h-12 rounded-lg ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-600 text-center">
            Planning views pull from your existing goals, tasks, and calendar. Changes here update the source data.
          </p>
        </div>
      </div>
    </PlannerShell>
  );
}
