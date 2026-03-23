import { useState, useEffect } from 'react';
import { Heart, Sparkles, Trophy, BookOpen, Star, Lightbulb, Award, ArrowLeft } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { LifeAreaFeatureCard } from './LifeAreaFeatureCard';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';
import { MotivationBoardView } from './personal/MotivationBoardView';
import { PersonalJournalView } from './personal/PersonalJournalView';
import { LifeMilestonesView } from './personal/LifeMilestonesView';
import { SkillsDevelopmentView } from './personal/SkillsDevelopmentView';
import {
  HobbiesView,
  ValuesView,
  IdeasView
} from './personal/PersonalDevelopmentFeatures';

type View = 'dashboard' | 'motivation' | 'hobbies' | 'milestones' | 'journal' | 'values' | 'ideas' | 'skills';

export function PlannerPersonal() {
  // Phase 4A: Remember last used section for faster access
  const [currentView, setCurrentView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      const lastSection = localStorage.getItem('last_personal_section');
      if (lastSection && ['dashboard', 'motivation', 'hobbies', 'milestones', 'journal', 'values', 'ideas', 'skills'].includes(lastSection)) {
        return lastSection as View;
      }
    }
    return 'dashboard';
  });

  // Phase 4A: Save section when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_personal_section', currentView);
    }
  }, [currentView]);

  const renderView = () => {
    switch (currentView) {
      case 'motivation':
        return <MotivationBoardView />;
      case 'hobbies':
        return <HobbiesView />;
      case 'milestones':
        return <LifeMilestonesView />;
      case 'journal':
        return <PersonalJournalView />;
      case 'values':
        return <ValuesView />;
      case 'ideas':
        return <IdeasView />;
      case 'skills':
        return <SkillsDevelopmentView />;
      default:
        return null;
    }
  };

  if (currentView !== 'dashboard') {
    return (
      <PlannerShell>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Personal Development</span>
        </button>
        {renderView()}
      </PlannerShell>
    );
  }

  const features: LifeAreaFeature[] = [
    {
      id: 'motivation',
      icon: Heart,
      label: 'Motivation Board',
      description: 'Visual inspiration board with quotes, images, and affirmations',
      onClick: () => setCurrentView('motivation'),
      badge: 'NEW',
    },
    {
      id: 'hobbies',
      icon: Sparkles,
      label: 'Hobbies & Interests',
      description: 'Document hobbies, interests, and personal activities',
      onClick: () => setCurrentView('hobbies'),
    },
    {
      id: 'milestones',
      icon: Trophy,
      label: 'Life Milestones',
      description: 'Record and celebrate major life achievements and milestones',
      onClick: () => setCurrentView('milestones'),
    },
    {
      id: 'journal',
      icon: BookOpen,
      label: 'Personal Journal',
      description: 'Daily journaling for reflection and self-awareness',
      onClick: () => setCurrentView('journal'),
    },
    {
      id: 'values',
      icon: Star,
      label: 'Values & Principles',
      description: 'Define and align actions with your core values and beliefs',
      onClick: () => setCurrentView('values'),
    },
    {
      id: 'ideas',
      icon: Lightbulb,
      label: 'Ideas & Inspiration',
      description: 'Capture creative ideas and personal project inspirations',
      onClick: () => setCurrentView('ideas'),
    },
    {
      id: 'skills',
      icon: Award,
      label: 'Skills Development',
      description: 'Document skills you want to develop and planning',
      onClick: () => setCurrentView('skills'),
    },
  ];

  return (
    <PlannerShell>
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Personal Development</h1>
          <p className="text-xs md:text-sm text-gray-500">Your journey of growth, discovery, and self-improvement</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu features={features} themeColor="indigo" />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LifeAreaFeatureCard
            icon={Heart}
            title="Motivation Board"
            description="Visual inspiration board with quotes, images, and affirmations"
            color="bg-rose-500"
            onClick={() => setCurrentView('motivation')}
            badge="NEW"
          />

          <LifeAreaFeatureCard
            icon={Sparkles}
            title="Hobbies & Interests"
            description="Document hobbies, interests, and personal activities"
            color="bg-purple-500"
            onClick={() => setCurrentView('hobbies')}
          />

          <LifeAreaFeatureCard
            icon={Trophy}
            title="Life Milestones"
            description="Record and celebrate major life achievements and milestones"
            color="bg-amber-500"
            onClick={() => setCurrentView('milestones')}
          />

          <LifeAreaFeatureCard
            icon={BookOpen}
            title="Personal Journal"
            description="Daily journaling for reflection and self-awareness"
            color="bg-teal-500"
            onClick={() => setCurrentView('journal')}
          />

          <LifeAreaFeatureCard
            icon={Star}
            title="Values & Principles"
            description="Define and align actions with your core values and beliefs"
            color="bg-indigo-500"
            onClick={() => setCurrentView('values')}
          />

          <LifeAreaFeatureCard
            icon={Lightbulb}
            title="Ideas & Inspiration"
            description="Capture creative ideas and personal project inspirations"
            color="bg-yellow-500"
            onClick={() => setCurrentView('ideas')}
          />

          <LifeAreaFeatureCard
            icon={Award}
            title="Skills Development"
            description="Document skills you want to develop and planning"
            color="bg-cyan-500"
            onClick={() => setCurrentView('skills')}
          />
        </div>
      </div>
    </PlannerShell>
  );
}
