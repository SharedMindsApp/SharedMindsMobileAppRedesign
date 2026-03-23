/**
 * RoadmapOnboardingCard
 * 
 * Phase 5: Individual card component for the onboarding carousel.
 * Each card displays educational content about Guardrails features.
 * 
 * Cards are fully clickable (for future deep-linking).
 */

import { 
  Compass, 
  Layers, 
  Calendar, 
  Sparkles, 
  ArrowRightLeft, 
  Rocket 
} from 'lucide-react';

export interface OnboardingCardData {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
  icon: React.ReactNode;
  visualStyle: 'default' | 'gradient' | 'emphasis';
}

/**
 * Card content definitions for the onboarding carousel.
 */
export const ONBOARDING_CARDS: OnboardingCardData[] = [
  {
    id: 'welcome',
    title: 'Welcome to Guardrails',
    subtitle: 'Your structured project planning system',
    body: 'Build projects that adapt to reality. Plan with intention, execute with flexibility.',
    icon: <Compass size={48} className="text-blue-600" />,
    visualStyle: 'default',
  },
  {
    id: 'tracks',
    title: 'Structure Your Work',
    subtitle: 'Tracks & Subtracks',
    body: 'Tracks define major workstreams. Subtracks break them into focused areas. Organize complexity naturally.',
    icon: <Layers size={48} className="text-purple-600" />,
    visualStyle: 'default',
  },
  {
    id: 'items',
    title: 'Plan in Time',
    subtitle: 'Tasks, Events, Milestones',
    body: 'Tasks, events, milestones and goals live on your roadmap. Everything has a place in time.',
    icon: <Calendar size={48} className="text-green-600" />,
    visualStyle: 'default',
  },
  {
    id: 'flexible',
    title: 'Built for Real Life',
    subtitle: 'Flexible & Human',
    body: 'Collapse tracks. Focus when you need to. Nothing forces productivity.',
    icon: <Sparkles size={48} className="text-amber-600" />,
    visualStyle: 'gradient',
  },
  {
    id: 'execution',
    title: 'From Planning to Action',
    subtitle: 'Execution & Sync',
    body: 'Your roadmap feeds Task Flow and Calendar when you want it to. Planning and execution stay connected.',
    icon: <ArrowRightLeft size={48} className="text-indigo-600" />,
    visualStyle: 'default',
  },
  {
    id: 'ready',
    title: 'Ready to Begin?',
    subtitle: 'Let\'s get started',
    body: 'Let\'s set up your project structure together. We\'ll guide you through the basics.',
    icon: <Rocket size={48} className="text-blue-600" />,
    visualStyle: 'emphasis',
  },
];

interface RoadmapOnboardingCardProps {
  card: OnboardingCardData;
  isActive: boolean;
}

export function RoadmapOnboardingCard({ card, isActive }: RoadmapOnboardingCardProps) {
  const getCardStyles = () => {
    switch (card.visualStyle) {
      case 'gradient':
        return 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200';
      case 'emphasis':
        return 'bg-gradient-to-br from-blue-600 to-purple-600 border-blue-700 text-white';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getTextStyles = () => {
    if (card.visualStyle === 'emphasis') {
      return {
        title: 'text-white',
        subtitle: 'text-blue-100',
        body: 'text-blue-50',
      };
    }
    return {
      title: 'text-gray-900',
      subtitle: 'text-gray-600',
      body: 'text-gray-700',
    };
  };

  const textStyles = getTextStyles();

  return (
    <div
      className={`
        w-full max-w-sm mx-auto
        rounded-2xl border-2 p-6 md:p-8
        shadow-lg
        transition-all duration-300
        ${getCardStyles()}
      `}
      style={{
        minHeight: '380px',
      }}
    >
      {/* Icon */}
      <div className="mb-6 flex justify-center">
        <div
          className={`
            w-20 h-20 rounded-full
            flex items-center justify-center
            ${card.visualStyle === 'emphasis' 
              ? 'bg-white/20 backdrop-blur-sm' 
              : 'bg-gray-50'
            }
          `}
        >
          {card.icon}
        </div>
      </div>

      {/* Content */}
      <div className="text-center space-y-4">
        {/* Title */}
        <h3 className={`text-2xl font-bold ${textStyles.title}`}>
          {card.title}
        </h3>

        {/* Subtitle */}
        {card.subtitle && (
          <p className={`text-sm font-medium ${textStyles.subtitle}`}>
            {card.subtitle}
          </p>
        )}

        {/* Body */}
        <p className={`text-base leading-relaxed ${textStyles.body} mt-4`}>
          {card.body}
        </p>
      </div>
    </div>
  );
}
