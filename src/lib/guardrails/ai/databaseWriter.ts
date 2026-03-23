import { supabase } from '../../supabase';
import type { AIRoadmapStructure, AILogEntry } from './types';

interface TrackLookup {
  [trackName: string]: {
    trackId: string;
    subtracks: {
      [subtrackName: string]: string;
    };
  };
}

export async function writeGeneratedRoadmap(
  projectId: string,
  generationGroup: string,
  roadmapData: AIRoadmapStructure,
  tracks: Array<{
    trackId: string;
    trackName: string;
    subtracks: Array<{ subtrackId: string; subtrackName: string }>;
  }>
): Promise<Array<{ id: string; title: string; trackId?: string; subtrackId?: string }>> {
  const trackLookup = buildTrackLookup(tracks);
  const createdItems: Array<{ id: string; title: string; trackId?: string; subtrackId?: string }> = [];

  for (const section of roadmapData.roadmap) {
    const trackInfo = trackLookup[section.track];

    if (!trackInfo) {
      console.warn(`Track not found: ${section.track}`);
      continue;
    }

    const subtrackId = section.subtrack ? trackInfo.subtracks[section.subtrack] : undefined;

    let sectionRecord = await getOrCreateSection(projectId, trackInfo.trackId, section.track);

    if (!sectionRecord) {
      console.error(`Failed to create section for track: ${section.track}`);
      continue;
    }

    for (let i = 0; i < section.items.length; i++) {
      const item = section.items[i];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + i * 7);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const { data, error } = await supabase
        .from('roadmap_items')
        .insert({
          section_id: sectionRecord.id,
          track_id: trackInfo.trackId,
          subtrack_id: subtrackId,
          title: item.title,
          description: item.description,
          estimated_hours: item.estimated_hours,
          generation_group: generationGroup,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'not_started',
          order_index: i,
        })
        .select('id, title, track_id, subtrack_id')
        .single();

      if (error) {
        console.error('Error inserting roadmap item:', error);
        continue;
      }

      if (data) {
        createdItems.push({
          id: data.id,
          title: data.title,
          trackId: data.track_id || undefined,
          subtrackId: data.subtrack_id || undefined,
        });
      }
    }
  }

  return createdItems;
}

async function getOrCreateSection(
  projectId: string,
  trackId: string,
  trackName: string
): Promise<{ id: string } | null> {
  const { data: existingSections } = await supabase
    .from('roadmap_sections')
    .select('id')
    .eq('master_project_id', projectId)
    .limit(1)
    .maybeSingle();

  if (existingSections) {
    return existingSections;
  }

  const { data: newSection, error } = await supabase
    .from('roadmap_sections')
    .insert({
      master_project_id: projectId,
      title: `${trackName} Tasks`,
      order_index: 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating section:', error);
    return null;
  }

  return newSection;
}

function buildTrackLookup(
  tracks: Array<{
    trackId: string;
    trackName: string;
    subtracks: Array<{ subtrackId: string; subtrackName: string }>;
  }>
): TrackLookup {
  const lookup: TrackLookup = {};

  for (const track of tracks) {
    const subtracksMap: { [name: string]: string } = {};

    for (const subtrack of track.subtracks) {
      subtracksMap[subtrack.subtrackName] = subtrack.subtrackId;
    }

    lookup[track.trackName] = {
      trackId: track.trackId,
      subtracks: subtracksMap,
    };
  }

  return lookup;
}

export async function logAIGeneration(log: AILogEntry): Promise<void> {
  const { error } = await supabase.from('ai_logs').insert({
    master_project_id: log.master_project_id,
    generation_group: log.generation_group,
    model: log.model,
    prompt: log.prompt,
    output: log.output,
    error: log.error,
    tokens_used: log.tokens_used || 0,
  });

  if (error) {
    console.error('Failed to log AI generation:', error);
  }
}

export async function checkExistingGeneration(
  projectId: string
): Promise<{ exists: boolean; generationGroup?: string }> {
  const { data } = await supabase
    .from('roadmap_items')
    .select('generation_group')
    .eq('section_id', projectId)
    .not('generation_group', 'is', null)
    .limit(1)
    .maybeSingle();

  if (data?.generation_group) {
    return { exists: true, generationGroup: data.generation_group };
  }

  return { exists: false };
}
