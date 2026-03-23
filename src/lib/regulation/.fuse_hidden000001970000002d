import { supabase } from '../supabase';
import type {
  DailyAlignment,
  DailyAlignmentBlock,
  DailyAlignmentMicrotask,
  AlignmentBlockWithMicrotasks,
  DailyAlignmentWithBlocks,
  AlignmentBlockItemType,
  WorkItem,
  DailyAlignmentSettings,
  ProjectWithTracks,
  TrackWithSubtracks,
} from './dailyAlignmentTypes';

export async function getDailyAlignmentEnabled(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('daily_alignment_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.daily_alignment_enabled ?? true;
  } catch (error) {
    console.error('[DailyAlignment] Error getting enabled state:', error);
    return true;
  }
}

export async function setDailyAlignmentEnabled(userId: string, enabled: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ daily_alignment_enabled: enabled })
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('[DailyAlignment] Error setting enabled state:', error);
    return false;
  }
}

export async function getTodaysAlignment(userId: string): Promise<DailyAlignmentWithBlocks | null> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: alignment, error: alignmentError } = await supabase
      .from('daily_alignments')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (alignmentError) throw alignmentError;
    if (!alignment) return null;

    const { data: blocks, error: blocksError } = await supabase
      .from('daily_alignment_blocks')
      .select('*')
      .eq('alignment_id', alignment.id)
      .order('order_index', { ascending: true });

    if (blocksError) throw blocksError;

    const blocksWithMicrotasks: AlignmentBlockWithMicrotasks[] = [];

    for (const block of blocks || []) {
      const { data: microtasks, error: microtasksError } = await supabase
        .from('daily_alignment_microtasks')
        .select('*')
        .eq('block_id', block.id)
        .order('order_index', { ascending: true });

      if (microtasksError) throw microtasksError;

      blocksWithMicrotasks.push({
        ...block,
        microtasks: microtasks || [],
      });
    }

    return {
      ...alignment,
      blocks: blocksWithMicrotasks,
    };
  } catch (error) {
    console.error('[DailyAlignment] Error getting today\'s alignment:', error);
    return null;
  }
}

export async function createTodaysAlignment(userId: string): Promise<DailyAlignment | null> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // First check if alignment already exists
    const { data: existing } = await supabase
      .from('daily_alignments')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // Try to create new alignment
    const { data, error } = await supabase
      .from('daily_alignments')
      .insert({
        user_id: userId,
        date: today,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (409 conflict) - alignment was created by another request
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        // Fetch the existing alignment that was just created
        const { data: existingAfterConflict } = await supabase
          .from('daily_alignments')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle();
        
        if (existingAfterConflict) {
          return existingAfterConflict;
        }
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('[DailyAlignment] Error creating alignment:', error);
    // Last resort: try to fetch existing alignment
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('daily_alignments')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();
      return existing || null;
    } catch {
      return null;
    }
  }
}

export async function dismissAlignment(alignmentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('daily_alignments')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', alignmentId);

    return !error;
  } catch (error) {
    console.error('[DailyAlignment] Error dismissing alignment:', error);
    return false;
  }
}

export async function hideAlignment(alignmentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('daily_alignments')
      .update({
        status: 'hidden',
      })
      .eq('id', alignmentId);

    return !error;
  } catch (error) {
    console.error('[DailyAlignment] Error hiding alignment:', error);
    return false;
  }
}

export async function completeAlignment(alignmentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('daily_alignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', alignmentId);

    return !error;
  } catch (error) {
    console.error('[DailyAlignment] Error completing alignment:', error);
    return false;
  }
}

