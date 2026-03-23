import { supabase } from '../supabase';
import type {
  UserSkill,
  ProjectRequiredSkill,
  UserTool,
  ProjectRequiredTool,
  SkillCoverage,
  ToolCoverage,
  TimeFeasibility,
  RiskAnalysis,
  ProjectFeasibility,
  FeasibilityStatus,
  SkillGap,
  ToolGap,
  RoadmapItem,
} from '../guardrailsTypes';

export async function getUserSkills(userId: string): Promise<UserSkill[]> {
  const { data, error } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch user skills: ${error.message}`);
  }

  return data || [];
}

export async function getProjectRequiredSkills(
  masterProjectId: string
): Promise<ProjectRequiredSkill[]> {
  const { data, error } = await supabase
    .from('project_required_skills')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .order('importance', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch project required skills: ${error.message}`);
  }

  return data || [];
}

export function computeSkillCoverage(
  userSkills: UserSkill[],
  projectSkills: ProjectRequiredSkill[]
): SkillCoverage {
  if (projectSkills.length === 0) {
    return {
      coveragePercent: 100,
      missingSkills: [],
      gaps: [],
      matchedSkills: [],
    };
  }

  const userSkillMap = new Map(
    userSkills.map(skill => [skill.name.toLowerCase(), skill])
  );

  const matchedSkills: Array<{
    name: string;
    userProficiency: number;
    requiredImportance: number;
  }> = [];

  const gaps: SkillGap[] = [];
  const missingSkills: SkillGap[] = [];

  let totalWeightedScore = 0;
  let maxWeightedScore = 0;

  for (const reqSkill of projectSkills) {
    const userSkill = userSkillMap.get(reqSkill.name.toLowerCase());
    const weight = reqSkill.importance;

    maxWeightedScore += weight * 5;

    if (userSkill) {
      const proficiencyScore = userSkill.proficiency;
      totalWeightedScore += proficiencyScore * weight;

      matchedSkills.push({
        name: reqSkill.name,
        userProficiency: userSkill.proficiency,
        requiredImportance: reqSkill.importance,
      });

      if (userSkill.proficiency < reqSkill.importance) {
        gaps.push({
          name: reqSkill.name,
          importance: reqSkill.importance,
          learning_hours: reqSkill.estimated_learning_hours,
          user_proficiency: userSkill.proficiency,
        });
      }
    } else {
      missingSkills.push({
        name: reqSkill.name,
        importance: reqSkill.importance,
        learning_hours: reqSkill.estimated_learning_hours,
      });

      gaps.push({
        name: reqSkill.name,
        importance: reqSkill.importance,
        learning_hours: reqSkill.estimated_learning_hours,
      });
    }
  }

  const coveragePercent =
    maxWeightedScore > 0
      ? Math.round((totalWeightedScore / maxWeightedScore) * 100)
      : 100;

  return {
    coveragePercent,
    missingSkills,
    gaps,
    matchedSkills,
  };
}

export async function getUserTools(userId: string): Promise<UserTool[]> {
  const { data, error } = await supabase
    .from('user_tools')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch user tools: ${error.message}`);
  }

  return data || [];
}

export async function getProjectRequiredTools(
  masterProjectId: string
): Promise<ProjectRequiredTool[]> {
  const { data, error } = await supabase
    .from('project_required_tools')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .order('is_essential', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch project required tools: ${error.message}`);
  }

  return data || [];
}

export function computeToolCoverage(
  userTools: UserTool[],
  projectTools: ProjectRequiredTool[]
): ToolCoverage {
  if (projectTools.length === 0) {
    return {
      coveragePercent: 100,
      missingTools: [],
      essentialMissingCount: 0,
      estimatedTotalCost: 0,
      matchedTools: [],
    };
  }

  const userToolMap = new Map(
    userTools.map(tool => [tool.name.toLowerCase(), tool])
  );

  const matchedTools: Array<{
    name: string;
    category: string;
  }> = [];

  const missingTools: ToolGap[] = [];
  let essentialMissingCount = 0;
  let estimatedTotalCost = 0;

  for (const reqTool of projectTools) {
    const userTool = userToolMap.get(reqTool.name.toLowerCase());

    if (userTool) {
      matchedTools.push({
        name: reqTool.name,
        category: reqTool.category,
      });
    } else {
      missingTools.push({
        name: reqTool.name,
        category: reqTool.category,
        cost: reqTool.estimated_cost,
        is_essential: reqTool.is_essential,
      });

      if (reqTool.is_essential) {
        essentialMissingCount++;
      }

      if (reqTool.estimated_cost) {
        estimatedTotalCost += reqTool.estimated_cost;
      }
    }
  }

  const coveragePercent = Math.round(
    (matchedTools.length / projectTools.length) * 100
  );

  return {
    coveragePercent,
    missingTools,
    essentialMissingCount,
    estimatedTotalCost,
    matchedTools,
  };
}

