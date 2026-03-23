import { useState, useEffect } from 'react';
import { ArrowLeft, Briefcase, FolderOpen, Lightbulb, ExternalLink, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Project {
  id: string;
  name: string;
  description: string | null;
  category: 'main' | 'side_project' | 'offshoot_idea';
  status: 'active' | 'completed' | 'archived';
  color: string | null;
  created_at: string;
  tasks_count?: number;
  notes_count?: number;
}

export function ProjectHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'main' | 'side' | 'offshoot'>('main');

  const [mainProjects, setMainProjects] = useState<Project[]>([]);
  const [sideProjects, setSideProjects] = useState<Project[]>([]);
  const [offshoots, setOffshoots] = useState<Project[]>([]);
  const [activeMasterProject, setActiveMasterProject] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    setLoading(true);

    const { data: masterProjects } = await supabase
      .from('master_projects')
      .select('*')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (masterProjects && masterProjects.length > 0) {
      setActiveMasterProject(masterProjects[0].id);
      const projectId = masterProjects[0].id;

      const { data: mainData } = await supabase
        .from('guardrails_tracks')
        .select('*')
        .eq('master_project_id', projectId)
        .eq('category', 'main')
        .is('parent_track_id', null)
        .order('created_at', { ascending: false });

      if (mainData) {
        setMainProjects(mainData.map(transformTrack));
      }

      const { data: sideData } = await supabase
        .from('guardrails_tracks')
        .select('*')
        .eq('master_project_id', projectId)
        .eq('category', 'side_project')
        .order('created_at', { ascending: false });

      if (sideData) {
        setSideProjects(sideData.map(transformTrack));
      }

      const { data: offshootData } = await supabase
        .from('guardrails_tracks')
        .select('*')
        .eq('master_project_id', projectId)
        .eq('category', 'offshoot_idea')
        .order('created_at', { ascending: false });

      if (offshootData) {
        setOffshoots(offshootData.map(transformTrack));
      }
    }

    setLoading(false);
  };

  const transformTrack = (track: any): Project => {
    return {
      id: track.id,
      name: track.name,
      description: track.description,
      category: track.category,
      status: track.status,
      color: track.color,
      created_at: track.created_at,
      tasks_count: 0,
      notes_count: 0
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'archived':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const renderProjects = (projects: Project[], emptyMessage: string) => {
    if (projects.length === 0) {
      return (
        <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
          <p className="text-slate-600">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: project.color || '#64748b' }}
                  />
                  <h3 className="text-lg font-semibold text-slate-800">{project.name}</h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                {project.description && (
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">{project.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{project.tasks_count || 0} tasks</span>
                  <span>{project.notes_count || 0} notes</span>
                  <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/guardrails`)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
              >
                Open
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/work')}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Work & Career</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Project Hub</h1>
              <p className="text-slate-600 mt-1">Manage projects synced with Guardrails</p>
            </div>
            <button
              onClick={() => navigate('/guardrails')}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Go to Guardrails
            </button>
          </div>

          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('main')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'main'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Main Projects
                {mainProjects.length > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-700">
                    {mainProjects.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('side')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'side'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Side Projects
                {sideProjects.length > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                    {sideProjects.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('offshoot')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'offshoot'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Offshoot Ideas
                {offshoots.length > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                    {offshoots.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading projects...</div>
        ) : !activeMasterProject ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
            <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No projects yet</h3>
            <p className="text-slate-600 mb-4">Create your first project in Guardrails to get started</p>
            <button
              onClick={() => navigate('/guardrails')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Go to Guardrails
            </button>
          </div>
        ) : (
          <div className="mt-6">
            {activeTab === 'main' && renderProjects(mainProjects, 'No main projects. Create projects in Guardrails to see them here.')}
            {activeTab === 'side' && renderProjects(sideProjects, 'No side projects. Create side projects in Guardrails to track parallel interests.')}
            {activeTab === 'offshoot' && renderProjects(offshoots, 'No offshoot ideas yet. Ideas captured in Guardrails will appear here.')}
          </div>
        )}

        <div className="mt-8 bg-teal-50 border border-teal-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Briefcase className="w-5 h-5 text-teal-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-teal-900 mb-1">About Project Hub</h3>
              <p className="text-sm text-teal-800 leading-relaxed">
                This is a read-only view of your Guardrails projects. All project management happens in the Guardrails section.
                Use this hub to quickly see your active projects and navigate to Guardrails for full project management capabilities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PlannerShell>
  );
}
