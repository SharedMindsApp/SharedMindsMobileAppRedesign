/**
 * Activity State Service
 * 
 * Manages activity states (Active, Paused, Seasonal, Dormant, Archived)
 * Handles pausing, resuming, and seasonal activity management
 */

import { supabase } from '../supabase';
import { DiscoveryService } from './discoveryService';
import type { 
  MovementDomain, 
  UserMovementProfile, 
  ActivityState, 
  PauseReason, 
  Season,
  ActivityStateMetadata,
  DomainDetail 
} from './types';

export class ActivityStateService {
  private discoveryService = new DiscoveryService();

  /**
   * Pause an activity
   */
  async pauseActivity(
    userId: string,
    domain: MovementDomain,
    reason: PauseReason,
    options?: {
      expectedReturn?: string; // ISO date or season
      notes?: string;
    }
  ): Promise<UserMovementProfile> {
    const profile = await this.discoveryService.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const domainDetails = { ...profile.domainDetails };
    const currentDetail = domainDetails[domain] || {};

    const stateMetadata: ActivityStateMetadata = {
      state: 'paused',
      pausedAt: new Date().toISOString(),
      pauseReason: reason,
      pauseNotes: options?.notes,
      expectedReturn: options?.expectedReturn,
      isSeasonal: reason === 'seasonal' || currentDetail.state?.isSeasonal,
      typicalSeason: currentDetail.state?.typicalSeason,
    };

    domainDetails[domain] = {
      ...currentDetail,
      state: stateMetadata,
    };

    // Update profile
    const { error } = await supabase
      .from('user_movement_profiles')
      .update({
        domain_details: domainDetails,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to pause activity: ${error.message}`);
    }

    // Reload profile
    return await this.discoveryService.getProfile(userId, { forceRefresh: true }) as UserMovementProfile;
  }

  /**
   * Resume an activity (set back to active)
   */
  async resumeActivity(
    userId: string,
    domain: MovementDomain
  ): Promise<UserMovementProfile> {
    const profile = await this.discoveryService.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const domainDetails = { ...profile.domainDetails };
    const currentDetail = domainDetails[domain] || {};

    // If seasonal, keep seasonal metadata but set state to active
    const stateMetadata: ActivityStateMetadata = currentDetail.state?.isSeasonal
      ? {
          state: 'active',
          isSeasonal: true,
          typicalSeason: currentDetail.state.typicalSeason,
          pausedAt: undefined,
          pauseReason: undefined,
          pauseNotes: undefined,
        }
      : {
          state: 'active',
        };

    domainDetails[domain] = {
      ...currentDetail,
      state: stateMetadata,
    };

    const { error } = await supabase
      .from('user_movement_profiles')
      .update({
        domain_details: domainDetails,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to resume activity: ${error.message}`);
    }

    return await this.discoveryService.getProfile(userId, { forceRefresh: true }) as UserMovementProfile;
  }

  /**
   * Set activity as seasonal with typical season
   */
  async setSeasonalActivity(
    userId: string,
    domain: MovementDomain,
    season: Season
  ): Promise<UserMovementProfile> {
    const profile = await this.discoveryService.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const domainDetails = { ...profile.domainDetails };
    const currentDetail = domainDetails[domain] || {};

    const isCurrentlyInSeason = this.isInSeason(season);

    const stateMetadata: ActivityStateMetadata = {
      state: isCurrentlyInSeason ? 'active' : 'seasonal',
      isSeasonal: true,
      typicalSeason: season,
    };

    domainDetails[domain] = {
      ...currentDetail,
      state: stateMetadata,
    };

    const { error } = await supabase
      .from('user_movement_profiles')
      .update({
        domain_details: domainDetails,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to set seasonal activity: ${error.message}`);
    }

    return await this.discoveryService.getProfile(userId, { forceRefresh: true }) as UserMovementProfile;
  }

  /**
   * Archive an activity (removes from active view)
   */
  async archiveActivity(
    userId: string,
    domain: MovementDomain
  ): Promise<UserMovementProfile> {
    const profile = await this.discoveryService.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const domainDetails = { ...profile.domainDetails };
    const currentDetail = domainDetails[domain] || {};

    const stateMetadata: ActivityStateMetadata = {
      ...currentDetail.state,
      state: 'archived',
      archivedAt: new Date().toISOString(),
    };

    domainDetails[domain] = {
      ...currentDetail,
      state: stateMetadata,
    };

    const { error } = await supabase
      .from('user_movement_profiles')
      .update({
        domain_details: domainDetails,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to archive activity: ${error.message}`);
    }

    return await this.discoveryService.getProfile(userId, { forceRefresh: true }) as UserMovementProfile;
  }

