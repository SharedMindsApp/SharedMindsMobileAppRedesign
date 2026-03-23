# Intelligent Fitness Tracker - Implementation Plan
## Personalized Movement System with Dynamic Assembly

**Version:** 2.0  
**Date:** 2025-01-31  
**Related Document:** `FITNESS_TRACKER_DESIGN.md`

---

## Overview

This document provides a detailed technical implementation plan for the Intelligent Fitness Tracker system with **movement discovery first** and **dynamic tracker assembly**. The system learns how users move, then builds personalized tracking interfaces.

**Core Principle:** The fitness tracker doesn't track fitness — it learns how you move, and adapts to support that.

---

## 1. Database Schema

### 1.1 Core Tables

#### `user_movement_profiles`

```sql
CREATE TABLE user_movement_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Discovery data
  primary_domains TEXT[] NOT NULL, -- ['gym', 'running', 'yoga']
  domain_details JSONB NOT NULL DEFAULT '{}', -- {gym: {activities: [...], frequency: 'regularly'}}
  movement_level TEXT CHECK (movement_level IN ('casual', 'regular', 'structured', 'competitive', NULL)),
  
  -- Generated from discovery
  tracker_structure JSONB NOT NULL DEFAULT '{}', -- Assembled tracker structure
  ui_configuration JSONB NOT NULL DEFAULT '{}', -- Quick log buttons, visualizations, etc.
  insight_preferences JSONB NOT NULL DEFAULT '{}', -- What insights to show
  
  -- Capability unlocks (auto-detected)
  unlocked_features TEXT[] DEFAULT '[]',
  capability_unlocks JSONB DEFAULT '[]',
  
  -- Metadata
  discovery_completed BOOLEAN DEFAULT FALSE,
  discovery_date TIMESTAMPTZ,
  last_reconfiguration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_movement_profiles_discovery ON user_movement_profiles(discovery_completed);
```

#### `movement_sessions`

```sql
CREATE TABLE movement_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core structure (always present)
  domain TEXT NOT NULL CHECK (domain IN ('gym', 'sport', 'mobility', 'other')),
  activity TEXT NOT NULL, -- 'upper_body', 'running', 'yoga', etc.
  session_type TEXT, -- 'push', 'easy', 'tempo', etc. (optional)
  
  -- Intent and context
  intent TEXT CHECK (intent IN ('training', 'maintenance', 'recovery', 'skill_practice', 'exploration', 'just_moved')),
  context TEXT, -- 'training', 'competition', 'match', etc.
  
  -- Perceived experience
  perceived_intensity INTEGER CHECK (perceived_intensity >= 1 AND perceived_intensity <= 5),
  body_state TEXT CHECK (body_state IN ('fresh', 'sore', 'fatigued', 'stiff', 'injured', 'recovered')),
  enjoyment INTEGER CHECK (enjoyment >= 1 AND enjoyment <= 5),
  
  -- Optional detail (scales with user)
  duration_minutes INTEGER,
  notes TEXT,
  
  -- Domain-specific optional fields (unlocked based on domain)
  -- Gym-specific
  exercises JSONB, -- [{name: 'Bench Press', sets: 3, reps: 10, weight: 100, rpe: 7}]
  
  -- Sport-specific
  distance_km NUMERIC(6, 2),
  pace_per_km TEXT, -- '5:30'
  heart_rate_zones JSONB, -- {zone1: 10, zone2: 20, ...}
  terrain TEXT,
  elevation_meters INTEGER,
  
  -- Team sports
  match_type TEXT, -- 'training', 'match', 'event'
  position TEXT,
  minutes_played INTEGER,
  
  -- Metadata
  timestamp TIMESTAMPTZ NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logged_retroactively BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movement_sessions_user_id ON movement_sessions(user_id);
CREATE INDEX idx_movement_sessions_timestamp ON movement_sessions(timestamp);
CREATE INDEX idx_movement_sessions_user_timestamp ON movement_sessions(user_id, timestamp DESC);
CREATE INDEX idx_movement_sessions_domain_activity ON movement_sessions(domain, activity);
```

#### `tracker_structures`

```sql
CREATE TABLE tracker_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Structure definition
  categories JSONB NOT NULL, -- Array of category definitions
  subcategories JSONB NOT NULL, -- Record of subcategories by category
  available_fields JSONB NOT NULL, -- Field definitions unlocked for this user
  
  -- Pattern recognition config
  pattern_config JSONB NOT NULL DEFAULT '{}',
  
  -- Insight generation config
  insight_config JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracker_structures_user_id ON tracker_structures(user_id);
CREATE INDEX idx_tracker_structures_active ON tracker_structures(user_id, is_active) WHERE is_active = TRUE;
```

#### `movement_insights`

```sql
CREATE TABLE movement_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('pattern_observation', 'capacity_insight', 'activity_insight', 'sustainability_insight', 'suggestion')),
  domain TEXT, -- Which domain this insight relates to
  message TEXT NOT NULL,
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  actionable BOOLEAN DEFAULT FALSE,
  suggestion TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX idx_movement_insights_user_id ON movement_insights(user_id);
CREATE INDEX idx_movement_insights_created_at ON movement_insights(created_at DESC);
CREATE INDEX idx_movement_insights_user_unviewed ON movement_insights(user_id, viewed) WHERE viewed = FALSE;
```

#### `engagement_cycles`

```sql
CREATE TABLE engagement_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  domain TEXT, -- Which domain this cycle relates to
  start_date DATE NOT NULL,
  end_date DATE,
  type TEXT NOT NULL CHECK (type IN ('high', 'moderate', 'low', 'recovery')),
  average_frequency NUMERIC(5, 2),
  average_intensity NUMERIC(3, 2),
  sustainability_score NUMERIC(3, 2),
  trigger_events TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_engagement_cycles_user_id ON engagement_cycles(user_id);
CREATE INDEX idx_engagement_cycles_dates ON engagement_cycles(user_id, start_date DESC);
```

### 1.2 Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE user_movement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_cycles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile"
  ON user_movement_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_movement_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions"
  ON movement_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON movement_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON movement_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON movement_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Similar policies for other tables...
