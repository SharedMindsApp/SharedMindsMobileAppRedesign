import { Eye, Sparkles, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { RegulationPreset } from '../../lib/regulation/presetTypes';

interface PresetCardProps {
  preset: RegulationPreset;
  isActive?: boolean;
  onPreview: () => void;
  onApply: () => void;
}

const presetColors = {
  overwhelmed: 'from-blue-400 to-indigo-500',
  build_without_expanding: 'from-green-400 to-emerald-500',
  explore_freely: 'from-purple-400 to-pink-500',
  returning_after_time: 'from-orange-400 to-amber-500',
  fewer_interruptions: 'from-teal-400 to-cyan-500'
};

export function PresetCard({ preset, isActive, onPreview, onApply }: PresetCardProps) {
  const [showIntendedState, setShowIntendedState] = useState(false);
  const colorGradient = presetColors[preset.presetId as keyof typeof presetColors] || 'from-gray-400 to-gray-500';

  return (
    <div className={`
      relative border-2 rounded-xl p-5 transition-all group
      ${isActive
        ? 'bg-blue-50 border-blue-400 shadow-lg scale-[1.02]'
        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md hover:scale-[1.01]'
      }
    `}>
      {/* Color accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-gradient-to-r ${colorGradient}`} />

      <div className="flex items-start gap-3 mb-3 mt-1">
        {/* Icon */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br ${colorGradient} flex items-center justify-center shadow-sm`}>
          <Sparkles className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base">{preset.name}</h3>
            {isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                <Sparkles className="w-3 h-3" />
                Active
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{preset.shortDescription}</p>
        </div>
      </div>

      {/* Intended state tooltip */}
      <button
        onMouseEnter={() => setShowIntendedState(true)}
        onMouseLeave={() => setShowIntendedState(false)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-3 relative"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>When to use this</span>

        {showIntendedState && (
          <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-10">
            <div className="font-medium mb-1">Intended for:</div>
            <div className="text-gray-200">{preset.intendedState}</div>
            <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
          </div>
        )}
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
        >
          <Eye className="w-4 h-4" />
          Preview Changes
        </button>
        {!isActive && (
          <button
            onClick={onApply}
            className={`flex-1 px-4 py-2.5 text-sm bg-gradient-to-r ${colorGradient} text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-sm`}
          >
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
}
