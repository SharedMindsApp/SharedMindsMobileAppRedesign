import { supabase } from '../supabase';
import type {
  GlobalPerson,
  CreateGlobalPersonInput,
  UpdateGlobalPersonInput,
  GlobalPersonWithProjects,
} from './coreTypes';

export async function createGlobalPerson(
  input: CreateGlobalPersonInput
): Promise<GlobalPerson> {
  const { data, error } = await supabase
    .from('global_people')
    .insert({
      name: input.name,
      email: input.email || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapGlobalPersonFromDB(data);
}

export async function updateGlobalPerson(
  id: string,
  input: UpdateGlobalPersonInput
): Promise<GlobalPerson> {
  const { data, error } = await supabase
    .from('global_people')
    .update({
      name: input.name,
      email: input.email || null,
      archived: input.archived,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapGlobalPersonFromDB(data);
}

export async function archiveGlobalPerson(id: string): Promise<void> {
  const { error } = await supabase
    .from('global_people')
    .update({ archived: true })
    .eq('id', id);

  if (error) throw error;
}

export async function unarchiveGlobalPerson(id: string): Promise<void> {
  const { error } = await supabase
    .from('global_people')
    .update({ archived: false })
    .eq('id', id);

  if (error) throw error;
}

export async function getGlobalPersonById(id: string): Promise<GlobalPerson | null> {
  const { data, error } = await supabase
    .from('global_people')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapGlobalPersonFromDB(data) : null;
}

export async function findGlobalPersonByEmail(
  email: string
): Promise<GlobalPerson | null> {
  const { data, error } = await supabase
    .from('global_people')
    .select('*')
    .eq('email', email)
    .eq('archived', false)
    .maybeSingle();

  if (error) throw error;
  return data ? mapGlobalPersonFromDB(data) : null;
}

export async function searchGlobalPeople(
  query: string,
  includeArchived = false
): Promise<GlobalPerson[]> {
  let dbQuery = supabase
    .from('global_people')
    .select('*')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`);

  if (!includeArchived) {
    dbQuery = dbQuery.eq('archived', false);
  }

  const { data, error } = await dbQuery.order('name');

  if (error) throw error;
  return (data || []).map(mapGlobalPersonFromDB);
}

export async function getAllGlobalPeople(
  includeArchived = false
): Promise<GlobalPerson[]> {
  let dbQuery = supabase.from('global_people').select('*');

  if (!includeArchived) {
    dbQuery = dbQuery.eq('archived', false);
  }

  const { data, error } = await dbQuery.order('name');

  if (error) throw error;
  return (data || []).map(mapGlobalPersonFromDB);
}

export async function getGlobalPersonWithProjects(
  globalPersonId: string
): Promise<GlobalPersonWithProjects | null> {
  const globalPerson = await getGlobalPersonById(globalPersonId);
  if (!globalPerson) return null;

  const { data: projectData, error } = await supabase
    .from('project_people')
    .select(
      `
      id,
      master_project_id,
      role,
      master_projects!inner(id, name)
    `
    )
    .eq('global_person_id', globalPersonId)
    .eq('archived', false);

  if (error) throw error;

  const projects = (projectData || []).map((pp: any) => ({
    projectId: pp.master_project_id,
    projectName: pp.master_projects.name,
    role: pp.role,
  }));

  return {
    ...globalPerson,
    projectCount: projects.length,
    projects,
  };
}

export async function findOrCreateGlobalPerson(
  name: string,
  email?: string
): Promise<GlobalPerson> {
  if (email) {
    const existing = await findGlobalPersonByEmail(email);
    if (existing) return existing;
  }

  return createGlobalPerson({ name, email });
}

export async function detectDuplicatesByEmail(
  email: string
): Promise<GlobalPerson[]> {
  if (!email) return [];

  const { data, error } = await supabase
    .from('global_people')
    .select('*')
    .eq('email', email)
    .eq('archived', false);

  if (error) throw error;
  return (data || []).map(mapGlobalPersonFromDB);
}

function mapGlobalPersonFromDB(data: any): GlobalPerson {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    archived: data.archived,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
