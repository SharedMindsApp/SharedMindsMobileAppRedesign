/**
 * Body Transformation Tracker Types
 * 
 * Type definitions for the Body Transformation Tracker system
 * Embedded within Fitness Tracker as a companion module
 */

/**
 * Measurement Context Tags
 * 
 * Optional tags to explain measurement fluctuations without judgment
 */
export type MeasurementContextTag =
  | 'post_training'
  | 'morning_fasted'
  | 'evening'
  | 'travel'
  | 'stress_period'
  | 'illness'
  | 'seasonal_change'
  | 'menstrual_cycle'
  | 'medication_change'
  | 'diet_change'
  | 'sleep_disruption'
  | 'life_event';

/**
 * Context Tag Metadata
 */
export const MEASUREMENT_CONTEXT_TAGS: Array<{
  tag: MeasurementContextTag;
  label: string;
  description: string;
  icon?: string;
}> = [
  { tag: 'post_training', label: 'Post-Training', description: 'Measurement taken after workout' },
  { tag: 'morning_fasted', label: 'Morning (Fasted)', description: 'Morning measurement before eating' },
  { tag: 'evening', label: 'Evening', description: 'Evening measurement' },
  { tag: 'travel', label: 'Travel', description: 'During or after travel' },
  { tag: 'stress_period', label: 'High Stress', description: 'High stress period' },
  { tag: 'illness', label: 'Illness', description: 'During or after illness' },
  { tag: 'seasonal_change', label: 'Seasonal Change', description: 'During seasonal transition' },
  { tag: 'menstrual_cycle', label: 'Menstrual Cycle', description: 'Menstrual cycle related' },
  { tag: 'medication_change', label: 'Medication Change', description: 'Change in medications' },
  { tag: 'diet_change', label: 'Diet Change', description: 'Recent change in eating patterns' },
  { tag: 'sleep_disruption', label: 'Sleep Disruption', description: 'Disrupted sleep patterns' },
  { tag: 'life_event', label: 'Life Event', description: 'Significant life event or change' },
];

/**
 * Body Profile - Optional physical baseline
 */
export interface BodyProfile {
  userId: string;
  
  // Physical baseline (all optional)
  heightCm?: number;
  sex?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: string; // ISO date
  currentBodyweightKg?: number;
  trainingBackground?: string;
  athleteFlag?: boolean;
  
  // Measurement preferences
  weightUnit?: 'kg' | 'lb';
  measurementUnit?: 'cm' | 'in';
  
  // Scheduling preferences (pressure-free)
  weighInSchedule?: 'weekly' | 'bi_weekly' | 'monthly' | 'ad_hoc';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Body Measurement Entry
 * 
 * Core model for body state observations
 */
export interface BodyMeasurementEntry {
  id: string;
  userId: string;
  
  // Measurement date and time
  measurementDate: string; // ISO date
  measurementTime?: string; // Time of day (HH:mm format)
  
  // Core measurements
  bodyweightKg?: number;
  
  // Circumference measurements (optional)
  waistCm?: number;
  hipsCm?: number;
  chestCm?: number;
  thighCm?: number;
  armCm?: number;
  
  // Visual progress photos (optional, private)
  photoFront?: string; // URL or storage reference
  photoSide?: string;
  photoBack?: string;
  
  // Context tags (optional, multiple) - help explain fluctuations
  contextTags?: MeasurementContextTag[];
  
  // Notes
  notes?: string;
  
