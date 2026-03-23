/**
 * Mind Mesh V2 Container Metadata Service
 *
 * Fetches human-readable metadata for containers based on their authority.
 *
 * Authority Types:
 * - local_only: Container exists only in Mind Mesh (no Guardrails reference)
 * - integrated: Container is backed by a Guardrails entity
 *
 * Used for read-only display in hover previews and inspectors.
 */

import { supabase } from '../supabase';
import type { MindMeshContainer } from '../../hooks/useMindMesh';
import { inferContainerType, type ContainerType } from './containerCapabilities';

export interface ContainerMetadata {
  containerType: ContainerType;
  title: string;
  description: string | null;
  sourceLabel: string;
  sourceIcon: string;
  authority: 'local_only' | 'integrated';
  additionalInfo: Record<string, string>;
  createdFromMindMesh?: boolean;
}

/**
 * Determines if a container is local-only (no Guardrails backing).
 *
 * A container is local-only if:
 * - entity_id is null, undefined, or empty string
 * - entity_type is not set
 */
export function isLocalOnlyContainer(container: MindMeshContainer): boolean {
  return (
    !container.entity_id ||
    container.entity_id.trim() === ''
  );
}

/**
 * Checks if a container was created from Mind Mesh.
 *
 * Looks up the container reference metadata to see if source is 'mind_mesh_creation'.
 */
async function wasCreatedFromMindMesh(containerId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('mindmesh_container_references')
      .select('metadata')
      .eq('container_id', containerId)
      .eq('is_primary', true)
      .maybeSingle();

    if (error || !data) return false;

    const metadata = data.metadata as Record<string, unknown> | null;
    return metadata?.source === 'mind_mesh_creation';
  } catch (error) {
    console.error('Failed to check Mind Mesh creation source:', error);
    return false;
  }
}

/**
 * Fetches metadata for a container.
 *
 * For local-only containers, returns metadata from title/body without database queries.
 * For integrated containers, fetches from Guardrails tables.
 *
 * NEVER queries Guardrails tables for local-only containers.
 */
export async function fetchContainerMetadata(
  container: MindMeshContainer
): Promise<ContainerMetadata | null> {
  try {
    if (isLocalOnlyContainer(container)) {
      const containerType = inferContainerType(container.entity_type, container.metadata);
      return {
        containerType,
        title: container.title || 'Untitled',
        description: container.body || null,
        sourceLabel: 'Local (Mind Mesh only)',
        sourceIcon: '📝',
        authority: 'local_only',
        additionalInfo: {},
      };
    }

    // Check if container was created from Mind Mesh
    const createdFromMindMesh = await wasCreatedFromMindMesh(container.id);

    switch (container.entity_type) {
      case 'track':
        return await fetchTrackMetadata(container.entity_id, container.metadata, createdFromMindMesh);
      case 'roadmap_item':
        return await fetchRoadmapItemMetadata(container.entity_id, container.metadata, createdFromMindMesh);
      case 'side_project':
        return await fetchSideProjectMetadata(container.entity_id, createdFromMindMesh);
      case 'offshoot':
        return await fetchOffshootMetadata(container.entity_id, createdFromMindMesh);
      default:
        return null;
    }
  } catch (error) {
    console.error('Failed to fetch container metadata:', error);
    return null;
  }
}

async function fetchTrackMetadata(trackId: string, containerMetadata: any, createdFromMindMesh: boolean): Promise<ContainerMetadata | null> {
  if (typeof trackId === 'string' && trackId.trim() === '') {
    throw new Error('Invalid trackId: empty string passed to metadata lookup');
  }

  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('name, description, color, master_project_id, parent_track_id')
    .eq('id', trackId)
    .maybeSingle();

  if (error || !data) return null;

  const isSubtrack = !!data.parent_track_id;
  const containerType = isSubtrack ? 'subtrack' : 'track';

  return {
    containerType,
    title: data.name,
    description: data.description,
    sourceLabel: isSubtrack ? 'Subtrack' : 'Track',
    sourceIcon: isSubtrack ? '📋' : '🎯',
    authority: 'integrated',
    additionalInfo: {
      Color: data.color || 'Default',
    },
    createdFromMindMesh,
  };
}

async function fetchRoadmapItemMetadata(itemId: string, containerMetadata: any, createdFromMindMesh: boolean): Promise<ContainerMetadata | null> {
  if (typeof itemId === 'string' && itemId.trim() === '') {
    throw new Error('Invalid itemId: empty string passed to metadata lookup');
  }

  const { data, error } = await supabase
    .from('roadmap_items')
    .select(`
      title,
      description,
      type,
      item_type,
      start_date,
      end_date,
      status,
      track:guardrails_tracks!roadmap_items_track_id_fkey(name)
    `)
    .eq('id', itemId)
    .maybeSingle();

  if (error || !data) return null;

  const itemType = data.type || data.item_type || 'task';
  const containerType = inferContainerType('roadmap_item', { type: itemType });

  const additionalInfo: Record<string, string> = {
    Type: itemType,
    Status: data.status || 'Unknown',
  };

  if (data.start_date) {
    additionalInfo['Start'] = new Date(data.start_date).toLocaleDateString();
  }
  if (data.end_date) {
    additionalInfo['End'] = new Date(data.end_date).toLocaleDateString();
  }

  return {
    containerType,
    title: data.title,
    description: data.description,
    sourceLabel: `From Roadmap${data.track ? `: ${data.track.name}` : ''}`,
    sourceIcon: containerType === 'task' ? '✓' : '📅',
    authority: 'integrated',
    additionalInfo,
    createdFromMindMesh,
  };
}

async function fetchSideProjectMetadata(projectId: string, createdFromMindMesh: boolean): Promise<ContainerMetadata | null> {
  if (typeof projectId === 'string' && projectId.trim() === '') {
    throw new Error('Invalid projectId: empty string passed to metadata lookup');
  }

  const { data, error } = await supabase
    .from('side_projects')
    .select('title, description, created_at, archived_at')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    containerType: 'idea',
    title: data.title,
    description: data.description,
    sourceLabel: 'Side Project',
    sourceIcon: '🔬',
    authority: 'integrated',
    additionalInfo: {
      Status: data.archived_at ? 'Archived' : 'Active',
      Created: new Date(data.created_at).toLocaleDateString(),
    },
    createdFromMindMesh,
  };
}

async function fetchOffshootMetadata(offshootId: string, createdFromMindMesh: boolean): Promise<ContainerMetadata | null> {
  if (typeof offshootId === 'string' && offshootId.trim() === '') {
    throw new Error('Invalid offshootId: empty string passed to metadata lookup');
  }

  const { data, error } = await supabase
    .from('offshoot_ideas')
    .select('title, description, idea_type, created_at')
    .eq('id', offshootId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    containerType: 'idea',
    title: data.title,
    description: data.description,
    sourceLabel: 'Offshoot Idea',
    sourceIcon: '💡',
    authority: 'integrated',
    additionalInfo: {
      Type: data.idea_type || 'idea',
      Created: new Date(data.created_at).toLocaleDateString(),
    },
    createdFromMindMesh,
  };
}