export async function addBlock(
  alignmentId: string,
  itemType: AlignmentBlockItemType,
  itemId: string,
  itemTitle: string,
  startTime: string,
  durationMinutes: number
): Promise<DailyAlignmentBlock | null> {
  try {
    const { data: existingBlocks } = await supabase
      .from('daily_alignment_blocks')
      .select('order_index')
      .eq('alignment_id', alignmentId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextIndex = existingBlocks && existingBlocks.length > 0
      ? existingBlocks[0].order_index + 1
      : 0;

    const { data, error } = await supabase
      .from('daily_alignment_blocks')
      .insert({
        alignment_id: alignmentId,
        item_type: itemType,
        item_id: itemId,
        item_title: itemTitle,
        start_time: startTime,
        duration_minutes: durationMinutes,
        order_index: nextIndex,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[DailyAlignment] Error adding block:', error);
    return null;
  }
}

export async function updateBlock(
  blockId: string,
  updates: Partial<Pick<DailyAlignmentBlock, 'start_time' | 'duration_minutes' | 'order_index'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('daily_alignment_blocks')
      .update(updates)
      .eq('id', blockId);

    return !error;
  } catch (error) {
    console.error('[DailyAlignment] Error updating block:', error);
    return false;
  }
}

export async function deleteBlock(blockId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('daily_alignment_blocks')
      .delete()
      .eq('id', blockId);

    return !error;
  } catch (error) {
    console.error('[DailyAlignment] Error deleting block:', error);
    return false;
  }
}

export async function addMicrotask(
  blockId: string,
  description: string
): Promise<DailyAlignmentMicrotask | null> {
  try {
    const { data: existingMicrotasks } = await supabase
      .from('daily_alignment_microtasks')
      .select('order_index')
      .eq('block_id', blockId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextIndex = existingMicrotasks && existingMicrotasks.length > 0
      ? existingMicrotasks[0].order_index + 1
      : 0;

    const { data, error } = await supabase
      .from('daily_alignment_microtasks')
      .insert({
        block_id: blockId,
        description,
        order_index: nextIndex,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[DailyAlignment] Error adding microtask:', error);
    return null;
  }
}

export async function toggleMicrotask(
  microtaskId: string,
  isCompleted: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('daily_alignment_microtasks')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', microtaskId);

    return !error;
  } catch (error) {
    console.error('[DailyAlignment] Error toggling microtask:', error);
    return false;
  }
}

export async function updateMicrotask(
  microtaskId: string,
  description: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('daily_alignment_microtasks')
      .update({ description })
      .eq('id', microtaskId);

    return !error;
  } catch (error) {
    console.error('[DailyAlignment] Error updating microtask:', error);
    return false;
  }
}

export async function deleteMicrotask(microtaskId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('daily_alignment_microtasks')
      .delete()
      .eq('id', microtaskId);

    return !error;
  } catch (error) {
    console.error('[DailyAlignment] Error deleting microtask:', error);
    return false;
  }
}

export async function getAvailableWorkItems(userId: string): Promise<WorkItem[]> {
  try {
    const items: WorkItem[] = [];

    const { data: projects } = await supabase
      .from('master_projects')
      .select('id, name')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('name');

    if (projects) {
      for (const project of projects) {
        items.push({
          id: project.id,
          type: 'project',
          title: project.name,
          projectName: project.name,
        });

        const { data: tracks } = await supabase
          .from('guardrails_tracks')
          .select('id, name')
          .eq('master_project_id', project.id)
          .is('deleted_at', null)
          .order('name');

        if (tracks) {
          for (const track of tracks) {
            items.push({
              id: track.id,
              type: 'track',
              title: track.name,
              projectName: project.name,
              trackName: track.name,
            });

            const { data: subtracks } = await supabase
              .from('guardrails_tracks')
              .select('id, name')
              .eq('parent_track_id', track.id)
              .is('deleted_at', null)
              .order('name');

            if (subtracks) {
              for (const subtrack of subtracks) {
                items.push({
                  id: subtrack.id,
                  type: 'subtrack',
                  title: subtrack.name,
                  projectName: project.name,
                  trackName: track.name,
                });
              }
            }
          }
        }
      }
    }

    const { data: roadmapItems } = await supabase
      .from('roadmap_items')
      .select('id, title, roadmap_sections(guardrails_tracks(name, master_projects(name)))')
      .order('title')
      .limit(50);

    if (roadmapItems) {
      for (const item of roadmapItems as any[]) {
        const section = item.roadmap_sections;
        const track = section?.guardrails_tracks;
        const project = track?.master_projects;

        items.push({
          id: item.id,
          type: 'task',
          title: item.title,
          projectName: project?.name,
          trackName: track?.name,
        });
      }
    }

    return items;
  } catch (error) {
    console.error('[DailyAlignment] Error getting work items:', error);
    return [];
  }
}

export async function getHierarchicalWorkItems(userId: string): Promise<ProjectWithTracks[]> {
  try {
    const projects: ProjectWithTracks[] = [];

    const { data: projectsData } = await supabase
      .from('master_projects')
      .select('id, name')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('name');

    if (!projectsData) return [];

    for (const project of projectsData) {
      const tracks: TrackWithSubtracks[] = [];

      const { data: tracksData } = await supabase
        .from('guardrails_tracks')
        .select('id, name')
        .eq('master_project_id', project.id)
        .order('name');

      if (tracksData) {
        for (const track of tracksData) {
          const { data: subtracksData } = await supabase
            .from('guardrails_tracks')
            .select('id, name')
            .eq('parent_track_id', track.id)
            .is('deleted_at', null)
            .order('ordering_index');

          const { data: tasksData } = await supabase
            .from('roadmap_items')
            .select('id, title, section_id')
            .eq('section_id', track.id)
            .limit(20);

          tracks.push({
            id: track.id,
            name: track.name,
            projectId: project.id,
            projectName: project.name,
            subtracks: (subtracksData || []).map(st => ({
              id: st.id,
              name: st.name,
              trackId: track.id,
              trackName: track.name,
              projectName: project.name,
            })),
            tasks: (tasksData || []).map(task => ({
              id: task.id,
              title: task.title,
              trackId: track.id,
              trackName: track.name,
              projectName: project.name,
            })),
          });
        }
      }

      projects.push({
        id: project.id,
        name: project.name,
        tracks,
      });
    }

    return projects;
  } catch (error) {
    console.error('[DailyAlignment] Error getting hierarchical work items:', error);
    return [];
  }
}

export async function getAlignmentSettings(userId: string): Promise<DailyAlignmentSettings | null> {
  try {
    const { data, error } = await supabase
      .from('daily_alignment_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const defaultSettings = await createDefaultSettings(userId);
      return defaultSettings;
    }

    return data;
  } catch (error) {
    console.error('[DailyAlignment] Error getting settings:', error);
    return null;
  }
}

async function createDefaultSettings(userId: string): Promise<DailyAlignmentSettings | null> {
  try {
    const { data: existing } = await supabase
      .from('daily_alignment_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('daily_alignment_settings')
      .insert({
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[DailyAlignment] Error creating default settings:', error);
    return null;
  }
}

export async function updateAlignmentSettings(
  userId: string,
  updates: Partial<Omit<DailyAlignmentSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('daily_alignment_settings')
      .update(updates)
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('[DailyAlignment] Error updating settings:', error);
    return false;
  }
}
