export type CoreNavGroup = 'primary' | 'secondary';

export type CoreNavItem = {
  to: string;
  label: string;
  shortLabel: string;
  blurb: string;
  icon:
  | 'today'
  | 'tasks'
  | 'checkins'
  | 'projects'
  | 'calendar'
  | 'journal'
  | 'reports'
  | 'settings';
  stage: 'Daily' | 'Core' | 'Support';
  group: CoreNavGroup;
};

export const corePrimaryNavItems: CoreNavItem[] = [
  {
    to: '/today',
    label: 'Today',
    shortLabel: 'Today',
    blurb: 'Brain state, focus, task recommendations, and your daily rhythm.',
    icon: 'today',
    stage: 'Daily',
    group: 'primary',
  },
  {
    to: '/tasks',
    label: 'Tasks',
    shortLabel: 'Tasks',
    blurb: 'Energy-aware task list filtered by brain state and priority.',
    icon: 'tasks',
    stage: 'Core',
    group: 'primary',
  },
  {
    to: '/check-ins',
    label: 'Check-Ins',
    shortLabel: 'Check-ins',
    blurb: 'AI prompts grounded in what happened today, not generic coaching.',
    icon: 'checkins',
    stage: 'Daily',
    group: 'primary',
  },
  {
    to: '/projects',
    label: 'Projects',
    shortLabel: 'Projects',
    blurb: 'Personal and shared projects with phases and task grouping.',
    icon: 'projects',
    stage: 'Core',
    group: 'primary',
  },
  {
    to: '/calendar',
    label: 'Calendar',
    shortLabel: 'Calendar',
    blurb: 'Unified view of focus blocks and commitments.',
    icon: 'calendar',
    stage: 'Core',
    group: 'primary',
  },
];

export const coreSecondaryNavItems: CoreNavItem[] = [
  {
    to: '/journal',
    label: 'Journal',
    shortLabel: 'Journal',
    blurb: 'Daily reflection, sleep, movement, wins, struggles, and tomorrow intention.',
    icon: 'journal',
    stage: 'Daily',
    group: 'secondary',
  },
  {
    to: '/reports',
    label: 'Reports',
    shortLabel: 'Reports',
    blurb: 'Daily and weekly snapshots built from tasks, activity, and reflection.',
    icon: 'reports',
    stage: 'Support',
    group: 'secondary',
  },
  {
    to: '/settings',
    label: 'Settings',
    shortLabel: 'Settings',
    blurb: 'Profile, sharing defaults, AI behavior, and notifications.',
    icon: 'settings',
    stage: 'Support',
    group: 'secondary',
  },
];

export const coreNavItems = [...corePrimaryNavItems, ...coreSecondaryNavItems];

export const corePrinciples = [
  'Start with the day, not with a framework.',
  'Brain state drives what you see and what gets recommended.',
  'Personal and shared views use the same core data model.',
  'Projects stop at projects and tasks until users prove they need more.',
  'Advanced features stay available without shaping the main app.',
];

export const coreKeeps = [
  'Brain state as a real input into the day',
  'AI check-ins with task, activity, journal, and project context',
  'Activity logging that shows reality, not just plans',
  'Streaks, daily wins, and parked ideas for ADHD motivation',
  'A calendar and responsibilities model that can be shared intentionally',
  'Journal and reports that turn the day into durable history',
];

export const hiddenFeatureDomains = [
  'Guardrails, roadmap, tracks, subtracks, and taskflow hierarchy',
  'Widget Spaces and page/canvas composition',
  'MindMesh and knowledge-graph layers',
  'Fitness, recipes, education, finance, and travel subdomains',
  'Professional and admin-heavy surfaces outside the core loop',
];
