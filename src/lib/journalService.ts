/**
 * Journal Service
 * 
 * Service for managing journal entries (personal journal and gratitude journal)
 * in the standalone journaling app within Spaces.
 */

import { supabase } from './supabase';

// Types
export interface PersonalJournalEntry {
  id: string;
  user_id: string;
  space_id: string;
  entry_date: string;
  title?: string;
  content: string;
  tags?: string[];
  is_private: boolean;
  shared_space_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GratitudeEntry {
  id: string;
  user_id: string;
  space_id: string;
  entry_date: string;
  content: string;
  format: 'free_write' | 'bullets';
  created_at: string;
  updated_at: string;
}

export type JournalEntryType = 'personal' | 'gratitude';

export interface JournalEntry {
  id: string;
  type: JournalEntryType;
  entry_date: string;
  title?: string;
  content: string;
  tags?: string[];
  format?: 'free_write' | 'bullets';
  is_private?: boolean;
  created_at: string;
  updated_at: string;
}

// Personal Journal Entries
export async function getPersonalJournalEntries(spaceId: string, limit = 50): Promise<PersonalJournalEntry[]> {
  const { data, error } = await supabase
    .from('personal_journal_entries')
    .select('*')
    .eq('space_id', spaceId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getPersonalJournalEntry(id: string): Promise<PersonalJournalEntry | null> {
  const { data, error } = await supabase
    .from('personal_journal_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createPersonalJournalEntry(entry: Partial<PersonalJournalEntry>): Promise<PersonalJournalEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('personal_journal_entries')
    .insert({ ...entry, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePersonalJournalEntry(
  id: string,
  updates: Partial<PersonalJournalEntry>
): Promise<PersonalJournalEntry> {
  const { data, error } = await supabase
    .from('personal_journal_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePersonalJournalEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('personal_journal_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Gratitude Entries (updated to use space_id, with fallback to household_id for backward compatibility)
export async function getGratitudeEntries(spaceId: string, limit = 50): Promise<GratitudeEntry[]> {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('*')
    .or(`space_id.eq.${spaceId},household_id.eq.${spaceId}`)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(entry => ({
    ...entry,
    space_id: entry.space_id || entry.household_id, // Ensure space_id is set
  }));
}

export async function getGratitudeEntry(id: string): Promise<GratitudeEntry | null> {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createGratitudeEntry(entry: Partial<GratitudeEntry>): Promise<GratitudeEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Ensure both space_id and household_id are set for backward compatibility
  const entryData: any = {
    ...entry,
    user_id: user.id,
    space_id: entry.space_id,
    household_id: entry.space_id, // Keep household_id for backward compatibility
  };

  const { data, error } = await supabase
    .from('gratitude_entries')
    .insert(entryData)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    space_id: data.space_id || data.household_id, // Ensure space_id is set
  };
}

export async function updateGratitudeEntry(id: string, updates: Partial<GratitudeEntry>): Promise<GratitudeEntry> {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGratitudeEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('gratitude_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Combined functions for unified journal view
export async function getAllJournalEntries(spaceId: string, limit = 50): Promise<JournalEntry[]> {
  const [personalEntries, gratitudeEntries] = await Promise.all([
    getPersonalJournalEntries(spaceId, limit),
    getGratitudeEntries(spaceId, limit),
  ]);

  const combined: JournalEntry[] = [
    ...personalEntries.map(entry => ({
      id: entry.id,
      type: 'personal' as JournalEntryType,
      entry_date: entry.entry_date,
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      is_private: entry.is_private,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    })),
    ...gratitudeEntries.map(entry => ({
      id: entry.id,
      type: 'gratitude' as JournalEntryType,
      entry_date: entry.entry_date,
      content: entry.content,
      format: entry.format,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    })),
  ];

  // Sort by date (most recent first)
  return combined.sort((a, b) => {
    const dateA = new Date(a.entry_date).getTime();
    const dateB = new Date(b.entry_date).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }).slice(0, limit);
}

export async function searchJournalEntries(
  spaceId: string,
  query: string,
  type?: JournalEntryType,
  tags?: string[]
): Promise<JournalEntry[]> {
  const allEntries = await getAllJournalEntries(spaceId, 200);
  
  let filtered = allEntries;

  // Filter by type
  if (type) {
    filtered = filtered.filter(entry => entry.type === type);
  }

  // Filter by tags
  if (tags && tags.length > 0) {
    filtered = filtered.filter(entry => 
      entry.tags && tags.some(tag => entry.tags!.includes(tag))
    );
  }

  // Search in content and title
  if (query) {
    const lowerQuery = query.toLowerCase();
    filtered = filtered.filter(entry =>
      entry.content.toLowerCase().includes(lowerQuery) ||
      (entry.title && entry.title.toLowerCase().includes(lowerQuery))
    );
  }

  return filtered;
}
