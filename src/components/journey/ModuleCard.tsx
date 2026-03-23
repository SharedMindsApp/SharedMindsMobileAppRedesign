import { useState } from 'react';
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  User,
  Home,
  AlertCircle,
  Heart,
  Eye,
  Flag,
  Brain,
} from 'lucide-react';
import { JourneySection } from '../../lib/journeyTypes';
import { Progress } from '../../lib/supabase';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';

interface ModuleCardProps {
  section: JourneySection;
  progress: Progress | null;
  onStart: (sectionId: string) => void;
  completedCount: number;
  totalMembers: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  user: User,
  home: Home,
  'alert-circle': AlertCircle,
  heart: Heart,
  eye: Eye,
  flag: Flag,
  brain: Brain,
  sparkles: Sparkles,
};

export function ModuleCard({ section, progress, onStart, completedCount, totalMembers }: ModuleCardProps) {
  const { config } = useUIPreferences();
  const [isHovered, setIsHovered] = useState(false);
  const transitionClass = config.reducedMotion ? '' : 'transition-all duration-300';

  const completionPercentage = progress
    ? Math.round((progress.questions_completed / progress.questions_total) * 100)
    : 0;

  const isComplete = progress?.completed || false;
  const isStarted = (progress?.questions_completed || 0) > 0;
  const Icon = ICON_MAP[section.icon] || Brain;

  const getStatusInfo = () => {
    if (isComplete) {
      return {
        icon: CheckCircle2,
        text: 'Complete',
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        ring: 'ring-green-100',
      };
    }
    if (isStarted) {
      return {
        icon: Clock,
        text: 'In Progress',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        ring: 'ring-blue-100',
      };
    }
    return {
      icon: Circle,
      text: 'Not Started',
      color: 'text-gray-400',
      bg: 'bg-white',
      border: 'border-gray-200',
      ring: 'ring-gray-100',
    };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <button
      onClick={() => onStart(section.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-full text-left bg-white rounded-xl border-2 ${status.border} ${transitionClass} ${
        isHovered && !config.reducedMotion ? 'shadow-lg scale-[1.02] ring-4 ' + status.ring : 'shadow-sm'
      } overflow-hidden group`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4 mb-3">
          <div className={`w-12 h-12 ${status.bg} rounded-xl flex items-center justify-center flex-shrink-0 ${transitionClass} ${
            isHovered && !config.reducedMotion ? 'scale-110' : ''
          }`}>
            <Icon size={24} className={status.color} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-base leading-snug">{section.title}</h3>
              <StatusIcon size={20} className={`${status.color} flex-shrink-0`} />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{section.emotional_copy}</p>
          </div>
        </div>

        {isStarted && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-600 font-medium">Your Progress</span>
              <span className="text-gray-900 font-semibold">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${transitionClass} ${
                  isComplete
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {isComplete && section.completion_insight && (
          <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-900 font-medium leading-relaxed">
                {section.completion_insight}
              </p>
            </div>
          </div>
        )}

        {totalMembers > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Household</span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalMembers }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${transitionClass} ${
                    i < completedCount ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
              <span className="text-xs font-medium text-gray-700 ml-1">
                {completedCount}/{totalMembers}
              </span>
            </div>
          </div>
        )}

        <div className={`flex items-center justify-end mt-3 pt-3 border-t border-gray-100 text-sm font-medium ${status.color} ${transitionClass} ${
          isHovered ? 'translate-x-1' : ''
        }`}>
          <span>{isComplete ? 'Review' : isStarted ? 'Continue' : 'Start'}</span>
          <ChevronRight size={18} className="ml-1" />
        </div>
      </div>
    </button>
  );
}
