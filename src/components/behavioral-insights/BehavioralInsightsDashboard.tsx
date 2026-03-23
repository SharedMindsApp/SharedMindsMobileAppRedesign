/**
 * Behavioral Insights Dashboard
 *
 * Main view for Stage 2 (Display Layer).
 *
 * Respects:
 * - Safe Mode (overrides everything)
 * - Display consent (per signal)
 * - User preferences (collapsed, hidden)
 *
 * NO judgmental language, NO recommendations, NO pressure
 */

import { useState, useEffect } from 'react';
import { Shield, Settings, Eye, AlertCircle, Info, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SafeModeToggle } from './SafeModeToggle';
import { ConsentCenter } from './ConsentCenter';
import { InsightCard } from './InsightCard';
import { ReflectionVault } from './ReflectionVault';
import {
  getDisplayableInsights,
  isSafeModeEnabled,
  type DisplayableInsight,
} from '../../lib/behavioral-sandbox/stage2-service';

type View = 'insights' | 'consent' | 'safe-mode' | 'reflections';

export function BehavioralInsightsDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('insights');
  const [insights, setInsights] = useState<DisplayableInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [safeModeActive, setSafeModeActive] = useState(false);

  useEffect(() => {
    if (!user) return;

    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const safeModeStatus = await isSafeModeEnabled(user.id);
      setSafeModeActive(safeModeStatus);

      if (!safeModeStatus) {
        const displayableInsights = await getDisplayableInsights(user.id, {
          respectSafeMode: true,
        });
        setInsights(displayableInsights);
      } else {
        setInsights([]);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Please sign in to view insights</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Behavioral Observations
        </h1>
        <p className="text-gray-600">
          View patterns from your recorded data. These are observations, not evaluations.
        </p>
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setView('insights')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            view === 'insights'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Insights
          </span>
        </button>

        <button
          onClick={() => setView('reflections')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            view === 'reflections'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Reflections
          </span>
        </button>

        <button
          onClick={() => setView('consent')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            view === 'consent'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Display Settings
          </span>
        </button>

        <button
          onClick={() => setView('safe-mode')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            view === 'safe-mode'
              ? 'border-orange-600 text-orange-600'
              : safeModeActive
              ? 'border-transparent text-orange-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Safe Mode
            {safeModeActive && (
              <span className="px-1.5 py-0.5 bg-orange-200 text-orange-900 text-xs font-medium rounded">
                ON
              </span>
            )}
          </span>
        </button>
      </div>

      {view === 'safe-mode' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Safe Mode</h2>
            <p className="text-gray-600 mb-4">
              Emergency brake to hide all insights instantly. Your data remains safe.
            </p>
          </div>
          <SafeModeToggle />
        </div>
      )}

      {view === 'consent' && <ConsentCenter />}

      {view === 'reflections' && <ReflectionVault />}

      {view === 'insights' && (
        <div>
          {safeModeActive ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
              <Shield className="w-12 h-12 text-orange-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-orange-900 mb-2">
                Safe Mode is Active
              </h3>
              <p className="text-orange-800 mb-4">
                All behavioral insights are currently hidden.
              </p>
              <button
                onClick={() => setView('safe-mode')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Manage Safe Mode
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading insights...</div>
            </div>
          ) : insights.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <Info className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-blue-900 mb-2 text-center">
                No Insights to Display
              </h3>
              <p className="text-blue-800 text-center mb-4">
                You may need to enable display permissions for specific insights, or there may not be enough data yet.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => setView('consent')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Configure Display Settings
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Reading these insights:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>These show what was recorded, not what is ideal</li>
                      <li>They are observations, not evaluations</li>
                      <li>Use Safe Mode anytime to hide everything</li>
                      <li>Your feedback helps improve these displays</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {insights.map((insight) => (
                  <InsightCard key={insight.signal_id} insight={insight} />
                ))}
              </div>

              {insights.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    Showing {insights.length} insight{insights.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
