import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSignalById, getSignalDefinitions } from '../../lib/regulation/signalService';
import { enrichSignalsWithCalibration } from '../../lib/regulation/calibrationService';
import { getIntensityLabel, getStateLabel } from '../../lib/regulation/calibrationService';
import type { EnrichedSignal } from '../../lib/regulation/signalTypes';
import { SignalCalibrationPanel } from './SignalCalibrationPanel';
import { hasRecentReturnContext } from '../../lib/regulation/returnService';
import { getSignalTrendState, getTrendExplanation, type TrendState } from '../../lib/regulation/regulationTrendService';
import { getPlaybookBySignalKey, deletePlaybook, countQuickPinsForSignal } from '../../lib/regulation/playbookService';
import type { RegulationPlaybook } from '../../lib/regulation/playbookTypes';
import { QuickPinCard } from './QuickPinCard';
import { PlaybookNoteCard } from './PlaybookNoteCard';
import { PlaybookEntryModal } from './PlaybookEntryModal';

export function SignalDetailPage() {
  const { signalId } = useParams<{ signalId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [signal, setSignal] = useState<EnrichedSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasReturnContext, setHasReturnContext] = useState(false);
  const [trendState, setTrendState] = useState<TrendState | null>(null);
  const [playbook, setPlaybook] = useState<RegulationPlaybook | null>(null);
  const [quickPinCount, setQuickPinCount] = useState(0);
  const [showQuickPin, setShowQuickPin] = useState(false);
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);

  useEffect(() => {
    if (!user || !signalId) return;
    loadSignal();
    hasRecentReturnContext(user.id).then(setHasReturnContext);
  }, [user, signalId]);

  async function loadSignal() {
    if (!user || !signalId) return;

    try {
      const activeSignal = await getSignalById(user.id, signalId);
      if (!activeSignal) {
        navigate('/regulation');
        return;
      }

      const definitions = await getSignalDefinitions();
      const enriched = await enrichSignalsWithCalibration(user.id, [activeSignal], definitions);
      const enrichedSignal = enriched[0] || null;
      setSignal(enrichedSignal);

      if (enrichedSignal) {
        const trend = await getSignalTrendState(user.id, enrichedSignal.signal_key, '7days');
        setTrendState(trend);

        const existingPlaybook = await getPlaybookBySignalKey(user.id, enrichedSignal.signal_key);
        setPlaybook(existingPlaybook);

        const pinCount = await countQuickPinsForSignal(user.id, enrichedSignal.signal_key);
        setQuickPinCount(pinCount);
        setShowQuickPin(pinCount < 2 && !existingPlaybook);
      }
    } catch (error) {
      console.error('[SignalDetailPage] Error loading signal:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading signal details...</div>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Signal not found</p>
          <button
            onClick={() => navigate('/regulation')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Regulation Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/regulation')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Regulation Hub
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{signal.title}</h1>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                  {getStateLabel(signal.state)}
                </div>
                <div className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                  {getIntensityLabel(signal.intensity)}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">{signal.timeWindow}</p>
          </div>

          <div>
            <p className="text-gray-700">{signal.description}</p>
          </div>

          {hasReturnContext && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Return Context</p>
                  <p>
                    A recent time-away note exists. Signals may look different during this period.
                    Patterns detected here might reflect re-entry or adjustment, not long-term behavior.
                  </p>
                </div>
              </div>
            </div>
          )}

          {trendState && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">How often this has appeared recently</h3>
              <p className="text-sm text-gray-600">
                {getTrendExplanation(trendState)}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">What This Signal Means</h2>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {signal.definition?.explanation_text || signal.explanation_why}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-gray-800">
              <span className="font-medium">Important:</span> This does not mean something is wrong.
              Signals are descriptive patterns, not problems to fix.
            </p>
          </div>
        </div>

        {signal.context_data && Object.keys(signal.context_data).length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Why It Showed</h2>
            <p className="text-sm text-gray-600">
              This signal appeared based on the following activity pattern:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {Object.entries(signal.context_data).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 text-sm">
                  <span className="text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="text-gray-900 font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showQuickPin && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Note (Optional)</h2>
            <QuickPinCard
              signalKey={signal.signal_key}
              signalInstanceId={signalId}
              onSaved={() => {
                setShowQuickPin(false);
                loadSignal();
              }}
              onSkipped={() => setShowQuickPin(false)}
            />
          </div>
        )}

        {playbook && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Notes</h2>
            <PlaybookNoteCard
              playbook={playbook}
              onEdit={() => setShowPlaybookModal(true)}
              onDelete={async () => {
                if (user && confirm('Delete this note? This cannot be undone.')) {
                  await deletePlaybook(user.id, signal.signal_key);
                  await loadSignal();
                }
              }}
            />
          </div>
        )}

        {!playbook && quickPinCount >= 2 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Add to Your Playbook</h2>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  This pattern has appeared more than once. You might find it useful to leave yourself a note for next time.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPlaybookModal(true)}
              className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Add to my playbook
            </button>
          </div>
        )}

        <SignalCalibrationPanel
          signal={signal}
          onCalibrationUpdated={() => loadSignal()}
        />

        {showPlaybookModal && (
          <PlaybookEntryModal
            signalKey={signal.signal_key}
            signalName={signal.title}
            onClose={() => setShowPlaybookModal(false)}
            onSaved={() => loadSignal()}
          />
        )}
      </div>
    </div>
  );
}
