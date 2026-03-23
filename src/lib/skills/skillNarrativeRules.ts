/**
 * Skill Narrative Rules
 * 
 * Strict schema and rules for AI-assisted narrative generation.
 * This file defines what narratives CAN and CANNOT contain.
 * 
 * PRINCIPLES:
 * - Explainable: Every narrative must be traceable to data
 * - Optional: User can dismiss or ignore
 * - Non-judgmental: No advice, predictions, or pressure
 * - Factual: Based on observable patterns only
 */

// ============================================================================
// NARRATIVE SECTIONS
// ============================================================================

export enum NarrativeSection {
  CONTEXT_SUMMARY = 'context_summary',
  ACTIVITY_PATTERN = 'activity_pattern',
  LINKED_ENTITIES = 'linked_entities',
  MOMENTUM_INDICATOR = 'momentum_indicator',
  CAPACITY_CONTEXT = 'capacity_context',
  TRAJECTORY_SUMMARY = 'trajectory_summary',
  CONSISTENCY_PATTERN = 'consistency_pattern',
  CONTEXT_DIVERGENCE = 'context_divergence',
  CONNECTION_DENSITY = 'connection_density',
  PLANNING_PRESENCE = 'planning_presence',
  EXTERNAL_PERSPECTIVE_PRESENCE = 'external_perspective_presence',
}

export const NARRATIVE_SECTION_LABELS: Record<NarrativeSection, string> = {
  [NarrativeSection.CONTEXT_SUMMARY]: 'Context Summary',
  [NarrativeSection.ACTIVITY_PATTERN]: 'Activity Pattern',
  [NarrativeSection.LINKED_ENTITIES]: 'Linked Entities',
  [NarrativeSection.MOMENTUM_INDICATOR]: 'Momentum',
  [NarrativeSection.CAPACITY_CONTEXT]: 'Capacity Context',
  [NarrativeSection.TRAJECTORY_SUMMARY]: 'Trajectory',
  [NarrativeSection.CONSISTENCY_PATTERN]: 'Consistency Pattern',
  [NarrativeSection.CONTEXT_DIVERGENCE]: 'Context Comparison',
  [NarrativeSection.CONNECTION_DENSITY]: 'System Integration',
  [NarrativeSection.PLANNING_PRESENCE]: 'Planning',
  [NarrativeSection.EXTERNAL_PERSPECTIVE_PRESENCE]: 'External Perspectives',
};

// ============================================================================
// SENTENCE TYPES
// ============================================================================

export enum NarrativeSentenceType {
  OBSERVATION = 'observation',      // "You have X habits linked"
  PATTERN = 'pattern',               // "Activity tends to cluster on weekdays"
  COMPARISON = 'comparison',         // "This skill is used more in work context"
  STATUS = 'status',                 // "Currently active in 2 contexts"
  LINK = 'link',                     // "Connected to 3 goals"
  TIMELINE = 'timeline',             // "Last practice was 5 days ago"
}

export interface NarrativeSentenceRule {
  type: NarrativeSentenceType;
  requiredData: string[];            // Data fields required to generate this sentence
  template: string;                  // Template with placeholders
  maxLength: number;                 // Maximum character length
  forbiddenWords?: string[];         // Words that must not appear
}

// ============================================================================
// FORBIDDEN LANGUAGE
// ============================================================================

export const FORBIDDEN_WORDS = [
  // Motivational pressure
  'should', 'must', 'need to', 'have to', 'ought to',
  // Judgments
  'good', 'bad', 'better', 'worse', 'best', 'worst', 'excellent', 'poor',
  // Predictions
  'will', 'going to', 'likely', 'probably', 'might', 'may',
  // Advice
  'recommend', 'suggest', 'advise', 'try', 'consider',
  // Pressure
  'important', 'critical', 'urgent', 'priority',
  // Competitive
  'compare', 'versus', 'compete', 'beat',
];

export const FORBIDDEN_PHRASES = [
  'you should',
  'you need to',
  'you must',
  'you ought to',
  'it would be better',
  'it is recommended',
  'we suggest',
  'you might want to',
  'consider doing',
  'try to',
];

// ============================================================================
// NARRATIVE CONTEXT
// ============================================================================

export interface NarrativeContext {
  skill: {
    id: string;
    name: string;
    category?: string;
    proficiency: number;
    confidence_level?: number;
    usage_count: number;
    last_used_at?: string;
  };
  context?: {
    id: string;
    context_type: string;
    role_label?: string;
    intent?: string;
    status: string;
    pressure_level: string;
    confidence_level?: number;
  };
  links: {
    habits: number;
    goals: number;
    projects: number;
    calendar_events: number;
    total: number;
  };
  summaries: {
    habit_summary?: {
      active_count: number;
      total_checkins: number;
      last_checkin?: string;
    };
    goal_summary?: {
      active_count: number;
      completed_count: number;
      total_progress: number;
    };
    project_summary?: {
      active_count: number;
      completed_count: number;
    };
    calendar_summary?: {
      event_count: number;
      last_event?: string;
      density: 'low' | 'medium' | 'high';
    };
  };
  evidence_count: number;
  last_evidence_at?: string;
  planning?: {
    has_plan: boolean;
    plan_count: number;
  };
  external_perspectives?: {
    count: number;
    roles: string[];
    role_count?: number;
  };
}

// ============================================================================
// NARRATIVE OUTPUT SCHEMA
// ============================================================================

