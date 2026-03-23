import { useState, useEffect } from 'react';
import { ArrowLeft, Briefcase, Plus, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'in_progress' | 'completed';
  skills: string;
  deadline?: string;
  created_at: string;
}

export function ResearchProjects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    status: 'planning' as const,
    skills: '',
    deadline: ''
  });

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    setLoading(true);
    // Research projects are managed separately
    setProjects([]);
    setLoading(false);
  };

  const addProject = async () => {
    if (!user || !newProject.title.trim()) return;
    // Research projects are managed separately
    setNewProject({ title: '', description: '', skills: '' });
    setShowForm(false);
  };

  const addProjectOld = async () => {
    if (!user || !newProject.title.trim()) return;

    const { error } = await supabase
      .from('daily_planner_entries_OLD')
      .insert({
        user_id: user.id,
        life_area: 'education',
        title: newProject.title,
        content: newProject.description,
        tags: 'project',
        metadata: {
          status: newProject.status,
          skills: newProject.skills,
          deadline: newProject.deadline || null
        }
      });

    if (!error) {
      setNewProject({ title: '', description: '', status: 'planning', skills: '', deadline: '' });
      setShowForm(false);
      loadProjects();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-700 border-green-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      planning: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return styles[status as keyof typeof styles] || styles.planning;
  };

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/education')}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Education</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Research Projects</h1>
              <p className="text-slate-600 mt-1">Track research and long-term learning projects</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Research Project</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Project Title</label>
                  <input
                    type="text"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="e.g., Build a Personal Portfolio Website"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={3}
                    placeholder="What will you build and what will you learn?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <select
                      value={newProject.status}
                      onChange={(e) => setNewProject({ ...newProject, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="planning">Planning</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Deadline (Optional)</label>
                    <input
                      type="date"
                      value={newProject.deadline}
                      onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Skills Practiced</label>
                  <input
                    type="text"
                    value={newProject.skills}
                    onChange={(e) => setNewProject({ ...newProject, skills: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="e.g., React, TypeScript, CSS"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addProject}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                  >
                    Save Project
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setNewProject({ title: '', description: '', status: 'planning', skills: '', deadline: '' });
                    }}
                    className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
            <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No research projects yet</h3>
            <p className="text-slate-600">Start tracking your research and learning projects</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(project.status)}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">{project.title}</h3>
                      {project.description && (
                        <p className="text-slate-600 text-sm leading-relaxed mb-2">{project.description}</p>
                      )}
                      {project.skills && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {project.skills.split(',').map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs font-medium rounded bg-pink-100 text-pink-700 border border-pink-200"
                            >
                              {skill.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${getStatusBadge(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                  <span>Started {new Date(project.created_at).toLocaleDateString()}</span>
                  {project.deadline && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Due {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
