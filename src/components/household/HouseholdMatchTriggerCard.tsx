import { Sparkles, Users, ArrowRight } from 'lucide-react';

interface HouseholdMatchTriggerCardProps {
  onViewMatch: () => void;
  memberCount: number;
  reducedMotion?: boolean;
}

export function HouseholdMatchTriggerCard({
  onViewMatch,
  memberCount,
  reducedMotion = false,
}: HouseholdMatchTriggerCardProps) {
  const transitionClass = reducedMotion ? '' : 'transition-all duration-300';

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl shadow-xl border-2 border-transparent
        bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100
        ${!reducedMotion && 'hover:shadow-2xl hover:scale-[1.02]'}
        ${transitionClass}
      `}
    >
      <div className="absolute inset-0 opacity-20">
        {!reducedMotion && (
          <>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-300 to-orange-300 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-rose-300 to-pink-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          </>
        )}
      </div>

      <div className="relative z-10 p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-2xl flex items-center justify-center shadow-lg">
              <Users size={32} className="text-white" />
            </div>
          </div>

          <div className="flex-1">
            <div className="inline-flex items-center gap-2 mb-2">
              <Sparkles size={20} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                New Insight Available
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Your Household Insight Match is Ready!
            </h3>
            <p className="text-gray-700 text-base leading-relaxed">
              {memberCount} household members have completed their profiles.
              See how your minds work together and how to support each other.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onViewMatch}
            className={`
              flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500
              hover:from-amber-600 hover:via-orange-600 hover:to-rose-600
              text-white font-bold py-4 px-6 rounded-xl shadow-lg
              flex items-center justify-center gap-3
              ${!reducedMotion && 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'}
              ${transitionClass}
            `}
          >
            <span>View Your Match</span>
            <ArrowRight size={22} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="flex -space-x-2">
            {Array.from({ length: Math.min(memberCount, 4) }).map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 border-2 border-white flex items-center justify-center shadow-md"
              >
                <span className="text-white text-xs font-bold">{i + 1}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 font-medium">
            {memberCount} profiles matched
          </p>
        </div>
      </div>
    </div>
  );
}
