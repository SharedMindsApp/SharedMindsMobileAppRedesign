/**
 * Reconfiguration Service
 * 
 * Handles reconfiguration of movement profile after initial discovery.
 * Allows users to add/remove domains, update details, and reassemble trackers.
 */

import { supabase } from '../supabase';
import { DiscoveryService } from './discoveryService';
import { TrackerAssembler } from './trackerAssembler';
import { FitnessTrackerService } from './fitnessTrackerService';
import type { UserMovementProfile, MovementDomain, DomainDetail } from './types';

export interface ReconfigurationResult {
  success: boolean;
  newProfile: UserMovementProfile;
  trackersCreated: number;
  trackersRemoved: number;
}

export class ReconfigurationService {
  private discoveryService = new DiscoveryService();
  private assembler = new TrackerAssembler();
  private fitnessTrackerService = new FitnessTrackerService();

  /**
   * Reconfigure tracker after profile update
   * Handles adding/removing domains and updating details
   */
  async reconfigureTracker(
    userId: string,
    updates: {
      primaryDomains?: MovementDomain[];
      domainDetails?: Record<MovementDomain, DomainDetail>;
      movementLevel?: 'casual' | 'regular' | 'structured' | 'competitive';
    }
  ): Promise<ReconfigurationResult> {
    // Get current profile
    const currentProfile = await this.discoveryService.getProfile(userId);
    if (!currentProfile) {
      throw new Error('Profile not found');
    }

    // Merge updates with current profile
    const mergedDomains = updates.primaryDomains || currentProfile.primaryDomains;
    const mergedDetails = {
      ...currentProfile.domainDetails,
      ...updates.domainDetails,
    };
    const mergedLevel = updates.movementLevel ?? currentProfile.movementLevel;

    // Track which trackers need to be created/removed
    const currentDomains = new Set(currentProfile.primaryDomains);
    const newDomains = new Set(mergedDomains);
    const addedDomains = mergedDomains.filter(d => !currentDomains.has(d));
    const removedDomains = currentProfile.primaryDomains.filter(d => !newDomains.has(d));

    // Assemble new tracker structure
    const newStructure = await this.assembler.assembleTracker({
      primaryDomains: mergedDomains,
      domainDetails: mergedDetails,
      movementLevel: mergedLevel,
    });

    // Generate new UI configuration
    const newUIConfig = await this.assembler.generateUIConfiguration(newStructure);

    // Generate new insight preferences
    const newInsightPrefs = await this.assembler.generateInsightPreferences(
      {
        primaryDomains: mergedDomains,
        domainDetails: mergedDetails,
        movementLevel: mergedLevel,
      },
      newStructure
    );

    // Update profile
    const { error: updateError } = await supabase
      .from('user_movement_profiles')
      .update({
        primary_domains: mergedDomains,
        domain_details: mergedDetails,
        movement_level: mergedLevel,
        tracker_structure: newStructure,
        ui_configuration: newUIConfig,
        insight_preferences: newInsightPrefs,
        last_reconfiguration_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    // Create new profile object
    const updatedProfile: UserMovementProfile = {
      ...currentProfile,
      primaryDomains: mergedDomains,
      domainDetails: mergedDetails,
      movementLevel: mergedLevel,
      trackerStructure: newStructure,
      uiConfiguration: newUIConfig,
      insightPreferences: newInsightPrefs,
      lastReconfigurationDate: new Date().toISOString(),
    };
    this.discoveryService.setProfileCache(updatedProfile);

    // Update the single Fitness Tracker schema if structure changed
    // For now, we keep the existing tracker and just update the profile
    // Schema updates can be handled separately if needed (migration of entries)
    const tracker = await this.fitnessTrackerService.createTrackersFromProfile(updatedProfile);
    // createTrackersFromProfile now returns a single tracker (or existing one)

    return {
      success: true,
      newProfile: updatedProfile,
      trackersCreated: 0, // Single tracker approach - no new trackers created
      trackersRemoved: 0, // Single tracker approach - no trackers removed
    };
  }

  /**
   * Archive trackers for removed domains
   */
  private async archiveTrackersForDomains(
    userId: string,
    domains: MovementDomain[]
  ): Promise<number> {
    // Map domains to tracker name patterns
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

    const trackerNames = domains.map(d => domainToName[d]);

    // Find trackers to archive
    const { data: trackers, error } = await supabase
      .from('trackers')
      .select('id, name')
      .eq('owner_id', userId)
      .in('name', trackerNames)
      .is('archived_at', null);

    if (error || !trackers) {
      console.error('Failed to find trackers for archiving:', error);
      return 0;
    }

    // Archive them
    const trackerIds = trackers.map(t => t.id);
    if (trackerIds.length > 0) {
      const { error: archiveError } = await supabase
        .from('trackers')
        .update({ archived_at: new Date().toISOString() })
        .in('id', trackerIds);

      if (archiveError) {
        console.error('Failed to archive trackers:', archiveError);
        return 0;
      }
    }

    return trackerIds.length;
  }
}
