import { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, TrendingUp, ArrowUp, Archive } from 'lucide-react';
import { getTracksByCategoryWithStats } from '../../../lib/guardrails';
import { useNavigate } from 'react-router-dom';

interface Props {
  masterProjectId: string;
}

interface SideProjectWithStats {
  id: string;
  title: string;
  description: string | null;
  color: string;
  created_at: string;
  roadmap_items_count: number;
  nodes_count: number;
  total_items_count: number;
}

interface SideProjectDriftStats {
  total_side_projects: number;
  active_items_count: number;
  recent_side_projects_1h: number;
  time_spent_today_minutes: number;
  drift_level: 'low' | 'medium' | 'high';
  most_active_side_project: SideProjectWithStats | null;
}

async function getSideProjectsWithStats(masterProjectId: string): Promise<SideProjectWithStats[]> {
  const tracks = await getTracksByCategoryWithStats(masterProjectId, 'side_project');
  return tracks.map(track => ({
    id: track.id,
    title: track.name,
    description: track.description,
    color: track.color || '#A855F7',
    created_at: track.createdAt,
    roadmap_items_count: track.roadmapItemsCount,
    nodes_count: track.nodesCount,
    total_items_count: track.totalItemsCount,
  }));
}

async function computeSideProjectDriftStats(masterProjectId: string): Promise<SideProjectDriftStats> {
  const sideProjects = await getSideProjectsWithStats(masterProjectId);

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentSideProjects = sideProjects.filter(
    sp => new Date(sp.created_at) > oneHourAgo
  );

  const totalItems = sideProjects.reduce((sum, sp) => sum + sp.total_items_count, 0);

  let driftLevel: 'low' | 'medium' | 'high' = 'low';
  if (recentSideProjects.length >= 3) {
    driftLevel = 'high';
  } else if (recentSideProjects.length >= 2) {
    driftLevel = 'medium';
  }

  const mostActive = sideProjects.length > 0 ? sideProjects[0] : null;

  return {
    total_side_projects: sideProjects.length,
    active_items_count: totalItems,
    recent_side_projects_1h: recentSideProjects.length,
    time_spent_today_minutes: 0,
    drift_level: driftLevel,
    most_active_side_project: mostActive,
  };
}

export function SideProjectsSummaryPanel({ masterProjectId }: Props) {
  const [stats, setStats] = useState<SideProjectDriftStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<SideProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, [masterProjectId]);

  async function loadStats() {
    try {
      setLoading(true);
      const [statsData, allProjects] = await Promise.all([
        computeSideProjectDriftStats(masterProjectId),
        getSideProjectsWithStats(masterProjectId),
      ]);

      setStats(statsData);
      setRecentProjects(allProjects.slice(0, 3));
    } catch (error) {
      console.error('Failed to load side projects stats:', error);
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
        <p className="text-gray-500 text-sm">No side projects data available</p>
      </div>
    );
  }

  const getDriftLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getDriftLevelIcon = (level: string) => {
    if (level === 'high' || level === 'medium') {
      return <AlertTriangle size={16} />;
    }
    return <TrendingUp size={16} />;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles size={20} className="text-purple-600" />
          Side Project Summary
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getDriftLevelColor(stats.drift_level)}`}>
          {getDriftLevelIcon(stats.drift_level)}
          {stats.drift_level.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-900">{stats.total_side_projects}</div>
          <div className="text-sm text-purple-700">Active Projects</div>
        </div>

        <div className="bg-purple-100 rounded-lg p-4 border border-purple-300">
          <div className="text-2xl font-bold text-purple-900">{stats.active_items_count}</div>
          <div className="text-sm text-purple-700">Total Items</div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <div className="text-2xl font-bold text-amber-900">{stats.recent_side_projects_1h}</div>
          <div className="text-sm text-amber-700">Created (1h)</div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-900">
            {stats.most_active_side_project?.total_items_count || 0}
          </div>
          <div className="text-sm text-blue-700">Most Active</div>
        </div>
      </div>

      {stats.drift_level !== 'low' && (
        <div className={`rounded-lg p-4 mb-4 border ${
          stats.drift_level === 'high'
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className={stats.drift_level === 'high' ? 'text-red-600' : 'text-amber-600'} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${stats.drift_level === 'high' ? 'text-red-900' : 'text-amber-900'}`}>
                {stats.drift_level === 'high' ? 'High Focus Drift' : 'Moderate Focus Drift'}
              </p>
              <p className={`text-xs ${stats.drift_level === 'high' ? 'text-red-700' : 'text-amber-700'} mt-1`}>
                {stats.drift_level === 'high'
                  ? "You have many side projects. Consider converting strong ones to Master Projects or archiving exploratory ones."
                  : "You have several side projects. Review them to maintain focus on your main project."}
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.most_active_side_project && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Most Active Side Project</h4>
          <div
            className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3"
            style={{
              borderLeftWidth: '4px',
              borderLeftColor: stats.most_active_side_project.color || '#A855F7',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h5 className="font-medium text-gray-900 mb-1">
                  {stats.most_active_side_project.title}
                </h5>
                <p className="text-xs text-purple-700">
                  {stats.most_active_side_project.total_items_count} items
                  {' • '}
                  {stats.most_active_side_project.roadmap_items_count} roadmap
                  {' • '}
                  {stats.most_active_side_project.nodes_count} nodes
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {recentProjects.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Side Projects</h4>
          <div className="space-y-2">
            {recentProjects.map(project => (
              <div
                key={project.id}
                className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <div
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: project.color || '#A855F7' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                  <p className="text-xs text-gray-500">{project.total_items_count} items</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total_side_projects > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/guardrails/roadmap')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              <Sparkles size={14} />
              View in Roadmap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
