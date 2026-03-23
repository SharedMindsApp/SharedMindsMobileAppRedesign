export interface SubTrack {
  id: string;
  track_id: string;
  name: string;
  description?: string;
  ordering_index: number;
  is_default: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSubTrackInput {
  track_id: string;
  name: string;
  description?: string;
}

export interface UpdateSubTrackInput {
  name?: string;
  description?: string;
  ordering_index?: number;
  start_date?: string;
  end_date?: string;
}

export interface SubTrackStats {
  roadmapItemCount: number;
  sideIdeaCount: number;
  focusSessionCount: number;
  completedItemsCount: number;
  inProgressItemsCount: number;
  notStartedItemsCount: number;
  blockedItemsCount: number;
}
