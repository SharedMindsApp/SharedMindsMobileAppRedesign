/**
 * Domain-Aware Pattern Service
 * 
 * Analyzes movement patterns with domain awareness.
 * Provides gym-specific, sport-specific, and mixed-mode pattern analysis.
 */

import { MovementSessionService } from './movementSessionService';
import type {
  MovementSession,
  MovementDomain,
  TrackerStructure,
  TrackerCategory,
} from './types';

export interface DomainPattern {
  sessionBalance?: SessionBalance;
  intensityClustering?: IntensityClustering;
  trainingVsCompetition?: TrainingVsCompetition;
  sparringIntensity?: SparringIntensity;
  sessionTypeDistribution?: SessionTypeDistribution;
  frequencyPattern?: FrequencyPattern;
  sustainabilityScore?: number;
}

export interface SparringIntensity {
  byDiscipline: Array<{
    discipline: string;
    drilling: number;
    light: number;
    moderate: number;
    hard: number;
    competition: number;
  }>;
}

export interface SessionTypeDistribution {
  distribution: Array<{ type: string; count: number; percentage: number }>;
  total: number;
}

export interface SessionBalance {
  distribution: Array<{ type: string; count: number; percentage: number }>;
  total: number;
  balanceScore: number; // 0-1, higher = more balanced
}

export interface IntensityClustering {
  bySessionType: Array<{
    type: string;
    average: number;
    distribution: Record<number, number>; // intensity -> percentage
  }>;
}

export interface TrainingVsCompetition {
  training: { count: number; percentage: number };
  competition: { count: number; percentage: number };
  ratio: number;
}

export interface FrequencyPattern {
  sessionsPerWeek: number;
  consistency: number; // 0-1, higher = more consistent
  gaps: Array<{ start: string; end: string; days: number }>;
  streaks: Array<{ start: string; end: string; days: number }>;
}

export interface DomainAwareMovementPattern {
  overall: {
    totalSessions: number;
    frequency: FrequencyPattern;
    sustainabilityScore: number;
  };
  domainPatterns: Record<string, DomainPattern>;
}

export class DomainAwarePatternService {
  private sessionService = new MovementSessionService();
  private static patternCache = new Map<
    string,
    {
      timestamp: number;
      data: DomainAwareMovementPattern;
      ttlMs: number;
      latestSessionDate: string | null;
    }
  >();

  /**
   * Analyze patterns with domain awareness
   */
  async analyzePatterns(
    userId: string,
    structure: TrackerStructure,
    timeWindow: { days: number } = { days: 56 },
    options?: {
      forceRefresh?: boolean;
      cacheMinutes?: number;
    }
  ): Promise<DomainAwareMovementPattern> {
    const cacheKey = this.getCacheKey(userId, structure, timeWindow);
    const cacheEntry = DomainAwarePatternService.patternCache.get(cacheKey);
    const cacheTtlMs = (options?.cacheMinutes ?? 2) * 60 * 1000;
    if (
      cacheEntry &&
      !options?.forceRefresh &&
      Date.now() - cacheEntry.timestamp < cacheTtlMs
    ) {
      return cacheEntry.data;
    }
    if (cacheEntry && !options?.forceRefresh) {
      const latestSessionDate = await this.getLatestSessionDateForWindow(
        userId,
        structure,
        timeWindow
      );
      if (this.isSameOrBefore(latestSessionDate, cacheEntry.latestSessionDate)) {
        cacheEntry.timestamp = Date.now();
        return cacheEntry.data;
      }
    }

    // Calculate time window first to optimize queries
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeWindow.days);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all sessions across domains with date filtering (domain-specific optimization)
    const allSessions: MovementSession[] = [];
    
    // Parallel fetch for better performance
    const sessionPromises = (structure.categories || []).map(async (category) => {
      try {
        return await this.sessionService.listSessions(userId, category.domain, {
          startDate: startDateStr,
          endDate: endDateStr,
          limit: 1000, // Get enough sessions for analysis
          forceRefresh: options?.forceRefresh,
        });
      } catch (error) {
        console.error(`Failed to load sessions for ${category.domain}:`, error);
        return [];
      }
    });

