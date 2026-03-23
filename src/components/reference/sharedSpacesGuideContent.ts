/**
 * Shared Spaces Guide Content
 * 
 * Phase 9: Comprehensive explanation of Shared Spaces with examples.
 * 
 * Explains what shared spaces are, how they work, and when to use them.
 */

export interface SharedSpacesGuideSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  examples?: string[];
}

export const SHARED_SPACES_GUIDE_SECTIONS: SharedSpacesGuideSection[] = [
  {
    id: 'what-are-shared-spaces',
    title: 'What Are Shared Spaces?',
    icon: '👥',
    content: 'Shared Spaces are collaborative workspaces where everyone in your household can see and work together. Unlike Personal Spaces (which are just for you), Shared Spaces are visible to all household members and can contain shared calendars, projects, and activities.',
  },
  {
    id: 'when-to-use-shared-spaces',
    title: 'When to Use Shared Spaces',
    icon: '🎯',
    content: 'Use Shared Spaces for anything that involves multiple people in your household. This includes family calendars, household projects, shared goals, or anything you want others to see and contribute to.',
    examples: [
      'Family Calendar: Everyone can see and add family events, appointments, and activities',
      'Home Renovation: Track progress, share ideas, and coordinate tasks with family members',
      'Vacation Planning: Plan trips together, share itineraries, and coordinate travel details',
      'Household Chores: Organize tasks, assign responsibilities, and track completion',
    ],
  },
  {
    id: 'how-shared-spaces-work',
    title: 'How Shared Spaces Work',
    icon: '⚙️',
    content: 'When you create a Shared Space, it becomes visible to everyone in your household. You can add widgets, create events, and organize content just like a Personal Space, but everything is visible to household members. You control who can edit what through permissions.',
  },
  {
    id: 'shared-calendars',
    title: 'Shared Calendars in Shared Spaces',
    icon: '📅',
    content: 'Shared Spaces can have their own calendars that show events relevant to that space. These calendars appear in the Shared Calendar view and help coordinate activities. For example, a "Family Events" Shared Space might have a calendar showing all family activities.',
    examples: [
      'Family Events Space: Calendar shows birthdays, school events, and family gatherings',
      'Home Projects Space: Calendar shows renovation milestones and contractor appointments',
      'Vacation Space: Calendar shows travel dates, hotel bookings, and activity schedules',
    ],
  },
  {
    id: 'permissions-and-control',
    title: 'Permissions and Control',
    icon: '🔒',
    content: 'You control who can see and edit Shared Spaces. By default, all household members can see Shared Spaces, but you can set permissions for who can add widgets, create events, or make changes. This keeps collaboration organized while maintaining control.',
  },
  {
    id: 'shared-vs-personal',
    title: 'Shared vs Personal Spaces',
    icon: '🔄',
    content: 'Personal Spaces are private to you. Shared Spaces are visible to your household. You can have both types of spaces for different purposes. For example, you might have a Personal Space for your work projects and a Shared Space for family planning.',
    examples: [
      'Personal Space: Your private work projects, personal goals, or individual planning',
      'Shared Space: Family calendar, household projects, or collaborative activities',
      'Both Together: Keep personal work private while sharing family activities',
    ],
  },
];

/**
 * Get all shared spaces guide sections
 */
export function getAllSharedSpacesGuideSections(): SharedSpacesGuideSection[] {
  return SHARED_SPACES_GUIDE_SECTIONS;
}