export function getProjectTimeRequirements(
  items: RoadmapItem[]
): { totalEstimatedHours: number; totalDays: number } {
  if (items.length === 0) {
    return { totalEstimatedHours: 0, totalDays: 0 };
  }

  let totalDays = 0;

  for (const item of items) {
    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    totalDays += Math.max(daysDiff, 1);
  }

  const totalEstimatedHours = totalDays * 2;

  return { totalEstimatedHours, totalDays };
}

export function getUserAvailableHours(): number {
  return 10;
}

export function computeTimeFeasibility(
  items: RoadmapItem[],
  userAvailableHoursPerWeek: number = getUserAvailableHours()
): TimeFeasibility {
  const { totalEstimatedHours, totalDays } =
    getProjectTimeRequirements(items);

  if (totalEstimatedHours === 0) {
    return {
      weeklyHoursNeeded: 0,
      weeklyHoursAvailable: userAvailableHoursPerWeek,
      deficitOrSurplus: userAvailableHoursPerWeek,
      recommendedTimelineExtensionWeeks: 0,
      estimatedProjectWeeks: 0,
    };
  }

  const estimatedProjectWeeks = Math.ceil(totalDays / 7);

  const weeklyHoursNeeded =
    estimatedProjectWeeks > 0
      ? totalEstimatedHours / estimatedProjectWeeks
      : totalEstimatedHours;

  const deficitOrSurplus = userAvailableHoursPerWeek - weeklyHoursNeeded;

  let recommendedTimelineExtensionWeeks = 0;
  if (deficitOrSurplus < 0) {
    const additionalHoursNeeded = Math.abs(deficitOrSurplus) * estimatedProjectWeeks;
    recommendedTimelineExtensionWeeks = Math.ceil(
      additionalHoursNeeded / userAvailableHoursPerWeek
    );
  }

  return {
    weeklyHoursNeeded: Math.round(weeklyHoursNeeded * 10) / 10,
    weeklyHoursAvailable: userAvailableHoursPerWeek,
    deficitOrSurplus: Math.round(deficitOrSurplus * 10) / 10,
    recommendedTimelineExtensionWeeks,
    estimatedProjectWeeks,
  };
}

export function computeRiskAnalysis(
  items: RoadmapItem[],
  skillCoverage: SkillCoverage,
  toolCoverage: ToolCoverage
): RiskAnalysis {
  const warnings: string[] = [];
  let overwhelmIndex = 0;

  const inProgressCount = items.filter(
    item => item.status === 'in_progress'
  ).length;
  const blockersCount = items.filter(item => item.status === 'blocked').length;
  const notStartedCount = items.filter(
    item => item.status === 'not_started'
  ).length;

  if (inProgressCount > 5) {
    warnings.push(
      `Too many tasks in progress (${inProgressCount}). Consider focusing on fewer items.`
    );
    overwhelmIndex += 20;
  }

  if (blockersCount > 0) {
    warnings.push(`${blockersCount} blocked task${blockersCount > 1 ? 's' : ''} need attention.`);
    overwhelmIndex += blockersCount * 10;

    const now = Date.now();
    const oldBlockers = items.filter(item => {
      if (item.status !== 'blocked') return false;
      const createdAt = new Date(item.created_at).getTime();
      const hoursSinceCreated = (now - createdAt) / (1000 * 60 * 60);
      return hoursSinceCreated > 48;
    }).length;

    if (oldBlockers > 0) {
      warnings.push(`${oldBlockers} blocker${oldBlockers > 1 ? 's' : ''} older than 48 hours.`);
      overwhelmIndex += oldBlockers * 15;
    }
  }

  const criticalMissingSkills = skillCoverage.missingSkills.filter(
    skill => skill.importance >= 4
  ).length;

  if (criticalMissingSkills > 0) {
    warnings.push(
      `${criticalMissingSkills} critical skill${criticalMissingSkills > 1 ? 's' : ''} missing. Tasks requiring these cannot be started.`
    );
    overwhelmIndex += criticalMissingSkills * 15;
  }

  if (toolCoverage.essentialMissingCount > 0) {
    warnings.push(
      `${toolCoverage.essentialMissingCount} essential tool${toolCoverage.essentialMissingCount > 1 ? 's' : ''} needed before work can begin.`
    );
    overwhelmIndex += toolCoverage.essentialMissingCount * 10;
  }

  const totalTasks = items.length;
  if (totalTasks > 20) {
    warnings.push(
      `Large project with ${totalTasks} tasks. Consider breaking into smaller milestones.`
    );
    overwhelmIndex += 10;
  }

  const complexityScore =
    skillCoverage.gaps.length * 2 + toolCoverage.missingTools.length;

  overwhelmIndex = Math.min(overwhelmIndex, 100);

  let riskLevel: 'low' | 'medium' | 'high';
  if (overwhelmIndex < 30) {
    riskLevel = 'low';
  } else if (overwhelmIndex < 60) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  return {
    overwhelmIndex,
    blockersCount,
    complexityScore,
    riskLevel,
    warnings,
  };
}

