/**
 * Fitness Tracker Service
 * 
 * Handles creation of the single unified Fitness Tracker
 * from user's movement profile
 */

import { createTrackerFromSchema } from '../trackerStudio/trackerService';
import { supabase } from '../supabase';
import type { Tracker } from '../trackerStudio/types';
import type { TrackerStructure, UserMovementProfile, MovementDomain } from './types';

export class FitnessTrackerService {
  /**
   * Create or get the single unified Fitness Tracker based on user's movement profile
   * Returns the single tracker ID
   */
  async createTrackersFromProfile(profile: UserMovementProfile): Promise<Tracker> {
    if (!profile.trackerStructure) {
      throw new Error('Tracker structure not found in profile');
    }
    
    // Check if user already has a Fitness Tracker
    const existingTrackerId = await this.getExistingFitnessTracker(profile.userId);
    if (existingTrackerId) {
      // Update the field schema if needed (for now, we'll keep existing)
      // In the future, we could migrate entries and update schema
      const { data } = await supabase
        .from('trackers')
        .select('*')
        .eq('id', existingTrackerId)
        .single();
      
      if (data) {
        return data as Tracker;
      }
    }
    
    // Create the single unified Fitness Tracker
    const structure = profile.trackerStructure;
    const fieldSchema = this.buildUnifiedFieldSchema(structure);
    
    const tracker = await createTrackerFromSchema({
      name: 'Fitness Tracker',
      description: 'A personalized movement intelligence system tracking all your activities in one place',
      field_schema: fieldSchema,
      entry_granularity: 'session',
      icon: 'Activity',
      color: 'blue',
    });
    
    // Save tracker ID to profile
    await supabase
      .from('user_movement_profiles')
      .update({ fitness_tracker_id: tracker.id })
      .eq('user_id', profile.userId);
    
    return tracker;
  }
  
