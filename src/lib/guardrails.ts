import { supabase } from './supabase';
import { ensureProfileExists } from './auth/oauth';
import type {
  Domain,
  DomainName,
  MasterProject,
  SideProject,
  SideProjectTask,
  CreateSideProjectInput,
  CreateSideProjectTaskInput,
  UpdateSideProjectInput,
  UpdateSideProjectTaskInput,
  OffshootIdea,
  CreateOffshootIdeaInput,
  ScopeCheckResult,
  RoadmapSection,
  RoadmapItem,
  RoadmapLink,
  SideIdea,
  CreateRoadmapSectionInput,
  UpdateRoadmapSectionInput,
  CreateRoadmapItemInput,
  UpdateRoadmapItemInput,
  CreateRoadmapLinkInput,
  CreateSideIdeaInput,
  ProjectFeasibility,
} from './guardrailsTypes';

const MAX_SIDE_PROJECT_TASKS = 5;

export async function ensureDomainsExist(): Promise<Domain[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  await ensureProfileExists(user.id, user.email || '', user.user_metadata);

  const domainNames: DomainName[] = ['work', 'personal', 'creative', 'health'];

  const { data: existingDomains, error: fetchError } = await supabase
    .from('domains')
    .select('*')
    .eq('user_id', user.id);

  if (fetchError) {
    throw new Error(`Failed to fetch domains: ${fetchError.message}`);
  }

  const existingNames = new Set(existingDomains?.map(d => d.name) || []);
  const missingDomains = domainNames.filter(name => !existingNames.has(name));

  if (missingDomains.length > 0) {
    const { data: newDomains, error: createError } = await supabase
      .from('domains')
      .insert(
        missingDomains.map(name => ({
          user_id: user.id,
          name,
        }))
      )
      .select();

    if (createError) {
      throw new Error(`Failed to create domains: ${createError.message}`);
    }

    return [...(existingDomains || []), ...(newDomains || [])];
  }

  return existingDomains || [];
}

export async function getDomains(): Promise<Domain[]> {
  const { data, error } = await supabase
    .from('domains')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch domains: ${error.message}`);
  }

  return data || [];
}

export async function createMasterProject(
  domainId: string,
  name: string,
  description?: string,
  projectTypeId?: string
): Promise<MasterProject> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: existingProject, error: checkError } = await supabase
    .from('master_projects')
    .select('*')
    .eq('domain_id', domainId)
    .eq('is_archived', false)
    .maybeSingle();

  if (checkError) {
    throw new Error(`Failed to check existing projects: ${checkError.message}`);
  }

  if (existingProject) {
    throw new Error(`This domain already has a master project. Only one master project is allowed per domain.`);
  }

  const { data, error } = await supabase
    .from('master_projects')
    .insert({
      user_id: user.id,
      domain_id: domainId,
      name,
      description: description || null,
      status: 'active',
      project_type_id: projectTypeId || null,
      has_completed_wizard: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create master project: ${error.message}`);
  }

  return data;
}

export async function getMasterProjects(): Promise<MasterProject[]> {
  const { data, error } = await supabase
    .from('master_projects')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch master projects: ${error.message}`);
  }

  return data || [];
}

export async function getMasterProjectById(projectId: string): Promise<MasterProject | null> {
  const { data, error } = await supabase
    .from('master_projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch master project: ${error.message}`);
  }

  return data;
}

export async function getMasterProjectByDomain(domainId: string): Promise<MasterProject | null> {
  const { data, error } = await supabase
    .from('master_projects')
    .select('*')
    .eq('domain_id', domainId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch master project: ${error.message}`);
  }

  return data;
}

export async function updateMasterProject(
  projectId: string,
  updates: { name?: string; description?: string | null; status?: 'active' | 'completed' | 'abandoned' }
): Promise<MasterProject> {
  const { data, error } = await supabase
    .from('master_projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update master project: ${error.message}`);
  }

  return data;
}

export async function deleteMasterProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('master_projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    throw new Error(`Failed to delete master project: ${error.message}`);
  }
}

