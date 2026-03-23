import { supabase } from '../supabase';
import {
  findOrCreateGlobalPerson,
  updateGlobalPerson,
  getGlobalPersonById,
} from './globalPeopleService';
import type {
  Person,
  CreatePersonInput,
  UpdatePersonInput,
  PersonWithGlobalIdentity,
} from './coreTypes';

const TABLE_NAME = 'project_people';

function transformKeysFromDb(row: any): Person {
  return {
    id: row.id,
    masterProjectId: row.master_project_id,
    globalPersonId: row.global_person_id,
    name: row.name,
    email: row.email,
    role: row.role,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function transformKeysToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

export async function createPerson(input: CreatePersonInput): Promise<Person> {
  if (!input.name || input.name.trim().length === 0) {
    throw new Error('Name is required');
  }

  let globalPersonId = input.globalPersonId;

  if (!globalPersonId) {
    const globalPerson = await findOrCreateGlobalPerson(
      input.name,
      input.email
    );
    globalPersonId = globalPerson.id;
  }

  const dbInput = transformKeysToSnake({
    masterProjectId: input.masterProjectId,
    globalPersonId,
    name: input.name,
    email: input.email || null,
    role: input.role || null,
    archived: false,
  });

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(dbInput)
    .select()
    .single();

  if (error) throw error;

  return transformKeysFromDb(data);
}

export async function updatePerson(
  id: string,
  input: UpdatePersonInput
): Promise<Person> {
  if (input.name !== undefined && input.name.trim().length === 0) {
    throw new Error('Name cannot be empty');
  }

  const person = await getPerson(id);
  if (!person) {
    throw new Error('Person not found');
  }

  if (input.name || input.email !== undefined) {
    await updateGlobalPerson(person.globalPersonId, {
      name: input.name,
      email: input.email,
    });
  }

  const dbInput = transformKeysToSnake(input);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(dbInput)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return transformKeysFromDb(data);
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function archivePerson(id: string): Promise<Person> {
  return updatePerson(id, { archived: true });
}

export async function unarchivePerson(id: string): Promise<Person> {
  return updatePerson(id, { archived: false });
}

export async function getPerson(id: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return transformKeysFromDb(data);
}

export async function getPeopleByProject(
  masterProjectId: string,
  includeArchived: boolean = false
): Promise<Person[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId);

  if (!includeArchived) {
    query = query.eq('archived', false);
  }

  query = query.order('name', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

export async function getPersonByEmail(
  masterProjectId: string,
  email: string
): Promise<Person | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId)
    .eq('email', email)
    .eq('archived', false)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return transformKeysFromDb(data);
}

export async function searchPeopleByName(
  masterProjectId: string,
  nameQuery: string,
  includeArchived: boolean = false
): Promise<Person[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId)
    .ilike('name', `%${nameQuery}%`);

  if (!includeArchived) {
    query = query.eq('archived', false);
  }

  query = query.order('name', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

export async function getActivePeopleCount(masterProjectId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact', head: true })
    .eq('master_project_id', masterProjectId)
    .eq('archived', false);

  if (error) throw error;
  return count || 0;
}

export async function getPeopleByRole(
  masterProjectId: string,
  role: string,
  includeArchived: boolean = false
): Promise<Person[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId)
    .eq('role', role);

  if (!includeArchived) {
    query = query.eq('archived', false);
  }

  query = query.order('name', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

export async function getPersonWithGlobalIdentity(
  id: string
): Promise<PersonWithGlobalIdentity | null> {
  const person = await getPerson(id);
  if (!person) return null;

  const globalPerson = await getGlobalPersonById(person.globalPersonId);
  if (!globalPerson) return null;

  return {
    ...person,
    globalPerson,
  };
}

export async function getPeopleWithGlobalIdentity(
  masterProjectId: string,
  includeArchived: boolean = false
): Promise<PersonWithGlobalIdentity[]> {
  const people = await getPeopleByProject(masterProjectId, includeArchived);

  const enriched = await Promise.all(
    people.map(async (person) => {
      const globalPerson = await getGlobalPersonById(person.globalPersonId);
      return {
        ...person,
        globalPerson: globalPerson!,
      };
    })
  );

  return enriched.filter((p) => p.globalPerson);
}

export async function checkPersonExistsInProject(
  masterProjectId: string,
  globalPersonId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .eq('master_project_id', masterProjectId)
    .eq('global_person_id', globalPersonId)
    .eq('archived', false)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
