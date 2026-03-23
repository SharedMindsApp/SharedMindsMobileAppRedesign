import { supabase } from '../supabase';
import type {
  RoadmapItemAssignment,
  Person,
  RoadmapItem,
  RoadmapItemWithAssignees,
  PersonWithAssignments,
} from './coreTypes';
import { getPerson } from './peopleService';
import { getRoadmapItem } from './roadmapService';

const TABLE_NAME = 'roadmap_item_assignees';

function transformKeysFromDb(row: any): RoadmapItemAssignment {
  return {
    id: row.id,
    roadmapItemId: row.roadmap_item_id,
    personId: row.person_id,
    assignedAt: row.assigned_at,
  };
}

export async function assignPersonToRoadmapItem(
  roadmapItemId: string,
  personId: string
): Promise<RoadmapItemAssignment> {
  const item = await getRoadmapItem(roadmapItemId);
  if (!item) {
    throw new Error('Roadmap item not found');
  }

  const person = await getPerson(personId);
  if (!person) {
    throw new Error('Person not found');
  }

  if (person.archived) {
    throw new Error('Cannot assign archived person to roadmap item');
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      roadmap_item_id: roadmapItemId,
      person_id: personId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Person is already assigned to this roadmap item');
    }
    throw error;
  }

  return transformKeysFromDb(data);
}

export async function unassignPersonFromRoadmapItem(
  roadmapItemId: string,
  personId: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('roadmap_item_id', roadmapItemId)
    .eq('person_id', personId);

  if (error) throw error;
}

export async function bulkAssignPeople(
  roadmapItemId: string,
  personIds: string[]
): Promise<RoadmapItemAssignment[]> {
  if (personIds.length === 0) return [];

  const item = await getRoadmapItem(roadmapItemId);
  if (!item) {
    throw new Error('Roadmap item not found');
  }

  const assignments = personIds.map(personId => ({
    roadmap_item_id: roadmapItemId,
    person_id: personId,
  }));

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(assignments)
    .select();

  if (error) throw error;

  return (data || []).map(transformKeysFromDb);
}

export async function replaceAssignments(
  roadmapItemId: string,
  personIds: string[]
): Promise<RoadmapItemAssignment[]> {
  await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('roadmap_item_id', roadmapItemId);

  if (personIds.length === 0) return [];

  return bulkAssignPeople(roadmapItemId, personIds);
}

