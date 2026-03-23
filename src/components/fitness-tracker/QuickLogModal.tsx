/**
 * Quick Log Modal
 * 
 * Modal for quickly logging a movement session.
 * Shows fields based on category/subcategory configuration.
 */

import { useState, useMemo } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { QuickLogButton, UserMovementProfile, MovementDomain, ExerciseDetail } from '../../lib/fitnessTracker/types';

type QuickLogModalProps = {
  button: QuickLogButton;
  profile: UserMovementProfile;
  onClose: () => void;
  onSubmit: (sessionData: {
    domain: MovementDomain;
    activity: string;
    sessionType?: string;
    [key: string]: any;
  }) => void;
  submitting: boolean;
};

export function QuickLogModal({
  button,
  profile,
  onClose,
  onSubmit,
  submitting,
}: QuickLogModalProps) {
  const [intensity, setIntensity] = useState<number | ''>('');
  const [bodyState, setBodyState] = useState<string>('');
  const [duration, setDuration] = useState<number | ''>('');
  const [bodyweight, setBodyweight] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseDetail[]>([]);

  // Find category to get domain
  const category = profile.trackerStructure?.categories?.find(c => c.id === button.category);
  const domain = category?.domain || 'other' as MovementDomain;

  // Get optional fields from subcategory if available
  const subcategory = button.subcategory
    ? profile.trackerStructure?.subcategories?.[button.category]?.find(s => s.id === button.subcategory)
    : null;
  const isGymSession = domain === 'gym';

  // Check for injury warnings - current injuries that affect this activity
  const injuryWarnings = useMemo(() => {
    if (!profile.injuries || profile.injuries.length === 0) return [];
    
    const currentInjuries = profile.injuries.filter(i => i.type === 'current');
    return currentInjuries.filter(injury => {
      // If injury has affectedActivities, check if this domain is affected
      if (injury.affectedActivities && injury.affectedActivities.length > 0) {
        return injury.affectedActivities.includes(domain);
      }
      // If no specific activities listed, assume all activities might be affected (user's choice)
      return false;
    });
  }, [profile.injuries, domain]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const sessionData: any = {
      domain,
      activity: button.label,
      sessionType: button.subcategory,
    };

    // Add optional fields
    if (intensity !== '') sessionData.perceivedIntensity = Number(intensity);
    if (bodyState) sessionData.bodyState = bodyState;
    if (duration !== '') sessionData.durationMinutes = Number(duration);
    if (bodyweight !== '') sessionData.bodyweightKg = Number(bodyweight);
    if (notes.trim()) sessionData.notes = notes.trim();
    if (isGymSession && exercises.length > 0) {
      sessionData.exercises = exercises.filter(ex => ex.name.trim().length > 0);
    }

    onSubmit(sessionData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Log Session</h2>
            <p className="text-sm text-gray-600 mt-1">{button.label}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={submitting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Injury Warning Banner */}
        {injuryWarnings.length > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-orange-900 mb-1">
                  Injury Warning
                </h3>
                <p className="text-sm text-orange-800 mb-2">
                  This activity may affect your current injury/injuries:
                </p>
                <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                  {injuryWarnings.map((injury, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{injury.name}</span>
                      {injury.severity && (
                        <span className="text-orange-700"> ({injury.severity})</span>
                      )}
                      {injury.limitations && (
                        <span className="text-orange-700"> - {injury.limitations}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-orange-700 mt-2 italic">
                  Please proceed with caution and listen to your body.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Intensity (1-5) */}
          <div>
            <label htmlFor="intensity" className="block text-sm font-medium text-gray-700 mb-1">
              Intensity (1-5)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setIntensity(level)}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                    intensity === level
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Body State */}
          <div>
            <label htmlFor="bodyState" className="block text-sm font-medium text-gray-700 mb-1">
              Body State
            </label>
            <select
              id="bodyState"
              value={bodyState}
              onChange={(e) => setBodyState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="fresh">Fresh</option>
              <option value="sore">Sore</option>
              <option value="fatigued">Fatigued</option>
              <option value="stiff">Stiff</option>
              <option value="injured">Injured</option>
              <option value="recovered">Recovered</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>

          {/* Bodyweight */}
          <div>
            <label htmlFor="bodyweight" className="block text-sm font-medium text-gray-700 mb-1">
              Bodyweight (kg)
            </label>
            <input
              id="bodyweight"
              type="number"
              min="0"
              step="0.1"
              value={bodyweight}
              onChange={(e) => setBodyweight(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>

          {/* Exercises (Gym only) */}
          {isGymSession && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Exercises (optional)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setExercises(prev => [
                      ...prev,
                      { name: '', sets: undefined, reps: undefined, weightKg: undefined, notes: undefined },
                    ])
                  }
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add exercise
                </button>
              </div>

              {exercises.length === 0 && (
                <p className="text-xs text-gray-500">Add exercises if you want set/rep details.</p>
              )}

              <div className="space-y-3">
                {exercises.map((exercise, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Exercise {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => setExercises(prev => prev.filter((_, i) => i !== index))}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={exercise.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, name: value } : ex));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Exercise name"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min="0"
                          value={exercise.sets ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, sets: value } : ex));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Sets"
                        />
                        <input
                          type="number"
                          min="0"
                          value={exercise.reps ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, reps: value } : ex));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Reps"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={exercise.weightKg ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, weightKg: value } : ex));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Weight (kg)"
                        />
                      </div>
                      <input
                        type="text"
                        value={exercise.notes ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, notes: value } : ex));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional notes about this session"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Logging...' : 'Log Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
