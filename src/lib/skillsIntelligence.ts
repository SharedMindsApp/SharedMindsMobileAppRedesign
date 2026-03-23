import { supabase } from './supabase';

// ============================================================================
// SKILLS INTELLIGENCE LAYER
// ============================================================================
// Smart insights, momentum tracking, and evidence analysis
// Non-intrusive, explainable, and human-centered
// ============================================================================

// Types
export type SkillStatus = 'active' | 'background' | 'paused';
export type SkillMomentum = 'dormant' | 'emerging' | 'stabilising' | 'integrated';
export type EffortLevel = 'minimal' | 'moderate' | 'significant' | 'intense';
export type EvidenceType = 'journal' | 'project' | 'habit' | 'task' | 'learning_resource' | 'reflection' | 'feedback';
export type DifficultyFelt = 'easier_than_before' | 'about_the_same' | 'harder_than_expected' | 'surprisingly_easy' | 'blockers_encountered';
export type InsightType = 'confidence_gap' | 'usage_pattern' | 'correlated_growth' | 'dormant_skill' | 'capacity_impact' | 'consistency_trend';

export interface SkillEvidence {
  id: string;
  user_id: string;
  skill_id: string;
  evidence_type: EvidenceType;
  reference_id?: string;
  reference_data?: any;
  context_notes?: string;
  difficulty_felt?: DifficultyFelt;
  occurred_at: string;
  created_at: string;
}

