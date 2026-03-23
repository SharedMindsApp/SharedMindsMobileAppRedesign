import { PlannerShell } from './PlannerShell';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Sparkles,
  ListChecks,
} from 'lucide-react';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';

interface SelfCareFeature {
  id: string;
  title: string;
  description: string;
  icon: any;
  route: string;
  color: string;
}

const features: SelfCareFeature[] = [
  {
    id: 'goals',
    title: 'Wellness Goals',
    description: 'Set gentle intentions for your wellbeing',
    icon: Heart,
    route: '/planner/selfcare/goals',
    color: 'from-rose-400 to-pink-500',
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness & Meditation',
    description: 'Presence, not performance',
    icon: Sparkles,
    route: '/planner/selfcare/mindfulness',
    color: 'from-teal-400 to-cyan-500',
  },
  {
    id: 'routines',
    title: 'Self-Care Routines',
    description: 'Build repeatable care habits',
    icon: ListChecks,
    route: '/planner/selfcare/routines',
    color: 'from-indigo-400 to-blue-500',
  },
];

export function PlannerSelfCare() {
  const navigate = useNavigate();

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Self-Care & Wellness</h1>
          <p className="text-xs md:text-sm text-gray-500">Nurture your physical, mental, and emotional wellbeing</p>
          
          {/* Privacy Note - Hidden on mobile */}
          <div className="hidden md:block bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <p className="text-xs text-blue-800">
              <span className="font-medium">Privacy Note:</span> All self-care data is private by default.
            </p>
          </div>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu 
          features={features.map(f => ({
            id: f.id,
            icon: f.icon,
            label: f.title,
            description: f.description,
            route: f.route,
          }))} 
          className="mb-4 md:mb-6"
          themeColor="rose"
        />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => navigate(feature.route)}
                className="group relative bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300 text-left overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                <div className="relative">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-slate-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="mt-4 flex items-center text-sm font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
                    <span>Explore</span>
                    <svg className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-12 bg-slate-50 rounded-xl p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">How Self-Care Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center mb-3">
                <span className="text-rose-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Track What Matters</h3>
              <p className="text-sm text-slate-600">
                Log wellness activities at your own pace. No pressure, no judgment.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Stay Private</h3>
              <p className="text-sm text-slate-600">
                Everything is private by default. Share only what you choose.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Build Awareness</h3>
              <p className="text-sm text-slate-600">
                Reflect on patterns and find what truly supports your wellbeing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PlannerShell>
  );
}
