import { useState, useEffect } from 'react';
import { Folder, ChevronRight, ChevronDown, List, Target, CheckSquare, Search, Calendar } from 'lucide-react';
import type { WorkItem, ProjectWithTracks, TrackWithSubtracks } from '../../lib/regulation/dailyAlignmentTypes';
import { getHierarchicalWorkItems } from '../../lib/regulation/dailyAlignmentService';

interface AlignmentWorkPickerHierarchicalProps {
  userId: string;
}

export function AlignmentWorkPickerHierarchical({ userId }: AlignmentWorkPickerHierarchicalProps) {
  const [projects, setProjects] = useState<ProjectWithTracks[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [userId]);

  const loadProjects = async () => {
    setLoading(true);
    const data = await getHierarchicalWorkItems(userId);
    setProjects(data);
    setLoading(false);
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleTrack = (trackId: string) => {
    const newExpanded = new Set(expandedTracks);
    if (newExpanded.has(trackId)) {
      newExpanded.delete(trackId);
    } else {
      newExpanded.add(trackId);
    }
    setExpandedTracks(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, item: WorkItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const filteredProjects = projects.filter(project => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();

    const projectMatch = project.name.toLowerCase().includes(query);
    const trackMatch = project.tracks.some(track =>
      track.name.toLowerCase().includes(query) ||
      track.tasks.some(task => task.title.toLowerCase().includes(query)) ||
      track.subtracks.some(sub => sub.name.toLowerCase().includes(query))
    );

    return projectMatch || trackMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading work items...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Available Work</h3>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, tracks, tasks..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            {searchQuery ? 'No items match your search' : 'No projects available'}
          </div>
        ) : (
          filteredProjects.map(project => (
            <ProjectItem
              key={project.id}
              project={project}
              isExpanded={expandedProjects.has(project.id)}
              onToggle={() => toggleProject(project.id)}
              expandedTracks={expandedTracks}
              onToggleTrack={toggleTrack}
              onDragStart={handleDragStart}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gradient-to-t from-blue-50 to-white">
        <div className="flex items-start gap-2 text-xs text-gray-600">
          <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p>
            Drag projects, tracks, or tasks to your calendar to plan your day
          </p>
        </div>
      </div>
    </div>
  );
}

interface ProjectItemProps {
  project: ProjectWithTracks;
  isExpanded: boolean;
  onToggle: () => void;
  expandedTracks: Set<string>;
  onToggleTrack: (trackId: string) => void;
  onDragStart: (e: React.DragEvent, item: WorkItem) => void;
  searchQuery: string;
}

function ProjectItem({
  project,
  isExpanded,
  onToggle,
  expandedTracks,
  onToggleTrack,
  onDragStart,
  searchQuery,
}: ProjectItemProps) {
  const handleDragProject = (e: React.DragEvent) => {
    const item: WorkItem = {
      id: project.id,
      type: 'project',
      title: project.name,
      projectName: project.name,
    };
    onDragStart(e, item);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all">
      <div
        draggable
        onDragStart={handleDragProject}
        className="flex items-center gap-2 p-3 cursor-move hover:bg-gray-50 rounded-t-lg transition-colors"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </button>

        <div className="p-2 bg-blue-100 rounded-lg">
          <Folder className="w-4 h-4 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {project.name}
          </div>
          <div className="text-xs text-gray-500">
            {project.tracks.length} track{project.tracks.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          {project.tracks.length === 0 ? (
            <div className="px-10 py-3 text-xs text-gray-500">No tracks</div>
          ) : (
            project.tracks.map(track => (
              <TrackItem
                key={track.id}
                track={track}
                isExpanded={expandedTracks.has(track.id)}
                onToggle={() => onToggleTrack(track.id)}
                onDragStart={onDragStart}
                searchQuery={searchQuery}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface TrackItemProps {
  track: TrackWithSubtracks;
  isExpanded: boolean;
  onToggle: () => void;
  onDragStart: (e: React.DragEvent, item: WorkItem) => void;
  searchQuery: string;
}

function TrackItem({ track, isExpanded, onToggle, onDragStart, searchQuery }: TrackItemProps) {
  const handleDragTrack = (e: React.DragEvent) => {
    const item: WorkItem = {
      id: track.id,
      type: 'track',
      title: track.name,
      projectName: track.projectName,
      trackName: track.name,
    };
    onDragStart(e, item);
  };

  const totalItems = track.subtracks.length + track.tasks.length;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div
        draggable
        onDragStart={handleDragTrack}
        className="flex items-center gap-2 p-2 pl-8 cursor-move hover:bg-white transition-colors"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          )}
        </button>

        <div className="p-1.5 bg-green-100 rounded">
          <List className="w-3.5 h-3.5 text-green-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {track.name}
          </div>
          {totalItems > 0 && (
            <div className="text-xs text-gray-500">
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="pl-12 pr-2 pb-2 space-y-1">
          {track.subtracks.map(subtrack => {
            const item: WorkItem = {
              id: subtrack.id,
              type: 'subtrack',
              title: subtrack.name,
              projectName: subtrack.projectName,
              trackName: subtrack.trackName,
            };

            return (
              <div
                key={subtrack.id}
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded cursor-move hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="p-1 bg-amber-100 rounded">
                  <Target className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0 text-xs font-medium text-gray-700 truncate">
                  {subtrack.name}
                </div>
              </div>
            );
          })}

          {track.tasks.map(task => {
            const item: WorkItem = {
              id: task.id,
              type: 'task',
              title: task.title,
              projectName: task.projectName,
              trackName: task.trackName,
            };

            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded cursor-move hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="p-1 bg-orange-100 rounded">
                  <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0 text-xs font-medium text-gray-700 truncate">
                  {task.title}
                </div>
              </div>
            );
          })}

          {totalItems === 0 && (
            <div className="text-xs text-gray-400 italic py-2">No items in this track</div>
          )}
        </div>
      )}
    </div>
  );
}
