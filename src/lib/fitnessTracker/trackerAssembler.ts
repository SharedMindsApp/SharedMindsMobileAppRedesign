/**
 * Tracker Assembler
 * 
 * Assembles tracker structure, UI configuration, and insights
 * based on user's movement discovery
 */

import type {
  MovementDomain,
  DomainDetail,
  TrackerStructure,
  TrackerCategory,
  TrackerSubcategory,
  FieldDefinition,
  UIConfiguration,
  QuickLogButton,
  PatternRecognitionConfig,
  InsightGenerationConfig,
  InsightPreferences,
} from './types';
import { TEAM_SPORTS, INDIVIDUAL_SPORTS, getSportMetadata } from './sportDefinitions';

export class TrackerAssembler {
  private static structureCache = new Map<
    string,
    { timestamp: number; value: TrackerStructure }
  >();
  private static uiConfigCache = new Map<
    string,
    { timestamp: number; value: UIConfiguration }
  >();
  private static insightPrefsCache = new Map<
    string,
    { timestamp: number; value: InsightPreferences }
  >();
  private static cacheTtlMs = 5 * 60 * 1000;

  /**
   * Assemble tracker structure from discovery data
   */
  async assembleTracker(discoveryData: {
    primaryDomains: MovementDomain[];
    domainDetails: Record<MovementDomain, DomainDetail>;
    movementLevel?: string;
  }): Promise<TrackerStructure> {
    const cacheKey = this.getDiscoveryCacheKey(discoveryData);
    const cached = TrackerAssembler.structureCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TrackerAssembler.cacheTtlMs) {
      return cached.value;
    }

    const categories = this.generateCategories(discoveryData.primaryDomains, discoveryData.domainDetails);
    const subcategories = this.generateSubcategories(
      discoveryData.primaryDomains,
      discoveryData.domainDetails
    );
    const availableFields = this.unlockFields(discoveryData.primaryDomains);
    const patternConfig = this.configurePatterns(discoveryData);
    const insightConfig = this.configureInsights(discoveryData);
    
