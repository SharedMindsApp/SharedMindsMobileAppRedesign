import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Clock, ArrowRight, Sparkles, Network, Archive, Activity } from 'lucide-react';
import {
  convertOffshootToRoadmap,
  archiveOffshoot,
} from '../../../lib/guardrails/offshoots';
import { convertNodeToSideProject, convertRoadmapItemToSideProject } from '../../../lib/guardrails/sideProjects';
import { supabase } from '../../../lib/supabase';
import type { UnifiedOffshoot } from '../../../lib/guardrails/offshoots';

export function OffshootIdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offshoot, setOffshoot] = useState<UnifiedOffshoot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadOffshootDetails();
    }
  }, [id]);

  async function loadOffshootDetails() {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('guardrails_offshoots_unified')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setOffshoot(data);
    } catch (error) {
      console.error('Failed to load offshoot details:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConvertToTask() {
    if (!offshoot) return;
    if (!confirm('Convert this offshoot idea to a roadmap task?')) return;

    try {
      if (offshoot.source_type === 'node') {
        await convertOffshootToRoadmap(offshoot.id);
        navigate('/guardrails/offshoots');
      } else {
        alert('This item is already in the roadmap. You can update its status there.');
      }
    } catch (error) {
      console.error('Failed to convert to task:', error);
      alert('Failed to convert to task. Make sure you have a roadmap section created.');
    }
  }

  async function handleConvertToSideProject() {
    if (!offshoot) return;
    if (!confirm('Move this offshoot idea to a side project?')) return;

    try {
      if (offshoot.source_type === 'node') {
        await convertNodeToSideProject(offshoot.id, offshoot.master_project_id);
      } else if (offshoot.source_type === 'roadmap_item') {
        await convertRoadmapItemToSideProject(offshoot.id, offshoot.master_project_id);
      }
      navigate('/guardrails/offshoots');
    } catch (error) {
      console.error('Failed to convert to side project:', error);
      alert('Failed to move to side project');
    }
  }

  async function handleArchive() {
    if (!offshoot) return;
    if (!confirm('Archive this offshoot idea? This will remove it permanently.')) return;

    try {
      await archiveOffshoot(offshoot.id, offshoot.source_type);
      navigate('/guardrails/offshoots');
    } catch (error) {
      console.error('Failed to archive:', error);
      alert('Failed to archive offshoot');
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!offshoot) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-900 font-medium">Offshoot idea not found</p>
          <button
            onClick={() => navigate('/guardrails/offshoots')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Offshoot Ideas
          </button>
        </div>
      </div>
    );
  }

  const getSourceLabel = () => {
    switch (offshoot.source_type) {
      case 'node':
        return 'Mind Mesh Node';
      case 'roadmap_item':
        return 'Roadmap Item';
      case 'side_idea':
        return 'Side Idea';
      default:
        return 'Unknown';
    }
  };

  const getTimeSince = () => {
    const now = new Date();
    const created = new Date(offshoot.created_at);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    return 'just now';
  };

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/guardrails/offshoots')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Offshoot Ideas
      </button>

      <div className="bg-white border-2 border-amber-200 rounded-lg p-6 mb-6"
        style={{
          borderLeftWidth: '6px',
          borderLeftColor: offshoot.color || '#FF7F50',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Zap size={28} className="text-amber-600" />
              <h1 className="text-3xl font-bold text-gray-900">{offshoot.title}</h1>
            </div>
            {offshoot.description && (
              <p className="text-gray-600 mt-2">{offshoot.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-sm font-medium border bg-amber-100 text-amber-800 border-amber-300">
            Unreviewed
          </span>
          <span className="px-3 py-1 rounded-full text-sm font-medium border bg-orange-100 text-orange-800 border-orange-300">
            {getSourceLabel()}
          </span>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock size={14} />
            Drifted {getTimeSince()} ago
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <button
          onClick={handleConvertToTask}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
        >
          <ArrowRight size={20} />
          Convert to Task
        </button>
        <button
          onClick={handleConvertToSideProject}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
        >
          <Sparkles size={20} />
          Move to Side Project
        </button>
        <button
          onClick={() => navigate('/guardrails/mindmesh')}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Network size={20} />
          Open in Mind Mesh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-amber-600" />
          Details
        </h2>
        <div className="space-y-3">
          <div className="flex items-start">
            <span className="text-sm font-medium text-gray-700 w-32">Source Type:</span>
            <span className="text-sm text-gray-900">{getSourceLabel()}</span>
          </div>
          <div className="flex items-start">
            <span className="text-sm font-medium text-gray-700 w-32">Created:</span>
            <span className="text-sm text-gray-900">{new Date(offshoot.created_at).toLocaleString()}</span>
          </div>
          <div className="flex items-start">
            <span className="text-sm font-medium text-gray-700 w-32">Updated:</span>
            <span className="text-sm text-gray-900">{new Date(offshoot.updated_at).toLocaleString()}</span>
          </div>
          {offshoot.track_id && (
            <div className="flex items-start">
              <span className="text-sm font-medium text-gray-700 w-32">Track:</span>
              <span className="text-sm text-gray-900">Associated with a track</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
          <Zap size={18} />
          What to do with this offshoot?
        </h3>
        <ul className="text-sm text-amber-800 space-y-2">
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">•</span>
            <span><strong>Convert to Task:</strong> Move it to your roadmap as a scheduled item</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">•</span>
            <span><strong>Move to Side Project:</strong> If it's substantial enough to explore separately</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold mt-0.5">•</span>
            <span><strong>Archive:</strong> If it's no longer relevant or was just a passing thought</span>
          </li>
        </ul>
        <button
          onClick={handleArchive}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 text-sm font-medium"
        >
          <Archive size={14} />
          Archive This Offshoot
        </button>
      </div>
    </div>
  );
}
