import { supabase } from './supabase';
import { BrainProfile, BrainProfileCard, BrainProfileSettings } from './brainProfileTypes';

export interface BrainProfileAnswers {
  processing_style: string[];
  task_style: string[];
  time_relationship: string[];
  sensory_needs: string[];
  communication_preference: string[];
  overwhelm_triggers: string[];
  stress_helpers: string[];
  avoid_behaviors: string[];
  understanding_needs: string[];
  support_style: string[];
}

export async function saveBrainProfile(answers: BrainProfileAnswers): Promise<{ profile: BrainProfile; cards: BrainProfileCard[]; settings: BrainProfileSettings } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: existingProfile } = await supabase
    .from('brain_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  let profile: BrainProfile;

  if (existingProfile) {
    const { data, error } = await supabase
      .from('brain_profiles')
      .update({
        ...answers,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProfile.id)
      .select()
      .single();

    if (error) throw error;
    profile = data;
  } else {
    const { data, error } = await supabase
      .from('brain_profiles')
      .insert({
        user_id: user.id,
        ...answers,
      })
      .select()
      .single();

    if (error) throw error;
    profile = data;
  }

  const cards = await generateProfileCards(profile);
  const settings = await generateProfileSettings(profile);

  return { profile, cards, settings };
}

export async function getBrainProfile(): Promise<BrainProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('brain_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getBrainProfileCards(): Promise<BrainProfileCard[]> {
  const profile = await getBrainProfile();
  if (!profile) return [];

  const { data, error } = await supabase
    .from('brain_profile_cards')
    .select('*')
    .eq('brain_profile_id', profile.id)
    .order('card_type');

  if (error) throw error;
  return data || [];
}

export async function getBrainProfileSettings(): Promise<BrainProfileSettings | null> {
  const profile = await getBrainProfile();
  if (!profile) return null;

  const { data, error } = await supabase
    .from('brain_profile_settings')
    .select('*')
    .eq('brain_profile_id', profile.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function generateProfileCards(profile: BrainProfile): Promise<BrainProfileCard[]> {
  const cards: Omit<BrainProfileCard, 'id' | 'created_at' | 'updated_at'>[] = [];

  const howBrainWorksContent = generateHowBrainWorksCard(profile);
  cards.push({
    brain_profile_id: profile.id,
    card_type: 'how_brain_works',
    title: 'How My Brain Works',
    content: howBrainWorksContent,
    is_visible: true,
    custom_edits: {},
  });

  const communicationContent = generateCommunicationCard(profile);
  cards.push({
    brain_profile_id: profile.id,
    card_type: 'communication',
    title: 'How to Communicate With Me',
    content: communicationContent,
    is_visible: true,
    custom_edits: {},
  });

  const strugglingContent = generateStrugglingCard(profile);
  cards.push({
    brain_profile_id: profile.id,
    card_type: 'struggling',
    title: 'When I\'m Struggling',
    content: strugglingContent,
    is_visible: true,
    custom_edits: {},
  });

  const supportOthersContent = generateSupportOthersCard(profile);
  if (supportOthersContent.length > 0) {
    cards.push({
      brain_profile_id: profile.id,
      card_type: 'support_others',
      title: 'How I Support Others Best',
      content: supportOthersContent,
      is_visible: true,
      custom_edits: {},
    });
  }

  await supabase
    .from('brain_profile_cards')
    .delete()
    .eq('brain_profile_id', profile.id);

  const { data, error } = await supabase
    .from('brain_profile_cards')
    .insert(cards)
    .select();

  if (error) throw error;
  return data || [];
}

function generateHowBrainWorksCard(profile: BrainProfile): string[] {
  const content: string[] = [];

  if (profile.processing_style.includes('visual')) {
    content.push('I learn best with visual information like diagrams and written notes');
  }
  if (profile.processing_style.includes('audio')) {
    content.push('I prefer audio information and verbal explanations');
  }
  if (profile.processing_style.includes('hands_on')) {
    content.push('I learn best by doing things hands-on');
  }
  if (profile.processing_style.includes('short_chunks')) {
    content.push('I process information better in short chunks');
  }
  if (profile.processing_style.includes('big_picture')) {
    content.push('I need to see the big picture first before diving into details');
  }
  if (profile.processing_style.includes('step_by_step')) {
    content.push('I prefer step-by-step details and clear instructions');
  }

  if (profile.task_style.includes('structure')) {
    content.push('I thrive with structure and consistency in my routine');
  }
  if (profile.task_style.includes('flexibility')) {
    content.push('I work best with flexibility and spontaneity');
  }
  if (profile.task_style.includes('struggle_to_start')) {
    content.push('I sometimes struggle to start tasks and need a gentle nudge');
  }
  if (profile.task_style.includes('next_step_only')) {
    content.push('I work best when I can focus on just the next step');
  }

  if (profile.time_relationship.includes('lose_track')) {
    content.push('I lose track of time easily and may need reminders');
  }
  if (profile.time_relationship.includes('transition_warnings')) {
    content.push('Transition warnings help me switch between tasks');
  }

  return content;
}

function generateCommunicationCard(profile: BrainProfile): string[] {
  const content: string[] = [];

  if (profile.communication_preference.includes('direct_concise')) {
    content.push('Keep communication direct and concise');
  }
  if (profile.communication_preference.includes('warm_gentle')) {
    content.push('I appreciate warm, gentle communication');
  }
  if (profile.communication_preference.includes('main_point_first')) {
    content.push('Give me the main point first, then details');
  }
  if (profile.communication_preference.includes('context_first')) {
    content.push('I prefer context before getting to the main point');
  }
  if (profile.communication_preference.includes('time_to_think')) {
    content.push('I need time to think before replying');
  }
  if (profile.communication_preference.includes('prefer_written')) {
    content.push('I prefer written communication over verbal');
  }

  if (profile.overwhelm_triggers.includes('long_messages')) {
    content.push('Avoid long messages - break them into smaller parts');
  }
  if (profile.overwhelm_triggers.includes('sudden_changes')) {
    content.push('Give me advance notice of plan changes when possible');
  }
  if (profile.overwhelm_triggers.includes('being_interrupted')) {
    content.push('Please avoid interrupting me when I\'m processing');
  }

  return content;
}

function generateStrugglingCard(profile: BrainProfile): string[] {
  const content: string[] = ['Signs I might be overwhelmed:'];

  if (profile.overwhelm_triggers.length > 0) {
    profile.overwhelm_triggers.forEach(trigger => {
      const triggerLabels: Record<string, string> = {
        too_many_tasks: 'Too many tasks at once',
        sudden_changes: 'Unexpected changes to plans',
        long_messages: 'Long or complex messages',
        bright_screens: 'Overly bright or cluttered visuals',
        sensory_overload: 'Noise or sensory overload',
        misunderstandings: 'Misunderstandings or unclear communication',
        feeling_rushed: 'Feeling rushed or pressured',
        being_interrupted: 'Being interrupted frequently',
      };
      if (triggerLabels[trigger]) {
        content.push(`• ${triggerLabels[trigger]}`);
      }
    });
  }

  content.push('', 'What helps:');
  profile.stress_helpers.forEach(helper => {
    const helperLabels: Record<string, string> = {
      short_instructions: 'Short, specific instructions',
      reassurance: 'Reassurance and validation',
      silence: 'Quiet time to process',
      help_choosing: 'Help choosing the next step',
      grounding: 'Grounding or breathing techniques',
      step_breakdown: 'Clear breakdown of steps',
    };
    if (helperLabels[helper]) {
      content.push(`• ${helperLabels[helper]}`);
    }
  });

  if (profile.avoid_behaviors.length > 0) {
    content.push('', 'Please don\'t:');
    profile.avoid_behaviors.forEach(behavior => {
      const behaviorLabels: Record<string, string> = {
        calm_down: 'Tell me to "calm down"',
        info_overload: 'Overload me with information',
        sudden_changes: 'Change plans suddenly',
        raise_voice: 'Raise your voice',
        interrupt_processing: 'Interrupt my processing time',
        quick_decisions: 'Demand quick decisions',
        guilt_trip: 'Guilt-trip me about tasks',
      };
      if (behaviorLabels[behavior]) {
        content.push(`• ${behaviorLabels[behavior]}`);
      }
    });
  }

  return content;
}

function generateSupportOthersCard(profile: BrainProfile): string[] {
  const content: string[] = [];

  if (profile.support_style.includes('practical_guidance')) {
    content.push('I\'m good at providing practical, step-by-step guidance');
  }
  if (profile.support_style.includes('emotional_support')) {
    content.push('I can offer emotional support and validation');
  }
  if (profile.understanding_needs.includes('just_listen')) {
    content.push('I\'m a good listener and can offer a patient ear');
  }
  if (profile.understanding_needs.includes('validate_feelings')) {
    content.push('I understand the importance of validating feelings');
  }

  return content;
}

async function generateProfileSettings(profile: BrainProfile): Promise<BrainProfileSettings> {
  let themePreset: 'calm' | 'vibrant' | 'standard' = 'standard';
  if (profile.sensory_needs.includes('calm_visuals') || profile.sensory_needs.includes('quiet_ui')) {
    themePreset = 'calm';
  } else if (profile.sensory_needs.includes('bright_visuals')) {
    themePreset = 'vibrant';
  }

  let notificationStyle: 'minimal' | 'standard' | 'structured' = 'standard';
  if (profile.task_style.includes('structure')) {
    notificationStyle = 'structured';
  } else if (profile.overwhelm_triggers.includes('sensory_overload')) {
    notificationStyle = 'minimal';
  }

  let communicationRewriting: 'direct' | 'soft' | 'balanced' = 'balanced';
  if (profile.communication_preference.includes('direct_concise')) {
    communicationRewriting = 'direct';
  } else if (profile.communication_preference.includes('warm_gentle')) {
    communicationRewriting = 'soft';
  }

  const taskHandling = {
    show_fewer_tasks: profile.task_style.includes('overwhelmed_by_lists') || profile.task_style.includes('next_step_only'),
    more_structure: profile.task_style.includes('structure'),
    transition_warnings: profile.time_relationship.includes('transition_warnings'),
    reminder_count: profile.time_relationship.includes('multiple_reminders') ? 3 : 1,
  };

  const sensoryToggles = {
    reduce_animation: profile.sensory_needs.includes('distracted_by_movement') || profile.sensory_needs.includes('quiet_ui'),
    adjust_brightness: profile.sensory_needs.includes('calm_visuals'),
    enable_haptics: profile.sensory_needs.includes('enjoy_haptics'),
  };

  const settingsData = {
    brain_profile_id: profile.id,
    theme_preset: themePreset,
    notification_style: notificationStyle,
    communication_rewriting: communicationRewriting,
    task_handling: taskHandling,
    sensory_toggles: sensoryToggles,
  };

  const { data: existingSettings } = await supabase
    .from('brain_profile_settings')
    .select('*')
    .eq('brain_profile_id', profile.id)
    .maybeSingle();

  if (existingSettings) {
    const { data, error } = await supabase
      .from('brain_profile_settings')
      .update({
        ...settingsData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSettings.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('brain_profile_settings')
      .insert(settingsData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function updateProfileCard(cardId: string, content: string[]): Promise<void> {
  const { error } = await supabase
    .from('brain_profile_cards')
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId);

  if (error) throw error;
}

export async function toggleCardVisibility(cardId: string, isVisible: boolean): Promise<void> {
  const { error } = await supabase
    .from('brain_profile_cards')
    .update({
      is_visible: isVisible,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId);

  if (error) throw error;
}
