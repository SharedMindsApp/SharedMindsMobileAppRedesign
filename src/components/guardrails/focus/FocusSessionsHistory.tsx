import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, TrendingUp, AlertTriangle, Bell, Calendar, History, Filter, X } from 'lucide-react';
import { getFocusSessionHistory } from '../../../lib/guardrails/focus';
import { supabase } from '../../../lib/supabase';
import type { FocusSession } from '../../../lib/guardrails/focusTypes';

interface Project {
  id: string;
  name: string;
}

export function FocusSessionsHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<FocusSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadSessions();
    loadProjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sessions, selectedProject, startDate, endDate]);

  async function loadSessions() {
    try {
      const data = await getFocusSessionHistory(100);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load focus sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects() {
    try {
      const { data, error } = await supabase
        .from('master_projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  function applyFilters() {
    let filtered = [...sessions];

    if (selectedProject !== 'all') {
      filtered = filtered.filter(s => s.project_id === selectedProject);
    }

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(s => new Date(s.start_time) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.start_time) <= end);
    }

    setFilteredSessions(filtered);
  }

  function clearFilters() {
    setSelectedProject('all');
    setStartDate('');
    setEndDate('');
  }

  function formatDuration(minutes: number | null): string {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getScoreColor(score: number | null): string {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getScoreBg(score: number | null): string {
    if (!score) return 'bg-gray-50';
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  }

  function getStatusBadge(status: string): JSX.Element {
    const statusConfig: Record<string, { label: string; className: string }> = {
      completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
      active: { label: 'Active', className: 'bg-blue-100 text-blue-700' },
      paused: { label: 'Paused', className: 'bg-yellow-100 text-yellow-700' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <History size={32} className="text-blue-600" />
              Focus Sessions
            </h1>
            <p className="text-gray-600 mt-1">View your complete focus session history</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
            >
              <Filter size={18} />
              Filters
            </button>
            <button
              onClick={() => navigate('/guardrails/focus')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Start New Session
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Filter Sessions</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Projects</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            {(selectedProject !== 'all' || startDate || endDate) && (
              <div className="mt-4">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <History size={64} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-600 mb-6">Start your first focus session to begin tracking your productivity</p>
            <button
              onClick={() => navigate('/guardrails/focus')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Start First Session
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Filter size={64} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No sessions match your filters</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filter criteria</p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Focus Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Drifts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Distractions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar size={16} className="text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">{formatDate(session.start_time)}</div>
                            <div className="text-gray-500">{formatTime(session.start_time)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={16} className="text-blue-500" />
                          <span className="font-medium text-gray-900">
                            {formatDuration(session.actual_duration_minutes)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center justify-center w-16 h-16 rounded-lg ${getScoreBg(session.focus_score)}`}>
                          <div className={`text-2xl font-bold ${getScoreColor(session.focus_score)}`}>
                            {session.focus_score || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <AlertTriangle size={16} className="text-red-500" />
                          <span className="font-medium text-gray-900">{session.drift_count}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <Bell size={16} className="text-orange-500" />
                          <span className="font-medium text-gray-900">{session.distraction_count}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(session.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/guardrails/focus/summary/${session.id}`)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                        >
                          <TrendingUp size={16} />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-blue-900 mb-2">Session Statistics</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-900">
                  {sessions.length}
                </div>
                <div className="text-sm text-blue-700">Total Sessions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">
                  {Math.round(sessions.reduce((sum, s) => sum + (s.focus_score || 0), 0) / sessions.length)}
                </div>
                <div className="text-sm text-blue-700">Avg Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">
                  {Math.round(sessions.reduce((sum, s) => sum + (s.actual_duration_minutes || 0), 0) / 60)}h
                </div>
                <div className="text-sm text-blue-700">Total Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">
                  {sessions.reduce((sum, s) => sum + s.drift_count, 0)}
                </div>
                <div className="text-sm text-blue-700">Total Drifts</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
