import type { ProjectStructureDraft } from './ai/wizardAISchemas';
import { createTrack } from './tracksHierarchy';
import { createNode } from './mindmesh';
import { createRoadmapItem } from './roadmapService';

export interface DraftCreationOptions {
  projectId: string;
  draft: ProjectStructureDraft;
  includeNodes: boolean;
  includeRoadmapItems: boolean;
  includeMilestones: boolean;
}

export interface DraftCreationResult {
  success: boolean;
  tracksCreated: number;
  subtracksCreated: number;
  nodesCreated: number;
  roadmapItemsCreated: number;
  milestonesCreated: number;
  errors: Array<{ entity: string; error: string }>;
}

export async function createProjectFromDraft(
  options: DraftCreationOptions
): Promise<DraftCreationResult> {
  const { projectId, draft, includeNodes, includeRoadmapItems, includeMilestones } = options;

  const result: DraftCreationResult = {
    success: true,
    tracksCreated: 0,
    subtracksCreated: 0,
    nodesCreated: 0,
    roadmapItemsCreated: 0,
    milestonesCreated: 0,
    errors: [],
  };

  const trackIdMap = new Map<string, string>();

  for (const trackDraft of draft.tracks) {
    try {
      const track = await createTrack({
        master_project_id: projectId,
        name: trackDraft.name,
        description: trackDraft.description || null,
        color: '#3b82f6',
      });

      if (track && track.id) {
        result.tracksCreated++;
        trackIdMap.set(trackDraft.name, track.id);

        if (trackDraft.subtracks && trackDraft.subtracks.length > 0) {
          for (const subtrackDraft of trackDraft.subtracks) {
            try {
              await createTrack({
                master_project_id: projectId,
                parent_track_id: track.id,
                name: subtrackDraft.name,
                description: subtrackDraft.description || null,
                color: '#10b981',
              });

              result.subtracksCreated++;
            } catch (error) {
              console.error('[WIZARD CREATE] Failed to create subtrack:', subtrackDraft.name, error);
              result.errors.push({
                entity: `Subtrack: ${subtrackDraft.name}`,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('[WIZARD CREATE] Failed to create track:', trackDraft.name, error);
      result.errors.push({
        entity: `Track: ${trackDraft.name}`,
        error: error instanceof Error ? error.message : String(error),
      });
      result.success = false;
    }
  }

  if (includeNodes && draft.mindMeshNodes && draft.mindMeshNodes.length > 0) {
    for (const nodeDraft of draft.mindMeshNodes) {
      try {
        await createNode({
          master_project_id: projectId,
          label: nodeDraft.label,
          node_type: 'concept',
          position_x: Math.random() * 800,
          position_y: Math.random() * 600,
        });

        result.nodesCreated++;
      } catch (error) {
        console.error('[WIZARD CREATE] Failed to create node:', nodeDraft.label, error);
        result.errors.push({
          entity: `Node: ${nodeDraft.label}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (includeRoadmapItems && draft.roadmapItems && draft.roadmapItems.length > 0) {
    for (const itemDraft of draft.roadmapItems) {
      try {
        const trackId = trackIdMap.get(itemDraft.trackName);

        if (trackId) {
          await createRoadmapItem({
            master_project_id: projectId,
            track_id: trackId,
            title: itemDraft.title,
            description: itemDraft.description || null,
            item_type: itemDraft.type,
            start_date: new Date().toISOString().split('T')[0],
            end_date: null,
            status: 'not_started',
            position: result.roadmapItemsCreated,
          });

          result.roadmapItemsCreated++;
        } else {
          console.warn('[WIZARD CREATE] Track not found for roadmap item:', itemDraft.trackName);
          result.errors.push({
            entity: `Roadmap Item: ${itemDraft.title}`,
            error: `Track "${itemDraft.trackName}" not found`,
          });
        }
      } catch (error) {
        console.error('[WIZARD CREATE] Failed to create roadmap item:', itemDraft.title, error);
        result.errors.push({
          entity: `Roadmap Item: ${itemDraft.title}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (includeMilestones && draft.milestones && draft.milestones.length > 0) {
    console.log('[WIZARD CREATE] Milestone creation not yet implemented (TODO)');
    for (const milestoneDraft of draft.milestones) {
      result.errors.push({
        entity: `Milestone: ${milestoneDraft.title}`,
        error: 'Milestone creation not yet implemented',
      });
    }
  }

  if (result.errors.length > 0) {
    console.warn('[WIZARD CREATE] Completed with errors:', result.errors);
  }

  console.log('[WIZARD CREATE] Summary:', {
    tracksCreated: result.tracksCreated,
    subtracksCreated: result.subtracksCreated,
    nodesCreated: result.nodesCreated,
    roadmapItemsCreated: result.roadmapItemsCreated,
    milestonesCreated: result.milestonesCreated,
    errorCount: result.errors.length,
  });

  return result;
}
