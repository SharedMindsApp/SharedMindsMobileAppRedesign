import { useState, useEffect } from 'react';
import { AlertTriangle, X, Target, Archive, Sparkles } from 'lucide-react';
import { getTracksByCategory } from '../../lib/guardrails';
import { useNavigate } from 'react-router-dom';

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

export function DriftWarningBanner({ masterProjectId }: Props) {
  const [stats, setStats] = useState<OffshootStats | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, [masterProjectId]);

  async function loadStats() {
    try {
      const data = await computeOffshootStats(masterProjectId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load drift stats:', error);
    }
  }

  if (!stats || stats.drift_risk === 'low' || dismissed) {
    return null;
  }

  const getMessage = () => {
    if (stats.drift_risk === 'high') {
      if (stats.recent_count_1h >= 5) {
        return `You've created ${stats.recent_count_1h} offshoots in the past hour. Consider refocusing on your main tracks.`;
      }
      return `You have ${stats.total_count} active offshoots (${Math.round((stats.total_count / (stats.total_count + 10)) * 100)}% of project). Time to review and consolidate?`;
    }

    return `You have ${stats.recent_count_1h} recent offshoots. Keep an eye on your focus.`;
  };

  const bgColor = stats.drift_risk === 'high' ? 'bg-red-50' : 'bg-amber-50';
  const borderColor = stats.drift_risk === 'high' ? 'border-red-300' : 'border-amber-300';
  const textColor = stats.drift_risk === 'high' ? 'text-red-900' : 'text-amber-900';
  const iconColor = stats.drift_risk === 'high' ? 'text-red-600' : 'text-amber-600';

  return (
    <div className={`${bgColor} border-2 ${borderColor} rounded-lg p-4 mb-6`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />
        <div className="flex-1">
          <h4 className={`font-semibold ${textColor} mb-1`}>
            {stats.drift_risk === 'high' ? 'High Drift Detected' : 'Moderate Drift Detected'}
          </h4>
          <p className={`text-sm ${textColor.replace('900', '800')} mb-3`}>
            {getMessage()}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/guardrails/mindmesh')}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Sparkles size={14} />
              View Mind Mesh
            </button>
            <button
              onClick={() => navigate('/guardrails/offshoots')}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Target size={14} />
              Review Offshoots
            </button>
            <button
              onClick={() => {
                if (confirm('This will help you clean up and refocus. Continue?')) {
                  navigate('/guardrails/mindmesh');
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Archive size={14} />
              Cleanup Session
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`${iconColor} hover:opacity-75 flex-shrink-0`}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