  /**
   * Get activities grouped by state
   */
  getActivitiesByState(profile: UserMovementProfile): {
    active: MovementDomain[];
    paused: MovementDomain[];
    seasonal: MovementDomain[];
    dormant: MovementDomain[];
    archived: MovementDomain[];
  } {
    const result = {
      active: [] as MovementDomain[],
      paused: [] as MovementDomain[],
      seasonal: [] as MovementDomain[],
      dormant: [] as MovementDomain[],
      archived: [] as MovementDomain[],
    };

    for (const domain of profile.primaryDomains || []) {
      const detail = profile.domainDetails[domain];
      const state = detail?.state?.state || 'active';

      // Check if seasonal activity is currently in season
      if (state === 'seasonal' || (state === 'active' && detail?.state?.isSeasonal)) {
        const typicalSeason = detail?.state?.typicalSeason;
        if (typicalSeason && !this.isInSeason(typicalSeason)) {
          result.seasonal.push(domain);
          continue;
        }
      }

      result[state as ActivityState].push(domain);
    }

    return result;
  }

  /**
   * Check if we're currently in the given season
   */
  private isInSeason(season: Season): boolean {
    const now = new Date();
    const month = now.getMonth(); // 0-11 (Jan = 0)

    switch (season) {
      case 'spring':
        return month >= 2 && month <= 4; // March-May (Northern Hemisphere)
      case 'summer':
        return month >= 5 && month <= 7; // June-August
      case 'autumn':
        return month >= 8 && month <= 10; // September-November
      case 'winter':
        return month === 11 || month <= 1; // December-February
      default:
        return false;
    }
  }

  /**
   * Get suggested reactivation activities (seasonal activities entering season, paused with return dates passed)
   */
  getReactivationSuggestions(profile: UserMovementProfile): {
    domain: MovementDomain;
    reason: 'season_starting' | 'return_date_passed' | 'pause_expired';
    message: string;
  }[] {
    const suggestions: {
      domain: MovementDomain;
      reason: 'season_starting' | 'return_date_passed' | 'pause_expired';
      message: string;
    }[] = [];

    for (const domain of profile.primaryDomains || []) {
      const detail = profile.domainDetails[domain];
      const state = detail?.state;

      if (!state) continue;

      // Check seasonal activities entering season
      if (state.isSeasonal && state.typicalSeason) {
        const isInSeason = this.isInSeason(state.typicalSeason);
        if (state.state === 'seasonal' && isInSeason) {
          const seasonNames: Record<Season, string> = {
            spring: 'Spring',
            summer: 'Summer',
            autumn: 'Autumn',
            winter: 'Winter',
          };
          suggestions.push({
            domain,
            reason: 'season_starting',
            message: `${seasonNames[state.typicalSeason]} is starting — would you like to make this active again?`,
          });
        }
      }

      // Check paused activities with return dates
      if (state.state === 'paused' && state.expectedReturn) {
        const returnDate = new Date(state.expectedReturn);
        const now = new Date();
        
        // Check if it's a date
        if (!isNaN(returnDate.getTime()) && returnDate <= now) {
          suggestions.push({
            domain,
            reason: 'return_date_passed',
            message: `Your expected return date has passed — ready to resume?`,
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Check if activity should be excluded from pattern analysis
   */
  shouldExcludeFromPatterns(domain: MovementDomain, profile: UserMovementProfile): boolean {
    const detail = profile.domainDetails[domain];
    const state = detail?.state?.state || 'active';

    // Exclude paused, dormant, and archived from pattern analysis
    return ['paused', 'dormant', 'archived'].includes(state);
  }
}