  /**
   * Get existing Fitness Tracker ID from profile
   */
  private async getExistingFitnessTracker(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('user_movement_profiles')
      .select('fitness_tracker_id')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) return null;
    return data.fitness_tracker_id || null;
  }
  
  /**
   * Build unified field schema for the single Fitness Tracker
   * Includes category field and all common + domain-specific fields
   */
  private buildUnifiedFieldSchema(structure: TrackerStructure): any[] {
    const fields: any[] = [];
    
    // REQUIRED: Category/Movement Domain field - user must select which activity type
    fields.push({
      id: 'movement_category',
      label: 'Activity Type',
      type: 'text',
      validation: { required: true },
      options: structure.categories.map(cat => ({
        value: cat.id,
        label: cat.name,
      })),
    });
    
    // OPTIONAL: Session Type (for subcategories like "Cardio" vs "Strength" in Gym)
    // We'll make this conditional in the UI based on category selection
    // For now, include it as optional - will be populated based on category's subcategories
    const allSubcategories: Array<{ categoryId: string; id: string; name: string }> = [];
    for (const [categoryId, subs] of Object.entries(structure.subcategories)) {
      for (const sub of subs) {
        allSubcategories.push({ categoryId, id: sub.id, name: sub.name });
      }
    }
    
    if (allSubcategories.length > 0) {
      fields.push({
        id: 'session_type',
        label: 'Session Type',
        type: 'text',
        validation: { required: false },
        // Options will be filtered dynamically in UI based on category
        options: allSubcategories.map(sub => ({
          value: sub.id,
          label: sub.name,
        })),
      });
    }
    
    // Common fields (always available)
    fields.push(
      {
        id: 'perceived_intensity',
        label: 'Intensity (1-5)',
        type: 'number',
        validation: { min: 1, max: 5 },
      },
      {
        id: 'body_state',
        label: 'Body State',
        type: 'text',
        validation: {},
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
        id: 'duration_minutes',
        label: 'Duration (minutes)',
        type: 'number',
        validation: { min: 0 },
      },
      {
        id: 'bodyweight_kg',
        label: 'Bodyweight (kg)',
        type: 'number',
        validation: { min: 0 },
      },
      {
        id: 'notes',
        label: 'Notes',
        type: 'text',
        validation: { maxLength: 2000 },
      }
    );
    
    // Domain-specific fields (all optional - UI will show/hide based on category)
    // Note: These fields are available for all users, but shown/hidden based on their selected activities
    
    // Gym fields
    fields.push(
      { id: 'exercises', label: 'Exercises (JSON)', type: 'text', validation: {} },
      { id: 'sets', label: 'Total Sets', type: 'number', validation: { min: 0 } },
      { id: 'reps', label: 'Reps per Set', type: 'number', validation: { min: 0 } },
      { id: 'weight', label: 'Weight (kg)', type: 'number', validation: { min: 0 } },
      { id: 'rpe', label: 'RPE (1-10)', type: 'number', validation: { min: 1, max: 10 } },
      { id: 'training_volume', label: 'Total Volume (kg)', type: 'number', validation: { min: 0 } },
      { id: 'rest_seconds', label: 'Rest Period (seconds)', type: 'number', validation: { min: 0 } },
      { id: 'muscle_groups', label: 'Primary Muscle Groups', type: 'text', validation: {}, options: [
        { value: 'chest', label: 'Chest' }, { value: 'back', label: 'Back' }, { value: 'shoulders', label: 'Shoulders' },
        { value: 'arms', label: 'Arms' }, { value: 'legs', label: 'Legs' }, { value: 'core', label: 'Core' }, { value: 'full_body', label: 'Full Body' },
      ]},
      { id: 'exercise_type', label: 'Exercise Type', type: 'text', validation: {}, options: [
        { value: 'strength', label: 'Strength' }, { value: 'hypertrophy', label: 'Hypertrophy' }, { value: 'power', label: 'Power' },
        { value: 'endurance', label: 'Endurance' }, { value: 'mobility', label: 'Mobility' }, { value: 'cardio', label: 'Cardio' },
      ]},
      { id: 'tempo', label: 'Tempo (e.g., 3-1-1-0)', type: 'text', validation: {} },
      { id: 'to_failure', label: 'To Failure?', type: 'text', validation: {}, options: [
        { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'some_sets', label: 'Some Sets' },
      ]},
      { id: 'machine_type', label: 'Machine/Equipment Type', type: 'text', validation: {} },
      { id: 'cardio_type', label: 'Cardio Type', type: 'text', validation: {}, options: [
        { value: 'treadmill', label: 'Treadmill' }, { value: 'bike', label: 'Stationary Bike' }, { value: 'rower', label: 'Rowing Machine' },
        { value: 'elliptical', label: 'Elliptical' }, { value: 'stairs', label: 'Stair Master' },
      ]},
      { id: 'class_type', label: 'Class Type', type: 'text', validation: {} }
    );
    
    // Running fields
    fields.push(
      { id: 'distance_km', label: 'Distance (km)', type: 'number', validation: { min: 0 } },
      { id: 'pace_per_km', label: 'Average Pace (per km)', type: 'text', validation: {} },
      { id: 'terrain', label: 'Terrain', type: 'text', validation: {}, options: [
        { value: 'road', label: 'Road' }, { value: 'trail', label: 'Trail' }, { value: 'track', label: 'Track' },
        { value: 'treadmill', label: 'Treadmill' }, { value: 'beach', label: 'Beach' }, { value: 'grass', label: 'Grass' },
      ]},
      { id: 'elevation_meters', label: 'Elevation Gain (meters)', type: 'number', validation: { min: 0 } },
      { id: 'avg_heart_rate', label: 'Average Heart Rate (bpm)', type: 'number', validation: { min: 40, max: 220 } },
      { id: 'max_heart_rate', label: 'Max Heart Rate (bpm)', type: 'number', validation: { min: 40, max: 220 } },
      { id: 'heart_rate_zones', label: 'Time in HR Zones (JSON)', type: 'text', validation: {} },
      { id: 'cadence', label: 'Average Cadence (steps/min)', type: 'number', validation: { min: 0 } },
      { id: 'splits', label: 'Splits/Km Times', type: 'text', validation: {} },
      { id: 'surface_type', label: 'Surface Type', type: 'text', validation: {}, options: [
        { value: 'paved', label: 'Paved' }, { value: 'dirt', label: 'Dirt' }, { value: 'gravel', label: 'Gravel' },
        { value: 'sand', label: 'Sand' }, { value: 'snow', label: 'Snow' },
      ]},
      { id: 'weather', label: 'Weather', type: 'text', validation: {}, options: [
        { value: 'sunny', label: 'Sunny' }, { value: 'cloudy', label: 'Cloudy' }, { value: 'rainy', label: 'Rainy' },
        { value: 'windy', label: 'Windy' }, { value: 'cold', label: 'Cold' }, { value: 'hot', label: 'Hot' },
      ]},
      { id: 'temperature_celsius', label: 'Temperature (°C)', type: 'number', validation: {} },
      { id: 'effort_level', label: 'Perceived Effort', type: 'text', validation: {}, options: [
        { value: 'easy', label: 'Easy' }, { value: 'moderate', label: 'Moderate' }, { value: 'hard', label: 'Hard' }, { value: 'max', label: 'Maximum' },
      ]}
    );
    
    // Cycling fields
    fields.push(
      { id: 'avg_power', label: 'Average Power (watts)', type: 'number', validation: { min: 0 } },
      { id: 'max_power', label: 'Max Power (watts)', type: 'number', validation: { min: 0 } },
      { id: 'avg_cadence', label: 'Average Cadence (rpm)', type: 'number', validation: { min: 0 } },
      { id: 'bike_type', label: 'Bike Type', type: 'text', validation: {}, options: [
        { value: 'road', label: 'Road Bike' }, { value: 'mountain', label: 'Mountain Bike' }, { value: 'hybrid', label: 'Hybrid' },
        { value: 'gravel', label: 'Gravel' }, { value: 'electric', label: 'E-Bike' }, { value: 'indoor_trainer', label: 'Indoor Trainer' },
      ]}
    );
    
    // Swimming fields
    fields.push(
      { id: 'distance_meters', label: 'Total Distance (meters)', type: 'number', validation: { min: 0 } },
      { id: 'stroke_type', label: 'Primary Stroke', type: 'text', validation: {}, options: [
        { value: 'freestyle', label: 'Freestyle' }, { value: 'backstroke', label: 'Backstroke' },
        { value: 'breaststroke', label: 'Breaststroke' }, { value: 'butterfly', label: 'Butterfly' }, { value: 'mixed', label: 'Mixed/IM' },
      ]},
      { id: 'pool_length', label: 'Pool Length', type: 'text', validation: {}, options: [
        { value: '25m', label: '25 meters' }, { value: '50m', label: '50 meters' }, { value: '33m', label: '33 meters (yd pool)' }, { value: 'open_water', label: 'Open Water' },
      ]},
      { id: 'laps', label: 'Number of Laps', type: 'number', validation: { min: 0 } },
      { id: 'stroke_count', label: 'Strokes per Length', type: 'number', validation: { min: 0 } },
      { id: 'intervals', label: 'Interval Times', type: 'text', validation: {} },
      { id: 'kick_pull_focus', label: 'Session Focus', type: 'text', validation: {}, options: [
        { value: 'full_swim', label: 'Full Swim' }, { value: 'kick', label: 'Kick Focus' }, { value: 'pull', label: 'Pull Focus' }, { value: 'drills', label: 'Drills' },
      ]},
      { id: 'water_type', label: 'Water Type', type: 'text', validation: {}, options: [
        { value: 'pool', label: 'Pool' }, { value: 'open_water', label: 'Open Water' }, { value: 'ocean', label: 'Ocean' }, { value: 'lake', label: 'Lake' },
      ]},
      { id: 'water_temperature', label: 'Water Temperature (°C)', type: 'number', validation: {} }
    );
    
    // Team sports fields
    fields.push(
      { id: 'match_type', label: 'Match Type', type: 'text', validation: {}, options: [
        { value: 'training', label: 'Training' }, { value: 'friendly', label: 'Friendly Match' }, { value: 'league', label: 'League Match' },
        { value: 'cup', label: 'Cup/Competition' }, { value: 'tournament', label: 'Tournament' },
      ]},
      { id: 'position', label: 'Position Played', type: 'text', validation: {} },
      { id: 'minutes_played', label: 'Minutes Played', type: 'number', validation: { min: 0 } },
      { id: 'goals', label: 'Goals Scored', type: 'number', validation: { min: 0 } },
      { id: 'assists', label: 'Assists', type: 'number', validation: { min: 0 } },
      { id: 'saves', label: 'Saves (if goalkeeper)', type: 'number', validation: { min: 0 } },
      { id: 'cards', label: 'Cards Received', type: 'text', validation: {}, options: [
        { value: 'none', label: 'None' }, { value: 'yellow', label: 'Yellow' }, { value: 'red', label: 'Red' },
      ]},
      { id: 'substituted', label: 'Substituted?', type: 'text', validation: {}, options: [
        { value: 'started', label: 'Started (full match)' }, { value: 'subbed_in', label: 'Subbed In' }, { value: 'subbed_out', label: 'Subbed Out' },
      ]},
      { id: 'team_score', label: 'Team Score', type: 'number', validation: { min: 0 } },
      { id: 'opponent_score', label: 'Opponent Score', type: 'number', validation: { min: 0 } },
      { id: 'result', label: 'Result', type: 'text', validation: {}, options: [
        { value: 'win', label: 'Win' }, { value: 'draw', label: 'Draw' }, { value: 'loss', label: 'Loss' },
      ]},
      { id: 'surface', label: 'Surface', type: 'text', validation: {}, options: [
        { value: 'grass', label: 'Grass' }, { value: 'artificial', label: 'Artificial Turf' }, { value: 'indoor', label: 'Indoor' }, { value: 'hard_court', label: 'Hard Court' },
      ]}
    );
    
    // Individual sports fields
    fields.push(
      { id: 'sport_type', label: 'Sport Type', type: 'text', validation: {} },
      { id: 'opponent', label: 'Opponent Name', type: 'text', validation: {} },
      { id: 'your_score', label: 'Your Score', type: 'number', validation: { min: 0 } },
      { id: 'sets_games', label: 'Sets/Games (e.g., 6-4, 6-3)', type: 'text', validation: {} }
    );
    
    // Martial arts fields
    fields.push(
      { id: 'rounds', label: 'Number of Rounds', type: 'number', validation: { min: 0 } },
      { id: 'round_duration', label: 'Minutes per Round', type: 'number', validation: { min: 0 } },
      { id: 'sparring_type', label: 'Sparring Intensity', type: 'text', validation: {}, options: [
        { value: 'drilling', label: 'Drilling (no contact/light)' }, { value: 'light', label: 'Light Sparring' },
        { value: 'moderate', label: 'Moderate Sparring' }, { value: 'hard', label: 'Hard Sparring' }, { value: 'competition', label: 'Competition Intensity' },
      ]},
      { id: 'technique_focus', label: 'Technique Focus Area', type: 'text', validation: {} },
      { id: 'partner_level', label: 'Partner/Sparring Partner Level', type: 'text', validation: {}, options: [
        { value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }, { value: 'professional', label: 'Professional' },
      ]},
      { id: 'discipline', label: 'Martial Art Discipline', type: 'text', validation: {} },
      { id: 'gear_worn', label: 'Gear Worn', type: 'text', validation: {}, options: [
        { value: 'none', label: 'No Gear' }, { value: 'gloves_only', label: 'Gloves Only' }, { value: 'full_protection', label: 'Full Protection' },
      ]}
    );
    
    // Yoga fields
    fields.push(
      { id: 'yoga_style', label: 'Yoga Style', type: 'text', validation: {}, options: [
        { value: 'hatha', label: 'Hatha' }, { value: 'vinyasa', label: 'Vinyasa' }, { value: 'ashtanga', label: 'Ashtanga' },
        { value: 'yin', label: 'Yin' }, { value: 'hot', label: 'Hot Yoga' }, { value: 'restorative', label: 'Restorative' }, { value: 'power', label: 'Power Yoga' },
      ]},
      { id: 'focus_area', label: 'Focus Area', type: 'text', validation: {}, options: [
        { value: 'flexibility', label: 'Flexibility' }, { value: 'strength', label: 'Strength' }, { value: 'balance', label: 'Balance' },
        { value: 'meditation', label: 'Meditation/Mindfulness' }, { value: 'recovery', label: 'Recovery' }, { value: 'full_body', label: 'Full Body' },
      ]},
      { id: 'difficulty_level', label: 'Difficulty Level', type: 'text', validation: {}, options: [
        { value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' },
      ]},
      { id: 'temperature', label: 'Room Temperature (°C)', type: 'number', validation: {} },
      { id: 'props_used', label: 'Props Used', type: 'text', validation: {} },
      { id: 'instructor_led', label: 'Instructor Led?', type: 'text', validation: {}, options: [
        { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No (Self Practice)' },
      ]}
    );
    
    // Rehab fields
    fields.push(
      { id: 'injury_area', label: 'Injury/Area Being Rehabbed', type: 'text', validation: {} },
      { id: 'pain_level_before', label: 'Pain Level Before (1-10)', type: 'number', validation: { min: 0, max: 10 } },
      { id: 'pain_level_after', label: 'Pain Level After (1-10)', type: 'number', validation: { min: 0, max: 10 } },
      { id: 'mobility_score', label: 'Mobility Score (1-10)', type: 'number', validation: { min: 0, max: 10 } },
      { id: 'exercise_type', label: 'Exercise Type', type: 'text', validation: {}, options: [
        { value: 'strength', label: 'Strength' }, { value: 'stretching', label: 'Stretching' }, { value: 'mobility', label: 'Mobility' },
        { value: 'balance', label: 'Balance' }, { value: 'endurance', label: 'Endurance' },
      ]},
      { id: 'therapist_notes', label: 'Therapist/Physio Notes', type: 'text', validation: {} },
      { id: 'homework', label: 'Home Exercises/Homework', type: 'text', validation: {} }
    );
    
    // Other activity fields
    fields.push(
      { id: 'activity_name', label: 'Activity Name', type: 'text', validation: {} },
      { id: 'location', label: 'Location', type: 'text', validation: {} },
      { id: 'indoor_outdoor', label: 'Indoor/Outdoor', type: 'text', validation: {}, options: [
        { value: 'indoor', label: 'Indoor' }, { value: 'outdoor', label: 'Outdoor' },
      ]}
    );
    
    return fields;
  }
  
  /**
   * Build field schema for a category (DEPRECATED - kept for reference)
   */
  private buildFieldSchemaForCategory(
    category: TrackerStructure['categories'][0],
    structure: TrackerStructure
  ): any[] {
    const subcategories = structure.subcategories[category.id] || [];
    const hasSubcategories = subcategories.length > 0;
    
    const fields: any[] = [];
    
    // Add session type field only if subcategories exist
    if (hasSubcategories) {
      fields.push({
        id: 'session_type',
        label: 'Session Type',
        type: 'text',
        validation: { required: false },
        options: subcategories.map(sub => ({
          value: sub.id,
          label: sub.name,
        })),
      });
    }
    
    // Core fields
    fields.push(
      {
        id: 'perceived_intensity',
        label: 'Intensity (1-5)',
        type: 'number',
        validation: { min: 1, max: 5 },
      },
      {
        id: 'body_state',
        label: 'Body State',
        type: 'text',
        validation: {},
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
        id: 'duration_minutes',
        label: 'Duration (minutes)',
        type: 'number',
        validation: { min: 0 },
      },
      {
        id: 'bodyweight_kg',
        label: 'Bodyweight (kg)',
        type: 'number',
        validation: { min: 0 },
      },
      {
        id: 'notes',
        label: 'Notes',
        type: 'text',
        validation: { maxLength: 2000 },
      }
    );
    
    // Add domain-specific fields
    const availableFields = structure.availableFields.filter(f => {
      if (category.domain === 'gym') {
        return ['exercises', 'sets', 'reps', 'weight', 'rpe'].includes(f.id);
      }
      if (category.domain === 'running' || category.domain === 'cycling') {
        return ['distance_km', 'pace_per_km', 'terrain'].includes(f.id);
      }
      if (category.domain === 'swimming') {
        return ['distance_meters', 'stroke_type'].includes(f.id);
      }
      if (category.domain === 'team_sports') {
        return ['match_type', 'position', 'minutes_played'].includes(f.id);
      }
      return false;
    });
    
    for (const field of availableFields) {
      const fieldDef: any = {
        id: field.id,
        label: field.label,
        type: field.type === 'select' ? 'text' : field.type, // Convert select to text with options
        validation: field.validation || {},
      };
      
      // Add options if field has them (for select-type fields)
      if (field.options && field.options.length > 0) {
        fieldDef.options = field.options;
      }
      
      fields.push(fieldDef);
    }
    
    return fields;
  }
}
