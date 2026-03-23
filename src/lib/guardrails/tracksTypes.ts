export type TrackAuthorityMode = 'shared_editing' | 'primary_project_only';

export type TrackInstanceVisibility = 'visible' | 'hidden' | 'collapsed' | 'archived';

export interface Track {
  id: string;
  masterProjectId: string;
  name: string;
  description: string | null;
  color: string | null;
  orderingIndex: number;
  isDefault: boolean;
  isShared: boolean;
  primaryOwnerProjectId: string | null;
  authorityMode: TrackAuthorityMode;
  start_date: string | null;
  end_date: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackProjectInstance {
  id: string;
  trackId: string;
  masterProjectId: string;
  includeInRoadmap: boolean;
  visibilityState: TrackInstanceVisibility;
  orderIndex: number;
  isPrimary: boolean;
  instanceMetadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TrackWithInstance extends Track {
  instance?: TrackProjectInstance;
}

export interface TrackProjectInfo {
  projectId: string;
  isPrimary: boolean;
  includeInRoadmap: boolean;
  visibilityState: TrackInstanceVisibility;
}

export interface CreateTrackInput {
  masterProjectId: string;
  name: string;
  description?: string;
  color?: string;
  orderingIndex?: number;
  isDefault?: boolean;
  isShared?: boolean;
  authorityMode?: TrackAuthorityMode;
}

export interface UpdateTrackInput {
  name?: string;
  description?: string;
  color?: string;
  orderingIndex?: number;
  start_date?: string;
  end_date?: string;
  isShared?: boolean;
  primaryOwnerProjectId?: string | null;
  authorityMode?: TrackAuthorityMode;
}

export interface CreateTrackInstanceInput {
  trackId: string;
  masterProjectId: string;
  includeInRoadmap?: boolean;
  visibilityState?: TrackInstanceVisibility;
  orderIndex?: number;
  isPrimary?: boolean;
  instanceMetadata?: Record<string, any>;
}

export interface UpdateTrackInstanceInput {
  includeInRoadmap?: boolean;
  visibilityState?: TrackInstanceVisibility;
  orderIndex?: number;
  instanceMetadata?: Record<string, any>;
}

export interface LinkTrackToProjectInput {
  trackId: string;
  projectId: string;
  includeInRoadmap?: boolean;
  visibilityState?: TrackInstanceVisibility;
}

export interface UnlinkTrackFromProjectInput {
  trackId: string;
  projectId: string;
}

export interface ConvertToSharedTrackInput {
  trackId: string;
  authorityMode?: TrackAuthorityMode;
}

export const TRACK_COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1',
  teal: '#14B8A6',
  orange: '#F97316',
  gray: '#6B7280',
} as const;

export type TrackColorKey = keyof typeof TRACK_COLORS;
