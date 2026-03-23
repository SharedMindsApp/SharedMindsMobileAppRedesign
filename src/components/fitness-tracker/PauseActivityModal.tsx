/**
 * Pause Activity Modal
 * 
 * Allows users to pause an activity with reason and optional return date
 */

import { useState } from 'react';
import { X, Pause, AlertCircle } from 'lucide-react';
import { ActivityStateService } from '../../lib/fitnessTracker/activityStateService';
import type { MovementDomain, PauseReason, Season, UserMovementProfile } from '../../lib/fitnessTracker/types';
import { getActivityMetadata } from '../../lib/fitnessTracker/activityMetadata';

type PauseActivityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profile: UserMovementProfile;
  activityDomain: MovementDomain;
  onPaused: (updatedProfile: UserMovementProfile) => void;
};

const pauseReasons: { value: PauseReason; label: string }[] = [
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'work_life_busy', label: 'Work / Life Busy' },
  { value: 'injury_recovery', label: 'Injury / Recovery' },
  { value: 'family_commitments', label: 'Family Commitments' },
  { value: 'weather', label: 'Weather' },
  { value: 'other', label: 'Other' },
];

const seasons: { value: Season; label: string }[] = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
];

export function PauseActivityModal({
  isOpen,
  onClose,
  profile,
  activityDomain,
  onPaused,
}: PauseActivityModalProps) {
  const stateService = new ActivityStateService();
  const [loading, setLoading] = useState(false);
  const [pauseReason, setPauseReason] = useState<PauseReason | ''>('');
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [typicalSeason, setTypicalSeason] = useState<Season | ''>('');
  const [expectedReturn, setExpectedReturn] = useState<string>('');
  const [notes, setNotes] = useState('');

  const metadata = getActivityMetadata(activityDomain);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pauseReason) {
      return;
    }

    try {
      setLoading(true);

      // If seasonal, set as seasonal activity
      if (pauseReason === 'seasonal' && typicalSeason) {
        await stateService.setSeasonalActivity(profile.userId, activityDomain, typicalSeason);
      } else {
        // Otherwise, pause with reason
        await stateService.pauseActivity(profile.userId, activityDomain, pauseReason, {
          expectedReturn: expectedReturn || undefined,
          notes: notes || undefined,
        });
      }

      // Reload profile
      const updatedProfile = await stateService['discoveryService'].getProfile(profile.userId, { forceRefresh: true });
      if (updatedProfile) {
        onPaused(updatedProfile);
      }
      onClose();
    } catch (error) {
      console.error('Failed to pause activity:', error);
      alert(error instanceof Error ? error.message : 'Failed to pause activity');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${metadata.color}15` }}>
                <Pause size={20} style={{ color: metadata.color }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Pause Activity</h2>
                <p className="text-sm text-gray-600 mt-0.5">{metadata.displayName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Taking a break is normal</p>
                <p className="text-blue-700">Your activity will be paused, not deleted. You can resume anytime.</p>
              </div>
            </div>

            {/* Pause Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Why are you taking a break? *
              </label>
              <div className="space-y-2">
                {pauseReasons.map(reason => (
                  <label
                    key={reason.value}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="pauseReason"
                      value={reason.value}
                      checked={pauseReason === reason.value}
                      onChange={(e) => {
                        setPauseReason(e.target.value as PauseReason);
                        setIsSeasonal(e.target.value === 'seasonal');
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Seasonal Configuration */}
            {isSeasonal && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Typical Season
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {seasons.map(season => (
                    <button
                      key={season.value}
                      type="button"
                      onClick={() => setTypicalSeason(season.value)}
                      className={`p-3 rounded-lg border transition-colors text-sm font-medium ${
                        typicalSeason === season.value
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {season.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Expected Return (if not seasonal) */}
            {!isSeasonal && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Return (optional)
                </label>
                <input
                  type="date"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional, private)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Any notes about this break..."
              />
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !pauseReason || (isSeasonal && !typicalSeason)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Pausing...' : 'Pause Activity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