    const structure = {
      categories,
      subcategories,
      availableFields,
      patternConfig,
      insightConfig,
    };
    TrackerAssembler.structureCache.set(cacheKey, {
      timestamp: Date.now(),
      value: structure,
    });
    return structure;
  }
  
  /**
   * Generate categories based on selected domains
   * For team_sports and individual_sports, creates a separate category for each selected sport
   */
  private generateCategories(
    domains: MovementDomain[],
    details?: Record<MovementDomain, DomainDetail>
  ): TrackerCategory[] {
    const categoryMap: Record<MovementDomain, Omit<TrackerCategory, 'subcategories'>> = {
      gym: {
        id: 'gym',
        name: 'Gym Sessions',
        domain: 'gym',
        icon: 'Dumbbell',
        color: '#DC2626',
      },
      running: {
        id: 'running',
        name: 'Running Sessions',
        domain: 'running',
        icon: 'Footprints',
        color: '#EA580C',
      },
      cycling: {
        id: 'cycling',
        name: 'Cycling Sessions',
        domain: 'cycling',
        icon: 'Bike',
        color: '#059669',
      },
      swimming: {
        id: 'swimming',
        name: 'Swimming Sessions',
        domain: 'swimming',
        icon: 'Waves',
        color: '#0284C7',
      },
      team_sports: {
        id: 'team_sports',
        name: 'Team Sports',
        domain: 'team_sports',
        icon: 'Users',
        color: '#7C3AED',
      },
      individual_sports: {
        id: 'individual_sports',
        name: 'Individual Sports',
        domain: 'individual_sports',
        icon: 'Target',
        color: '#C026D3',
      },
      martial_arts: {
        id: 'martial_arts',
        name: 'Martial Arts',
        domain: 'martial_arts',
        icon: 'Sword',
        color: '#DC2626',
      },
      yoga: {
        id: 'yoga',
        name: 'Yoga / Mobility',
        domain: 'yoga',
        icon: 'Flower2',
        color: '#7C3AED',
      },
      rehab: {
        id: 'rehab',
        name: 'Rehab / Physio',
        domain: 'rehab',
        icon: 'Heart',
        color: '#10B981',
      },
      other: {
        id: 'other',
        name: 'Other Movement',
        domain: 'other',
        icon: 'Activity',
        color: '#6B7280',
      },
    };
    
    const categories: TrackerCategory[] = [];
    
    for (const domain of domains) {
      // For team_sports and individual_sports, create a separate category for each sport
      if (domain === 'team_sports' && details?.[domain]?.sports) {
        const sports = details[domain].sports || [];
        for (const sport of sports) {
          const sportId = `team_sport_${sport.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '').replace(/[/]/g, '_')}`;
          const metadata = getSportMetadata(sport);
          categories.push({
            id: sportId,
            name: sport,
            domain: 'team_sports', // Keep original domain for data filtering
            icon: metadata.icon,
            color: metadata.color,
            subcategories: [],
          });
        }
      } else if (domain === 'individual_sports' && details?.[domain]?.individualSports) {
        const sports = details[domain].individualSports || [];
        for (const sport of sports) {
          const sportId = `individual_sport_${sport.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '').replace(/[/]/g, '_')}`;
          const metadata = getSportMetadata(sport);
          categories.push({
            id: sportId,
            name: sport,
            domain: 'individual_sports', // Keep original domain for data filtering
            icon: metadata.icon,
            color: metadata.color,
            subcategories: [],
          });
        }
      } else {
        // Standard domain - create single category
        categories.push({
          ...categoryMap[domain],
          subcategories: [],
        });
      }
    }
    
    return categories;
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
      case 'individual_sports':
        return this.getIndividualSportsSubcategories(detail);
      case 'martial_arts':
        return this.getMartialArtsSubcategories(detail);
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
    const subcategories: TrackerSubcategory[] = [
      {
        id: 'cardio',
        name: 'Cardio',
        parentCategory: 'gym',
        optionalFields: ['duration_minutes', 'machine_type'],
      },
      {
        id: 'upper_body',
        name: 'Upper Body',
        parentCategory: 'gym',
        optionalFields: ['exercises', 'sets', 'reps', 'weight', 'rpe'],
      },
      {
        id: 'lower_body',
        name: 'Lower Body',
        parentCategory: 'gym',
        optionalFields: ['exercises', 'sets', 'reps', 'weight', 'rpe'],
      },
      {
        id: 'full_body',
        name: 'Full Body',
        parentCategory: 'gym',
        optionalFields: ['exercises', 'sets', 'reps', 'weight', 'rpe'],
      },
    ];
    
    if (detail.activities?.includes('classes')) {
      subcategories.push({
        id: 'classes',
        name: 'Classes',
        parentCategory: 'gym',
        optionalFields: ['class_type', 'duration_minutes'],
      });
    }
    
    subcategories.push({
      id: 'recovery',
      name: 'Recovery / Mobility',
      parentCategory: 'gym',
      optionalFields: ['duration_minutes'],
    });
    
    return subcategories;
  }
  
  /**
   * Running subcategories
   */
  private getRunningSubcategories(detail: DomainDetail): TrackerSubcategory[] {
    const isStructured = detail.activities?.some(a => 
      a.includes('structured') || a.includes('training')
    );
    
    if (isStructured) {
      return [
        {
          id: 'easy',
          name: 'Easy',
          parentCategory: 'running',
          optionalFields: ['distance_km', 'pace_per_km', 'terrain'],
        },
        {
          id: 'tempo',
          name: 'Tempo',
          parentCategory: 'running',
          optionalFields: ['distance_km', 'pace_per_km', 'terrain'],
        },
        {
          id: 'intervals',
          name: 'Intervals',
          parentCategory: 'running',
          optionalFields: ['distance_km', 'pace_per_km'],
        },
        {
          id: 'long',
          name: 'Long Run',
          parentCategory: 'running',
          optionalFields: ['distance_km', 'pace_per_km', 'terrain'],
        },
        {
          id: 'competition',
          name: 'Competition',
          parentCategory: 'running',
          optionalFields: ['distance_km', 'pace_per_km', 'race_type'],
        },
      ];
    } else {
      return [
        {
          id: 'easy',
          name: 'Easy Run',
          parentCategory: 'running',
          optionalFields: ['distance_km', 'duration_minutes', 'terrain'],
        },
        {
          id: 'tempo',
          name: 'Faster Run',
          parentCategory: 'running',
          optionalFields: ['distance_km', 'duration_minutes', 'terrain'],
        },
      ];
    }
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
        optionalFields: ['distance_km', 'duration_minutes', 'terrain'],
      },
      {
        id: 'tempo',
        name: 'Tempo Ride',
        parentCategory: 'cycling',
        optionalFields: ['distance_km', 'duration_minutes', 'terrain'],
      },
      {
        id: 'intervals',
        name: 'Intervals',
        parentCategory: 'cycling',
        optionalFields: ['distance_km', 'duration_minutes'],
      },
      {
        id: 'long',
        name: 'Long Ride',
        parentCategory: 'cycling',
        optionalFields: ['distance_km', 'duration_minutes', 'terrain'],
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
        optionalFields: ['distance_meters', 'duration_minutes', 'stroke_type'],
      },
      {
        id: 'intervals',
        name: 'Intervals',
        parentCategory: 'swimming',
        optionalFields: ['distance_meters', 'duration_minutes', 'stroke_type'],
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
    const sports = detail.sports || ['Team Sport'];
    
    return sports.map(sport => ({
      id: sport.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '').replace(/[/]/g, '_'),
      name: sport,
      parentCategory: `team_sport_${sport.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '').replace(/[/]/g, '_')}`,
      optionalFields: ['match_type', 'position', 'minutes_played', 'goals', 'assists', 'saves', 'cards', 'team_score', 'opponent_score', 'result'],
    }));
  }

  /**
   * Individual sports subcategories
   */
  private getIndividualSportsSubcategories(detail: DomainDetail): TrackerSubcategory[] {
    const sports = detail.individualSports || ['Individual Sport'];
    
    return sports.map(sport => ({
      id: sport.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '').replace(/[/]/g, '_'),
      name: sport,
      parentCategory: `individual_sport_${sport.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '').replace(/[/]/g, '_')}`,
      optionalFields: ['match_type', 'opponent', 'your_score', 'opponent_score', 'result', 'sets_games', 'surface'],
    }));
  }
  
  /**
   * Martial arts subcategories
   */
  private getMartialArtsSubcategories(detail: DomainDetail): TrackerSubcategory[] {
    // Get disciplines from domain details (e.g., ['BJJ', 'Boxing', 'Wrestling'])
    const disciplines = detail.disciplines || [];
    
    // If no disciplines specified, provide default options
    if (disciplines.length === 0) {
      return [
        {
          id: 'general',
          name: 'General Martial Arts',
          parentCategory: 'martial_arts',
          optionalFields: ['session_type', 'rounds', 'round_duration', 'technique_focus'],
        },
      ];
    }
    
    // Generate subcategory for each discipline
    return disciplines.map(discipline => ({
      id: discipline.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, ''),
      name: discipline,
      parentCategory: 'martial_arts',
      optionalFields: ['session_type', 'rounds', 'round_duration', 'technique_focus', 'sparring_type', 'partner_level'],
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
    const allFields: FieldDefinition[] = [
      {
        id: 'duration_minutes',
        type: 'number',
        label: 'Duration (minutes)',
        optional: true,
      },
      {
        id: 'perceived_intensity',
        type: 'number',
        label: 'Intensity (1-5)',
        optional: true,
        validation: { min: 1, max: 5 },
      },
      {
        id: 'body_state',
        type: 'select',
        label: 'Body State',
        optional: true,
        options: [
          { value: 'fresh', label: 'Fresh' },
          { value: 'sore', label: 'Sore' },
          { value: 'fatigued', label: 'Fatigued' },
          { value: 'stiff', label: 'Stiff' },
          { value: 'injured', label: 'Injured' },
          { value: 'recovered', label: 'Recovered' },
        ],
      },
      {
        id: 'notes',
        type: 'text',
        label: 'Notes',
        optional: true,
        validation: { maxLength: 2000 },
      },
      {
        id: 'bodyweight_kg',
        type: 'number',
        label: 'Bodyweight (kg)',
        optional: true,
        validation: { min: 0 },
      },
    ];
    
    // Domain-specific fields
    if (domains.includes('gym')) {
      allFields.push(
        { id: 'exercises', type: 'text', label: 'Exercises', optional: true },
        { id: 'sets', type: 'number', label: 'Total Sets', optional: true, validation: { min: 0 } },
        { id: 'reps', type: 'number', label: 'Reps per Set', optional: true, validation: { min: 0 } },
        { id: 'weight', type: 'number', label: 'Weight (kg)', optional: true, validation: { min: 0 } },
        { id: 'rpe', type: 'number', label: 'RPE (Rate of Perceived Exertion 1-10)', optional: true, validation: { min: 1, max: 10 } },
        { id: 'training_volume', type: 'number', label: 'Total Volume (kg)', optional: true, validation: { min: 0 } },
        { id: 'rest_seconds', type: 'number', label: 'Rest Period (seconds)', optional: true, validation: { min: 0 } },
        { id: 'muscle_groups', type: 'select', label: 'Primary Muscle Groups', optional: true, options: [
          { value: 'chest', label: 'Chest' },
          { value: 'back', label: 'Back' },
          { value: 'shoulders', label: 'Shoulders' },
          { value: 'arms', label: 'Arms' },
          { value: 'legs', label: 'Legs' },
          { value: 'core', label: 'Core' },
          { value: 'full_body', label: 'Full Body' },
        ]},
        { id: 'exercise_type', type: 'select', label: 'Exercise Type', optional: true, options: [
          { value: 'strength', label: 'Strength' },
          { value: 'hypertrophy', label: 'Hypertrophy' },
          { value: 'power', label: 'Power' },
          { value: 'endurance', label: 'Endurance' },
          { value: 'mobility', label: 'Mobility' },
          { value: 'cardio', label: 'Cardio' },
        ]},
        { id: 'tempo', type: 'text', label: 'Tempo (e.g., 3-1-1-0)', optional: true },
        { id: 'to_failure', type: 'select', label: 'To Failure?', optional: true, options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'some_sets', label: 'Some Sets' },
        ]},
        { id: 'machine_type', type: 'text', label: 'Machine/Equipment Type', optional: true },
        { id: 'cardio_type', type: 'select', label: 'Cardio Type', optional: true, options: [
          { value: 'treadmill', label: 'Treadmill' },
          { value: 'bike', label: 'Stationary Bike' },
          { value: 'rower', label: 'Rowing Machine' },
          { value: 'elliptical', label: 'Elliptical' },
          { value: 'stairs', label: 'Stair Master' },
        ]},
        { id: 'class_type', type: 'text', label: 'Class Type (if applicable)', optional: true },
      );
    }
    
    if (domains.includes('running')) {
      allFields.push(
        { id: 'distance_km', type: 'number', label: 'Distance (km)', optional: true, validation: { min: 0 } },
        { id: 'pace_per_km', type: 'text', label: 'Average Pace (per km)', optional: true },
        { id: 'terrain', type: 'select', label: 'Terrain', optional: true, options: [
          { value: 'road', label: 'Road' },
          { value: 'trail', label: 'Trail' },
          { value: 'track', label: 'Track' },
          { value: 'treadmill', label: 'Treadmill' },
          { value: 'beach', label: 'Beach' },
          { value: 'grass', label: 'Grass' },
        ]},
        { id: 'elevation_meters', type: 'number', label: 'Elevation Gain (meters)', optional: true, validation: { min: 0 } },
        { id: 'avg_heart_rate', type: 'number', label: 'Average Heart Rate (bpm)', optional: true, validation: { min: 40, max: 220 } },
        { id: 'max_heart_rate', type: 'number', label: 'Max Heart Rate (bpm)', optional: true, validation: { min: 40, max: 220 } },
        { id: 'heart_rate_zones', type: 'text', label: 'Time in HR Zones (JSON)', optional: true },
        { id: 'cadence', type: 'number', label: 'Average Cadence (steps/min)', optional: true, validation: { min: 0 } },
        { id: 'splits', type: 'text', label: 'Splits/Km Times (comma-separated)', optional: true },
        { id: 'surface_type', type: 'select', label: 'Surface Type', optional: true, options: [
          { value: 'paved', label: 'Paved' },
          { value: 'dirt', label: 'Dirt' },
          { value: 'gravel', label: 'Gravel' },
          { value: 'sand', label: 'Sand' },
          { value: 'snow', label: 'Snow' },
        ]},
        { id: 'weather', type: 'select', label: 'Weather', optional: true, options: [
          { value: 'sunny', label: 'Sunny' },
          { value: 'cloudy', label: 'Cloudy' },
          { value: 'rainy', label: 'Rainy' },
          { value: 'windy', label: 'Windy' },
          { value: 'cold', label: 'Cold' },
          { value: 'hot', label: 'Hot' },
        ]},
        { id: 'temperature_celsius', type: 'number', label: 'Temperature (°C)', optional: true },
        { id: 'effort_level', type: 'select', label: 'Perceived Effort', optional: true, options: [
          { value: 'easy', label: 'Easy' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'hard', label: 'Hard' },
          { value: 'max', label: 'Maximum' },
        ]},
      );
    }

    if (domains.includes('cycling')) {
      allFields.push(
        { id: 'distance_km', type: 'number', label: 'Distance (km)', optional: true, validation: { min: 0 } },
        { id: 'pace_per_km', type: 'text', label: 'Average Speed (km/h)', optional: true },
        { id: 'terrain', type: 'select', label: 'Terrain', optional: true, options: [
          { value: 'road', label: 'Road' },
          { value: 'mountain', label: 'Mountain' },
          { value: 'trail', label: 'Trail' },
          { value: 'indoor', label: 'Indoor/Trainer' },
        ]},
        { id: 'elevation_meters', type: 'number', label: 'Elevation Gain (meters)', optional: true, validation: { min: 0 } },
        { id: 'avg_power', type: 'number', label: 'Average Power (watts)', optional: true, validation: { min: 0 } },
        { id: 'max_power', type: 'number', label: 'Max Power (watts)', optional: true, validation: { min: 0 } },
        { id: 'avg_cadence', type: 'number', label: 'Average Cadence (rpm)', optional: true, validation: { min: 0 } },
        { id: 'avg_heart_rate', type: 'number', label: 'Average Heart Rate (bpm)', optional: true, validation: { min: 40, max: 220 } },
        { id: 'max_heart_rate', type: 'number', label: 'Max Heart Rate (bpm)', optional: true, validation: { min: 40, max: 220 } },
        { id: 'bike_type', type: 'select', label: 'Bike Type', optional: true, options: [
          { value: 'road', label: 'Road Bike' },
          { value: 'mountain', label: 'Mountain Bike' },
          { value: 'hybrid', label: 'Hybrid' },
          { value: 'gravel', label: 'Gravel' },
          { value: 'electric', label: 'E-Bike' },
          { value: 'indoor_trainer', label: 'Indoor Trainer' },
        ]},
        { id: 'weather', type: 'select', label: 'Weather', optional: true, options: [
          { value: 'sunny', label: 'Sunny' },
          { value: 'cloudy', label: 'Cloudy' },
          { value: 'rainy', label: 'Rainy' },
          { value: 'windy', label: 'Windy' },
          { value: 'cold', label: 'Cold' },
          { value: 'hot', label: 'Hot' },
        ]},
        { id: 'temperature_celsius', type: 'number', label: 'Temperature (°C)', optional: true },
      );
    }
    
    if (domains.includes('swimming')) {
      allFields.push(
        { id: 'distance_meters', type: 'number', label: 'Total Distance (meters)', optional: true, validation: { min: 0 } },
        { id: 'stroke_type', type: 'select', label: 'Primary Stroke', optional: true, options: [
          { value: 'freestyle', label: 'Freestyle' },
          { value: 'backstroke', label: 'Backstroke' },
          { value: 'breaststroke', label: 'Breaststroke' },
          { value: 'butterfly', label: 'Butterfly' },
          { value: 'mixed', label: 'Mixed/IM' },
        ]},
        { id: 'pool_length', type: 'select', label: 'Pool Length', optional: true, options: [
          { value: '25m', label: '25 meters' },
          { value: '50m', label: '50 meters' },
          { value: '33m', label: '33 meters (yd pool)' },
          { value: 'open_water', label: 'Open Water' },
        ]},
        { id: 'laps', type: 'number', label: 'Number of Laps', optional: true, validation: { min: 0 } },
        { id: 'stroke_count', type: 'number', label: 'Strokes per Length', optional: true, validation: { min: 0 } },
        { id: 'intervals', type: 'text', label: 'Interval Times (comma-separated)', optional: true },
        { id: 'kick_pull_focus', type: 'select', label: 'Session Focus', optional: true, options: [
          { value: 'full_swim', label: 'Full Swim' },
          { value: 'kick', label: 'Kick Focus' },
          { value: 'pull', label: 'Pull Focus' },
          { value: 'drills', label: 'Drills' },
        ]},
        { id: 'water_type', type: 'select', label: 'Water Type', optional: true, options: [
          { value: 'pool', label: 'Pool' },
          { value: 'open_water', label: 'Open Water' },
          { value: 'ocean', label: 'Ocean' },
          { value: 'lake', label: 'Lake' },
        ]},
        { id: 'water_temperature', type: 'number', label: 'Water Temperature (°C)', optional: true },
      );
    }
    
    if (domains.includes('team_sports')) {
      allFields.push(
        { id: 'match_type', type: 'select', label: 'Match Type', optional: true, options: [
          { value: 'training', label: 'Training' },
          { value: 'friendly', label: 'Friendly Match' },
          { value: 'league', label: 'League Match' },
          { value: 'cup', label: 'Cup/Competition' },
          { value: 'tournament', label: 'Tournament' },
        ]},
        { id: 'position', type: 'text', label: 'Position Played', optional: true },
        { id: 'minutes_played', type: 'number', label: 'Minutes Played', optional: true, validation: { min: 0 } },
        { id: 'goals', type: 'number', label: 'Goals Scored', optional: true, validation: { min: 0 } },
        { id: 'assists', type: 'number', label: 'Assists', optional: true, validation: { min: 0 } },
        { id: 'saves', type: 'number', label: 'Saves (if goalkeeper)', optional: true, validation: { min: 0 } },
        { id: 'cards', type: 'select', label: 'Cards Received', optional: true, options: [
          { value: 'none', label: 'None' },
          { value: 'yellow', label: 'Yellow' },
          { value: 'red', label: 'Red' },
        ]},
        { id: 'substituted', type: 'select', label: 'Substituted?', optional: true, options: [
          { value: 'started', label: 'Started (full match)' },
          { value: 'subbed_in', label: 'Subbed In' },
          { value: 'subbed_out', label: 'Subbed Out' },
        ]},
        { id: 'team_score', type: 'number', label: 'Team Score', optional: true, validation: { min: 0 } },
        { id: 'opponent_score', type: 'number', label: 'Opponent Score', optional: true, validation: { min: 0 } },
        { id: 'result', type: 'select', label: 'Result', optional: true, options: [
          { value: 'win', label: 'Win' },
          { value: 'draw', label: 'Draw' },
          { value: 'loss', label: 'Loss' },
        ]},
        { id: 'surface', type: 'select', label: 'Surface', optional: true, options: [
          { value: 'grass', label: 'Grass' },
          { value: 'artificial', label: 'Artificial Turf' },
          { value: 'indoor', label: 'Indoor' },
          { value: 'hard_court', label: 'Hard Court' },
        ]},
        { id: 'weather', type: 'select', label: 'Weather', optional: true, options: [
          { value: 'sunny', label: 'Sunny' },
          { value: 'cloudy', label: 'Cloudy' },
          { value: 'rainy', label: 'Rainy' },
          { value: 'cold', label: 'Cold' },
        ]},
      );
    }

    if (domains.includes('individual_sports')) {
      allFields.push(
        { id: 'sport_type', type: 'text', label: 'Sport Type', optional: true },
        { id: 'opponent', type: 'text', label: 'Opponent Name', optional: true },
        { id: 'match_type', type: 'select', label: 'Match Type', optional: true, options: [
          { value: 'training', label: 'Training' },
          { value: 'friendly', label: 'Friendly' },
          { value: 'tournament', label: 'Tournament' },
          { value: 'competition', label: 'Competition' },
        ]},
        { id: 'your_score', type: 'number', label: 'Your Score', optional: true, validation: { min: 0 } },
        { id: 'opponent_score', type: 'number', label: 'Opponent Score', optional: true, validation: { min: 0 } },
        { id: 'result', type: 'select', label: 'Result', optional: true, options: [
          { value: 'win', label: 'Win' },
          { value: 'loss', label: 'Loss' },
          { value: 'draw', label: 'Draw' },
        ]},
        { id: 'sets_games', type: 'text', label: 'Sets/Games (e.g., 6-4, 6-3)', optional: true },
        { id: 'surface', type: 'select', label: 'Surface', optional: true, options: [
          { value: 'hard', label: 'Hard Court' },
          { value: 'clay', label: 'Clay' },
          { value: 'grass', label: 'Grass' },
          { value: 'carpet', label: 'Carpet' },
        ]},
      );
    }
    
    if (domains.includes('martial_arts')) {
      allFields.push(
        { id: 'rounds', type: 'number', label: 'Number of Rounds', optional: true, validation: { min: 0 } },
        { id: 'round_duration', type: 'number', label: 'Minutes per Round', optional: true, validation: { min: 0 } },
        { id: 'rest_seconds', type: 'number', label: 'Rest Between Rounds (seconds)', optional: true, validation: { min: 0 } },
        { id: 'session_type', type: 'select', label: 'Session Type', optional: true, options: [
          { value: 'drilling', label: 'Drilling' },
          { value: 'light_sparring', label: 'Light Sparring' },
          { value: 'hard_sparring', label: 'Hard Sparring' },
          { value: 'competition_prep', label: 'Competition Prep' },
          { value: 'competition', label: 'Competition' },
          { value: 'conditioning', label: 'Conditioning' },
          { value: 'technique', label: 'Technique Work' },
          { value: 'bag_work', label: 'Bag Work' },
          { value: 'pad_work', label: 'Pad Work' },
        ]},
        { id: 'sparring_type', type: 'select', label: 'Sparring Intensity', optional: true, options: [
          { value: 'drilling', label: 'Drilling (no contact/light)' },
          { value: 'light', label: 'Light Sparring' },
          { value: 'moderate', label: 'Moderate Sparring' },
          { value: 'hard', label: 'Hard Sparring' },
          { value: 'competition', label: 'Competition Intensity' },
        ]},
        { id: 'technique_focus', type: 'text', label: 'Technique Focus Area', optional: true },
        { id: 'partner_level', type: 'select', label: 'Partner/Sparring Partner Level', optional: true, options: [
          { value: 'beginner', label: 'Beginner' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'advanced', label: 'Advanced' },
          { value: 'professional', label: 'Professional' },
        ]},
        { id: 'discipline', type: 'text', label: 'Martial Art Discipline', optional: true },
        { id: 'gear_worn', type: 'select', label: 'Gear Worn', optional: true, options: [
          { value: 'none', label: 'No Gear' },
          { value: 'gloves_only', label: 'Gloves Only' },
          { value: 'full_protection', label: 'Full Protection' },
        ]},
      );
    }

    if (domains.includes('yoga')) {
      allFields.push(
        { id: 'yoga_style', type: 'select', label: 'Yoga Style', optional: true, options: [
          { value: 'hatha', label: 'Hatha' },
          { value: 'vinyasa', label: 'Vinyasa' },
          { value: 'ashtanga', label: 'Ashtanga' },
          { value: 'yin', label: 'Yin' },
          { value: 'hot', label: 'Hot Yoga' },
          { value: 'restorative', label: 'Restorative' },
          { value: 'power', label: 'Power Yoga' },
        ]},
        { id: 'focus_area', type: 'select', label: 'Focus Area', optional: true, options: [
          { value: 'flexibility', label: 'Flexibility' },
          { value: 'strength', label: 'Strength' },
          { value: 'balance', label: 'Balance' },
          { value: 'meditation', label: 'Meditation/Mindfulness' },
          { value: 'recovery', label: 'Recovery' },
          { value: 'full_body', label: 'Full Body' },
        ]},
        { id: 'difficulty_level', type: 'select', label: 'Difficulty Level', optional: true, options: [
          { value: 'beginner', label: 'Beginner' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'advanced', label: 'Advanced' },
        ]},
        { id: 'temperature', type: 'number', label: 'Room Temperature (°C)', optional: true },
        { id: 'props_used', type: 'text', label: 'Props Used (e.g., blocks, straps, bolsters)', optional: true },
        { id: 'instructor_led', type: 'select', label: 'Instructor Led?', optional: true, options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No (Self Practice)' },
        ]},
      );
    }

    if (domains.includes('rehab')) {
      allFields.push(
        { id: 'injury_area', type: 'text', label: 'Injury/Area Being Rehabbed', optional: true },
        { id: 'pain_level_before', type: 'number', label: 'Pain Level Before (1-10)', optional: true, validation: { min: 0, max: 10 } },
        { id: 'pain_level_after', type: 'number', label: 'Pain Level After (1-10)', optional: true, validation: { min: 0, max: 10 } },
        { id: 'mobility_score', type: 'number', label: 'Mobility Score (1-10)', optional: true, validation: { min: 0, max: 10 } },
        { id: 'exercise_type', type: 'select', label: 'Exercise Type', optional: true, options: [
          { value: 'strength', label: 'Strength' },
          { value: 'stretching', label: 'Stretching' },
          { value: 'mobility', label: 'Mobility' },
          { value: 'balance', label: 'Balance' },
          { value: 'endurance', label: 'Endurance' },
        ]},
        { id: 'therapist_notes', type: 'text', label: 'Therapist/Physio Notes', optional: true },
        { id: 'homework', type: 'text', label: 'Home Exercises/Homework', optional: true },
      );
    }

    if (domains.includes('other')) {
      allFields.push(
        { id: 'activity_name', type: 'text', label: 'Activity Name', optional: true },
        { id: 'location', type: 'text', label: 'Location', optional: true },
        { id: 'indoor_outdoor', type: 'select', label: 'Indoor/Outdoor', optional: true, options: [
          { value: 'indoor', label: 'Indoor' },
          { value: 'outdoor', label: 'Outdoor' },
        ]},
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
        acc[domain] = this.getPatternConfigForDomain(domain);
        return acc;
      }, {} as Record<string, any>),
      level: discoveryData.movementLevel || 'regular',
    };
  }
  
  /**
   * Get pattern config for domain
   */
  private getPatternConfigForDomain(domain: MovementDomain): any {
    switch (domain) {
      case 'gym':
        return {
          trackSessionBalance: true,
          trackIntensityClustering: true,
          trackRecoverySpacing: true,
        };
      case 'running':
      case 'cycling':
      case 'swimming':
        return {
          trackTrainingVsCompetition: true,
          trackBuildUpCycles: true,
          trackRecoveryAfterPeak: true,
        };
      case 'martial_arts':
        return {
          trackTrainingVsCompetition: true,
          trackSparringIntensity: true,
          trackSessionTypeDistribution: true,
          trackCompetitionPrep: true,
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
      return [...baseTypes, 'capacity_insight', 'activity_insight'];
    }
    
    return baseTypes;
  }
  
  /**
   * Generate UI configuration
   */
  async generateUIConfiguration(structure: TrackerStructure): Promise<UIConfiguration> {
    const cacheKey = this.getStructureCacheKey(structure);
    const cached = TrackerAssembler.uiConfigCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TrackerAssembler.cacheTtlMs) {
      return cached.value;
    }

    const quickLogButtons = this.generateQuickLogButtons(structure);
    const patternVisualizations = this.generatePatternVisualizations(structure);
    
    // Initialize default activity customizations with intelligent field selection
    const activityCustomizations: Record<MovementDomain, ActivityCustomization> = {};
    for (const category of structure.categories) {
      const domain = category.domain;
      const domainFields = this.getDefaultQuickLogFieldsForDomain(domain, structure);
      activityCustomizations[domain] = {
        domain,
        quickLogFields: domainFields,
      };
    }

    const uiConfig = {
      quickLogButtons,
      patternVisualizations,
      insightTypes: structure.insightConfig.insightTypes || [],
      unlockedFeatures: [],
      preferences: {
        showInsights: true,
        showPatternVisualizations: true,
        reminderPreferences: {},
      },
      activityCustomizations,
    };
    TrackerAssembler.uiConfigCache.set(cacheKey, {
      timestamp: Date.now(),
      value: uiConfig,
    });
    return uiConfig;
  }
  
  /**
   * Generate quick log buttons
   */
  private generateQuickLogButtons(structure: TrackerStructure): QuickLogButton[] {
    const buttons: QuickLogButton[] = [];
    let order = 0;
    
    for (const category of structure.categories) {
      const subcategories = structure.subcategories[category.id] || [];
      
      // For martial arts: always skip generic "Martial Arts" button if there are any specific disciplines
      // Only show specific discipline buttons (e.g., "BJJ" instead of "Martial Arts" + "BJJ")
      const isMartialArts = category.domain === 'martial_arts';
      const shouldSkipGenericButton = isMartialArts && subcategories.length > 0;
      
      // Add main category button (skip for martial arts if specific disciplines exist)
      if (!shouldSkipGenericButton) {
        buttons.push({
          id: category.id,
          label: category.name,
          category: category.id,
          icon: category.icon,
          color: category.color,
          order: order++,
        });
      }
      
      // Add subcategory buttons (if not too many)
      // Use sport-specific icons for subcategories
      if (subcategories.length <= 6) {
        for (const subcat of subcategories) {
          const icon = this.getSubcategoryIcon(category.domain, subcat.name, category.icon);
          buttons.push({
            id: `${category.id}_${subcat.id}`,
            label: subcat.name,
            category: category.id,
            subcategory: subcat.id,
            icon: icon,
            color: category.color,
            order: order++,
          });
        }
      }
    }
    
    return buttons.sort((a, b) => a.order - b.order);
  }

  /**
   * Get icon for subcategory based on domain and subcategory name
   */
  private getSubcategoryIcon(domain: MovementDomain, subcategoryName: string, defaultIcon: string): string {
    const nameLower = subcategoryName.toLowerCase();
    
    // Martial arts - discipline-specific icons
    if (domain === 'martial_arts') {
      return this.getMartialArtsIcon(subcategoryName);
    }
    
    // Team sports - sport-specific icons
    if (domain === 'team_sports') {
      if (nameLower.includes('football') || nameLower.includes('soccer')) {
        return 'Circle'; // Football/Soccer - ball
      } else if (nameLower.includes('basketball')) {
        return 'CircleDot'; // Basketball - ball with dot
      } else if (nameLower.includes('baseball') || nameLower.includes('softball')) {
        return 'Circle'; // Baseball/Softball - ball
      } else if (nameLower.includes('rugby')) {
        return 'Circle'; // Rugby - ball
      } else if (nameLower.includes('hockey')) {
        return 'Circle'; // Hockey - puck/ball
      } else if (nameLower.includes('volleyball')) {
        return 'Circle'; // Volleyball - ball
      } else if (nameLower.includes('tennis')) {
        return 'CircleDot'; // Tennis - ball with lines
      } else if (nameLower.includes('cricket')) {
        return 'Circle'; // Cricket - ball
      }
      return 'Users'; // Default team sport icon
    }
    
    // Individual sports - sport-specific icons
    if (domain === 'individual_sports') {
      if (nameLower.includes('tennis')) {
        return 'CircleDot'; // Tennis - racket/ball
      } else if (nameLower.includes('golf')) {
        return 'CircleDot'; // Golf - ball
      } else if (nameLower.includes('badminton')) {
        return 'CircleDot'; // Badminton - shuttlecock
      } else if (nameLower.includes('squash')) {
        return 'CircleDot'; // Squash - racket/ball
      } else if (nameLower.includes('racquet') || nameLower.includes('racket')) {
        return 'CircleDot'; // Racket sports
      }
      return 'Target'; // Default individual sport icon
    }
    
    // Gym subcategories
    if (domain === 'gym') {
      if (nameLower.includes('cardio')) {
        return 'Zap'; // Cardio - energy/quick
      } else if (nameLower.includes('upper body') || nameLower.includes('upper')) {
        return 'ArrowUp'; // Upper body - upward
      } else if (nameLower.includes('lower body') || nameLower.includes('lower')) {
        return 'ArrowDown'; // Lower body - downward
      } else if (nameLower.includes('full body') || nameLower.includes('full')) {
        return 'Move'; // Full body - movement
      } else if (nameLower.includes('recovery') || nameLower.includes('mobility')) {
        return 'Heart'; // Recovery - healing
      } else if (nameLower.includes('classes') || nameLower.includes('class')) {
        return 'Users'; // Classes - group
      }
    }
    
    // Running subcategories
    if (domain === 'running') {
      if (nameLower.includes('easy')) {
        return 'Footprints'; // Easy run - footprints
      } else if (nameLower.includes('tempo')) {
        return 'Zap'; // Tempo - speed/energy
      } else if (nameLower.includes('interval')) {
        return 'Activity'; // Intervals - varied activity
      } else if (nameLower.includes('long')) {
        return 'TrendingUp'; // Long run - distance
      } else if (nameLower.includes('competition') || nameLower.includes('race')) {
        return 'Trophy'; // Competition - achievement
      }
    }
    
    // Cycling subcategories
    if (domain === 'cycling') {
      if (nameLower.includes('easy')) {
        return 'Bike'; // Easy ride
      } else if (nameLower.includes('tempo')) {
        return 'Zap'; // Tempo - speed
      } else if (nameLower.includes('interval')) {
        return 'Activity'; // Intervals
      } else if (nameLower.includes('long')) {
        return 'TrendingUp'; // Long ride - distance
      } else if (nameLower.includes('commute')) {
        return 'Bike'; // Commute
      }
    }
    
    // Swimming subcategories
    if (domain === 'swimming') {
      if (nameLower.includes('easy')) {
        return 'Waves'; // Easy swim
      } else if (nameLower.includes('tempo')) {
        return 'Zap'; // Tempo - speed
      } else if (nameLower.includes('interval')) {
        return 'Activity'; // Intervals
      } else if (nameLower.includes('drill')) {
        return 'Target'; // Drills - focused practice
      }
    }
    
    // Default to category icon
    return defaultIcon;
  }

  /**
   * Get icon for martial arts discipline
   */
  private getMartialArtsIcon(discipline: string): string {
    const disciplineLower = discipline.toLowerCase();
    
    // Map disciplines to appropriate icons (sport-specific, not weapons)
    if (disciplineLower.includes('bjj') || disciplineLower.includes('brazilian jiu-jitsu') || disciplineLower.includes('jiu-jitsu')) {
      return 'Shield'; // BJJ - ground grappling/defense
    } else if (disciplineLower.includes('boxing')) {
      return 'Hand'; // Boxing - hands/gloves
    } else if (disciplineLower.includes('wrestling')) {
      return 'Users'; // Wrestling - grappling/takedowns
    } else if (disciplineLower.includes('muay thai') || disciplineLower.includes('muaythai') || disciplineLower.includes('kickboxing')) {
      return 'Footprints'; // Muay Thai - kicks/strikes
    } else if (disciplineLower.includes('karate') || disciplineLower.includes('taekwondo') || disciplineLower.includes('tkd')) {
      return 'Target'; // Karate/TKD - precision strikes
    } else if (disciplineLower.includes('judo')) {
      return 'Zap'; // Judo - throws/momentum
    } else if (disciplineLower.includes('mma') || disciplineLower.includes('mixed martial')) {
      return 'Activity'; // MMA - mixed disciplines
    } else {
      return 'Shield'; // Default - defensive/sport icon
    }
  }
  
  /**
   * Get default quick log fields for a domain (intelligent field selection)
   * Limits to 5-7 most important fields per activity
   */
  private getDefaultQuickLogFieldsForDomain(
    domain: MovementDomain,
    structure: TrackerStructure
  ): string[] {
    // Core fields that are always useful
    const coreFields = ['duration_minutes', 'perceived_intensity', 'body_state'];
    
    // Domain-specific fields based on what makes sense for each activity
    switch (domain) {
      case 'gym':
        return ['duration_minutes', 'perceived_intensity', 'body_state', 'exercises', 'bodyweight_kg'];
      case 'running':
        return ['duration_minutes', 'perceived_intensity', 'distance_km', 'pace_per_km', 'terrain'];
      case 'cycling':
        return ['duration_minutes', 'perceived_intensity', 'distance_km', 'terrain'];
      case 'swimming':
        return ['duration_minutes', 'perceived_intensity', 'distance_meters'];
      case 'martial_arts':
        return ['duration_minutes', 'perceived_intensity', 'body_state'];
      case 'team_sports':
        return ['duration_minutes', 'perceived_intensity', 'match_type', 'minutes_played'];
      case 'individual_sports':
        return ['duration_minutes', 'perceived_intensity', 'body_state'];
      case 'yoga':
        return ['duration_minutes', 'perceived_intensity', 'body_state'];
      case 'rehab':
        return ['duration_minutes', 'perceived_intensity', 'body_state'];
      default:
        return coreFields;
    }
  }

  /**
   * Generate pattern visualizations
   */
  private generatePatternVisualizations(structure: TrackerStructure): any[] {
    const visualizations: any[] = [];
    
    for (const category of structure.categories) {
      if (category.domain === 'gym') {
        visualizations.push({
          id: 'session_balance',
          type: 'bar_chart',
          domain: 'gym',
          title: 'Session Balance',
          description: 'Distribution of session types',
        });
      } else if (category.domain === 'running' || category.domain === 'cycling') {
        visualizations.push({
          id: 'session_type_distribution',
          type: 'bar_chart',
          domain: category.id,
          title: 'Session Type Distribution',
          description: 'Distribution of training types',
        });
      }
    }
    
    return visualizations;
  }
  
  /**
   * Generate insight preferences
   */
  async generateInsightPreferences(
    discoveryData: any,
    structure: TrackerStructure
  ): Promise<InsightPreferences> {
    const cacheKey = this.getInsightPrefsCacheKey(discoveryData, structure);
    const cached = TrackerAssembler.insightPrefsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TrackerAssembler.cacheTtlMs) {
      return cached.value;
    }

    const preferences = {
      enabledTypes: structure.insightConfig.insightTypes || [],
      frequency: 'weekly',
      domainSpecific: true,
      levelAppropriate: true,
    };
    TrackerAssembler.insightPrefsCache.set(cacheKey, {
      timestamp: Date.now(),
      value: preferences,
    });
    return preferences;
  }

  private getDiscoveryCacheKey(discoveryData: {
    primaryDomains: MovementDomain[];
    domainDetails: Record<MovementDomain, DomainDetail>;
    movementLevel?: string;
  }): string {
    return JSON.stringify({
      primaryDomains: [...discoveryData.primaryDomains].sort(),
      domainDetails: discoveryData.domainDetails,
      movementLevel: discoveryData.movementLevel || null,
    });
  }

  private getStructureCacheKey(structure: TrackerStructure): string {
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
        parentCategory: s.parentCategory,
        name: s.name,
      }));
    const fields = (structure.availableFields || []).map(f => ({
      id: f.id,
      type: f.type,
    }));
    return JSON.stringify({ categories, subcategories, fields });
  }

  private getInsightPrefsCacheKey(discoveryData: any, structure: TrackerStructure): string {
    return JSON.stringify({
      discovery: {
        primaryDomains: [...(discoveryData.primaryDomains || [])].sort(),
        domainDetails: discoveryData.domainDetails || {},
        movementLevel: discoveryData.movementLevel || null,
      },
      structure: this.getStructureCacheKey(structure),
      insightTypes: structure.insightConfig.insightTypes || [],
    });
  }
}