export interface NarrativeOutput {
  sections: NarrativeSection[];
  sentences: NarrativeSentence[];
  explanation: string;               // "Why am I seeing this?"
  data_sources: string[];            // Which data fields were used
  generated_at: string;
  expires_at?: string;               // Optional expiry
}

export interface NarrativeSentence {
  type: NarrativeSentenceType;
  section: NarrativeSection;
  text: string;
  data_source: string;                // Which data field supports this
  confidence: 'high' | 'medium' | 'low'; // How certain is this observation
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a narrative output against rules
 */
export function validateNarrative(narrative: NarrativeOutput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for forbidden words
  const fullText = narrative.sentences.map(s => s.text).join(' ').toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (fullText.includes(word.toLowerCase())) {
      errors.push(`Forbidden word detected: "${word}"`);
    }
  }

  // Check for forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
    if (fullText.includes(phrase.toLowerCase())) {
      errors.push(`Forbidden phrase detected: "${phrase}"`);
    }
  }

  // Check sentence length
  for (const sentence of narrative.sentences) {
    if (sentence.text.length > 200) {
      warnings.push(`Sentence exceeds recommended length: ${sentence.text.substring(0, 50)}...`);
    }
  }

  // Check that all sentences have data sources
  for (const sentence of narrative.sentences) {
    if (!sentence.data_source) {
      errors.push(`Sentence missing data_source: "${sentence.text.substring(0, 50)}..."`);
    }
  }

  // Check that explanation exists
  if (!narrative.explanation || narrative.explanation.trim().length === 0) {
    errors.push('Narrative must include an explanation');
  }

  // Check that data sources are listed
  if (!narrative.data_sources || narrative.data_sources.length === 0) {
    warnings.push('No data sources listed');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a sentence conforms to rules
 */
export function validateSentence(sentence: NarrativeSentence): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const text = sentence.text.toLowerCase();

  // Check for forbidden words
  for (const word of FORBIDDEN_WORDS) {
    if (text.includes(word.toLowerCase())) {
      errors.push(`Forbidden word: "${word}"`);
    }
  }

  // Check length
  if (sentence.text.length > 200) {
    warnings.push('Sentence exceeds 200 characters');
  }

  // Check data source
  if (!sentence.data_source) {
    errors.push('Missing data_source');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

/**
 * Get allowed sentence templates for a section
 */
export function getAllowedTemplates(section: NarrativeSection): NarrativeSentenceRule[] {
  const templates: Record<NarrativeSection, NarrativeSentenceRule[]> = {
    [NarrativeSection.CONTEXT_SUMMARY]: [
      {
        type: NarrativeSentenceType.STATUS,
        requiredData: ['context.status'],
        template: 'This skill is {status} in the {context_type} context.',
        maxLength: 100,
      },
      {
        type: NarrativeSentenceType.OBSERVATION,
        requiredData: ['context.intent'],
        template: 'In this context, the skill relates to: {intent}.',
        maxLength: 150,
      },
    ],
    [NarrativeSection.ACTIVITY_PATTERN]: [
      {
        type: NarrativeSentenceType.TIMELINE,
        requiredData: ['skill.last_used_at'],
        template: 'Last activity was {days_ago} days ago.',
        maxLength: 80,
      },
      {
        type: NarrativeSentenceType.OBSERVATION,
        requiredData: ['skill.usage_count'],
        template: 'This skill has been used {count} times.',
        maxLength: 80,
      },
    ],
    [NarrativeSection.LINKED_ENTITIES]: [
      {
        type: NarrativeSentenceType.LINK,
        requiredData: ['links.habits'],
        template: 'Connected to {count} habit{plural}.',
        maxLength: 80,
      },
      {
        type: NarrativeSentenceType.LINK,
        requiredData: ['links.goals'],
        template: 'Linked to {count} goal{plural}.',
        maxLength: 80,
      },
    ],
    [NarrativeSection.MOMENTUM_INDICATOR]: [
      {
        type: NarrativeSentenceType.PATTERN,
        requiredData: ['summaries.habit_summary'],
        template: 'Recent habit activity shows {pattern}.',
        maxLength: 100,
      },
    ],
    [NarrativeSection.CAPACITY_CONTEXT]: [
      {
        type: NarrativeSentenceType.OBSERVATION,
        requiredData: ['context.pressure_level'],
        template: 'Pressure level in this context is {pressure_level}.',
        maxLength: 100,
      },
    ],
    [NarrativeSection.PLANNING_PRESENCE]: [
      {
        type: NarrativeSentenceType.OBSERVATION,
        requiredData: ['planning.has_plan'],
        template: 'A planning note exists for this skill in the selected context.',
        maxLength: 100,
      },
      {
        type: NarrativeSentenceType.OBSERVATION,
        requiredData: ['planning.plan_count'],
        template: 'This skill has planning notes in {count} context{plural}.',
        maxLength: 120,
      },
    ],
    [NarrativeSection.EXTERNAL_PERSPECTIVE_PRESENCE]: [
      {
        type: NarrativeSentenceType.OBSERVATION,
        requiredData: ['external_perspectives.count'],
        template: 'This skill is currently visible to {count} external perspective{plural}.',
        maxLength: 120,
      },
      {
        type: NarrativeSentenceType.OBSERVATION,
        requiredData: ['external_perspectives.role_count'],
        template: '{count} {role} {plural} have access to this context.',
        maxLength: 120,
      },
    ],
  };

  return templates[section] || [];
}

