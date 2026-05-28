/**
 * TimeBlockTemplateService — CRUD for reusable weekly time-block templates,
 * plus `applyToWeek` which materialises a template into real daily_time_blocks
 * rows for a given week.
 *
 * day_of_week: 0 = Monday … 6 = Sunday (Monday-first, matches the planner).
 */

import { supabase } from '../../lib/supabase';
import type { BlockType } from './TimeBlockService';
import type { TimeBlockStarter } from '../../lib/timeBlockStarters';

export interface TimeBlockTemplate {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TimeBlockTemplateItem {
  id: string;
  template_id: string;
  day_of_week: number;       // 0=Mon … 6=Sun
  start_time: string;        // HH:MM
  duration_mins: number;
  title: string;
  block_type: BlockType;
  project_id: string | null;
  sort_order: number;
  created_at: string;
}

/** Local yyyy-mm-dd (no UTC drift). */
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const TimeBlockTemplateService = {
  async listTemplates(): Promise<TimeBlockTemplate[]> {
    const { data, error } = await supabase
      .from('time_block_templates')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as TimeBlockTemplate[];
  },

  async listItems(templateId: string): Promise<TimeBlockTemplateItem[]> {
    const { data, error } = await supabase
      .from('time_block_template_items')
      .select('*')
      .eq('template_id', templateId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    if (error) throw error;
    return (data ?? []) as TimeBlockTemplateItem[];
  },

  async createTemplate(name: string): Promise<TimeBlockTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('time_block_templates')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();
    if (error) throw error;
    return data as TimeBlockTemplate;
  },

  async renameTemplate(id: string, name: string): Promise<void> {
    const { error } = await supabase
      .from('time_block_templates')
      .update({ name: name.trim() })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase.from('time_block_templates').delete().eq('id', id);
    if (error) throw error;
  },

  async addItem(input: {
    templateId: string;
    dayOfWeek: number;
    startTime: string;
    durationMins: number;
    title: string;
    blockType?: BlockType;
    projectId?: string | null;
    sortOrder?: number;
  }): Promise<TimeBlockTemplateItem> {
    const { data, error } = await supabase
      .from('time_block_template_items')
      .insert({
        template_id:   input.templateId,
        day_of_week:   input.dayOfWeek,
        start_time:    input.startTime,
        duration_mins: input.durationMins,
        title:         input.title.trim(),
        block_type:    input.blockType ?? 'focus',
        project_id:    input.projectId ?? null,
        sort_order:    input.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TimeBlockTemplateItem;
  },

  async updateItem(
    id: string,
    patch: Partial<Pick<TimeBlockTemplateItem, 'day_of_week' | 'start_time' | 'duration_mins' | 'title' | 'block_type' | 'project_id'>>,
  ): Promise<TimeBlockTemplateItem> {
    const { data, error } = await supabase
      .from('time_block_template_items')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as TimeBlockTemplateItem;
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase.from('time_block_template_items').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Adopt a starter preset into a new, fully-editable user template. The
   * starter's project *slots* (1–4) are resolved to real project ids via
   * `slotMap`; slots with no mapping (and break/general items) become
   * project-less. Returns the new template.
   */
  async adoptStarter(
    starter: TimeBlockStarter,
    name: string,
    slotMap: Record<number, string | null>,
  ): Promise<TimeBlockTemplate> {
    const tpl = await TimeBlockTemplateService.createTemplate(name);
    const rows = starter.items.map((it, i) => ({
      template_id:   tpl.id,
      day_of_week:   it.dayOfWeek,
      start_time:    it.startTime,
      duration_mins: it.durationMins,
      title:         it.title,
      block_type:    it.blockType,
      project_id:    it.slot != null ? (slotMap[it.slot] ?? null) : null,
      sort_order:    i,
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('time_block_template_items').insert(rows);
      if (error) throw error;
    }
    return tpl;
  },

  /**
   * Materialise a template's items into daily_time_blocks for the week
   * beginning `weekStart` (a Monday). Additive + idempotent: an item is
   * skipped when a block with the same date + start_time + title already
   * exists, so re-applying never duplicates and never clobbers manual blocks.
   * Returns the number of blocks created.
   */
  async applyToWeek(templateId: string, weekStart: Date): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const items = await TimeBlockTemplateService.listItems(templateId);
    if (items.length === 0) return 0;

    // Week date range (Mon → Sun).
    const dates = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return localISO(d);
    });

    // Existing blocks in the week, for dedup.
    const { data: existingRows } = await supabase
      .from('daily_time_blocks')
      .select('block_date, start_time, title')
      .gte('block_date', dates[0])
      .lte('block_date', dates[6]);
    const existing = new Set(
      (existingRows ?? []).map((b: any) => `${b.block_date}|${b.start_time}|${b.title}`),
    );

    const rows = items
      .map((it) => ({
        user_id:       user.id,
        block_date:    dates[Math.max(0, Math.min(6, it.day_of_week))],
        start_time:    it.start_time,
        duration_mins: it.duration_mins,
        title:         it.title,
        block_type:    it.block_type,
        project_id:    it.project_id,
      }))
      .filter((r) => {
        // start_time may come back as HH:MM:SS — normalise the dedup key.
        const t = r.start_time.slice(0, 5);
        return !existing.has(`${r.block_date}|${t}|${r.title}`)
            && !existing.has(`${r.block_date}|${r.start_time}|${r.title}`);
      });

    if (rows.length === 0) return 0;
    const { error } = await supabase.from('daily_time_blocks').insert(rows);
    if (error) throw error;
    return rows.length;
  },
};
