import { useParams } from 'react-router-dom';
import { TaskFlowPage } from './TaskFlowPage';

export function ProjectTaskFlowPage() {
  const { masterProjectId } = useParams<{ masterProjectId: string }>();

  if (!masterProjectId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Invalid project ID</p>
        </div>
      </div>
    );
  }

  return (
    <TaskFlowPage
      masterProjectId={masterProjectId}
      masterProjectName="Master Project"
    />
  );
}
