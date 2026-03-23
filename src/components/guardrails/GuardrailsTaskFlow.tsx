import { useActiveDataContext } from '../../state/useActiveDataContext';
import { useActiveProject } from '../../contexts/ActiveProjectContext';
import { TaskFlowPage } from './taskflow/TaskFlowPage';

export function GuardrailsTaskFlow() {
  const { activeProjectId } = useActiveDataContext();
  const { activeProject } = useActiveProject();

  return (
    <TaskFlowPage
      masterProjectId={activeProjectId!}
      masterProjectName={activeProject?.name || ''}
    />
  );
}
