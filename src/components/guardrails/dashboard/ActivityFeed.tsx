import { Clock, CheckCircle, Plus, TrendingUp, FolderPlus } from 'lucide-react';
import type { RoadmapItem, MasterProject, SideIdea, OffshootIdea } from '../../../lib/guardrailsTypes';

interface ActivityItem {
  id: string;
  type: 'item_created' | 'item_completed' | 'item_status_change' | 'project_created' | 'idea_created';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: any;
}

interface ActivityFeedProps {
  items: (RoadmapItem & { project?: MasterProject })[];
  projects: MasterProject[];
  sideIdeas?: SideIdea[];
  offshootIdeas?: OffshootIdea[];
}

export function ActivityFeed({ items, projects, sideIdeas = [], offshootIdeas = [] }: ActivityFeedProps) {
  const activities: ActivityItem[] = [];

  items.forEach(item => {
    activities.push({
      id: `item-${item.id}`,
      type: item.status === 'completed' ? 'item_completed' : 'item_created',
      title: item.title,
      description: item.project?.name,
      timestamp: item.status === 'completed' ? item.created_at : item.created_at,
      metadata: { status: item.status },
    });
  });

  projects.forEach(project => {
    activities.push({
      id: `project-${project.id}`,
      type: 'project_created',
      title: project.name,
      description: `New master project`,
      timestamp: project.created_at,
    });
  });

  sideIdeas.forEach(idea => {
    if (!idea.is_promoted) {
      activities.push({
        id: `sideidea-${idea.id}`,
        type: 'idea_created',
        title: idea.title,
        description: 'Side idea captured',
        timestamp: idea.created_at,
      });
    }
  });

  offshootIdeas.forEach(idea => {
    activities.push({
      id: `offshoot-${idea.id}`,
      type: 'idea_created',
      title: idea.title,
      description: 'Offshoot idea captured',
      timestamp: idea.created_at,
    });
  });

  const sortedActivities = activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'item_completed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'item_created':
        return <Plus size={16} className="text-blue-600" />;
      case 'project_created':
        return <FolderPlus size={16} className="text-purple-600" />;
      case 'idea_created':
        return <TrendingUp size={16} className="text-orange-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Recent Activity</h2>

      {sortedActivities.length > 0 ? (
        <div className="space-y-2 md:space-y-3 max-h-96 overflow-y-auto">
          {sortedActivities.map(activity => (
            <div key={activity.id} className="flex items-start gap-2 md:gap-3 p-2.5 md:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="mt-0.5 flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-900 line-clamp-1">{activity.title}</p>
                {activity.description && (
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{activity.description}</p>
                )}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 ml-2">
                {getRelativeTime(activity.timestamp)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 md:py-8">
          <Clock size={40} className="md:w-12 md:h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No recent activity</p>
          <p className="text-xs text-gray-400 mt-1">Start creating projects and tasks to see activity</p>
        </div>
      )}
    </div>
  );
}
