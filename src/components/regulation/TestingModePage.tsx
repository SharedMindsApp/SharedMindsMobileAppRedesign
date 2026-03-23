/**
 * Stage 4.6: Testing Mode Page (Admin-Only Interactive Version)
 *
 * Admin-only page for testing and understanding signal computation.
 * Interactive, visual, and engaging interface for exploring signal logic.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Activity, Eye, EyeOff, Beaker, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveSignals, getSignalDefinitions } from '../../lib/regulation/signalService';
import {
  computeSignalTrace,
  computeNegativeCase,
  getAllSignalDefinitions,
  type SimulatedEvent,
  type SignalTraceExplanation,
  type NegativeCaseExplanation,
} from '../../lib/regulation/testingModeService';
import type { ActiveSignal } from '../../lib/regulation/signalTypes';
import { SignalTraceView } from './SignalTraceView';
import { NegativeCaseView } from './NegativeCaseView';
import { TestingUtilitiesPanel } from './TestingUtilitiesPanel';

export function TestingModePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [activeSignals, setActiveSignals] = useState<ActiveSignal[]>([]);
  const [signalTraces, setSignalTraces] = useState<Map<string, SignalTraceExplanation>>(new Map());
  const [negativeCases, setNegativeCases] = useState<NegativeCaseExplanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUtilities, setShowUtilities] = useState(false);
  const [simulatedEvents, setSimulatedEvents] = useState<SimulatedEvent[]>([]);
  const [selectedView, setSelectedView] = useState<'active' | 'inactive' | 'both'>('both');
  const [expandedSignals, setExpandedSignals] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    if (profile?.role !== 'admin') {
      navigate('/regulation');
      return;
    }

    loadTestingData();
  }, [user, profile, simulatedEvents, navigate]);

  async function loadTestingData() {
    if (!user) return;

    try {
      const signals = await getActiveSignals(user.id);
      const allDefinitions = await getAllSignalDefinitions();
      const definitionsMap = await getSignalDefinitions();

      setActiveSignals(signals);

      const traces = new Map<string, SignalTraceExplanation>();
      for (const signal of signals) {
        const def = definitionsMap.get(signal.signal_key);
        if (def) {
          const trace = computeSignalTrace(signal, def, simulatedEvents);
          traces.set(signal.id, trace);
        }
      }
      setSignalTraces(traces);

      const activeKeys = new Set(signals.map(s => s.signal_key));
      const inactive = allDefinitions.filter(d => !activeKeys.has(d.key));
      const negatives = inactive.map(def => computeNegativeCase(def.key, def, simulatedEvents));
      setNegativeCases(negatives);

      setLoading(false);
    } catch (error) {
      console.error('[TestingMode] Error loading data:', error);
      setLoading(false);
    }
  }

  function handleSimulate(events: SimulatedEvent[]) {
    setSimulatedEvents(events);
  }

  function toggleSignalExpanded(signalId: string) {
    const newSet = new Set(expandedSignals);
    if (newSet.has(signalId)) {
      newSet.delete(signalId);
    } else {
      newSet.add(signalId);
    }
    setExpandedSignals(newSet);
  }

  function expandAll() {
    setExpandedSignals(new Set(activeSignals.map(s => s.id)));
  }

  function collapseAll() {
    setExpandedSignals(new Set());
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-700 mb-6">
            Testing Mode is only available to administrators. This feature provides internal diagnostic information about signal computation.
          </p>
          <button
            onClick={() => navigate('/regulation')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Return to Regulation Hub
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Activity className="w-8 h-8 text-amber-600 animate-pulse" />
        <div className="text-gray-600">Loading testing data...</div>
      </div>
    );
  }

  const showActive = selectedView === 'active' || selectedView === 'both';
  const showInactive = selectedView === 'inactive' || selectedView === 'both';

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl p-8 border-2 border-amber-200 shadow-sm">
        <button
          onClick={() => navigate('/regulation')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4 bg-white px-3 py-2 rounded-lg border border-gray-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Regulation Hub
        </button>

        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Beaker className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-gray-900">Testing Mode</h1>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full border border-amber-300">
                Admin Only
              </span>
            </div>
            <p className="text-lg text-gray-700 mb-4">
              Interactive exploration of signal computation logic. See exactly how patterns are detected and why signals appear or don't appear.
            </p>
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border-2 border-amber-200">
                <Activity className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-gray-800">{activeSignals.length} Active Signals</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border-2 border-gray-300">
                <EyeOff className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">{negativeCases.length} Inactive Signals</span>
              </div>
              {simulatedEvents.length > 0 && (
                <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border-2 border-blue-200">
                  <Beaker className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-800">{simulatedEvents.length} Simulated Events</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center border border-amber-300">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Testing Mode is for Understanding</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              This view shows internal reasoning about signal computation. It does not judge, score, or compare users.
              All explanations are descriptive and technical, not evaluative. Nothing shown here changes how Regulation works.
            </p>
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedView('active')}
            className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
              selectedView === 'active'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Active Only
          </button>
          <button
            onClick={() => setSelectedView('inactive')}
            className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
              selectedView === 'inactive'
                ? 'bg-gray-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Inactive Only
          </button>
          <button
            onClick={() => setSelectedView('both')}
            className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
              selectedView === 'both'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            Show Both
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Testing Utilities */}
      <button
        onClick={() => setShowUtilities(!showUtilities)}
        className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all font-medium shadow-lg flex items-center justify-center gap-2"
      >
        <Beaker className="w-5 h-5" />
        {showUtilities ? 'Hide' : 'Show'} Testing Utilities
      </button>

      {showUtilities && (
        <TestingUtilitiesPanel
          onSimulate={handleSimulate}
          onClose={() => setShowUtilities(false)}
        />
      )}

      {/* Active Signals with Traces */}
      {showActive && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center border border-green-300">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Active Signals</h2>
              <p className="text-sm text-gray-600">Patterns currently detected in your activity</p>
            </div>
          </div>

          {activeSignals.length > 0 ? (
            <div className="space-y-4">
              {activeSignals.map((signal) => {
                const trace = signalTraces.get(signal.id);
                const isExpanded = expandedSignals.has(signal.id);

                return (
                  <div key={signal.id} className="bg-white border-2 border-green-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <button
                      onClick={() => toggleSignalExpanded(signal.id)}
                      className="w-full p-5 flex items-center justify-between hover:bg-green-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center border border-green-300">
                          <Activity className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-gray-900 text-lg">{signal.signal_key}</div>
                          {signal.intensity && (
                            <div className="text-sm text-gray-600 mt-0.5">
                              Intensity: <span className="font-medium">{signal.intensity}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{isExpanded ? 'Hide' : 'Show'} Trace</span>
                        {isExpanded ? (
                          <EyeOff className="w-5 h-5 text-gray-400" />
                        ) : (
                          <Eye className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>
                    {isExpanded && trace && <SignalTraceView trace={trace} />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No active signals right now</p>
              <p className="text-sm text-gray-500 mt-1">Use Testing Utilities to simulate events</p>
            </div>
          )}
        </div>
      )}

      {/* Negative Cases */}
      {showInactive && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
              <TrendingDown className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Inactive Signals</h2>
              <p className="text-sm text-gray-600">Why these patterns are not currently detected</p>
            </div>
          </div>

          {negativeCases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {negativeCases.map((nc, index) => (
                <NegativeCaseView key={index} explanation={nc} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
              <Activity className="w-16 h-16 text-green-600 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">All defined signals are active</p>
              <p className="text-sm text-gray-600 mt-1">Every signal pattern is currently detected</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