export function computeProjectFeasibility(
  userId: string,
  skillCoverage: SkillCoverage,
  toolCoverage: ToolCoverage,
  timeFeasibility: TimeFeasibility,
  riskAnalysis: RiskAnalysis
): ProjectFeasibility {
  const recommendations: string[] = [];

  let timeFeasibilityScore = 100;
  if (timeFeasibility.deficitOrSurplus < 0) {
    const deficitPercent = Math.abs(timeFeasibility.deficitOrSurplus) /
      timeFeasibility.weeklyHoursAvailable;
    timeFeasibilityScore = Math.max(0, 100 - deficitPercent * 100);

    if (timeFeasibility.recommendedTimelineExtensionWeeks > 0) {
      recommendations.push(
        `Extend timeline by ${timeFeasibility.recommendedTimelineExtensionWeeks} week${
          timeFeasibility.recommendedTimelineExtensionWeeks > 1 ? 's' : ''
        } to match available hours.`
      );
    }
  }

  const riskPenalty = riskAnalysis.overwhelmIndex;
  const riskPenaltyScore = Math.max(0, 100 - riskPenalty);

  const feasibilityScore = Math.round(
    skillCoverage.coveragePercent * 0.35 +
      toolCoverage.coveragePercent * 0.25 +
      timeFeasibilityScore * 0.2 +
      riskPenaltyScore * 0.2
  );

  let feasibilityStatus: FeasibilityStatus;
  if (feasibilityScore >= 70) {
    feasibilityStatus = 'green';
  } else if (feasibilityScore >= 40) {
    feasibilityStatus = 'yellow';
  } else {
    feasibilityStatus = 'red';
  }

  if (skillCoverage.coveragePercent < 70) {
    const topGaps = skillCoverage.gaps
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3);
    topGaps.forEach(gap => {
      recommendations.push(
        `Learn ${gap.name} (${gap.learning_hours}h estimated).`
      );
    });
  }

  if (toolCoverage.essentialMissingCount > 0) {
    recommendations.push(
      `Acquire ${toolCoverage.essentialMissingCount} essential tool${
        toolCoverage.essentialMissingCount > 1 ? 's' : ''
      } before starting.`
    );
  }

  if (toolCoverage.estimatedTotalCost > 0) {
    recommendations.push(
      `Budget $${toolCoverage.estimatedTotalCost.toFixed(2)} for missing tools.`
    );
  }

  if (riskAnalysis.riskLevel === 'high') {
    recommendations.push(
      'High overwhelm risk detected. Review warnings and simplify scope.'
    );
  }

  if (riskAnalysis.blockersCount > 0) {
    recommendations.push(
      `Resolve ${riskAnalysis.blockersCount} blocked task${
        riskAnalysis.blockersCount > 1 ? 's' : ''
      } before proceeding.`
    );
  }

  return {
    skillCoveragePercent: skillCoverage.coveragePercent,
    toolCoveragePercent: toolCoverage.coveragePercent,
    timeFeasibility,
    riskAnalysis,
    feasibilityScore,
    feasibilityStatus,
    recommendations,
    skillCoverage,
    toolCoverage,
  };
}
