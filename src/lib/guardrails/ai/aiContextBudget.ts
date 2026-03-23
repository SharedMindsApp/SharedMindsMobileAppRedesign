export interface ContextBudget {
  maxProjects: number;
  maxTracks: number;
  maxRoadmapItems: number;
  maxCollaborationEvents: number;
  maxMindMeshNodes: number;
  maxMindMeshEdges: number;
  maxTaskFlowTasks: number;
  maxPeople: number;
  maxDeadlines: number;
  maxTextLengthPerEntity: number;
  maxTotalTextLength: number;
}

export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  maxProjects: 1,
  maxTracks: 10,
  maxRoadmapItems: 50,
  maxCollaborationEvents: 20,
  maxMindMeshNodes: 100,
  maxMindMeshEdges: 200,
  maxTaskFlowTasks: 30,
  maxPeople: 20,
  maxDeadlines: 30,
  maxTextLengthPerEntity: 500,
  maxTotalTextLength: 50000,
};

export const INTENT_CONTEXT_BUDGETS: Record<string, ContextBudget> = {
  explain: {
    maxProjects: 1,
    maxTracks: 3,
    maxRoadmapItems: 10,
    maxCollaborationEvents: 0,
    maxMindMeshNodes: 50,
    maxMindMeshEdges: 100,
    maxTaskFlowTasks: 0,
    maxPeople: 5,
    maxDeadlines: 0,
    maxTextLengthPerEntity: 300,
    maxTotalTextLength: 10000,
  },
  summarize: {
    maxProjects: 1,
    maxTracks: 10,
    maxRoadmapItems: 50,
    maxCollaborationEvents: 10,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 20,
    maxPeople: 10,
    maxDeadlines: 20,
    maxTextLengthPerEntity: 200,
    maxTotalTextLength: 20000,
  },
  draft_roadmap_item: {
    maxProjects: 1,
    maxTracks: 1,
    maxRoadmapItems: 10,
    maxCollaborationEvents: 0,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 0,
    maxPeople: 0,
    maxDeadlines: 5,
    maxTextLengthPerEntity: 500,
    maxTotalTextLength: 10000,
  },
  draft_task_list: {
    maxProjects: 1,
    maxTracks: 1,
    maxRoadmapItems: 1,
    maxCollaborationEvents: 0,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 10,
    maxPeople: 0,
    maxDeadlines: 0,
    maxTextLengthPerEntity: 500,
    maxTotalTextLength: 5000,
  },
  suggest_next_steps: {
    maxProjects: 1,
    maxTracks: 5,
    maxRoadmapItems: 20,
    maxCollaborationEvents: 10,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 15,
    maxPeople: 5,
    maxDeadlines: 10,
    maxTextLengthPerEntity: 200,
    maxTotalTextLength: 15000,
  },
  analyze_deadlines: {
    maxProjects: 1,
    maxTracks: 10,
    maxRoadmapItems: 50,
    maxCollaborationEvents: 0,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 0,
    maxPeople: 0,
    maxDeadlines: 50,
    maxTextLengthPerEntity: 200,
    maxTotalTextLength: 15000,
  },
  critique_plan: {
    maxProjects: 1,
    maxTracks: 5,
    maxRoadmapItems: 30,
    maxCollaborationEvents: 5,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 10,
    maxPeople: 5,
    maxDeadlines: 15,
    maxTextLengthPerEntity: 300,
    maxTotalTextLength: 20000,
  },
  compare_options: {
    maxProjects: 1,
    maxTracks: 2,
    maxRoadmapItems: 10,
    maxCollaborationEvents: 0,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 0,
    maxPeople: 0,
    maxDeadlines: 5,
    maxTextLengthPerEntity: 500,
    maxTotalTextLength: 10000,
  },
  generate_checklist: {
    maxProjects: 1,
    maxTracks: 1,
    maxRoadmapItems: 1,
    maxCollaborationEvents: 0,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 5,
    maxPeople: 0,
    maxDeadlines: 0,
    maxTextLengthPerEntity: 500,
    maxTotalTextLength: 5000,
  },
  propose_timeline: {
    maxProjects: 1,
    maxTracks: 1,
    maxRoadmapItems: 30,
    maxCollaborationEvents: 0,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 0,
    maxPeople: 0,
    maxDeadlines: 30,
    maxTextLengthPerEntity: 200,
    maxTotalTextLength: 15000,
  },
  explain_relationships: {
    maxProjects: 1,
    maxTracks: 5,
    maxRoadmapItems: 15,
    maxCollaborationEvents: 0,
    maxMindMeshNodes: 100,
    maxMindMeshEdges: 200,
    maxTaskFlowTasks: 0,
    maxPeople: 10,
    maxDeadlines: 0,
    maxTextLengthPerEntity: 300,
    maxTotalTextLength: 15000,
  },
  suggest_breakdown: {
    maxProjects: 1,
    maxTracks: 1,
    maxRoadmapItems: 1,
    maxCollaborationEvents: 0,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 0,
    maxPeople: 0,
    maxDeadlines: 0,
    maxTextLengthPerEntity: 500,
    maxTotalTextLength: 5000,
  },
  identify_risks: {
    maxProjects: 1,
    maxTracks: 10,
    maxRoadmapItems: 40,
    maxCollaborationEvents: 10,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 20,
    maxPeople: 10,
    maxDeadlines: 30,
    maxTextLengthPerEntity: 200,
    maxTotalTextLength: 20000,
  },
  recommend_priorities: {
    maxProjects: 1,
    maxTracks: 10,
    maxRoadmapItems: 50,
    maxCollaborationEvents: 5,
    maxMindMeshNodes: 0,
    maxMindMeshEdges: 0,
    maxTaskFlowTasks: 20,
    maxPeople: 5,
    maxDeadlines: 30,
    maxTextLengthPerEntity: 200,
    maxTotalTextLength: 20000,
  },
};

