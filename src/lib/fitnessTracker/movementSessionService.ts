/**
 * Movement Session Service
 * 
 * Handles creation and management of movement sessions.
 * Integrates with Tracker Studio's tracker_entries system.
 */

import { supabase } from '../supabase';
import { createEntry, updateEntry, listEntriesByDateRange } from '../trackerStudio/trackerEntryService';
import type { TrackerEntry, CreateTrackerEntryInput } from '../trackerStudio/types';
import { DiscoveryService } from './discoveryService';
import { FitnessTrackerService } from './fitnessTrackerService';
import type { MovementSession, MovementDomain } from './types';

export class MovementSessionService {
  private discoveryService = new DiscoveryService();
  private fitnessTrackerService = new FitnessTrackerService();
  private static sessionListCache = new Map<
    string,
    { timestamp: number; sessions: MovementSession[] }
  >();
  private static cacheTtlMs = 30000;

  /**
   * Create a movement session
   * Maps to Tracker Studio's tracker_entry system
   */
  async createSession(
    userId: string,
    session: Omit<MovementSession, 'id' | 'userId'>
  ): Promise<MovementSession> {
    // Get user's profile to find the correct tracker
    const profile = await this.discoveryService.getProfile(userId);
    if (!profile) {
      throw new Error('Movement profile not found. Please complete discovery first.');
    }

    // Find the tracker for this domain/category
    const tracker = await this.findTrackerForDomain(userId, session.domain);
    if (!tracker) {
      throw new Error(`Tracker not found for domain: ${session.domain}`);
    }

    // Map movement session to tracker entry format
    const entryInput: CreateTrackerEntryInput = {
      tracker_id: tracker.id,
      entry_date: new Date(session.timestamp).toISOString().split('T')[0], // Extract date part
      field_values: this.mapSessionToFieldValues(session),
      notes: session.notes,
    };

    // Create entry in Tracker Studio
    const entry = await createEntry(entryInput);
    MovementSessionService.clearCache(userId);

    // Map back to MovementSession format
    return this.mapEntryToSession(entry, session.domain);
  }

  /**
   * Update a movement session
   */
  async updateSession(
    userId: string,
    sessionId: string,
    updates: Partial<MovementSession>
  ): Promise<MovementSession> {
    // Get the entry to find its tracker
    const { data: entry, error: fetchError } = await supabase
      .from('tracker_entries')
      .select('*, trackers!inner(id, field_schema_snapshot)')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !entry) {
      throw new Error(`Session not found: ${fetchError?.message}`);
    }

    // Map updates to field values
    const fieldValues = updates.notes !== undefined
      ? entry.field_values
      : { ...entry.field_values, ...this.mapSessionToFieldValues(updates as MovementSession) };

    // Update entry
    const updatedEntry = await updateEntry(sessionId, {
      field_values: fieldValues,
      notes: updates.notes,
    });
    MovementSessionService.clearCache(userId);

    // Determine domain from tracker name or use existing
    const domain = this.extractDomainFromTrackerName(entry.trackers.name) as MovementDomain;

