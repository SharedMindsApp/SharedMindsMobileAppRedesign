import { useState, useEffect } from 'react';
import { Zap, AlertTriangle, TrendingUp, Archive } from 'lucide-react';
import { getTracksByCategory } from '../../../lib/guardrails';
import type { Track } from '../../../lib/guardrails';

interface Props {
  masterProjectId: string;
}

interface OffshootStats {
  total_count: number;
  nodes_count: number;
  roadmap_count: number;
  side_ideas_count: number;
  recent_count_1h: number;
  drift_risk: 'low' | 'medium' | 'high';
}

interface OffshootDisplay {
  id: string;
  title: string;
  color: string | null;
  source_type: string;
}

function trackToDisplay(track: Track): OffshootDisplay {
  return {
    id: track.id,
    title: track.name,
    color: track.color,
    source_type: 'offshoot_idea',
  };
}

async function computeOffshootStats(masterProjectId: string): Promise<OffshootStats> {
  const offshoots = await getTracksByCategory(masterProjectId, 'offshoot_idea');

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentOffshoots = offshoots.filter(
    o => new Date(o.createdAt) > oneHourAgo
  );

  let driftRisk: 'low' | 'medium' | 'high' = 'low';
  if (recentOffshoots.length >= 5) {
    driftRisk = 'high';
  } else if (recentOffshoots.length >= 3) {
    driftRisk = 'medium';
  }

  return {
    total_count: offshoots.length,
    nodes_count: 0,
    roadmap_count: 0,
    side_ideas_count: offshoots.length,
    recent_count_1h: recentOffshoots.length,
    drift_risk: driftRisk,
  };
}

export function OffshootSummaryPanel({ masterProjectId }: Props) {
  const [stats, setStats] = useState<OffshootStats | null>(null);
  const [recentOffshoots, setRecentOffshoots] = useState<OffshootDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [masterProjectId]);

  async function loadStats() {
    try {
      setLoading(true);
      const [statsData, allOffshoots] = await Promise.all([
        computeOffshootStats(masterProjectId),
        getTracksByCategory(masterProjectId, 'offshoot_idea'),
      ]);

      setStats(statsData);
      setRecentOffshoots(allOffshoots.slice(0, 5).map(trackToDisplay));
    } catch (error) {
      console.error('Failed to load offshoot stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500 text-sm">No offshoot data available</p>
      </div>
    );
  }

  const getDriftRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getDriftRiskIcon = (risk: string) => {
    if (risk === 'high' || risk === 'medium') {
      return <AlertTriangle size={16} />;
    }
    return <TrendingUp size={16} />;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Zap size={20} className="text-orange-500" />
          Offshoot Summary
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getDriftRiskColor(stats.drift_risk)}`}>
          {getDriftRiskIcon(stats.drift_risk)}
          {stats.drift_risk.toUpperCase()} Risk
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total_count}</div>
          <div className="text-sm text-gray-600">Active Offshoots</div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="text-2xl font-bold text-orange-900">{stats.recent_count_1h}</div>
          <div className="text-sm text-orange-700">Created (1h)</div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-900">{stats.nodes_count}</div>
          <div className="text-sm text-blue-700">Mind Mesh</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-900">{stats.roadmap_count}</div>
          <div className="text-sm text-purple-700">Roadmap</div>
        </div>
      </div>

      {stats.drift_risk !== 'low' && (
        <div className={`rounded-lg p-4 mb-4 border ${
          stats.drift_risk === 'high'
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className={stats.drift_risk === 'high' ? 'text-red-600' : 'text-amber-600'} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${stats.drift_risk === 'high' ? 'text-red-900' : 'text-amber-900'}`}>
                {stats.drift_risk === 'high' ? 'High Drift Detected' : 'Moderate Drift Detected'}
              </p>
              <p className={`text-xs ${stats.drift_risk === 'high' ? 'text-red-700' : 'text-amber-700'} mt-1`}>
                {stats.drift_risk === 'high'
                  ? "You're creating many offshoots. Consider converting them to tracks or archiving."
                  : "You have several offshoots. Review them to maintain focus."}
              </p>
            </div>
          </div>
        </div>
      )}

      {recentOffshoots.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Offshoots</h4>
          <div className="space-y-2">
            {recentOffshoots.map(offshoot => (
              <div
                key={offshoot.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: offshoot.color || '#FF7F50' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{offshoot.title}</p>
                  <p className="text-xs text-gray-500 capitalize">{offshoot.source_type.replace('_', ' ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
