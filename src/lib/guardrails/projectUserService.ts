import { supabase } from '../supabase';
import type {
  ProjectUser,
  ProjectUserRole,
  CreateProjectUserInput,
  UpdateProjectUserInput,
  UserWithProjects,
  ProjectWithUsers,
  UserProjectPermission,
  PermissionCheckResult,
  ValidationError,
} from './coreTypes';
import { PROJECT_USER_ROLE_CAPABILITIES } from './coreTypes';

const TABLE_NAME = 'project_users';

function transformKeysFromDb(row: any): ProjectUser {
  return {
    id: row.id,
    userId: row.user_id,
    masterProjectId: row.master_project_id,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function transformKeysToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

export async function addUserToProject(
  input: CreateProjectUserInput
): Promise<ProjectUser> {
  const existing = await getProjectUser(input.userId, input.masterProjectId);
  if (existing && !existing.archivedAt) {
    throw new Error('User is already a member of this project');
  }

  if (existing && existing.archivedAt) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ archived_at: null, role: input.role })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return transformKeysFromDb(data);
  }

  const dbInput = transformKeysToSnake(input);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(dbInput)
    .select()
    .single();

  if (error) throw error;

  return transformKeysFromDb(data);
}

export async function removeUserFromProject(
  userId: string,
  masterProjectId: string
): Promise<ProjectUser> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ archived_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('master_project_id', masterProjectId)
    .is('archived_at', null)
    .select()
    .single();

  if (error) throw error;

  return transformKeysFromDb(data);
}

export async function permanentlyRemoveUserFromProject(
  userId: string,
  masterProjectId: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('user_id', userId)
    .eq('master_project_id', masterProjectId);

  if (error) throw error;
}

export async function updateUserRole(
  userId: string,
  masterProjectId: string,
  input: UpdateProjectUserInput
): Promise<ProjectUser> {
  const dbInput = transformKeysToSnake(input);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(dbInput)
    .eq('user_id', userId)
    .eq('master_project_id', masterProjectId)
    .is('archived_at', null)
    .select()
    .single();

  if (error) throw error;

  return transformKeysFromDb(data);
}

export async function getProjectUsers(
  masterProjectId: string,
  includeArchived: boolean = false
): Promise<ProjectUser[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId);

  if (!includeArchived) {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) throw error;

  return data.map(transformKeysFromDb);
}

export async function getUserProjects(
  userId: string,
  includeArchived: boolean = false
): Promise<ProjectUser[]> {
  let query = supabase.from(TABLE_NAME).select('*').eq('user_id', userId);

  if (!includeArchived) {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(transformKeysFromDb);
}

export async function getProjectUser(
  userId: string,
  masterProjectId: string
): Promise<ProjectUser | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .eq('master_project_id', masterProjectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return transformKeysFromDb(data);
}

export async function getUserProjectRole(
  userId: string,
  masterProjectId: string
): Promise<ProjectUserRole | null> {
  const projectUser = await getProjectUser(userId, masterProjectId);

  if (!projectUser || projectUser.archivedAt) {
    return null;
  }

  return projectUser.role;
}

export async function hasProjectPermission(
  userId: string,
  masterProjectId: string,
  requiredRole: ProjectUserRole
): Promise<boolean> {
  const userRole = await getUserProjectRole(userId, masterProjectId);

  if (!userRole) return false;

  if (userRole === 'owner') return true;

  if (userRole === 'editor' && requiredRole !== 'owner') return true;

  if (userRole === 'viewer' && requiredRole === 'viewer') return true;

  return false;
}

export async function checkProjectPermission(
  userId: string,
  masterProjectId: string,
  requiredRole: ProjectUserRole
): Promise<PermissionCheckResult> {
  const userRole = await getUserProjectRole(userId, masterProjectId);

  if (!userRole) {
    return {
      allowed: false,
      reason: 'User is not a member of this project',
    };
  }

  const hasPermission = await hasProjectPermission(
    userId,
    masterProjectId,
    requiredRole
  );

  if (!hasPermission) {
    return {
      allowed: false,
      reason: `User role '${userRole}' does not have '${requiredRole}' permission`,
      role: userRole,
    };
  }

  return {
    allowed: true,
    role: userRole,
  };
}

export async function getUserProjectPermissions(
  userId: string,
  masterProjectId: string
): Promise<UserProjectPermission | null> {
  const userRole = await getUserProjectRole(userId, masterProjectId);

  if (!userRole) return null;

  const capabilities = PROJECT_USER_ROLE_CAPABILITIES[userRole];

  return {
    userId,
    projectId: masterProjectId,
    canView: capabilities.canView,
    canEdit: capabilities.canEdit,
    canManageUsers: capabilities.canManageUsers,
    role: userRole,
  };
}

export async function canUserViewProject(
  userId: string,
  masterProjectId: string
): Promise<boolean> {
  return hasProjectPermission(userId, masterProjectId, 'viewer');
}

export async function canUserEditProject(
  userId: string,
  masterProjectId: string
): Promise<boolean> {
  return hasProjectPermission(userId, masterProjectId, 'editor');
}

export async function canUserManageProjectUsers(
  userId: string,
  masterProjectId: string
): Promise<boolean> {
  return hasProjectPermission(userId, masterProjectId, 'owner');
}

export async function isProjectOwner(
  userId: string,
  masterProjectId: string
): Promise<boolean> {
  const userRole = await getUserProjectRole(userId, masterProjectId);
  return userRole === 'owner';
}

export async function getUserWithProjects(userId: string): Promise<UserWithProjects> {
  const projects = await getUserProjects(userId, false);

  return {
    userId,
    projects: projects.map((p) => ({
      projectId: p.masterProjectId,
      role: p.role,
      createdAt: p.createdAt,
    })),
  };
}

export async function getProjectWithUsers(
  masterProjectId: string
): Promise<ProjectWithUsers> {
  const users = await getProjectUsers(masterProjectId, false);

  return {
    projectId: masterProjectId,
    users: users.map((u) => ({
      userId: u.userId,
      role: u.role,
      createdAt: u.createdAt,
    })),
  };
}

export async function countProjectMembers(masterProjectId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact', head: true })
    .eq('master_project_id', masterProjectId)
    .is('archived_at', null);

  if (error) throw error;

  return count || 0;
}

export async function countUserProjects(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('archived_at', null);

  if (error) throw error;

  return count || 0;
}

export interface ProjectUserStats {
  totalMembers: number;
  owners: number;
  editors: number;
  viewers: number;
  archivedMembers: number;
}

export async function getProjectUserStats(
  masterProjectId: string
): Promise<ProjectUserStats> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId);

  if (error) throw error;

  const stats: ProjectUserStats = {
    totalMembers: 0,
    owners: 0,
    editors: 0,
    viewers: 0,
    archivedMembers: 0,
  };

  data.forEach((row) => {
    if (row.archived_at) {
      stats.archivedMembers++;
    } else {
      stats.totalMembers++;
      if (row.role === 'owner') stats.owners++;
      else if (row.role === 'editor') stats.editors++;
      else if (row.role === 'viewer') stats.viewers++;
    }
  });

  return stats;
}