export interface SkillInsight {
  id: string;
  user_id: string;
  skill_id: string;
  insight_type: InsightType;
  message: string;
  explanation: string;
  supporting_data?: any;
  is_dismissed: boolean;
  dismissed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PracticeLog {
  date: string;
  context: string;
  felt: string;
  notes?: string;
}

export interface CapacityContext {
  health?: 'low' | 'moderate' | 'good' | 'excellent';
  stress?: 'low' | 'moderate' | 'high' | 'overwhelming';
  workload?: 'light' | 'moderate' | 'heavy' | 'extreme';
  energy?: 'depleted' | 'low' | 'moderate' | 'high';
}

// ============================================================================
// EVIDENCE SERVICE
// ============================================================================

export const skillEvidenceService = {
  /**
   * Record skill usage/practice
   */
  async recordEvidence(evidence: Omit<SkillEvidence, 'id' | 'created_at'>): Promise<SkillEvidence> {
    const { data, error } = await supabase
      .from('skill_evidence')
      .insert([evidence])
      .select()
      .single();

    if (error) throw error;

    // Note: usage_count and last_used_at are updated by the caller
    // This service only creates the evidence record
    // The caller should handle user_skills updates to avoid race conditions

    return data as SkillEvidence;
  },

  /**
   * Get evidence for a skill
   */
  async getForSkill(userId: string, skillId: string, limit = 50): Promise<SkillEvidence[]> {
    const { data, error } = await supabase
      .from('skill_evidence')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as SkillEvidence[];
  },

  /**
   * Get recent evidence for analysis
   */
  async getRecentEvidence(userId: string, days = 30): Promise<SkillEvidence[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('skill_evidence')
      .select('*')
      .eq('user_id', userId)
      .gte('occurred_at', since.toISOString())
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SkillEvidence[];
  },

  /**
   * Delete evidence
   */
  async deleteEvidence(evidenceId: string): Promise<void> {
    const { error } = await supabase
      .from('skill_evidence')
      .delete()
      .eq('id', evidenceId);

    if (error) throw error;
  }
};

// ============================================================================
// MOMENTUM CALCULATOR
// ============================================================================

export const momentumCalculator = {
  /**
   * Calculate skill momentum based on evidence and context
   */
  async calculateMomentum(userId: string, skillId: string): Promise<SkillMomentum> {
    // Get evidence from last 60 days
    const evidence = await skillEvidenceService.getRecentEvidence(userId, 60);
    const skillEvidence = evidence.filter(e => e.skill_id === skillId);

    if (skillEvidence.length === 0) {
      return 'dormant';
    }

    // Get skill and context
    const { data: skill } = await supabase
      .from('user_skills')
      .select('*')
      .eq('id', skillId)
      .single();

    const { data: context } = await supabase
      .from('personal_skills_context')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .maybeSingle();

    // Calculate frequency (evidence per week)
    const daysSinceFirst = Math.max(1,
      (new Date().getTime() - new Date(skillEvidence[skillEvidence.length - 1].occurred_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const frequency = (skillEvidence.length / daysSinceFirst) * 7;

    // Calculate consistency (how evenly distributed)
    const consistency = this.calculateConsistency(skillEvidence);

    // Calculate recency (days since last use)
    const recency = (new Date().getTime() - new Date(skillEvidence[0].occurred_at).getTime()) / (1000 * 60 * 60 * 24);

    // Determine momentum
    if (recency > 30) {
      return 'dormant';
    } else if (frequency < 0.5 || consistency < 0.3) {
      return 'emerging';
    } else if (frequency >= 0.5 && frequency < 2 && consistency >= 0.3) {
      return 'stabilising';
    } else if (frequency >= 2 && consistency >= 0.5) {
      return 'integrated';
    }

    return 'stabilising';
  },

  /**
   * Calculate consistency score (0-1) based on evidence distribution
   */
  calculateConsistency(evidence: SkillEvidence[]): number {
    if (evidence.length < 2) return 0;

    // Calculate coefficient of variation in time gaps
    const timestamps = evidence.map(e => new Date(e.occurred_at).getTime()).sort();
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push(timestamps[i] - timestamps[i - 1]);
    }

    if (gaps.length === 0) return 0;

    const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - mean, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    // Convert CV to consistency score (lower CV = higher consistency)
    return Math.max(0, Math.min(1, 1 - (cv / 2)));
  },

  /**
   * Update momentum for all user skills
   */
  async updateAllMomentum(userId: string): Promise<void> {
    const { data: contexts } = await supabase
      .from('personal_skills_context')
      .select('skill_id')
      .eq('user_id', userId);

    if (!contexts) return;

    for (const ctx of contexts) {
      const momentum = await this.calculateMomentum(userId, ctx.skill_id);

      await supabase
        .from('personal_skills_context')
        .update({ momentum })
        .eq('user_id', userId)
        .eq('skill_id', ctx.skill_id);
    }
  }
};

// ============================================================================
// INSIGHTS GENERATOR (Smart but Calm)
// ============================================================================

export const insightsGenerator = {
  /**
   * Generate insights for a user's skills
   * Non-intrusive, explainable, no pressure
   */
  async generateInsights(userId: string): Promise<void> {
    // Get all skills with evidence
    const { data: skills } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', userId);

    if (!skills) return;

    // Clear expired insights
    await this.clearExpiredInsights(userId);

    for (const skill of skills) {
      await this.generateSkillInsights(userId, skill);
    }
  },

  /**
   * Generate insights for a specific skill
   */
  async generateSkillInsights(userId: string, skill: any): Promise<void> {
    const evidence = await skillEvidenceService.getForSkill(userId, skill.id, 100);

    const { data: context } = await supabase
      .from('personal_skills_context')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skill.id)
      .maybeSingle();

    // Insight 1: Confidence Gap
    if (evidence.length >= 10 && skill.confidence_level && skill.proficiency) {
      if (skill.confidence_level < skill.proficiency - 1) {
        await this.createInsight({
          user_id: userId,
          skill_id: skill.id,
          insight_type: 'confidence_gap',
          message: `You practise ${skill.name} often, but confidence remains lower than proficiency`,
          explanation: `You've logged ${evidence.length} instances of using this skill, suggesting regular practice. However, your self-reported confidence (${skill.confidence_level}/5) is notably lower than your proficiency level (${skill.proficiency}/5). Reflection might help identify what's holding back your confidence.`,
          supporting_data: { evidence_count: evidence.length, confidence: skill.confidence_level, proficiency: skill.proficiency }
        });
      }
    }

    // Insight 2: Usage Pattern (spikes during projects)
    if (evidence.length >= 5) {
      const projectEvidence = evidence.filter(e => e.evidence_type === 'project');
      if (projectEvidence.length > evidence.length * 0.7) {
        await this.createInsight({
          user_id: userId,
          skill_id: skill.id,
          insight_type: 'usage_pattern',
          message: `${skill.name} spikes during projects but fades afterward`,
          explanation: `${projectEvidence.length} of your ${evidence.length} skill uses were during projects, suggesting this skill activates in structured work but doesn't carry over to regular practice.`,
          supporting_data: { project_percentage: (projectEvidence.length / evidence.length * 100).toFixed(0) }
        });
      }
    }

    // Insight 3: Dormant Skill
    if (context?.status === 'active' && evidence.length > 0) {
      const daysSinceLastUse = (new Date().getTime() - new Date(evidence[0].occurred_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastUse > 21) {
        await this.createInsight({
          user_id: userId,
          skill_id: skill.id,
          insight_type: 'dormant_skill',
          message: `${skill.name} is marked active but hasn't been practised in ${Math.floor(daysSinceLastUse)} days`,
          explanation: `This skill is in your active development list, but there's no recent evidence of practice. Consider whether it's still a priority or needs to move to 'background'.`,
          supporting_data: { days_dormant: Math.floor(daysSinceLastUse) }
        });
      }
    }

    // Insight 4: Consistency Trend
    if (skill.consistency_score !== null && skill.consistency_score !== undefined) {
      if (skill.consistency_score < 0.3 && evidence.length >= 5) {
        await this.createInsight({
          user_id: userId,
          skill_id: skill.id,
          insight_type: 'consistency_trend',
          message: `${skill.name} practice is irregular`,
          explanation: `Your practice pattern shows high variability. This skill might benefit from more regular, smaller sessions rather than sporadic intense bursts.`,
          supporting_data: { consistency_score: skill.consistency_score }
        });
      }
    }
  },

  /**
   * Create an insight (if it doesn't already exist)
   */
  async createInsight(insight: Omit<SkillInsight, 'id' | 'is_dismissed' | 'created_at' | 'updated_at'>): Promise<void> {
    // Check if similar insight already exists and isn't dismissed
    const { data: existing } = await supabase
      .from('skill_insights')
      .select('id')
      .eq('user_id', insight.user_id)
      .eq('skill_id', insight.skill_id)
      .eq('insight_type', insight.insight_type)
      .eq('is_dismissed', false)
      .maybeSingle();

    if (existing) return; // Don't create duplicate

    // Set expiry (insights expire after 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase
      .from('skill_insights')
      .insert([{
        ...insight,
        expires_at: expiresAt.toISOString()
      }]);
  },

  /**
   * Get active insights for user
   */
  async getActiveInsights(userId: string): Promise<SkillInsight[]> {
    const { data, error } = await supabase
      .from('skill_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SkillInsight[];
  },

  /**
   * Get insights for a specific skill
   */
  async getSkillInsights(userId: string, skillId: string): Promise<SkillInsight[]> {
    const { data, error } = await supabase
      .from('skill_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .eq('is_dismissed', false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SkillInsight[];
  },

  /**
   * Dismiss an insight
   */
  async dismissInsight(insightId: string): Promise<void> {
    await supabase
      .from('skill_insights')
      .update({
        is_dismissed: true,
        dismissed_at: new Date().toISOString()
      })
      .eq('id', insightId);
  },

  /**
   * Clear expired insights
   */
  async clearExpiredInsights(userId: string): Promise<void> {
    await supabase
      .from('skill_insights')
      .delete()
      .eq('user_id', userId)
      .lt('expires_at', new Date().toISOString());
  }
};

// ============================================================================
// CAPACITY CONTEXT HELPERS
// ============================================================================

export const capacityHelpers = {
  /**
   * Update capacity context for a skill
   */
  async updateCapacity(userId: string, skillId: string, capacity: CapacityContext): Promise<void> {
    await supabase
      .from('user_skills')
      .update({
        capacity_context: capacity
      })
      .eq('id', skillId)
      .eq('user_id', userId);
  },

  /**
   * Get capacity context impact on skill performance
   */
  getCapacityImpact(capacity: CapacityContext): string {
    const scores = {
      health: { low: -2, moderate: -1, good: 0, excellent: 1 },
      stress: { low: 1, moderate: 0, high: -1, overwhelming: -2 },
      workload: { light: 0, moderate: 0, heavy: -1, extreme: -2 },
      energy: { depleted: -2, low: -1, moderate: 0, high: 1 }
    };

    let total = 0;
    let count = 0;

    if (capacity.health) {
      total += scores.health[capacity.health];
      count++;
    }
    if (capacity.stress) {
      total += scores.stress[capacity.stress];
      count++;
    }
    if (capacity.workload) {
      total += scores.workload[capacity.workload];
      count++;
    }
    if (capacity.energy) {
      total += scores.energy[capacity.energy];
      count++;
    }

    if (count === 0) return 'neutral';

    const average = total / count;

    if (average >= 0.5) return 'favorable';
    if (average <= -0.5) return 'challenging';
    return 'neutral';
  }
};
