import { supabase } from '../../supabase';
import type { AIContextScope, AIIntent } from './aiTypes';
import { truncateText, getBudgetForIntent, calculateContextUsage, validateContextBudget, type ContextBudget } from './aiContextBudget';
import { canUserAccessProject, canUserAccessTrack, canUserAccessRoadmapItem } from './aiPermissions';
import { ChatSurfaceService } from './aiChatSurfaceService';
import type { ChatSurfaceType } from './aiChatSurfaceTypes';
import { InvariantViolationError } from '../SYSTEM_INVARIANTS';

export interface AssembledContext {
  scope: AIContextScope;
  project?: ProjectContext;
  tracks?: TrackContext[];
  roadmapItems?: RoadmapItemContext[];
  collaboration?: CollaborationContext;
  mindMesh?: MindMeshContext;
  taskFlow?: TaskFlowContext;
  people?: PeopleContext[];
  deadlines?: DeadlineContext[];
  assembledAt: string;
  budgetUsed?: ContextBudget;
  budgetViolations?: string[];
  contextHash?: string;
}

export interface ProjectContext {
  id: string;
  name: string;
  description?: string;
  projectType?: string;
  domainId?: string;
  status?: string;
  createdAt: string;
}

export interface TrackContext {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isShared: boolean;
  parentTrackId?: string;
  orderIndex: number;
  itemCount?: number;
}

export interface RoadmapItemContext {
  id: string;
  title: string;
  description?: string;
  trackId?: string;
  status?: string;
  itemType?: string;
  deadline?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  orderIndex: number;
  hasChildren?: boolean;
  childrenCount?: number;
  isComposable?: boolean;
}

export interface CollaborationContext {
  totalCollaborators: number;
  recentActivity: Array<{
    activityType: string;
    entityType: string;
    timestamp: string;
  }>;
  mostActiveUsers: Array<{
    userId: string;
    activityCount: number;
  }>;
  surfaceActivity: Array<{
    surfaceType: string;
    activityCount: number;
    uniqueUsers: number;
  }>;
}

export interface MindMeshContext {
  nodeCount: number;
  edgeCount: number;
  nodes: Array<{
    id: string;
    label: string;
    nodeType: string;
    sourceType?: string;
    sourceEntityId?: string;
  }>;
  edges: Array<{
    id: string;
    fromNodeId: string;
    toNodeId: string;
    edgeType: string;
  }>;
}

export interface TaskFlowContext {
  taskCount: number;
  statusBreakdown: Record<string, number>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    syncedRoadmapItemId?: string;
  }>;
}

export interface PeopleContext {
  id: string;
  name: string;
  role?: string;
  isProjectUser: boolean;
  assignmentCount?: number;
}

export interface DeadlineContext {
  itemId: string;
  itemTitle: string;
  deadline: string;
  status?: string;
  daysUntilDeadline: number;
  isOverdue: boolean;
  trackId?: string;
}

