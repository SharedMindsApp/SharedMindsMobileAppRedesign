/**
 * Stage 2.1: Reflection Layer Types
 *
 * CRITICAL: Stage 2.1 is USER-OWNED MEANING-MAKING SPACE.
 *
 * FORBIDDEN IN STAGE 2.1:
 * - NO sentiment analysis or NLP
 * - NO theme extraction or pattern detection
 * - NO summarization or clustering
 * - NO feeding reflections into signals
 * - NO AI analysis of any kind
 * - NO "insights from your reflections"
 * - NO search suggestions based on content
 * - NO required for progress or features
 *
 * ALLOWED IN STAGE 2.1:
 * - Write reflections
 * - Read own reflections
 * - Edit reflections
 * - Delete reflections
 * - Link reflections to insights (optional)
 * - Add user-defined tags
 * - Self-report context (optional)
 *
 * This is where meaning stays human.
 */

export interface ReflectionEntry {
  id: string;
  user_id: string;
  content: string;
  linked_signal_id: string | null;
  linked_project_id: string | null;
  linked_space_id: string | null;
  user_tags: string[];
  self_reported_context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateReflectionOptions {
  content: string;
  linkedSignalId?: string;
  linkedProjectId?: string;
  linkedSpaceId?: string;
  userTags?: string[];
  selfReportedContext?: Record<string, unknown>;
}

export interface UpdateReflectionOptions {
  content?: string;
  userTags?: string[];
  selfReportedContext?: Record<string, unknown>;
}

export interface GetReflectionsOptions {
  linkedSignalId?: string;
  linkedProjectId?: string;
  linkedSpaceId?: string;
  hasTag?: string;
  limit?: number;
  offset?: number;
}

export interface ReflectionStats {
  total_count: number;
  earliest_date: string | null;
  latest_date: string | null;
  has_linked: number;
  has_unlinked: number;
}
