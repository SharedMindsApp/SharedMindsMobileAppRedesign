import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, X, Clock, Info } from 'lucide-react';
import type { EnrichedSignal } from '../../lib/regulation/signalTypes';
import { getIntensityLabel, getStateLabel } from '../../lib/regulation/calibrationService';
import { hasRecentReturnContext } from '../../lib/regulation/returnService';
import { useAuth } from '../../contexts/AuthContext';
import type { SignalTraceExplanation } from '../../lib/regulation/testingModeService';
import { SignalTraceView } from './SignalTraceView';

interface SignalCardProps {
  signal: EnrichedSignal;
  onDismiss: (signalId: string) => void;
  onSnooze?: (signalId: string) => void;
  testingMode?: boolean;
  trace?: SignalTraceExplanation;
}

export function SignalCard({ signal, onDismiss, onSnooze, testingMode = false, trace }: SignalCardProps) {
  const { user } = useAuth();
  const [hasReturnContext, setHasReturnContext] = useState(false);
  const navigate = useNavigate();

  const shouldShowQuietly = signal.calibration?.visibility === 'quietly';
  const shouldHide = signal.calibration?.visibility === 'hide_unless_strong' && signal.intensity !== 'high';

  useEffect(() => {
    if (user) {
      hasRecentReturnContext(user.id).then(setHasReturnContext);
    }
  }, [user]);

  if (shouldHide) {
    return null;
  }

  const intensityColors = {
    low: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-red-100 text-red-700 border-red-200'
  };

  const intensityAccent = {
    low: 'bg-green-400',
    medium: 'bg-amber-400',
    high: 'bg-red-400'
  };

  return (
    <div
      className={`relative bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden ${
        shouldShowQuietly ? 'opacity-60' : ''
      }`}
    >
      {/* Intensity accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${intensityAccent[signal.intensity]}`} />

      <div className="p-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            {/* Header section */}
            <div>
              <div className="flex items-start gap-3 mb-2">
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${intensityColors[signal.intensity]} border flex items-center justify-center`}>
                  <Info className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">{signal.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 ${intensityColors[signal.intensity]} text-xs font-medium rounded-full border`}>
                      {getIntensityLabel(signal.intensity)} intensity
                    </span>
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      {getStateLabel(signal.state)}
                    </span>
                    <span className="text-xs text-gray-500">{signal.timeWindow}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed">{signal.description}</p>
            </div>

            {/* Return context notice */}
            {hasReturnContext && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-0.5">Returning after time away</p>
                  <p className="text-xs text-blue-700">
                    Signals may appear differently during your re-entry period.
                  </p>
                </div>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={() => navigate(`/regulation/signals/${signal.id}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-sm"
            >
              Learn more about this pattern
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {onSnooze && (
              <button
                onClick={() => onSnooze(signal.id)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                title="Snooze for 24 hours"
              >
                <Clock className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => onDismiss(signal.id)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              title="Dismiss this signal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {testingMode && trace && <SignalTraceView trace={trace} />}
    </div>
  );
}
