import { supabase } from './supabase';

export interface InsightSummary {
  id: string;
  memberId: string;
  sectionId: string;
  title: string;
  coreInsight: string;
  brainTip: string;
  featureTeaser?: string;
  savedToProfile: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getInsightSummary(
  memberId: string,
  sectionId: string
): Promise<InsightSummary | null> {
  const { data, error } = await supabase
    .from('insight_summaries')
    .select('*')
    .eq('member_id', memberId)
    .eq('section_id', sectionId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching insight summary:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    memberId: data.member_id,
    sectionId: data.section_id,
    title: data.title,
    coreInsight: data.core_insight,
    brainTip: data.brain_tip,
    featureTeaser: data.feature_teaser,
    savedToProfile: data.saved_to_profile,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function generateInsightSummary(
  memberId: string,
  sectionId: string,
  sectionTitle: string
): Promise<InsightSummary | null> {
  const existing = await getInsightSummary(memberId, sectionId);
  if (existing) return existing;

  const featureTeaser = await generateFeatureTeaser(memberId);

  const sampleInsights = {
    'You, As an Individual': {
      title: 'Your brain thrives with small steps and clear structure.',
      coreInsight: 'You process information best when it comes in manageable chunks. Big picture first helps you see where you\'re going. Structure gives you confidence.',
      brainTip: 'Start tasks with a 2-minute timer to break through inertia.',
    },
    'You in Daily Life': {
      title: 'Your energy flows in waves, not steady streams.',
      coreInsight: 'You have natural peaks and valleys throughout the day. Fighting them is exhausting. Working with them is powerful. Time flexibility is your friend.',
      brainTip: 'Schedule important tasks during your natural energy peaks.',
    },
    'You in Relationships': {
      title: 'You communicate best with time to process.',
      coreInsight: 'Quick responses can feel overwhelming. You need space to think things through. This isn\'t slowness, it\'s thoughtfulness. Your responses are worth the wait.',
      brainTip: 'Tell others "I need time to think" without apologizing.',
    },
    'You in Your Home': {
      title: 'Your space shapes how your brain works.',
      coreInsight: 'Visual calm helps you focus. Clutter drains your energy. But your version of organized might look different than others. That\'s completely valid.',
      brainTip: 'Create one completely calm corner just for you.',
    },
  };

  const defaultInsight = sampleInsights[sectionTitle as keyof typeof sampleInsights] || {
    title: 'You\'re learning more about yourself every day.',
    coreInsight: 'Each module helps you understand your unique patterns. This knowledge is powerful. It helps you make choices that work for your brain, not against it.',
    brainTip: 'Celebrate the insights you\'re gaining about yourself.',
  };

  const { data, error } = await supabase
    .from('insight_summaries')
    .insert({
      member_id: memberId,
      section_id: sectionId,
      title: defaultInsight.title,
      core_insight: defaultInsight.coreInsight,
      brain_tip: defaultInsight.brainTip,
      feature_teaser: featureTeaser,
      saved_to_profile: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating insight summary:', error);
    return null;
  }

  return {
    id: data.id,
    memberId: data.member_id,
    sectionId: data.section_id,
    title: data.title,
    coreInsight: data.core_insight,
    brainTip: data.brain_tip,
    featureTeaser: data.feature_teaser,
    savedToProfile: data.saved_to_profile,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function saveInsightToProfile(insightId: string): Promise<boolean> {
  const { error } = await supabase
    .from('insight_summaries')
    .update({ saved_to_profile: true, updated_at: new Date().toISOString() })
    .eq('id', insightId);

  if (error) {
    console.error('Error saving insight to profile:', error);
    return false;
  }

  return true;
}

async function generateFeatureTeaser(memberId: string): Promise<string | undefined> {
  const { data: features } = await supabase
    .from('app_features')
    .select('id, name, slug')
    .order('order_index');

  if (!features || features.length === 0) return undefined;

  const { data: unlocks } = await supabase
    .from('member_feature_unlocks')
    .select('feature_id')
    .eq('member_id', memberId);

  const unlockedFeatureIds = new Set(unlocks?.map((u) => u.feature_id) || []);

  const lockedFeatures = features.filter((f) => !unlockedFeatureIds.has(f.id));

  if (lockedFeatures.length === 0) return undefined;

  const { data: completedSections } = await supabase
    .from('progress')
    .select('section_id')
    .eq('member_id', memberId)
    .eq('completed', true);

  const completedCount = completedSections?.length || 0;
  const totalSections = 7;
  const progressPercent = Math.round((completedCount / totalSections) * 100);

  if (progressPercent >= 25 && lockedFeatures[0]) {
    return `New Feature Progress: You're ${progressPercent}% of the way to unlocking ${lockedFeatures[0].name}`;
  }

  return undefined;
}
