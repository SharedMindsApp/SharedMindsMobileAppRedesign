import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PartyPopper, Layers, Calendar, Network, ListTodo, Target, ChevronRight, ArrowRight } from 'lucide-react';
import { useActiveProject } from '../../contexts/ActiveProjectContext';
import { setActiveProjectId } from '../../state/activeDataContext';
import { getMasterProjectById } from '../../lib/guardrails';
import { getTracksForProject } from '../../lib/guardrails/tracks';
import { getRoadmapItemsByProject } from '../../lib/guardrails/roadmapService';

export function ProjectWelcomePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { setActiveProject } = useActiveProject();
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [tracks, setTracks] = useState<any[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<any[]>([]);
  const [stats, setStats] = useState({
    tracks: 0,
    subtracks: 0,
    roadmapItems: 0,
  });

  useEffect(() => {
    async function loadProject() {
      if (!projectId) {
        navigate('/guardrails/dashboard');
        return;
      }

      try {
        const project = await getMasterProjectById(projectId);
        if (!project) {
          navigate('/guardrails/dashboard');
          return;
        }

        setActiveProject(project);
        setActiveProjectId(project.id, project.domain_id);
        setProjectName(project.name);

        const projectTracks = await getTracksForProject(projectId);
        setTracks(projectTracks);

        const items = await getRoadmapItemsByProject(projectId);
        setRoadmapItems(items);

        const subtracksCount = projectTracks.reduce((sum, track) => {
          return sum + (track.subtracks?.length || 0);
        }, 0);

        setStats({
          tracks: projectTracks.length,
          subtracks: subtracksCount,
          roadmapItems: items.length,
        });
      } catch (error) {
        console.error('[WELCOME] Failed to load project:', error);
        navigate('/guardrails/dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId, navigate, setActiveProject]);

  const handleNavigate = (path: string) => {
    navigate(`/guardrails/projects/${projectId}/${path}`);
  };

  const firstTask = roadmapItems.find(item => item.item_type === 'task' && item.status === 'not_started');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-green-500 mb-6">
            <PartyPopper className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to {projectName}!
          </h1>
          <p className="text-xl text-gray-600">
            Your project has been created successfully. Let's get started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border-2 border-blue-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.tracks}</div>
            <div className="text-sm text-gray-600">Tracks Created</div>
          </div>

          <div className="bg-white border-2 border-green-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.subtracks}</div>
            <div className="text-sm text-gray-600">Subtracks Ready</div>
          </div>

          <div className="bg-white border-2 border-purple-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.roadmapItems}</div>
            <div className="text-sm text-gray-600">Roadmap Items</div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Tracks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => handleNavigate('roadmap')}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: track.color + '20' }}
                >
                  <Layers className="w-5 h-5" style={{ color: track.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 mb-1">{track.name}</div>
                  {track.description && (
                    <div className="text-sm text-gray-600 line-clamp-2">{track.description}</div>
                  )}
                  {track.subtracks && track.subtracks.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      {track.subtracks.length} subtracks
                    </div>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {firstTask && (
          <div className="bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-300 rounded-xl p-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your First Task</h3>
                <div className="text-base font-medium text-blue-900 mb-2">{firstTask.title}</div>
                {firstTask.description && (
                  <div className="text-sm text-gray-700 mb-4">{firstTask.description}</div>
                )}
                <button
                  onClick={() => handleNavigate('roadmap')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  View Roadmap
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <p className="text-gray-600 mb-6">
            Jump right into building your project with these powerful tools.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleNavigate('roadmap')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center transition-colors">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="font-semibold text-gray-900">Roadmap</div>
              <div className="text-xs text-gray-600">Plan your timeline</div>
            </button>

            <button
              onClick={() => handleNavigate('mind-mesh')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-teal-400 hover:shadow-md transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-lg bg-teal-100 group-hover:bg-teal-200 flex items-center justify-center transition-colors">
                <Network className="w-6 h-6 text-teal-600" />
              </div>
              <div className="font-semibold text-gray-900">Mind Mesh</div>
              <div className="text-xs text-gray-600">Connect ideas</div>
            </button>

            <button
              onClick={() => handleNavigate('taskflow')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:shadow-md transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-lg bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center transition-colors">
                <ListTodo className="w-6 h-6 text-orange-600" />
              </div>
              <div className="font-semibold text-gray-900">Task Flow</div>
              <div className="text-xs text-gray-600">Manage tasks</div>
            </button>

            <button
              onClick={() => handleNavigate('sessions')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:shadow-md transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-lg bg-green-100 group-hover:bg-green-200 flex items-center justify-center transition-colors">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div className="font-semibold text-gray-900">Focus Mode</div>
              <div className="text-xs text-gray-600">Start working</div>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/guardrails/dashboard')}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