export async function completeMasterProject(projectId: string): Promise<MasterProject> {
  const { data: roadmapItems, error: roadmapError } = await supabase
    .from('roadmap_items')
    .select(`
      *,
      section:roadmap_sections!inner(master_project_id)
    `)
    .eq('section.master_project_id', projectId);

  if (roadmapError) {
    throw new Error(`Failed to check roadmap items: ${roadmapError.message}`);
  }

  const incompleteItems = roadmapItems?.filter(item => item.status !== 'completed') || [];

  if (incompleteItems.length > 0) {
    throw new Error(`Cannot complete project. ${incompleteItems.length} roadmap item(s) are not completed yet.`);
  }

  const { data, error } = await supabase
    .from('master_projects')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to complete master project: ${error.message}`);
  }

  return data;
}

export async function abandonMasterProject(projectId: string, reason: string): Promise<MasterProject> {
  const { data, error } = await supabase
    .from('master_projects')
    .update({
      status: 'abandoned',
      abandonment_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to abandon master project: ${error.message}`);
  }

  return data;
}

export async function archiveProject(projectId: string): Promise<MasterProject> {
  const { data: project, error: fetchError } = await supabase
    .from('master_projects')
    .select('status')
    .eq('id', projectId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch project: ${fetchError.message}`);
  }

  if (project.status === 'active') {
    throw new Error('Cannot archive an active project. Complete or abandon it first.');
  }

  const { data, error } = await supabase
    .from('master_projects')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to archive project: ${error.message}`);
  }

  return data;
}

export async function unarchiveProject(projectId: string): Promise<MasterProject> {
  const { data, error } = await supabase
    .from('master_projects')
    .update({
      is_archived: false,
      archived_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to unarchive project: ${error.message}`);
  }

  return data;
}

export async function getArchivedProjects(): Promise<MasterProject[]> {
  const { data, error } = await supabase
    .from('master_projects')
    .select('*')
    .eq('is_archived', true)
    .order('archived_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch archived projects: ${error.message}`);
  }

  return data || [];
}

export async function getCompletedProjects(): Promise<MasterProject[]> {
  const { data, error } = await supabase
    .from('master_projects')
    .select('*')
    .eq('status', 'completed')
    .eq('is_archived', false)
    .order('completed_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch completed projects: ${error.message}`);
  }

  return data || [];
}

export async function getAbandonedProjects(): Promise<MasterProject[]> {
  const { data, error } = await supabase
    .from('master_projects')
    .select('*')
    .eq('status', 'abandoned')
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch abandoned projects: ${error.message}`);
  }

  return data || [];
}

export async function getAllRoadmapItems(): Promise<(RoadmapItem & { section: RoadmapSection; project: MasterProject })[]> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .select(`
      *,
      section:roadmap_sections!inner(
        *,
        project:master_projects!inner(*)
      )
    `)
    .eq('section.project.is_archived', false)
    .order('start_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch all roadmap items: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    ...item,
    section: item.section,
    project: item.section.project,
  }));
}

export async function createSideProject(
  input: CreateSideProjectInput
): Promise<SideProject> {
  console.warn('DEPRECATED: createSideProject() uses legacy side_projects table. Use createTrack() with category="side_project" instead.');
  const { data, error } = await supabase
    .from('side_projects')
    .insert({
      master_project_id: input.master_project_id,
      name: input.name,
      description: input.description || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create side project: ${error.message}`);
  }

  return data;
}

export async function getSideProjects(
  masterProjectId: string
): Promise<SideProject[]> {
  console.warn('DEPRECATED: getSideProjects() uses legacy side_projects table. Use getTracksByCategory(projectId, "side_project") instead.');
  const { data, error } = await supabase
    .from('side_projects')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch side projects: ${error.message}`);
  }

  return data || [];
}

export async function updateSideProject(
  sideProjectId: string,
  updates: UpdateSideProjectInput
): Promise<SideProject> {
  const { data, error } = await supabase
    .from('side_projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sideProjectId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update side project: ${error.message}`);
  }

  return data;
}

export async function deleteSideProject(sideProjectId: string): Promise<void> {
  const { error } = await supabase
    .from('side_projects')
    .delete()
    .eq('id', sideProjectId);

  if (error) {
    throw new Error(`Failed to delete side project: ${error.message}`);
  }
}

