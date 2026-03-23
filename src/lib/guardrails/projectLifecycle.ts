import type { MasterProject } from '../guardrailsTypes';

export type LifecyclePhase = 
  | 'intent'
  | 'intent_checked'
  | 'feasibility'
  | 'feasibility_checked'
  | 'execution'
  | 'execution_checked';

/**
 * Computes the lifecycle phase for a project based on its current state.
 * This is a UI-level computation for display and gating purposes.
 * 
 * Phase logic:
 * - Intent: Project has domain, project type, details, idea, and clarification completed
 * - Intent Checked: Intent phase complete + passed reality check
 * - Feasibility: Intent checked + templates/tracks, skills, resources, people configured
 * - Feasibility Checked: Feasibility phase complete + passed reality check
 * - Execution: Feasibility checked + execution setup complete
 * - Execution Checked: All phases complete
 */
export function getProjectLifecyclePhase(project: MasterProject): LifecyclePhase {
  // For now, we'll use has_completed_wizard as a proxy for feasibility completion
  // This is a simplified computation - in a full implementation, we'd check:
  // - Intent: domain + project_type + details + idea + clarification
  // - Feasibility: templates/tracks + skills + resources + people
  // - Execution: track decomposition + tasks + time estimates
  
  if (!project.has_completed_wizard) {
    // If wizard is not completed, check if basic setup (intent) is done
    if (project.project_type_id && project.name && project.description) {
      return 'intent'; // Intent phase in progress
    }
    return 'intent'; // Starting at intent
  }

  // Once wizard is completed, we consider feasibility done
  // In a full implementation, we'd check for skills/resources/people
  // For now, has_completed_wizard means feasibility is done
  return 'feasibility_checked';
}

/**
 * Gets the human-readable label for a lifecycle phase
 */
export function getLifecyclePhaseLabel(phase: LifecyclePhase): string {
  switch (phase) {
    case 'intent':
      return 'Intent';
    case 'intent_checked':
      return 'Intent Complete';
    case 'feasibility':
      return 'Feasibility';
    case 'feasibility_checked':
      return 'Feasibility Complete';
    case 'execution':
      return 'Execution';
    case 'execution_checked':
      return 'Complete';
    default:
      return 'Unknown';
  }
}

/**
 * Gets the button label for continuing a phase
 */
export function getContinuePhaseButtonLabel(phase: LifecyclePhase): string {
  switch (phase) {
    case 'intent':
      return 'Continue Intent';
    case 'intent_checked':
      return 'Continue Feasibility';
    case 'feasibility':
      return 'Continue Feasibility';
    case 'feasibility_checked':
      return 'Continue Execution';
    case 'execution':
      return 'Continue Execution';
    case 'execution_checked':
      return 'Project Complete';
    default:
      return 'Continue Project Setup';
  }
}

/**
 * Checks if execution tools (Roadmap, Mesh, Tasks) should be enabled
 */
export function canAccessExecutionTools(phase: LifecyclePhase): boolean {
  return phase === 'feasibility_checked' || phase === 'execution' || phase === 'execution_checked';
}

/**
 * Gets the tooltip message for disabled execution tools
 */
export function getExecutionToolsTooltip(phase: LifecyclePhase): string {
  if (canAccessExecutionTools(phase)) {
    return '';
  }
  return 'Complete Feasibility to unlock execution tools';
}





