/**
 * Insight Generation Service
 * 
 * Generates domain-aware and level-appropriate insights from movement patterns.
 * Insights are observational and non-judgmental.
 */

import { DomainAwarePatternService, type DomainAwareMovementPattern } from './domainAwarePatternService';
import { MovementSessionService } from './movementSessionService';
import type { UserMovementProfile, MovementSession, MovementDomain } from './types';

export interface Insight {
  id: string;
  type: 'frequency' | 'consistency' | 'balance' | 'intensity' | 'recovery' | 'cross_domain' | 'sustainability';
  title: string;
  description: string;
  domain?: MovementDomain;
  category?: string;
  level: 'casual' | 'regular' | 'structured' | 'competitive';
  actionable?: boolean;
  timestamp: Date;
}

export class InsightGenerationService {
  private patternService = new DomainAwarePatternService();
  private sessionService = new MovementSessionService();

  /**
   * Generate insights for a user
   */
  async generateInsights(
    userId: string,
    profile: UserMovementProfile,
    timeWindow: { days: number } = { days: 56 },
    options?: {
      forceRefresh?: boolean;
    }
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    if (!profile.trackerStructure) {
      return insights;
    }

    // Get all sessions
    const allSessions: MovementSession[] = [];
    for (const category of profile.trackerStructure.categories || []) {
      try {
        const domainSessions = await this.sessionService.listSessions(userId, category.domain, {
          limit: 1000,
          forceRefresh: options?.forceRefresh,
        });
        allSessions.push(...domainSessions);
      } catch (error) {
        console.error(`Failed to load sessions for ${category.domain}:`, error);
      }
    }

    // Filter by time window
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeWindow.days);
    const filteredSessions = allSessions.filter(s => {
      const sessionDate = new Date(s.timestamp);
      return sessionDate >= startDate && sessionDate <= endDate;
    });

    // Analyze patterns
    const patterns = await this.patternService.analyzePatterns(
      userId,
      profile.trackerStructure,
      timeWindow,
      { forceRefresh: options?.forceRefresh }
    );

    const movementLevel = profile.movementLevel || 'regular';

    // Generate overall insights
    insights.push(...this.generateOverallInsights(patterns, movementLevel));

    // Generate domain-specific insights
    for (const category of profile.trackerStructure.categories || []) {
      const domainPattern = patterns.domainPatterns[category.id];
      if (domainPattern) {
        insights.push(...this.generateDomainInsights(
          category,
          domainPattern,
          movementLevel,
          filteredSessions.filter(s => s.domain === category.domain)
        ));
      }
    }

    // Generate cross-domain insights (if multiple domains)
    if (profile.primaryDomains && profile.primaryDomains.length > 1) {
      insights.push(...this.generateCrossDomainInsights(
        profile,
        patterns,
        filteredSessions,
        movementLevel
      ));
    }

    // Sort by timestamp (most recent first)
    return insights.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate overall insights
   */
  private generateOverallInsights(
    patterns: DomainAwareMovementPattern,
    level: string
  ): Insight[] {
    const insights: Insight[] = [];

    // Frequency insights
    if (patterns.overall.frequency.sessionsPerWeek > 0) {
      if (level === 'casual' || level === 'regular') {
        insights.push({
          id: `freq-${Date.now()}`,
          type: 'frequency',
          title: 'Movement Frequency',
          description: `You've logged ${patterns.overall.totalSessions} sessions over the past ${Math.round(patterns.overall.frequency.sessionsPerWeek * 8)} weeks, averaging ${patterns.overall.frequency.sessionsPerWeek.toFixed(1)} sessions per week.`,
          level: level as any,
          timestamp: new Date(),
        });
      } else {
        insights.push({
          id: `freq-detailed-${Date.now()}`,
          type: 'frequency',
          title: 'Training Frequency',
          description: `Training frequency: ${patterns.overall.frequency.sessionsPerWeek.toFixed(1)} sessions/week over ${Math.round(patterns.overall.frequency.sessionsPerWeek * 8)} weeks. Consistency score: ${(patterns.overall.frequency.consistency * 100).toFixed(0)}%.`,
          level: level as any,
          timestamp: new Date(),
        });
      }
    }

    // Sustainability insights (training-focused)
    if (patterns.overall.sustainabilityScore > 0.7) {
      insights.push({
        id: `sustainability-high-${Date.now()}`,
        type: 'sustainability',
        title: 'Sustainable Pattern',
        description: 'Your training rhythm looks sustainable and well-spaced over time.',
        level: level as any,
        timestamp: new Date(),
      });
    } else if (patterns.overall.sustainabilityScore < 0.5 && patterns.overall.totalSessions > 10) {
      insights.push({
        id: `sustainability-low-${Date.now()}`,
        type: 'sustainability',
        title: 'Pattern Observation',
        description: 'Training load looks uneven over the last several weeks. Consider spacing higher-load sessions.',
        level: level as any,
        timestamp: new Date(),
      });
    }

    // Consistency insights
    if (patterns.overall.frequency.consistency > 0.7) {
      insights.push({
        id: `consistency-high-${Date.now()}`,
        type: 'consistency',
        title: 'Consistent Movement',
        description: level === 'casual'
          ? 'You\'ve been consistent with your movement. That\'s a stable pattern.'
          : 'High consistency in training frequency indicates a well-established routine.',
        level: level as any,
        timestamp: new Date(),
      });
    }

    return insights;
  }

