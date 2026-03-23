import { useNavigate } from 'react-router-dom';
import { BookOpen, PenLine, Lightbulb } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';

export function PlannerJournal() {
  const navigate = useNavigate();

  const features: LifeAreaFeature[] = [
    {
      id: 'entries',
      icon: BookOpen,
      label: 'Journal Entries',
      description: 'Daily journaling for reflection and self-awareness',
      route: '/planner/journal/entries',
    },
    {
      id: 'prompts',
      icon: Lightbulb,
      label: 'Writing Prompts',
      description: 'Guided prompts to spark reflection and deeper thinking',
      route: '/planner/journal/prompts',
    },
    {
      id: 'reflections',
      icon: PenLine,
      label: 'Reflections',
      description: 'Weekly and monthly reflections on your journey',
      route: '/planner/journal/reflections',
    },
  ];

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Journal</h1>
          <p className="text-xs md:text-sm text-gray-500">A space to think, write, and reflect</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu features={features} className="mb-4 md:mb-6" themeColor="blue" />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => navigate(feature.route!)}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-left border border-slate-100 hover:border-blue-200 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {feature.label}
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
