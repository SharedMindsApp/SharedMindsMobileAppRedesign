/**
 * Body Transformation Intelligence Service
 * 
 * Cross-tracker correlation between body measurements and fitness activity.
 * Uses inference, not false precision. Observations only, no advice.
 */

import { BodyMeasurementService } from './bodyMeasurementService';
import { MovementSessionService } from './movementSessionService';
import { DomainAwarePatternService } from './domainAwarePatternService';
import type { MovementSession, UserMovementProfile } from './types';
import type {
  BodyMeasurementEntry,
  BodyTransformationInsight,
  MeasurementTrend,
  BodyStateSummary,
  TrainingPhase,
  TrainingPhaseDetection,
  OutlierDetection,
  CompositeIndex,
  TemporalPattern,
  RecoveryIndicator,
} from './bodyTransformationTypes';

export class BodyTransformationIntelligenceService {
  private measurementService = new BodyMeasurementService();
  private sessionService = new MovementSessionService();
  private patternService = new DomainAwarePatternService();

  /**
   * Generate body transformation insights
   * Correlates body measurements with fitness activity
   */
  async generateInsights(
    userId: string,
    profile: UserMovementProfile,
    timeWindow: { days: number } = { days: 56 }
  ): Promise<BodyTransformationInsight[]> {
    const insights: BodyTransformationInsight[] = [];

    // Get measurements in time window
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeWindow.days);

