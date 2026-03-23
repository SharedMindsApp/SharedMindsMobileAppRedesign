import { useParams } from 'react-router-dom';
import { RealityCheckPage } from './RealityCheckPage';

export function ProjectRealityCheckPage() {
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
    <RealityCheckPage
      masterProjectId={masterProjectId}
      masterProjectName="Master Project"
    />
  );
}
