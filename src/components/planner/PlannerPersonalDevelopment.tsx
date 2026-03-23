import { useState } from 'react';
import {
  Target,
  Heart,
  Palette,
  Award,
  TrendingUp,
  Anchor,
  Lightbulb,
  GraduationCap,
  BookOpen,
  Repeat,
  Lock,
  Users
} from 'lucide-react';
import { HabitTrackerWidget } from './widgets/HabitTrackerWidget';
import { GoalTrackerWidget } from './widgets/GoalTrackerWidget';
import { GoalTrackerView } from './personal/GoalTrackerView';
import { HabitsView } from './personal/PersonalDevelopmentFeatures';

type FeatureId =
  | 'goals'
  | 'motivation'
  | 'hobbies'
  | 'milestones'
  | 'journal'
  | 'growth'
  | 'values'
  | 'ideas'
  | 'skills'
  | 'habits';

export function PlannerPersonalDevelopment() {
  const [selectedFeature, setSelectedFeature] = useState<FeatureId | null>(null);

  const features = [
    {
      id: 'goals' as FeatureId,
      icon: Target,
      title: 'Goal Tracker',
      description: 'Track personal growth goals across life domains',
      color: 'bg-blue-500'
    },
    {
      id: 'motivation' as FeatureId,
      icon: Heart,
      title: 'Motivation Board',
      description: 'Visual inspiration and emotional grounding',
      color: 'bg-pink-500'
    },
    {
      id: 'hobbies' as FeatureId,
      icon: Palette,
      title: 'Hobbies & Interests',
      description: 'Track interests without productivity pressure',
      color: 'bg-purple-500'
    },
    {
      id: 'milestones' as FeatureId,
      icon: Award,
      title: 'Life Milestones',
      description: 'Meaningful life events and achievements',
      color: 'bg-amber-500'
    },
    {
      id: 'journal' as FeatureId,
      icon: BookOpen,
      title: 'Personal Journal',
      description: 'Reflection tied to growth',
      color: 'bg-teal-500'
    },
    {
      id: 'growth' as FeatureId,
      icon: TrendingUp,
      title: 'Growth Tracking',
      description: 'Qualitative growth, not numeric optimization',
      color: 'bg-green-500'
    },
    {
      id: 'values' as FeatureId,
      icon: Anchor,
      title: 'Values & Principles',
      description: 'Anchor decisions to identity',
      color: 'bg-indigo-500'
    },
    {
      id: 'ideas' as FeatureId,
      icon: Lightbulb,
      title: 'Ideas & Inspiration',
      description: 'Capture sparks without obligation',
      color: 'bg-yellow-500'
    },
    {
      id: 'skills' as FeatureId,
      icon: GraduationCap,
      title: 'Skills Development',
      description: 'Intentional skill growth',
      color: 'bg-red-500'
    },
    {
      id: 'habits' as FeatureId,
      icon: Repeat,
      title: 'Habit Tracker',
      description: 'Support habits without streak pressure',
      color: 'bg-cyan-500'
    }
  ];

  if (selectedFeature) {
    const renderFeatureContent = () => {
      switch (selectedFeature) {
        case 'goals':
          return <GoalTrackerView />;
        case 'habits':
          return <HabitsView />;
        default:
          return (
            <div className="text-center py-16">
              <p className="text-slate-600">Feature content coming soon...</p>
            </div>
          );
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <button
          onClick={() => setSelectedFeature(null)}
          className="mb-6 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center gap-2"
        >
          <span>←</span>
          <span>Back to Personal Development</span>
        </button>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {renderFeatureContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-3">
            Personal Development
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl">
            A mirror, not a manager. Reflect on your growth, track what matters, and stay connected
            to your values without pressure or performance metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(feature.id)}
                className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-left overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 ${feature.color} opacity-10 rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-300`}></div>

                <div className="relative z-10">
                  <div className={`inline-flex p-3 ${feature.color} rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="text-slate-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <Lock className="w-3 h-3" />
                    <span>Private by default</span>
                    <span className="mx-2">•</span>
                    <Users className="w-3 h-3" />
                    <span>Can be shared</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-12 bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Why Personal Development?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Encouraging</h3>
              <p className="text-slate-600 text-sm">
                Reflective and non-gamified. No streak pressure or forced productivity framing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Connected</h3>
              <p className="text-slate-600 text-sm">
                Deeply linked to your existing data without duplication. Everything references the single source of truth.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Private & Shareable</h3>
              <p className="text-slate-600 text-sm">
                Start private, share when ready. Granular control over what's visible to whom.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
