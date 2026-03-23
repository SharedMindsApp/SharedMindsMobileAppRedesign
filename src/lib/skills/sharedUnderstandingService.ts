/**
 * Shared Understanding Service
 * 
 * Manages explicit agreements that allow people to observe and understand
 * another person's skills without control, judgment, or optimization.
 * 
 * PRINCIPLES:
 * - Observation ≠ Evaluation
 * - Support ≠ Direction
 * - Visibility ≠ Control
 * - Skills remain owned by the individual
 * - No role may imply improvement, performance, or deficiency
 * - Everything is explicit, consent-based, and revocable
 */

import { supabase } from '../supabase';

export type SharedUnderstandingRole =
  | 'observer'
  | 'supporter'
  | 'guide'
  | 'educator'
  | 'mentor'
  | 'coach'
  | 'therapist'
  | 'parent'
  | 'partner'
  | 'peer'
  | 'manager'
  | 'leader'
  | 'student'
  | 'self'
  | 'custom';

export type SharedUnderstandingScope =
  | 'skills_only'
  | 'specific_contexts'
  | 'specific_skills';

export type SharedUnderstandingInteraction =
  | 'view_only'
  | 'reflect'
  | 'ask_questions';

export type SharedUnderstandingVisibility =
  | 'overview'
  | 'detailed';

export interface SharedUnderstandingAgreement {
  id: string;
  owner_user_id: string;
  viewer_user_id: string;
  role: SharedUnderstandingRole;
  role_label?: string | null;
  scope: SharedUnderstandingScope;
  context_ids?: string[] | null;
  skill_ids?: string[] | null;
  allowed_interactions: SharedUnderstandingInteraction[];
  visibility_level: SharedUnderstandingVisibility;
  created_at: string;
  updated_at: string;
  revoked_at?: string | null;
}

export interface CreateAgreementInput {
  owner_user_id: string;
  viewer_user_id: string;
  role: SharedUnderstandingRole;
  role_label?: string;
  scope?: SharedUnderstandingScope;
  context_ids?: string[];
  skill_ids?: string[];
  allowed_interactions?: SharedUnderstandingInteraction[];
  visibility_level?: SharedUnderstandingVisibility;
}

export interface ExternalReflection {
  id: string;
  skill_id: string;
  context_id?: string | null;
  author_user_id: string;
  agreement_id: string;
  reflection_text: string;
  reflection_type: 'observation' | 'question' | 'reflection';
  created_at: string;
  updated_at: string;
  dismissed_at?: string | null;
}

export interface CreateReflectionInput {
  skill_id: string;
  context_id?: string;
  author_user_id: string;
  agreement_id: string;
  reflection_text: string;
  reflection_type?: 'observation' | 'question' | 'reflection';
}

