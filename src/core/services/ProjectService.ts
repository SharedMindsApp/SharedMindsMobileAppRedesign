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
    /** Public URL of the project cover image. NULL = use the color gradient. */
    cover_image_url: string | null;
    /** Focal point of the cover image (0-100, percent). Default centred. */
    cover_x: number;
    cover_y: number;
    /** Zoom multiplier × 100. Range 50–300. 100 = cover/contain baseline. */
    cover_zoom: number;
    /** 'cover' = crop to fill the frame. 'contain' = fit whole image,
     *  bands painted with cover_bg_color. */
    cover_fit: 'cover' | 'contain';
    /** Hex colour painted behind the image when the fit leaves bands.
     *  Null = no background (gradient/surface tone shows through). */
    cover_bg_color: string | null;
    /** Title/description colour on top of the cover. 'light' = white text
     *  + dark overlay, 'dark' = near-black text + light overlay. Default 'light'. */
    cover_text_color: 'light' | 'dark';
    /** The single pre-decided next step (free text). NULL = none set. */
    next_action: string | null;
    next_action_updated_at: string | null;
    /** Last meaningful activity — drives re-entry/idle copy + momentum sort. */
    last_activity_at: string | null;
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
        // PERF: the naïve version was `select * from projects where status
        // <> 'archived'` and let RLS filter. That forces Postgres to run the
        // per-row can_see_project() security-definer function across EVERY
        // project row in the table (all users' rows), which became multi-
        // second as the table grew. Instead we prune by indexed columns
        // FIRST so RLS only evaluates on the handful of rows we actually
        // fetch:
        //   • own projects   → created_by = me      (projects_created_by_idx)
        //   • shared projects → id IN (my memberships) (PK lookups)
        // Fast path: single SECURITY DEFINER RPC that does the own/shared/
        // space visibility decision in ONE indexed query, bypassing the slow
        // per-row RLS policy-function evaluation that was stalling under
        // cold-load pool pressure (a 1-row fetch was taking 11–16s). See
        // migration 20260528000008_get_my_projects_rpc.
        const { data, error } = await supabase.rpc('get_my_projects');
        if (!error) {
            return (data ?? []) as Project[];
        }

        // Graceful fallback: if the RPC isn't deployed yet (PGRST202 — not in
        // schema cache), fall back to the direct RLS-gated queries so the app
        // still works before the migration is applied. Once the migration is
        // live, the fast path above is used.
        if (error.code !== 'PGRST202') {
            console.error('[ProjectService] get_my_projects failed:', error);
        } else {
            console.warn('[ProjectService] get_my_projects RPC not found — apply migration 20260528000008 for the fast path. Falling back to direct query.');
        }

        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return [];

        const [ownRes, memRes] = await Promise.all([
            supabase.from('projects').select('*').eq('created_by', user.id).neq('status', 'archived'),
            supabase.from('project_members').select('project_id').eq('user_id', user.id),
        ]);
        if (ownRes.error) throw ownRes.error;

        const own = (ownRes.data ?? []) as Project[];
        const ownIds = new Set(own.map((p) => p.id));
        const sharedIds = (memRes.data ?? [])
            .map((m: { project_id: string }) => m.project_id)
            .filter((id) => !ownIds.has(id));

        let shared: Project[] = [];
        if (sharedIds.length > 0) {
            const { data: sd } = await supabase
                .from('projects').select('*').in('id', sharedIds).neq('status', 'archived');
            shared = (sd ?? []) as Project[];
        }
        return [...own, ...shared].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
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

    /**
     * Set (or replace) a project's single next action. Bumps both the
     * next-action timestamp and last_activity_at so the project counts as
     * "touched" and re-entry copy stays accurate. Pass null/empty to clear.
     */
    async setNextAction(projectId: string, text: string | null): Promise<Project> {
        const now = new Date().toISOString();
        const trimmed = text?.trim() || null;
        return this.updateProject(projectId, {
            next_action: trimmed,
            next_action_updated_at: trimmed ? now : null,
            last_activity_at: now,
        });
    },

    /**
     * Mark the current next action done: clears it and records activity.
     * Returns the updated project so the UI can immediately prompt
     * "what's the next tiny step?". The completed text is returned too so
     * callers can show a transient confirmation.
     */
    async completeNextAction(projectId: string): Promise<{ project: Project; completed: string | null }> {
        const current = await this.getProjectById(projectId);
        const completed = current?.next_action ?? null;
        const project = await this.updateProject(projectId, {
            next_action: null,
            next_action_updated_at: null,
            last_activity_at: new Date().toISOString(),
        });
        return { project, completed };
    },

    async archiveProject(projectId: string): Promise<void> {
        await this.updateProject(projectId, { status: 'archived', completed_at: new Date().toISOString() });
    },

    /**
     * Hard-delete a project. Cascades to milestones, phases, tasks, members,
     * notes, and any sessions pinned to it (where ON DELETE CASCADE or SET
     * NULL is configured). Irreversible — UI should confirm with the user
     * before calling.
     *
     * Uses .select('id') so an RLS denial (0 rows affected) throws instead
     * of silently faking success.
     */
    async deleteProject(projectId: string): Promise<void> {
        const { data, error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId)
            .select('id');
        if (error) {
            console.error('[ProjectService] Failed to delete project:', error);
            throw error;
        }
        if (!data || data.length === 0) {
            throw new Error('Project delete returned 0 rows — likely an RLS denial (only owners can delete).');
        }
    },

    /**
     * Upload a project cover image to the `project-covers` storage bucket
     * and persist its public URL to `projects.cover_image_url`. Storage
     * RLS gates writes to project owners only (see migration
     * 20260526000007_project_covers.sql).
     *
     * Path convention: <project_id>/<random>.<ext>
     * The first folder segment encoding the project_id is what the RLS
     * policy uses to confirm ownership.
     */
    async uploadProjectCover(projectId: string, file: File): Promise<string> {
        // Cheap client-side validation before incurring an upload.
        if (file.size > 4 * 1024 * 1024) {
            throw new Error('Cover image too large — keep under 4 MB.');
        }
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            throw new Error('Cover must be a JPEG, PNG, or WebP image.');
        }

        const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
        const filename = `${crypto.randomUUID()}.${ext}`;
        const path = `${projectId}/${filename}`;

        const { error: uploadErr } = await supabase.storage
            .from('project-covers')
            .upload(path, file, {
                cacheControl: '31536000', // 1 year — filename includes a UUID so updates land at a new URL anyway
                contentType: file.type,
                upsert: false,
            });
        if (uploadErr) {
            console.error('[ProjectService] cover upload failed:', uploadErr);
            throw uploadErr;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('project-covers')
            .getPublicUrl(path);

        await this.updateProject(projectId, { cover_image_url: publicUrl });
        return publicUrl;
    },

    /** Clear the cover image URL on the project. Doesn't delete the
     *  file from storage to keep the operation idempotent and cheap;
     *  orphan covers can be GC'd in a future maintenance pass. */
    async removeProjectCover(projectId: string): Promise<void> {
        await this.updateProject(projectId, { cover_image_url: null });
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

    // ── Goals (Roadmap tab) ───────────────────────────────────────────
    //
    // A goal is a phase / deliverable the project is chasing. Title +
    // optional target date + mark-complete. Single source of truth — there
    // is no separate "milestones" concept; goals do the same job.

    // ── Milestones ────────────────────────────────────────────────────
    //
    // Milestones are the major destinations within a project (e.g. Beta
    // launch, 100 paying users). Weight_pct sums to ~100 across a project.
    // Each milestone holds nested phases.

    async listMilestones(projectId: string): Promise<ProjectMilestone[]> {
        const { data, error } = await supabase
            .from('project_milestones')
            .select('*')
            .eq('project_id', projectId)
            .order('completed_at', { ascending: true, nullsFirst: true })
            .order('target_date', { ascending: true, nullsFirst: false })
            .order('sort_order', { ascending: true });
        if (error) { console.error('[ProjectService] listMilestones:', error); return []; }
        return (data ?? []) as ProjectMilestone[];
    },

    async createMilestone(input: {
        project_id: string;
        title: string;
        description?: string | null;
        target_date?: string | null;
        deadline_type?: 'flexible' | 'hard' | null;
        weight_pct?: number | null;
        sort_order?: number;
        completed_at?: string | null;
    }): Promise<ProjectMilestone> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data, error } = await supabase
            .from('project_milestones')
            .insert({
                project_id:    input.project_id,
                title:         input.title.trim(),
                description:   input.description?.trim() || null,
                target_date:   input.target_date || null,
                deadline_type: input.target_date ? (input.deadline_type ?? 'flexible') : null,
                weight_pct:    input.weight_pct ?? null,
                sort_order:    input.sort_order ?? 0,
                completed_at:  input.completed_at ?? null,
                created_by:    user.id,
            })
            .select()
            .single();
        if (error) throw error;
        return data as ProjectMilestone;
    },

    async updateMilestone(id: string, patch: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
        const { data, error } = await supabase
            .from('project_milestones')
            .update(patch)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as ProjectMilestone;
    },

    async deleteMilestone(id: string): Promise<void> {
        const { data, error } = await supabase
            .from('project_milestones')
            .delete()
            .eq('id', id)
            .select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error('Milestone delete returned 0 rows — likely an RLS denial.');
        }
    },

    async toggleMilestoneComplete(m: ProjectMilestone): Promise<ProjectMilestone> {
        return ProjectService.updateMilestone(m.id, {
            completed_at: m.completed_at ? null : new Date().toISOString(),
        });
    },

    // ── Phases ────────────────────────────────────────────────────────
    //
    // Phases are the work units between milestones. Each phase belongs
    // to a milestone (milestone_id can be null for "unassigned"). Phase
    // weights sum to ~100 within their milestone.

    async listPhases(projectId: string): Promise<ProjectPhase[]> {
        const { data, error } = await supabase
            .from('project_phases')
            .select('*')
            .eq('project_id', projectId)
            .order('milestone_id', { ascending: true, nullsFirst: false })
            .order('sort_order', { ascending: true });
        if (error) { console.error('[ProjectService] listPhases:', error); return []; }
        return (data ?? []) as ProjectPhase[];
    },

    async createPhase(input: {
        project_id: string;
        milestone_id?: string | null;
        title: string;
        description?: string | null;
        target_date?: string | null;
        deadline_type?: 'flexible' | 'hard' | null;
        weight_pct?: number | null;
        sort_order?: number;
        completed_at?: string | null;
    }): Promise<ProjectPhase> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data, error } = await supabase
            .from('project_phases')
            .insert({
                project_id:    input.project_id,
                milestone_id:  input.milestone_id ?? null,
                title:         input.title.trim(),
                description:   input.description?.trim() || null,
                target_date:   input.target_date || null,
                deadline_type: input.target_date ? (input.deadline_type ?? 'flexible') : null,
                weight_pct:    input.weight_pct ?? null,
                sort_order:    input.sort_order ?? 0,
                completed_at:  input.completed_at ?? null,
                created_by:    user.id,
            })
            .select()
            .single();
        if (error) throw error;
        return data as ProjectPhase;
    },

    async updatePhase(id: string, patch: Partial<ProjectPhase>): Promise<ProjectPhase> {
        const { data, error } = await supabase
            .from('project_phases')
            .update(patch)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as ProjectPhase;
    },

    async deletePhase(id: string): Promise<void> {
        const { data, error } = await supabase
            .from('project_phases')
            .delete()
            .eq('id', id)
            .select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error('Phase delete returned 0 rows — likely an RLS denial.');
        }
    },

    async togglePhaseComplete(p: ProjectPhase): Promise<ProjectPhase> {
        return ProjectService.updatePhase(p.id, {
            completed_at: p.completed_at ? null : new Date().toISOString(),
        });
    },

    // ── Notes (Notes tab) ─────────────────────────────────────────────

    async listNotes(projectId: string): Promise<ProjectNote[]> {
        const { data, error } = await supabase
            .from('project_notes')
            .select('*, author:profiles!author_id(display_name, avatar_url)')
            .eq('project_id', projectId)
            .order('updated_at', { ascending: false });
        if (error) { console.error('[ProjectService] listNotes:', error); return []; }
        return (data ?? []) as ProjectNote[];
    },

    async createNote(input: {
        project_id: string;
        title?: string | null;
        body: string;
    }): Promise<ProjectNote> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data, error } = await supabase
            .from('project_notes')
            .insert({
                project_id: input.project_id,
                author_id:  user.id,
                title:      input.title?.trim() || null,
                body:       input.body,
            })
            .select('*, author:profiles!author_id(display_name, avatar_url)')
            .single();
        if (error) throw error;
        return data as ProjectNote;
    },

    async updateNote(id: string, patch: { title?: string | null; body?: string }): Promise<ProjectNote> {
        const { data, error } = await supabase
            .from('project_notes')
            .update(patch)
            .eq('id', id)
            .select('*, author:profiles!author_id(display_name, avatar_url)')
            .single();
        if (error) throw error;
        return data as ProjectNote;
    },

    async deleteNote(id: string): Promise<void> {
        const { data, error } = await supabase
            .from('project_notes')
            .delete()
            .eq('id', id)
            .select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error('Note delete returned 0 rows — likely an RLS denial (only the author can delete).');
        }
    },

    // ── Project-level aggregate stats ─────────────────────────────────
    //
    // The Projects list page needs a true progress view that reflects the
    // whole project — milestones (goals), phases, and tasks — not just the
    // sliver of inbox/active tasks loaded into CoreDataContext (which
    // excludes done/dropped and so always shows 0% complete).
    //
    // Three lightweight queries, batched per page load. Aggregation is
    // done client-side because Supabase's grouped count API is awkward.

    async getProjectStats(projectIds: string[]): Promise<Map<string, ProjectStats>> {
        const out = new Map<string, ProjectStats>();
        if (projectIds.length === 0) return out;
        for (const id of projectIds) {
            out.set(id, { tasks: { total: 0, done: 0, open: 0 }, phases: { total: 0, done: 0 }, milestones: { total: 0, done: 0, weightDone: 0, weightTotal: 0 } });
        }

        const [tasksRes, phasesRes, milestonesRes] = await Promise.all([
            supabase.from('tasks').select('project_id,status').in('project_id', projectIds),
            supabase.from('project_phases').select('project_id,completed_at').in('project_id', projectIds),
            supabase.from('project_milestones').select('project_id,completed_at,weight_pct').in('project_id', projectIds),
        ]);

        for (const row of (tasksRes.data ?? []) as Array<{ project_id: string; status: string }>) {
            const entry = out.get(row.project_id);
            if (!entry) continue;
            entry.tasks.total += 1;
            if (row.status === 'done') entry.tasks.done += 1;
            else if (row.status !== 'dropped') entry.tasks.open += 1;
        }
        for (const row of (phasesRes.data ?? []) as Array<{ project_id: string; completed_at: string | null }>) {
            const entry = out.get(row.project_id);
            if (!entry) continue;
            entry.phases.total += 1;
            if (row.completed_at) entry.phases.done += 1;
        }
        for (const row of (milestonesRes.data ?? []) as Array<{ project_id: string; completed_at: string | null; weight_pct: number | null }>) {
            const entry = out.get(row.project_id);
            if (!entry) continue;
            entry.milestones.total += 1;
            const w = row.weight_pct ?? 0;
            entry.milestones.weightTotal += w;
            if (row.completed_at) {
                entry.milestones.done += 1;
                entry.milestones.weightDone += w;
            }
        }
        return out;
    },
};