```

---

## 2. Discovery Flow Implementation

### 2.1 Discovery Service

**File:** `src/lib/fitnessTracker/discoveryService.ts`

```typescript
import { supabase } from '../supabase';
import type { 
  MovementDomain, 
  DomainDetail, 
  UserMovementProfile,
  TrackerStructure 
} from './types';
import { TrackerAssembler } from './trackerAssembler';

export class DiscoveryService {
  /**
   * Save discovery data and assemble tracker
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
    
    // Save profile
    const { data, error } = await supabase
      .from('user_movement_profiles')
      .upsert({
        user_id: userId,
        primary_domains: discoveryData.primaryDomains,
        domain_details: discoveryData.domainDetails,
        movement_level: discoveryData.movementLevel || null,
        tracker_structure: trackerStructure,
        ui_configuration: uiConfiguration,
        insight_preferences: insightPreferences,
        discovery_completed: true,
        discovery_date: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Save tracker structure
    await supabase
      .from('tracker_structures')
      .insert({
        user_id: userId,
        categories: trackerStructure.categories,
        subcategories: trackerStructure.subcategories,
        available_fields: trackerStructure.availableFields,
        pattern_config: trackerStructure.patternConfig,
        insight_config: trackerStructure.insightConfig,
        is_active: true,
      });
    
    return data as UserMovementProfile;
  }
  
  /**
   * Get user's movement profile
   */
  async getProfile(userId: string): Promise<UserMovementProfile | null> {
    const { data, error } = await supabase
      .from('user_movement_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as UserMovementProfile | null;
  }
  
  /**
   * Check if user has completed discovery
   */
  async hasCompletedDiscovery(userId: string): Promise<boolean> {
    const profile = await this.getProfile(userId);
    return profile?.discovery_completed ?? false;
  }
}
```

### 2.2 Tracker Assembler

**File:** `src/lib/fitnessTracker/trackerAssembler.ts`

```typescript
import type {
  MovementDomain,
  DomainDetail,
  TrackerStructure,
  TrackerCategory,
  TrackerSubcategory,
  FieldDefinition,
  UIConfiguration,
  QuickLogButton,
} from './types';

export class TrackerAssembler {
  /**
   * Assemble tracker structure from discovery data
   */
  async assembleTracker(discoveryData: {
    primaryDomains: MovementDomain[];
    domainDetails: Record<MovementDomain, DomainDetail>;
    movementLevel?: string;
  }): Promise<TrackerStructure> {
    const categories = this.generateCategories(discoveryData.primaryDomains);
    const subcategories = this.generateSubcategories(
      discoveryData.primaryDomains,
      discoveryData.domainDetails
    );
    const availableFields = this.unlockFields(discoveryData.primaryDomains);
    const patternConfig = this.configurePatterns(discoveryData);
    const insightConfig = this.configureInsights(discoveryData);
    
    return {
      categories,
      subcategories,
      availableFields,
      patternConfig,
      insightConfig,
    };
  }
  
  /**
   * Generate categories based on selected domains
   */
  private generateCategories(domains: MovementDomain[]): TrackerCategory[] {
    const categoryMap: Record<MovementDomain, TrackerCategory> = {
      gym: {
        id: 'gym',
        name: 'Gym Sessions',
        domain: 'gym',
        icon: 'Dumbbell',
        color: '#DC2626',
        subcategories: [],
      },
      running: {
        id: 'running',
        name: 'Running Sessions',
        domain: 'sport',
        icon: 'Running',
        color: '#EA580C',
        subcategories: [],
      },
      cycling: {
        id: 'cycling',
        name: 'Cycling Sessions',
        domain: 'sport',
        icon: 'Bike',
        color: '#059669',
        subcategories: [],
      },
      swimming: {
        id: 'swimming',
        name: 'Swimming Sessions',
        domain: 'sport',
        icon: 'Waves',
        color: '#0284C7',
        subcategories: [],
      },
      team_sports: {
        id: 'team_sports',
        name: 'Team Sports',
        domain: 'sport',
        icon: 'Users',
        color: '#7C3AED',
        subcategories: [],
      },
      individual_sports: {
        id: 'individual_sports',
        name: 'Individual Sports',
        domain: 'sport',
        icon: 'Target',
        color: '#C026D3',
        subcategories: [],
      },
      martial_arts: {
        id: 'martial_arts',
        name: 'Martial Arts',
        domain: 'sport',
        icon: 'Sword',
        color: '#DC2626',
        subcategories: [],
      },
      yoga: {
        id: 'yoga',
        name: 'Yoga / Mobility',
        domain: 'mobility',
        icon: 'Flower',
        color: '#7C3AED',
        subcategories: [],
      },
      rehab: {
        id: 'rehab',
        name: 'Rehab / Physio',
        domain: 'mobility',
        icon: 'Heart',
        color: '#10B981',
        subcategories: [],
      },
      other: {
        id: 'other',
        name: 'Other Movement',
        domain: 'other',
        icon: 'Activity',
        color: '#6B7280',
        subcategories: [],
      },
    };
    
    return domains.map(domain => categoryMap[domain]).filter(Boolean);
  }
  
  /**
   * Generate subcategories based on domain details
   */
  private generateSubcategories(
    domains: MovementDomain[],
    details: Record<MovementDomain, DomainDetail>
  ): Record<string, TrackerSubcategory[]> {
    const subcategories: Record<string, TrackerSubcategory[]> = {};
    
    for (const domain of domains) {
      const detail = details[domain];
      subcategories[domain] = this.getSubcategoriesForDomain(domain, detail);
    }
    
    return subcategories;
  }
  
  /**
   * Get subcategories for a specific domain
   */
  private getSubcategoriesForDomain(
    domain: MovementDomain,
    detail: DomainDetail
  ): TrackerSubcategory[] {
    switch (domain) {
      case 'gym':
        return this.getGymSubcategories(detail);
      case 'running':
        return this.getRunningSubcategories(detail);
      case 'cycling':
        return this.getCyclingSubcategories(detail);
      case 'swimming':
        return this.getSwimmingSubcategories(detail);
      case 'team_sports':
        return this.getTeamSportsSubcategories(detail);
      case 'yoga':
        return this.getYogaSubcategories(detail);
      default:
        return [];
    }
  }
  
