import { CheckCircle, Clock, AlertCircle, Circle } from 'lucide-react';
import type { RoadmapItem, RoadmapItemStatus, MasterProject } from '../../../lib/guardrailsTypes';

interface AnalyticsPanelProps {
  items: (RoadmapItem & { project?: MasterProject })[];
  projects: MasterProject[];
}

interface StatusCount {
  not_started: number;
  in_progress: number;
  completed: number;
  blocked: number;
}

export function AnalyticsPanel({ items, projects }: AnalyticsPanelProps) {
  const statusCounts: StatusCount = items.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    { not_started: 0, in_progress: 0, completed: 0, blocked: 0 } as StatusCount
  );

  const totalItems = items.length;
  const completionPercentage = totalItems > 0
    ? Math.round((statusCounts.completed / totalItems) * 100)
    : 0;

  const projectCompletions = projects
    .filter(p => p.status === 'active')
    .map(project => {
      const projectItems = items.filter(item => item.project?.id === project.id);
      const completed = projectItems.filter(i => i.status === 'completed').length;
      const total = projectItems.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { project, percentage, completed, total };
    });

  const upcomingTasks = items
    .filter(item => item.status === 'not_started' || item.status === 'in_progress')
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 5);

  const blockedTasks = items
    .filter(item => item.status === 'blocked')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const getStatusColor = (status: RoadmapItemStatus) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'blocked': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Project Analytics</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="p-3 md:p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
            <Circle size={14} className="md:w-4 md:h-4 text-gray-600" />
            <span className="text-xs md:text-sm text-gray-600">Not Started</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{statusCounts.not_started}</p>
        </div>

        <div className="p-3 md:p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
            <Clock size={14} className="md:w-4 md:h-4 text-blue-600" />
            <span className="text-xs md:text-sm text-blue-600">In Progress</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-blue-900">{statusCounts.in_progress}</p>
        </div>

        <div className="p-3 md:p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
            <CheckCircle size={14} className="md:w-4 md:h-4 text-green-600" />
            <span className="text-xs md:text-sm text-green-600">Completed</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-green-900">{statusCounts.completed}</p>
        </div>

        <div className="p-3 md:p-4 bg-red-50 rounded-lg">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
            <AlertCircle size={14} className="md:w-4 md:h-4 text-red-600" />
            <span className="text-xs md:text-sm text-red-600">Blocked</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-red-900">{statusCounts.blocked}</p>
        </div>
      </div>

      {projectCompletions.length > 0 && (
        <div className="mb-6 md:mb-8">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Project Completion</h3>
          <div className="space-y-3">
            {projectCompletions.map(({ project, percentage, completed, total }) => (
              <div key={project.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{project.name}</span>
                  <span className="text-gray-600">{completed}/{total} ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Upcoming Tasks</h3>
          {upcomingTasks.length > 0 ? (
            <div className="space-y-2">
              {upcomingTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(task.start_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No upcoming tasks</p>
          )}
        </div>

        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Blockers</h3>
          {blockedTasks.length > 0 ? (
            <div className="space-y-2">
              {blockedTasks.map(task => {
                const daysSinceCreation = Math.floor(
                  (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );
                const isUrgent = daysSinceCreation > 2;

                return (
                  <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg ${isUrgent ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <AlertCircle size={16} className={isUrgent ? 'text-red-600 mt-0.5' : 'text-gray-600 mt-0.5'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{task.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Blocked for {daysSinceCreation} day{daysSinceCreation !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No blocked items</p>
          )}
        </div>
      </div>
    </div>
  );
}
