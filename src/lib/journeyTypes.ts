export interface JourneySection {
  id: string;
  title: string;
  description: string;
  order_index: number;
  stage: 'individual' | 'daily_life' | 'relationships' | 'home';
  stage_order: number;
  icon: string;
  emotional_copy: string;
  completion_insight: string;
}

export interface JourneyStage {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  order: number;
  sections: JourneySection[];
}

export const JOURNEY_STAGES: Record<string, Omit<JourneyStage, 'sections'>> = {
  individual: {
    id: 'individual',
    title: 'You, as an Individual',
    subtitle: 'Understanding how your mind works',
    emoji: '✨',
    color: 'blue',
    order: 1,
  },
  daily_life: {
    id: 'daily_life',
    title: 'You in Daily Life',
    subtitle: 'Your routines, patterns, and rhythms',
    emoji: '🌅',
    color: 'amber',
    order: 2,
  },
  relationships: {
    id: 'relationships',
    title: 'You in Relationships',
    subtitle: 'How you connect and communicate',
    emoji: '💝',
    color: 'rose',
    order: 3,
  },
  home: {
    id: 'home',
    title: 'You in Your Home',
    subtitle: 'Your shared space and values',
    emoji: '🏡',
    color: 'emerald',
    order: 4,
  },
};
