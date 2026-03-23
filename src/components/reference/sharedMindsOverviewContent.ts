/**
 * SharedMinds Overview Guide Content
 * 
 * Phase 9: Welcome screen introducing SharedMinds architecture and core concepts.
 * 
 * Provides a user-friendly overview of how Spaces, Planner, Guardrails, and Calendar work together.
 */

export interface SharedMindsOverviewSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  visualNote?: string;
  connections?: Array<{
    from: string;
    to: string;
    description: string;
  }>;
}

export const SHAREDMINDS_OVERVIEW_SECTIONS: SharedMindsOverviewSection[] = [
  {
    id: 'what-is-sharedminds',
    title: 'What is SharedMinds?',
    icon: '🧠',
    content: 'SharedMinds is a personal and household management system designed to help you organize your life, collaborate with your household, and plan your projects. It brings together planning, calendars, spaces, and collaboration in one integrated system.',
    visualNote: 'SharedMinds = Personal Organization + Household Collaboration + Project Planning',
  },
  {
    id: 'core-features',
    title: 'The Four Core Features',
    icon: '🎯',
    content: 'SharedMinds is built around four main features that work together: Spaces (where you organize), Planner (where you plan), Guardrails (where you execute projects), and Calendar (where you see time). Each serves a specific purpose, and they all connect.',
    connections: [
      {
        from: 'Spaces',
        to: 'Organization',
        description: 'Containers for your projects, trips, and activities',
      },
      {
        from: 'Planner',
        to: 'Planning',
        description: 'Unified view of tasks, goals, and activities across everything',
      },
      {
        from: 'Guardrails',
        to: 'Execution',
        description: 'Project management with tracks, events, and detailed planning',
      },
      {
        from: 'Calendar',
        to: 'Time',
        description: 'See all your events and commitments in one place',
      },
    ],
  },
  {
    id: 'how-they-connect',
    title: 'How They Connect',
    icon: '🔗',
    content: 'Everything in SharedMinds is designed to work together. Guardrails projects can sync events to your Calendar. Spaces can contain widgets that show your Planner tasks. Your Calendar shows events from Guardrails, Spaces, and events you create directly. It\'s all connected, but you control what connects where.',
    connections: [
      {
        from: 'Guardrails',
        to: 'Calendar',
        description: 'Project events can sync to Personal or Shared calendars',
      },
      {
        from: 'Spaces',
        to: 'Planner',
        description: 'Spaces widgets can show Planner tasks and activities',
      },
      {
        from: 'Planner',
        to: 'Calendar',
        description: 'Planner shows your calendar integrated with your planning',
      },
      {
        from: 'Spaces',
        to: 'Calendar',
        description: 'Shared Spaces can have calendars visible to household members',
      },
    ],
  },
  {
    id: 'personal-vs-shared',
    title: 'Personal vs Shared',
    icon: '👤',
    content: 'Everything in SharedMinds starts as personal to you. You can create Personal Spaces for your private projects, use Planner for your individual planning, and manage your Personal Calendar. When you want to collaborate, you can share with your household or create Shared Spaces that everyone can see and contribute to.',
    visualNote: 'Personal = Private to You | Shared = Visible to Household',
  },
  {
    id: 'household-collaboration',
    title: 'Household Collaboration',
    icon: '🏠',
    content: 'Your household is the group of people you live with or share life with. Once set up, household members can see Shared Spaces, collaborate on shared calendars, and work together on household projects. You control what\'s shared and what stays private.',
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    content: 'Start by exploring Spaces to organize your projects, use Planner to see your tasks and goals, create projects in Guardrails for detailed planning, and check your Calendar to see your time commitments. Everything is designed to work together, so you can start anywhere and build from there.',
  },
];

/**
 * Get all SharedMinds overview sections
 */
export function getAllSharedMindsOverviewSections(): SharedMindsOverviewSection[] {
  return SHAREDMINDS_OVERVIEW_SECTIONS;
}
