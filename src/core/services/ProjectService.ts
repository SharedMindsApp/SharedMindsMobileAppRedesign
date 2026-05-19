import { supabase } from '../../lib/supabase';

export interface Project {
    id: string;
    space_id: string;
    created_by: string;
    title: string;
    description: string | null;
    status: 'active' | 'paused' | 'completed' | 'archived';
    phase: string | null;
    color: string | null;
    icon: string | null;
    is_private: boolean;
    starts_on: string | null;
    target_date: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectMember {
    id: string;
    project_id: string;
    user_id: string;
    role: 'owner' | 'collaborator' | 'viewer';
    created_at: string;
}

export interface ProjectMemberWithProfile extends ProjectMember {
    display_name: string;
    avatar_url: string | null;
}

export interface ProjectInvite {
    id: string;
    project_id: string;
    invited_by: string;
    invite_token: string;
    invited_email: string | null;
    role: 'collaborator' | 'viewer';
    accepted_by: string | null;
    accepted_at: string | null;
    expires_at: string;
    created_at: string;
}

function generateInviteToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export const ProjectService = {
    /**
     * Returns projects in a single space (the user's personal space).
     * Excludes archived. Used during initial bootstrap before membership-fetch.
     */
    async getProjectsBySpace(spaceId: string): Promise<Project[]> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('space_id', spaceId)
            .neq('status', 'archived')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ProjectService] Failed to fetch projects by space:', error);
            throw error;
        }
        return (data || []) as Project[];
    },

    /**
     * Returns ALL projects visible to the current user — own personal space
     * projects + projects they've been invited to via project_members.
     *
     * This is the right fetch for the projects list page, because shared
     * projects live in another user's space and wouldn't show up under a
     * simple space scoping.
     */
    async getProjectsForUser(): Promise<Project[]> {
        // RLS handles the visibility filter; we just fetch everything we can see.
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .neq('status', 'archived')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('[ProjectService] Failed to fetch projects for user:', error);
            throw error;
        }
        return (data || []) as Project[];
    },

    async getProjectById(projectId: string): Promise<Project | null> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .maybeSingle();

        if (error) {
            console.error('[ProjectService] Failed to fetch project:', error);
            throw error;
        }
        return (data ?? null) as Project | null;
    },

    async createProject(projectData: Partial<Project>): Promise<Project> {
        const { data, error } = await supabase
            .from('projects')
            .insert(projectData)
            .select()
            .single();

        if (error) {
            console.error('[ProjectService] Failed to create project:', error);
            throw error;
        }

        // The creator is automatically the owner. The v1 schema doesn't insert
        // an owner project_members row, so we do it here so shared-project
        // RLS works consistently (collaborators check project_members for role).
        const created = data as Project;
        const { error: memberError } = await supabase
            .from('project_members')
            .insert({
                project_id: created.id,
                user_id: created.created_by,
                role: 'owner',
            });

        if (memberError && memberError.code !== '23505') {
            // 23505 = unique violation, fine if a trigger already inserted it
            console.warn('[ProjectService] Owner membership insert failed (non-fatal):', memberError);
        }

        return created;
    },

    async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .select()
            .single();

        if (error) {
            console.error('[ProjectService] Failed to update project:', error);
            throw error;
        }
        return data as Project;
    },

    async archiveProject(projectId: string): Promise<void> {
        await this.updateProject(projectId, { status: 'archived', completed_at: new Date().toISOString() });
    },

    // ── Members ───────────────────────────────────────────────────────

    async getProjectMembers(projectId: string): Promise<ProjectMemberWithProfile[]> {
        const { data, error } = await supabase
            .from('project_members')
            .select('*, profiles(display_name, avatar_url)')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[ProjectService] Failed to fetch members:', error);
            throw error;
        }
        return (data ?? []).map((row: any) => ({
            ...row,
            display_name: row.profiles?.display_name ?? 'Someone',
            avatar_url: row.profiles?.avatar_url ?? null,
        })) as ProjectMemberWithProfile[];
    },

    /**
     * Add a connection (already-known user) directly as a collaborator.
     * Skips the email round-trip — used when the inviter clicked a known
     * connection from their list.
     */
    async addConnectionAsMember(input: {
        projectId: string;
        userId: string;
        role?: 'collaborator' | 'viewer';
    }): Promise<void> {
        const { error } = await supabase
            .from('project_members')
            .insert({
                project_id: input.projectId,
                user_id: input.userId,
                role: input.role ?? 'collaborator',
            });

        if (error && error.code !== '23505') {
            console.error('[ProjectService] addConnectionAsMember failed:', error);
            throw error;
        }
    },

    async removeMember(projectId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('project_members')
            .delete()
            .eq('project_id', projectId)
            .eq('user_id', userId);

        if (error) {
            console.error('[ProjectService] removeMember failed:', error);
            throw error;
        }
    },

    // ── Invites ───────────────────────────────────────────────────────

    /**
     * Generate an email-link invite. Returns the full invite row so the
     * caller can build a /invite/:token URL to share.
     */
    async createInvite(input: {
        projectId: string;
        email?: string;
        role?: 'collaborator' | 'viewer';
    }): Promise<ProjectInvite> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('project_invites')
            .insert({
                project_id: input.projectId,
                invited_by: user.id,
                invite_token: generateInviteToken(),
                invited_email: input.email ?? null,
                role: input.role ?? 'collaborator',
            })
            .select()
            .single();

        if (error) {
            console.error('[ProjectService] createInvite failed:', error);
            throw error;
        }
        return data as ProjectInvite;
    },

    /**
     * Resolve an invite token to its project (without accepting).
     * Used by the accept page to preview the project before the user opts in.
     */
    async getInviteByToken(token: string): Promise<{
        invite: ProjectInvite;
        project: Project;
    } | null> {
        const { data, error } = await supabase
            .from('project_invites')
            .select('*, projects(*)')
            .eq('invite_token', token)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (error || !data) return null;
        const { projects, ...invite } = data as any;
        return {
            invite: invite as ProjectInvite,
            project: projects as Project,
        };
    },

    /**
     * Calls the accept_project_invite SECURITY DEFINER RPC.
     * Returns the project id on success; throws on invalid/expired token.
     */
    async acceptInvite(token: string): Promise<string> {
        const { data, error } = await supabase.rpc('accept_project_invite', { token });
        if (error) {
            console.error('[ProjectService] acceptInvite failed:', error);
            throw error;
        }
        return data as string;
    },
};