export async function getAssignmentsByRoadmapItem(
  roadmapItemId: string
): Promise<RoadmapItemAssignment[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('roadmap_item_id', roadmapItemId)
    .order('assigned_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

export async function getAssignmentsByPerson(
  personId: string
): Promise<RoadmapItemAssignment[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('person_id', personId)
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

export async function getAssignedPeopleForRoadmapItem(
  roadmapItemId: string
): Promise<Person[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(`
      person_id,
      project_people (
        id,
        master_project_id,
        name,
        email,
        role,
        archived,
        created_at,
        updated_at
      )
    `)
    .eq('roadmap_item_id', roadmapItemId)
    .order('assigned_at', { ascending: true });

  if (error) throw error;

  return (data || [])
    .filter(row => row.project_people)
    .map(row => ({
      id: row.project_people.id,
      masterProjectId: row.project_people.master_project_id,
      name: row.project_people.name,
      email: row.project_people.email,
      role: row.project_people.role,
      archived: row.project_people.archived,
      createdAt: row.project_people.created_at,
      updatedAt: row.project_people.updated_at,
    }));
}

export async function getAssignedRoadmapItemsForPerson(
  personId: string
): Promise<RoadmapItem[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(`
      roadmap_item_id,
      roadmap_items (
        id,
        track_id,
        type,
        title,
        description,
        start_date,
        end_date,
        status,
        metadata,
        created_at,
        updated_at
      )
    `)
    .eq('person_id', personId)
    .order('assigned_at', { ascending: false });

  if (error) throw error;

  return (data || [])
    .filter(row => row.roadmap_items)
    .map(row => {
      const item = row.roadmap_items;
      return {
        id: item.id,
        masterProjectId: '',
        trackId: item.track_id,
        type: item.type,
        title: item.title,
        description: item.description,
        startDate: item.start_date,
        endDate: item.end_date,
        status: item.status,
        metadata: item.metadata || {},
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });
}

export async function getRoadmapItemWithAssignees(
  roadmapItemId: string
): Promise<RoadmapItemWithAssignees | null> {
  const item = await getRoadmapItem(roadmapItemId);
  if (!item) return null;

  const assignedPeople = await getAssignedPeopleForRoadmapItem(roadmapItemId);

  return {
    ...item,
    assignedPeople,
  };
}

export async function getPersonWithAssignments(
  personId: string
): Promise<PersonWithAssignments | null> {
  const person = await getPerson(personId);
  if (!person) return null;

  const assignedItems = await getAssignedRoadmapItemsForPerson(personId);

  return {
    ...person,
    assignedItems,
  };
}

export async function getAssignmentCountsByProject(
  masterProjectId: string
): Promise<{ personId: string; personName: string; assignmentCount: number }[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(`
      person_id,
      project_people!inner (
        master_project_id,
        name,
        archived
      )
    `)
    .eq('project_people.master_project_id', masterProjectId)
    .eq('project_people.archived', false);

  if (error) throw error;

  const countMap = new Map<string, { name: string; count: number }>();

  (data || []).forEach(row => {
    if (!row.project_people) return;

    const personId = row.person_id;
    const personName = row.project_people.name;

    if (!countMap.has(personId)) {
      countMap.set(personId, { name: personName, count: 0 });
    }
    const entry = countMap.get(personId)!;
    entry.count++;
  });

  return Array.from(countMap.entries()).map(([personId, { name, count }]) => ({
    personId,
    personName: name,
    assignmentCount: count,
  }));
}

export async function getRoadmapItemsWithMultipleAssignees(
  masterProjectId: string,
  minAssignees: number = 2
): Promise<RoadmapItemWithAssignees[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(`
      roadmap_item_id,
      roadmap_items!inner (
        id,
        track_id,
        type,
        title,
        description,
        start_date,
        end_date,
        status,
        metadata,
        created_at,
        updated_at,
        guardrails_tracks!inner (
          master_project_id
        )
      )
    `)
    .eq('roadmap_items.guardrails_tracks.master_project_id', masterProjectId);

  if (error) throw error;

  const itemMap = new Map<string, any>();

  (data || []).forEach(row => {
    if (!row.roadmap_items) return;

    const itemId = row.roadmap_item_id;
    if (!itemMap.has(itemId)) {
      itemMap.set(itemId, {
        item: row.roadmap_items,
        assigneeCount: 0,
      });
    }
    itemMap.get(itemId).assigneeCount++;
  });

  const filteredItems = Array.from(itemMap.entries())
    .filter(([_, { assigneeCount }]) => assigneeCount >= minAssignees)
    .map(([itemId, _]) => itemId);

  const itemsWithAssignees: RoadmapItemWithAssignees[] = [];

  for (const itemId of filteredItems) {
    const itemWithAssignees = await getRoadmapItemWithAssignees(itemId);
    if (itemWithAssignees) {
      itemsWithAssignees.push(itemWithAssignees);
    }
  }

  return itemsWithAssignees;
}

export async function getUnassignedRoadmapItems(
  masterProjectId: string
): Promise<RoadmapItem[]> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .select(`
      id,
      track_id,
      type,
      title,
      description,
      start_date,
      end_date,
      status,
      metadata,
      created_at,
      updated_at,
      guardrails_tracks!inner (
        master_project_id
      )
    `)
    .eq('guardrails_tracks.master_project_id', masterProjectId);

  if (error) throw error;

  const allItemIds = (data || []).map(item => item.id);

  const { data: assignedData, error: assignedError } = await supabase
    .from(TABLE_NAME)
    .select('roadmap_item_id')
    .in('roadmap_item_id', allItemIds);

  if (assignedError) throw assignedError;

  const assignedItemIds = new Set((assignedData || []).map(a => a.roadmap_item_id));

  return (data || [])
    .filter(item => !assignedItemIds.has(item.id))
    .map(item => ({
      id: item.id,
      masterProjectId,
      trackId: item.track_id,
      type: item.type,
      title: item.title,
      description: item.description,
      startDate: item.start_date,
      endDate: item.end_date,
      status: item.status,
      metadata: item.metadata || {},
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
}
