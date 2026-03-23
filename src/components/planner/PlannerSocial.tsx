import { useNavigate } from 'react-router-dom';
import { Calendar, Users, MessageCircle, Bell, Heart } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';

export function PlannerSocial() {
  const navigate = useNavigate();

  const features: LifeAreaFeature[] = [
    {
      id: 'events',
      icon: Calendar,
      label: 'Social Events',
      description: 'Track upcoming social events and gatherings',
      route: '/planner/social/events',
    },
    {
      id: 'contacts',
      icon: Users,
      label: 'Contacts',
      description: 'Manage your social connections and relationships',
      route: '/planner/social/contacts',
    },
    {
      id: 'followups',
      icon: MessageCircle,
      label: 'Follow-ups',
      description: 'Reminders to reach out and stay connected',
      route: '/planner/social/followups',
    },
    {
      id: 'reminders',
      icon: Bell,
      label: 'Social Reminders',
      description: 'Important dates, birthdays, and anniversaries',
      route: '/planner/social/reminders',
    },
    {
      id: 'memories',
      icon: Heart,
      label: 'Shared Memories',
      description: 'Moments worth remembering with others',
      route: '/planner/social/memories',
    },
  ];

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Social & Relationships</h1>
          <p className="text-xs md:text-sm text-gray-500">A space for connection, presence, and meaningful relationships</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu features={features} className="mb-4 md:mb-6" themeColor="amber" />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => navigate(feature.route!)}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-left border border-slate-100 hover:border-rose-200 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 text-rose-600 group-hover:from-rose-100 group-hover:to-pink-100 transition-colors">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-rose-600 transition-colors">
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