export async function createSideProjectTask(
  input: CreateSideProjectTaskInput
): Promise<SideProjectTask> {
  const { count, error: countError } = await supabase
    .from('side_project_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('side_project_id', input.side_project_id);

  if (countError) {
    throw new Error(`Failed to count tasks: ${countError.message}`);
  }

  if (count !== null && count >= MAX_SIDE_PROJECT_TASKS) {
    throw new Error(
      `Cannot create task. Side project already has the maximum of ${MAX_SIDE_PROJECT_TASKS} tasks.`
    );
  }

  const { data, error } = await supabase
    .from('side_project_tasks')
    .insert({
      side_project_id: input.side_project_id,
      title: input.title,
      is_completed: false,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create side project task: ${error.message}`);
  }

  return data;
}

export async function getSideProjectTasks(
  sideProjectId: string
): Promise<SideProjectTask[]> {
  const { data, error } = await supabase
    .from('side_project_tasks')
    .select('*')
    .eq('side_project_id', sideProjectId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch side project tasks: ${error.message}`);
  }

  return data || [];
}

export async function updateSideProjectTask(
  taskId: string,
  updates: UpdateSideProjectTaskInput
): Promise<SideProjectTask> {
  const { data, error } = await supabase
    .from('side_project_tasks')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update side project task: ${error.message}`);
  }

  return data;
}

export async function deleteSideProjectTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('side_project_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    throw new Error(`Failed to delete side project task: ${error.message}`);
  }
}

export async function createOffshootIdea(
  input: CreateOffshootIdeaInput
): Promise<OffshootIdea> {
  console.warn('DEPRECATED: createOffshootIdea() uses legacy offshoot_ideas table. Use createTrack() with category="offshoot_idea" instead.');
  const { data, error } = await supabase
    .from('offshoot_ideas')
    .insert({
      master_project_id: input.master_project_id,
      title: input.title,
      description: input.description || null,
      idea_type: input.idea_type || 'idea_only',
      origin_task_id: input.origin_task_id || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create offshoot idea: ${error.message}`);
  }

  return data;
}

export async function getOffshootIdeas(
  masterProjectId: string
): Promise<OffshootIdea[]> {
  console.warn('DEPRECATED: getOffshootIdeas() uses legacy offshoot_ideas table. Use getTracksByCategory(projectId, "offshoot_idea") instead.');
  const { data, error } = await supabase
    .from('offshoot_ideas')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch offshoot ideas: ${error.message}`);
  }

  return data || [];
}

export async function updateOffshootIdea(
  ideaId: string,
  updates: { title?: string; description?: string | null }
): Promise<OffshootIdea> {
  const { data, error } = await supabase
    .from('offshoot_ideas')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ideaId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update offshoot idea: ${error.message}`);
  }

  return data;
}

export async function deleteOffshootIdea(ideaId: string): Promise<void> {
  const { error } = await supabase
    .from('offshoot_ideas')
    .delete()
    .eq('id', ideaId);

  if (error) {
    throw new Error(`Failed to delete offshoot idea: ${error.message}`);
  }
}

export async function promoteOffshootToSideProject(
  offshootId: string
): Promise<SideProject> {
  const { data: offshoot, error: fetchError } = await supabase
    .from('offshoot_ideas')
    .select('*')
    .eq('id', offshootId)
    .single();

  if (fetchError || !offshoot) {
    throw new Error(`Failed to fetch offshoot idea: ${fetchError?.message || 'Not found'}`);
  }

  const newSideProject = await createSideProject({
    master_project_id: offshoot.master_project_id,
    name: offshoot.title,
    description: offshoot.description || undefined,
  });

  const { error: deleteError } = await supabase
    .from('offshoot_ideas')
    .delete()
    .eq('id', offshootId);

  if (deleteError) {
    throw new Error(`Failed to delete offshoot idea after promotion: ${deleteError.message}`);
  }

  return newSideProject;
}

export function performScopeCheck(offshoot: OffshootIdea): ScopeCheckResult {
  const text = `${offshoot.title} ${offshoot.description || ''}`.toLowerCase();

  const sideProjectKeywords = [
    'new feature',
    'new section',
    'branch',
    'expansion',
    'separate',
    'independent',
    'standalone',
    'different',
    'alternative',
    'explore',
  ];

  for (const keyword of sideProjectKeywords) {
    if (text.includes(keyword)) {
      return 'side_project';
    }
  }

  return 'parking_lot';
}

export async function createRoadmapSection(
  input: CreateRoadmapSectionInput
): Promise<RoadmapSection> {
  const { data, error } = await supabase
    .from('roadmap_sections')
    .insert({
      master_project_id: input.master_project_id,
      title: input.title,
      order_index: input.order_index ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create roadmap section: ${error.message}`);
  }

  return data;
}

export async function getRoadmapSections(
  masterProjectId: string
): Promise<RoadmapSection[]> {
  const { data, error } = await supabase
    .from('roadmap_sections')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .order('order_index', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch roadmap sections: ${error.message}`);
  }

  return data || [];
}

