/**
 * Fitness Tracker Discovery Service
 * 
 * Handles movement discovery and profile creation
 */

import { supabase } from '../supabase';
import type { 
  MovementDomain, 
  DomainDetail, 
  UserMovementProfile,
  TrackerStructure 
} from './types';
import { TrackerAssembler } from './trackerAssembler';
import { InjuryService } from './injuryService';

export class DiscoveryService {
  private static profileCache = new Map<
    string,
    { timestamp: number; profile: UserMovementProfile }
  >();
  private static cacheTtlMs = 30000;

  /**
   * Complete discovery and create profile
   */
  async completeDiscovery(
    userId: string,
    discoveryData: {
      primaryDomains: MovementDomain[];
      domainDetails: Record<MovementDomain, DomainDetail>;
      movementLevel?: 'casual' | 'regular' | 'structured' | 'competitive';
    }
  ): Promise<UserMovementProfile> {
    // Assemble tracker structure
    const assembler = new TrackerAssembler();
    const trackerStructure = await assembler.assembleTracker(discoveryData);
    
    // Generate UI configuration
    const uiConfiguration = await assembler.generateUIConfiguration(trackerStructure);
    
    // Set insight preferences
    const insightPreferences = await assembler.generateInsightPreferences(
      discoveryData,
      trackerStructure
    );
    
    // Save profile to database
    const profileData = {
      user_id: userId,
      primary_domains: discoveryData.primaryDomains,
      domain_details: discoveryData.domainDetails,
      movement_level: discoveryData.movementLevel || null,
      tracker_structure: trackerStructure,
      ui_configuration: uiConfiguration,
      insight_preferences: insightPreferences,
      discovery_completed: true,
      discovery_date: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('user_movement_profiles')
      .upsert(profileData, {
        onConflict: 'user_id',
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save profile: ${error.message}`);
    }
    
    const profile = this.mapToUserMovementProfile(data);
    this.setProfileCache(profile);
    return profile;
  }
  
  /**
   * Get user's movement profile (including injuries)
   */
  async getProfile(
    userId: string,
    options?: {
      forceRefresh?: boolean;
    }
  ): Promise<UserMovementProfile | null> {
    const cached = DiscoveryService.profileCache.get(userId);
    if (
      cached &&
      !options?.forceRefresh &&
      Date.now() - cached.timestamp < DiscoveryService.cacheTtlMs
    ) {
      return cached.profile;
    }

    const { data, error } = await supabase
      .from('user_movement_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
    
    if (!data) return null;
    
    const profile = this.mapToUserMovementProfile(data);
    
    // Load injuries and attach to profile
    try {
      const injuryService = new InjuryService();
      const injuries = await injuryService.getInjuries(userId);
      profile.injuries = injuries;
    } catch (error) {
      console.error('Failed to load injuries for profile:', error);
      // Don't fail profile loading if injuries fail - just set empty array
      profile.injuries = [];
    }
    
    this.setProfileCache(profile);
    return profile;
  }
  
  /**
   * Check if user has completed discovery
   */
  async hasCompletedDiscovery(userId: string): Promise<boolean> {
    const profile = await this.getProfile(userId);
    return profile?.discoveryCompleted ?? false;
  }
  
  /**
   * Map database row to UserMovementProfile
   */
  private mapToUserMovementProfile(data: any): UserMovementProfile {
    return {
      userId: data.user_id,
      primaryDomains: data.primary_domains || [],
      domainDetails: data.domain_details || {},
      movementLevel: data.movement_level,
      trackerStructure: data.tracker_structure,
      uiConfiguration: data.ui_configuration,
      insightPreferences: data.insight_preferences,
      unlockedFeatures: data.unlocked_features || [],
      capabilityUnlocks: data.capability_unlocks || [],
      discoveryCompleted: data.discovery_completed || false,
      discoveryDate: data.discovery_date,
      lastReconfigurationDate: data.last_reconfiguration_date,
      fitnessTrackerId: data.fitness_tracker_id || undefined,
    };
  }

  setProfileCache(profile: UserMovementProfile) {
    DiscoveryService.profileCache.set(profile.userId, {
      timestamp: Date.now(),
      profile,
    });
  }
}
