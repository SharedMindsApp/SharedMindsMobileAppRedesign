/**
 * Body Measurement Service
 * 
 * Handles creation and management of body measurement entries.
 * Direct database access to body_measurements table (separate from tracker_entries).
 */

import { supabase } from '../supabase';
import type {
  BodyMeasurementEntry,
  BodyProfile,
  CreateBodyMeasurementInput,
  UpdateBodyMeasurementInput,
} from './bodyTransformationTypes';

export class BodyMeasurementService {
  /**
   * Get or create body profile
   */
  async getProfile(userId: string): Promise<BodyProfile | null> {
    const { data, error } = await supabase
      .from('body_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null for 0 rows instead of 406 error

    if (error) {
      console.error('Failed to fetch body profile:', error);
      return null; // Return null on any error - profile is optional
    }

    // If no profile exists yet, data will be null (this is valid - profile is optional)
    if (!data) {
      return null;
    }

    return this.mapProfileFromDb(data);
  }

  /**
   * Create or update body profile
   */
  async upsertProfile(userId: string, profile: Partial<BodyProfile>): Promise<BodyProfile> {
    const profileData = {
      user_id: userId,
      height_cm: profile.heightCm,
      sex: profile.sex,
      date_of_birth: profile.dateOfBirth,
      current_bodyweight_kg: profile.currentBodyweightKg,
      training_background: profile.trainingBackground,
      athlete_flag: profile.athleteFlag ?? false,
      weight_unit: profile.weightUnit ?? 'kg',
      measurement_unit: profile.measurementUnit ?? 'cm',
      weigh_in_schedule: profile.weighInSchedule,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('body_profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save body profile: ${error.message}`);
    }

    return this.mapProfileFromDb(data);
  }

  /**
   * Create a body measurement entry
   */
  async createMeasurement(
    userId: string,
    input: CreateBodyMeasurementInput
  ): Promise<BodyMeasurementEntry> {
    const measurementData = {
      user_id: userId,
      measurement_date: input.measurementDate,
      measurement_time: input.measurementTime || null,
      bodyweight_kg: input.bodyweightKg || null,
      waist_cm: input.waistCm || null,
      hips_cm: input.hipsCm || null,
      chest_cm: input.chestCm || null,
      thigh_cm: input.thighCm || null,
      arm_cm: input.armCm || null,
      photo_front: input.photoFront || null,
      photo_side: input.photoSide || null,
      photo_back: input.photoBack || null,
      context_tags: input.contextTags || [],
      notes: input.notes || null,
      logged_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('body_measurements')
      .insert(measurementData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create measurement: ${error.message}`);
    }

    return this.mapMeasurementFromDb(data);
  }

  /**
   * Update a body measurement entry
   */
  async updateMeasurement(
    userId: string,
    input: UpdateBodyMeasurementInput
  ): Promise<BodyMeasurementEntry> {
    const { id, ...updates } = input;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.measurementDate !== undefined) updateData.measurement_date = updates.measurementDate;
    if (updates.measurementTime !== undefined) updateData.measurement_time = updates.measurementTime || null;
    if (updates.bodyweightKg !== undefined) updateData.bodyweight_kg = updates.bodyweightKg || null;
    if (updates.waistCm !== undefined) updateData.waist_cm = updates.waistCm || null;
    if (updates.hipsCm !== undefined) updateData.hips_cm = updates.hipsCm || null;
    if (updates.chestCm !== undefined) updateData.chest_cm = updates.chestCm || null;
    if (updates.thighCm !== undefined) updateData.thigh_cm = updates.thighCm || null;
    if (updates.armCm !== undefined) updateData.arm_cm = updates.armCm || null;
    if (updates.photoFront !== undefined) updateData.photo_front = updates.photoFront || null;
    if (updates.photoSide !== undefined) updateData.photo_side = updates.photoSide || null;
    if (updates.photoBack !== undefined) updateData.photo_back = updates.photoBack || null;
    if (updates.contextTags !== undefined) updateData.context_tags = updates.contextTags || [];
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;

    const { data, error } = await supabase
      .from('body_measurements')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update measurement: ${error.message}`);
    }

    return this.mapMeasurementFromDb(data);
  }

  /**
   * Delete a body measurement entry
   */
  async deleteMeasurement(userId: string, measurementId: string): Promise<void> {
    const { error } = await supabase
      .from('body_measurements')
      .delete()
      .eq('id', measurementId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete measurement: ${error.message}`);
    }
  }

  /**
   * Get a single measurement entry
   */
  async getMeasurement(userId: string, measurementId: string): Promise<BodyMeasurementEntry | null> {
    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('id', measurementId)
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() - measurement might not exist

    if (error) {
      console.error('Failed to fetch measurement:', error);
      return null;
    }

    return data ? this.mapMeasurementFromDb(data) : null;
  }

  /**
   * List body measurements with optional date range
   */
  async listMeasurements(
    userId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      orderBy?: 'measurement_date' | 'logged_at';
      orderDirection?: 'asc' | 'desc';
    }
  ): Promise<BodyMeasurementEntry[]> {
    let query = supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId);

    if (options?.startDate) {
      query = query.gte('measurement_date', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('measurement_date', options.endDate);
    }

    const orderBy = options?.orderBy || 'measurement_date';
    const orderDirection = options?.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      // Handle 406 Not Acceptable - table might not exist yet (migration not applied)
      if (error.message?.includes('406') || error.message?.includes('Not Acceptable') || error.code === '406') {
        console.warn('Body measurements table may not exist yet. Migration may need to be applied.');
        return []; // Gracefully return empty array instead of throwing
      }
      
      throw new Error(`Failed to list measurements: ${error.message}`);
    }

    return (data || []).map(item => this.mapMeasurementFromDb(item));
  }

  /**
   * Get latest measurement
   */
  async getLatestMeasurement(userId: string): Promise<BodyMeasurementEntry | null> {
    const measurements = await this.listMeasurements(userId, {
      limit: 1,
      orderBy: 'measurement_date',
      orderDirection: 'desc',
    });

    return measurements.length > 0 ? measurements[0] : null;
  }

  /**
   * Map database row to BodyProfile
   */
  private mapProfileFromDb(row: any): BodyProfile {
    return {
      userId: row.user_id,
      heightCm: row.height_cm,
      sex: row.sex,
      dateOfBirth: row.date_of_birth,
      currentBodyweightKg: row.current_bodyweight_kg,
      trainingBackground: row.training_background,
      athleteFlag: row.athlete_flag,
      weightUnit: row.weight_unit || 'kg',
      measurementUnit: row.measurement_unit || 'cm',
      weighInSchedule: row.weigh_in_schedule,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to BodyMeasurementEntry
   */
  private mapMeasurementFromDb(row: any): BodyMeasurementEntry {
    return {
      id: row.id,
      userId: row.user_id,
      measurementDate: row.measurement_date,
      measurementTime: row.measurement_time,
      bodyweightKg: row.bodyweight_kg,
      waistCm: row.waist_cm,
      hipsCm: row.hips_cm,
      chestCm: row.chest_cm,
      thighCm: row.thigh_cm,
      armCm: row.arm_cm,
      photoFront: row.photo_front,
      photoSide: row.photo_side,
      photoBack: row.photo_back,
      contextTags: row.context_tags || [],
      notes: row.notes,
      loggedAt: row.logged_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
