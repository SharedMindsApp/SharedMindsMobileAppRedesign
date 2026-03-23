export type DomainName = 'work' | 'personal' | 'creative' | 'health';

export type ProjectStatus = 'active' | 'completed' | 'abandoned';

export type IdeaType = 'exploration' | 'idea_only' | 'feature_request';

export type ScopeCheckResult = 'in_scope' | 'side_project' | 'parking_lot';

export interface Domain {
  id: string;
  user_id: string;
  name: DomainName;
  created_at: string;
  updated_at: string;
}

export interface MasterProject {
  id: string;
  user_id: string;
  domain_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  is_archived: boolean;
  archived_at: string | null;
  completed_at: string | null;
  abandonment_reason: string | null;
  wizard_completed: boolean;
  project_type_id: string | null;
  has_completed_wizard: boolean;
  created_at: string;
  updated_at: string;
}

export interface SideProject {
  id: string;
  master_project_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SideProjectTask {
  id: string;
  side_project_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSideProjectInput {
  master_project_id: string;
  name: string;
  description?: string;
}

export interface CreateSideProjectTaskInput {
  side_project_id: string;
  title: string;
}

export interface UpdateSideProjectInput {
  name?: string;
  description?: string | null;
}

export interface UpdateSideProjectTaskInput {
  title?: string;
  is_completed?: boolean;
}

export interface OffshootIdea {
  id: string;
  master_project_id: string;
  origin_task_id: string | null;
  title: string;
  description: string | null;
  idea_type: IdeaType;
  created_at: string;
  updated_at: string;
}

export interface CreateOffshootIdeaInput {
  master_project_id: string;
  title: string;
  description?: string;
  idea_type?: IdeaType;
  origin_task_id?: string;
}

export type RoadmapItemStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';

export type RoadmapLinkType = 'dependency' | 'related' | 'blocks';

export interface RoadmapSection {
  id: string;
  master_project_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface RoadmapItem {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: RoadmapItemStatus;
  color: string | null;
  order_index: number;
  created_at: string;
  updated_at?: string;
  track_id?: string | null;
  subtrack_id?: string | null;
  side_project_id?: string | null;
  is_offshoot?: boolean;
}

export interface RoadmapLink {
  id: string;
  source_item_id: string;
  target_item_id: string;
  link_type: RoadmapLinkType;
  description: string | null;
  created_at: string;
}

export interface SideIdea {
  id: string;
  master_project_id: string;
  title: string;
  description: string | null;
  created_at: string;
  is_promoted: boolean;
  promoted_item_id: string | null;
}

export interface CreateRoadmapSectionInput {
  master_project_id: string;
  title: string;
  order_index?: number;
}

export interface UpdateRoadmapSectionInput {
  title?: string;
  order_index?: number;
}

export interface CreateRoadmapItemInput {
  section_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status?: RoadmapItemStatus;
  color?: string;
  order_index?: number;
}

export interface UpdateRoadmapItemInput {
  title?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
  status?: RoadmapItemStatus;
  color?: string | null;
  order_index?: number;
}

export interface CreateRoadmapLinkInput {
  source_item_id: string;
  target_item_id: string;
  link_type: RoadmapLinkType;
  description?: string;
}

export interface CreateSideIdeaInput {
  master_project_id: string;
  title: string;
  description?: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  name: string;
  proficiency: number;
  created_at: string;
}

export interface ProjectRequiredSkill {
  id: string;
  master_project_id: string;
  name: string;
  importance: number;
  estimated_learning_hours: number;
  created_at: string;
}

export interface UserTool {
  id: string;
  user_id: string;
  name: string;
  category: string;
  cost: number | null;
  created_at: string;
}

export interface ProjectRequiredTool {
  id: string;
  master_project_id: string;
  name: string;
  category: string;
  is_essential: boolean;
  estimated_cost: number | null;
  created_at: string;
}

export interface SkillGap {
  name: string;
  importance: number;
  learning_hours: number;
  user_proficiency?: number;
}

export interface SkillCoverage {
  coveragePercent: number;
  missingSkills: SkillGap[];
  gaps: SkillGap[];
  matchedSkills: Array<{
    name: string;
    userProficiency: number;
    requiredImportance: number;
  }>;
}

export interface ToolGap {
  name: string;
  category: string;
  cost: number | null;
  is_essential: boolean;
}

export interface ToolCoverage {
  coveragePercent: number;
  missingTools: ToolGap[];
  essentialMissingCount: number;
  estimatedTotalCost: number;
  matchedTools: Array<{
    name: string;
    category: string;
  }>;
}

export interface TimeFeasibility {
  weeklyHoursNeeded: number;
  weeklyHoursAvailable: number;
  deficitOrSurplus: number;
  recommendedTimelineExtensionWeeks: number;
  estimatedProjectWeeks: number;
}

export interface RiskAnalysis {
  overwhelmIndex: number;
  blockersCount: number;
  complexityScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
}

export type FeasibilityStatus = 'green' | 'yellow' | 'red';

export interface ProjectFeasibility {
  skillCoveragePercent: number;
  toolCoveragePercent: number;
  timeFeasibility: TimeFeasibility;
  riskAnalysis: RiskAnalysis;
  feasibilityScore: number;
  feasibilityStatus: FeasibilityStatus;
  recommendations: string[];
  skillCoverage: SkillCoverage;
  toolCoverage: ToolCoverage;
}
