import { detectDrift } from './focus';
import type { FocusSession } from './focusTypes';

let focusSessionContext: {
  activeSession: FocusSession | null;
  activeProjectId: string | null;
  setDriftActive: (active: boolean) => void;
  setDriftContext: (context: string) => void;
  setPendingNudge: (nudge: { type: 'soft' | 'hard' | 'regulation'; message: string } | null) => void;
  addSessionEvent: (event: any) => void;
} | null = null;

export function registerFocusContext(context: typeof focusSessionContext) {
  focusSessionContext = context;
}

export function unregisterFocusContext() {
  focusSessionContext = null;
}

export async function notifyFocusContextChange(
  contextType: 'side_project' | 'offshoot' | 'node' | 'taskflow' | 'other',
  contextId?: string
) {
  if (!focusSessionContext?.activeSession || !focusSessionContext?.activeProjectId) {
    return;
  }

  const newContext = contextId || contextType;

  if (newContext === focusSessionContext.activeProjectId) {
    return;
  }

  try {
    const event = await detectDrift(
      focusSessionContext.activeSession.id,
      newContext,
      focusSessionContext.activeProjectId
    );

    if (event) {
      focusSessionContext.addSessionEvent(event);
      focusSessionContext.setDriftActive(true);
      focusSessionContext.setDriftContext(getContextLabel(contextType, contextId));
      focusSessionContext.setPendingNudge({
        type: 'hard',
        message: `You've switched away from your main project!`,
      });
    }
  } catch (error) {
    console.error('Failed to detect drift:', error);
  }
}

function getContextLabel(contextType: string, contextId?: string): string {
  const labels: Record<string, string> = {
    side_project: 'Side Projects',
    offshoot: 'Offshoot Ideas',
    node: 'Mind Mesh',
    taskflow: 'Task Flow',
    other: 'Another Area',
  };

  const label = labels[contextType] || contextType;
  return contextId ? `${label} (${contextId})` : label;
}
