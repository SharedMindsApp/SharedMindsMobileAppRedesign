import { useNavigate } from 'react-router-dom';
import { Compass, Target, Calendar, Layers, Image, CheckCircle, Briefcase, Heart, Sparkles } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';

interface VisionCard {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  route: string;
}

const visionCards: VisionCard[] = [
  {
    id: 'life',
    icon: Compass,
    title: 'Life Vision',
    description: 'Your anchor - what a good life looks like to you',
    route: '/planner/vision/life'
  },
  {
    id: 'goals',
    icon: Target,
    title: 'Long-Term Goals',
    description: 'High-level goals without pressure or tasks',
    route: '/planner/vision/goals'
  },
  {
    id: 'five-year',
    icon: Calendar,
    title: '5-Year Outlook',
    description: 'Big-picture thinking across life domains',
    route: '/planner/vision/five-year'
  },
  {
    id: 'areas',
    icon: Layers,
    title: 'Vision Areas',
    description: 'Structured vision across life domains',
    route: '/planner/vision/areas'
  },
  {
    id: 'board',
    icon: Image,
    title: 'Vision Board',
    description: 'Visual inspiration in a calm, private space',
    route: '/planner/vision/board'
  },
  {
    id: 'checkin',
    icon: CheckCircle,
    title: 'Monthly Check-In',
    description: 'Lightweight alignment tracking',
    route: '/planner/vision/checkin'
  },
  {
    id: 'career',
    icon: Briefcase,
    title: 'Career & Purpose',
    description: 'Work themes and long-term direction',
    route: '/planner/vision/career'
  },
  {
    id: 'relationships',
    icon: Heart,
    title: 'Relationship Vision',
    description: 'Clarity about relationships and boundaries',
    route: '/planner/vision/relationships'
  },
  {
    id: 'values',
    icon: Sparkles,
    title: 'Values Alignment',
    description: 'Core values and how life reflects them',
    route: '/planner/vision/values'
  }
];

export function PlannerVision() {
  const navigate = useNavigate();

  const mobileFeatures: LifeAreaFeature[] = visionCards.map(card => ({
    id: card.id,
    icon: card.icon,
    label: card.title,
    description: card.description,
    route: card.route,
  }));

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Vision</h1>
          <p className="text-xs md:text-sm text-gray-500">Long-term direction, purpose, and life alignment</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu features={mobileFeatures} className="mb-4 md:mb-6" themeColor="slate" />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visionCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => navigate(card.route)}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-left border border-slate-100 hover:border-slate-300 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 group-hover:from-slate-100 group-hover:to-slate-200 transition-colors">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </PlannerShell>
  );
}
