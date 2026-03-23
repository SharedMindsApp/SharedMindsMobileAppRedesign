import { useActiveDataContext } from '../../state/useActiveDataContext';
import { useActiveProject } from '../../contexts/ActiveProjectContext';
import { RoadmapPage } from './roadmap/RoadmapPage';

export function GuardrailsRoadmap() {
  const { activeProjectId } = useActiveDataContext();
  const { activeProject } = useActiveProject();

  return (
    <RoadmapPage
      masterProjectId={activeProjectId!}
      masterProjectName={activeProject?.name || ''}
    />
  );
}