  /**
   * Gym subcategories
   */
  private getGymSubcategories(detail: DomainDetail): TrackerSubcategory[] {
    const subcategories: TrackerSubcategory[] = [];
    
    // Always include basic categories
    subcategories.push({
      id: 'cardio',
      name: 'Cardio',
      parentCategory: 'gym',
      optionalFields: ['duration_minutes', 'machine_type', 'heart_rate_zones'],
    });
    
    subcategories.push({
      id: 'upper_body',
      name: 'Upper Body',
      parentCategory: 'gym',
      optionalFields: ['exercises', 'sets', 'reps', 'weight', 'rpe', 'muscle_groups'],
    });
    
    subcategories.push({
      id: 'lower_body',
      name: 'Lower Body',
      parentCategory: 'gym',
      optionalFields: ['exercises', 'sets', 'reps', 'weight', 'rpe', 'muscle_groups'],
    });
    
    subcategories.push({
      id: 'full_body',
      name: 'Full Body',
      parentCategory: 'gym',
      optionalFields: ['exercises', 'sets', 'reps', 'weight', 'rpe'],
    });
    
    // Add based on detail
    if (detail.activities?.includes('classes')) {
      subcategories.push({
        id: 'classes',
        name: 'Classes',
        parentCategory: 'gym',
        optionalFields: ['class_type', 'duration_minutes', 'instructor'],
      });
    }
    
    subcategories.push({
      id: 'recovery',
      name: 'Recovery / Mobility',
      parentCategory: 'gym',
      optionalFields: ['duration_minutes', 'mobility_focus'],
    });
    
    return subcategories;
  }
  
  /**
   * Running subcategories
   */
  private getRunningSubcategories(detail: DomainDetail): TrackerSubcategory[] {
    const subcategories: TrackerSubcategory[] = [];
    
    // Check if structured training
    const isStructured = detail.activities?.some(a => 
      a.includes('structured') || a.includes('training')
    );
    
    if (isStructured) {
      subcategories.push({
        id: 'easy',
        name: 'Easy',
        parentCategory: 'running',
        optionalFields: ['distance_km', 'pace_per_km', 'heart_rate_zones', 'terrain'],
      });
      
      subcategories.push({
        id: 'tempo',
        name: 'Tempo',
        parentCategory: 'running',
        optionalFields: ['distance_km', 'pace_per_km', 'heart_rate_zones', 'terrain', 'threshold_pace'],
      });
      
      subcategories.push({
        id: 'intervals',
        name: 'Intervals',
        parentCategory: 'running',
        optionalFields: ['distance_km', 'pace_per_km', 'heart_rate_zones', 'interval_details'],
      });
      
      subcategories.push({
        id: 'long',
        name: 'Long Run',
        parentCategory: 'running',
        optionalFields: ['distance_km', 'pace_per_km', 'heart_rate_zones', 'terrain'],
      });
      
      subcategories.push({
        id: 'competition',
        name: 'Competition',
        parentCategory: 'running',
        optionalFields: ['distance_km', 'pace_per_km', 'race_type', 'result'],
      });
    } else {
      // Casual running
      subcategories.push({
        id: 'easy',
        name: 'Easy Run',
        parentCategory: 'running',
        optionalFields: ['distance_km', 'duration_minutes', 'terrain'],
      });
      
      subcategories.push({
        id: 'tempo',
        name: 'Faster Run',
        parentCategory: 'running',
        optionalFields: ['distance_km', 'duration_minutes', 'terrain'],
      });
    }
    
    subcategories.push({
      id: 'skills',
      name: 'Skills / Drills',
      parentCategory: 'running',
      optionalFields: ['drill_type', 'duration_minutes'],
    });
    
    return subcategories;
  }
  
  /**
   * Cycling subcategories
   */
  private getCyclingSubcategories(detail: DomainDetail): TrackerSubcategory[] {
    return [
      {
        id: 'easy',
        name: 'Easy Ride',
        parentCategory: 'cycling',
        optionalFields: ['distance_km', 'duration_minutes', 'terrain', 'elevation_meters'],
      },
      {
        id: 'tempo',
        name: 'Tempo Ride',
        parentCategory: 'cycling',
        optionalFields: ['distance_km', 'duration_minutes', 'terrain', 'elevation_meters', 'heart_rate_zones'],
      },
      {
        id: 'intervals',
        name: 'Intervals',
        parentCategory: 'cycling',
        optionalFields: ['distance_km', 'duration_minutes', 'interval_details'],
      },
      {
        id: 'long',
        name: 'Long Ride',
        parentCategory: 'cycling',
        optionalFields: ['distance_km', 'duration_minutes', 'terrain', 'elevation_meters'],
      },
      {
        id: 'commute',
        name: 'Commute',
        parentCategory: 'cycling',
        optionalFields: ['distance_km', 'duration_minutes'],
      },
    ];
  }
  
  /**
   * Swimming subcategories
   */
  private getSwimmingSubcategories(detail: DomainDetail): TrackerSubcategory[] {
    return [
      {
        id: 'easy',
        name: 'Easy Swim',
        parentCategory: 'swimming',
        optionalFields: ['distance_meters', 'duration_minutes', 'stroke_type'],
      },
      {
        id: 'tempo',
        name: 'Tempo Swim',
        parentCategory: 'swimming',
        optionalFields: ['distance_meters', 'duration_minutes', 'stroke_type', 'pace'],
      },
      {
        id: 'intervals',
        name: 'Intervals',
        parentCategory: 'swimming',
        optionalFields: ['distance_meters', 'duration_minutes', 'interval_details', 'stroke_type'],
      },
      {
        id: 'drills',
        name: 'Drills',
        parentCategory: 'swimming',
        optionalFields: ['drill_type', 'duration_minutes'],
      },
    ];
  }
  
