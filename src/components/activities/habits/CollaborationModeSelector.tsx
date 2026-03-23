/**
 * Collaboration Mode Selector
 * 
 * Allows users to choose how a household/team habit should work:
 * - Collaborative: Everyone does it together
 * - Visible: One person does it, others observe
 * - Competitive: Friendly competition
 */

import { Handshake, Eye, Trophy } from 'lucide-react';
import type { CollaborationMode } from '../../../lib/activities/activityTypes';

interface CollaborationModeSelectorProps {
  selectedMode: CollaborationMode;
  onModeChange: (mode: CollaborationMode) => void;
  isMobile?: boolean;
}

export function CollaborationModeSelector({
  selectedMode,
  onModeChange,
  isMobile = false,
}: CollaborationModeSelectorProps) {
  const modes: Array<{
    mode: CollaborationMode;
    icon: typeof Handshake;
    label: string;
    description: string;
  }> = [
    {
      mode: 'collaborative',
      icon: Handshake,
      label: 'Do it together',
      description: 'Everyone aims to complete the habit',
    },
    {
      mode: 'visible',
      icon: Eye,
      label: 'One person does it',
      description: 'Others can see but don\'t check in',
    },
    {
      mode: 'competitive',
      icon: Trophy,
      label: 'Friendly competition',
      description: 'See who completes it most',
    },
  ];

  return (
    <div className="space-y-3">
      <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}>
        How should this habit work?
      </label>
      
      <div className="grid grid-cols-1 gap-2">
        {modes.map(({ mode, icon: Icon, label, description }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            className={`
              relative
              flex items-start gap-3
              p-3 rounded-lg border-2 transition-all
              text-left
              ${selectedMode === mode
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <div className={`
              flex-shrink-0 mt-0.5
              ${selectedMode === mode ? 'text-indigo-600' : 'text-gray-400'}
            `}>
              <Icon size={isMobile ? 18 : 20} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className={`
                font-medium
                ${isMobile ? 'text-sm' : 'text-base'}
                ${selectedMode === mode ? 'text-indigo-900' : 'text-gray-900'}
              `}>
                {label}
              </div>
              <div className={`
                ${isMobile ? 'text-xs' : 'text-sm'}
                ${selectedMode === mode ? 'text-indigo-700' : 'text-gray-500'}
                mt-0.5
              `}>
                {description}
              </div>
            </div>
            
            {selectedMode === mode && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
