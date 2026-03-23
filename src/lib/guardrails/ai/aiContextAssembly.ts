import { supabase } from '../../supabase';
import type { AIContextScope, AIIntent } from './aiTypes';
import { truncateText, getBudgetForIntent, calculateContextUsage, validateContextBudget, type ContextBudget } from './aiContextBudget';

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
    userId: string;
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

export async function buildContext(
  scope: AIContextScope,
  userId: string,
  intent?: AIIntent
): Promise<AssembledContext> {
  const budget = intent ? getBudgetForIntent(intent) : undefined;

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
  userId: string
): Promise<RoadmapItemContext[]> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('id, title, description, track_id, status, type, end_date, estimated_hours, order_index, parent_item_id')
    .in('id', itemIds)
    .order('order_index', { ascending: true });

  if (error || !data) {
    return [];
  }

  const itemsWithChildren = await Promise.all(
    data.map(async (item) => {
      const { data: children } = await supabase
        .from('roadmap_items')
        .select('id', { count: 'exact' })
        .eq('parent_item_id', item.id);

      return {
        id: item.id,
        title: item.title,
        description: item.description,
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
  userId: string
): Promise<CollaborationContext | undefined> {
  const daysBack = 30;

  const { data: recentActivity } = await supabase
    .from('collaboration_activity')
    .select('user_id, activity_type, entity_type, created_at')
    .eq('project_id', projectId)
    .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

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
      userId: a.user_id,
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
  userId: string
): Promise<MindMeshContext | undefined> {
  const { data: nodes } = await supabase
    .from('mind_mesh_nodes')
    .select('id, label, node_type, source_type, source_entity_id')
    .eq('master_project_id', projectId)
    .limit(100);

  const nodeIds = nodes?.map(n => n.id) || [];

  const { data: edges } = await supabase
    .from('mind_mesh_edges')
    .select('id, from_node_id, to_node_id, edge_type')
    .or(`from_node_id.in.(${nodeIds.join(',')}),to_node_id.in.(${nodeIds.join(',')})`)
    .limit(200);

  return {
    nodeCount: nodes?.length || 0,
    edgeCount: edges?.length || 0,
    nodes: (nodes || []).map(n => ({
      id: n.id,
      label: n.label,
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
  userId: string
): Promise<TaskFlowContext | undefined> {
  const { data: tasks } = await supabase
    .from('taskflow_tasks')
    .select('id, title, status, synced_roadmap_item_id')
    .eq('master_project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(50);

  const statusBreakdown: Record<string, number> = {};
  tasks?.forEach(task => {
    statusBreakdown[task.status] = (statusBreakdown[task.status] || 0) + 1;
  });

  return {
    taskCount: tasks?.length || 0,
    statusBreakdown,
    tasks: (tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      syncedRoadmapItemId: t.synced_roadmap_item_id,
    })),
  };
}

async function getPeopleContext(
  projectId: string,
  userId: string
): Promise<PeopleContext[]> {
  const { data: projectPeople } = await supabase
    .from('project_people')
    .select('id, global_person_id, name, role')
    .eq('master_project_id', projectId);

  const { data: projectUsers } = await supabase
    .from('project_users')
    .select('user_id, role')
    .eq('master_project_id', projectId);

  const people: PeopleContext[] = [];

  if (projectPeople) {
    for (const person of projectPeople) {
      const { count } = await supabase
        .from('roadmap_item_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('person_id', person.id);

      people.push({
        id: person.id,
        name: person.name,
        role: person.role,
        isProjectUser: false,
        assignmentCount: count || 0,
      });
    }
  }

  if (projectUsers) {
    for (const user of projectUsers) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user_id)
        .maybeSingle();

      people.push({
        id: user.user_id,
        name: profile?.full_name || 'Unknown User',
        role: user.role,
        isProjectUser: true,
        assignmentCount: 0,
      });
    }
  }

  return people;
}

async function getDeadlinesContext(
  projectId: string,
  userId: string
): Promise<DeadlineContext[]> {
  const { data: items } = await supabase
    .from('roadmap_items')
    .select('id, title, end_date, status, track_id')
    .eq('master_project_id', projectId)
    .not('end_date', 'is', null)
    .order('end_date', { ascending: true });

  if (!items) {
    return [];
  }

  const now = new Date();

  return items.map(item => {
    const deadline = new Date(item.end_date!);
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      itemId: item.id,
      itemTitle: item.title,
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
  userId: string
): Promise<AssembledContext> {
  const { data: tracks } = await supabase
    .from('guardrails_tracks')
    .select('id')
    .eq('master_project_id', projectId);

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
    userId
  );
}

export async function buildContextForTrack(
  trackId: string,
  userId: string
): Promise<AssembledContext> {
  const { data: track } = await supabase
    .from('guardrails_tracks')
    .select('master_project_id')
    .eq('id', trackId)
    .maybeSingle();

  const { data: items } = await supabase
    .from('roadmap_items')
    .select('id')
    .eq('track_id', trackId);

  const itemIds = items?.map(i => i.id) || [];

  return buildContext(
    {
      projectId: track?.master_project_id,
      trackIds: [trackId],
      roadmapItemIds: itemIds,
      includeDeadlines: true,
    },
    userId
  );
}

export async function buildContextForRoadmapItem(
  itemId: string,
  userId: string
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
    userId
  );
}