  /**
   * Team sports subcategories
   */
  private getTeamSportsSubcategories(detail: DomainDetail): TrackerSubcategory[] {
    const sports = detail.sports || [];
    
    return sports.map(sport => ({
      id: sport.toLowerCase().replace(/\s+/g, '_'),
      name: sport,
      parentCategory: 'team_sports',
      optionalFields: ['match_type', 'position', 'minutes_played', 'performance_notes'],
    }));
  }
  
  /**
   * Yoga subcategories
   */
  private getYogaSubcategories(detail: DomainDetail): TrackerSubcategory[] {
    return [
      {
        id: 'vinyasa',
        name: 'Vinyasa',
        parentCategory: 'yoga',
        optionalFields: ['duration_minutes', 'intensity_level'],
      },
      {
        id: 'yin',
        name: 'Yin',
        parentCategory: 'yoga',
        optionalFields: ['duration_minutes'],
      },
      {
        id: 'mobility',
        name: 'Mobility',
        parentCategory: 'yoga',
        optionalFields: ['duration_minutes', 'focus_areas'],
      },
      {
        id: 'other',
        name: 'Other',
        parentCategory: 'yoga',
        optionalFields: ['duration_minutes', 'style'],
      },
    ];
  }
  
  /**
   * Unlock fields based on domains
   */
  private unlockFields(domains: MovementDomain[]): FieldDefinition[] {
    const allFields: FieldDefinition[] = [];
    
    // Common fields (always available)
    allFields.push(
      { id: 'duration_minutes', type: 'number', label: 'Duration (minutes)', optional: true },
      { id: 'perceived_intensity', type: 'number', label: 'Intensity (1-5)', optional: true },
      { id: 'body_state', type: 'select', label: 'Body State', optional: true },
      { id: 'enjoyment', type: 'number', label: 'Enjoyment (1-5)', optional: true },
      { id: 'notes', type: 'text', label: 'Notes', optional: true }
    );
    
    // Domain-specific fields
    if (domains.includes('gym')) {
      allFields.push(
        { id: 'exercises', type: 'array', label: 'Exercises', optional: true },
        { id: 'sets', type: 'number', label: 'Sets', optional: true },
        { id: 'reps', type: 'number', label: 'Reps', optional: true },
        { id: 'weight', type: 'number', label: 'Weight (kg)', optional: true },
        { id: 'rpe', type: 'number', label: 'RPE (1-10)', optional: true },
        { id: 'muscle_groups', type: 'array', label: 'Muscle Groups', optional: true }
      );
    }
    
    if (domains.includes('running') || domains.includes('cycling')) {
      allFields.push(
        { id: 'distance_km', type: 'number', label: 'Distance (km)', optional: true },
        { id: 'pace_per_km', type: 'text', label: 'Pace (per km)', optional: true },
        { id: 'heart_rate_zones', type: 'object', label: 'Heart Rate Zones', optional: true },
        { id: 'terrain', type: 'select', label: 'Terrain', optional: true },
        { id: 'elevation_meters', type: 'number', label: 'Elevation (m)', optional: true }
      );
    }
    
    if (domains.includes('swimming')) {
      allFields.push(
        { id: 'distance_meters', type: 'number', label: 'Distance (meters)', optional: true },
        { id: 'stroke_type', type: 'select', label: 'Stroke Type', optional: true },
        { id: 'pace', type: 'text', label: 'Pace', optional: true }
      );
    }
    
    if (domains.includes('team_sports')) {
      allFields.push(
        { id: 'match_type', type: 'select', label: 'Match Type', optional: true },
        { id: 'position', type: 'text', label: 'Position', optional: true },
        { id: 'minutes_played', type: 'number', label: 'Minutes Played', optional: true },
        { id: 'performance_notes', type: 'text', label: 'Performance Notes', optional: true }
      );
    }
    
    return allFields;
  }
  
  /**
   * Configure pattern recognition
   */
  private configurePatterns(discoveryData: {
    primaryDomains: MovementDomain[];
    domainDetails: Record<MovementDomain, DomainDetail>;
    movementLevel?: string;
  }): PatternRecognitionConfig {
    return {
      domains: discoveryData.primaryDomains,
      domainSpecific: discoveryData.primaryDomains.reduce((acc, domain) => {
        acc[domain] = this.getPatternConfigForDomain(domain, discoveryData.domainDetails[domain]);
        return acc;
      }, {} as Record<string, any>),
      level: discoveryData.movementLevel || 'regular',
    };
  }
  
  /**
   * Get pattern config for domain
   */
  private getPatternConfigForDomain(domain: MovementDomain, detail: DomainDetail): any {
    switch (domain) {
      case 'gym':
        return {
          trackSessionBalance: true,
          trackIntensityClustering: true,
          trackRecoverySpacing: true,
          trackMuscleGroupFatigue: true,
        };
      case 'running':
      case 'cycling':
      case 'swimming':
        return {
          trackTrainingVsCompetition: true,
          trackBuildUpCycles: true,
          trackRecoveryAfterPeak: true,
          trackSessionTypeDistribution: true,
        };
      case 'team_sports':
        return {
          trackTrainingVsMatch: true,
          trackPositionSpecific: true,
          trackPerformanceTrends: true,
        };
      default:
        return {};
    }
  }
  
  /**
   * Configure insights
   */
  private configureInsights(discoveryData: {
    primaryDomains: MovementDomain[];
    domainDetails: Record<MovementDomain, DomainDetail>;
    movementLevel?: string;
  }): InsightGenerationConfig {
    return {
      domains: discoveryData.primaryDomains,
      level: discoveryData.movementLevel || 'regular',
      insightTypes: this.getInsightTypesForLevel(discoveryData.movementLevel || 'regular'),
    };
  }
  
  /**
   * Get insight types for level
   */
  private getInsightTypesForLevel(level: string): string[] {
    const baseTypes = ['pattern_observation', 'sustainability_insight'];
    
    if (level === 'structured' || level === 'competitive') {
      return [...baseTypes, 'capacity_insight', 'activity_insight', 'load_trend', 'cycle_recognition'];
    }
    
    return baseTypes;
  }
  