export const sharedUnderstandingService = {
  /**
   * Get all active agreements for a skill owner
   */
  async getAgreementsForOwner(ownerUserId: string): Promise<SharedUnderstandingAgreement[]> {
    const { data, error } = await supabase
      .from('shared_understanding_agreements')
      .select('*')
      .eq('owner_user_id', ownerUserId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SharedUnderstandingAgreement[];
  },

  /**
   * Get all active agreements where user is a viewer
   */
  async getAgreementsForViewer(viewerUserId: string): Promise<SharedUnderstandingAgreement[]> {
    const { data, error } = await supabase
      .from('shared_understanding_agreements')
      .select('*')
      .eq('viewer_user_id', viewerUserId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SharedUnderstandingAgreement[];
  },

  /**
   * Get agreement between owner and viewer
   */
  async getAgreement(
    ownerUserId: string,
    viewerUserId: string,
    role?: SharedUnderstandingRole
  ): Promise<SharedUnderstandingAgreement | null> {
    let query = supabase
      .from('shared_understanding_agreements')
      .select('*')
      .eq('owner_user_id', ownerUserId)
      .eq('viewer_user_id', viewerUserId)
      .is('revoked_at', null);

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data as SharedUnderstandingAgreement | null;
  },

  /**
   * Check if viewer has access to a specific skill/context
   */
  async hasAccess(
    ownerUserId: string,
    viewerUserId: string,
    skillId: string,
    contextId?: string
  ): Promise<{ hasAccess: boolean; agreement?: SharedUnderstandingAgreement }> {
    const agreements = await this.getAgreementsForViewer(viewerUserId);
    
    const relevantAgreement = agreements.find(agreement => {
      if (agreement.owner_user_id !== ownerUserId) return false;
      
      // Check scope
      if (agreement.scope === 'skills_only') {
        return true; // Access to all skills
      } else if (agreement.scope === 'specific_skills') {
        return agreement.skill_ids?.includes(skillId) ?? false;
      } else if (agreement.scope === 'specific_contexts') {
        if (!contextId) return false;
        return agreement.context_ids?.includes(contextId) ?? false;
      }
      
      return false;
    });

    return {
      hasAccess: !!relevantAgreement,
      agreement: relevantAgreement,
    };
  },

  /**
   * Create a new agreement
   */
  async createAgreement(input: CreateAgreementInput): Promise<SharedUnderstandingAgreement> {
    const { data, error } = await supabase
      .from('shared_understanding_agreements')
      .insert([{
        owner_user_id: input.owner_user_id,
        viewer_user_id: input.viewer_user_id,
        role: input.role,
        role_label: input.role_label || null,
        scope: input.scope || 'skills_only',
        context_ids: input.context_ids || [],
        skill_ids: input.skill_ids || [],
        allowed_interactions: input.allowed_interactions || ['view_only'],
        visibility_level: input.visibility_level || 'overview',
      }])
      .select()
      .single();

    if (error) throw error;
    return data as SharedUnderstandingAgreement;
  },

  /**
   * Update an agreement
   */
  async updateAgreement(
    agreementId: string,
    updates: Partial<Omit<CreateAgreementInput, 'owner_user_id' | 'viewer_user_id'>>
  ): Promise<SharedUnderstandingAgreement> {
    const { data, error } = await supabase
      .from('shared_understanding_agreements')
      .update(updates)
      .eq('id', agreementId)
      .select()
      .single();

    if (error) throw error;
    return data as SharedUnderstandingAgreement;
  },

  /**
   * Revoke an agreement
   */
  async revokeAgreement(agreementId: string): Promise<void> {
    const { error } = await supabase
      .from('shared_understanding_agreements')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', agreementId);

    if (error) throw error;
  },

  /**
   * Get external reflections for a skill
   */
  async getReflectionsForSkill(
    skillId: string,
    contextId?: string
  ): Promise<ExternalReflection[]> {
    let query = supabase
      .from('skill_external_reflections')
      .select('*')
      .eq('skill_id', skillId)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false });

    if (contextId) {
      query = query.eq('context_id', contextId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as ExternalReflection[];
  },

  /**
   * Create an external reflection
   */
  async createReflection(input: CreateReflectionInput): Promise<ExternalReflection> {
    // Safety check: verify agreement allows reflection
    const agreement = await supabase
      .from('shared_understanding_agreements')
      .select('*')
      .eq('id', input.agreement_id)
      .is('revoked_at', null)
      .single();

    if (agreement.error || !agreement.data) {
      throw new Error('Agreement not found or revoked');
    }

    const allowedInteractions = agreement.data.allowed_interactions || [];
    if (!allowedInteractions.includes('reflect') && !allowedInteractions.includes('ask_questions')) {
      throw new Error('Agreement does not allow reflections');
    }

    const { data, error } = await supabase
      .from('skill_external_reflections')
      .insert([{
        skill_id: input.skill_id,
        context_id: input.context_id || null,
        author_user_id: input.author_user_id,
        agreement_id: input.agreement_id,
        reflection_text: input.reflection_text.trim(),
        reflection_type: input.reflection_type || 'observation',
      }])
      .select()
      .single();

    if (error) throw error;
    return data as ExternalReflection;
  },

  /**
   * Dismiss a reflection (owner only)
   */
  async dismissReflection(reflectionId: string): Promise<void> {
    const { error } = await supabase
      .from('skill_external_reflections')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', reflectionId);

    if (error) throw error;
  },
};