export function getBudgetForIntent(intent: string): ContextBudget {
  return INTENT_CONTEXT_BUDGETS[intent] || DEFAULT_CONTEXT_BUDGET;
}

export function truncateText(text: string | undefined | null, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export interface ContextUsage {
  projects: number;
  tracks: number;
  roadmapItems: number;
  collaborationEvents: number;
  mindMeshNodes: number;
  mindMeshEdges: number;
  taskFlowTasks: number;
  people: number;
  deadlines: number;
  totalTextLength: number;
}

export function calculateContextUsage(context: any): ContextUsage {
  let totalTextLength = 0;

  if (context.project) {
    totalTextLength += (context.project.name?.length || 0);
    totalTextLength += (context.project.description?.length || 0);
  }

  if (context.tracks) {
    context.tracks.forEach((track: any) => {
      totalTextLength += (track.name?.length || 0);
      totalTextLength += (track.description?.length || 0);
    });
  }

  if (context.roadmapItems) {
    context.roadmapItems.forEach((item: any) => {
      totalTextLength += (item.title?.length || 0);
      totalTextLength += (item.description?.length || 0);
    });
  }

  return {
    projects: context.project ? 1 : 0,
    tracks: context.tracks?.length || 0,
    roadmapItems: context.roadmapItems?.length || 0,
    collaborationEvents: context.collaboration?.recentActivity?.length || 0,
    mindMeshNodes: context.mindMesh?.nodeCount || 0,
    mindMeshEdges: context.mindMesh?.edgeCount || 0,
    taskFlowTasks: context.taskFlow?.taskCount || 0,
    people: context.people?.length || 0,
    deadlines: context.deadlines?.length || 0,
    totalTextLength,
  };
}

export function validateContextBudget(
  usage: ContextUsage,
  budget: ContextBudget
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (usage.projects > budget.maxProjects) {
    violations.push(`Too many projects: ${usage.projects} > ${budget.maxProjects}`);
  }
  if (usage.tracks > budget.maxTracks) {
    violations.push(`Too many tracks: ${usage.tracks} > ${budget.maxTracks}`);
  }
  if (usage.roadmapItems > budget.maxRoadmapItems) {
    violations.push(`Too many roadmap items: ${usage.roadmapItems} > ${budget.maxRoadmapItems}`);
  }
  if (usage.collaborationEvents > budget.maxCollaborationEvents) {
    violations.push(`Too many collaboration events: ${usage.collaborationEvents} > ${budget.maxCollaborationEvents}`);
  }
  if (usage.mindMeshNodes > budget.maxMindMeshNodes) {
    violations.push(`Too many Mind Mesh nodes: ${usage.mindMeshNodes} > ${budget.maxMindMeshNodes}`);
  }
  if (usage.mindMeshEdges > budget.maxMindMeshEdges) {
    violations.push(`Too many Mind Mesh edges: ${usage.mindMeshEdges} > ${budget.maxMindMeshEdges}`);
  }
  if (usage.taskFlowTasks > budget.maxTaskFlowTasks) {
    violations.push(`Too many Task Flow tasks: ${usage.taskFlowTasks} > ${budget.maxTaskFlowTasks}`);
  }
  if (usage.people > budget.maxPeople) {
    violations.push(`Too many people: ${usage.people} > ${budget.maxPeople}`);
  }
  if (usage.deadlines > budget.maxDeadlines) {
    violations.push(`Too many deadlines: ${usage.deadlines} > ${budget.maxDeadlines}`);
  }
  if (usage.totalTextLength > budget.maxTotalTextLength) {
    violations.push(`Too much text: ${usage.totalTextLength} > ${budget.maxTotalTextLength}`);
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export const CONTEXT_BUDGET_NOTES = {
  PURPOSE: 'Prevent token overflow and runaway costs by enforcing hard limits per intent',
  DETERMINISTIC: 'Same input + same budget = same output size',
  SUMMARY_FIRST: 'Large datasets are summarized, not fully included',
  INTENT_SPECIFIC: 'Each intent has tailored limits based on what it needs',
  NO_PROJECT_DUMPS: 'No intent can include entire project data',
};
