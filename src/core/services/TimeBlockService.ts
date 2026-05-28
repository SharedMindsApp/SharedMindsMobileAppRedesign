/**
 * TimeBlockService — CRUD for daily_time_blocks.
 *
 * A time block is a named, typed slot in the user's day (e.g. "Deep work"
 * at 09:00 for 90 min). Powers the TodayPlannerCard and WeekPlannerCard.
 */

import { supabase } from '../../lib/supabase';

export type BlockType = 'focus' | 'deep' | 'admin' | 'break' | 'personal';

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
};
