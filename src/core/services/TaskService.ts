import { supabase } from '../../lib/supabase';

export interface Task {
    id: string;
    space_id: string;
    project_id: string | null;
    created_by: string;
    assigned_to: string | null;
    title: string;
    notes: string | null;
    status: 'inbox' | 'active' | 'done' | 'dropped';
    priority: 'high' | 'medium' | 'low';
    energy_level: 'high' | 'medium' | 'low';
    due_on: string | null;
    scheduled_for: string | null;
    completed_at: string | null;
    sort_order: number;
    weekly_intention_id?: string | null;
    last_session_outcome?: 'finished' | 'partially' | 'something_came_up' | 'no_answer' | null;
    last_session_at?: string | null;
    sessions_count?: number;
    created_at: string;
    updated_at: string;
}

/** A single sub-step of a task — the "break the boulder into pebbles"
 *  checklist item. Promotable into its own first-class task. */
export interface TaskStep {
    id: string;
    task_id: string;
    created_by: string;
    title: string;
    done: boolean;
    completed_at: string | null;
    promoted_task_id: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

/** Schedule a task to a specific calendar date (YYYY-MM-DD) or clear
 *  the assignment (null = backlog). Wraps updateTask for clarity since
 *  scheduling is the most common task mutation in the new weekly model. */
export async function scheduleTaskFor(
  taskId: string,
  date: string | null,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ scheduled_for: date })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export const TaskService = {
    /**
     * Fetch all open + active tasks in a single project (across whatever
     * space the project lives in). Used by the ProjectDetailPage.
     */
    async getTasksByProject(projectId: string): Promise<Task[]> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .in('status', ['inbox', 'active', 'done'])
            .order('status', { ascending: true })   // inbox/active before done
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('[TaskService] Failed to fetch tasks by project:', error);
            throw error;
        }
        return (data || []) as Task[];
    },

    async getTasksBySpace(spaceId: string): Promise<Task[]> {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('space_id', spaceId)
            .in('status', ['inbox', 'active'])
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[TaskService] Failed to fetch tasks:', error);
            throw error;
        }

        return (tasks || []) as Task[];
    },

    async createTask(taskData: Partial<Task>): Promise<Task> {
        const { data, error } = await supabase
            .from('tasks')
            .insert(taskData)
            .select()
            .single();

        if (error) {
            console.error('[TaskService] Failed to create task:', error);
            throw error;
        }

        return data as Task;
    },

    async deleteTask(taskId: string): Promise<void> {
        // We `.select()` so PostgREST returns the deleted rows. If RLS
        // filtered the delete to zero rows (no DELETE policy match), the
        // call succeeds but returns an empty array — we treat that as an
        // error so the optimistic UI knows to restore the task instead
        // of silently dropping it.
        const { data, error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .select('id');

        if (error) {
            console.error('[TaskService] Failed to delete task:', error);
            throw error;
        }
        if (!data || data.length === 0) {
            const msg = `[TaskService] Delete returned 0 rows — likely an RLS denial for task ${taskId}`;
            console.error(msg);
            throw new Error(msg);
        }
    },

    /**
     * Called when a session STARTS and is linked to a task. Bumps the
     * task to 'active' (if it was 'inbox'), increments sessions_count,
     * stamps last_session_at. Idempotent enough for our purposes.
     */
    async markTaskStartedForSession(taskId: string): Promise<void> {
        const { data: current, error: readErr } = await supabase
            .from('tasks')
            .select('status, sessions_count')
            .eq('id', taskId)
            .maybeSingle();
        if (readErr || !current) return;

        const nextStatus = current.status === 'inbox' ? 'active' : current.status;
        const { error } = await supabase
            .from('tasks')
            .update({
                status: nextStatus,
                sessions_count: (current.sessions_count ?? 0) + 1,
                last_session_at: new Date().toISOString(),
            })
            .eq('id', taskId);
        if (error) console.warn('[TaskService] markTaskStartedForSession:', error);
    },

    /**
     * Called when a session debrief completes. Drives the task status
     * transition AND, if the task is linked to a weekly intention,
     * marks that intention completed_at when the task finishes.
     *
     *   finished          → status='done', intention auto-completed
     *   partially         → stays 'active', last_outcome saved (drives "continue" badge)
     *   something_came_up → stays 'active', last_outcome saved
     *   no_answer         → stays 'active', last_outcome saved
     */
    async applyOutcomeToTask(
        taskId: string,
        outcome: 'finished' | 'partially' | 'something_came_up' | 'no_answer',
    ): Promise<void> {
        const { data: task, error: readErr } = await supabase
            .from('tasks')
            .select('weekly_intention_id')
            .eq('id', taskId)
            .maybeSingle();
        if (readErr || !task) return;

        const isFinished = outcome === 'finished';
        const updates: Record<string, unknown> = {
            last_session_outcome: outcome,
            last_session_at: new Date().toISOString(),
        };
        if (isFinished) {
            updates.status = 'done';
            updates.completed_at = new Date().toISOString();
        }

        const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
        if (error) console.warn('[TaskService] applyOutcomeToTask:', error);

        // If this task was tracking a weekly intention and we just finished
        // it, close the loop on the intention too.
        if (isFinished && task.weekly_intention_id) {
            const { error: intentionErr } = await supabase
                .from('weekly_intentions')
                .update({ completed_at: new Date().toISOString() })
                .eq('id', task.weekly_intention_id);
            if (intentionErr) console.warn('[TaskService] propagate intention completion:', intentionErr);
        }
    },

    async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
        if (updates.status === 'done' || updates.status === 'dropped') {
            updates.completed_at = new Date().toISOString();
        } else if (updates.status) {
            updates.completed_at = null;
        }

        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', taskId)
            .select()
            .single();

        if (error) {
            console.error('[TaskService] Failed to update task:', error);
            throw error;
        }

        return data as Task;
    },

    // ── Steps ───────────────────────────────────────────────────────────

    /** All steps for a task, in checklist order. */
    async getStepsByTask(taskId: string): Promise<TaskStep[]> {
        const { data, error } = await supabase
            .from('task_steps')
            .select('*')
            .eq('task_id', taskId)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[TaskService] Failed to fetch steps:', error);
            throw error;
        }
        return (data || []) as TaskStep[];
    },

    /** Add a step to the end of a task's checklist. */
    async createStep(taskId: string, createdBy: string, title: string, sortOrder: number): Promise<TaskStep> {
        const clean = title.trim();
        if (!clean) throw new Error('Step title required');
        const { data, error } = await supabase
            .from('task_steps')
            .insert({ task_id: taskId, created_by: createdBy, title: clean, sort_order: sortOrder })
            .select()
            .single();

        if (error) {
            console.error('[TaskService] Failed to create step:', error);
            throw error;
        }
        return data as TaskStep;
    },

    /** Patch a step — toggle done (stamps completed_at) or rename. */
    async updateStep(stepId: string, updates: { done?: boolean; title?: string }): Promise<TaskStep> {
        const payload: Record<string, unknown> = {};
        if (updates.title !== undefined) payload.title = updates.title.trim();
        if (updates.done !== undefined) {
            payload.done = updates.done;
            payload.completed_at = updates.done ? new Date().toISOString() : null;
        }

        const { data, error } = await supabase
            .from('task_steps')
            .update(payload)
            .eq('id', stepId)
            .select()
            .single();

        if (error) {
            console.error('[TaskService] Failed to update step:', error);
            throw error;
        }
        return data as TaskStep;
    },

    async deleteStep(stepId: string): Promise<void> {
        const { data, error } = await supabase
            .from('task_steps')
            .delete()
            .eq('id', stepId)
            .select('id');

        if (error) {
            console.error('[TaskService] Failed to delete step:', error);
            throw error;
        }
        if (!data || data.length === 0) {
            throw new Error(`[TaskService] Step delete returned 0 rows — likely RLS denial for ${stepId}`);
        }
    },

    /**
     * Promote a step into its own first-class task. The new task inherits the
     * parent task's space + project (so it lands in the same scope), is owned
     * by `createdBy`, and starts in 'inbox'. The originating step is linked to
     * the new task and marked done, so it reads as "→ became a task" and can't
     * be promoted twice. Returns the freshly created task.
     */
    async promoteStepToTask(stepId: string, createdBy: string): Promise<Task> {
        // Read the step + its parent task's scope in one go.
        const { data: step, error: stepErr } = await supabase
            .from('task_steps')
            .select('id, title, promoted_task_id, task_id, tasks!inner(space_id, project_id)')
            .eq('id', stepId)
            .single();
        if (stepErr || !step) {
            console.error('[TaskService] promoteStepToTask: step not found', stepErr);
            throw stepErr ?? new Error('Step not found');
        }
        if (step.promoted_task_id) {
            throw new Error('Step already promoted to a task');
        }

        // PostgREST returns the embedded relation as an object (or array) —
        // normalise to the parent task scope.
        const parent = Array.isArray(step.tasks) ? step.tasks[0] : step.tasks;

        const newTask = await this.createTask({
            space_id: parent.space_id,
            project_id: parent.project_id,
            created_by: createdBy,
            title: step.title,
            status: 'inbox',
            priority: 'medium',
            energy_level: 'medium',
            sort_order: 0,
        });

        // Link + close the originating step. Best-effort: the task already
        // exists, so don't fail the whole op if this patch is denied.
        const { error: linkErr } = await supabase
            .from('task_steps')
            .update({ promoted_task_id: newTask.id, done: true, completed_at: new Date().toISOString() })
            .eq('id', stepId);
        if (linkErr) console.warn('[TaskService] promoteStepToTask link:', linkErr);

        return newTask;
    }
};