  // Metadata
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Measurement Input for creating/updating entries
 */
export interface CreateBodyMeasurementInput {
  measurementDate: string;
  measurementTime?: string;
  bodyweightKg?: number;
  waistCm?: number;
  hipsCm?: number;
  chestCm?: number;
  thighCm?: number;
  armCm?: number;
  photoFront?: string;
  photoSide?: string;
  photoBack?: string;
  contextTags?: MeasurementContextTag[];
  notes?: string;
}

/**
 * Update input (all fields optional)
 */
export interface UpdateBodyMeasurementInput extends Partial<CreateBodyMeasurementInput> {
  id: string;
}

/**
 * Body Transformation Insights
 * 
 * Cross-tracker correlation observations
 */
export interface BodyTransformationInsight {
  type: 'muscle_gain_signal' | 'fat_loss_signal' | 'recomposition_signal' | 'weight_stable' | 'training_correlation' | 'training_phase_correlation' | 'composite_index_change' | 'temporal_pattern' | 'recovery_signal';
  message: string;
  confidence: 'low' | 'medium' | 'high';
  timeFrame: string; // e.g., "last 4 weeks"
  supportingData: {
    bodyMeasurements?: BodyMeasurementEntry[];
    trainingSessions?: number;
    strengthTrend?: 'increasing' | 'stable' | 'decreasing';
    measurementChanges?: Record<string, number>; // e.g., { "arm": 2, "waist": -1 }
    trainingPhase?: TrainingPhase; // Phase 1 enhancement
    compositeIndex?: CompositeIndex['type']; // Phase 2
    strengthProgression?: {
      exercise?: string;
      loadChange?: number; // percentage
      timeFrame?: string;
    }; // Phase 2 enhancement
  };
  generatedAt: string;
}

/**
 * Measurement Trend Analysis (Enhanced)
 */
export interface MeasurementTrend {
  metric: 'bodyweight' | 'waist' | 'hips' | 'chest' | 'thigh' | 'arm';
  unit: 'kg' | 'cm' | 'lb' | 'in';
  values: Array<{
    date: string;
    value: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  changeOverPeriod?: {
    value: number;
    percentage?: number;
    period: string;
  };
  // Enhanced statistics (Phase 1)
  movingAverage?: number; // 7-day or 30-day moving average
  standardDeviation?: number;
  coefficientOfVariation?: number; // CV = SD / Mean (for variability)
  recentVelocity?: number; // Rate of change per week in recent period
}

/**
 * Photo Comparison (Manual only, never automatic)
 */
export interface PhotoComparison {
  firstPhoto: {
    date: string;
    front?: string;
    side?: string;
    back?: string;
  };
  secondPhoto: {
    date: string;
    front?: string;
    side?: string;
    back?: string;
  };
  timeGap: string; // e.g., "3 months"
}

/**
 * Training Phase (inference-based detection)
 */
export type TrainingPhase = 'volume_building' | 'intensity_focus' | 'deload_recovery' | 'maintenance' | 'unknown';

export interface TrainingPhaseDetection {
  phase: TrainingPhase;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  timeFrame: string;
  sessionsPerWeek: number;
  avgIntensity?: number;
}

/**
 * Outlier Detection Result
 */
export interface OutlierDetection {
  isOutlier: boolean;
  metric: 'bodyweight' | 'waist' | 'hips' | 'chest' | 'thigh' | 'arm';
  value: number;
  deviation: number; // Standard deviations from mean
  suggestedContext?: MeasurementContextTag[];
  message?: string; // Optional message for user
}

/**
 * Composite Body Indices (Observation Only)
 * 
 * Multi-metric ratios for tracking body composition changes
 * Used for observation and correlation, never as goals or targets
 */
export interface CompositeIndex {
  type: 'waist_to_hip_ratio' | 'chest_to_waist_ratio' | 'arm_to_waist_ratio';
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  changeOverPeriod?: {
    value: number;
    percentage?: number;
    period: string;
  };
  latestDate: string;
  historicalValues: Array<{
    date: string;
    value: number;
  }>;
}

/**
 * Temporal Pattern (Seasonal, Weekly, etc.)
 */
export interface TemporalPattern {
  type: 'seasonal' | 'weekly' | 'monthly' | 'menstrual_cycle';
  metric: 'bodyweight' | 'waist' | 'hips' | 'chest' | 'thigh' | 'arm';
  pattern: string; // Description of pattern
  confidence: 'low' | 'medium' | 'high';
  examples: Array<{
    date: string;
    value: number;
  }>;
  timeFrame: string;
}

/**
 * Recovery Indicator (Overtraining/Adaptation Signals)
 */
export interface RecoveryIndicator {
  type: 'overtraining_signal' | 'positive_adaptation' | 'recovery_needed' | 'training_balance';
  message: string;
  confidence: 'low' | 'medium' | 'high';
  supportingData: {
    trainingSessions?: number;
    avgIntensity?: number;
    measurementTrend?: 'increasing' | 'decreasing' | 'stable';
    bodyweightChange?: number;
    trainingPhase?: TrainingPhase;
  };
  timeFrame: string;
  generatedAt: string;
}

/**
 * Body State Summary
 */
export interface BodyStateSummary {
  latestMeasurement?: BodyMeasurementEntry;
  trends: MeasurementTrend[];
  insights: BodyTransformationInsight[];
  measurementCount: number;
  lastMeasurementDate?: string;
  daysSinceLastMeasurement?: number;
  trainingPhase?: TrainingPhaseDetection;
  outlierDetections?: OutlierDetection[];
  // Phase 2 additions
  compositeIndices?: CompositeIndex[];
  temporalPatterns?: TemporalPattern[];
  recoveryIndicators?: RecoveryIndicator[];
}
