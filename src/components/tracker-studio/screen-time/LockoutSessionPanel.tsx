/**
 * Lockout Session Panel
 * 
 * Displays active and historical lockout sessions.
 */

import { Lock, Clock, AlertCircle } from 'lucide-react';
import type { Tracker } from '../../../lib/trackerStudio/types';

interface LockoutSessionPanelProps {
  tracker: Tracker;
}

export function LockoutSessionPanel({ tracker }: LockoutSessionPanelProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={24} className="text-red-600" />
          Lockout Sessions
        </h2>
        <p className="text-gray-600">Active and historical lockout sessions coming soon...</p>
      </div>
    </div>
  );
}