export async function updateRoadmapSection(
  sectionId: string,
  updates: UpdateRoadmapSectionInput
): Promise<RoadmapSection> {
  const { data, error } = await supabase
    .from('roadmap_sections')
    .update(updates)
    .eq('id', sectionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update roadmap section: ${error.message}`);
  }

  return data;
}

export async function deleteRoadmapSection(sectionId: string): Promise<void> {
  const { error } = await supabase
    .from('roadmap_sections')
    .delete()
    .eq('id', sectionId);

  if (error) {
    throw new Error(`Failed to delete roadmap section: ${error.message}`);
  }
}

export async function createRoadmapItem(
  input: CreateRoadmapItemInput
): Promise<RoadmapItem> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .insert({
      section_id: input.section_id,
      title: input.title,
      description: input.description || null,
      start_date: input.start_date,
      end_date: input.end_date,
      status: input.status || 'not_started',
      color: input.color || null,
      order_index: input.order_index ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create roadmap item: ${error.message}`);
  }

  return data;
}

export async function updateRoadmapItem(
  itemId: string,
  updates: UpdateRoadmapItemInput
): Promise<RoadmapItem> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update roadmap item: ${error.message}`);
  }

  return data;
}

export async function deleteRoadmapItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('roadmap_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    throw new Error(`Failed to delete roadmap item: ${error.message}`);
  }
}

export async function getRoadmapItemsBySection(
  sectionId: string
): Promise<RoadmapItem[]> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('section_id', sectionId)
    .order('order_index', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch roadmap items: ${error.message}`);
  }

  return data || [];
}

export async function createRoadmapLink(
  input: CreateRoadmapLinkInput
): Promise<RoadmapLink> {
  const { data, error } = await supabase
    .from('roadmap_links')
    .insert({
      source_item_id: input.source_item_id,
      target_item_id: input.target_item_id,
      link_type: input.link_type,
      description: input.description || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create roadmap link: ${error.message}`);
  }

  return data;
}

export async function deleteRoadmapLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('roadmap_links')
    .delete()
    .eq('id', linkId);

  if (error) {
    throw new Error(`Failed to delete roadmap link: ${error.message}`);
  }
}

export async function getLinksForItem(itemId: string): Promise<RoadmapLink[]> {
  const { data, error } = await supabase
    .from('roadmap_links')
    .select('*')
    .or(`source_item_id.eq.${itemId},target_item_id.eq.${itemId}`);

  if (error) {
    throw new Error(`Failed to fetch roadmap links: ${error.message}`);
  }

  return data || [];
}

export async function getRoadmapLinks(
  masterProjectId: string
): Promise<RoadmapLink[]> {
  const { data, error } = await supabase
    .from('roadmap_links')
    .select(`
      *,
      source:roadmap_items!source_item_id(section_id),
      target:roadmap_items!target_item_id(section_id)
    `)
    .or(`source.section_id.in.(select id from roadmap_sections where master_project_id = ${masterProjectId}),target.section_id.in.(select id from roadmap_sections where master_project_id = ${masterProjectId})`);

  if (error) {
    const { data: sections, error: sectionsError } = await supabase
      .from('roadmap_sections')
      .select('id')
      .eq('master_project_id', masterProjectId);

    if (sectionsError) {
      throw new Error(`Failed to fetch roadmap sections: ${sectionsError.message}`);
    }

    const sectionIds = sections?.map(s => s.id) || [];

    const { data: items, error: itemsError } = await supabase
      .from('roadmap_items')
      .select('id')
      .in('section_id', sectionIds);

    if (itemsError) {
      throw new Error(`Failed to fetch roadmap items: ${itemsError.message}`);
    }

    const itemIds = items?.map(i => i.id) || [];

    if (itemIds.length === 0) {
      return [];
    }

    const { data: links, error: linksError } = await supabase
      .from('roadmap_links')
      .select('*')
      .or(`source_item_id.in.(${itemIds.join(',')}),target_item_id.in.(${itemIds.join(',')})`);

    if (linksError) {
      throw new Error(`Failed to fetch roadmap links: ${linksError.message}`);
    }

    return links || [];
  }

  return data || [];
}

export async function createSideIdea(
  input: CreateSideIdeaInput
): Promise<SideIdea> {
  const { data, error } = await supabase
    .from('side_ideas')
    .insert({
      master_project_id: input.master_project_id,
      title: input.title,
      description: input.description || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create side idea: ${error.message}`);
  }

  return data;
}

