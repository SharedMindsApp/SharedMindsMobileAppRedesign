import { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveSignals, dismissSignal, computeSignalsForUser } from '../../lib/regulation/signalService';
import type { ActiveSignal } from '../../lib/regulation/signalTypes';
import { SignalCardStage4_1 } from './SignalCardStage4_1';

export function SignalsSection() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<ActiveSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSignals();

    const interval = setInterval(() => {
      loadSignals();
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  const loadSignals = async () => {
    if (!user) return;

    setLoading(true);
    const data = await getActiveSignals(user.id);
    setSignals(data);
    setLoading(false);
  };

  const handleDismiss = async (signalId: string) => {
    if (!user) return;

    await dismissSignal(user.id, signalId);
    await loadSignals();
  };

  const handleComputeNow = async () => {
    if (!user || computing) return;

    setComputing(true);
    await computeSignalsForUser({ userId: user.id });
    await loadSignals();
    setComputing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500">Loading signals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Signals</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Patterns visible in your recent activity
            </p>
          </div>
        </div>

        <button
          onClick={handleComputeNow}
          disabled={computing}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${computing ? 'animate-spin' : ''}`} />
          {computing ? 'Computing...' : 'Refresh'}
        </button>
      </div>

      {signals.length === 0 ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">
            No signals right now
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Signals appear here when patterns are detected in your recent activity. They're temporary and disappear on their own.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((signal) => (
            <SignalCardStage4_1
              key={signal.id}
              signal={signal}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          <strong className="font-medium text-gray-900">What signals are:</strong> Short-lived observations about behavioral patterns. They answer "What seems to be happening?" not "What should you do?"
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mt-2">
          <strong className="font-medium text-gray-900">What they're not:</strong> Judgments, diagnoses, or instructions. You can ignore them without consequence.
        </p>
      </div>
    </div>
  );
}
