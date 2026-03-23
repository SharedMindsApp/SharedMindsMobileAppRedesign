/**
 * Trips Guide Content
 * 
 * Phase 9: Comprehensive explanation of Trips based on travel system architecture.
 * 
 * Explains what trips are, how they work, and how to use them for travel planning.
 */

export interface TripsGuideSection {
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

export const TRIPS_GUIDE_SECTIONS: TripsGuideSection[] = [
  {
    id: 'what-are-trips',
    title: 'What Are Trips?',
    icon: '✈️',
    content: 'Trips help you plan and organize travel with destinations, itineraries, and collaboration. Whether you\'re planning a weekend getaway, business trip, or family vacation, trips give you a dedicated space to organize all your travel details in one place.',
    visualNote: 'Trips = Dedicated Travel Planning Containers',
  },
  {
    id: 'trip-features',
    title: 'What Trips Include',
    icon: '🗺️',
    content: 'Each trip can have multiple destinations, a day-by-day itinerary, collaborators, and travel details. You can track flights, hotels, activities, reservations, and costs. Trips can sync to your Calendar and be shared with travel companions.',
    connections: [
      {
        from: 'Destinations',
        to: 'Multiple Locations',
        description: 'Add multiple destinations with arrival/departure dates and timezones',
      },
      {
        from: 'Itinerary',
        to: 'Day-by-Day Planning',
        description: 'Plan activities, meals, reservations, and milestones for each day',
      },
      {
        from: 'Collaborators',
        to: 'Travel Companions',
        description: 'Invite others to collaborate on trip planning with different roles',
      },
      {
        from: 'Calendar',
        to: 'Time Coordination',
        description: 'Trips can sync to your Calendar to show travel dates and activities',
      },
    ],
  },
  {
    id: 'trip-types',
    title: 'Types of Trips',
    icon: '🎯',
    content: 'Trips support different travel scenarios: solo travel, couples trips, family vacations, group travel, events, and tours. Each trip type helps you organize the right level of detail and collaboration for your travel style.',
    connections: [
      {
        from: 'Solo Travel',
        to: 'Personal Planning',
        description: 'Plan your own travel with full control over destinations and itinerary',
      },
      {
        from: 'Couples & Family',
        to: 'Shared Planning',
        description: 'Collaborate with partners or family members on trip planning',
      },
      {
        from: 'Group Travel',
        to: 'Team Coordination',
        description: 'Coordinate with multiple people, assign activities, and share costs',
      },
      {
        from: 'Events & Tours',
        to: 'Structured Itineraries',
        description: 'Plan around events or follow tour schedules with detailed timing',
      },
    ],
  },
  {
    id: 'destinations',
    title: 'Multiple Destinations',
    icon: '📍',
    content: 'A single trip can include multiple destinations. Each destination has its own arrival and departure dates, location details, timezone, and notes. This lets you plan complex trips that span multiple cities or countries with clear organization.',
  },
  {
    id: 'itinerary-planning',
    title: 'Itinerary Planning',
    icon: '📅',
    content: 'Build a day-by-day itinerary with activities, meals, reservations, and milestones. Each itinerary item can have a date, time, location, category (travel, activity, food, reservation, milestone), booking references, costs, and notes. Assign items to specific people for group coordination.',
  },
  {
    id: 'collaboration',
    title: 'Trip Collaboration',
    icon: '👥',
    content: 'Invite travel companions to collaborate on your trip. Collaborators can have different roles: Owner (full control), Editor (can add/edit itinerary), or Viewer (read-only access). This lets you plan together while maintaining control over who can make changes.',
    connections: [
      {
        from: 'Owner',
        to: 'Full Control',
        description: 'Can manage trip, add collaborators, and edit everything',
      },
      {
        from: 'Editor',
        to: 'Planning Access',
        description: 'Can add and edit itinerary items, destinations, and details',
      },
      {
        from: 'Viewer',
        to: 'Read Only',
        description: 'Can see trip details but cannot make changes',
      },
    ],
  },
  {
    id: 'calendar-integration',
    title: 'Calendar Integration',
    icon: '📆',
    content: 'Trips can sync to your Calendar, showing your travel dates and activities. The trip appears as a container event spanning your travel dates, and individual itinerary items can appear as separate calendar events. This helps you see your travel alongside other commitments.',
    connections: [
      {
        from: 'Trip Dates',
        to: 'Calendar Container',
        description: 'Trip appears as a multi-day event on your calendar',
      },
      {
        from: 'Itinerary Items',
        to: 'Calendar Events',
        description: 'Individual activities can sync as separate calendar events',
      },
      {
        from: 'Shared Calendar',
        to: 'Household Visibility',
        description: 'Trips can appear in Shared Calendar for household coordination',
      },
    ],
  },
  {
    id: 'trip-status',
    title: 'Trip Status and Lifecycle',
    icon: '🔄',
    content: 'Trips have statuses that reflect where you are in the planning and travel process: Planning (actively organizing), Confirmed (booked and ready), In Progress (currently traveling), Completed (travel finished), and Archived (kept for reference).',
  },
  {
    id: 'cost-tracking',
    title: 'Cost and Booking Tracking',
    icon: '💰',
    content: 'Track costs and booking references for itinerary items. This helps you manage travel budgets, keep track of reservations, and coordinate expenses with travel companions. Costs are optional and can be assigned to specific people for group trips.',
  },
  {
    id: 'how-trips-connect',
    title: 'How Trips Connect',
    icon: '🔗',
    content: 'Trips connect to your Calendar for time coordination, to Shared Spaces for household visibility, and to collaborators for planning together. They work as dedicated containers for travel planning while integrating with the rest of SharedMinds.',
    connections: [
      {
        from: 'Trips',
        to: 'Calendar',
        description: 'Travel dates and activities appear in your calendar',
      },
      {
        from: 'Trips',
        to: 'Shared Spaces',
        description: 'Trips can be visible in Shared Spaces for household coordination',
      },
      {
        from: 'Trips',
        to: 'Collaborators',
        description: 'Travel companions can plan together with appropriate permissions',
      },
    ],
  },
];

/**
 * Get all trips guide sections
 */
export function getAllTripsGuideSections(): TripsGuideSection[] {
  return TRIPS_GUIDE_SECTIONS;
}