  /**
   * Generate UI configuration
   */
  async generateUIConfiguration(structure: TrackerStructure): Promise<UIConfiguration> {
    const quickLogButtons = this.generateQuickLogButtons(structure);
    const patternVisualizations = this.generatePatternVisualizations(structure);
    
    return {
      quickLogButtons,
      patternVisualizations,
      insightTypes: structure.insightConfig.insightTypes || [],
      unlockedFeatures: [],
      preferences: {
        showInsights: true,
        showPatternVisualizations: true,
        reminderPreferences: {},
      },
    };
  }
  
  /**
   * Generate quick log buttons
   */
  private generateQuickLogButtons(structure: TrackerStructure): QuickLogButton[] {
    const buttons: QuickLogButton[] = [];
    let order = 0;
    
    for (const category of structure.categories) {
      // Add main category button
      buttons.push({
        id: category.id,
        label: category.name,
        category: category.id,
        icon: category.icon,
        color: category.color,
        order: order++,
      });
      
      // Add subcategory buttons (if not too many)
      const subcategories = structure.subcategories[category.id] || [];
      if (subcategories.length <= 6) {
        // Show subcategories directly
        for (const subcat of subcategories) {
          buttons.push({
            id: `${category.id}_${subcat.id}`,
            label: subcat.name,
            category: category.id,
            subcategory: subcat.id,
            icon: category.icon,
            color: category.color,
            order: order++,
          });
        }
      }
    }
    
    return buttons.sort((a, b) => a.order - b.order);
  }
  
  /**
   * Generate pattern visualizations
   */
  private generatePatternVisualizations(structure: TrackerStructure): VisualizationConfig[] {
    const visualizations: VisualizationConfig[] = [];
    
    // Domain-specific visualizations
    for (const category of structure.categories) {
      const domain = category.domain;
      const patternConfig = structure.patternConfig.domainSpecific[category.id] || {};
      
      if (domain === 'gym') {
        visualizations.push({
          id: 'session_balance',
          type: 'bar_chart',
          domain: 'gym',
          title: 'Session Balance',
          description: 'Distribution of session types',
        });
        
        if (patternConfig.trackIntensityClustering) {
          visualizations.push({
            id: 'intensity_clustering',
            type: 'heat_map',
            domain: 'gym',
            title: 'Intensity Clustering',
            description: 'Intensity distribution by session type',
          });
        }
      } else if (domain === 'sport') {
        visualizations.push({
          id: 'session_type_distribution',
          type: 'bar_chart',
          domain: category.id,
          title: 'Session Type Distribution',
          description: 'Distribution of training types',
        });
        
        if (patternConfig.trackTrainingVsCompetition) {
          visualizations.push({
            id: 'training_vs_competition',
            type: 'pie_chart',
            domain: category.id,
            title: 'Training vs Competition',
            description: 'Balance of training and competition',
          });
        }
      }
    }
    
    // Common visualizations
    visualizations.push({
      id: 'frequency_pattern',
      type: 'line_chart',
      domain: 'all',
      title: 'Frequency Pattern',
      description: 'Sessions over time',
    });
    
    visualizations.push({
      id: 'sustainability',
      type: 'circular_progress',
      domain: 'all',
      title: 'Sustainability',
      description: 'Pattern sustainability score',
    });
    
    return visualizations;
  }
  
  /**
   * Generate insight preferences
   */
  async generateInsightPreferences(
    discoveryData: any,
    structure: TrackerStructure
  ): Promise<InsightPreferences> {
    return {
      enabledTypes: structure.insightConfig.insightTypes || [],
      frequency: 'weekly',
      domainSpecific: true,
      levelAppropriate: true,
    };
  }
}
```

### 2.3 Reconfiguration Service

**File:** `src/lib/fitnessTracker/reconfigurationService.ts`

```typescript
import { DiscoveryService } from './discoveryService';
import { TrackerAssembler } from './trackerAssembler';
import { supabase } from '../supabase';

export class ReconfigurationService {
  private discoveryService = new DiscoveryService();
  private assembler = new TrackerAssembler();
  
  /**
   * Reconfigure tracker after profile update
   */
  async reconfigureTracker(
    userId: string,
    updatedProfile: Partial<UserMovementProfile>
  ): Promise<void> {
    // Get current profile
    const currentProfile = await this.discoveryService.getProfile(userId);
    if (!currentProfile) throw new Error('Profile not found');
    
    // Merge updates
    const mergedProfile = {
      ...currentProfile,
      ...updatedProfile,
      primary_domains: updatedProfile.primary_domains || currentProfile.primary_domains,
      domain_details: {
        ...currentProfile.domain_details,
        ...updatedProfile.domain_details,
      },
    };
    
    // Reassemble tracker
    const newStructure = await this.assembler.assembleTracker({
      primaryDomains: mergedProfile.primary_domains,
      domainDetails: mergedProfile.domain_details,
      movementLevel: mergedProfile.movement_level,
    });
    
    // Generate new UI config
    const newUIConfig = await this.assembler.generateUIConfiguration(newStructure);
    
    // Update profile
    await supabase
      .from('user_movement_profiles')
      .update({
        primary_domains: mergedProfile.primary_domains,
        domain_details: mergedProfile.domain_details,
        movement_level: mergedProfile.movement_level,
        tracker_structure: newStructure,
        ui_configuration: newUIConfig,
        last_reconfiguration_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    
    // Archive old structure, create new one
    await supabase
      .from('tracker_structures')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);
    
    await supabase
      .from('tracker_structures')
      .insert({
        user_id: userId,
        categories: newStructure.categories,
        subcategories: newStructure.subcategories,
        available_fields: newStructure.availableFields,
        pattern_config: newStructure.patternConfig,
        insight_config: newStructure.insightConfig,
        is_active: true,
        version: (await this.getLatestVersion(userId)) + 1,
      });
  }
  
  private async getLatestVersion(userId: string): Promise<number> {
    const { data } = await supabase
      .from('tracker_structures')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    
    return data?.version || 0;
  }
}
```

---

## 3. API Design

### 3.1 Discovery Endpoints

#### `POST /api/discovery/complete`

Complete movement discovery and assemble tracker.

**Request:**
```typescript
interface CompleteDiscoveryRequest {
  primaryDomains: MovementDomain[];
  domainDetails: Record<MovementDomain, DomainDetail>;
  movementLevel?: 'casual' | 'regular' | 'structured' | 'competitive';
}
```

**Response:**
```typescript
interface UserMovementProfileResponse {
  userId: string;
  primaryDomains: MovementDomain[];
  domainDetails: Record<MovementDomain, DomainDetail>;
  movementLevel: string | null;
  trackerStructure: TrackerStructure;
  uiConfiguration: UIConfiguration;
  discoveryCompleted: boolean;
}
```

#### `GET /api/discovery/profile`

Get user's movement profile.

**Response:**
```typescript
UserMovementProfileResponse
```

#### `GET /api/discovery/status`

Check if user has completed discovery.

**Response:**
```typescript
{
  hasCompleted: boolean;
  profile: UserMovementProfileResponse | null;
}
```

### 3.2 Tracker Structure Endpoints

#### `GET /api/tracker/structure`

Get current tracker structure.

**Response:**
```typescript
TrackerStructureResponse
```

#### `POST /api/tracker/reconfigure`

Reconfigure tracker (add/remove domains, update details).

**Request:**
```typescript
interface ReconfigureRequest {
  primaryDomains?: MovementDomain[];
  domainDetails?: Record<MovementDomain, DomainDetail>;
  movementLevel?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  newStructure: TrackerStructure;
  uiConfiguration: UIConfiguration;
}
```

### 3.3 Movement Session Endpoints

#### `POST /api/movement-sessions`

Create movement session (uses assembled structure).

**Request:**
```typescript
interface CreateMovementSessionRequest {
  domain: 'gym' | 'sport' | 'mobility' | 'other';
  activity: string; // Category ID
  sessionType?: string; // Subcategory ID (optional)
  
