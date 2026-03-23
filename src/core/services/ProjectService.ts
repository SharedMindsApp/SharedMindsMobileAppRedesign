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

export const ProjectService = {
    async getProjectsBySpace(spaceId: string): Promise<Project[]> {
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .eq('space_id', spaceId)
            .neq('status', 'archived')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ProjectService] Failed to fetch projects:', error);
            throw error;
        }

        return (projects || []) as Project[];
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

        return data as Project;
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
    }
};
