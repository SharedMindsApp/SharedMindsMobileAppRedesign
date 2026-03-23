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
    created_at: string;
    updated_at: string;
}

export const TaskService = {
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
    }
};
