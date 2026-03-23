import { supabase } from './supabase';

export interface InsightCard {
  category: 'communication' | 'routine' | 'sensory' | 'stress' | 'task' | 'needs' | 'actions';
  title: string;
  summary: string;
  explanation: string;
  tryThis: string;
  icon: string;
  strengthBased: boolean;
  featureTeaser?: string;
}

export interface HouseholdInsightMatch {
  id: string;
  householdId: string;
  memberIds: string[];
  insightCards: InsightCard[];
  savedToProfile: boolean;
  viewed: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function checkHouseholdMatchReady(householdId: string): Promise<boolean> {
  // V1: Legacy 'members' table no longer exists
  const { data: members, error } = await supabase
    .from('space_members')
    .select('id')
    .eq('space_id', householdId)
    .eq('status', 'active');

  if (error || !members || members.length < 2) return false;

  const { data: completedProfiles } = await supabase
    .from('individual_profile_responses')
    .select('member_id')
    .eq('completed', true)
    .in('member_id', members.map(m => m.id));

  return (completedProfiles?.length || 0) >= 2;
}

export async function getHouseholdMatch(householdId: string): Promise<HouseholdInsightMatch | null> {
  const { data, error } = await supabase
    .from('household_insight_matches')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    householdId: data.household_id,
    memberIds: data.member_ids,
    insightCards: data.insight_cards as InsightCard[],
    savedToProfile: data.saved_to_profile,
    viewed: data.viewed,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function generateHouseholdMatch(householdId: string): Promise<HouseholdInsightMatch | null> {
  const existing = await getHouseholdMatch(householdId);
  if (existing) return existing;

  // V1: Legacy 'members' table no longer exists
  const { data: members } = await supabase
    .from('space_members')
    .select('id, user_id')
    .eq('space_id', householdId)
    .eq('status', 'active');

  if (!members || members.length < 2) return null;

  const { data: profiles } = await supabase
    .from('individual_profile_responses')
    .select('*')
    .eq('completed', true)
    .in('member_id', members.map(m => m.id));

  if (!profiles || profiles.length < 2) return null;

  const insightCards = generateInsightCards(profiles, members);
  const memberIds = profiles.map(p => p.member_id);

  const { data, error } = await supabase
    .from('household_insight_matches')
    .insert({
      household_id: householdId,
      member_ids: memberIds,
      insight_cards: insightCards,
      saved_to_profile: false,
      viewed: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating household match:', error);
    return null;
  }

  return {
    id: data.id,
    householdId: data.household_id,
    memberIds: data.member_ids,
    insightCards: data.insight_cards as InsightCard[],
    savedToProfile: data.saved_to_profile,
    viewed: data.viewed,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function generateInsightCards(profiles: any[], members: any[]): InsightCard[] {
  const cards: InsightCard[] = [];

  cards.push(generateCommunicationCard(profiles));
  cards.push(generateRoutineCard(profiles));
  cards.push(generateSensoryCard(profiles));
  cards.push(generateStressCard(profiles));
  cards.push(generateTaskCard(profiles));
  cards.push(generateNeedsCard(profiles));
  cards.push(generateActionsCard(profiles));

  return cards;
}

function generateCommunicationCard(profiles: any[]): InsightCard {
  const directCount = profiles.filter(p =>
    p.communication_style?.includes('direct')
  ).length;

  const processTimeCount = profiles.filter(p =>
    p.communication_style?.includes('process_time')
  ).length;

  if (directCount > 0 && processTimeCount > 0) {
    return {
      category: 'communication',
      title: 'You have different communication paces',
      summary: 'One of you thinks out loud, the other thinks then speaks.',
      explanation: 'This is a beautiful balance. Quick responders bring energy and momentum. Thoughtful processors bring depth and clarity. Neither is better, both are valuable.',
      tryThis: 'When making decisions, give 24 hours for processing before expecting a final answer.',
      icon: 'message-circle',
      strengthBased: true,
    };
  }

  return {
    category: 'communication',
    title: 'You share similar communication styles',
    summary: 'You naturally understand each other\'s pace.',
    explanation: 'You both process and respond in similar ways. This creates natural flow in conversations. You get each other without much translation needed.',
    tryThis: 'Use your natural sync to tackle complex topics together without time pressure.',
    icon: 'message-circle',
    strengthBased: true,
  };
}

function generateRoutineCard(profiles: any[]): InsightCard {
  const structuredCount = profiles.filter(p =>
    p.focus_type === 'structured'
  ).length;

  const flexibleCount = profiles.filter(p =>
    p.focus_type === 'flexible'
  ).length;

  if (structuredCount > 0 && flexibleCount > 0) {
    return {
      category: 'routine',
      title: 'You balance structure with flexibility',
      summary: 'One loves plans, the other loves spontaneity.',
      explanation: 'This can feel like friction, but it\'s actually protective. Structure prevents chaos. Flexibility prevents rigidity. You balance each other out.',
      tryThis: 'Create a weekly anchor routine (meals, bedtime) but leave weekends open for spontaneity.',
      icon: 'calendar',
      strengthBased: true,
    };
  }

  return {
    category: 'routine',
    title: 'You share similar daily rhythms',
    summary: 'You naturally want the same amount of structure.',
    explanation: 'You both prefer similar levels of planning and routine. This makes coordinating daily life much easier because your natural preferences align.',
    tryThis: 'Build your ideal shared routine together since you\'ll both feel good about it.',
    icon: 'calendar',
    strengthBased: true,
  };
}

function generateSensoryCard(profiles: any[]): InsightCard {
  const calmCount = profiles.filter(p =>
    p.sensory_preferences?.includes('calm_quiet')
  ).length;

  const stimulationCount = profiles.filter(p =>
    p.sensory_preferences?.includes('background_noise')
  ).length;

  if (calmCount > 0 && stimulationCount > 0) {
    return {
      category: 'sensory',
      title: 'You have different sensory comfort zones',
      summary: 'One needs quiet, the other thrives with background activity.',
      explanation: 'Sensory needs aren\'t optional, they\'re neurological. When your needs differ, it\'s about creating space for both, not one compromising for the other.',
      tryThis: 'Create quiet zones and activity zones in your home so everyone has what they need.',
      icon: 'volume-2',
      strengthBased: false,
      featureTeaser: 'The Sensory Environment Planner can help map your ideal shared spaces.',
    };
  }

  return {
    category: 'sensory',
    title: 'You share similar sensory preferences',
    summary: 'You naturally create environments that work for both of you.',
    explanation: 'Your sensory comfort zones overlap. This means less negotiation about noise levels, lighting, and activity. You can relax in the same spaces.',
    tryThis: 'Optimize your shared spaces together since you\'ll both benefit from the same changes.',
    icon: 'volume-2',
    strengthBased: true,
  };
}

function generateStressCard(profiles: any[]): InsightCard {
  const silenceCount = profiles.filter(p =>
    p.reset_preferences?.includes('silence')
  ).length;

  const connectionCount = profiles.filter(p =>
    p.reset_preferences?.includes('talk_through')
  ).length;

  if (silenceCount > 0 && connectionCount > 0) {
    return {
      category: 'stress',
      title: 'You reset from stress differently',
      summary: 'One needs space, the other needs connection.',
      explanation: 'When stressed, one of you withdraws to recharge. The other reaches out to process. This can feel like rejection or smothering, but it\'s just different nervous systems.',
      tryThis: 'Say "I need to reset, I\'ll come find you in 20 minutes" so space doesn\'t feel like abandonment.',
      icon: 'heart-pulse',
      strengthBased: false,
    };
  }

  return {
    category: 'stress',
    title: 'You have compatible stress responses',
    summary: 'You naturally support each other in hard moments.',
    explanation: 'Your stress reset patterns align. You both need similar types of support, which makes it easier to know how to help each other without guessing.',
    tryThis: 'Create a shared reset ritual you can do together when stress hits.',
    icon: 'heart-pulse',
    strengthBased: true,
  };
}

function generateTaskCard(profiles: any[]): InsightCard {
  const quickStartCount = profiles.filter(p =>
    p.thinking_speed === 'quick_decisions'
  ).length;

  const slowStartCount = profiles.filter(p =>
    p.thinking_speed === 'deliberate'
  ).length;

  if (quickStartCount > 0 && slowStartCount > 0) {
    return {
      category: 'task',
      title: 'You have different task initiation speeds',
      summary: 'One jumps in, the other needs warm-up time.',
      explanation: 'Fast starters bring momentum. Slow starters bring thoroughness. The fast starter isn\'t impulsive, the slow starter isn\'t lazy. Just different executive functions.',
      tryThis: 'The quick starter can begin tasks alone, then invite the other in once momentum builds.',
      icon: 'check-square',
      strengthBased: true,
      featureTeaser: 'The Task Translator can break down tasks to work for both styles.',
    };
  }

  return {
    category: 'task',
    title: 'You share similar task approaches',
    summary: 'You naturally tackle tasks at the same pace.',
    explanation: 'Your task initiation speeds match. This makes it easier to start projects together without one person feeling rushed or held back.',
    tryThis: 'Use your natural sync to tackle household tasks as a team.',
    icon: 'check-square',
    strengthBased: true,
  };
}

function generateNeedsCard(profiles: any[]): InsightCard {
  return {
    category: 'needs',
    title: 'What you both need to thrive',
    summary: 'The foundation that helps everyone feel good.',
    explanation: 'Understanding is the starting point. Adaptation is the practice. Compassion is the glue. You\'re both doing your best with different brains.',
    tryThis: 'Check in weekly: "What do you need from me this week to feel supported?"',
    icon: 'users',
    strengthBased: true,
  };
}

function generateActionsCard(profiles: any[]): InsightCard {
  return {
    category: 'actions',
    title: 'Start here: Your action checklist',
    summary: 'Small steps that make a big difference.',
    explanation: 'These aren\'t rules, they\'re experiments. Try one thing this week. Notice what helps. Keep what works, adjust what doesn\'t. Progress over perfection.',
    tryThis: 'Pick ONE suggestion from your insights to try for 7 days, then discuss how it felt.',
    icon: 'list-checks',
    strengthBased: true,
  };
}

export async function markMatchAsViewed(matchId: string): Promise<boolean> {
  const { error } = await supabase
    .from('household_insight_matches')
    .update({ viewed: true, updated_at: new Date().toISOString() })
    .eq('id', matchId);

  return !error;
}

export async function saveMatchToProfile(matchId: string): Promise<boolean> {
  const { error } = await supabase
    .from('household_insight_matches')
    .update({ saved_to_profile: true, updated_at: new Date().toISOString() })
    .eq('id', matchId);

  return !error;
}