  /**
   * Generate domain-specific insights
   */
  private generateDomainInsights(
    category: { id: string; name: string; domain: MovementDomain },
    pattern: any,
    level: string,
    sessions: MovementSession[]
  ): Insight[] {
    const insights: Insight[] = [];

    // Gym-specific insights
    if (category.domain === 'gym' && pattern.sessionBalance) {
      const mostCommon = pattern.sessionBalance.distribution
        .sort((a: any, b: any) => b.count - a.count)[0];
      
      if (level === 'casual' || level === 'regular') {
        insights.push({
          id: `gym-balance-${category.id}-${Date.now()}`,
          type: 'balance',
          title: `${category.name} Balance`,
          description: `Your gym sessions include ${pattern.sessionBalance.distribution.length} different types. ${mostCommon.type.replace(/_/g, ' ')} appears most frequently.`,
          domain: category.domain,
          category: category.id,
          level: level as any,
          timestamp: new Date(),
        });
      } else {
        const balanceScore = pattern.sessionBalance.balanceScore;
        insights.push({
          id: `gym-balance-detailed-${category.id}-${Date.now()}`,
          type: 'balance',
          title: 'Session Distribution',
          description: `Session balance score: ${(balanceScore * 100).toFixed(0)}%. Distribution: ${pattern.sessionBalance.distribution.map((d: any) => `${d.type.replace(/_/g, ' ')} (${d.percentage.toFixed(0)}%)`).join(', ')}.`,
          domain: category.domain,
          category: category.id,
          level: level as any,
          timestamp: new Date(),
        });
      }
    }

    // Sport-specific insights (training vs competition)
    if (['running', 'cycling', 'swimming', 'team_sports', 'martial_arts'].includes(category.domain) && pattern.trainingVsCompetition) {
      const ratio = pattern.trainingVsCompetition.ratio;
      if (level === 'competitive' || level === 'structured') {
        if (ratio > 10 && ratio < 20) {
          insights.push({
            id: `training-ratio-${category.id}-${Date.now()}`,
            type: 'balance',
            title: 'Training-to-Competition Ratio',
            description: `Training-to-competition ratio: ${ratio.toFixed(1)}:1. This suggests a balanced approach to competition preparation.`,
            domain: category.domain,
            category: category.id,
            level: level as any,
            timestamp: new Date(),
          });
        }
      }
    }

    // Martial arts specific insights
    if (category.domain === 'martial_arts' && pattern.sparringIntensity) {
      const sparringData = pattern.sparringIntensity.byDiscipline[0];
      if (sparringData && level === 'competitive' || level === 'structured') {
        const hardPercentage = sparringData.hard + sparringData.competition;
        if (hardPercentage > 30) {
          insights.push({
            id: `martial-arts-intensity-${category.id}-${Date.now()}`,
            type: 'intensity',
            title: 'Sparring Intensity',
            description: `${(hardPercentage).toFixed(0)}% of sessions involve hard sparring or competition. Monitor recovery between high-intensity sessions.`,
            domain: category.domain,
            category: category.id,
            level: level as any,
            timestamp: new Date(),
          });
        }
      }
    }

    // Frequency insights per domain
    if (pattern.frequencyPattern && sessions.length > 10) {
      const domainFrequency = pattern.frequencyPattern.sessionsPerWeek;
      if (domainFrequency > 3) {
        insights.push({
          id: `domain-frequency-${category.id}-${Date.now()}`,
          type: 'frequency',
          title: `${category.name} Frequency`,
          description: `${category.name} appears ${domainFrequency.toFixed(1)} times per week on average.`,
          domain: category.domain,
          category: category.id,
          level: level as any,
          timestamp: new Date(),
        });
      }
    }

    return insights;
  }

  /**
   * Generate cross-domain insights
   */
  private generateCrossDomainInsights(
    profile: UserMovementProfile,
    patterns: DomainAwareMovementPattern,
    sessions: MovementSession[],
    level: string
  ): Insight[] {
    const insights: Insight[] = [];

    if (!profile.primaryDomains || profile.primaryDomains.length < 2) {
      return insights;
    }

    // Cross-domain activity switching
    const recentSessions = sessions.slice(-20);
    const domainSwitches = this.countDomainSwitches(recentSessions);
    
    if (domainSwitches > 5) {
      insights.push({
        id: `cross-domain-switching-${Date.now()}`,
        type: 'cross_domain',
        title: 'Multi-Activity Pattern',
        description: level === 'casual'
          ? 'You switch between different types of movement regularly. This variety supports engagement.'
          : 'Cross-training across multiple domains supports overall development and reduces overuse risk.',
        level: level as any,
        timestamp: new Date(),
      });
    }

    // Cross-domain recovery patterns
    const consecutiveHardDays = this.detectConsecutiveHardDays(sessions);
    if (consecutiveHardDays > 2) {
      insights.push({
        id: `cross-domain-recovery-${Date.now()}`,
        type: 'recovery',
        title: 'Recovery Observation',
        description: 'You\'ve had multiple consecutive days with higher intensity across different activities. Movement naturally includes rest days.',
        level: level as any,
        timestamp: new Date(),
      });
    }

    return insights;
  }

  /**
   * Count domain switches in recent sessions
   */
  private countDomainSwitches(sessions: MovementSession[]): number {
    if (sessions.length < 2) return 0;

    let switches = 0;
    for (let i = 1; i < sessions.length; i++) {
      if (sessions[i].domain !== sessions[i - 1].domain) {
        switches++;
      }
    }

    return switches;
  }

  /**
   * Detect consecutive hard days across domains
   */
  private detectConsecutiveHardDays(sessions: MovementSession[]): number {
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const session of sortedSessions) {
      const intensity = session.perceivedIntensity || 0;
      const isHard = intensity >= 4 || 
                     (session as any).sparring_type === 'hard' ||
                     session.context === 'competition';

      if (isHard) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }
}
