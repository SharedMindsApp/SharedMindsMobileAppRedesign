import { useNavigate } from 'react-router-dom';
import { Calendar, Target, CheckSquare, MessageSquare, TrendingUp, FileText, Briefcase } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';

interface FeatureCard {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  route: string;
}

const features: FeatureCard[] = [
  {
    id: 'daily',
    icon: Calendar,
    title: 'Daily Work Flow',
    description: 'Time blocks, priorities, and action items for today',
    route: '/planner/work/daily'
  },
  {
    id: 'weekly',
    icon: Target,
    title: 'Weekly Focus',
    description: 'Set direction and track weekly objectives',
    route: '/planner/work/weekly'
  },
  {
    id: 'projects',
    icon: Briefcase,
    title: 'Project Hub',
    description: 'Manage projects synced with Guardrails',
    route: '/planner/work/projects'
  },
  {
    id: 'tasks',
    icon: CheckSquare,
    title: 'Task & Action Lists',
    description: 'Organize and track work tasks by context',
    route: '/planner/work/tasks'
  },
  {
    id: 'communications',
    icon: MessageSquare,
    title: 'Communications',
    description: 'Track emails, calls, and follow-ups',
    route: '/planner/work/communications'
  },
  {
    id: 'career',
    icon: TrendingUp,
    title: 'Career Development',
    description: 'Long-term growth, skills, and milestones',
    route: '/planner/work/career'
  },
  {
    id: 'notes',
    icon: FileText,
    title: 'Work Notes & Reflections',
    description: 'Meeting notes, decisions, and reflections',
    route: '/planner/work/notes'
  }
];

export function PlannerWork() {
  const navigate = useNavigate();

  const mobileFeatures: LifeAreaFeature[] = features.map(f => ({
    id: f.id,
    icon: f.icon,
    label: f.title,
    description: f.description,
    route: f.route,
  }));

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Work & Career</h1>
          <p className="text-xs md:text-sm text-gray-500">Plan your workdays, manage projects, and grow your career</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu features={mobileFeatures} className="mb-4 md:mb-6" themeColor="teal" />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => navigate(feature.route)}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-left border border-slate-100 hover:border-teal-200 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-600 group-hover:from-teal-100 group-hover:to-cyan-100 transition-colors">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </PlannerShell>
  );
}
