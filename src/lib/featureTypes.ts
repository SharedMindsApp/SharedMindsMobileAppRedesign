export interface AppFeature {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  unlock_requirement: 'individual' | 'daily_life' | 'relationships' | 'home';
  microcopy: string;
  order_index: number;
  created_at: string;
}

export interface MemberFeatureUnlock {
  id: string;
  member_id: string;
  feature_id: string;
  unlocked_at: string;
  created_at: string;
}

export interface FeatureWithUnlockStatus extends AppFeature {
  isUnlocked: boolean;
  unlockedAt?: string;
}
