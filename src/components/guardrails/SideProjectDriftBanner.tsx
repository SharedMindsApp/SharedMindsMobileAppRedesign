import { useState, useEffect } from 'react';
import { AlertTriangle, X, Target, Archive, Sparkles, ArrowUp } from 'lucide-react';
import { getTracksByCategoryWithStats } from '../../lib/guardrails';
import { useNavigate } from 'react-router-dom';

interface Props {
  masterProjectId: string;
}

interface SideProjectDriftStats {
  total_side_projects: number;
  active_items_count: number;
  recent_side_projects_1h: number;
  time_spent_today_minutes: number;
  drift_level: 'low' | 'medium' | 'high';
  most_active_side_project: { title: string } | null;
}

async function computeSideProjectDriftStats(masterProjectId: string): Promise<SideProjectDriftStats> {
  const tracks = await getTracksByCategoryWithStats(masterProjectId, 'side_project');

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentProjects = tracks.filter(t => new Date(t.createdAt) > oneHourAgo);
  const totalItems = tracks.reduce((sum, t) => sum + t.totalItemsCount, 0);

  let driftLevel: 'low' | 'medium' | 'high' = 'low';
  if (recentProjects.length >= 3) {
    driftLevel = 'high';
  } else if (recentProjects.length >= 2) {
    driftLevel = 'medium';
  }

  return {
    total_side_projects: tracks.length,
    active_items_count: totalItems,
    recent_side_projects_1h: recentProjects.length,
    time_spent_today_minutes: 0,
    drift_level: driftLevel,
    most_active_side_project: tracks.length > 0 ? { title: tracks[0].name } : null,
  };
}

export function SideProjectDriftBanner({ masterProjectId }: Props) {
  const [stats, setStats] = useState<SideProjectDriftStats | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, [masterProjectId]);

  async function loadStats() {
    try {
      const data = await computeSideProjectDriftStats(masterProjectId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load side project drift stats:', error);
    }
  }

  if (!stats || stats.drift_level === 'low' || dismissed) {
    return null;
  }

  const getMessage = () => {
    if (stats.drift_level === 'high') {
      if (stats.recent_side_projects_1h >= 3) {
        return `You've created ${stats.recent_side_projects_1h} side projects in the past hour. Are you losing focus on your main project?`;
      }
      const percentage = stats.total_side_projects > 0
        ? Math.round((stats.active_items_count / (stats.active_items_count + 20)) * 100)
        : 0;
      return `You have ${stats.total_side_projects} active side projects with ${stats.active_items_count} total items. Consider consolidating or converting strong ones to Master Projects.`;
    }

    return `You have ${stats.recent_side_projects_1h} recent side projects. Keep track of your main project focus.`;
  };

  const bgColor = stats.drift_level === 'high' ? 'bg-red-50' : 'bg-amber-50';
  const borderColor = stats.drift_level === 'high' ? 'border-red-300' : 'border-amber-300';
  const textColor = stats.drift_level === 'high' ? 'text-red-900' : 'text-amber-900';
  const iconColor = stats.drift_level === 'high' ? 'text-red-600' : 'text-amber-600';

  return (
    <div className={`${bgColor} border-2 ${borderColor} rounded-lg p-4 mb-6`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />
        <div className="flex-1">
          <h4 className={`font-semibold ${textColor} mb-1`}>
            {stats.drift_level === 'high' ? 'High Side Project Activity' : 'Moderate Side Project Activity'}
          </h4>
          <p className={`text-sm ${textColor.replace('900', '800')} mb-3`}>
            {getMessage()}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/guardrails/roadmap')}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Sparkles size={14} />
              View Side Projects
            </button>
            <button
              onClick={() => {
                if (confirm('Review your side projects and decide which to keep, convert, or archive. Continue?')) {
                  navigate('/guardrails/roadmap');
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Target size={14} />
              Review All
            </button>
            {stats.most_active_side_project && (
              <button
                onClick={() => {
                  if (confirm(`Convert "${stats.most_active_side_project?.title}" to a Master Project?`)) {
                    navigate('/guardrails/roadmap');
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                <ArrowUp size={14} />
                Convert Top Project
              </button>
            )}
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
