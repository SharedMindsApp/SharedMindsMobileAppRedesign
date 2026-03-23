export type DomainType = 'work' | 'personal' | 'passion' | 'startup';

export interface TrackTemplate {
  id: string;
  domain_type: DomainType;
  name: string;
  description?: string;
  ordering_index: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubTrackTemplate {
  id: string;
  track_template_id: string;
  name: string;
  description?: string;
  ordering_index: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type SystemTrackTemplate = TrackTemplate;
export type SystemSubTrackTemplate = SubTrackTemplate;

export interface TrackTemplateWithSubTracks extends TrackTemplate {
  subtracks: SubTrackTemplate[];
}

export interface DomainTrackTemplateSet {
  domain_type: DomainType;
  tracks: TrackTemplateWithSubTracks[];
}

export interface TemplateSeedResult {
  success: boolean;
  tracksSeeded: number;
  subtracksSeeded: number;
  errors?: string[];
}

export interface CreateTrackFromTemplateInput {
  master_project_id: string;
  track_template_id: string;
  domain_type?: DomainType;
  custom_name?: string;
  custom_color?: string;
  include_subtracks?: boolean;
}

export interface CreateSubTrackFromTemplateInput {
  track_id: string;
  subtrack_template_id: string;
  custom_name?: string;
}

export interface UserTrackTemplate {
  id: string;
  user_id: string;
  domain_type: DomainType;
  name: string;
  description?: string;
  ordering_index: number;
  created_at: string;
  updated_at: string;
}

export interface UserSubTrackTemplate {
  id: string;
  user_track_template_id: string;
  name: string;
  description?: string;
  ordering_index: number;
  created_at: string;
  updated_at: string;
}

export interface UserTrackTemplateWithSubTracks extends UserTrackTemplate {
  subtracks: UserSubTrackTemplate[];
}

export interface CreateUserTrackTemplateInput {
  domain_type: DomainType;
  name: string;
  description?: string;
  ordering_index?: number;
}

export interface UpdateUserTrackTemplateInput {
  name?: string;
  description?: string;
  ordering_index?: number;
}

export interface CreateUserSubTrackTemplateInput {
  user_track_template_id: string;
  name: string;
  description?: string;
  ordering_index?: number;
}

export interface UpdateUserSubTrackTemplateInput {
  name?: string;
  description?: string;
  ordering_index?: number;
}

export interface CreateTrackFromUserTemplateInput {
  master_project_id: string;
  user_track_template_id: string;
  custom_name?: string;
  custom_color?: string;
  include_subtracks?: boolean;
}

export type AnyTrackTemplate = TrackTemplate | UserTrackTemplate;
export type AnySubTrackTemplate = SubTrackTemplate | UserSubTrackTemplate;
export type AnyTrackTemplateWithSubTracks = TrackTemplateWithSubTracks | UserTrackTemplateWithSubTracks;
