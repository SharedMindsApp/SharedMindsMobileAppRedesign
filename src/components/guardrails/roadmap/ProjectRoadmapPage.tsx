import { useParams } from 'react-router-dom';
import { RoadmapPage } from './RoadmapPage';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';

export function ProjectRoadmapPage() {
  const { masterProjectId } = useParams<{ masterProjectId: string }>();
  const { activeProject } = useActiveProject();

  if (!masterProjectId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Invalid project ID</p>
        </div>
      </div>
    );
  }

  // Use active project name if available, fallback to "Project"
  const projectName = activeProject?.name || 'Project';

  return (
    <RoadmapPage
      masterProjectId={masterProjectId}
      masterProjectName={projectName}
    />
  );
}
