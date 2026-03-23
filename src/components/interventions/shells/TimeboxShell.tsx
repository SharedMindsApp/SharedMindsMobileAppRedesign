/**
 * Stage 3.2: Timebox Shell
 *
 * Provides a gentle timebox boundary when manually invoked.
 * INT-007: Timeboxed Work Session
 *
 * CRITICAL:
 * - Only starts when user clicks "Start"
 * - Alert is gentle, not urgent
 * - Easy to extend, cancel, or ignore
 * - No tracking of completion or adherence
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InterventionRegistryEntry } from '../../../lib/interventions/stage3_1-types';
import { INTERVENTION_METADATA } from '../../../lib/interventions/stage3_1-types';
import { X, Pause, Edit, XCircle, Clock, AlertCircle } from 'lucide-react';

interface TimeboxShellProps {
  intervention: InterventionRegistryEntry;
  onClose: () => void;
  onPause: () => void;
  onDisable: () => void;
}

export function TimeboxShell({
  intervention,
  onClose,
  onPause,
  onDisable,
}: TimeboxShellProps) {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const metadata = INTERVENTION_METADATA[intervention.intervention_key];
  const params = intervention.user_parameters as any;

  const durationMinutes = params.duration_minutes || 25;
  const workDescription = params.work_description;

  useEffect(() => {
    if (!isActive || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, timeRemaining]);

  function handleStart() {
    setIsActive(true);
    setTimeRemaining(durationMinutes * 60);
    setIsExpired(false);
  }

  function handleExtend() {
    setTimeRemaining((prev) => prev + (15 * 60));
    setIsExpired(false);
  }

  function handleStop() {
    setIsActive(false);
    setTimeRemaining(0);
    setIsExpired(false);
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  if (!isActive) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{metadata.name}</h3>
            <p className="text-sm text-gray-500 mt-1">Click Start when ready</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Duration:</h4>
                <p className="text-sm text-gray-700">{durationMinutes} minutes</p>
                {workDescription && (
                  <p className="text-sm text-gray-600 mt-2">{workDescription}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">This is a gentle boundary, not a deadline:</p>
                <ul className="space-y-1">
                  <li>• You can extend, cancel, or ignore the alert</li>
                  <li>• There is no penalty for going over time</li>
                  <li>• Nothing about your session is tracked</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {intervention.why_text && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Why you created this:</span> {intervention.why_text}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Timebox
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                navigate(`/regulation/edit/${intervention.id}`, { state: { intervention } });
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            This is optional. You can close without starting. Nothing is tracked.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Timebox Active</h3>
              {workDescription && (
                <p className="text-sm text-gray-600">{workDescription}</p>
              )}
            </div>
          </div>
        </div>

        <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-100">
          <div className="text-6xl font-bold text-blue-600 mb-2">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p className="text-sm text-gray-600">
            {isExpired ? 'Time is up - you can extend or finish' : 'Time remaining'}
          </p>
        </div>

        {isExpired && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-sm text-green-800">
              Your timebox has ended. If you want, you can extend for another 15 minutes or finish up.
              There is no penalty for going over time.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          {isExpired && (
            <button
              onClick={handleExtend}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Extend +15 min
            </button>
          )}
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Stop
          </button>
        </div>
        <button
          onClick={onDisable}
          className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Disable
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          You can stop or extend anytime. Nothing is tracked.
        </p>
      </div>
    </div>
  );
}
