/**
 * Reference Guide Content
 * 
 * Phase 9: Core concepts explained in plain language.
 * 
 * Each concept has:
 * - What it is (one sentence)
 * - When to use it (one sentence)
 * - How it connects (one sentence)
 */

export interface ReferenceItem {
  id: string;
  title: string;
  icon: string;
  whatItIs: string;
  whenToUse: string;
  howItConnects: string;
  readFurther?: Array<{
    title: string;
    link: string;
  }>;
  subSections?: Array<{
    title: string;
    link: string;
  }>;
}

export const REFERENCE_ITEMS: ReferenceItem[] = [
  {
    id: 'sharedminds-overview',
    title: 'Welcome to SharedMinds',
    icon: '🧠',
    whatItIs: 'SharedMinds is a personal and household management system that brings together planning, calendars, spaces, and collaboration.',
    whenToUse: 'Use SharedMinds to organize your life, collaborate with your household, and plan your projects.',
    howItConnects: 'Spaces, Planner, Guardrails, and Calendar all work together to help you manage everything in one integrated system.',
    readFurther: [
      {
        title: 'Learn more about SharedMinds',
        link: '/sharedminds/overview',
      },
    ],
  },
  {
    id: 'spaces',
    title: 'Spaces',
    icon: '📦',
    whatItIs: 'Spaces are containers where you organize your projects, activities, and widgets.',
    whenToUse: 'Create a Space when you want to group related things together, like a home renovation or a personal workspace.',
    howItConnects: 'Spaces can be Personal (just you) or Shared (visible to household members).',
    readFurther: [
      {
        title: 'Learn about widgets',
        link: '/spaces/widgets',
      },
      {
        title: 'Learn about shared spaces',
        link: '/spaces/shared',
      },
    ],
  },
  {
    id: 'trips',
    title: 'Trips',
    icon: '✈️',
    whatItIs: 'Trips help you plan and organize travel with destinations, itineraries, and collaboration.',
    whenToUse: 'Create a Trip when you\'re planning travel, whether it\'s a weekend getaway, business trip, or family vacation.',
    howItConnects: 'Trips can sync to your Calendar, be shared with collaborators, and include detailed itineraries with destinations and activities.',
    readFurther: [
      {
        title: 'Learn more about trips',
        link: '/trips/guide',
      },
    ],
  },
  {
    id: 'trackers',
    title: 'Trackers',
    icon: '📊',
    whatItIs: 'Trackers are custom tools you create to capture data over time and surface insights. Track behaviors, states, activities, and experiences in a flexible, meaning-focused way.',
    whenToUse: 'Create a Tracker when you want to observe patterns in your life, like exercise habits, mood, energy levels, or any behavior or experience you want to understand better.',
    howItConnects: 'Trackers work the same in Spaces and Planner. They feed into insights and summaries that help you see patterns across your life without judgment or optimization pressure.',
    readFurther: [
      {
        title: 'Learn more about trackers',
        link: '/trackers/guide',
      },
    ],
  },
  {
    id: 'guardrails',
    title: 'Guardrails',
    icon: '🎯',
    whatItIs: 'Guardrails helps you plan and organize projects with tracks, subtracks, and events.',
    whenToUse: 'Use Guardrails when you need to break down a project into steps, like planning a wedding or building a business.',
    howItConnects: 'Guardrails events can sync to your Calendar, and you choose which projects appear where.',
    readFurther: [
      {
        title: 'Learn more about features',
        link: '/guardrails/features',
      },
      {
        title: 'Learn more about projects',
        link: '/guardrails/projects',
      },
    ],
  },
  {
    id: 'calendar',
    title: 'Calendar',
    icon: '📅',
    whatItIs: 'Your Calendar shows all your events and time commitments. Personal Spaces and Planner show the same Personal Calendar, just in different ways.',
    whenToUse: 'Check your Calendar to see what\'s happening today, this week, or this month. Use Personal Calendar for your private events, and Shared Calendar for household coordination.',
    howItConnects: 'Events come from Guardrails (if synced), events you create directly, and Shared Spaces. Guardrails events can sync to Personal or Shared calendars based on your settings.',
    readFurther: [
      {
        title: 'Learn how calendars work',
        link: '/calendar/guide',
      },
    ],
  },
  {
    id: 'planner',
    title: 'Planner',
    icon: '📋',
    whatItIs: 'Planner helps you organize tasks, goals, and activities across your projects.',
    whenToUse: 'Use Planner to see everything you need to do, regardless of which project it belongs to.',
    howItConnects: 'Planner pulls from Guardrails projects, Personal tasks, and Shared Spaces to show you the full picture.',
    readFurther: [
      {
        title: 'Learn about planner features',
        link: '/planner/features',
      },
    ],
  },
  {
    id: 'people',
    title: 'People & Collaboration',
    icon: '👥',
    whatItIs: 'SharedMinds lets you collaborate with households, work teams, friends, and family. You control who sees what through explicit permissions and privacy settings.',
    whenToUse: 'Share projects, spaces, or calendars with specific people. Control who can view, edit, or manage your content. Keep personal work private while collaborating on shared projects.',
    howItConnects: 'People can be added to projects, shared spaces, and calendars. Permissions control what they can see and do. Everything stays private by default until you explicitly share it.',
    readFurther: [
      {
        title: 'Learn more about collaboration',
        link: '/people/guide',
      },
      {
        title: 'Learn about households',
        link: '/people/households',
      },
      {
        title: 'Learn about teams',
        link: '/people/teams',
      },
    ],
  },
];

/**
 * Get reference item by ID
 */
export function getReferenceItem(id: string): ReferenceItem | undefined {
  return REFERENCE_ITEMS.find(item => item.id === id);
}

/**
 * Get all reference items
 */
export function getAllReferenceItems(): ReferenceItem[] {
  return REFERENCE_ITEMS;
}
