/**
 * Stage 4.4: Reorientation Card
 *
 * Shows after return flow (or if skipped).
 * Provides gentle entry back into work without pressure.
 */

import { Compass, Clock, ArrowRight } from 'lucide-react';
import type { ReorientationInfo } from '../../lib/regulation/returnTypes';

interface ReorientationCardProps {
  info: ReorientationInfo;
  onNavigate: (projectId?: string) => void;
  onDismiss: () => void;
}

export function ReorientationCard({ info, onNavigate, onDismiss }: ReorientationCardProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <Compass className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-900 mb-1">
            Finding your bearings
          </h3>
          <p className="text-sm text-gray-600">
            Here's where things were when you last worked
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Last Project */}
        {info.lastProject && (
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">
              Last active project
            </div>
            <div className="text-sm font-medium text-gray-900">
              {info.lastProject.name}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {info.lastProject.type}
            </div>
          </div>
        )}

        {/* Last Action */}
        {info.lastAction && (
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">
              Last completed action
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{info.lastAction.description}</span>
              <span className="text-gray-500">
                · {formatTimestamp(info.lastAction.timestamp)}
              </span>
            </div>
          </div>
        )}

        {/* Entry Action */}
        {info.suggestedEntry && (
          <div>
            <button
              onClick={() => {
                if (info.lastProject) {
                  onNavigate(info.lastProject.id);
                } else {
                  onNavigate();
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {info.suggestedEntry.label}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onDismiss}
              className="w-full mt-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              I'll find my own way
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
