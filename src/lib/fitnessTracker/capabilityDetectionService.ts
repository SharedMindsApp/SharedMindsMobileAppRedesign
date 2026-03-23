/**
 * Capability Detection Service
 * 
 * Detects and unlocks capabilities based on usage patterns.
 * Features unlock automatically without user intervention or announcements.
 */

import { supabase } from '../supabase';
import { MovementSessionService } from './movementSessionService';
import type { MovementSession, UserMovementProfile, CapabilityUnlock } from './types';

export class CapabilityDetectionService {
  private sessionService = new MovementSessionService();

  /**
   * Detect and unlock capabilities based on usage
   */
  async detectUnlocks(
    profile: UserMovementProfile,
    sessions: MovementSession[]
  ): Promise<CapabilityUnlock[]> {
    const unlocks: CapabilityUnlock[] = [];

    // Check for structured sessions
    if (this.hasStructuredSessions(sessions)) {
      unlocks.push({
        feature: 'session_categorization',
        trigger: 'structured_sessions',
        activated: true,
        activatedDate: new Date(),
      });
    }

    // Check for high frequency
    if (this.hasHighFrequency(sessions)) {
      unlocks.push({
        feature: 'load_tracking',
        trigger: 'high_frequency',
        activated: true,
        activatedDate: new Date(),
      });
    }

    // Check for consistent intensity reporting
    if (this.hasConsistentIntensity(sessions)) {
      unlocks.push({
        feature: 'intensity_analysis',
        trigger: 'intensity_reporting',
        activated: true,
        activatedDate: new Date(),
      });
    }

    // Check for detailed logging
    if (this.hasDetailedLogging(sessions)) {
      unlocks.push({
        feature: 'advanced_analytics',
        trigger: 'detailed_logging',
        activated: true,
        activatedDate: new Date(),
      });
    }

    // Check for competitive patterns
    if (this.hasCompetitivePatterns(sessions)) {
      unlocks.push({
        feature: 'cycle_recognition',
        trigger: 'competitive_patterns',
        activated: true,
        activatedDate: new Date(),
      });
    }

    // Check for cross-domain patterns (MMA/multi-sport athletes)
    if (this.hasCrossDomainPatterns(profile, sessions)) {
      unlocks.push({
        feature: 'cross_domain_analysis',
        trigger: 'multi_domain_usage',
        activated: true,
        activatedDate: new Date(),
      });
    }

    // Check for martial arts specific patterns
    if (this.hasMartialArtsPatterns(sessions)) {
      unlocks.push({
        feature: 'sparring_analysis',
        trigger: 'martial_arts_usage',
        activated: true,
        activatedDate: new Date(),
      });
    }

    return unlocks;
  }

  /**
   * Check if user has structured sessions
   */
  private hasStructuredSessions(sessions: MovementSession[]): boolean {
    if (sessions.length < 10) return false;

    const withSessionType = sessions.filter(s => s.sessionType).length;
    return withSessionType / sessions.length > 0.7; // 70% have session type
  }

  /**
   * Check if user has high frequency
   */
  private hasHighFrequency(sessions: MovementSession[]): boolean {
    if (sessions.length < 14) return false;

    const recentSessions = sessions.slice(-14); // Last 2 weeks
    const firstDate = new Date(recentSessions[0].timestamp);
    const lastDate = new Date(recentSessions[recentSessions.length - 1].timestamp);
    const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
    const weeks = daysDiff / 7;
    const frequency = weeks > 0 ? recentSessions.length / weeks : 0;

    return frequency >= 4; // 4+ sessions per week
  }

  /**
   * Check if user consistently reports intensity
   */
  private hasConsistentIntensity(sessions: MovementSession[]): boolean {
    if (sessions.length < 10) return false;

    const withIntensity = sessions.filter(s => s.perceivedIntensity).length;
    return withIntensity / sessions.length > 0.8; // 80% report intensity
  }

  /**
   * Check if user provides detailed logging
   */
  private hasDetailedLogging(sessions: MovementSession[]): boolean {
    if (sessions.length < 10) return false;

    // Check for domain-specific detail fields
    const withDetails = sessions.filter(s => {
      if (s.domain === 'gym' && (s as any).exercises) return true;
      if ((s.domain === 'running' || s.domain === 'cycling') && ((s as any).distance_km || (s as any).pace_per_km)) return true;
      if (s.domain === 'martial_arts' && ((s as any).rounds || (s as any).technique_focus)) return true;
      if (s.notes && s.notes.length > 50) return true; // Substantial notes
      return false;
    }).length;

    return withDetails / sessions.length > 0.5; // 50% have details
  }

  /**
   * Check if user has competitive patterns
   */
  private hasCompetitivePatterns(sessions: MovementSession[]): boolean {
    if (sessions.length < 20) return false;

    // Check for competition context
    const competitions = sessions.filter(s =>
      s.context === 'competition' || s.context === 'match' || s.context === 'race'
    ).length;

    // Check for structured training patterns
    const structured = sessions.filter(s =>
      s.sessionType && ['easy', 'tempo', 'intervals', 'long', 'competition', 'competition_prep'].includes(s.sessionType)
    ).length;

    return competitions > 0 || structured / sessions.length > 0.6;
  }

  /**
   * Check if user trains across multiple domains
   */
  private hasCrossDomainPatterns(profile: UserMovementProfile, sessions: MovementSession[]): boolean {
    if (!profile.primaryDomains || profile.primaryDomains.length < 2) return false;
    if (sessions.length < 14) return false;

    // Check if sessions span multiple domains
    const domains = new Set(sessions.map(s => s.domain));
    return domains.size >= 2;
  }

  /**
   * Check if user has martial arts specific patterns
   */
  private hasMartialArtsPatterns(sessions: MovementSession[]): boolean {
    const martialArtsSessions = sessions.filter(s => s.domain === 'martial_arts');
    if (martialArtsSessions.length < 10) return false;

    // Check for sparring sessions
    const withSparring = martialArtsSessions.filter(s =>
      (s as any).sparring_type || (s as any).session_type === 'hard_sparring' || (s as any).session_type === 'light_sparring'
    ).length;

    return withSparring / martialArtsSessions.length > 0.3; // 30% have sparring
  }

  /**
   * Update profile with unlocked features
   */
  async updateUnlocks(userId: string, unlocks: CapabilityUnlock[]): Promise<void> {
    const unlockedFeatures = unlocks.map(u => u.feature);

    const { error } = await supabase
      .from('user_movement_profiles')
      .update({
        unlocked_features: unlockedFeatures,
        capability_unlocks: unlocks,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update unlocks: ${error.message}`);
    }
  }

  /**
   * Get current unlocked features for a user
   */
  async getUnlockedFeatures(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_movement_profiles')
      .select('unlocked_features')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return [];
    }

    return data.unlocked_features || [];
  }
}
