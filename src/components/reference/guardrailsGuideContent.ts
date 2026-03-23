/**
 * Guardrails Guide Content
 * 
 * Phase 9: All Guardrails features explained in plain language.
 * 
 * Each feature has:
 * - What it is (one sentence)
 * - When to use it (one sentence)
 */

export interface GuardrailsGuideItem {
  id: string;
  title: string;
  icon: string;
  whatItIs: string;
  whenToUse: string;
}

export const GUARDRAILS_GUIDE_ITEMS: Record<string, GuardrailsGuideItem> = {
  'mind-mesh': {
    id: 'mind-mesh',
    title: 'Mind Mesh',
    icon: '🧠',
    whatItIs: 'A knowledge graph that connects your ideas, notes, and information in a visual network.',
    whenToUse: 'Use Mind Mesh when you want to see how different concepts, people, and projects relate to each other.',
  },
  'roadmap': {
    id: 'roadmap',
    title: 'Roadmap',
    icon: '🗺️',
    whatItIs: 'A timeline view that shows your project events, tasks, and milestones in chronological order.',
    whenToUse: 'Use Roadmap to plan and visualize when things need to happen in your project.',
  },
  'task-flow': {
    id: 'task-flow',
    title: 'Task Flow',
    icon: '📋',
    whatItIs: 'A kanban-style board for managing tasks and tracking their progress through different stages.',
    whenToUse: 'Use Task Flow when you need to organize work into stages like To Do, In Progress, and Done.',
  },
  'reality-check': {
    id: 'reality-check',
    title: 'Reality Check',
    icon: '🔍',
    whatItIs: 'A tool that helps you assess whether your plans are realistic and achievable.',
    whenToUse: 'Use Reality Check when you want to validate your timelines, resources, or assumptions before committing.',
  },
  'people': {
    id: 'people',
    title: 'People',
    icon: '👥',
    whatItIs: 'A directory of people involved in your project, with their roles, contact info, and assignments.',
    whenToUse: 'Use People to keep track of who is working on what and how to reach them.',
  },
  'side-projects': {
    id: 'side-projects',
    title: 'Side Projects',
    icon: '💡',
    whatItIs: 'Separate projects that are related to your main project but managed independently.',
    whenToUse: 'Use Side Projects when you have related work that deserves its own space but connects to the main project.',
  },
  'offshoot-ideas': {
    id: 'offshoot-ideas',
    title: 'Offshoot Ideas',
    icon: '🌱',
    whatItIs: 'Ideas that emerge from your project but aren\'t part of the main plan yet.',
    whenToUse: 'Use Offshoot Ideas to capture and explore ideas that might become future projects or features.',
  },
  'focus-mode': {
    id: 'focus-mode',
    title: 'Focus Mode',
    icon: '🎯',
    whatItIs: 'A distraction-free view that shows only the essential information you need right now.',
    whenToUse: 'Use Focus Mode when you need to concentrate on specific work without seeing everything else.',
  },
  'regulation-rules': {
    id: 'regulation-rules',
    title: 'Regulation Rules',
    icon: '⚖️',
    whatItIs: 'Custom rules and guidelines that help you stay on track and maintain healthy work patterns.',
    whenToUse: 'Use Regulation Rules to set boundaries, reminders, or constraints that keep your project sustainable.',
  },
};

/**
 * Get guardrails guide item by section ID
 */
export function getGuardrailsGuideItem(sectionId: string): GuardrailsGuideItem | undefined {
  return GUARDRAILS_GUIDE_ITEMS[sectionId];
}

/**
 * Get all guardrails guide items
 */
export function getAllGuardrailsGuideItems(): GuardrailsGuideItem[] {
  return Object.values(GUARDRAILS_GUIDE_ITEMS);
}
