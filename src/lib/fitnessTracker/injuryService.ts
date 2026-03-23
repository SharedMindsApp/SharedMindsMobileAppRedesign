/**
 * Injury Service
 * 
 * Handles injury/health condition tracking for fitness tracker
 */

import { supabase } from '../supabase';
import type { Injury, MovementDomain } from './types';

export class InjuryService {
  /**
   * Get all injuries for a user
   */
  async getInjuries(userId: string): Promise<Injury[]> {
    const { data, error } = await supabase
      .from('user_injuries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get injuries: ${error.message}`);
    }

    return (data || []).map(this.mapToInjury);
  }

  /**
   * Get current injuries only
   */
  async getCurrentInjuries(userId: string): Promise<Injury[]> {
    const { data, error } = await supabase
      .from('user_injuries')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'current')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get current injuries: ${error.message}`);
    }

    return (data || []).map(this.mapToInjury);
  }

  /**
   * Get historical injuries only
   */
  async getHistoricalInjuries(userId: string): Promise<Injury[]> {
    const { data, error } = await supabase
      .from('user_injuries')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'historical')
      .order('resolved_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to get historical injuries: ${error.message}`);
    }

    return (data || []).map(this.mapToInjury);
  }

  /**
   * Create a new injury
   */
  async createInjury(userId: string, injury: Omit<Injury, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Injury> {
    const injuryData = {
      user_id: userId,
      name: injury.name,
      type: injury.type,
      body_area: injury.bodyArea,
      severity: injury.severity || null,
      started_date: injury.startedDate || null,
      resolved_date: injury.resolvedDate || null,
      affected_activities: injury.affectedActivities || [],
      limitations: injury.limitations || null,
      notes: injury.notes || null,
    };

    const { data, error } = await supabase
      .from('user_injuries')
      .insert(injuryData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create injury: ${error.message}`);
    }

    return this.mapToInjury(data);
  }

  /**
   * Update an existing injury
   */
  async updateInjury(injuryId: string, updates: Partial<Omit<Injury, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Injury> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.bodyArea !== undefined) updateData.body_area = updates.bodyArea;
    if (updates.severity !== undefined) updateData.severity = updates.severity || null;
    if (updates.startedDate !== undefined) updateData.started_date = updates.startedDate || null;
    if (updates.resolvedDate !== undefined) updateData.resolved_date = updates.resolvedDate || null;
    if (updates.affectedActivities !== undefined) updateData.affected_activities = updates.affectedActivities || [];
    if (updates.limitations !== undefined) updateData.limitations = updates.limitations || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;

    const { data, error } = await supabase
      .from('user_injuries')
      .update(updateData)
      .eq('id', injuryId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update injury: ${error.message}`);
    }

    return this.mapToInjury(data);
  }

  /**
   * Delete an injury
   */
  async deleteInjury(injuryId: string): Promise<void> {
    const { error } = await supabase
      .from('user_injuries')
      .delete()
      .eq('id', injuryId);

    if (error) {
      throw new Error(`Failed to delete injury: ${error.message}`);
    }
  }

  /**
   * Mark an injury as resolved (convert current to historical)
   */
  async resolveInjury(injuryId: string, resolvedDate?: string): Promise<Injury> {
    return this.updateInjury(injuryId, {
      type: 'historical',
      resolvedDate: resolvedDate || new Date().toISOString().split('T')[0],
    });
  }

  /**
   * Map database row to Injury
   */
  private mapToInjury(data: any): Injury {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      type: data.type,
      bodyArea: data.body_area,
      severity: data.severity,
      startedDate: data.started_date,
      resolvedDate: data.resolved_date,
      affectedActivities: data.affected_activities || [],
      limitations: data.limitations,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