    const sessionArrays = await Promise.all(sessionPromises);
    sessionArrays.forEach(sessions => allSessions.push(...sessions));
    
    // Filter by time window (double-check in case of timezone issues)
    const filteredSessions = allSessions.filter(s => {
      const sessionDate = new Date(s.timestamp);
      return sessionDate >= startDate && sessionDate <= endDate;
    });

    // Overall patterns
    const frequencyPattern = this.analyzeFrequencyPattern(filteredSessions);
    const sustainabilityScore = this.calculateSustainabilityScore(filteredSessions, frequencyPattern);

    // Domain-specific patterns (parallel processing for performance)
    const domainPatterns: Record<string, DomainPattern> = {};
    
    const domainAnalysisPromises = (structure.categories || []).map(async (category) => {
      const domainSessions = filteredSessions.filter(s => s.domain === category.domain);
      
      if (domainSessions.length === 0) {
        return { categoryId: category.id, pattern: null };
      }

      const config = structure.patternConfig?.domainSpecific?.[category.id] || {};
      const pattern = await this.analyzeDomainPatterns(category, domainSessions, config);
      
      return { categoryId: category.id, pattern };
    });

    const domainAnalyses = await Promise.all(domainAnalysisPromises);
    domainAnalyses.forEach(({ categoryId, pattern }) => {
      if (pattern) {
        domainPatterns[categoryId] = pattern;
      }
    });

