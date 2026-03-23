/**
 * Stage 2.1: Reflection Layer Service
 *
 * This service provides CRUD operations for user-authored reflections.
 *
 * CRITICAL RULES:
 * - Reflections are user-owned (write, read, edit, delete)
 * - System NEVER interprets reflection content
 * - NO sentiment analysis, NO NLP, NO AI
 * - NO feeding into signals or automation
 * - Optional (never required)
 * - Available even when Safe Mode is ON
 *
 * PUBLIC API:
 * - createReflection() - Write new reflection
 * - getReflections() - Read own reflections
 * - getReflection() - Read specific reflection
 * - updateReflection() - Edit reflection
 * - deleteReflection() - Delete reflection (soft delete)
 * - getReflectionStats() - Basic stats (count only, NO analysis)
 */

import { supabase } from '../supabase';
import type {
  ReflectionEntry,
  CreateReflectionOptions,
  UpdateReflectionOptions,
  GetReflectionsOptions,
  ReflectionStats,
} from './stage2_1-types';

const STAGE_2_1_ERROR_PREFIX = '[Stage 2.1 Reflection Layer Error]';

export class Stage2_1ReflectionService {
  /**
   * Create new reflection
   */
  async createReflection(
    userId: string,
    options: CreateReflectionOptions
  ): Promise<ReflectionEntry> {
    const {
      content,
      linkedSignalId,
      linkedProjectId,
      linkedSpaceId,
      userTags = [],
      selfReportedContext = {},
    } = options;

    if (!content || content.trim().length === 0) {
      throw new Error(`${STAGE_2_1_ERROR_PREFIX} Reflection content cannot be empty`);
    }

    const { data, error } = await supabase
      .from('reflection_entries')
      .insert({
        user_id: userId,
        content: content.trim(),
        linked_signal_id: linkedSignalId ?? null,
        linked_project_id: linkedProjectId ?? null,
        linked_space_id: linkedSpaceId ?? null,
        user_tags: userTags,
        self_reported_context: selfReportedContext,
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        `${STAGE_2_1_ERROR_PREFIX} Failed to create reflection: ${error.message}`
      );
    }

    return data as ReflectionEntry;
  }

  /**
   * Get reflections for user
   */
  async getReflections(
    userId: string,
    options: GetReflectionsOptions = {}
  ): Promise<ReflectionEntry[]> {
    const {
      linkedSignalId,
      linkedProjectId,
      linkedSpaceId,
      hasTag,
      limit = 50,
      offset = 0,
    } = options;

    let query = supabase
      .from('reflection_entries')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (linkedSignalId) {
      query = query.eq('linked_signal_id', linkedSignalId);
    }

    if (linkedProjectId) {
      query = query.eq('linked_project_id', linkedProjectId);
    }

    if (linkedSpaceId) {
      query = query.eq('linked_space_id', linkedSpaceId);
    }

    if (hasTag) {
      query = query.contains('user_tags', [hasTag]);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `${STAGE_2_1_ERROR_PREFIX} Failed to get reflections: ${error.message}`
      );
    }

    return (data ?? []) as ReflectionEntry[];
  }

  /**
   * Get specific reflection
   */
  async getReflection(userId: string, reflectionId: string): Promise<ReflectionEntry | null> {
    const { data, error } = await supabase
      .from('reflection_entries')
      .select('*')
      .eq('id', reflectionId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(
        `${STAGE_2_1_ERROR_PREFIX} Failed to get reflection: ${error.message}`
      );
    }

    return data as ReflectionEntry | null;
  }

  /**
   * Update reflection
   */
  async updateReflection(
    userId: string,
    reflectionId: string,
    options: UpdateReflectionOptions
  ): Promise<ReflectionEntry> {
    const { content, userTags, selfReportedContext } = options;

    const updateData: any = {};

    if (content !== undefined) {
      if (content.trim().length === 0) {
        throw new Error(`${STAGE_2_1_ERROR_PREFIX} Reflection content cannot be empty`);
      }
      updateData.content = content.trim();
    }

    if (userTags !== undefined) {
      updateData.user_tags = userTags;
    }

    if (selfReportedContext !== undefined) {
      updateData.self_reported_context = selfReportedContext;
    }

    const { data, error } = await supabase
      .from('reflection_entries')
      .update(updateData)
      .eq('id', reflectionId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw new Error(
        `${STAGE_2_1_ERROR_PREFIX} Failed to update reflection: ${error.message}`
      );
    }

    return data as ReflectionEntry;
  }

  /**
   * Delete reflection (soft delete)
   */
  async deleteReflection(userId: string, reflectionId: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_reflection', {
      p_reflection_id: reflectionId,
      p_user_id: userId,
    });

    if (error) {
      throw new Error(
        `${STAGE_2_1_ERROR_PREFIX} Failed to delete reflection: ${error.message}`
      );
    }
  }

  /**
   * Get basic stats (count only, NO analysis)
   */
  async getReflectionStats(userId: string): Promise<ReflectionStats> {
    const { data, error } = await supabase
      .from('reflection_entries')
      .select('id, created_at, linked_signal_id')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(
        `${STAGE_2_1_ERROR_PREFIX} Failed to get reflection stats: ${error.message}`
      );
    }

    const reflections = data ?? [];
    const dates = reflections
      .map((r) => r.created_at)
      .filter(Boolean)
      .sort();

    return {
      total_count: reflections.length,
      earliest_date: dates.length > 0 ? dates[0] : null,
      latest_date: dates.length > 0 ? dates[dates.length - 1] : null,
      has_linked: reflections.filter((r) => r.linked_signal_id).length,
      has_unlinked: reflections.filter((r) => !r.linked_signal_id).length,
    };
  }

  /**
   * Get all unique user tags
   */
  async getUserTags(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('reflection_entries')
      .select('user_tags')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      console.error(`${STAGE_2_1_ERROR_PREFIX} Failed to get user tags:`, error);
      return [];
    }

    const allTags = new Set<string>();
    for (const entry of data ?? []) {
      for (const tag of entry.user_tags ?? []) {
        allTags.add(tag);
      }
    }

    return Array.from(allTags).sort();
  }
}

export const stage2_1Reflection = new Stage2_1ReflectionService();

// Export convenience functions
export {
  createReflection,
  getReflections,
  getReflection,
  updateReflection,
  deleteReflection,
  getReflectionStats,
  getUserTags,
};

async function createReflection(
  userId: string,
  options: CreateReflectionOptions
): Promise<ReflectionEntry> {
  return stage2_1Reflection.createReflection(userId, options);
}

async function getReflections(
  userId: string,
  options?: GetReflectionsOptions
): Promise<ReflectionEntry[]> {
  return stage2_1Reflection.getReflections(userId, options);
}

async function getReflection(
  userId: string,
  reflectionId: string
): Promise<ReflectionEntry | null> {
  return stage2_1Reflection.getReflection(userId, reflectionId);
}

async function updateReflection(
  userId: string,
  reflectionId: string,
  options: UpdateReflectionOptions
): Promise<ReflectionEntry> {
  return stage2_1Reflection.updateReflection(userId, reflectionId, options);
}

async function deleteReflection(userId: string, reflectionId: string): Promise<void> {
  return stage2_1Reflection.deleteReflection(userId, reflectionId);
}

async function getReflectionStats(userId: string): Promise<ReflectionStats> {
  return stage2_1Reflection.getReflectionStats(userId);
}

async function getUserTags(userId: string): Promise<string[]> {
  return stage2_1Reflection.getUserTags(userId);
}
