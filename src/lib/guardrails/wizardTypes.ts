import type { MasterProject } from '../guardrailsTypes';
import type { Track } from './tracksTypes';
import type { SubTrack } from './subtracksTypes';
import type { DomainType, AnyTrackTemplate } from './templateTypes';
import type { MindMeshNode } from './mindmeshTypes';

export interface CreateProjectWizardInput {
  domain_id: string;
  domain_type: DomainType;
  name: string;
  description?: string;
  use_default_templates?: boolean;
  selected_default_template_ids?: string[];
  selected_system_template_ids?: string[];
  selected_user_template_ids?: string[];
  generate_initial_roadmap?: boolean;
  quick_goal?: string; // One-sentence goal for Quick Setup
  first_priority_track_template_id?: string | null; // Priority track template ID
  wizard_track_setup?: Array<{
    track_template_id: string;
    track_category_id: string;
    objective: string;
    definition_of_done: string;
    time_mode: 'unscheduled' | 'target' | 'ranged' | 'ongoing';
    start_date?: string | null;
    end_date?: string | null;
    target_date?: string | null;
  }>;
  ai_description_suggestion?: string;
  ai_project_intake?: AIProjectIntake;
  ai_clarification_answers?: AIClarificationAnswers;
  ai_structure_selected_version?: 'lean' | 'standard' | 'detailed';
  ai_generation_settings?: AIGenerationSettings;
}

export interface RoadmapItemPreview {
  track_id: string;
  subtrack_id?: string;
  title: string;
  status: 'not_started';
  metadata?: Record<string, any>; // For priority flag, etc.
}

export interface ProjectWizardResult {
  project: MasterProject;
  tracks: Track[];
  subtracks: SubTrack[];
  roadmap_preview: RoadmapItemPreview[];
  applied_templates: AnyTrackTemplate[];
}

export interface TemplateResolutionInput {
  domain_type: DomainType;
  use_default_templates?: boolean;
  selected_default_template_ids?: string[];
  selected_system_template_ids?: string[];
  selected_user_template_ids?: string[];
}

export interface AIProjectIntake {
  raw_idea: string;
  extracted_concepts?: string[];
  high_level_goals?: string[];
  intended_output_type?: string;
  extracted_at?: string;
}

export interface AIClarificationQuestion {
  id: string;
  question: string;
  suggested_answers?: string[];
  answer_type: 'text' | 'choice' | 'multiple_choice';
}

export interface AIClarificationAnswers {
  [questionId: string]: string | string[];
}

export interface AIStructureDraft {
  tracks: AITrackDraft[];
  subtracks: AISubtrackDraft[];
  roadmap_items: AIRoadmapItemDraft[];
  mind_mesh_nodes?: AIMindMeshNodeDraft[];
  mind_mesh_connections?: AIMindMeshConnectionDraft[];
  milestones?: AIMilestoneDraft[];
  version: 'lean' | 'standard' | 'detailed';
}

export interface AITrackDraft {
  temp_id: string;
  name: string;
  description?: string;
  color?: string;
  ordering_index: number;
}

export interface AISubtrackDraft {
  temp_id: string;
  track_temp_id: string;
  name: string;
  description?: string;
  ordering_index: number;
}

export interface AIRoadmapItemDraft {
  temp_id: string;
  track_temp_id?: string;
  subtrack_temp_id?: string;
  title: string;
  description?: string;
  estimated_hours?: number;
  dependencies?: string[];
}

export interface AIMindMeshNodeDraft {
  temp_id: string;
  title: string;
  content?: string;
  node_type: 'idea' | 'task' | 'note';
  track_temp_id?: string;
  subtrack_temp_id?: string;
}

export interface AIMindMeshConnectionDraft {
  from_temp_id: string;
  to_temp_id: string;
  link_type: 'dependency' | 'supporting' | 'reference';
}

export interface AIMilestoneDraft {
  temp_id: string;
  title: string;
  description?: string;
  target_date_offset_days?: number;
}

export interface AIGenerationSettings {
  include_nodes: boolean;
  include_roadmap_items: boolean;
  include_milestones: boolean;
  generation_style?: 'creative' | 'structured' | 'minimalist';
}

export interface WizardSessionState {
  step: number;
  domain_id?: string;
  domain_type?: DomainType;
  template_id?: string;
  selected_template?: AnyTrackTemplate;
  project_name?: string;
  project_description?: string;
  ai_description_suggestion?: string;
  ai_description_accepted?: boolean;
  ai_project_intake?: AIProjectIntake;
  ai_clarification_questions?: AIClarificationQuestion[];
  ai_clarification_answers?: AIClarificationAnswers;
  ai_structure_drafts?: {
    lean: AIStructureDraft;
    standard: AIStructureDraft;
    detailed: AIStructureDraft;
  };
  ai_selected_version?: 'lean' | 'standard' | 'detailed';
  ai_generation_settings?: AIGenerationSettings;
  session_id?: string;
}

export interface EnhancedTrackTemplate extends AnyTrackTemplate {
  tags?: string[];
  recommended_tracks?: string[];
  suggested_project_type?: string;
  ai_prompt_presets?: string[];
}
