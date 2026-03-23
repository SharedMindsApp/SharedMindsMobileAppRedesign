/**
 * Household Guide Content
 * 
 * Phase 9: Comprehensive explanation of Households.
 * 
 * Explains what households are, how they work, and when to use them.
 */

export interface HouseholdGuideSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  examples?: string[];
}

export const HOUSEHOLD_GUIDE_SECTIONS: HouseholdGuideSection[] = [
  {
    id: 'what-is-household',
    title: 'What is a Household?',
    icon: '🏠',
    content: 'Your household is the group of people you live with or share life with. It\'s the foundation for collaboration in SharedMinds. Once you set up a household, all members can see Shared Spaces, collaborate on shared calendars, and work together on household projects.',
  },
  {
    id: 'when-to-use-household',
    title: 'When to Use Households',
    icon: '👥',
    content: 'Set up a household when you want to collaborate with family members, roommates, or anyone you share life with. Households enable shared calendars, shared spaces, and collaborative planning.',
    examples: [
      'Family: Share calendars, plan family events, coordinate household tasks',
      'Roommates: Coordinate shared spaces, manage household chores, plan group activities',
      'Partners: Share calendars, plan together, collaborate on shared projects',
    ],
  },
  {
    id: 'how-households-work',
    title: 'How Households Work',
    icon: '⚙️',
    content: 'When you create or join a household, you become a household member. All household members can see Shared Spaces and interact with shared calendars. You control what\'s shared and what stays private. Personal Spaces and Personal Calendars remain private unless you explicitly share them.',
  },
  {
    id: 'household-vs-personal',
    title: 'Household vs Personal',
    icon: '🔄',
    content: 'Everything in SharedMinds starts as personal to you. Your Personal Spaces, Personal Calendar, and individual projects are private. When you want to collaborate, you can create Shared Spaces or share your Personal Calendar with household members. The household is the group, but you control what gets shared.',
    examples: [
      'Personal: Your private work projects, individual goals, personal calendar',
      'Household: Shared family calendar, household projects, collaborative spaces',
      'Both Together: Keep personal work private while sharing family activities',
    ],
  },
  {
    id: 'household-features',
    title: 'What Households Enable',
    icon: '✨',
    content: 'Households unlock collaboration features: Shared Spaces for group projects, Shared Calendars for coordination, household-wide planning, and collaborative task management. All while keeping your personal data private by default.',
    examples: [
      'Shared Spaces: Create spaces visible to all household members',
      'Shared Calendars: Coordinate events and activities with everyone',
      'Household Planning: Plan together while maintaining personal privacy',
    ],
  },
];

/**
 * Get all household guide sections
 */
export function getAllHouseholdGuideSections(): HouseholdGuideSection[] {
  return HOUSEHOLD_GUIDE_SECTIONS;
}
