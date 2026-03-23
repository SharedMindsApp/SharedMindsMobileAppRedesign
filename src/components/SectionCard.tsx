import { Star, ArrowRight, Eye } from 'lucide-react';
import { Section, Progress, Member } from '../lib/supabase';

interface SectionCardProps {
  section: Section;
  progressByMember: Record<string, Progress>;
  members: Member[];
  onContinue: (sectionId: string) => void;
  onReview: (sectionId: string) => void;
  lastSaveTime: Record<string, Date>;
}

export function SectionCard({
  section,
  progressByMember,
  members,
  onContinue,
  onReview,
  lastSaveTime,
}: SectionCardProps) {
  const userProgress = Object.values(progressByMember).find(
    (p) => p.section_id === section.id
  );

  const completionPercentage = userProgress
    ? Math.round((userProgress.questions_completed / userProgress.questions_total) * 100)
    : 0;

  const getSaveIndicator = () => {
    const saveTime = lastSaveTime[section.id];
    if (!saveTime) return 'Not started';

    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - saveTime.getTime()) / 1000);

    if (diffSeconds < 5) return 'Saving...';
    if (diffSeconds < 60) return 'Saved';
    if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `Saved ${minutes}m ago`;
    }
    const hours = Math.floor(diffSeconds / 3600);
    return `Saved ${hours}h ago`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-shadow hover:shadow-md">
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">{section.title}</h3>
        <p className="text-sm text-gray-600">{section.description}</p>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-700">
            {userProgress?.questions_completed || 0} / {userProgress?.questions_total || 0}{' '}
            completed
          </div>
          <span className="text-xs text-gray-500 font-medium">{getSaveIndicator()}</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Household Progress
        </span>
        <div className="flex gap-1">
          {members.map((member) => {
            const memberProgress = progressByMember[member.id]?.find(
              (p: Progress) => p.section_id === section.id
            ) || progressByMember[member.id];
            const isComplete = memberProgress?.completed || false;

            return (
              <div key={member.id} title={member.name}>
                <Star
                  size={20}
                  className={`transition-colors ${
                    isComplete
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 fill-gray-300'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onContinue(section.id)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Continue Section
          <ArrowRight size={18} />
        </button>
        <button
          onClick={() => onReview(section.id)}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Review Answers
          <Eye size={18} />
        </button>
      </div>
    </div>
  );
}
