export type AIIntent =
  | 'explain'
  | 'summarize'
  | 'draft_roadmap_item'
  | 'draft_task_list'
  | 'suggest_next_steps'
  | 'analyze_deadlines'
  | 'critique_plan'
  | 'compare_options'
  | 'generate_checklist'
  | 'propose_timeline'
  | 'explain_relationships'
  | 'suggest_breakdown'
  | 'identify_risks'
  | 'recommend_priorities';

export type AIResponseType =
  | 'explanation'
  | 'summary'
  | 'draft'
  | 'suggestion'
  | 'critique'
  | 'comparison'
  | 'checklist'
  | 'timeline_proposal'
  | 'analysis'
  | 'recommendation';

export type AIDraftType =
  | 'roadmap_item'
  | 'child_item'
  | 'task_list'
  | 'document'
  | 'summary'
  | 'insight'
  | 'checklist'
  | 'timeline'
  | 'breakdown'
  | 'risk_analysis';

export type AIDraftStatus =
  | 'generated'
  | 'edited'
  | 'accepted'
  | 'discarded'
  | 'partially_applied';

export interface AIContextScope {
  projectId?: string;
  trackIds?: string[];
  roadmapItemIds?: string[];
  includeCollaboration?: boolean;
  includeMindMesh?: boolean;
  includeTaskFlow?: boolean;
  includePeople?: boolean;
  includeDeadlines?: boolean;
  timeframeStart?: string;
  timeframeEnd?: string;
}

export interface AIProvenanceMetadata {
  sourceEntityIds: string[];
  sourceEntityTypes: string[];
  contextSnapshot: Record<string, any>;
  generatedAt: string;
  modelVersion?: string;
  confidenceLevel?: 'high' | 'medium' | 'low';
}

export interface AIDraft {
  id: string;
  userId: string;
  projectId: string | null;
  draftType: AIDraftType;
  status: AIDraftStatus;
  title: string;
  content: Record<string, any>;
  provenanceMetadata: AIProvenanceMetadata;
  contextScope: AIContextScope;
  appliedToEntityId?: string | null;
  appliedToEntityType?: string | null;
  appliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  discardedAt?: string | null;
}

export interface AIInteractionAudit {
  id: string;
  userId: string;
  projectId: string | null;
  intent: AIIntent;
  responseType: AIResponseType;
  contextScope: AIContextScope;
  entitiesIncluded: Record<string, any>;
  draftId?: string | null;
  userPrompt?: string | null;
  createdAt: string;
}

export interface DraftRoadmapItemContent {
  title: string;
  description?: string;
  estimatedDuration?: number;
  suggestedDeadline?: string;
  suggestedStatus?: string;
  suggestedTrackId?: string;
  tags?: string[];
  dependencies?: string[];
  reasoning?: string;
}

export interface DraftChildItemContent {
  title: string;
  description?: string;
  estimatedDuration?: number;
  parentItemId?: string;
  orderIndex?: number;
  reasoning?: string;
}

export interface DraftTaskListContent {
  tasks: Array<{
    title: string;
    description?: string;
    estimatedDuration?: number;
    priority?: 'low' | 'medium' | 'high';
  }>;
  context?: string;
  reasoning?: string;
}

export interface DraftDocumentContent {
  format: 'markdown' | 'plain' | 'structured';
  body: string;
  metadata?: Record<string, any>;
}

export interface DraftSummaryContent {
  summary: string;
  keyPoints: string[];
  metrics?: Record<string, number | string>;
  insights?: string[];
}

export interface DraftChecklistContent {
  items: Array<{
    text: string;
    completed: boolean;
    priority?: 'low' | 'medium' | 'high';
  }>;
  context?: string;
}

export interface DraftTimelineContent {
  phases: Array<{
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    duration?: number;
    dependencies?: string[];
  }>;
  totalDuration?: number;
  reasoning?: string;
}

export interface DraftBreakdownContent {
  items: Array<{
    title: string;
    description?: string;
    estimatedDuration?: number;
    children?: DraftBreakdownContent['items'];
  }>;
  reasoning?: string;
}

export interface DraftRiskAnalysisContent {
  risks: Array<{
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    likelihood: 'unlikely' | 'possible' | 'likely' | 'certain';
    mitigation?: string;
  }>;
  overallAssessment?: string;
}

export interface AIExplanation {
  subject: string;
  explanation: string;
  context?: Record<string, any>;
  relatedEntities?: string[];
}

