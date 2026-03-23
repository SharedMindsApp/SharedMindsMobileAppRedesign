/**
 * Contact Groups Service
 * 
 * Manages user-owned groups of contacts for bulk sharing.
 */

import { supabase } from '../supabase';
import type { Contact } from './contactsService';

export interface ContactGroup {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactGroupWithMembers extends ContactGroup {
  members: Contact[];
  member_count: number;
}

export interface CreateGroupInput {
  name: string;
  description?: string | null;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string | null;
}

/**
 * Get all groups for the current user
 */
export async function getGroups(userId: string): Promise<ContactGroup[]> {
  const { data, error } = await supabase
    .from('contact_groups')
    .select('*')
    .eq('owner_user_id', userId)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

/**
 * Get group with members
 */
export async function getGroupWithMembers(groupId: string): Promise<ContactGroupWithMembers | null> {
  // Get group
  const { data: group, error: groupError } = await supabase
    .from('contact_groups')
    .select('*')
    .eq('id', groupId)
    .single();
  
  if (groupError || !group) {
    return null;
  }
  
  // Get members
  const { data: memberRows, error: membersError } = await supabase
    .from('contact_group_members')
    .select('contact_id')
    .eq('group_id', groupId);
  
  if (membersError) throw membersError;
  
  const contactIds = (memberRows || []).map(r => r.contact_id);
  
  let members: Contact[] = [];
  if (contactIds.length > 0) {
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .in('id', contactIds)
      .order('display_name', { ascending: true });
    
    if (contactsError) throw contactsError;
    members = contacts || [];
  }
  
  return {
    ...group,
    members,
    member_count: members.length,
  };
}

/**
 * Create a new group
 */
export async function createGroup(
  userId: string,
  input: CreateGroupInput
): Promise<ContactGroup> {
  const { data, error } = await supabase
    .from('contact_groups')
    .insert({
      owner_user_id: userId,
      name: input.name,
      description: input.description || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update a group
 */
export async function updateGroup(
  groupId: string,
  input: UpdateGroupInput
): Promise<ContactGroup> {
  const { data, error } = await supabase
    .from('contact_groups')
    .update({
      name: input.name,
      description: input.description,
    })
    .eq('id', groupId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from('contact_groups')
    .delete()
    .eq('id', groupId);
  
  if (error) throw error;
}

/**
 * Add contact to group
 */
export async function addContactToGroup(
  groupId: string,
  contactId: string
): Promise<void> {
  const { error } = await supabase
    .from('contact_group_members')
    .insert({
      group_id: groupId,
      contact_id: contactId,
    });
  
  if (error) throw error;
}

/**
 * Remove contact from group
 */
export async function removeContactFromGroup(
  groupId: string,
  contactId: string
): Promise<void> {
  const { error } = await supabase
    .from('contact_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('contact_id', contactId);
  
  if (error) throw error;
}

/**
 * Get contacts in a group
 */
export async function getGroupMembers(groupId: string): Promise<Contact[]> {
  const { data: memberRows, error: membersError } = await supabase
    .from('contact_group_members')
    .select('contact_id')
    .eq('group_id', groupId);
  
  if (membersError) throw membersError;
  
  const contactIds = (memberRows || []).map(r => r.contact_id);
  
  if (contactIds.length === 0) {
    return [];
  }
  
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('*')
    .in('id', contactIds)
    .order('display_name', { ascending: true });
  
  if (contactsError) throw contactsError;
  return contacts || [];
}

