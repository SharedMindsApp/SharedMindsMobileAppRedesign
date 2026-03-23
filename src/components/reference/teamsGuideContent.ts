/**
 * Teams Guide Content
 * 
 * Phase 9: Comprehensive explanation of Teams.
 * 
 * Explains what teams are, how they work, and when to use them.
 */

export interface TeamsGuideSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  visualNote?: string;
  examples?: string[];
  connections?: Array<{
    from: string;
    to: string;
    description: string;
  }>;
}

export const TEAMS_GUIDE_SECTIONS: TeamsGuideSection[] = [
  {
    id: 'what-are-teams',
    title: 'What Are Teams?',
    icon: '👥',
    content: 'Teams are groups of people you work with or collaborate with outside of your household. Teams can be work colleagues, friend groups, hobby clubs, or any group of people you want to collaborate with on projects and activities.',
    visualNote: 'Teams = Groups for Work, Friends, Hobbies, and Collaboration',
  },
  {
    id: 'teams-vs-households',
    title: 'Teams vs Households',
    icon: '🔄',
    content: 'Households are for family and people you live with. Teams are for other groups in your life: work colleagues, friend groups, hobby clubs, or project collaborators. Teams allow you to collaborate on Guardrails projects, share spaces, and coordinate activities with people outside your household.',
    connections: [
      {
        from: 'Households',
        to: 'Family & Home',
        description: 'For people you live with or share life with at home',
      },
      {
        from: 'Teams',
        to: 'Work & Friends',
        description: 'For colleagues, friends, hobby groups, or project collaborators',
      },
    ],
  },
  {
    id: 'when-to-use-teams',
    title: 'When to Use Teams',
    icon: '🎯',
    content: 'Create a Team when you want to collaborate with a group of people on specific projects or activities. Teams are perfect for work projects, friend group planning, hobby clubs, or any situation where you need to coordinate with a group outside your household.',
    examples: [
      'Work Team: Collaborate on business projects, share calendars, coordinate deadlines',
      'Friend Group: Plan trips together, organize events, share activities',
      'Hobby Club: Coordinate meetups, share resources, plan group activities',
      'Project Collaborators: Work together on specific Guardrails projects',
    ],
  },
  {
    id: 'teams-and-projects',
    title: 'Teams and Projects',
    icon: '🎯',
    content: 'Teams can be connected to Guardrails projects, allowing team members to collaborate on project planning, tracks, and events. When you add a team to a project, all team members get appropriate access based on their role in the team. This makes it easy to work together on shared projects.',
    connections: [
      {
        from: 'Team',
        to: 'Guardrails Project',
        description: 'Connect teams to projects for collaborative planning',
      },
      {
        from: 'Team Members',
        to: 'Project Access',
        description: 'Team members receive project access based on team role',
      },
      {
        from: 'Project Events',
        to: 'Team Calendar',
        description: 'Project events can sync to team calendars for coordination',
      },
    ],
  },
  {
    id: 'team-roles',
    title: 'Team Roles and Permissions',
    icon: '⚙️',
    content: 'Teams have roles that control what members can do: Team Owner (full control), Team Admin (manage members and settings), Team Member (participate in projects and activities). These roles determine access to projects, spaces, and calendars connected to the team.',
    connections: [
      {
        from: 'Team Owner',
        to: 'Full Control',
        description: 'Can manage team, add/remove members, connect to projects',
      },
      {
        from: 'Team Admin',
        to: 'Management Access',
        description: 'Can manage members and team settings',
      },
      {
        from: 'Team Member',
        to: 'Participation',
        description: 'Can participate in team projects and activities',
      },
    ],
  },
  {
    id: 'teams-and-spaces',
    title: 'Teams and Shared Spaces',
    icon: '📦',
    content: 'Teams can have their own Shared Spaces for collaborative planning and organization. Team spaces allow members to share widgets, calendars, and activities. This creates a dedicated workspace for the team while keeping it separate from household spaces.',
  },
  {
    id: 'creating-teams',
    title: 'Creating and Managing Teams',
    icon: '✨',
    content: 'You can create teams and invite members by email. Teams can be named, have descriptions, and include custom settings. You control who can join, what they can access, and how the team connects to projects and spaces. Teams are independent of households and can include people from different households.',
  },
];

/**
 * Get all teams guide sections
 */
export function getAllTeamsGuideSections(): TeamsGuideSection[] {
  return TEAMS_GUIDE_SECTIONS;
}
