/**
 * Calendar Guide Content
 * 
 * Phase 9: Comprehensive explanation of Calendar system with visual clarity.
 * 
 * Explains how Personal, Planner, Shared, and Guardrails calendars work together.
 */

export interface CalendarGuideSection {
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

export const CALENDAR_GUIDE_SECTIONS: CalendarGuideSection[] = [
  {
    id: 'one-calendar-two-views',
    title: 'One Calendar, Two Ways to View It',
    icon: '👁️',
    content: 'Your Personal Calendar is the same whether you access it through Personal Spaces or Planner. These are just two different ways to interact with the same calendar data. Personal Spaces shows it as a widget in your space, while Planner shows it integrated with your planning tools.',
    visualNote: 'Personal Spaces Calendar = Planner Calendar = Your Personal Calendar',
  },
  {
    id: 'personal-calendar',
    title: 'Personal Calendar',
    icon: '📅',
    content: 'Your Personal Calendar is your private calendar where you create events, see Guardrails events (if synced), and manage your time. It belongs only to you by default, but you can choose to share it with others.',
    connections: [
      {
        from: 'Guardrails',
        to: 'Personal Calendar',
        description: 'Guardrails events can sync to your Personal Calendar when you enable sync settings',
      },
      {
        from: 'You',
        to: 'Personal Calendar',
        description: 'You can create events directly in your Personal Calendar',
      },
    ],
  },
  {
    id: 'shared-calendar',
    title: 'Shared Calendar',
    icon: '👥',
    content: 'Shared Calendars are connected to your household and shared spaces. They show events that everyone in your household or shared space can see. These calendars help coordinate family activities, household projects, and shared commitments.',
    connections: [
      {
        from: 'Guardrails',
        to: 'Shared Calendar',
        description: 'Guardrails events can sync to Shared Calendars when you choose "Shared" or "Both" in sync settings',
      },
      {
        from: 'Shared Spaces',
        to: 'Shared Calendar',
        description: 'Events from Shared Spaces appear in the Shared Calendar',
      },
      {
        from: 'Household',
        to: 'Shared Calendar',
        description: 'All household members can see and interact with Shared Calendar events',
      },
    ],
  },
  {
    id: 'guardrails-to-calendar',
    title: 'How Guardrails Connects to Calendars',
    icon: '🔄',
    content: 'Guardrails creates events within your projects. You control whether these events appear in your Personal Calendar, Shared Calendar, or both. This happens through sync settings at the project, track, subtrack, or event level. You decide where each project\'s events should appear.',
    connections: [
      {
        from: 'Guardrails Project',
        to: 'Personal Calendar',
        description: 'Project events sync to Personal Calendar when sync is enabled',
      },
      {
        from: 'Guardrails Project',
        to: 'Shared Calendar',
        description: 'Project events sync to Shared Calendar when you choose "Shared" or "Both"',
      },
      {
        from: 'Guardrails Event',
        to: 'Calendar Event',
        description: 'Each Guardrails event becomes a calendar event when synced',
      },
    ],
  },
  {
    id: 'calendar-sources',
    title: 'Where Calendar Events Come From',
    icon: '📍',
    content: 'Your calendars show events from multiple sources: events you create directly, events synced from Guardrails projects, events from shared spaces, and context events you\'ve accepted. All of these appear together in one unified view, but you can see where each event came from.',
  },
  {
    id: 'how-they-work-together',
    title: 'How They Work Together',
    icon: '🔗',
    content: 'Think of it this way: Guardrails is where you plan (projects, tracks, events). Calendars are where you see time (Personal for you, Shared for household). Sync settings decide which Guardrails events appear in which calendars. Sharing settings decide who can see your Personal Calendar. They work together to keep everything organized and visible to the right people.',
  },
  {
    id: 'sync-vs-sharing',
    title: 'Sync vs Sharing',
    icon: '🔄',
    content: 'Sync and Sharing are two different things that work together. Sync decides WHERE events appear (your Personal Calendar or a Shared Calendar). Sharing decides WHO can see or edit your Personal Calendar. You can sync Guardrails events to calendars without sharing your calendar, and you can share your calendar without syncing Guardrails events.',
    visualNote: 'Sync = WHERE events show up | Sharing = WHO can see your calendar',
    connections: [
      {
        from: 'Guardrails Sync',
        to: 'Calendar Location',
        description: 'Sync settings move Guardrails events into Personal or Shared calendars',
      },
      {
        from: 'Calendar Sharing',
        to: 'People Access',
        description: 'Sharing settings let others view or edit your Personal Calendar',
      },
      {
        from: 'Sync + Sharing',
        to: 'Complete Control',
        description: 'Use both together to control where events appear and who can see them',
      },
    ],
  },
];

/**
 * Get all calendar guide sections
 */
export function getAllCalendarGuideSections(): CalendarGuideSection[] {
  return CALENDAR_GUIDE_SECTIONS;
}