  // Core fields
  timestamp: string;
  intent?: MovementIntent;
  context?: string;
  
  // Perceived experience
  perceivedIntensity?: number;
  bodyState?: BodyState;
  enjoyment?: number;
  
  // Optional detail (domain-specific)
  durationMinutes?: number;
  notes?: string;
  
  // Domain-specific fields (unlocked based on domain)
  exercises?: ExerciseDetail[];
  distanceKm?: number;
  pacePerKm?: string;
  // ... etc
}
```

**Response:**
```typescript
MovementSessionResponse
```

#### `GET /api/movement-sessions`

Get sessions with filtering.

**Query Parameters:**
- `domain?: string`
- `activity?: string`
- `startDate?: string`
- `endDate?: string`
- `limit?: number`
- `offset?: number`

### 3.4 UI Configuration Endpoints

#### `GET /api/ui/configuration`

Get UI configuration (quick log buttons, visualizations).

**Response:**
```typescript
UIConfigurationResponse
```

#### `GET /api/ui/quick-log-buttons`

Get quick log button configuration.

**Response:**
```typescript
{
  buttons: QuickLogButton[];
}
```

---

## 4. Pattern Analysis (Domain-Aware)

### 4.1 Domain-Aware Pattern Service

**File:** `src/lib/fitnessTracker/domainAwarePatternService.ts`

```typescript
import { PatternLearningService } from './patternLearningService';
import type { MovementSession, MovementPattern, TrackerStructure } from './types';

export class DomainAwarePatternService extends PatternLearningService {
  /**
   * Analyze patterns with domain awareness
   */
  async analyzePatterns(
    userId: string,
    structure: TrackerStructure,
    timeWindow: { days: number } = { days: 56 }
  ): Promise<DomainAwareMovementPattern> {
    const sessions = await this.getSessions(userId, timeWindow);
    
    // Base patterns
    const basePatterns = await super.analyzePatterns(userId, timeWindow);
    
    // Domain-specific patterns
    const domainPatterns: Record<string, DomainPattern> = {};
    
    for (const category of structure.categories) {
      const domainSessions = sessions.filter(s => 
        s.domain === category.domain || s.activity === category.id
      );
      
      if (domainSessions.length > 0) {
        domainPatterns[category.id] = await this.analyzeDomainPatterns(
          category,
          domainSessions,
          structure.patternConfig.domainSpecific[category.id]
        );
      }
    }
    
    return {
      ...basePatterns,
      domainPatterns,
    };
  }
  
