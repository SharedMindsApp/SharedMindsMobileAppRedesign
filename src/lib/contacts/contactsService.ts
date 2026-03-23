/**
 * Contacts Service
 * 
 * Manages user-owned contacts for sharing permissions.
 * Contacts can optionally link to authenticated users.
 */

import { supabase } from '../supabase';

export interface Contact {
  id: string;
  owner_user_id: string;
  display_name: string;
  email: string | null;
  linked_user_id: string | null;
  tags: string[];
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContactInput {
  display_name: string;
  email?: string | null;
  linked_user_id?: string | null;
  tags?: string[];
  notes?: string | null;
  avatar_url?: string | null;
}

export interface UpdateContactInput {
  display_name?: string;
  email?: string | null;
  linked_user_id?: string | null;
  tags?: string[];
  notes?: string | null;
  avatar_url?: string | null;
}

/**
 * Get all contacts for the current user
 */
export async function getContacts(userId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('owner_user_id', userId)
    .order('display_name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

/**
 * Search contacts by name or email
 */
export async function searchContacts(
  userId: string,
  query: string
): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('owner_user_id', userId)
    .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('display_name', { ascending: true })
    .limit(50);
  
  if (error) throw error;
  return data || [];
}

/**
 * Get contact by ID
 */
export async function getContact(contactId: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

/**
 * Create a new contact
 */
export async function createContact(
  userId: string,
  input: CreateContactInput
): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      owner_user_id: userId,
      display_name: input.display_name,
      email: input.email || null,
      linked_user_id: input.linked_user_id || null,
      tags: input.tags || [],
      notes: input.notes || null,
      avatar_url: input.avatar_url || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update a contact
 */
export async function updateContact(
  contactId: string,
  input: UpdateContactInput
): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .update({
      display_name: input.display_name,
      email: input.email,
      linked_user_id: input.linked_user_id,
      tags: input.tags,
      notes: input.notes,
      avatar_url: input.avatar_url,
    })
    .eq('id', contactId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Delete a contact
 */
export async function deleteContact(contactId: string): Promise<void> {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId);
  
  if (error) throw error;
}

/**
 * Find or create contact by email
 * 
 * Useful for "Invite by email" flows.
 */
export async function findOrCreateContactByEmail(
  userId: string,
  email: string,
  displayName?: string
): Promise<Contact> {
  // Try to find existing contact
  const { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('owner_user_id', userId)
    .eq('email', email)
    .maybeSingle();
  
  if (existing) {
    return existing;
  }
  
  // Create new contact
  return await createContact(userId, {
    display_name: displayName || email,
    email,
  });
}