export async function promoteSideIdea(
  ideaId: string,
  sectionId: string,
  startDate: string,
  endDate: string
): Promise<RoadmapItem> {
  const { data: idea, error: fetchError } = await supabase
    .from('side_ideas')
    .select('*')
    .eq('id', ideaId)
    .single();

  if (fetchError || !idea) {
    throw new Error(`Failed to fetch side idea: ${fetchError?.message || 'Not found'}`);
  }

  const newRoadmapItem = await createRoadmapItem({
    section_id: sectionId,
    title: idea.title,
    description: idea.description || undefined,
    start_date: startDate,
    end_date: endDate,
  });

  const { error: updateError } = await supabase
    .from('side_ideas')
    .update({
      is_promoted: true,
      promoted_item_id: newRoadmapItem.id,
    })
    .eq('id', ideaId);

  if (updateError) {
    throw new Error(`Failed to update side idea after promotion: ${updateError.message}`);
  }

  return newRoadmapItem;
}

export async function getSideIdeas(
  masterProjectId: string
): Promise<SideIdea[]> {
  const { data, error } = await supabase
    .from('side_ideas')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch side ideas: ${error.message}`);
  }

  return data || [];
}

export async function getRealityCheckReport(masterProjectId: string): Promise<ProjectFeasibility> {
  const {
    getUserSkills,
    getProjectRequiredSkills,
    getUserTools,
    getProjectRequiredTools,
    computeSkillCoverage,
    computeToolCoverage,
    computeTimeFeasibility,
    computeRiskAnalysis,
    computeProjectFeasibility,
  } = await import('./guardrails/realityCheck');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const [userSkills, projectSkills, userTools, projectTools] = await Promise.all([
    getUserSkills(user.id),
    getProjectRequiredSkills(masterProjectId),
    getUserTools(user.id),
    getProjectRequiredTools(masterProjectId),
  ]);

  const sections = await getRoadmapSections(masterProjectId);
  const itemsArrays = await Promise.all(
    sections.map(section => getRoadmapItemsBySection(section.id))
  );
  const items = itemsArrays.flat();

  const skillCoverage = computeSkillCoverage(userSkills, projectSkills);
  const toolCoverage = computeToolCoverage(userTools, projectTools);
  const timeFeasibility = computeTimeFeasibility(items);
  const riskAnalysis = computeRiskAnalysis(items, skillCoverage, toolCoverage);

  const feasibility = computeProjectFeasibility(
    user.id,
    skillCoverage,
    toolCoverage,
    timeFeasibility,
    riskAnalysis
  );

  return feasibility;
}

export async function reorderDomains(orderedDomainIds: string[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const updates = orderedDomainIds.map((domainId, index) =>
    supabase
      .from('domains')
      .update({ display_order: index + 1 })
      .eq('id', domainId)
      .eq('user_id', user.id)
  );

  await Promise.all(updates);
}

export { createProjectWithWizard, addTracksToProject, getWizardTemplatePreview } from './guardrails/wizard';
export type { CreateProjectWizardInput, ProjectWizardResult } from './guardrails/wizardTypes';

export { getTracksByCategory, getTracksByCategoryWithStats } from './guardrails/trackService';
export type { Track, TrackCategory } from './guardrails/coreTypes';

/**
 * Save wizard intent snapshot to a project in Supabase
 * This allows users to retrieve their wizard summary even if they exit the wizard
 */
export async function saveWizardIntentSnapshot(
  projectId: string,
  snapshot: {
    domain: string | null;
    projectType: string | null;
    projectName: string;
    idea: {
      description: string;
      startingPoint: string;
      expectations: string;
    };
    goals: string[];
    clarifySignals: {
      timeExpectation: string | null;
      weeklyCommitment: string | null;
      experienceLevel: string | null;
      dependencyLevel: string | null;
      resourceAssumption: string | null;
      scopeClarity: string | null;
      contextNotes?: Record<string, string>;
    };
  }
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('master_projects')
    .update({ wizard_intent_snapshot: snapshot as any })
    .eq('id', projectId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to save wizard intent snapshot:', error);
    throw new Error(`Failed to save wizard intent snapshot: ${error.message}`);
  }
}

/**
 * Load wizard intent snapshot from a project in Supabase
 */
export async function getWizardIntentSnapshot(
  projectId: string
): Promise<{
  domain: string | null;
  projectType: string | null;
  projectName: string;
  idea: {
    description: string;
    startingPoint: string;
    expectations: string;
  };
  goals: string[];
  clarifySignals: {
    timeExpectation: string | null;
    weeklyCommitment: string | null;
    experienceLevel: string | null;
    dependencyLevel: string | null;
    resourceAssumption: string | null;
    scopeClarity: string | null;
    contextNotes?: Record<string, string>;
  };
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('master_projects')
    .select('wizard_intent_snapshot')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load wizard intent snapshot:', error);
    return null;
  }

  return data?.wizard_intent_snapshot || null;
}
