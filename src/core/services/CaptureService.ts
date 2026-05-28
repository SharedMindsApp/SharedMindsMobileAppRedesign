/**
 * CaptureService — the distraction "parking lot".
 *
 * Captures are quick text notes dropped during a session/quick timer. They
 * stay "open" (resolved_at null) until triaged: either converted into a task
 * (promoted_task_id set) or discarded (deleted). Open captures surface in the
 * debrief and in a persistent parking-lot inbox.
 */

import { supabase } from '../../lib/supabase';
import { TaskService } from './TaskService';

export interface SessionCapture {
  id: string;
  session_id: string | null;
  user_id: string;
  text: string;
  resolved_at: string | null;
  promoted_task_id: string | null;
  created_at: string;
}

export const CaptureService = {
  /** Park a thought. session_id ties it to the active session for the debrief. */
  async addCapture(sessionId: string | null, text: string): Promise<SessionCapture> {
    const clean = text.trim();
    if (!clean) throw new Error('Capture text required');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('session_captures')
      .insert({ session_id: sessionId, user_id: user.id, text: clean })
      .select()
      .single();
    if (error) {
      console.error('[CaptureService] addCapture failed:', error);
      throw error;
    }
    return data as SessionCapture;
  },

  /** This session's captures, newest first — for the debrief triage list. */
  async getCapturesForSession(sessionId: string): Promise<SessionCapture[]> {
    const { data, error } = await supabase
      .from('session_captures')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[CaptureService] getCapturesForSession failed:', error);
      return [];
    }
    return (data ?? []) as SessionCapture[];
  },

  /** All still-open captures (not yet triaged) — the parking-lot inbox. */
  async getOpenCaptures(): Promise<SessionCapture[]> {
    const { data, error } = await supabase
      .from('session_captures')
      .select('*')
      .is('resolved_at', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[CaptureService] getOpenCaptures failed:', error);
      return [];
    }
    return (data ?? []) as SessionCapture[];
  },

  /** Discard a parked item — it wasn't worth keeping. */
  async deleteCapture(id: string): Promise<void> {
    const { error } = await supabase.from('session_captures').delete().eq('id', id);
    if (error) {
      console.error('[CaptureService] deleteCapture failed:', error);
      throw error;
    }
  },

  /**
   * Convert a parked capture into a real (backlog) task in the given space,
   * then mark the capture resolved + linked. The new task lands unscheduled
   * so it shows up for a future session rather than today.
   */
  async convertToTask(capture: SessionCapture, spaceId: string, createdBy: string): Promise<void> {
    const task = await TaskService.createTask({
      space_id: spaceId,
      created_by: createdBy,
      title: capture.text.trim(),
      status: 'inbox',
      priority: 'medium',
      energy_level: 'medium',
      sort_order: 0,
    });
    const { error } = await supabase
      .from('session_captures')
      .update({ resolved_at: new Date().toISOString(), promoted_task_id: task.id })
      .eq('id', capture.id);
    if (error) console.warn('[CaptureService] convertToTask link failed:', error);
  },
};