export interface AISuggestion {
  title: string;
  description: string;
  rationale: string;
  confidence: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export interface AICritique {
  subject: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  overallAssessment: string;
}

export interface AIComparison {
  optionA: {
    title: string;
    pros: string[];
    cons: string[];
  };
  optionB: {
    title: string;
    pros: string[];
    cons: string[];
  };
  recommendation?: string;
}

export interface AIResponse {
  responseType: AIResponseType;
  data: AIExplanation | AISuggestion | AICritique | AIComparison | AIDraft | DraftSummaryContent;
  metadata: {
    intent: AIIntent;
    contextScope: AIContextScope;
    generatedAt: string;
  };
}

export interface CreateDraftInput {
  userId: string;
  projectId?: string;
  draftType: AIDraftType;
  title: string;
  content: Record<string, any>;
  provenanceMetadata: AIProvenanceMetadata;
  contextScope: AIContextScope;
}

export interface UpdateDraftInput {
  draftId: string;
  title?: string;
  content?: Record<string, any>;
  status?: AIDraftStatus;
}

export interface AcceptDraftInput {
  draftId: string;
  appliedToEntityId: string;
  appliedToEntityType: string;
}

export interface RecordAIInteractionInput {
  userId: string;
  projectId?: string;
  intent: AIIntent;
  responseType: AIResponseType;
  contextScope: AIContextScope;
  entitiesIncluded: Record<string, any>;
  draftId?: string;
  userPrompt?: string;
}

export interface GetUserDraftsOptions {
  userId: string;
  projectId?: string;
  status?: AIDraftStatus;
  draftType?: AIDraftType;
  limit?: number;
}

export interface GetAIUsageStatsOptions {
  userId: string;
  projectId?: string;
  daysBack?: number;
}

export interface GetProjectAIActivityOptions {
  projectId: string;
  daysBack?: number;
}

export const AI_INTENT_DESCRIPTIONS: Record<AIIntent, string> = {
  explain: 'Explain a concept, relationship, or entity',
  summarize: 'Summarize project, track, or roadmap state',
  draft_roadmap_item: 'Draft a new roadmap item',
  draft_task_list: 'Draft a list of tasks',
  suggest_next_steps: 'Suggest next steps or actions',
  analyze_deadlines: 'Analyze deadlines and timeline feasibility',
  critique_plan: 'Critique a plan or approach',
  compare_options: 'Compare multiple options',
  generate_checklist: 'Generate a checklist',
  propose_timeline: 'Propose a timeline or schedule',
  explain_relationships: 'Explain relationships between entities',
  suggest_breakdown: 'Suggest how to break down a large item',
  identify_risks: 'Identify potential risks',
  recommend_priorities: 'Recommend prioritization',
};

export const AI_RESPONSE_TYPE_DESCRIPTIONS: Record<AIResponseType, string> = {
  explanation: 'Detailed explanation or clarification',
  summary: 'Condensed summary of information',
  draft: 'Draft artifact ready for user review',
  suggestion: 'Suggestion or recommendation',
  critique: 'Critical analysis with strengths and weaknesses',
  comparison: 'Side-by-side comparison of options',
  checklist: 'Actionable checklist',
  timeline_proposal: 'Proposed timeline or schedule',
  analysis: 'Analytical assessment',
  recommendation: 'Specific recommendation',
};

export const AI_DRAFT_TYPE_DESCRIPTIONS: Record<AIDraftType, string> = {
  roadmap_item: 'Draft roadmap item with details',
  child_item: 'Draft child/sub-item',
  task_list: 'List of tasks with descriptions',
  document: 'Document or text content',
  summary: 'Summary of project/track state',
  insight: 'Insight or observation',
  checklist: 'Checklist of items to complete',
  timeline: 'Timeline with phases and dates',
  breakdown: 'Hierarchical breakdown of work',
  risk_analysis: 'Risk assessment and mitigation',
};

export const AI_AUTHORITY_BOUNDARIES = {
  CAN_DO: [
    'Read Guardrails data (tracks, roadmap items, deadlines)',
    'Read Task Flow status and progress',
    'Read Mind Mesh graph structure',
    'Read collaboration activity summaries',
    'Read people names and roles',
    'Generate drafts and suggestions',
    'Provide explanations and summaries',
    'Analyze deadlines and timelines',
    'Identify risks and patterns',
  ],
  CANNOT_DO: [
    'Write directly to tracks',
    'Write directly to roadmap items',
    'Write directly to Task Flow',
    'Modify people or assignments',
    'Change permissions',
    'Access or modify Personal Spaces',
    'Execute actions without user confirmation',
    'Become a source of truth',
    'Bypass service-layer validation',
    'Make hidden writes',
  ],
};

export const AI_DESIGN_PRINCIPLES = {
  ADVISORY_ONLY: 'AI is advisory, never authoritative',
  USER_CONFIRMATION: 'All actions require explicit user confirmation',
  DRAFTS_NOT_TRUTH: 'AI outputs are drafts, not authoritative data',
  STATELESS: 'No long-lived memory unless explicitly stored by user',
  PERMISSION_SAFE: 'All reads respect permission boundaries',
  EXPLAINABLE: 'All interactions are audited and traceable',
  GUARDRAILS_AUTHORITATIVE: 'Guardrails remains the single source of truth',
};
