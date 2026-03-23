import { useNavigate } from 'react-router-dom';
import { PlannerShell } from './PlannerShell';
import {
  Home,
  ClipboardList,
  UtensilsCrossed,
  ShoppingCart,
  Sparkles,
  Calendar,
  CalendarDays,
  StickyNote,
} from 'lucide-react';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';

export function PlannerHousehold() {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Household Overview',
      description: 'See the state of the home at a glance',
      icon: Home,
      path: '/planner/household/overview',
      color: 'rose',
    },
    {
      title: 'Chores & Responsibilities',
      description: 'Weekly layout and status overview',
      icon: ClipboardList,
      path: '/planner/household/chores',
      color: 'amber',
    },
    {
      title: 'Meal Planning',
      description: 'Weekly meal layout and preparation',
      icon: UtensilsCrossed,
      path: '/planner/household/meals',
      color: 'orange',
    },
    {
      title: 'Grocery Planning',
      description: 'Categorized shopping lists',
      icon: ShoppingCart,
      path: '/planner/household/groceries',
      color: 'emerald',
    },
    {
      title: 'Cleaning & Maintenance',
      description: 'Routine and one-off household jobs',
      icon: Sparkles,
      path: '/planner/household/cleaning',
      color: 'cyan',
    },
    {
      title: 'Appointments & Events',
      description: 'Household-focused agenda view',
      icon: Calendar,
      path: '/planner/household/appointments',
      color: 'blue',
    },
    {
      title: 'Family Calendar',
      description: 'Shared visibility, month/week toggle',
      icon: CalendarDays,
      path: '/planner/household/calendar',
      color: 'violet',
    },
    {
      title: 'Household Notes',
      description: 'Rules, agreements, and reminders',
      icon: StickyNote,
      path: '/planner/household/notes',
      color: 'pink',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
      pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
    };
    return colors[color] || colors.rose;
  };

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Household</h1>
          <p className="text-xs md:text-sm text-gray-500">Shared routines, responsibilities, and home life</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu 
          features={features.map(f => ({
            id: f.path,
            icon: f.icon,
            label: f.title,
            description: f.description,
            route: f.path,
          }))} 
          className="mb-4 md:mb-6"
          themeColor="rose"
        />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            const colorClasses = getColorClasses(feature.color);
            return (
              <button
                key={feature.path}
                onClick={() => navigate(feature.path)}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all text-left group"
              >
                <div className={`w-12 h-12 ${colorClasses.bg} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${colorClasses.text}`} />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-600 text-center">
            Household views pull from your Shared Spaces widgets. Changes here update the source data. This is a planning layer, not a separate system.
          </p>
        </div>
      </div>
    </PlannerShell>
  );
}
