/**
 * Guardrails Project Share Adapter
 * 
 * Adapter for sharing Guardrails projects via the universal SharingDrawer.
 * Maps project_users roles to canonical permission roles.
 */

import { supabase } from '../../supabase';
import type { ShareAdapter } from '../adapter';
import type {
  PermissionFlags,
  PermissionGrantWithDisplay,
  PermissionSubjectType,
  PermissionRole,
  ShareScope,
} from '../types';
import { roleToFlags, flagsToRoleApprox } from '../types';
import {
  getProjectUsers,
  addUserToProject,
  updateUserRole,
  removeUserFromProject,
  getUserProjectPermissions,
} from '../../guardrails/projectUserService';
import { supabase } from '../../supabase';
import type { ProjectUserRole } from '../../guardrails/coreTypes';

export class GuardrailsProjectAdapter implements ShareAdapter {
  entityType = 'project';
  entityId: string;

  constructor(projectId: string) {
    this.entityId = projectId;
  }

  async getEntityTitle(): Promise<string> {
    const { data: project } = await supabase
      .from('master_projects')
      .select('name')
      .eq('id', this.entityId)
      .single();
    
    return project?.name || 'Project';
  }

  async listGrants(): Promise<PermissionGrantWithDisplay[]> {
    const projectUsers = await getProjectUsers(this.entityId, false);
    
    const grants: PermissionGrantWithDisplay[] = [];

    for (const projectUser of projectUsers) {
      // Get user profile for display
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', projectUser.userId)
        .single();

      // Map project role to canonical role
      const canonicalRole = this.mapProjectRoleToCanonical(projectUser.role);
      const flags = roleToFlags(canonicalRole, {
        detail_level: 'detailed',  // Projects always show full detail
        scope: 'include_children',  // Projects include tracks/items by default
      });

      grants.push({
        id: projectUser.id,
        entity_type: this.entityType,
        entity_id: this.entityId,
        subject_type: 'user',
        subject_id: projectUser.userId,
        flags: {
          ...flags,
          can_manage: projectUser.role === 'owner',  // Only owners can manage
        },
        granted_by: projectUser.userId,  // TODO: Track actual grantor
        granted_at: projectUser.createdAt,
        updated_at: projectUser.updatedAt,
        display_name: profile?.full_name || profile?.email || 'User',
        avatar_url: profile?.avatar_url || undefined,
        email: profile?.email || undefined,
      });
    }

    return grants;
  }

  async upsertGrant(input: {
    subject_type: PermissionSubjectType;
    subject_id: string;
    flags: PermissionFlags;
  }): Promise<void> {
    // Only support user grants for now
    if (input.subject_type !== 'user') {
      throw new Error('Only user grants are supported for projects');
    }

    // Map canonical role to project role
    const projectRole = this.mapCanonicalRoleToProject(flagsToRoleApprox(input.flags));

    // Check if user already has access
    const existing = await getUserProjectPermissions(input.subject_id, this.entityId);

    if (existing) {
      // Update role
      await updateUserRole(input.subject_id, this.entityId, { role: projectRole });
    } else {
      // Add user
      await addUserToProject({
        userId: input.subject_id,
        masterProjectId: this.entityId,
        role: projectRole,
      });
    }
  }

  async revokeGrant(
    subject_type: PermissionSubjectType,
    subject_id: string
  ): Promise<void> {
    // Only support user grants for now
    if (subject_type !== 'user') {
      throw new Error('Only user grants are supported for projects');
    }

    await removeUserFromProject(subject_id, this.entityId);
  }

  async previewScopeImpact(scope: ShareScope): Promise<{
    affected_count: number;
    sample: string[];
  } | null> {
    if (scope === 'this_only') {
      return { affected_count: 0, sample: [] };
    }

    // Count tracks and roadmap items
    const [tracksResult, itemsResult] = await Promise.all([
      supabase
        .from('tracks')
        .select('id, title')
        .eq('master_project_id', this.entityId)
        .limit(10),
      supabase
        .from('roadmap_items')
        .select('id, title')
        .eq('master_project_id', this.entityId)
        .limit(10),
    ]);

    const tracks = tracksResult.data || [];
    const items = itemsResult.data || [];
    const totalCount = (tracksResult.count || 0) + (itemsResult.count || 0);
    const sample = [
      ...tracks.slice(0, 5).map(t => t.title),
      ...items.slice(0, 5).map(i => i.title),
    ].slice(0, 10);

    return {
      affected_count: totalCount,
      sample,
    };
  }

  async canManagePermissions(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const permission = await getUserProjectPermissions(user.id, this.entityId);
    return permission?.canManageUsers || false;
  }

  /**
   * Map Guardrails project role to canonical permission role
   */
  private mapProjectRoleToCanonical(role: ProjectUserRole): PermissionRole {
    switch (role) {
      case 'owner':
        return 'owner';
      case 'editor':
        return 'editor';
      case 'viewer':
        return 'viewer';
      default:
        return 'viewer';
    }
  }

  /**
   * Map canonical permission role to Guardrails project role
   */
  private mapCanonicalRoleToProject(role: PermissionRole): ProjectUserRole {
    switch (role) {
      case 'owner':
        return 'owner';
      case 'editor':
        return 'editor';
      case 'commenter':
        return 'viewer';  // Projects don't have commenter, map to viewer
      case 'viewer':
        return 'viewer';
      default:
        return 'viewer';
    }
  }
}

