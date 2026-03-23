export type ProductModuleId =
  | 'core'
  | 'guardrails'
  | 'spaces'
  | 'regulation'
  | 'planner'
  | 'tracking'
  | 'mindmesh'
  | 'hierarchy';

export type ProductModule = {
  id: ProductModuleId;
  name: string;
  routePrefix?: string;
  summary: string;
  state: 'core' | 'hidden';
  enabled: boolean;
};

export const productModules: ProductModule[] = [
  {
    id: 'core',
    name: 'Core product',
    summary: 'The main product surface: today, calendar, projects, tasks, check-ins, journal, reports, and settings.',
    state: 'core',
    enabled: true,
  },
  {
    id: 'guardrails',
    name: 'Guardrails',
    routePrefix: '/guardrails',
    summary: 'Advanced planning systems such as roadmap, taskflow, side projects, offshoots, and reality check.',
    state: 'hidden',
    enabled: false,
  },
  {
    id: 'spaces',
    name: 'Widget Spaces',
    routePrefix: '/spaces',
    summary: 'Widget- and page-based workspace composition layered on top of the ownership model.',
    state: 'hidden',
    enabled: false,
  },
  {
    id: 'regulation',
    name: 'Regulation',
    routePrefix: '/regulation',
    summary: 'Intervention workflows, behavioral insights, and alignment flows kept intact as a future feature module.',
    state: 'hidden',
    enabled: false,
  },
  {
    id: 'planner',
    name: 'Planner',
    routePrefix: '/planner',
    summary: 'The broad life-area planner and its subdomains, preserved as a future feature module.',
    state: 'hidden',
    enabled: false,
  },
  {
    id: 'tracking',
    name: 'Tracking Studio',
    routePrefix: '/tracker-studio',
    summary: 'Tracker studio, fitness tracker, and recipe detail flows available for future activation.',
    state: 'hidden',
    enabled: false,
  },
  {
    id: 'mindmesh',
    name: 'MindMesh',
    routePrefix: '/guardrails/mindmesh',
    summary: 'Graph-based relationship and ideation surfaces that attach to projects and other core entities.',
    state: 'hidden',
    enabled: false,
  },
  {
    id: 'hierarchy',
    name: 'Tracks and hierarchy',
    routePrefix: '/guardrails/projects/:projectId/*',
    summary: 'Future planning hierarchy for tracks, subtracks, roadmap structure, and taskflow projections.',
    state: 'hidden',
    enabled: false,
  },
];

export function isModuleEnabled(moduleId: ProductModuleId) {
  return productModules.some((module) => module.id === moduleId && module.enabled);
}

export function getAvailableModules() {
  return productModules.filter((module) => module.id !== 'core');
}