    const latestSessionDate = this.getLatestSessionDateFromSessions(filteredSessions);
    const patternResult = {
      overall: {
        totalSessions: filteredSessions.length,
        frequency: frequencyPattern,
        sustainabilityScore,
      },
      domainPatterns,
    };
    DomainAwarePatternService.patternCache.set(cacheKey, {
      timestamp: Date.now(),
      data: patternResult,
      ttlMs: cacheTtlMs,
      latestSessionDate,
    });
    return patternResult;
  }

  /**
   * Analyze patterns for a specific domain
   */
  private async analyzeDomainPatterns(
    category: TrackerCategory,
    sessions: MovementSession[],
    config: any
  ): Promise<DomainPattern> {
    const patterns: DomainPattern = {};

    // Gym-specific patterns
    if (category.domain === 'gym') {
      if (config.trackSessionBalance) {
        patterns.sessionBalance = this.analyzeSessionBalance(sessions);
      }
      if (config.trackIntensityClustering) {
        patterns.intensityClustering = this.analyzeIntensityClustering(sessions);
      }
    }

    // Sport-specific patterns (running, cycling, swimming, team sports, martial arts)
    if (['running', 'cycling', 'swimming', 'team_sports', 'individual_sports', 'martial_arts'].includes(category.domain)) {
      if (config.trackTrainingVsCompetition) {
        patterns.trainingVsCompetition = this.analyzeTrainingVsCompetition(sessions);
      }
    }

    // Martial arts specific patterns
    if (category.domain === 'martial_arts') {
      if (config.trackSparringIntensity) {
        patterns.sparringIntensity = this.analyzeSparringIntensity(sessions);
      }
      if (config.trackSessionTypeDistribution) {
        patterns.sessionTypeDistribution = this.analyzeSessionTypeDistribution(sessions);
      }
    }

    // Frequency pattern for all domains
    patterns.frequencyPattern = this.analyzeFrequencyPattern(sessions);

    // Sustainability score
    patterns.sustainabilityScore = this.calculateSustainabilityScore(sessions, patterns.frequencyPattern!);

    return patterns;
  }

  /**
   * Analyze session balance (gym-specific)
   */
  private analyzeSessionBalance(sessions: MovementSession[]): SessionBalance {
    const balance: Record<string, number> = {};

    for (const session of sessions) {
      const type = session.sessionType || 'other';
      balance[type] = (balance[type] || 0) + 1;
    }

    const total = sessions.length;
    const percentages = Object.entries(balance).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));

    return {
      distribution: percentages,
      total,
      balanceScore: this.calculateBalanceScore(percentages),
    };
  }

  /**
   * Analyze intensity clustering (gym-specific)
   */
  private analyzeIntensityClustering(sessions: MovementSession[]): IntensityClustering {
    const clustering: Record<string, number[]> = {};

    for (const session of sessions) {
      if (session.perceivedIntensity) {
        const type = session.sessionType || 'other';
        if (!clustering[type]) clustering[type] = [];
        clustering[type].push(session.perceivedIntensity);
      }
    }

    return {
      bySessionType: Object.entries(clustering).map(([type, intensities]) => ({
        type,
        average: this.average(intensities),
        distribution: this.getIntensityDistribution(intensities),
      })),
    };
  }

  /**
   * Analyze sparring intensity (martial arts specific)
   */
  private analyzeSparringIntensity(sessions: MovementSession[]): SparringIntensity {
    const byDiscipline: Record<string, { drilling: number; light: number; moderate: number; hard: number; competition: number }> = {};

    for (const session of sessions) {
      const discipline = session.sessionType || session.activity || 'general';
      const sparringType = (session as any).sparring_type || (session as any).session_type;

      if (!byDiscipline[discipline]) {
        byDiscipline[discipline] = { drilling: 0, light: 0, moderate: 0, hard: 0, competition: 0 };
      }

      if (sparringType) {
        if (sparringType === 'drilling' || sparringType === 'technique') {
          byDiscipline[discipline].drilling++;
        } else if (sparringType === 'light' || sparringType === 'light_sparring') {
          byDiscipline[discipline].light++;
        } else if (sparringType === 'moderate') {
          byDiscipline[discipline].moderate++;
        } else if (sparringType === 'hard' || sparringType === 'hard_sparring') {
          byDiscipline[discipline].hard++;
        } else if (sparringType === 'competition' || sparringType === 'competition_prep') {
          byDiscipline[discipline].competition++;
        }
      }
    }

    return {
      byDiscipline: Object.entries(byDiscipline).map(([discipline, counts]) => {
        const total = counts.drilling + counts.light + counts.moderate + counts.hard + counts.competition;
        return {
          discipline,
          drilling: total > 0 ? (counts.drilling / total) * 100 : 0,
          light: total > 0 ? (counts.light / total) * 100 : 0,
          moderate: total > 0 ? (counts.moderate / total) * 100 : 0,
          hard: total > 0 ? (counts.hard / total) * 100 : 0,
          competition: total > 0 ? (counts.competition / total) * 100 : 0,
        };
      }),
    };
  }

  /**
   * Analyze session type distribution (martial arts specific)
   */
  private analyzeSessionTypeDistribution(sessions: MovementSession[]): SessionTypeDistribution {
    const distribution: Record<string, number> = {};

    for (const session of sessions) {
      const type = (session as any).session_type || session.sessionType || 'other';
      distribution[type] = (distribution[type] || 0) + 1;
    }

    const total = sessions.length;
    const percentages = Object.entries(distribution).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));

    return {
      distribution: percentages,
      total,
    };
  }

  /**
   * Analyze training vs competition (sport-specific)
   */
  private analyzeTrainingVsCompetition(sessions: MovementSession[]): TrainingVsCompetition {
    const training = sessions.filter(
      s => !s.context || s.context === 'training' || s.context === 'practice'
    ).length;
    const competition = sessions.filter(
      s => s.context === 'competition' || s.context === 'match' || s.context === 'race'
    ).length;
    const total = sessions.length;

    return {
      training: {
        count: training,
        percentage: total > 0 ? (training / total) * 100 : 0,
      },
      competition: {
        count: competition,
        percentage: total > 0 ? (competition / total) * 100 : 0,
      },
      ratio: training > 0 ? competition / training : 0,
    };
  }

  /**
   * Analyze frequency pattern
   */
  private analyzeFrequencyPattern(sessions: MovementSession[]): FrequencyPattern {
    if (sessions.length === 0) {
      return {
        sessionsPerWeek: 0,
        consistency: 0,
        gaps: [],
        streaks: [],
      };
    }

    // Sort sessions by date
    const sortedSessions = [...sessions].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // Calculate sessions per week
    const firstDate = new Date(sortedSessions[0].timestamp);
    const lastDate = new Date(sortedSessions[sortedSessions.length - 1].timestamp);
    const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
    const weeks = daysDiff / 7;
    const sessionsPerWeek = weeks > 0 ? sessions.length / weeks : 0;

    // Find gaps and streaks
    const gaps: Array<{ start: string; end: string; days: number }> = [];
    const streaks: Array<{ start: string; end: string; days: number }> = [];

    let currentStreakStart: Date | null = null;
    let currentStreakEnd: Date | null = null;

    for (let i = 1; i < sortedSessions.length; i++) {
      const prevDate = new Date(sortedSessions[i - 1].timestamp);
      const currDate = new Date(sortedSessions[i].timestamp);
      const daysBetween = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      // Gap detection (> 7 days between sessions)
      if (daysBetween > 7) {
        gaps.push({
          start: sortedSessions[i - 1].timestamp,
          end: sortedSessions[i].timestamp,
          days: daysBetween,
        });
      }

      // Streak detection (sessions within 3 days)
      if (daysBetween <= 3) {
        if (!currentStreakStart) {
          currentStreakStart = prevDate;
        }
        currentStreakEnd = currDate;
      } else {
        if (currentStreakStart && currentStreakEnd) {
          const streakDays = Math.ceil((currentStreakEnd.getTime() - currentStreakStart.getTime()) / (1000 * 60 * 60 * 24));
          if (streakDays >= 3) {
            streaks.push({
              start: currentStreakStart.toISOString(),
              end: currentStreakEnd.toISOString(),
              days: streakDays,
            });
          }
        }
        currentStreakStart = null;
        currentStreakEnd = null;
      }
    }

    // Final streak
    if (currentStreakStart && currentStreakEnd) {
      const streakDays = Math.ceil((currentStreakEnd.getTime() - currentStreakStart.getTime()) / (1000 * 60 * 60 * 24));
      if (streakDays >= 3) {
        streaks.push({
          start: currentStreakStart.toISOString(),
          end: currentStreakEnd.toISOString(),
          days: streakDays,
        });
      }
    }

    // Calculate consistency (lower variance = higher consistency)
    const consistency = this.calculateConsistency(sessions, sessionsPerWeek);

    return {
      sessionsPerWeek,
      consistency,
      gaps,
      streaks,
    };
  }

  /**
   * Calculate sustainability score (0-1)
   */
  private calculateSustainabilityScore(
    sessions: MovementSession[],
    frequencyPattern: FrequencyPattern
  ): number {
    if (sessions.length === 0) return 0;

    // Factors:
    // 1. Consistency (0-0.4)
    // 2. Frequency (0-0.3)
    // 3. Gaps (0-0.2)
    // 4. Streaks (0-0.1)

    const consistencyScore = frequencyPattern.consistency * 0.4;
    const frequencyScore = Math.min(frequencyPattern.sessionsPerWeek / 5, 1) * 0.3; // 5 sessions/week = max
    const gapsPenalty = Math.max(0, 1 - (frequencyPattern.gaps.length / 10)) * 0.2; // More gaps = lower score
    const streaksBonus = Math.min(frequencyPattern.streaks.length / 5, 1) * 0.1; // More streaks = higher score

    return consistencyScore + frequencyScore + gapsPenalty + streaksBonus;
  }

  /**
   * Calculate balance score (0-1, higher = more balanced)
   */
  private calculateBalanceScore(
    distribution: Array<{ type: string; percentage: number }>
  ): number {
    if (distribution.length === 0) return 0;
    if (distribution.length === 1) return 0.5; // Single type is somewhat balanced

    // Calculate variance of percentages
    const mean = distribution.reduce((sum, d) => sum + d.percentage, 0) / distribution.length;
    const variance = distribution.reduce((sum, d) => sum + Math.pow(d.percentage - mean, 2), 0) / distribution.length;

    // Normalize variance (0-10000 -> 0-1)
    const normalizedVariance = Math.min(variance / 1000, 1);
    return 1 - normalizedVariance;
  }

  /**
   * Calculate consistency (0-1)
   */
  private calculateConsistency(sessions: MovementSession[], avgSessionsPerWeek: number): number {
    if (sessions.length < 2) return 0;

    // Calculate variance in sessions per week over time
    const weeklyCounts: Record<string, number> = {};

    for (const session of sessions) {
      const date = new Date(session.timestamp);
      const weekKey = this.getWeekKey(date);
      weeklyCounts[weekKey] = (weeklyCounts[weekKey] || 0) + 1;
    }

    const counts = Object.values(weeklyCounts);
    if (counts.length < 2) return 0.5;

    const mean = counts.reduce((sum, c) => sum + c, 0) / counts.length;
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    // Lower std dev relative to mean = higher consistency
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    return Math.max(0, 1 - Math.min(coefficientOfVariation, 1));
  }

  /**
   * Get week key for grouping (YYYY-WW)
   */
  private getWeekKey(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  }

  /**
   * Get intensity distribution
   */
  private getIntensityDistribution(intensities: number[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    const total = intensities.length;

    for (let i = 1; i <= 5; i++) {
      distribution[i] = intensities.filter(int => int === i).length / total * 100;
    }

    return distribution;
  }

  /**
   * Calculate average
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private getCacheKey(
    userId: string,
    structure: TrackerStructure,
    timeWindow: { days: number }
  ): string {
    const signature = this.getStructureSignature(structure);
    return `${userId}|${timeWindow.days}|${signature}`;
  }

  private getStructureSignature(structure: TrackerStructure): string {
    const categories = (structure.categories || []).map(c => ({
      id: c.id,
      domain: c.domain,
      name: c.name,
    }));
    // Convert Record<string, TrackerSubcategory[]> to flat array
    const subcategoriesRecord = structure.subcategories || {};
    const subcategories = Object.values(subcategoriesRecord)
      .flat()
      .map(s => ({
        id: s.id,
        parentCategory: s.parentCategory, // Use parentCategory instead of categoryId
        name: s.name,
      }));
    const fields = (structure.availableFields || []).map(f => ({
      id: f.id,
      type: f.type,
    }));
    const patternConfig = structure.patternConfig || {};
    return JSON.stringify({ categories, subcategories, fields, patternConfig });
  }

  private async getLatestSessionDateForWindow(
    userId: string,
    structure: TrackerStructure,
    timeWindow: { days: number }
  ): Promise<string | null> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeWindow.days);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const dates: string[] = [];
    for (const category of structure.categories || []) {
      try {
        const sessions = await this.sessionService.listSessions(userId, category.domain, {
          startDate: startDateStr,
          endDate: endDateStr,
          limit: 1,
          forceRefresh: true,
        });
        if (sessions[0]?.timestamp) {
          dates.push(sessions[0].timestamp);
        }
      } catch (error) {
        console.error(`Failed to check latest session for ${category.domain}:`, error);
      }
    }

    if (dates.length === 0) return null;
    return dates.reduce((latest, current) =>
      new Date(current).getTime() > new Date(latest).getTime() ? current : latest
    );
  }

  private getLatestSessionDateFromSessions(sessions: MovementSession[]): string | null {
    if (sessions.length === 0) return null;
    return sessions.reduce(
      (latest, current) =>
        new Date(current.timestamp).getTime() > new Date(latest).getTime()
          ? current.timestamp
          : latest,
      sessions[0].timestamp
    );
  }

  private isSameOrBefore(
    nextDate: string | null,
    previousDate: string | null
  ): boolean {
    if (!nextDate && !previousDate) return true;
    if (!nextDate) return true;
    if (!previousDate) return false;
    return new Date(nextDate).getTime() <= new Date(previousDate).getTime();
  }
}