/** Aggregate counts for a single project. The "progress" hierarchy is:
 *  milestones (weighted) → phases (equal-weight) → tasks (equal-weight),
 *  whichever bucket has rows. See deriveProjectProgress() in ProjectsPage. */
export interface ProjectStats {
    tasks:      { total: number; done: number; open: number };
    phases:     { total: number; done: number };
    milestones: { total: number; done: number; weightDone: number; weightTotal: number };
}

// ── Milestone + Phase + Note types ─────────────────────────────────────

/** Major destination within a project (e.g. "Beta launch", "100 paying
 *  users"). Weight contributes to overall project completion. Holds
 *  nested phases. */
export interface ProjectMilestone {
    id: string;
    project_id: string;
    title: string;
    description: string | null;
    target_date: string | null;
    /** 'flexible' = soft aim, 'hard' = firm date. Null when no target_date. */
    deadline_type: 'flexible' | 'hard' | null;
    /** % of the project this milestone represents. Sum across all
     *  milestones in a project should be ~100. */
    weight_pct: number | null;
    completed_at: string | null;
    sort_order: number;
    created_by: string;
    created_at: string;
    updated_at: string;
}

/** Work unit between milestones. Each phase belongs to a milestone (or
 *  null for "unassigned"). Weight contributes to the parent milestone's
 *  completion (sum ~100 within a milestone). */
export interface ProjectPhase {
    id: string;
    project_id: string;
    milestone_id: string | null;
    title: string;
    description: string | null;
    /** Optional deadline for this phase. Null = no date. */
    target_date: string | null;
    /** 'flexible' = soft aim, 'hard' = firm date. Null when no target_date. */
    deadline_type: 'flexible' | 'hard' | null;
    weight_pct: number | null;
    completed_at: string | null;
    sort_order: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

/** Legacy alias — older code (GoalsTab in ProjectDetailPage) still
 *  imports `ProjectGoal`. Points to the same shape as ProjectMilestone
 *  since the underlying table was renamed but the columns are identical. */
export type ProjectGoal = ProjectMilestone;

export interface ProjectNote {
    id: string;
    project_id: string;
    author_id: string;
    title: string | null;
    body: string;
    created_at: string;
    updated_at: string;
    /** Joined from profiles in select queries above. */
    author?: { display_name: string; avatar_url: string | null };
}
