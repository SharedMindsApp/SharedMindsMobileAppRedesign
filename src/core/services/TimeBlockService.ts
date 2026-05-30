/**
 * TimeBlockService — CRUD for daily_time_blocks.
 *
 * A time block is a named, typed slot in the user's day (e.g. "Deep work"
 * at 09:00 for 90 min). Powers the TodayPlannerCard and WeekPlannerCard.
 */

import { supabase } from '../../lib/supabase';

export type BlockType = 'focus' | 'deep' | 'admin' | 'break' | 'personal';

/** A session mode a block segment runs as. */
export type SegmentMode = 'group' | 'solo' | 'match';

/** One queued session within a block (Group → Solo → Match …). */
export interface BlockSegment {
  id: string;
  block_id: string;
  user_id: string;
  sort_order: number;
  mode: SegmentMode;
  duration_mins: number;
  status: 'planned' | 'active' | 'done' | 'skipped';
  session_id: string | null;
  created_at: string;
}

export interface TimeBlock {
  id: string;
  user_id: string;
  block_date: string;        // YYYY-MM-DD
  start_time: string;        // HH:MM (24-hour)
  duration_mins: number;
  title: string;
  block_type: BlockType;
  /** Project this block is dedicated to (tasks inside are scoped to it). Null = general. */
  project_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const TimeBlockService = {
  async getBlocksForDate(date: string): Promise<TimeBlock[]> {
    const { data, error } = await supabase
      .from('daily_time_blocks')
      .select('*')
      .eq('block_date', date)
      .order('start_time', { ascending: true });
    if (error) throw error;
    return (data ?? []) as TimeBlock[];
  },

  async getBlocksForDateRange(from: string, to: string): Promise<TimeBlock[]> {
    const { data, error } = await supabase
      .from('daily_time_blocks')
      .select('*')
      .gte('block_date', from)
      .lte('block_date', to)
      .order('block_date', { ascending: true })
      .order('start_time', { ascending: true });
    if (error) throw error;
    return (data ?? []) as TimeBlock[];
  },

  async addBlock(input: {
    blockDate: string;
    startTime: string;
    durationMins: number;
    title: string;
    blockType?: BlockType;
    projectId?: string | null;
  }): Promise<TimeBlock> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('daily_time_blocks')
      .insert({
        user_id: user.id,
        block_date: input.blockDate,
        start_time: input.startTime,
        duration_mins: input.durationMins,
        title: input.title.trim(),
        block_type: input.blockType ?? 'focus',
        project_id: input.projectId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TimeBlock;
  },

  async updateBlock(
    blockId: string,
    patch: Partial<Pick<TimeBlock, 'title' | 'start_time' | 'duration_mins' | 'block_type' | 'completed_at' | 'project_id'>>,
  ): Promise<TimeBlock> {
    const { data, error } = await supabase
      .from('daily_time_blocks')
      .update(patch)
      .eq('id', blockId)
      .select()
      .single();
    if (error) throw error;
    return data as TimeBlock;
  },

  async deleteBlock(blockId: string): Promise<void> {
    const { error } = await supabase
      .from('daily_time_blocks')
      .delete()
      .eq('id', blockId);
    if (error) throw error;
  },

  async toggleBlockComplete(block: TimeBlock): Promise<TimeBlock> {
    return TimeBlockService.updateBlock(block.id, {
      completed_at: block.completed_at ? null : new Date().toISOString(),
    });
  },

  // ── Tasks attached to blocks ───────────────────────────────────────

  /** Map of block id → attached task ids, for a set of blocks. */
  async fetchBlockTaskIds(blockIds: string[]): Promise<Record<string, string[]>> {
    if (blockIds.length === 0) return {};
    const { data, error } = await supabase
      .from('time_block_tasks')
      .select('block_id, task_id, sort_order')
      .in('block_id', blockIds)
      .order('sort_order', { ascending: true });
    if (error || !data) return {};
    const out: Record<string, string[]> = {};
    for (const r of data as any[]) (out[r.block_id] ??= []).push(r.task_id);
    return out;
  },

  async addTaskToBlock(blockId: string, taskId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('time_block_tasks')
      .upsert({ block_id: blockId, task_id: taskId, user_id: user.id }, { onConflict: 'block_id,task_id' });
    if (error) throw error;
  },

  async removeTaskFromBlock(blockId: string, taskId: string): Promise<void> {
    const { error } = await supabase
      .from('time_block_tasks')
      .delete()
      .eq('block_id', blockId)
      .eq('task_id', taskId);
    if (error) throw error;
  },

  // ── Segments (multiple sessions queued within a block) ─────────────

  async fetchBlockSegments(blockIds: string[]): Promise<Record<string, BlockSegment[]>> {
    if (blockIds.length === 0) return {};
    const { data, error } = await supabase
      .from('time_block_segments')
      .select('*')
      .in('block_id', blockIds)
      .order('sort_order', { ascending: true });
    if (error || !data) return {};
    const out: Record<string, BlockSegment[]> = {};
    for (const r of data as BlockSegment[]) (out[r.block_id] ??= []).push(r);
    return out;
  },

  async addSegment(blockId: string, mode: SegmentMode, durationMins: number): Promise<BlockSegment | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { count } = await supabase
      .from('time_block_segments')
      .select('id', { count: 'exact', head: true })
      .eq('block_id', blockId);
    const { data, error } = await supabase
      .from('time_block_segments')
      .insert({ block_id: blockId, user_id: user.id, mode, duration_mins: durationMins, sort_order: count ?? 0 })
      .select()
      .single();
    if (error) throw error;
    return data as BlockSegment;
  },

  async removeSegment(id: string): Promise<void> {
    const { error } = await supabase.from('time_block_segments').delete().eq('id', id);
    if (error) throw error;
  },

  async reorderSegments(orderedIds: string[]): Promise<void> {
    await Promise.all(orderedIds.map((id, i) =>
      supabase.from('time_block_segments').update({ sort_order: i }).eq('id', id)));
  },
};
