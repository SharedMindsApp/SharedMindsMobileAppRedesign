/**
 * Quick Log Bottom Sheet
 * 
 * Bottom sheet for tiered logging:
 * - Tier 2: Light detail (duration, intensity, body state)
 * - Tier 3: Deep detail (exercises, notes, etc.) - expands on demand
 */

import { useState, useMemo } from 'react';
import { X, ChevronUp, ChevronDown, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../../lib/fitnessTracker/motionUtils';
import type { QuickLogButton, UserMovementProfile, MovementDomain, ExerciseDetail, FieldDefinition } from '../../lib/fitnessTracker/types';

type QuickLogBottomSheetProps = {
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

export function QuickLogBottomSheet({
  button,
  profile,
  onClose,
  onSubmit,
  submitting,
}: QuickLogBottomSheetProps) {
  // Default to today's date and current time
  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const defaultTime = now.toTimeString().slice(0, 5); // HH:MM

  const [showDeepDetail, setShowDeepDetail] = useState(false);
  const [sessionDate, setSessionDate] = useState<string>(defaultDate);
  const [sessionTime, setSessionTime] = useState<string>(defaultTime);
  
  // Field values stored in a single object for dynamic fields
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({
    duration_minutes: '',
    perceived_intensity: '',
    body_state: '',
    bodyweight_kg: '',
    distance_km: '',
    pace_per_km: '',
    terrain: '',
    notes: '',
  });
  
  // Legacy state for backward compatibility (mapped to fieldValues)
  const intensity = fieldValues.perceived_intensity as number | '';
  const bodyState = fieldValues.body_state as string;
  const duration = fieldValues.duration_minutes as number | '';
  const bodyweight = fieldValues.bodyweight_kg as number | '';
  const notes = fieldValues.notes as string;
  
  const setIntensity = (value: number | '') => setFieldValues(prev => ({ ...prev, perceived_intensity: value }));
  const setBodyState = (value: string) => setFieldValues(prev => ({ ...prev, body_state: value }));
  const setDuration = (value: number | '') => setFieldValues(prev => ({ ...prev, duration_minutes: value }));
  const setBodyweight = (value: number | '') => setFieldValues(prev => ({ ...prev, bodyweight_kg: value }));
  const setNotes = (value: string) => setFieldValues(prev => ({ ...prev, notes: value }));
  
  const [exercises, setExercises] = useState<ExerciseDetail[]>([]);

  // Find category to get domain
  const category = profile.trackerStructure?.categories?.find(c => c.id === button.category);
  const domain = category?.domain || 'other' as MovementDomain;
  const isGymSession = domain === 'gym';

  // Get customizable fields for this activity
  const customization = profile.uiConfiguration?.activityCustomizations?.[domain];
  const quickLogFields = customization?.quickLogFields || ['duration_minutes', 'perceived_intensity', 'body_state'];
  
  // Get field definitions
  const allFields = profile.trackerStructure?.availableFields || [];
  const fieldDefinitions = quickLogFields
    .map(fieldId => allFields.find(f => f.id === fieldId))
    .filter(Boolean) as typeof allFields;

  // Check for injury warnings
  const injuryWarnings = useMemo(() => {
    if (!profile.injuries || profile.injuries.length === 0) return [];
    
    const currentInjuries = profile.injuries.filter(i => i.type === 'current');
    return currentInjuries.filter(injury => {
      if (injury.affectedActivities && injury.affectedActivities.length > 0) {
        return injury.affectedActivities.includes(domain);
      }
      return false;
    });
  }, [profile.injuries, domain]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Combine date and time into ISO timestamp
    const [hours, minutes] = sessionTime.split(':');
    const sessionDateTime = new Date(`${sessionDate}T${hours}:${minutes}`);
    const timestamp = sessionDateTime.toISOString();

    const sessionData: any = {
      domain,
      activity: button.label,
      sessionType: button.subcategory,
      timestamp, // Use the date/time from form
    };

    // Add optional fields from fieldValues
    if (fieldValues.perceived_intensity !== '') sessionData.perceivedIntensity = Number(fieldValues.perceived_intensity);
    if (fieldValues.body_state) sessionData.bodyState = fieldValues.body_state;
    if (fieldValues.duration_minutes !== '') sessionData.durationMinutes = Number(fieldValues.duration_minutes);
    if (fieldValues.bodyweight_kg !== '') sessionData.bodyweightKg = Number(fieldValues.bodyweight_kg);
    if (fieldValues.distance_km !== '') sessionData.distanceKm = Number(fieldValues.distance_km);
    if (fieldValues.pace_per_km) sessionData.pacePerKm = fieldValues.pace_per_km;
    if (fieldValues.terrain) sessionData.terrain = fieldValues.terrain;
    if (fieldValues.notes?.trim()) sessionData.notes = fieldValues.notes.trim();
    if (isGymSession && exercises.length > 0) {
      sessionData.exercises = exercises.filter(ex => ex.name.trim().length > 0);
    }

    onSubmit(sessionData);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 z-50"
        onClick={onClose}
      />
      
      {/* Premium Bottom Sheet with Glassmorphism */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto border-t border-gray-200/60 animate-slide-up">
        {/* Premium Handle */}
        <div className="flex items-center justify-center pt-4 pb-3">
          <div className="w-14 h-1.5 bg-gray-300/60 rounded-full" />
        </div>

        {/* Premium Header */}
        <div className="px-6 pb-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Log Session</h2>
              <p className="text-sm text-gray-500 mt-1.5 font-medium">{button.label}</p>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
              disabled={submitting}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Injury Warnings */}
        {injuryWarnings.length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-amber-900 mb-1">Current injuries</p>
                <ul className="text-amber-800 space-y-1">
                  {injuryWarnings.map(injury => (
                    <li key={injury.id}>
                      • {injury.name}
                      {injury.limitations && ` — ${injury.limitations}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Form with Progressive Disclosure */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Core Fields - Date and Time */}
          <div className="grid grid-cols-2 gap-4 pb-6 border-b border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5">
                Date *
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5">
                Time *
              </label>
              <input
                type="time"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                required
              />
            </div>
          </div>

          {/* Customizable Fields - Dynamically rendered based on user preferences */}
          <div className="space-y-4 mb-4">
            {fieldDefinitions.map(field => {
              // Render field based on type
              if (field.id === 'duration_minutes') {
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label} <span className="text-gray-400 font-normal">(minutes)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="600"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 45"
                    />
                  </div>
                );
              }

              if (field.id === 'perceived_intensity') {
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label} <span className="text-gray-400 font-normal">(1-5)</span>
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setIntensity(level)}
                          className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                            intensity === level
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (field.id === 'body_state') {
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      How did you feel?
                    </label>
                    <select
                      value={bodyState}
                      onChange={(e) => setBodyState(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select...</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (field.id === 'bodyweight_kg' && isGymSession) {
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      step="0.1"
                      value={bodyweight}
                      onChange={(e) => setBodyweight(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 75.5"
                    />
                  </div>
                );
              }

              if (field.id === 'distance_km' && (domain === 'running' || domain === 'cycling')) {
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={fieldValues.distance_km || ''}
                      onChange={(e) => setFieldValues(prev => ({ ...prev, distance_km: e.target.value ? Number(e.target.value) : '' }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 5.0"
                    />
                  </div>
                );
              }

              if (field.id === 'pace_per_km' && domain === 'running') {
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={fieldValues.pace_per_km || ''}
                      onChange={(e) => setFieldValues(prev => ({ ...prev, pace_per_km: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 5:30"
                    />
                  </div>
                );
              }

              if (field.id === 'terrain' && (domain === 'running' || domain === 'cycling')) {
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <select
                      value={fieldValues.terrain || ''}
                      onChange={(e) => setFieldValues(prev => ({ ...prev, terrain: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select...</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              // Default: render as text input for unknown fields
              return (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                  </label>
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                </div>
              );
            })}
          </div>

          {/* Tier 3: Deep Detail - Expandable */}
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowDeepDetail(!showDeepDetail)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors mb-4"
            >
              <span>More details</span>
              {showDeepDetail ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>

            {showDeepDetail && (
              <div className="space-y-4">
                {/* Bodyweight (Gym sessions) */}
                {isGymSession && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bodyweight <span className="text-gray-400 font-normal">(kg)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      step="0.1"
                      value={bodyweight}
                      onChange={(e) => setBodyweight(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 75.5"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Any notes about this session..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Premium Action Buttons */}
          <div className="flex gap-3 pt-4 pb-6 sticky bottom-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 mt-6 -mx-6 px-6">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              disabled={submitting}
              className="flex-1 px-6 py-3.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-200 disabled:opacity-50 hover:scale-[0.98] active:scale-[0.96]"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={() => triggerHaptic('medium')}
              disabled={submitting}
              className="flex-1 px-6 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[0.98] active:scale-[0.96] shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Save Session</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