  /**
   * Analyze patterns for a specific domain
   */
  private async analyzeDomainPatterns(
    category: TrackerCategory,
    sessions: MovementSession[],
    config: any
  ): Promise<DomainPattern> {
    const patterns: DomainPattern = {
      sessionBalance: null,
      intensityClustering: null,
      trainingVsCompetition: null,
      // ... domain-specific patterns
    };
    
    if (category.domain === 'gym' && config.trackSessionBalance) {
      patterns.sessionBalance = this.analyzeSessionBalance(sessions);
    }
    
    if (category.domain === 'gym' && config.trackIntensityClustering) {
      patterns.intensityClustering = this.analyzeIntensityClustering(sessions);
    }
    
    if (category.domain === 'sport' && config.trackTrainingVsCompetition) {
      patterns.trainingVsCompetition = this.analyzeTrainingVsCompetition(sessions);
    }
    
    // ... more domain-specific analyses
    
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
      percentage: (count / total) * 100,
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
    // Group by session type and analyze intensity distribution
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
   * Analyze training vs competition (sport-specific)
   */
  private analyzeTrainingVsCompetition(sessions: MovementSession[]): TrainingVsCompetition {
    const training = sessions.filter(s => s.context === 'training' || !s.context).length;
    const competition = sessions.filter(s => s.context === 'competition' || s.context === 'match').length;
    const total = sessions.length;
    
    return {
      training: {
        count: training,
        percentage: (training / total) * 100,
      },
      competition: {
        count: competition,
        percentage: (competition / total) * 100,
      },
      ratio: training > 0 ? competition / training : 0,
    };
  }
  
  // Helper methods...
  private calculateBalanceScore(distribution: Array<{type: string, percentage: number}>): number {
    // Calculate how balanced the distribution is (0-1, higher = more balanced)
    const variance = this.variance(distribution.map(d => d.percentage));
    return 1 - Math.min(variance / 100, 1); // Normalize
  }
  
  private getIntensityDistribution(intensities: number[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    const total = intensities.length;
    
    for (let i = 1; i <= 5; i++) {
      distribution[i] = intensities.filter(int => int === i).length / total * 100;
    }
    
    return distribution;
  }
}
```

---

## 5. Capability Unlocking

### 5.1 Capability Detection Service

**File:** `src/lib/fitnessTracker/capabilityDetectionService.ts`

```typescript
import type { MovementSession, UserMovementProfile } from './types';

export class CapabilityDetectionService {
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
    
    return unlocks;
  }
  
  private hasStructuredSessions(sessions: MovementSession[]): boolean {
    if (sessions.length < 10) return false;
    
    const withSessionType = sessions.filter(s => s.sessionType).length;
    return withSessionType / sessions.length > 0.7; // 70% have session type
  }
  
  private hasHighFrequency(sessions: MovementSession[]): boolean {
    if (sessions.length < 14) return false;
    
    const recentSessions = sessions.slice(-14); // Last 2 weeks
    const frequency = recentSessions.length / 14 * 7; // Sessions per week
    
    return frequency >= 4; // 4+ sessions per week
  }
  
  private hasConsistentIntensity(sessions: MovementSession[]): boolean {
    if (sessions.length < 10) return false;
    
    const withIntensity = sessions.filter(s => s.perceivedIntensity).length;
    return withIntensity / sessions.length > 0.8; // 80% report intensity
  }
  
  private hasDetailedLogging(sessions: MovementSession[]): boolean {
    if (sessions.length < 10) return false;
    
    // Check for domain-specific detail fields
    const withDetails = sessions.filter(s => {
      if (s.domain === 'gym' && s.exercises) return true;
      if (s.domain === 'sport' && (s.distance_km || s.pace_per_km)) return true;
      return false;
    }).length;
    
    return withDetails / sessions.length > 0.5; // 50% have details
  }
  
  private hasCompetitivePatterns(sessions: MovementSession[]): boolean {
    if (sessions.length < 20) return false;
    
    // Check for competition context
    const competitions = sessions.filter(s => 
      s.context === 'competition' || s.context === 'match'
    ).length;
    
    // Check for structured training patterns
    const structured = sessions.filter(s => 
      s.sessionType && ['easy', 'tempo', 'intervals', 'long'].includes(s.sessionType)
    ).length;
    
    return competitions > 0 || structured / sessions.length > 0.6;
  }
  
  /**
   * Update profile with unlocked features
   */
  async updateUnlocks(userId: string, unlocks: CapabilityUnlock[]): Promise<void> {
    const unlockedFeatures = unlocks.map(u => u.feature);
    
    await supabase
      .from('user_movement_profiles')
      .update({
        unlocked_features: unlockedFeatures,
        capability_unlocks: unlocks,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }
}
```

---

## 6. Frontend Components

### 6.1 Discovery Wizard Component

**File:** `src/components/fitness-tracker/DiscoveryWizard.tsx`

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiscoveryService } from '../../lib/fitnessTracker/discoveryService';
import type { MovementDomain, DomainDetail } from '../../lib/fitnessTracker/types';

export function DiscoveryWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDomains, setSelectedDomains] = useState<MovementDomain[]>([]);
  const [domainDetails, setDomainDetails] = useState<Record<MovementDomain, DomainDetail>>({});
  const [movementLevel, setMovementLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const discoveryService = new DiscoveryService();
  
  const handleComplete = async () => {
    setLoading(true);
    try {
      await discoveryService.completeDiscovery({
        primaryDomains: selectedDomains,
        domainDetails,
        movementLevel: movementLevel as any,
      });
      navigate('/fitness-tracker');
    } catch (error) {
      console.error('Discovery failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="discovery-wizard">
      {step === 1 && (
        <DomainSelectionStep
          selectedDomains={selectedDomains}
          onSelect={setSelectedDomains}
          onNext={() => setStep(2)}
        />
      )}
      
      {step === 2 && (
        <DomainDetailsStep
          selectedDomains={selectedDomains}
          domainDetails={domainDetails}
          onUpdate={setDomainDetails}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      
      {step === 3 && (
        <LevelDetectionStep
          movementLevel={movementLevel}
          onSelect={setMovementLevel}
          onBack={() => setStep(2)}
          onSkip={handleComplete}
          onComplete={handleComplete}
          loading={loading}
        />
      )}
    </div>
  );
}
```

### 6.2 Dynamic Quick Log Component

**File:** `src/components/fitness-tracker/DynamicQuickLog.tsx`

```typescript
import { useEffect, useState } from 'react';
import { getUIConfiguration } from '../../lib/fitnessTracker/uiService';
import { createMovementSession } from '../../lib/fitnessTracker/movementSessionService';
import type { QuickLogButton } from '../../lib/fitnessTracker/types';

export function DynamicQuickLog() {
  const [buttons, setButtons] = useState<QuickLogButton[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadConfiguration();
  }, []);
  
  const loadConfiguration = async () => {
    try {
      const config = await getUIConfiguration();
      setButtons(config.quickLogButtons);
    } catch (error) {
      console.error('Failed to load UI configuration:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuickLog = async (button: QuickLogButton) => {
    try {
      await createMovementSession({
        domain: getDomainFromCategory(button.category),
        activity: button.category,
        sessionType: button.subcategory,
        timestamp: new Date().toISOString(),
      });
      // Show success feedback
    } catch (error) {
      console.error('Failed to log session:', error);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="dynamic-quick-log">
      <h2>Quick Log</h2>
      <div className="quick-log-grid">
        {buttons.map(button => (
          <button
            key={button.id}
            onClick={() => handleQuickLog(button)}
            className="quick-log-button"
            style={{ borderColor: button.color }}
          >
            <Icon name={button.icon} />
            <span>{button.label}</span>
          </button>
        ))}
      </div>
      <button className="add-details-button">
        Add More Details
      </button>
    </div>
  );
}
```

### 6.3 Domain-Aware Pattern View

**File:** `src/components/fitness-tracker/DomainAwarePatternView.tsx`

```typescript
import { useEffect, useState } from 'react';
import { getTrackerStructure } from '../../lib/fitnessTracker/trackerService';
import { DomainAwarePatternService } from '../../lib/fitnessTracker/domainAwarePatternService';
import type { TrackerStructure, DomainAwareMovementPattern } from '../../lib/fitnessTracker/types';

export function DomainAwarePatternView() {
  const [structure, setStructure] = useState<TrackerStructure | null>(null);
  const [patterns, setPatterns] = useState<DomainAwareMovementPattern | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [trackerStructure, patternData] = await Promise.all([
        getTrackerStructure(),
        new DomainAwarePatternService().analyzePatterns(userId, trackerStructure),
      ]);
      setStructure(trackerStructure);
      setPatterns(patternData);
    } catch (error) {
      console.error('Failed to load patterns:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading patterns...</div>;
  if (!structure || !patterns) return <div>No data available</div>;
  
  return (
    <div className="domain-aware-pattern-view">
      <h2>Movement Patterns</h2>
      
      {/* Domain-specific visualizations */}
      {structure.categories.map(category => {
        const domainPattern = patterns.domainPatterns[category.id];
        if (!domainPattern) return null;
        
        return (
          <div key={category.id} className="domain-pattern-section">
            <h3>{category.name}</h3>
            
            {category.domain === 'gym' && domainPattern.sessionBalance && (
              <SessionBalanceChart data={domainPattern.sessionBalance} />
            )}
            
            {category.domain === 'sport' && domainPattern.trainingVsCompetition && (
              <TrainingVsCompetitionChart data={domainPattern.trainingVsCompetition} />
            )}
            
            {/* More domain-specific visualizations */}
          </div>
        );
      })}
      
      {/* Common visualizations */}
      <FrequencyPatternChart data={patterns.frequency} />
      <SustainabilityIndicator score={patterns.sustainabilityScore} />
    </div>
  );
}
```

---

## 7. Development Milestones

### Milestone 1: Discovery Flow (Week 1-2)
- [ ] Database schema for profiles and structures
- [ ] Discovery service implementation
- [ ] Tracker assembler (basic)
- [ ] Discovery wizard UI
- [ ] Domain selection step
- [ ] Domain details step
- [ ] Level detection step

### Milestone 2: Tracker Assembly (Week 3-4)
- [ ] Complete tracker assembler
- [ ] Category generation for all domains
- [ ] Subcategory generation
- [ ] Field unlocking logic
- [ ] UI configuration generation
- [ ] Pattern config generation
- [ ] Insight config generation

### Milestone 3: Dynamic UI (Week 5-6)
- [ ] Quick log button generation
- [ ] Dynamic quick log component
- [ ] Pattern visualization generation
- [ ] Domain-aware pattern view
- [ ] Reconfiguration flow

### Milestone 4: Session Logging (Week 7-8)
- [ ] Movement session API
- [ ] Domain-aware session creation
- [ ] Optional field handling
- [ ] Session list view
- [ ] Session detail view

### Milestone 5: Pattern Analysis (Week 9-10)
- [ ] Domain-aware pattern service
- [ ] Gym-specific pattern analysis
- [ ] Sport-specific pattern analysis
- [ ] Mixed-mode pattern analysis
- [ ] Pattern visualization components

### Milestone 6: Capability Unlocking (Week 11-12)
- [ ] Capability detection service
- [ ] Usage pattern analysis
- [ ] Automatic feature unlocking
- [ ] Unlock persistence
- [ ] UI adaptation for unlocks

### Milestone 7: Insights & Polish (Week 13-14)
- [ ] Domain-aware insight generation
- [ ] Level-appropriate insights
- [ ] Insight display components
- [ ] Reconfiguration UI
- [ ] Testing and refinement

---

## 8. Testing Strategy

### 8.1 Discovery Flow Testing

- Test all domain combinations
- Test domain detail variations
- Test level detection accuracy
- Test tracker assembly correctness
- Test UI configuration generation

### 8.2 Assembly Testing

- Test category generation for each domain
- Test subcategory generation
- Test field unlocking
- Test UI button generation
- Test pattern config generation

### 8.3 Reconfiguration Testing

- Test adding domains
- Test removing domains
- Test updating domain details
- Test data preservation
- Test UI updates

### 8.4 Pattern Analysis Testing

- Test domain-specific patterns
- Test mixed-mode patterns
- Test capability detection
- Test insight generation

---

## 9. Performance Considerations

### 9.1 Discovery & Assembly

- Cache assembled structures
- Lazy load domain details
- Optimize category generation
- Background processing for complex assemblies

### 9.2 Pattern Analysis

- Incremental analysis (only new sessions)
- Cache pattern results
- Background processing
- Domain-specific analysis optimization

### 9.3 UI Rendering

- Lazy load pattern visualizations
- Virtual scrolling for session lists
- Optimistic UI updates
- Progressive enhancement

---

## 10. Security & Privacy

### 10.1 Data Privacy

- All data user-specific
- No sharing without consent
- User can export/delete all data
- No comparison to others

### 10.2 Authentication

- Supabase Auth integration
- Row-level security policies
- API authentication middleware

---

## 11. Deployment Plan

### 11.1 Infrastructure

- Supabase for database and auth
- Vercel for frontend
- Background jobs for pattern analysis
- Edge functions for assembly

### 11.2 Monitoring

- Error tracking (Sentry)
- Performance monitoring
- User analytics (privacy-respecting)
- Discovery completion tracking

---

## 12. Future Enhancements

- Machine learning for domain suggestion
- Community templates for common setups
- Coach/therapist-assisted setup
- Real-time UI adaptation
- Predictive category suggestions
- Automatic subcategory addition

---

**Next Steps:**
1. Review implementation plan
2. Set up database schema
3. Begin Milestone 1 development
4. Iterate based on user feedback
