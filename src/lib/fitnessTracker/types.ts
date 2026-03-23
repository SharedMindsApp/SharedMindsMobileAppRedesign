/**
 * Fitness Tracker Types
 * 
 * Type definitions for the Intelligent Fitness Tracker system
 */

export type MovementDomain = 
  | 'gym'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'team_sports'
  | 'individual_sports'
  | 'martial_arts'
  | 'yoga'
  | 'rehab'
  | 'other';

export type ActivityState = 'active' | 'paused' | 'seasonal' | 'dormant' | 'archived';

export type PauseReason = 
  | 'seasonal'
  | 'holiday'
  | 'work_life_busy'
  | 'injury_recovery'
  | 'family_commitments'
  | 'weather'
  | 'other';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface ActivityStateMetadata {
  state: ActivityState;
  pausedAt?: string; // ISO date when paused
  pauseReason?: PauseReason;
  pauseNotes?: string; // Private notes
  expectedReturn?: string; // ISO date or season
  isSeasonal?: boolean;
  typicalSeason?: Season; // For seasonal activities
  archivedAt?: string; // ISO date when archived
}

export interface DomainDetail {
  activities?: string[];
  frequency?: 'rarely' | 'occasionally' | 'regularly' | 'core_activity';
  sports?: string[]; // For team sports
  individualSports?: string[]; // For individual sports (separate from activities)
  state?: ActivityStateMetadata; // Activity state metadata
  [key: string]: any; // Allow additional domain-specific fields
}

export interface UserMovementProfile {
  userId: string;
  primaryDomains: MovementDomain[];
  domainDetails: Record<MovementDomain, DomainDetail>;
  movementLevel?: 'casual' | 'regular' | 'structured' | 'competitive' | null;
  injuries?: Injury[]; // Current and historical injuries
  trackerStructure?: TrackerStructure;
  uiConfiguration?: UIConfiguration;
  insightPreferences?: InsightPreferences;
  unlockedFeatures?: string[];
  capabilityUnlocks?: CapabilityUnlock[];
  discoveryCompleted: boolean;
  discoveryDate?: string;
  lastReconfigurationDate?: string;
  fitnessTrackerId?: string; // ID of the unified Fitness Tracker
}

export interface TrackerStructure {
  categories: TrackerCategory[];
  subcategories: Record<string, TrackerSubcategory[]>;
  availableFields: FieldDefinition[];
  patternConfig: PatternRecognitionConfig;
  insightConfig: InsightGenerationConfig;
}

export interface TrackerCategory {
  id: string;
  name: string;
  domain: MovementDomain;
  icon: string;
  color: string;
  subcategories: string[];
}

export interface TrackerSubcategory {
  id: string;
  name: string;
  parentCategory: string;
  optionalFields: string[];
}

export interface FieldDefinition {
  id: string;
  type: 'text' | 'number' | 'select' | 'date' | 'array' | 'object';
  label: string;
  optional: boolean;
  validation?: any;
  options?: any[];
}

export interface PatternRecognitionConfig {
  domains: MovementDomain[];
  domainSpecific: Record<string, any>;
  level?: string;
}

export interface InsightGenerationConfig {
  domains: MovementDomain[];
  level?: string;
  insightTypes: string[];
}

export interface UIConfiguration {
  quickLogButtons: QuickLogButton[];
  patternVisualizations: VisualizationConfig[];
  insightTypes: string[];
  unlockedFeatures: string[];
  preferences: UserPreferences;
  activityCustomizations?: Record<MovementDomain, ActivityCustomization>;
}

/**
 * Activity-specific customization for quick log buttons and fields
 */
export interface ActivityCustomization {
  domain: MovementDomain;
  // Custom quick log buttons for this activity (can add/remove/hide default buttons)
  customQuickLogButtons?: string[]; // IDs of buttons to show (if empty, show all default)
  hiddenQuickLogButtons?: string[]; // IDs of buttons to hide
  // Fields to show in quick log form (ordered list, limited to 5-7 most important)
  quickLogFields: string[]; // Field IDs in order of importance (max 7)
  // Additional custom fields the user wants to track
  additionalFields?: string[]; // Field IDs for fields not in quick log but available in detailed view
}

export interface QuickLogButton {
  id: string;
  label: string;
  category: string;
  subcategory?: string;
  icon: string;
  color: string;
  order: number;
}

export interface VisualizationConfig {
  id: string;
  type: string;
  domain: string;
  title: string;
  description: string;
}

export interface InsightPreferences {
  enabledTypes: string[];
  frequency: string;
  domainSpecific: boolean;
  levelAppropriate: boolean;
}

export interface UserPreferences {
  showInsights: boolean;
  showPatternVisualizations: boolean;
  reminderPreferences: Record<string, any>;
}

export interface MovementSession {
  id?: string;
  userId: string;
  domain: MovementDomain;
  activity: string;
  sessionType?: string;
  timestamp: string;
  intent?: 'training' | 'maintenance' | 'recovery' | 'skill_practice' | 'exploration' | 'just_moved';
  context?: string;
  perceivedIntensity?: number;
  bodyState?: 'fresh' | 'sore' | 'fatigued' | 'stiff' | 'injured' | 'recovered';
  durationMinutes?: number;
  notes?: string;
  // Domain-specific fields
  exercises?: ExerciseDetail[];
  distanceKm?: number;
  pacePerKm?: string;
  heartRateZones?: any;
  terrain?: string;
  elevationMeters?: number;
  bodyweightKg?: number;
  [key: string]: any;
}

export interface ExerciseDetail {
  name: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
  notes?: string;
}

export interface CapabilityUnlock {
  feature: string;
  trigger: string;
  activated: boolean;
  activatedDate: Date | null;
}

/**
 * Injury / Health Condition Tracking
 */
export interface Injury {
  id: string;
  userId: string;
  name: string; // e.g., "Lower back pain", "Left knee ACL"
  type: 'current' | 'historical';
  bodyArea: string; // e.g., "lower_back", "left_knee", "right_shoulder"
  severity?: 'mild' | 'moderate' | 'severe';
  startedDate?: string; // ISO date for current injuries, when it started
  resolvedDate?: string; // ISO date for historical injuries, when it healed
  affectedActivities?: MovementDomain[]; // Which movement domains are affected
  limitations?: string; // Free text description of limitations
  notes?: string; // Additional notes about the injury
  createdAt: string;
  updatedAt: string;
}

export interface InjuryAwareness {
  hasCurrentInjuries: boolean;
  hasHistoricalInjuries: boolean;
  currentInjuries: Injury[];
  historicalInjuries: Injury[];
  affectedDomains: MovementDomain[];
  recoveryRecommendations: string[];
}
