export interface BrainProfile {
  id: string;
  user_id: string;
  completed_at: string;
  processing_style: string[];
  task_style: string[];
  time_relationship: string[];
  sensory_needs: string[];
  communication_preference: string[];
  overwhelm_triggers: string[];
  stress_helpers: string[];
  avoid_behaviors: string[];
  understanding_needs: string[];
  support_style: string[];
  created_at: string;
  updated_at: string;
}

export interface BrainProfileCard {
  id: string;
  brain_profile_id: string;
  card_type: 'how_brain_works' | 'communication' | 'struggling' | 'support_others';
  title: string;
  content: string[];
  is_visible: boolean;
  custom_edits: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BrainProfileSettings {
  id: string;
  brain_profile_id: string;
  theme_preset: 'calm' | 'vibrant' | 'standard';
  notification_style: 'minimal' | 'standard' | 'structured';
  communication_rewriting: 'direct' | 'soft' | 'balanced';
  task_handling: {
    show_fewer_tasks?: boolean;
    more_structure?: boolean;
    transition_warnings?: boolean;
    reminder_count?: number;
  };
  sensory_toggles: {
    reduce_animation?: boolean;
    adjust_brightness?: boolean;
    enable_haptics?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  title: string;
  options: QuestionOption[];
  maxSelections?: number;
  minSelections?: number;
  category: 'processing' | 'task' | 'time' | 'sensory' | 'communication' | 'overwhelm' | 'stress' | 'avoid' | 'understanding' | 'support';
}

export const BRAIN_PROFILE_QUESTIONS: Question[] = [
  {
    id: 'processing_style',
    title: 'How do you process information best?',
    category: 'processing',
    maxSelections: 2,
    options: [
      { id: 'visual', label: 'Prefer visual information (diagrams, written notes)' },
      { id: 'audio', label: 'Prefer audio information (talking, listening)' },
      { id: 'hands_on', label: 'Prefer hands-on learning' },
      { id: 'short_chunks', label: 'Prefer short chunks of information' },
      { id: 'big_picture', label: 'Prefer big-picture first' },
      { id: 'step_by_step', label: 'Prefer step-by-step details' },
    ],
  },
  {
    id: 'task_style',
    title: 'What describes your task and routine style?',
    category: 'task',
    maxSelections: 2,
    options: [
      { id: 'structure', label: 'I like structure and consistency' },
      { id: 'flexibility', label: 'I prefer flexibility and spontaneity' },
      { id: 'struggle_to_start', label: 'I struggle to start tasks' },
      { id: 'forget_tasks', label: 'I forget tasks unless reminded' },
      { id: 'overwhelmed_by_lists', label: 'Long to-do lists overwhelm me' },
      { id: 'next_step_only', label: 'I work best knowing just the next step' },
    ],
  },
  {
    id: 'time_relationship',
    title: 'What is your relationship with time?',
    category: 'time',
    maxSelections: 2,
    options: [
      { id: 'lose_track', label: 'I lose track of time easily' },
      { id: 'fine_when_scheduled', label: "I'm fine once something is scheduled" },
      { id: 'multiple_reminders', label: 'I need multiple reminders' },
      { id: 'one_reminder', label: 'I only need one reminder' },
      { id: 'underestimate_time', label: 'I underestimate how long tasks take' },
      { id: 'transition_warnings', label: 'I need transition warnings (e.g., "5 minutes left")' },
    ],
  },
  {
    id: 'sensory_needs',
    title: 'What are your sensory environment needs?',
    category: 'sensory',
    maxSelections: 3,
    options: [
      { id: 'calm_visuals', label: 'Prefer calm, low-stimulation visuals' },
      { id: 'bright_visuals', label: 'Prefer brighter, more engaging visuals' },
      { id: 'noise_sensitive', label: 'Sensitive to noise' },
      { id: 'distracted_by_movement', label: 'Distracted by movement or animations' },
      { id: 'quiet_ui', label: 'Need quiet UI to focus' },
      { id: 'enjoy_haptics', label: 'Enjoy subtle haptics/feedback' },
    ],
  },
  {
    id: 'communication_preference',
    title: 'How do you prefer to communicate?',
    category: 'communication',
    maxSelections: 3,
    options: [
      { id: 'direct_concise', label: 'Prefer direct, concise communication' },
      { id: 'warm_gentle', label: 'Prefer warm, gentle communication' },
      { id: 'context_first', label: 'Want context first' },
      { id: 'main_point_first', label: 'Want the main point first' },
      { id: 'time_to_think', label: 'Need time to think before replying' },
      { id: 'prefer_written', label: 'Prefer written communication' },
      { id: 'prefer_voice', label: 'Prefer voice or in-person' },
    ],
  },
  {
    id: 'overwhelm_triggers',
    title: 'What overwhelms you?',
    category: 'overwhelm',
    maxSelections: 3,
    options: [
      { id: 'too_many_tasks', label: 'Too many tasks' },
      { id: 'sudden_changes', label: 'Sudden plan changes' },
      { id: 'long_messages', label: 'Long messages' },
      { id: 'bright_screens', label: 'Bright/cluttered screens' },
      { id: 'sensory_overload', label: 'Noise / sensory overload' },
      { id: 'misunderstandings', label: 'Misunderstandings' },
      { id: 'feeling_rushed', label: 'Feeling rushed' },
      { id: 'being_interrupted', label: 'Being interrupted' },
    ],
  },
  {
    id: 'stress_helpers',
    title: 'What helps when you are stressed?',
    category: 'stress',
    maxSelections: 3,
    options: [
      { id: 'short_instructions', label: 'Short, specific instructions' },
      { id: 'reassurance', label: 'Reassurance/validation' },
      { id: 'silence', label: 'Silence / processing time' },
      { id: 'help_choosing', label: 'Help choosing the next step' },
      { id: 'grounding', label: 'Grounding/breathing techniques' },
      { id: 'step_breakdown', label: 'Clear step breakdown' },
    ],
  },
  {
    id: 'avoid_behaviors',
    title: 'What should others NOT do?',
    category: 'avoid',
    options: [
      { id: 'calm_down', label: 'Don\'t tell me to "calm down"' },
      { id: 'info_overload', label: 'Don\'t overload me with info' },
      { id: 'sudden_changes', label: 'Don\'t change plans suddenly' },
      { id: 'raise_voice', label: 'Don\'t raise your voice' },
      { id: 'interrupt_processing', label: 'Don\'t interrupt processing' },
      { id: 'quick_decisions', label: 'Don\'t demand quick decisions' },
      { id: 'guilt_trip', label: 'Don\'t guilt-trip about tasks' },
    ],
  },
  {
    id: 'understanding_needs',
    title: 'What makes you feel understood?',
    category: 'understanding',
    maxSelections: 3,
    options: [
      { id: 'summarize', label: 'Summarise what I said' },
      { id: 'clarifying_questions', label: 'Ask clarifying questions' },
      { id: 'offer_solutions', label: 'Offer solutions' },
      { id: 'just_listen', label: 'Just listen' },
      { id: 'validate_feelings', label: 'Validate feelings' },
      { id: 'clear_expectations', label: 'Give clear expectations' },
    ],
  },
  {
    id: 'support_style',
    title: 'What is your preferred support style?',
    category: 'support',
    maxSelections: 2,
    options: [
      { id: 'practical_guidance', label: 'Practical guidance' },
      { id: 'emotional_support', label: 'Emotional support' },
      { id: 'gentle_push', label: 'Gentle push ("Let\'s do it together")' },
      { id: 'leave_alone', label: 'Leave me be unless I ask' },
      { id: 'check_later', label: 'Check in later, not immediately' },
    ],
  },
];
