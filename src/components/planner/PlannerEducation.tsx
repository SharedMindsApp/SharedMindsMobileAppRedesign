import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, FileText, Calendar, RefreshCw, TrendingUp, Briefcase, Clipboard } from 'lucide-react';
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
    id: 'schedule',
    icon: Calendar,
    title: 'Learning Schedule',
    description: 'Plan and track your learning time blocks',
    route: '/planner/education/schedule'
  },
  {
    id: 'assignments',
    icon: Clipboard,
    title: 'Assignments',
    description: 'Track coursework and assignment deadlines',
    route: '/planner/education/assignments'
  },
  {
    id: 'courses',
    icon: GraduationCap,
    title: 'Course Info',
    description: 'Track your enrolled courses and programs',
    route: '/planner/education/courses'
  },
  {
    id: 'revision',
    icon: RefreshCw,
    title: 'Revision & Review',
    description: 'Track topics for exam preparation and review',
    route: '/planner/education/revision'
  },
  {
    id: 'projects',
    icon: Briefcase,
    title: 'Research Projects',
    description: 'Track research and long-term learning projects',
    route: '/planner/education/projects'
  },
  {
    id: 'progress',
    icon: TrendingUp,
    title: 'Progress Metrics',
    description: 'Track your learning journey with visual metrics',
    route: '/planner/education/progress'
  },
  {
    id: 'resources',
    icon: BookOpen,
    title: 'Reading & Resources',
    description: 'Collect books, articles, and learning materials',
    route: '/planner/education/resources'
  },
  {
    id: 'lesson',
    icon: FileText,
    title: 'Lesson Planning',
    description: 'Organize teaching plans and lesson objectives',
    route: '/planner/education/lesson'
  }
];

export function PlannerEducation() {
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
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Education & Learning</h1>
          <p className="text-xs md:text-sm text-gray-500">Continuous learning and skill development journey</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu features={mobileFeatures} className="mb-4 md:mb-6" themeColor="pink" />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => navigate(feature.route)}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-left border border-slate-100 hover:border-pink-200 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 text-pink-500 group-hover:from-pink-100 group-hover:to-rose-100 transition-colors">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-pink-600 transition-colors">
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