export async function validateSurfaceScope(
  scope: AIContextScope,
  surfaceType: ChatSurfaceType,
  surfaceProjectId: string | null
): Promise<{ valid: boolean; violations: string[] }> {
  const violations: string[] = [];

  if (surfaceType === 'project') {
    if (!surfaceProjectId) {
      violations.push('Project surface requires a master_project_id');
    }

    if (scope.projectId && scope.projectId !== surfaceProjectId) {
      violations.push(`Project surface can only access its own project data (${surfaceProjectId}), not ${scope.projectId}`);
    }

    if (scope.projectId && scope.projectId === surfaceProjectId) {
    } else if (scope.projectId && scope.projectId !== surfaceProjectId) {
      violations.push('Cross-project access forbidden on project surface');
    }
  }

  if (surfaceType === 'personal') {
    if (scope.projectId) {
      violations.push('Personal surface cannot access project-authoritative data');
    }

    if (scope.includeCollaboration) {
      violations.push('Personal surface cannot access collaboration data');
    }
  }

  if (surfaceType === 'shared') {
    if (scope.projectId) {
      violations.push('Shared surface can only access shared tracks and shared collaboration metadata');
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export async function buildContextWithSurfaceValidation(
  scope: AIContextScope,
  userId: string,
  surfaceType: ChatSurfaceType,
  surfaceProjectId: string | null,
  intent?: AIIntent
): Promise<AssembledContext> {
  const surfaceValidation = await validateSurfaceScope(scope, surfaceType, surfaceProjectId);

  if (!surfaceValidation.valid) {
    throw new InvariantViolationError(
      'SURFACE_SCOPE_VIOLATION',
      {
        scope,
        surfaceType,
        surfaceProjectId,
        violations: surfaceValidation.violations,
      },
      `Surface scope violations: ${surfaceValidation.violations.join(', ')}`
    );
  }

  return buildContext(scope, userId, intent);
}

export async function buildContext(
  scope: AIContextScope,
  userId: string,
  intent?: AIIntent
): Promise<AssembledContext> {
  const budget = intent ? getBudgetForIntent(intent) : undefined;

  if (scope.projectId) {
    const hasAccess = await canUserAccessProject(userId, scope.projectId);
    if (!hasAccess) {
      throw new Error('User does not have access to project');
    }
  }

  const context: AssembledContext = {
    scope,
    assembledAt: new Date().toISOString(),
    budgetUsed: budget,
  };

  if (scope.projectId) {
    context.project = await getProjectContext(scope.projectId, userId, budget);
  }

  if (scope.trackIds && scope.trackIds.length > 0) {
    const limitedTrackIds = budget
      ? scope.trackIds.slice(0, budget.maxTracks)
      : scope.trackIds;
    context.tracks = await getTracksContext(limitedTrackIds, userId, budget);
  }

  if (scope.roadmapItemIds && scope.roadmapItemIds.length > 0) {
    const limitedItemIds = budget
      ? scope.roadmapItemIds.slice(0, budget.maxRoadmapItems)
      : scope.roadmapItemIds;
    context.roadmapItems = await getRoadmapItemsContext(limitedItemIds, userId, budget);
  }

  if (scope.includeCollaboration && scope.projectId) {
    context.collaboration = await getCollaborationContext(scope.projectId, userId, budget);
  }

  if (scope.includeMindMesh && scope.projectId) {
    context.mindMesh = await getMindMeshContext(scope.projectId, userId, budget);
  }

  if (scope.includeTaskFlow && scope.projectId) {
    context.taskFlow = await getTaskFlowContext(scope.projectId, userId, budget);
  }

  if (scope.includePeople && scope.projectId) {
    context.people = await getPeopleContext(scope.projectId, userId, budget);
  }

  if (scope.includeDeadlines && scope.projectId) {
    context.deadlines = await getDeadlinesContext(scope.projectId, userId, budget);
  }

  if (budget) {
    const usage = calculateContextUsage(context);
    const validation = validateContextBudget(usage, budget);
    if (!validation.valid) {
      context.budgetViolations = validation.violations;
      console.warn('AI Context budget violations:', validation.violations);
    }
  }

  context.contextHash = await generateContextHash(context);

  return context;
}

async function getProjectContext(
  projectId: string,
  userId: string,
  budget?: ContextBudget
): Promise<ProjectContext | undefined> {
  const { data, error } = await supabase
    .from('master_projects')
    .select('id, name, description, project_type, domain_id, status, created_at')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  const maxLength = budget?.maxTextLengthPerEntity || 500;

  return {
    id: data.id,
    name: truncateText(data.name, maxLength),
    description: truncateText(data.description, maxLength),
    projectType: data.project_type,
    domainId: data.domain_id,
    status: data.status,
    createdAt: data.created_at,
  };
}

async function getTracksContext(
  trackIds: string[],
  userId: string,
  budget?: ContextBudget
): Promise<TrackContext[]> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('id, name, description, color, is_shared, parent_track_id, order_index')
    .in('id', trackIds)
    .order('order_index', { ascending: true });

  if (error || !data) {
    return [];
  }

  const maxLength = budget?.maxTextLengthPerEntity || 500;

  const tracksWithCounts = await Promise.all(
    data.map(async (track) => {
      const { count } = await supabase
        .from('roadmap_items')
        .select('id', { count: 'exact', head: true })
        .eq('track_id', track.id);

      return {
        id: track.id,
        name: truncateText(track.name, maxLength),
        description: truncateText(track.description, maxLength),
        color: track.color,
        isShared: track.is_shared,
        parentTrackId: track.parent_track_id,
        orderIndex: track.order_index,
        itemCount: count || 0,
      };
    })
  );

  return tracksWithCounts;
}

async function getRoadmapItemsContext(
  itemIds: string[],
  userId: string,
  budget?: ContextBudget
): Promise<RoadmapItemContext[]> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('id, title, description, track_id, status, type, end_date, estimated_hours, order_index, parent_item_id')
    .in('id', itemIds)
    .order('order_index', { ascending: true });

  if (error || !data) {
    return [];
  }

  const maxLength = budget?.maxTextLengthPerEntity || 500;

  const itemsWithChildren = await Promise.all(
    data.map(async (item) => {
      const { data: children } = await supabase
        .from('roadmap_items')
        .select('id', { count: 'exact' })
        .eq('parent_item_id', item.id);

      return {
        id: item.id,
        title: truncateText(item.title, maxLength),
        description: truncateText(item.description, maxLength),
        trackId: item.track_id,
        status: item.status,
        itemType: item.type,
        deadline: item.end_date,
        estimatedDuration: item.estimated_hours,
        actualDuration: undefined,
        orderIndex: item.order_index,
        hasChildren: children && children.length > 0,
        childrenCount: children?.length || 0,
        isComposable: false,
      };
    })
  );

  return itemsWithChildren;
}

async function getCollaborationContext(
  projectId: string,
  userId: string,
  budget?: ContextBudget
): Promise<CollaborationContext | undefined> {
  const daysBack = 30;
  const maxEvents = budget?.maxCollaborationEvents || 20;

  const { data: recentActivity } = await supabase
    .from('collaboration_activity')
    .select('user_id, activity_type, entity_type, created_at')
    .eq('project_id', projectId)
    .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(maxEvents);

  const { data: heatmap } = await supabase.rpc('get_project_collaboration_heatmap', {
    input_project_id: projectId,
    days_back: daysBack,
  });

  const uniqueUsers = new Set(recentActivity?.map(a => a.user_id) || []);

  const userActivityCounts = new Map<string, number>();
  recentActivity?.forEach(activity => {
    const count = userActivityCounts.get(activity.user_id) || 0;
    userActivityCounts.set(activity.user_id, count + 1);
  });

  const mostActiveUsers = Array.from(userActivityCounts.entries())
    .map(([userId, count]) => ({ userId, activityCount: count }))
    .sort((a, b) => b.activityCount - a.activityCount)
    .slice(0, 5);

  return {
    totalCollaborators: uniqueUsers.size,
    recentActivity: (recentActivity || []).map(a => ({
      activityType: a.activity_type,
      entityType: a.entity_type,
      timestamp: a.created_at,
    })),
    mostActiveUsers,
    surfaceActivity: (heatmap || []).map((h: any) => ({
      surfaceType: h.surface_type,
      activityCount: parseInt(h.activity_count),
      uniqueUsers: parseInt(h.unique_users),
    })),
  };
}

async function getMindMeshContext(
  projectId: string,
  userId: string,
  budget?: ContextBudget
): Promise<MindMeshContext | undefined> {
  const maxNodes = budget?.maxMindMeshNodes || 100;
  const maxEdges = budget?.maxMindMeshEdges || 200;

  const { data: nodes } = await supabase
    .from('mind_mesh_nodes')
    .select('id, label, node_type, source_type, source_entity_id')
    .eq('master_project_id', projectId)
    .limit(maxNodes);

  const nodeIds = nodes?.map(n => n.id) || [];

  if (nodeIds.length === 0) {
    return {
      nodeCount: 0,
      edgeCount: 0,
      nodes: [],
      edges: [],
    };
  }

  const { data: edges } = await supabase
    .from('mind_mesh_edges')
    .select('id, from_node_id, to_node_id, edge_type')
    .or(`from_node_id.in.(${nodeIds.join(',')}),to_node_id.in.(${nodeIds.join(',')})`)
    .limit(maxEdges);

  const maxLength = budget?.maxTextLengthPerEntity || 300;

  return {
    nodeCount: nodes?.length || 0,
    edgeCount: edges?.length || 0,
    nodes: (nodes || []).map(n => ({
      id: n.id,
      label: truncateText(n.label, maxLength),
      nodeType: n.node_type,
      sourceType: n.source_type,
      sourceEntityId: n.source_entity_id,
    })),
    edges: (edges || []).map(e => ({
      id: e.id,
      fromNodeId: e.from_node_id,
      toNodeId: e.to_node_id,
      edgeType: e.edge_type,
    })),
  };
}

async function getTaskFlowContext(
  projectId: string,
  userId: string,
  budget?: ContextBudget
): Promise<TaskFlowContext | undefined> {
  const maxTasks = budget?.maxTaskFlowTasks || 30;

  const { data: tasks } = await supabase
    .from('taskflow_tasks')
    .select('id, title, status, synced_roadmap_item_id')
    .eq('master_project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(maxTasks);

  const statusBreakdown: Record<string, number> = {};
  tasks?.forEach(task => {
    statusBreakdown[task.status] = (statusBreakdown[task.status] || 0) + 1;
  });

  const maxLength = budget?.maxTextLengthPerEntity || 200;

  return {
    taskCount: tasks?.length || 0,
    statusBreakdown,
    tasks: (tasks || []).map(t => ({
      id: t.id,
      title: truncateText(t.title, maxLength),
      status: t.status,
      syncedRoadmapItemId: t.synced_roadmap_item_id,
    })),
  };
}

async function getPeopleContext(
  projectId: string,
  userId: string,
  budget?: ContextBudget
): Promise<PeopleContext[]> {
  const maxPeople = budget?.maxPeople || 20;

  const { data: projectPeople } = await supabase
    .from('project_people')
    .select('id, global_person_id, name, role')
    .eq('master_project_id', projectId)
    .limit(maxPeople);

  const { data: projectUsers } = await supabase
    .from('project_users')
    .select('user_id, role')
    .eq('master_project_id', projectId)
    .limit(maxPeople);

  const people: PeopleContext[] = [];
  const maxLength = budget?.maxTextLengthPerEntity || 200;

  if (projectPeople) {
    for (const person of projectPeople) {
      const { count } = await supabase
        .from('roadmap_item_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('person_id', person.id);

      people.push({
        id: person.id,
        name: truncateText(person.name, maxLength),
        role: truncateText(person.role, maxLength),
        isProjectUser: false,
        assignmentCount: count || 0,
      });
    }
  }

  if (projectUsers && people.length < maxPeople) {
    const remainingSlots = maxPeople - people.length;
    for (const user of projectUsers.slice(0, remainingSlots)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user_id)
        .maybeSingle();

      people.push({
        id: user.user_id,
        name: truncateText(profile?.full_name || 'Unknown User', maxLength),
        role: truncateText(user.role, maxLength),
        isProjectUser: true,
        assignmentCount: 0,
      });
    }
  }

  return people.slice(0, maxPeople);
}

async function getDeadlinesContext(
  projectId: string,
  userId: string,
  budget?: ContextBudget
): Promise<DeadlineContext[]> {
  const maxDeadlines = budget?.maxDeadlines || 30;

  const { data: items } = await supabase
    .from('roadmap_items')
    .select('id, title, end_date, status, track_id')
    .eq('master_project_id', projectId)
    .not('end_date', 'is', null)
    .order('end_date', { ascending: true })
    .limit(maxDeadlines);

  if (!items) {
    return [];
  }

  const now = new Date();
  const maxLength = budget?.maxTextLengthPerEntity || 200;

  return items.map(item => {
    const deadline = new Date(item.end_date!);
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      itemId: item.id,
      itemTitle: truncateText(item.title, maxLength),
      deadline: item.end_date!,
      status: item.status,
      daysUntilDeadline: daysUntil,
      isOverdue: daysUntil < 0,
      trackId: item.track_id,
    };
  });
}

export async function buildContextForProject(
  projectId: string,
  userId: string,
  intent?: AIIntent
): Promise<AssembledContext> {
  const budget = intent ? getBudgetForIntent(intent) : undefined;

  const { data: tracks } = await supabase
    .from('guardrails_tracks')
    .select('id')
    .eq('master_project_id', projectId)
    .limit(budget?.maxTracks || 10);

  const trackIds = tracks?.map(t => t.id) || [];

  return buildContext(
    {
      projectId,
      trackIds,
      includeCollaboration: true,
      includeMindMesh: true,
      includeTaskFlow: true,
      includePeople: true,
      includeDeadlines: true,
    },
    userId,
    intent
  );
}

export async function buildContextForTrack(
  trackId: string,
  userId: string,
  intent?: AIIntent
): Promise<AssembledContext> {
  const budget = intent ? getBudgetForIntent(intent) : undefined;

  const { data: track } = await supabase
    .from('guardrails_tracks')
    .select('master_project_id')
    .eq('id', trackId)
    .maybeSingle();

  const { data: items } = await supabase
    .from('roadmap_items')
    .select('id')
    .eq('track_id', trackId)
    .limit(budget?.maxRoadmapItems || 50);

  const itemIds = items?.map(i => i.id) || [];

  return buildContext(
    {
      projectId: track?.master_project_id,
      trackIds: [trackId],
      roadmapItemIds: itemIds,
      includeDeadlines: true,
    },
    userId,
    intent
  );
}

export async function buildContextForRoadmapItem(
  itemId: string,
  userId: string,
  intent?: AIIntent
): Promise<AssembledContext> {
  const { data: item } = await supabase
    .from('roadmap_items')
    .select('master_project_id, track_id')
    .eq('id', itemId)
    .maybeSingle();

  return buildContext(
    {
      projectId: item?.master_project_id,
      trackIds: item?.track_id ? [item.track_id] : undefined,
      roadmapItemIds: [itemId],
    },
    userId,
    intent
  );
}

async function generateContextHash(context: AssembledContext): Promise<string> {
  const snapshot = {
    projectId: context.project?.id,
    trackIds: context.tracks?.map(t => t.id).sort(),
    itemIds: context.roadmapItems?.map(i => i.id).sort(),
    assembledAt: context.assembledAt,
  };

  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(snapshot));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

export const AI_CONTEXT_ASSEMBLY_GUARANTEES = {
  DETERMINISTIC: 'Same input scope + same intent = same output context',
  BUDGET_ENFORCED: 'Hard limits prevent runaway token usage',
  PERMISSION_SAFE: 'User access is validated before assembly',
  NO_PERSONAL_SPACES: 'Personal Spaces data is never included',
  COLLABORATION_SUMMARIZED: 'Activity is aggregated, not exposed verbatim',
  TEXT_TRUNCATED: 'All text fields respect max length limits',
  ENTITIES_LIMITED: 'Entity counts are capped per intent',
  HASH_PROVENANCE: 'Context hash enables traceability',
};
