/**
 * Trackers Guide Content
 * 
 * Phase 9: Comprehensive explanation of Trackers based on design brief.
 * 
 * Explains what trackers are, how they work, and the philosophy behind them.
 */

export interface TrackersGuideSection {
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

export const TRACKERS_GUIDE_SECTIONS: TrackersGuideSection[] = [
  {
    id: 'what-are-trackers',
    title: 'What Are Trackers?',
    icon: '📊',
    content: 'Trackers are custom tools you create to capture data over time and surface insights. You can track behaviors, states, activities, and experiences in a way that\'s flexible and meaning-focused. Trackers help you understand patterns in your life without forcing you into rigid categories.',
    visualNote: 'Trackers = Custom Tools for Capturing Data Over Time',
  },
  {
    id: 'core-philosophy',
    title: 'The Core Philosophy',
    icon: '💭',
    content: 'Trackers exist to help you become aware of patterns — not to control your behavior. The system prioritizes awareness over enforcement, clarity over power, structure over rigidity, and agency over automation. No streak shaming, no punishment for gaps, no optimization pressure.',
    visualNote: 'Awareness Over Enforcement | Clarity Over Power | Agency Over Automation',
  },
  {
    id: 'what-you-can-track',
    title: 'What You Can Track',
    icon: '🎯',
    content: 'Trackers are flexible enough to capture almost anything: behaviors (like exercise or meditation), states (like mood or energy), activities (like reading or social time), and experiences (like travel or learning). You define what matters to you, and the tracker adapts to your needs.',
    connections: [
      {
        from: 'Behaviors',
        to: 'Custom Trackers',
        description: 'Track exercise, meditation, habits, or any behavior you want to observe',
      },
      {
        from: 'States',
        to: 'Custom Trackers',
        description: 'Track mood, energy, stress, or any state you want to understand',
      },
      {
        from: 'Activities',
        to: 'Custom Trackers',
        description: 'Track reading, social time, work sessions, or any activity',
      },
      {
        from: 'Experiences',
        to: 'Custom Trackers',
        description: 'Track travel, learning, creative work, or meaningful experiences',
      },
    ],
  },
  {
    id: 'templates-vs-trackers',
    title: 'Templates vs Trackers',
    icon: '📋',
    content: 'A Template is a reusable structure that defines how a tracker works — it has no data. A Tracker is a live instance that contains your actual entries and history. You can create trackers from templates or build them from scratch. Templates save you time; trackers capture your life.',
    visualNote: 'Template = Structure Only | Tracker = Structure + Your Data',
  },
  {
    id: 'where-trackers-live',
    title: 'Where Trackers Live',
    icon: '📍',
    content: 'Trackers work the same everywhere. You can create and use trackers in Spaces (as widgets or embedded views) and in Planner (as pages or embedded views). The behavior is identical — no duplication, no confusion. Trackers you create appear globally, so you can access them from anywhere.',
    connections: [
      {
        from: 'Spaces',
        to: 'Trackers',
        description: 'Create and view trackers in Spaces as widgets or embedded views',
      },
      {
        from: 'Planner',
        to: 'Trackers',
        description: 'Create and view trackers in Planner as pages or embedded views',
      },
      {
        from: 'Global Access',
        to: 'Same Everywhere',
        description: 'Trackers behave identically regardless of where you access them',
      },
    ],
  },
  {
    id: 'creating-trackers',
    title: 'Creating Trackers',
    icon: '✨',
    content: 'You can create a tracker in under 60 seconds. Choose a template or start from scratch. Define the tracker name, how you\'ll enter data (daily, session, event, or range), and what fields you want to track. Review the summary, create it, and optionally add reminders or save the structure as a template.',
  },
  {
    id: 'field-types',
    title: 'What You Can Track (Field Types)',
    icon: '🔧',
    content: 'Trackers support different field types: Yes/No (boolean), Numbers (with units), Scales (like 1-5 ratings), Duration, Categories/Tags, Free Text/Notes, Attachments, and Time Ranges. You combine these to build trackers that fit exactly what you want to observe.',
  },
  {
    id: 'safety-and-editing',
    title: 'Safety and Editing',
    icon: '🔒',
    content: 'Before you add any entries, you can edit everything about your tracker. Once you start logging data, some changes are protected to keep your data safe: you can rename, add optional fields, and change labels, but you can\'t remove fields with data or change field types. This protects your data integrity.',
    visualNote: 'Before Entries: Full Editing | After Entries: Protected Changes',
  },
  {
    id: 'sharing-and-permissions',
    title: 'Sharing and Permissions',
    icon: '👥',
    content: 'You can share trackers with others (read-only or read & write). Sharing is explicit, reversible, and scoped to the specific tracker. Nothing is shared by default. Templates and trackers have separate sharing systems, so sharing a template doesn\'t share your tracker data.',
  },
  {
    id: 'insights-and-analytics',
    title: 'Insights and Analytics',
    icon: '📈',
    content: 'Trackers feed into a shared, time-based context layer that helps you see patterns across different trackers. The system provides insights, summaries, and contextual views without judgment. You see what\'s happening, not what you "should" be doing.',
  },
  {
    id: 'calm-and-non-judgmental',
    title: 'A Calm, Non-Judgmental Experience',
    icon: '🌱',
    content: 'Trackers are designed to feel calm, predictable, and respectful of your attention. There\'s no streak shaming, no punishment for gaps, no optimization pressure. The system helps you understand your life over time — it doesn\'t try to make you behave better.',
    visualNote: 'No Streak Shaming | No Punishment | No Optimization Pressure',
  },
];

/**
 * Get all trackers guide sections
 */
export function getAllTrackersGuideSections(): TrackersGuideSection[] {
  return TRACKERS_GUIDE_SECTIONS;
}