    const measurements = await this.measurementService.listMeasurements(userId, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      orderBy: 'measurement_date',
      orderDirection: 'asc',
    });

    if (measurements.length < 2) {
      // Not enough data for insights
      return [];
    }

    // Get fitness sessions in same time window
    const allSessions: MovementSession[] = [];
    if (profile.trackerStructure) {
      for (const category of profile.trackerStructure.categories || []) {
        try {
          const domainSessions = await this.sessionService.listSessions(userId, category.domain, {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            limit: 1000,
          });
          allSessions.push(...domainSessions);
        } catch (error) {
          console.error(`Failed to load sessions for ${category.domain}:`, error);
        }
      }
    }

    // Analyze measurement trends
    const trends = this.analyzeTrends(measurements);

    // Detect training phase
    const trainingPhase = this.detectTrainingPhase(allSessions, timeWindow.days);

    // Generate insights based on patterns
    insights.push(...this.detectMuscleGainSignals(measurements, allSessions, trends, timeWindow.days, trainingPhase));
    insights.push(...this.detectFatLossSignals(measurements, allSessions, trends, timeWindow.days, trainingPhase));
    insights.push(...this.detectRecompositionSignals(measurements, allSessions, trends, timeWindow.days, trainingPhase));
    insights.push(...this.detectTrainingCorrelations(measurements, allSessions, timeWindow.days, trainingPhase));
    
    // Phase 2: Additional insight types
    insights.push(...this.detectCompositeIndexChanges(measurements, trends, timeWindow.days));
    insights.push(...this.generateTemporalPatternInsights(measurements, timeWindow.days));
    
    // Recovery indicators are returned as separate objects (not insights), but can generate insights
    const recoveryIndicators = this.detectRecoveryIndicators(measurements, allSessions, trends, trainingPhase, timeWindow.days);
    insights.push(...this.convertRecoveryIndicatorsToInsights(recoveryIndicators));

    // Sort by confidence and timestamp
    return insights.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      const confDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      if (confDiff !== 0) return confDiff;
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
    });
  }

  /**
   * Get body state summary
   */
  async getBodyStateSummary(userId: string): Promise<BodyStateSummary> {
    const latestMeasurement = await this.measurementService.getLatestMeasurement(userId);
    const measurements = await this.measurementService.listMeasurements(userId, {
      limit: 100,
      orderBy: 'measurement_date',
      orderDirection: 'desc',
    });

    const trends = this.analyzeTrends(measurements);
    
    // Generate insights (last 8 weeks)
    const profile = await this.getProfileForInsights(userId);
    const insights = profile ? await this.generateInsights(userId, profile, { days: 56 }) : [];

    // Detect training phase (last 8 weeks)
    let trainingPhase: TrainingPhaseDetection | null = null;
    if (profile) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 56);
      
      const allSessions: MovementSession[] = [];
      if (profile.trackerStructure) {
        for (const category of profile.trackerStructure.categories || []) {
          try {
            const domainSessions = await this.sessionService.listSessions(userId, category.domain, {
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0],
              limit: 1000,
            });
            allSessions.push(...domainSessions);
          } catch (error) {
            console.error(`Failed to load sessions for ${category.domain}:`, error);
          }
        }
      }
      trainingPhase = this.detectTrainingPhase(allSessions, 56);
    }

    // Detect outliers (if latest measurement exists)
    const outlierDetections = latestMeasurement
      ? this.detectOutliers(measurements.filter(m => m.id !== latestMeasurement.id), latestMeasurement)
      : [];

    const daysSinceLastMeasurement = latestMeasurement
      ? Math.floor((Date.now() - new Date(latestMeasurement.measurementDate).getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    // Calculate composite indices (Phase 2)
    const compositeIndices = this.calculateCompositeIndices(measurements);
    
    // Detect temporal patterns (Phase 2)
    const temporalPatterns = this.detectTemporalPatterns(measurements, 365); // Look at full year for seasonal patterns
    
    // Generate recovery indicators (Phase 2)
    const recoveryIndicators: RecoveryIndicator[] = [];
    if (profile) {
      recoveryIndicators.push(...this.detectRecoveryIndicators(measurements, allSessions, trends, trainingPhase, 56));
    }

    return {
      latestMeasurement: latestMeasurement || undefined,
      trends,
      insights,
      measurementCount: measurements.length,
      lastMeasurementDate: latestMeasurement?.measurementDate,
      daysSinceLastMeasurement,
      trainingPhase: trainingPhase || undefined,
      outlierDetections: outlierDetections.length > 0 ? outlierDetections : undefined,
      compositeIndices: compositeIndices.length > 0 ? compositeIndices : undefined,
      temporalPatterns: temporalPatterns.length > 0 ? temporalPatterns : undefined,
      recoveryIndicators: recoveryIndicators.length > 0 ? recoveryIndicators : undefined,
    };
  }

  /**
   * Analyze measurement trends
   */
  private analyzeTrends(measurements: BodyMeasurementEntry[]): MeasurementTrend[] {
    const trends: MeasurementTrend[] = [];

    if (measurements.length < 2) return trends;

    // Analyze bodyweight
    const bodyweightValues = measurements
      .filter(m => m.bodyweightKg)
      .map(m => ({ date: m.measurementDate, value: m.bodyweightKg! }));
    
    if (bodyweightValues.length >= 2) {
      trends.push(this.calculateTrend('bodyweight', 'kg', bodyweightValues));
    }

    // Analyze circumferences
    const circumferenceMetrics: Array<{ key: keyof BodyMeasurementEntry; metric: 'waist' | 'hips' | 'chest' | 'thigh' | 'arm' }> = [
      { key: 'waistCm', metric: 'waist' },
      { key: 'hipsCm', metric: 'hips' },
      { key: 'chestCm', metric: 'chest' },
      { key: 'thighCm', metric: 'thigh' },
      { key: 'armCm', metric: 'arm' },
    ];

    for (const { key, metric } of circumferenceMetrics) {
      const values = measurements
        .filter(m => m[key] as number)
        .map(m => ({ date: m.measurementDate, value: m[key] as number }));
      
      if (values.length >= 2) {
        trends.push(this.calculateTrend(metric, 'cm', values));
      }
    }

    return trends;
  }

  /**
   * Calculate trend for a metric
   */
  private calculateTrend(
    metric: 'bodyweight' | 'waist' | 'hips' | 'chest' | 'thigh' | 'arm',
    unit: 'kg' | 'cm' | 'lb' | 'in',
    values: Array<{ date: string; value: number }>
  ): MeasurementTrend {
    const sorted = values.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const change = last.value - first.value;
    const percentage = (change / first.value) * 100;
    const period = `${Math.floor((new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24))} days`;

    let trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
    if (Math.abs(change) < 0.5) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Calculate statistics for enhanced trend analysis
    const mean = sorted.reduce((sum, v) => sum + v.value, 0) / sorted.length;
    const variance = sorted.reduce((sum, v) => sum + Math.pow(v.value - mean, 2), 0) / sorted.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean !== 0 ? (standardDeviation / mean) * 100 : undefined;

    // Check for fluctuation (variance > mean change)
    if (sorted.length > 3) {
      if (variance > Math.abs(change) * 0.5) {
        trend = 'fluctuating';
      }
    }

    // Calculate 7-day moving average (if enough data)
    let movingAverage: number | undefined;
    if (sorted.length >= 7) {
      const last7Days = sorted.slice(-7);
      movingAverage = last7Days.reduce((sum, v) => sum + v.value, 0) / 7;
    }

    // Calculate recent velocity (rate of change per week in last 30% of data)
    let recentVelocity: number | undefined;
    if (sorted.length >= 4) {
      const recentSlice = sorted.slice(-Math.ceil(sorted.length * 0.3));
      if (recentSlice.length >= 2) {
        const recentFirst = recentSlice[0];
        const recentLast = recentSlice[recentSlice.length - 1];
        const recentChange = recentLast.value - recentFirst.value;
        const recentDays = Math.max(1, Math.floor(
          (new Date(recentLast.date).getTime() - new Date(recentFirst.date).getTime()) / (1000 * 60 * 60 * 24)
        ));
        recentVelocity = (recentChange / recentDays) * 7; // Per week
      }
    }

    return {
      metric,
      unit,
      values: sorted,
      trend,
      changeOverPeriod: {
        value: change,
        percentage: Math.abs(percentage) > 0.1 ? percentage : undefined,
        period,
      },
      movingAverage,
      standardDeviation: standardDeviation > 0.01 ? standardDeviation : undefined,
      coefficientOfVariation,
      recentVelocity,
    };
  }

  /**
   * Detect muscle gain signals
   */
  private detectMuscleGainSignals(
    measurements: BodyMeasurementEntry[],
    sessions: MovementSession[],
    trends: MeasurementTrend[],
    days: number,
    trainingPhase?: TrainingPhaseDetection | null
  ): BodyTransformationInsight[] {
    const insights: BodyTransformationInsight[] = [];

    const bodyweightTrend = trends.find(t => t.metric === 'bodyweight');
    const armTrend = trends.find(t => t.metric === 'arm');
    const chestTrend = trends.find(t => t.metric === 'chest');

    // Muscle gain signal: bodyweight stable or slightly increasing + arm/chest increasing
    if (bodyweightTrend && (bodyweightTrend.trend === 'stable' || bodyweightTrend.trend === 'increasing')) {
      if (armTrend?.trend === 'increasing' || chestTrend?.trend === 'increasing') {
        const measurementChanges: Record<string, number> = {};
        if (armTrend?.changeOverPeriod) measurementChanges.arm = armTrend.changeOverPeriod.value;
        if (chestTrend?.changeOverPeriod) measurementChanges.chest = chestTrend.changeOverPeriod.value;

        // Check if training volume is consistent or increasing
        const sessionCount = sessions.length;
        const avgSessionsPerWeek = (sessionCount / days) * 7;

        insights.push({
          type: 'muscle_gain_signal',
          message: `Bodyweight ${bodyweightTrend.trend} while ${armTrend?.trend === 'increasing' ? 'arms' : 'chest'} measurements increased. This pattern suggests muscle gain.`,
          confidence: avgSessionsPerWeek >= 2 ? 'medium' : 'low',
          timeFrame: `last ${Math.floor(days / 7)} weeks`,
          supportingData: {
            bodyMeasurements: measurements,
            trainingSessions: sessionCount,
            measurementChanges,
            trainingPhase: trainingPhase?.phase,
          },
          generatedAt: new Date().toISOString(),
        });
      }
    }

    return insights;
  }

  /**
   * Detect fat loss signals
   */
  private detectFatLossSignals(
    measurements: BodyMeasurementEntry[],
    sessions: MovementSession[],
    trends: MeasurementTrend[],
    days: number,
    trainingPhase?: TrainingPhaseDetection | null
  ): BodyTransformationInsight[] {
    const insights: BodyTransformationInsight[] = [];

    const bodyweightTrend = trends.find(t => t.metric === 'bodyweight');
    const waistTrend = trends.find(t => t.metric === 'waist');

    // Fat loss signal: bodyweight decreasing + waist decreasing
    if (bodyweightTrend?.trend === 'decreasing' && waistTrend?.trend === 'decreasing') {
      const measurementChanges: Record<string, number> = {};
      if (bodyweightTrend.changeOverPeriod) measurementChanges.bodyweight = bodyweightTrend.changeOverPeriod.value;
      if (waistTrend.changeOverPeriod) measurementChanges.waist = waistTrend.changeOverPeriod.value;

      const sessionCount = sessions.length;
      const strengthMaintained = this.checkStrengthMaintained(sessions);

      insights.push({
        type: 'fat_loss_signal',
        message: `Bodyweight and waist measurements decreased. ${strengthMaintained ? 'Strength appears maintained.' : ''} This pattern suggests fat loss.`,
        confidence: strengthMaintained ? 'high' : 'medium',
        timeFrame: `last ${Math.floor(days / 7)} weeks`,
        supportingData: {
          bodyMeasurements: measurements,
          trainingSessions: sessionCount,
          strengthTrend: strengthMaintained ? 'stable' : undefined,
          measurementChanges,
          trainingPhase: trainingPhase?.phase,
        },
        generatedAt: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Detect recomposition signals
   */
  private detectRecompositionSignals(
    measurements: BodyMeasurementEntry[],
    sessions: MovementSession[],
    trends: MeasurementTrend[],
    days: number,
    trainingPhase?: TrainingPhaseDetection | null
  ): BodyTransformationInsight[] {
    const insights: BodyTransformationInsight[] = [];

    const bodyweightTrend = trends.find(t => t.metric === 'bodyweight');
    const waistTrend = trends.find(t => t.metric === 'waist');
    const armTrend = trends.find(t => t.metric === 'arm');
    const chestTrend = trends.find(t => t.metric === 'chest');

    // Recomposition: bodyweight stable + waist decreasing + arm/chest increasing
    if (
      bodyweightTrend?.trend === 'stable' &&
      (waistTrend?.trend === 'decreasing') &&
      (armTrend?.trend === 'increasing' || chestTrend?.trend === 'increasing')
    ) {
      const measurementChanges: Record<string, number> = {};
      if (waistTrend?.changeOverPeriod) measurementChanges.waist = waistTrend.changeOverPeriod.value;
      if (armTrend?.changeOverPeriod) measurementChanges.arm = armTrend.changeOverPeriod.value;
      if (chestTrend?.changeOverPeriod) measurementChanges.chest = chestTrend.changeOverPeriod.value;

      const strengthTrend = this.inferStrengthTrend(sessions);

      insights.push({
        type: 'recomposition_signal',
        message: `Bodyweight stable while waist decreased and ${armTrend?.trend === 'increasing' ? 'arms' : 'chest'} increased. ${strengthTrend === 'increasing' ? 'Strength is increasing.' : ''} This pattern suggests body recomposition.`,
        confidence: strengthTrend === 'increasing' ? 'high' : 'medium',
        timeFrame: `last ${Math.floor(days / 7)} weeks`,
        supportingData: {
          bodyMeasurements: measurements,
          trainingSessions: sessions.length,
          strengthTrend,
          measurementChanges,
          trainingPhase: trainingPhase?.phase,
        },
        generatedAt: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Detect training correlations
   */
  private detectTrainingCorrelations(
    measurements: BodyMeasurementEntry[],
    sessions: MovementSession[],
    days: number,
    trainingPhase?: TrainingPhaseDetection | null
  ): BodyTransformationInsight[] {
    const insights: BodyTransformationInsight[] = [];

    if (measurements.length < 2 || sessions.length === 0) return insights;

    // Check if bodyweight remained stable during increased training
    const firstHalf = Math.floor(measurements.length / 2);
    const secondHalf = measurements.slice(firstHalf);

    const firstHalfAvg = measurements.slice(0, firstHalf)
      .filter(m => m.bodyweightKg)
      .reduce((sum, m) => sum + (m.bodyweightKg || 0), 0) / firstHalf;
    
    const secondHalfAvg = secondHalf
      .filter(m => m.bodyweightKg)
      .reduce((sum, m) => sum + (m.bodyweightKg || 0), 0) / secondHalf.length;

    const weightChange = secondHalfAvg - firstHalfAvg;
    const sessionChange = sessions.length / 2; // Rough estimate

    if (Math.abs(weightChange) < 1 && sessions.length >= 8) {
      const phaseInfo = trainingPhase 
        ? ` during your ${trainingPhase.phase.replace('_', ' ')} phase`
        : '';
      
      insights.push({
        type: 'training_correlation',
        message: `Bodyweight remained stable during a period of ${sessions.length} training sessions${phaseInfo}. This suggests training load and recovery are balanced.`,
        confidence: 'medium',
        timeFrame: `last ${Math.floor(days / 7)} weeks`,
        supportingData: {
          bodyMeasurements: measurements,
          trainingSessions: sessions.length,
          trainingPhase: trainingPhase?.phase,
        },
        generatedAt: new Date().toISOString(),
      });
    }

    // Add training phase correlation insight if phase detected
    // Note: We calculate simple trend from measurements since trends parameter not available
    if (trainingPhase && trainingPhase.confidence !== 'low' && measurements.length >= 2) {
      const bodyweightMeasurements = measurements.filter(m => m.bodyweightKg);
      if (bodyweightMeasurements.length >= 2) {
        const sorted = bodyweightMeasurements.sort((a, b) => 
          new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
        );
        const first = sorted[0].bodyweightKg!;
        const last = sorted[sorted.length - 1].bodyweightKg!;
        const change = last - first;
        let trendWord: string;
        if (Math.abs(change) < 0.5) trendWord = 'stable';
        else if (change > 0) trendWord = 'increasing';
        else trendWord = 'decreasing';
        
        insights.push({
          type: 'training_phase_correlation',
          message: `During your ${trainingPhase.phase.replace('_', ' ')} phase (${trainingPhase.sessionsPerWeek} sessions/week), bodyweight trend was ${trendWord}. This pattern suggests how your body responds to this training approach.`,
          confidence: trainingPhase.confidence,
          timeFrame: trainingPhase.timeFrame,
          supportingData: {
            bodyMeasurements: measurements,
            trainingSessions: sessions.length,
            trainingPhase: trainingPhase.phase,
          },
          generatedAt: new Date().toISOString(),
        });
      }
    }

    return insights;
  }

  /**
   * Check if strength is maintained (inference from training patterns)
   */
  private checkStrengthMaintained(sessions: MovementSession[]): boolean {
    // Infer strength from gym sessions with exercises
    const gymSessions = sessions.filter(s => s.domain === 'gym' && s.exercises && s.exercises.length > 0);
    if (gymSessions.length < 4) return false; // Not enough data

    // Simple heuristic: if weights/loads are stable or increasing, strength likely maintained
    // This is inference, not precise measurement
    return gymSessions.length >= 4; // If consistently training, assume strength maintained
  }

  /**
   * Infer strength trend (inference, not measurement)
   */
  private inferStrengthTrend(sessions: MovementSession[]): 'increasing' | 'stable' | 'decreasing' {
    const gymSessions = sessions.filter(s => s.domain === 'gym' && s.exercises && s.exercises.length > 0);
    if (gymSessions.length < 4) return 'stable';

    // Simple inference: if training consistently, strength likely stable or increasing
    // More sessions = more likely increasing (inference, not measurement)
    return gymSessions.length >= 8 ? 'increasing' : 'stable';
  }

  /**
   * Detect training phase (inference-based)
   * Phase 1: Simple detection based on volume and intensity patterns
   */
  detectTrainingPhase(
    sessions: MovementSession[],
    days: number
  ): TrainingPhaseDetection | null {
    if (sessions.length < 4) return null; // Not enough data

    // Calculate sessions per week
    const sessionsPerWeek = (sessions.length / days) * 7;
    
    // Calculate average intensity (if available)
    const sessionsWithIntensity = sessions.filter(s => s.perceivedIntensity);
    const avgIntensity = sessionsWithIntensity.length > 0
      ? sessionsWithIntensity.reduce((sum, s) => sum + (s.perceivedIntensity || 0), 0) / sessionsWithIntensity.length
      : undefined;

    // Group sessions by week for trend analysis
    const weeks = Math.ceil(days / 7);
    const sessionsByWeek: number[] = [];
    const intensityByWeek: number[] = [];

    for (let week = 0; week < weeks; week++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weeks - week) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekSessions = sessions.filter(s => {
        const sessionDate = new Date(s.timestamp);
        return sessionDate >= weekStart && sessionDate < weekEnd;
      });
      sessionsByWeek.push(weekSessions.length);
      
      const weekIntensity = weekSessions
        .filter(s => s.perceivedIntensity)
        .reduce((sum, s) => sum + (s.perceivedIntensity || 0), 0) / Math.max(1, weekSessions.length);
      if (weekSessions.length > 0) {
        intensityByWeek.push(weekIntensity);
      }
    }

    // Detect phase based on patterns
    let phase: TrainingPhase = 'unknown';
    let confidence: 'low' | 'medium' | 'high' = 'low';
    let description = '';

    // Volume Building: Increasing sessions/week, stable or increasing intensity
    if (sessionsByWeek.length >= 3) {
      const firstHalfAvg = sessionsByWeek.slice(0, Math.floor(sessionsByWeek.length / 2))
        .reduce((sum, v) => sum + v, 0) / Math.floor(sessionsByWeek.length / 2);
      const secondHalfAvg = sessionsByWeek.slice(Math.floor(sessionsByWeek.length / 2))
        .reduce((sum, v) => sum + v, 0) / Math.ceil(sessionsByWeek.length / 2);
      
      if (secondHalfAvg > firstHalfAvg * 1.2 && sessionsPerWeek >= 3) {
        phase = 'volume_building';
        confidence = sessionsByWeek.length >= 4 ? 'medium' : 'low';
        description = 'Training volume is increasing while intensity remains stable or increases';
      }
    }

    // Intensity Focus: Stable sessions/week, increasing intensity
    if (phase === 'unknown' && intensityByWeek.length >= 3) {
      const firstHalfIntensity = intensityByWeek.slice(0, Math.floor(intensityByWeek.length / 2))
        .reduce((sum, v) => sum + v, 0) / Math.floor(intensityByWeek.length / 2);
      const secondHalfIntensity = intensityByWeek.slice(Math.floor(intensityByWeek.length / 2))
        .reduce((sum, v) => sum + v, 0) / Math.ceil(intensityByWeek.length / 2);
      
      if (secondHalfIntensity > firstHalfIntensity + 0.5 && Math.abs(sessionsByWeek[0] - sessionsByWeek[sessionsByWeek.length - 1]) <= 1) {
        phase = 'intensity_focus';
        confidence = intensityByWeek.length >= 4 ? 'medium' : 'low';
        description = 'Training intensity is increasing while volume remains stable';
      }
    }

    // Deload/Recovery: Decreasing sessions/week or intensity
    if (phase === 'unknown' && sessionsByWeek.length >= 3) {
      const lastWeekSessions = sessionsByWeek[sessionsByWeek.length - 1];
      const avgSessions = sessionsByWeek.reduce((sum, v) => sum + v, 0) / sessionsByWeek.length;
      
      if (lastWeekSessions < avgSessions * 0.7 || sessionsPerWeek < 2) {
        phase = 'deload_recovery';
        confidence = sessionsByWeek.length >= 4 ? 'medium' : 'low';
        description = 'Training volume or intensity is reduced for recovery';
      }
    }

    // Maintenance: Stable volume and intensity
    if (phase === 'unknown' && sessionsByWeek.length >= 3) {
      const variance = sessionsByWeek.reduce((sum, v) => {
        const avg = sessionsByWeek.reduce((s, x) => s + x, 0) / sessionsByWeek.length;
        return sum + Math.pow(v - avg, 2);
      }, 0) / sessionsByWeek.length;
      
      if (variance < 1 && sessionsPerWeek >= 2 && sessionsPerWeek <= 5) {
        phase = 'maintenance';
        confidence = sessionsByWeek.length >= 4 ? 'high' : 'medium';
        description = 'Training volume and intensity are relatively stable';
      }
    }

    if (phase === 'unknown') {
      return null; // Can't determine phase
    }

    return {
      phase,
      confidence,
      description,
      timeFrame: `last ${Math.floor(days / 7)} weeks`,
      sessionsPerWeek: Math.round(sessionsPerWeek * 10) / 10,
      avgIntensity: avgIntensity ? Math.round(avgIntensity * 10) / 10 : undefined,
    };
  }

  /**
   * Detect outliers in measurements (soft detection with context suggestions)
   * Phase 1: Simple statistical outlier detection
   */
  detectOutliers(
    measurements: BodyMeasurementEntry[],
    newMeasurement?: BodyMeasurementEntry
  ): OutlierDetection[] {
    const detections: OutlierDetection[] = [];

    if (measurements.length < 3) return detections; // Need at least 3 measurements for comparison

    // Check each metric for outliers
    const metrics: Array<{ key: keyof BodyMeasurementEntry; metric: 'bodyweight' | 'waist' | 'hips' | 'chest' | 'thigh' | 'arm' }> = [
      { key: 'bodyweightKg', metric: 'bodyweight' },
      { key: 'waistCm', metric: 'waist' },
      { key: 'hipsCm', metric: 'hips' },
      { key: 'chestCm', metric: 'chest' },
      { key: 'thighCm', metric: 'thigh' },
      { key: 'armCm', metric: 'arm' },
    ];

    for (const { key, metric } of metrics) {
      const values = measurements
        .filter(m => m[key] as number | undefined)
        .map(m => (m[key] as number));

      if (values.length < 3) continue; // Not enough data for this metric

      // Calculate mean and standard deviation
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Check if new measurement is an outlier (> 2 standard deviations)
      if (newMeasurement && newMeasurement[key]) {
        const newValue = newMeasurement[key] as number;
        const deviation = Math.abs(newValue - mean);
        const zScore = stdDev > 0 ? deviation / stdDev : 0;

        if (zScore > 2) {
          // Suggest context tags based on metric and direction
          const suggestedContext: MeasurementContextTag[] = [];
          if (newValue > mean) {
            suggestedContext.push('post_training', 'evening');
          } else {
            suggestedContext.push('morning_fasted');
          }

          detections.push({
            isOutlier: true,
            metric,
            value: newValue,
            deviation: Math.round(zScore * 10) / 10,
            suggestedContext: suggestedContext.length > 0 ? suggestedContext : undefined,
            message: `This ${metric} measurement (${newValue}${metric === 'bodyweight' ? 'kg' : 'cm'}) is significantly different from your recent average (${Math.round(mean * 10) / 10}${metric === 'bodyweight' ? 'kg' : 'cm'}). Is there any context?`,
          });
        }
      }
    }

    return detections;
  }

  /**
   * Calculate composite indices (WHR, ratios)
   * Phase 2: Multi-metric correlation analysis
   */
  calculateCompositeIndices(measurements: BodyMeasurementEntry[]): CompositeIndex[] {
    const indices: CompositeIndex[] = [];

    if (measurements.length < 2) return indices;

    // Filter measurements with required data for each ratio
    const validMeasurements = measurements.filter(m => {
      // Need at least 2 metrics for any ratio
      const hasWaist = m.waistCm !== undefined;
      const hasHips = m.hipsCm !== undefined;
      const hasChest = m.chestCm !== undefined;
      const hasArm = m.armCm !== undefined;
      return (hasWaist && hasHips) || (hasWaist && hasChest) || (hasWaist && hasArm);
    });

    if (validMeasurements.length < 2) return indices;

    // Waist-to-Hip Ratio (WHR)
    const whrMeasurements = validMeasurements.filter(m => m.waistCm && m.hipsCm);
    if (whrMeasurements.length >= 2) {
      const whrValues = whrMeasurements.map(m => ({
        date: m.measurementDate,
        value: (m.waistCm! / m.hipsCm!),
      }));

      const sorted = whrValues.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const change = last.value - first.value;
      const period = `${Math.floor((new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24))} days`;

      let trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating' = 'stable';
      if (Math.abs(change) > 0.01) {
        trend = change > 0 ? 'increasing' : 'decreasing';
      }

      indices.push({
        type: 'waist_to_hip_ratio',
        value: last.value,
        trend,
        changeOverPeriod: {
          value: Math.round(change * 100) / 100,
          percentage: Math.abs((change / first.value) * 100) > 1 ? Math.round((change / first.value) * 100 * 10) / 10 : undefined,
          period,
        },
        latestDate: last.date,
        historicalValues: sorted,
      });
    }

    // Chest-to-Waist Ratio
    const cwrMeasurements = validMeasurements.filter(m => m.chestCm && m.waistCm);
    if (cwrMeasurements.length >= 2) {
      const cwrValues = cwrMeasurements.map(m => ({
        date: m.measurementDate,
        value: (m.chestCm! / m.waistCm!),
      }));

      const sorted = cwrValues.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const change = last.value - first.value;
      const period = `${Math.floor((new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24))} days`;

      let trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating' = 'stable';
      if (Math.abs(change) > 0.01) {
        trend = change > 0 ? 'increasing' : 'decreasing';
      }

      indices.push({
        type: 'chest_to_waist_ratio',
        value: last.value,
        trend,
        changeOverPeriod: {
          value: Math.round(change * 100) / 100,
          percentage: Math.abs((change / first.value) * 100) > 1 ? Math.round((change / first.value) * 100 * 10) / 10 : undefined,
          period,
        },
        latestDate: last.date,
        historicalValues: sorted,
      });
    }

    // Arm-to-Waist Ratio
    const awrMeasurements = validMeasurements.filter(m => m.armCm && m.waistCm);
    if (awrMeasurements.length >= 2) {
      const awrValues = awrMeasurements.map(m => ({
        date: m.measurementDate,
        value: (m.armCm! / m.waistCm!),
      }));

      const sorted = awrValues.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const change = last.value - first.value;
      const period = `${Math.floor((new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24))} days`;

      let trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating' = 'stable';
      if (Math.abs(change) > 0.01) {
        trend = change > 0 ? 'increasing' : 'decreasing';
      }

      indices.push({
        type: 'arm_to_waist_ratio',
        value: last.value,
        trend,
        changeOverPeriod: {
          value: Math.round(change * 100) / 100,
          percentage: Math.abs((change / first.value) * 100) > 1 ? Math.round((change / first.value) * 100 * 10) / 10 : undefined,
          period,
        },
        latestDate: last.date,
        historicalValues: sorted,
      });
    }

    return indices;
  }

  /**
   * Detect composite index changes and generate insights
   * Phase 2: Multi-metric correlation
   */
  private detectCompositeIndexChanges(
    measurements: BodyMeasurementEntry[],
    trends: MeasurementTrend[],
    days: number
  ): BodyTransformationInsight[] {
    const insights: BodyTransformationInsight[] = [];
    const indices = this.calculateCompositeIndices(measurements);

    for (const index of indices) {
      if (index.trend !== 'stable' && index.changeOverPeriod) {
        const change = index.changeOverPeriod.value;
        const direction = index.trend === 'increasing' ? 'increased' : 'decreased';

        let message = '';
        if (index.type === 'waist_to_hip_ratio') {
          if (index.trend === 'decreasing') {
            message = `Waist-to-hip ratio ${direction} from ${(index.value - change).toFixed(2)} to ${index.value.toFixed(2)}. This pattern suggests changes in body fat distribution.`;
          } else {
            message = `Waist-to-hip ratio ${direction}. This pattern suggests body shape changes.`;
          }
        } else if (index.type === 'chest_to_waist_ratio') {
          if (index.trend === 'increasing') {
            message = `Chest-to-waist ratio ${direction}. This pattern suggests upper body development relative to waist size.`;
          } else {
            message = `Chest-to-waist ratio ${direction}. This pattern suggests proportional body changes.`;
          }
        } else if (index.type === 'arm_to_waist_ratio') {
          if (index.trend === 'increasing') {
            message = `Arm-to-waist ratio ${direction}. This pattern suggests arm development relative to waist size.`;
          } else {
            message = `Arm-to-waist ratio ${direction}. This pattern suggests proportional changes.`;
          }
        }

        if (message) {
          insights.push({
            type: 'composite_index_change',
            message,
            confidence: measurements.length >= 4 ? 'medium' : 'low',
            timeFrame: index.changeOverPeriod.period,
            supportingData: {
              bodyMeasurements: measurements,
              compositeIndex: index.type,
            },
            generatedAt: new Date().toISOString(),
          });
        }
      }
    }

    return insights;
  }

  /**
   * Detect temporal patterns (seasonal, weekly, monthly)
   * Phase 2: Temporal pattern recognition
   */
  detectTemporalPatterns(
    measurements: BodyMeasurementEntry[],
    days: number = 365
  ): TemporalPattern[] {
    const patterns: TemporalPattern[] = [];

    if (measurements.length < 4) return patterns; // Need at least 4 measurements

    // Group measurements by metric
    const metrics: Array<{ key: keyof BodyMeasurementEntry; metric: 'bodyweight' | 'waist' | 'hips' | 'chest' | 'thigh' | 'arm' }> = [
      { key: 'bodyweightKg', metric: 'bodyweight' },
      { key: 'waistCm', metric: 'waist' },
    ];

    for (const { key, metric } of metrics) {
      const values = measurements
        .filter(m => m[key] as number)
        .map(m => ({
          date: new Date(m.measurementDate),
          value: m[key] as number,
          month: new Date(m.measurementDate).getMonth(),
          dayOfWeek: new Date(m.measurementDate).getDay(),
        }));

      if (values.length < 4) continue;

      // Seasonal pattern detection (month-based)
      if (days >= 180) { // Need at least 6 months of data
        const byMonth = new Map<number, number[]>();
        values.forEach(v => {
          if (!byMonth.has(v.month)) byMonth.set(v.month, []);
          byMonth.get(v.month)!.push(v.value);
        });

        if (byMonth.size >= 3) {
          const monthAverages = Array.from(byMonth.entries())
            .map(([month, vals]) => ({
              month,
              avg: vals.reduce((sum, v) => sum + v, 0) / vals.length,
            }))
            .sort((a, b) => a.avg - b.avg);

          const highestMonth = monthAverages[monthAverages.length - 1];
          const lowestMonth = monthAverages[0];
          const variation = ((highestMonth.avg - lowestMonth.avg) / lowestMonth.avg) * 100;

          if (variation > 2) { // More than 2% variation indicates pattern
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            patterns.push({
              type: 'seasonal',
              metric,
              pattern: `${metric} tends to be ${lowestMonth.avg < values.reduce((s, v) => s + v.value, 0) / values.length ? 'lowest' : 'highest'} in ${monthNames[lowestMonth.month]} and ${highestMonth.avg > values.reduce((s, v) => s + v.value, 0) / values.length ? 'highest' : 'lowest'} in ${monthNames[highestMonth.month]}`,
              confidence: values.length >= 12 ? 'medium' : 'low',
              examples: values.slice(-6).map(v => ({
                date: v.date.toISOString().split('T')[0],
                value: v.value,
              })),
              timeFrame: `over ${Math.floor(days / 30)} months`,
            });
          }
        }
      }

      // Weekly pattern detection (day-of-week)
      const byDayOfWeek = new Map<number, number[]>();
      values.forEach(v => {
        if (!byDayOfWeek.has(v.dayOfWeek)) byDayOfWeek.set(v.dayOfWeek, []);
        byDayOfWeek.get(v.dayOfWeek)!.push(v.value);
      });

      if (byDayOfWeek.size >= 3 && values.length >= 7) {
        const dayAverages = Array.from(byDayOfWeek.entries())
          .map(([day, vals]) => ({
            day,
            avg: vals.reduce((sum, v) => sum + v, 0) / vals.length,
          }));

        const overallAvg = values.reduce((sum, v) => sum + v.value, 0) / values.length;
        const maxDeviation = Math.max(...dayAverages.map(d => Math.abs(d.avg - overallAvg)));

        if (maxDeviation > overallAvg * 0.02) { // More than 2% deviation
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayWithHighest = dayAverages.reduce((max, d) => d.avg > max.avg ? d : max);
          const dayWithLowest = dayAverages.reduce((min, d) => d.avg < min.avg ? d : min);

          patterns.push({
            type: 'weekly',
            metric,
            pattern: `${metric} measurements tend to be higher on ${dayNames[dayWithHighest.day]} and lower on ${dayNames[dayWithLowest.day]}`,
            confidence: 'low', // Weekly patterns are often noise
            examples: values.slice(-7).map(v => ({
              date: v.date.toISOString().split('T')[0],
              value: v.value,
            })),
            timeFrame: `over ${Math.floor(days / 7)} weeks`,
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect recovery indicators (overtraining signals, adaptation signals)
   * Phase 2: Recovery intelligence
   */
  private detectRecoveryIndicators(
    measurements: BodyMeasurementEntry[],
    sessions: MovementSession[],
    trends: MeasurementTrend[],
    trainingPhase: TrainingPhaseDetection | null | undefined,
    days: number
  ): RecoveryIndicator[] {
    const indicators: RecoveryIndicator[] = [];

    if (measurements.length < 3 || sessions.length < 4) return indicators;

    const bodyweightTrend = trends.find(t => t.metric === 'bodyweight');
    const waistTrend = trends.find(t => t.metric === 'waist');

    // Calculate training metrics
    const sessionsPerWeek = (sessions.length / days) * 7;
    const avgIntensity = sessions
      .filter(s => s.perceivedIntensity)
      .reduce((sum, s) => sum + (s.perceivedIntensity || 0), 0) / Math.max(1, sessions.filter(s => s.perceivedIntensity).length);

    // Overtraining signal: High volume + increasing bodyweight + waist stable/increasing
    if (
      sessionsPerWeek >= 4 &&
      avgIntensity !== undefined && avgIntensity >= 3.5 &&
      bodyweightTrend &&
      bodyweightTrend.trend === 'increasing' &&
      (!waistTrend || waistTrend.trend === 'stable' || waistTrend.trend === 'increasing')
    ) {
      const bodyweightChange = bodyweightTrend.changeOverPeriod?.value || 0;
      
      indicators.push({
        type: 'overtraining_signal',
        message: `Bodyweight increased (${bodyweightChange > 0 ? '+' : ''}${bodyweightChange.toFixed(1)}kg) during a period of high training volume (${sessionsPerWeek.toFixed(1)} sessions/week) and intensity. This might indicate your body needs more recovery time.`,
        confidence: bodyweightChange > 1 ? 'medium' : 'low',
        supportingData: {
          trainingSessions: sessions.length,
          avgIntensity: Math.round(avgIntensity * 10) / 10,
          measurementTrend: bodyweightTrend.trend,
          bodyweightChange,
          trainingPhase: trainingPhase?.phase,
        },
        timeFrame: `last ${Math.floor(days / 7)} weeks`,
        generatedAt: new Date().toISOString(),
      });
    }

    // Positive adaptation: Stable bodyweight + high volume + measurements improving
    if (
      sessionsPerWeek >= 3 &&
      bodyweightTrend &&
      bodyweightTrend.trend === 'stable' &&
      (waistTrend?.trend === 'decreasing' || bodyweightTrend.changeOverPeriod && Math.abs(bodyweightTrend.changeOverPeriod.value) < 0.5)
    ) {
      indicators.push({
        type: 'positive_adaptation',
        message: `Bodyweight remained stable during consistent training (${sessionsPerWeek.toFixed(1)} sessions/week)${waistTrend?.trend === 'decreasing' ? ' while waist measurements decreased' : ''}. This suggests your body is adapting well to the training load.`,
        confidence: sessionsPerWeek >= 4 ? 'medium' : 'low',
        supportingData: {
          trainingSessions: sessions.length,
          avgIntensity,
          measurementTrend: bodyweightTrend.trend,
          trainingPhase: trainingPhase?.phase,
        },
        timeFrame: `last ${Math.floor(days / 7)} weeks`,
        generatedAt: new Date().toISOString(),
      });
    }

    // Training balance: Moderate volume + stable measurements
    if (
      sessionsPerWeek >= 2 &&
      sessionsPerWeek <= 4 &&
      bodyweightTrend &&
      bodyweightTrend.trend === 'stable' &&
      (!waistTrend || waistTrend.trend === 'stable')
    ) {
      indicators.push({
        type: 'training_balance',
        message: `Bodyweight and measurements remained stable during moderate training volume (${sessionsPerWeek.toFixed(1)} sessions/week). This suggests training load and recovery are well-balanced.`,
        confidence: 'medium',
        supportingData: {
          trainingSessions: sessions.length,
          avgIntensity,
          measurementTrend: bodyweightTrend.trend,
          trainingPhase: trainingPhase?.phase,
        },
        timeFrame: `last ${Math.floor(days / 7)} weeks`,
        generatedAt: new Date().toISOString(),
      });
    }

    return indicators;
  }

  /**
   * Enhanced strength progression inference
   * Phase 2: Better exercise load tracking
   */
  inferStrengthProgression(
    sessions: MovementSession[],
    timeWindow: { days: number }
  ): { exercise?: string; loadChange?: number; timeFrame?: string } | null {
    // Filter gym sessions with exercises
    const gymSessions = sessions
      .filter(s => s.domain === 'gym' && s.exercises && s.exercises.length > 0)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (gymSessions.length < 4) return null;

    // Track exercise loads over time
    const exerciseLoads = new Map<string, Array<{ date: string; load: number }>>();

    for (const session of gymSessions) {
      if (!session.exercises) continue;
      
      for (const exercise of session.exercises) {
        if (!exercise.name || !exercise.weightKg || !exercise.sets || !exercise.reps) continue;
        
        const volume = exercise.weightKg * exercise.sets * exercise.reps;
        const exerciseName = exercise.name.toLowerCase();

        if (!exerciseLoads.has(exerciseName)) {
          exerciseLoads.set(exerciseName, []);
        }
        exerciseLoads.get(exerciseName)!.push({
          date: session.timestamp,
          load: volume,
        });
      }
    }

    // Find exercises with clear progression
    let bestExercise: string | null = null;
    let bestProgression: number | null = null;

    for (const [exerciseName, loads] of exerciseLoads.entries()) {
      if (loads.length < 4) continue; // Need at least 4 data points

      const sorted = loads.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
      const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

      const firstAvg = firstHalf.reduce((sum, l) => sum + l.load, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, l) => sum + l.load, 0) / secondHalf.length;

      const progression = ((secondAvg - firstAvg) / firstAvg) * 100;

      if (progression > 5 && (!bestProgression || progression > bestProgression)) {
        bestExercise = exerciseName;
        bestProgression = progression;
      }
    }

    if (bestExercise && bestProgression) {
      return {
        exercise: bestExercise,
        loadChange: Math.round(bestProgression * 10) / 10,
        timeFrame: `last ${Math.floor(timeWindow.days / 7)} weeks`,
      };
    }

    return null;
  }

  /**
   * Generate insights from temporal patterns
   * Phase 2: Convert patterns to insights
   */
  private generateTemporalPatternInsights(
    measurements: BodyMeasurementEntry[],
    days: number
  ): BodyTransformationInsight[] {
    const insights: BodyTransformationInsight[] = [];
    const patterns = this.detectTemporalPatterns(measurements, days);

    for (const pattern of patterns) {
      if (pattern.confidence === 'low' && pattern.type === 'weekly') {
        // Skip weekly patterns - too noisy for insights
        continue;
      }

      insights.push({
        type: 'temporal_pattern',
        message: pattern.pattern + '. (This is an observation, not a prescription.)',
        confidence: pattern.confidence,
        timeFrame: pattern.timeFrame,
        supportingData: {
          bodyMeasurements: measurements,
        },
        generatedAt: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Convert recovery indicators to insights
   * Phase 2: Make recovery signals actionable (observations only)
   */
  private convertRecoveryIndicatorsToInsights(
    indicators: RecoveryIndicator[]
  ): BodyTransformationInsight[] {
    return indicators.map(indicator => ({
      type: 'recovery_signal',
      message: indicator.message,
      confidence: indicator.confidence,
      timeFrame: indicator.timeFrame,
      supportingData: {
        trainingSessions: indicator.supportingData.trainingSessions,
        avgIntensity: indicator.supportingData.avgIntensity,
        measurementTrend: indicator.supportingData.measurementTrend,
        trainingPhase: indicator.supportingData.trainingPhase,
      },
      generatedAt: indicator.generatedAt,
    }));
  }

  /**
   * Get profile for insights (helper)
   */
  private async getProfileForInsights(userId: string): Promise<UserMovementProfile | null> {
    // This is a simplified version - in reality, would use DiscoveryService
    // For now, return null if profile structure needed
    return null; // Simplified - would need to fetch from DiscoveryService
  }
}