export async function transferProjectOwnership(
  currentOwnerId: string,
  newOwnerId: string,
  masterProjectId: string
): Promise<{ oldOwner: ProjectUser; newOwner: ProjectUser }> {
  const isOwner = await isProjectOwner(currentOwnerId, masterProjectId);
  if (!isOwner) {
    throw new Error('Current user is not the project owner');
  }

  const newOwnerMember = await getProjectUser(newOwnerId, masterProjectId);
  if (!newOwnerMember || newOwnerMember.archivedAt) {
    throw new Error('New owner must be an active member of the project');
  }

  const oldOwner = await updateUserRole(currentOwnerId, masterProjectId, {
    role: 'editor',
  });

  const newOwner = await updateUserRole(newOwnerId, masterProjectId, {
    role: 'owner',
  });

  return { oldOwner, newOwner };
}

export async function linkUserToGlobalPerson(
  userId: string,
  globalPersonId: string
): Promise<void> {
  const { error } = await supabase
    .from('global_people')
    .update({ linked_user_id: userId })
    .eq('id', globalPersonId);

  if (error) throw error;
}

export async function unlinkUserFromGlobalPerson(globalPersonId: string): Promise<void> {
  const { error } = await supabase
    .from('global_people')
    .update({ linked_user_id: null })
    .eq('id', globalPersonId);

  if (error) throw error;
}

export async function getGlobalPersonForUser(
  userId: string
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('global_people')
    .select('id, name')
    .eq('linked_user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return data;
}

export async function getUserForGlobalPerson(
  globalPersonId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('global_people')
    .select('linked_user_id')
    .eq('id', globalPersonId)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.linked_user_id) return null;

  return data.linked_user_id;
}

export function assertCanEdit(permissionCheck: PermissionCheckResult): void {
  if (!permissionCheck.allowed) {
    throw new Error(`Permission denied: ${permissionCheck.reason}`);
  }
}

export function assertCanView(permissionCheck: PermissionCheckResult): void {
  if (!permissionCheck.allowed) {
    throw new Error(`Permission denied: ${permissionCheck.reason}`);
  }
}

export function assertCanManageUsers(permissionCheck: PermissionCheckResult): void {
  if (!permissionCheck.allowed) {
    throw new Error(`Permission denied: ${permissionCheck.reason}`);
  }
}

export interface ServicePermissionContext {
  userId: string;
  masterProjectId: string;
}

export async function withPermissionCheck<T>(
  context: ServicePermissionContext,
  requiredRole: ProjectUserRole,
  operation: () => Promise<T>
): Promise<T> {
  const permissionCheck = await checkProjectPermission(
    context.userId,
    context.masterProjectId,
    requiredRole
  );

  if (!permissionCheck.allowed) {
    throw new Error(`Permission denied: ${permissionCheck.reason}`);
  }

  return operation();
}