    return this.mapEntryToSession(updatedEntry, domain);
  }

  /**
   * List movement sessions for a domain
   */
  async listSessions(
    userId: string,
    domain: MovementDomain,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
      forceRefresh?: boolean;
    }
  ): Promise<MovementSession[]> {
    const cacheKey = this.buildCacheKey(userId, domain, options);
    const cached = MovementSessionService.sessionListCache.get(cacheKey);
    if (
      cached &&
      !options?.forceRefresh &&
      Date.now() - cached.timestamp < MovementSessionService.cacheTtlMs
    ) {
      return cached.sessions;
    }

    // Find tracker for domain
    const tracker = await this.findTrackerForDomain(userId, domain);
    if (!tracker) {
      return [];
    }

    // List entries from Tracker Studio
    const entries = await listEntriesByDateRange({
      tracker_id: tracker.id,
      user_id: userId,
      start_date: options?.startDate,
      end_date: options?.endDate,
      limit: options?.limit,
      offset: options?.offset,
    });

    // Map entries to sessions
    const sessions = entries.map(entry => this.mapEntryToSession(entry, domain));
    MovementSessionService.sessionListCache.set(cacheKey, {
      timestamp: Date.now(),
      sessions,
    });
    return sessions;
  }

  /**
   * Get a single session by ID
   */
  async getSession(userId: string, sessionId: string): Promise<MovementSession | null> {
    const { data: entry, error } = await supabase
      .from('tracker_entries')
      .select('*, trackers!inner(id, name, field_schema_snapshot)')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error || !entry) {
      return null;
    }

    const domain = this.extractDomainFromTrackerName(entry.trackers.name) as MovementDomain;
    return this.mapEntryToSession(entry, domain);
  }

  /**
   * Find tracker for a given domain
   * Uses the unified Fitness Tracker from user's profile
   */
  private async findTrackerForDomain(
    userId: string,
    domain: MovementDomain
  ): Promise<{ id: string; name: string } | null> {
    // First, try to get the Fitness Tracker from user's profile
    const profile = await this.discoveryService.getProfile(userId);
    if (profile?.fitnessTrackerId) {
      // Get the Fitness Tracker
      const { data: tracker, error } = await supabase
        .from('trackers')
        .select('id, name')
        .eq('id', profile.fitnessTrackerId)
        .is('archived_at', null)
        .maybeSingle();

      if (!error && tracker) {
        return tracker;
      }
    }

    // Fallback: Look for "Fitness Tracker" by name
    const { data: trackers, error } = await supabase
      .from('trackers')
      .select('id, name')
      .eq('owner_id', userId)
      .is('archived_at', null);

    if (error || !trackers) {
      return null;
    }

    // Find the Fitness Tracker by name (case-insensitive)
    const fitnessTracker = trackers.find(
      t => t.name.toLowerCase().includes('fitness tracker') || 
           t.name.toLowerCase() === 'fitness tracker'
    );

    if (fitnessTracker) {
      return fitnessTracker;
    }

    // Legacy fallback: try to find domain-specific trackers (for backwards compatibility)
    const domainToName: Record<MovementDomain, string> = {
      gym: 'Gym Sessions',
      running: 'Running Sessions',
      cycling: 'Cycling Sessions',
      swimming: 'Swimming Sessions',
      team_sports: 'Team Sports',
      individual_sports: 'Individual Sports',
      martial_arts: 'Martial Arts',
      yoga: 'Yoga / Mobility',
      rehab: 'Rehab / Physio',
      other: 'Other Movement',
    };

    const trackerName = domainToName[domain];
    const tracker = trackers.find(t => t.name === trackerName || t.name.toLowerCase().includes(domain.replace('_', ' ')));

    return tracker || null;
  }

  private buildCacheKey(
    userId: string,
    domain: MovementDomain,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ): string {
    return [
      userId,
      domain,
      options?.startDate || '',
      options?.endDate || '',
      options?.limit ?? '',
      options?.offset ?? '',
    ].join('|');
  }

  private static clearCache(userId: string) {
    for (const key of MovementSessionService.sessionListCache.keys()) {
      if (key.startsWith(`${userId}|`)) {
        MovementSessionService.sessionListCache.delete(key);
      }
    }
  }

  /**
   * Map MovementSession to tracker entry field values
   */
  private mapSessionToFieldValues(session: Partial<MovementSession>): Record<string, any> {
    const values: Record<string, any> = {};

    // REQUIRED: Movement category (Activity Type) - maps domain to category ID
    // Category IDs match domain names (e.g., 'martial_arts', 'gym', 'running')
    if (session.domain !== undefined) {
      values.movement_category = session.domain;
    }

    // Core fields
    // Note: activity is stored in session_type or notes, not as a separate movement_type field
    if (session.sessionType !== undefined) values.session_type = session.sessionType;
    // Store activity in notes if provided and not already captured in session_type
    if (session.intent !== undefined) values.intent = session.intent;
    if (session.context !== undefined) values.context = session.context;
    if (session.perceivedIntensity !== undefined) values.perceived_intensity = session.perceivedIntensity;
    if (session.bodyState !== undefined) values.body_state = session.bodyState;
    if (session.durationMinutes !== undefined) values.duration_minutes = session.durationMinutes;
    if (session.bodyweightKg !== undefined) values.bodyweight_kg = session.bodyweightKg;

    // Domain-specific fields
    if (session.exercises) {
      values.exercises = Array.isArray(session.exercises)
        ? JSON.stringify(session.exercises)
        : session.exercises;
    }
    if (session.distanceKm !== undefined) values.distance_km = session.distanceKm;
    if (session.pacePerKm !== undefined) values.pace_per_km = session.pacePerKm;
    if (session.heartRateZones) values.heart_rate_zones = session.heartRateZones;
    if (session.terrain !== undefined) values.terrain = session.terrain;
    if (session.elevationMeters !== undefined) values.elevation_meters = session.elevationMeters;

    // Include any additional fields from session, but exclude fields that don't exist in tracker schema
    const excludedFields = ['id', 'userId', 'timestamp', 'domain', 'notes', 'activity', 'movement_type'];
    Object.keys(session).forEach(key => {
      if (!excludedFields.includes(key) && !values[key]) {
        // Only include fields that are valid tracker schema fields
        const validFields = [
          'session_type', 'perceived_intensity', 'body_state', 'duration_minutes', 'bodyweight_kg',
          'exercises', 'distance_km', 'pace_per_km', 'terrain', 'distance_meters', 'match_type',
          'position', 'minutes_played', 'heart_rate_zones', 'elevation_meters', 'intent', 'context'
        ];
        if (validFields.includes(key) || key.startsWith('custom_')) {
          values[key] = (session as any)[key];
        }
      }
    });

    return values;
  }

  /**
   * Map tracker entry to MovementSession
   */
  private mapEntryToSession(entry: TrackerEntry, domain: MovementDomain): MovementSession {
    const values = entry.field_values || {};

    return {
      id: entry.id,
      userId: entry.user_id,
      domain,
      // Use session_type as activity name if available, otherwise use domain
      activity: values.session_type || domain,
      sessionType: values.session_type,
      timestamp: entry.entry_date,
      intent: values.intent,
      context: values.context,
      perceivedIntensity: values.perceived_intensity,
      bodyState: values.body_state,
      durationMinutes: values.duration_minutes,
      notes: entry.notes || undefined,
      exercises: this.parseExercises(values.exercises),
      distanceKm: values.distance_km,
      pacePerKm: values.pace_per_km,
      heartRateZones: values.heart_rate_zones,
      terrain: values.terrain,
      elevationMeters: values.elevation_meters,
      bodyweightKg: values.bodyweight_kg,
    };
  }

  /**
   * Extract domain from tracker name
   */
  private extractDomainFromTrackerName(trackerName: string): string {
    const name = trackerName.toLowerCase();
    if (name.includes('gym')) return 'gym';
    if (name.includes('running')) return 'running';
    if (name.includes('cycling')) return 'cycling';
    if (name.includes('swimming')) return 'swimming';
    if (name.includes('team')) return 'team_sports';
    if (name.includes('martial') || name.includes('arts')) return 'martial_arts';
    if (name.includes('yoga') || name.includes('mobility')) return 'yoga';
    if (name.includes('rehab') || name.includes('physio')) return 'rehab';
    return 'other';
  }

  private parseExercises(value: unknown): MovementSession['exercises'] {
    if (!value) return undefined;
    if (Array.isArray(value)) return value as MovementSession['exercises'];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
      } catch {
        return [{ name: value }];
      }
    }
    return undefined;
  }
}
