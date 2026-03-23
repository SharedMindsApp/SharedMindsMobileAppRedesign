import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Lock } from 'lucide-react';
import { JourneyStage } from '../../lib/journeyTypes';
import { Progress, Member } from '../../lib/supabase';
import { ModuleCard } from './ModuleCard';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';

interface StageCardProps {
  stage: JourneyStage;
  progressBySection: Record<string, Progress | null>;
  members: Member[];
  currentMemberId: string;
  onStartSection: (sectionId: string) => void;
  isLocked?: boolean;
  previousStageComplete?: boolean;
}

const COLOR_CONFIG = {
  blue: {
    bg: 'from-blue-500 to-indigo-600',
    light: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    ring: 'ring-blue-100',
  },
  amber: {
    bg: 'from-amber-500 to-orange-600',
    light: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    ring: 'ring-amber-100',
  },
  rose: {
    bg: 'from-rose-500 to-pink-600',
    light: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    ring: 'ring-rose-100',
  },
  emerald: {
    bg: 'from-emerald-500 to-teal-600',
    light: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    ring: 'ring-emerald-100',
  },
};

export function StageCard({
  stage,
  progressBySection,
  members,
  currentMemberId,
  onStartSection,
  isLocked = false,
  previousStageComplete = true,
}: StageCardProps) {
  const { config } = useUIPreferences();
  const [isExpanded, setIsExpanded] = useState(!isLocked && previousStageComplete);
  const transitionClass = config.reducedMotion ? '' : 'transition-all duration-300';

  const colors = COLOR_CONFIG[stage.color as keyof typeof COLOR_CONFIG] || COLOR_CONFIG.blue;

  const completedSections = stage.sections.filter(
    (section) => progressBySection[section.id]?.completed
  ).length;
  const totalSections = stage.sections.length;
  const stageProgress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
  const isComplete = completedSections === totalSections;

  const getCompletedCountForSection = (sectionId: string) => {
    return members.filter((member) => {
      const memberProgress = progressBySection[`${member.id}-${sectionId}`];
      return memberProgress?.completed || false;
    }).length;
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg border-2 ${colors.border} overflow-hidden ${transitionClass}`}>
      <button
        onClick={() => !isLocked && setIsExpanded(!isExpanded)}
        disabled={isLocked}
        className={`w-full text-left ${transitionClass} ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'}`}
      >
        <div className={`bg-gradient-to-r ${colors.bg} p-6 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 text-8xl opacity-10 -translate-y-6 translate-x-6">
            {stage.emoji}
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-4xl">{stage.emoji}</span>
                  {isComplete && <CheckCircle2 size={24} className="text-white" />}
                  {isLocked && <Lock size={20} className="text-white/80" />}
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">{stage.title}</h2>
                <p className="text-white/90 text-sm">{stage.subtitle}</p>
              </div>

              {!isLocked && (
                <div className={`text-white ${transitionClass} ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                  {isExpanded ? <ChevronDown size={28} /> : <ChevronRight size={28} />}
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-white/90 text-sm mb-2">
                <span className="font-medium">Stage Progress</span>
                <span className="font-bold">{stageProgress}%</span>
              </div>
              <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-2.5 overflow-hidden">
                <div
                  className={`bg-white h-2.5 rounded-full ${transitionClass}`}
                  style={{ width: `${stageProgress}%` }}
                />
              </div>
              <div className="mt-2 text-white/80 text-xs">
                {completedSections} of {totalSections} modules complete
              </div>
            </div>
          </div>
        </div>

        {isLocked && (
          <div className={`${colors.light} p-4 border-t ${colors.border}`}>
            <p className="text-sm text-gray-700 text-center">
              Complete the previous stage to unlock this journey
            </p>
          </div>
        )}
      </button>

      {isExpanded && !isLocked && (
        <div className="p-4 space-y-3">
          {stage.sections
            .sort((a, b) => a.stage_order - b.stage_order)
            .map((section) => (
              <ModuleCard
                key={section.id}
                section={section}
                progress={progressBySection[section.id]}
                onStart={onStartSection}
                completedCount={getCompletedCountForSection(section.id)}
                totalMembers={members.length}
              />
            ))}
        </div>
      )}
    </div>
  );
}
