import { useState, useEffect } from 'react';
import { Zap, Filter, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { OffshootIdeaCard } from './OffshootIdeaCard';
import { OffshootIdeasMobileList } from './OffshootIdeasMobileList';
import { useActiveDataContext } from '../../../state/useActiveDataContext';
import { getMasterProjects } from '../../../lib/guardrails';
import type { MasterProject } from '../../../lib/guardrailsTypes';
import {
  getAllOffshootsForProject,
  getOffshootStats,
  convertOffshootToRoadmap,
  archiveOffshoot,
} from '../../../lib/guardrails/offshoots';
import { convertNodeToSideProject, convertRoadmapItemToSideProject } from '../../../lib/guardrails/sideProjects';
import type { UnifiedOffshoot, OffshootStats } from '../../../lib/guardrails/offshoots';

export function OffshootIdeasList() {
  const { activeProjectId } = useActiveDataContext();
  const [activeProject, setActiveProject] = useState<MasterProject | null>(null);
  const [offshoots, setOffshoots] = useState<UnifiedOffshoot[]>([]);
  const [stats, setStats] = useState<OffshootStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterBy, setFilterBy] = useState<'all' | 'node' | 'roadmap_item' | 'side_idea'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    console.log('[OffshootIdeasList] activeProjectId from ADC:', activeProjectId);
    async function loadProject() {
      if (activeProjectId) {
        try {
          const projects = await getMasterProjects();
          const project = projects.find(p => p.id === activeProjectId);
          console.log('[OffshootIdeasList] Found project:', project);
          // Only update if project found - don't clear if not found (might be loading)
          if (project) {
            setActiveProject(project);
          }
          // If not found, keep the existing activeProject from localStorage
        } catch (error) {
          console.error('[OffshootIdeasList] Failed to load projects:', error);
          // Don't clear activeProject on error - keep what's stored
        }
      }
      // Don't clear activeProject if activeProjectId becomes null - let user explicitly clear it
    }
    loadProject();
  }, [activeProjectId]);

  useEffect(() => {
    console.log('[OffshootIdeasList] activeProject changed:', activeProject);
    if (activeProject) {
      loadOffshoots();
    } else {
      setLoading(false);
    }
  }, [activeProject]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function loadOffshoots() {
    if (!activeProject) return;

    try {
      setLoading(true);
      const [offshootsData, statsData] = await Promise.all([
        getAllOffshootsForProject(activeProject.id),
        getOffshootStats(activeProject.id),
      ]);
      setOffshoots(offshootsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load offshoots:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConvertToTask(id: string, type: string) {
    if (!confirm('Convert this offshoot idea to a roadmap task?')) return;

    try {
      if (type === 'node') {
        await convertOffshootToRoadmap(id);
        await loadOffshoots();
      } else {
        alert('This type is already in the roadmap. You can update its status there.');
      }
    } catch (error) {
      console.error('Failed to convert to task:', error);
      alert('Failed to convert to task. Make sure you have a roadmap section created.');
    }
  }

  async function handleConvertToSideProject(id: string, type: string) {
    if (!confirm('Move this offshoot idea to a side project?') || !activeProject) return;

    try {
      if (type === 'node') {
        await convertNodeToSideProject(id, activeProject.id);
      } else if (type === 'roadmap_item') {
        await convertRoadmapItemToSideProject(id, activeProject.id);
      }
      await loadOffshoots();
    } catch (error) {
      console.error('Failed to convert to side project:', error);
      alert('Failed to move to side project');
    }
  }

  async function handleArchive(id: string, type: string) {
    if (!confirm('Archive this offshoot idea? This will remove it permanently.')) return;

    try {
      await archiveOffshoot(id, type as any);
      await loadOffshoots();
    } catch (error) {
      console.error('Failed to archive offshoot:', error);
      alert('Failed to archive offshoot');
    }
  }

  const filteredOffshoots = offshoots.filter(o =>
    filterBy === 'all' || o.source_type === filterBy
  );

  const sortedOffshoots = [...filteredOffshoots].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'recent':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  if (!activeProject) {
    return (
      <div className="p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-amber-900 font-medium">No active project selected</p>
          <p className="text-sm text-amber-700 mt-1">
            Please select or create a master project first
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border-2 border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getDriftColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  // Mobile view
  if (isMobile) {
    if (!activeProject) {
      return (
        <div className="p-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <p className="text-amber-900 font-medium">No active project selected</p>
            <p className="text-sm text-amber-700 mt-1">
              Please select or create a master project first
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap size={24} className="text-amber-600" />
            Offshoot Ideas
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Spontaneous sparks and drift moments
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading ideas...</p>
            </div>
          </div>
        ) : (
          <OffshootIdeasMobileList
            offshoots={offshoots}
            stats={stats}
            masterProjectId={activeProject.id}
            onRefresh={loadOffshoots}
          />
        )}
      </div>
    );
  }

  // Desktop view (unchanged)
  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Zap size={32} className="text-amber-600" />
              Offshoot Ideas
            </h1>
            <p className="text-gray-600 mt-1">
              Spontaneous sparks and drift moments captured for review
            </p>
          </div>
        </div>

        {stats && stats.drift_risk !== 'low' && (
          <div className={`border rounded-lg p-4 mb-4 ${
            stats.drift_risk === 'high' ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={stats.drift_risk === 'high' ? 'text-red-600' : 'text-amber-600'} size={20} />
              <div className="flex-1">
                <p className={`font-semibold ${stats.drift_risk === 'high' ? 'text-red-900' : 'text-amber-900'}`}>
                  {stats.drift_risk === 'high' ? 'High Drift Risk' : 'Moderate Drift Warning'}
                </p>
                <p className={`text-sm mt-1 ${stats.drift_risk === 'high' ? 'text-red-700' : 'text-amber-700'}`}>
                  You have {stats.total_count} offshoot ideas ({stats.recent_count_1h} in the last hour).
                  Consider reviewing and organizing them to maintain focus.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-600" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Sources</option>
              <option value="node">Mind Mesh Only</option>
              <option value="roadmap_item">Roadmap Only</option>
              <option value="side_idea">Side Ideas Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-gray-600" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="recent">Most Recent</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <div className="flex-1"></div>

          {stats && (
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-medium">
                {offshoots.length} {offshoots.length === 1 ? 'idea' : 'ideas'}
              </span>
              <span className={`px-3 py-1 rounded-full font-medium border ${getDriftColor(stats.drift_risk)}`}>
                {stats.drift_risk.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {sortedOffshoots.length === 0 ? (
        <div className="bg-white border-2 border-amber-200 rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap size={32} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Offshoot Ideas Yet</h2>
            <p className="text-gray-600 mb-4">
              Offshoot ideas appear when you drift or when you capture spontaneous inspiration
              while working on your main project.
            </p>
            <p className="text-sm text-gray-500">
              They're automatically tracked when you mark items as "offshoot" in Roadmap,
              TaskFlow, or Mind Mesh.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedOffshoots.map((offshoot) => (
            <OffshootIdeaCard
              key={offshoot.id}
              offshoot={offshoot}
              onConvertToTask={handleConvertToTask}
              onConvertToSideProject={handleConvertToSideProject}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
