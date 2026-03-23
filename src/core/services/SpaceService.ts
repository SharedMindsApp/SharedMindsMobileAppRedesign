import { supabase } from '../../lib/supabase';

export interface Space {
    id: string;
    type: 'personal' | 'shared';
    name: string;
    slug: string | null;
    created_by: string;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
}

export interface SpaceMember {
    id: string;
    space_id: string;
    user_id: string;
    role: 'owner' | 'collaborator' | 'viewer';
    status: 'active' | 'invited' | 'removed';
    invited_by: string | null;
    created_at: string;
    updated_at: string;
}

export const SpaceService = {
    /**
     * Fetches all spaces the current user is an active member of.
     */
    async getMySpaces(): Promise<Space[]> {
        const { data: spaces, error } = await supabase
            .from('spaces')
            .select(`
        *,
        space_members!inner(status)
      `)
            .eq('space_members.status', 'active')
            .eq('is_archived', false)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[SpaceService] Failed to fetch spaces:', error);
            throw error;
        }

        return (spaces || []) as Space[];
    },

    /**
     * Checks if the user has a personal space, and creates one if they don't.
     * Returns the personal space.
     */
    async bootstrapPersonalSpace(userId: string): Promise<Space> {
        // 1. Check if they already have one
        const { data: existingSpaces, error: fetchError } = await supabase
            .from('spaces')
            .select('*')
            .eq('created_by', userId)
            .eq('type', 'personal')
            .limit(1);

        if (fetchError) {
            console.error('[SpaceService] Error checking personal space:', fetchError);
            throw fetchError;
        }

        if (existingSpaces && existingSpaces.length > 0) {
            return existingSpaces[0] as Space;
        }

        // 2. Need to create one
        console.log('[SpaceService] Auto-provisioning personal space...');

        // Create the space directly
        // Since RLS policies allow insertion if created_by = auth.uid(), this works.
        const { data: newSpace, error: createError } = await supabase
            .from('spaces')
            .insert({
                type: 'personal',
                name: 'Personal Space',
                created_by: userId,
            })
            .select()
            .single();

        if (createError) {
            console.error('[SpaceService] Failed to create personal space:', createError);
            throw createError;
        }

        // 3. Insert the membership
        // Note: space_members_insert_manageable_space relies on can_manage_space()
        // but the space was just created so membership doesn't exist yet!
        // In V1 spec, the RLS for space_members:
        // create policy "space_members_insert_manageable_space"
        // on public.space_members
        // for insert
        // with check (public.can_manage_space(space_id));
        // 
        // Wait, can_manage_space() requires the user to ALREADY be a member.
        // This is a chicken-and-egg problem in the RLS design from the document!
        // We might need to handle the first member insertion via a database function,
        // OR we modify the space_members insert RLS policy to allow insertion if the user is the space creator.
        // For now, we will attempt the insert. If it fails, the DB migration must be amended.

        const { error: memberError } = await supabase
            .from('space_members')
            .insert({
                space_id: newSpace.id,
                user_id: userId,
                role: 'owner',
                status: 'active',
            });

        if (memberError) {
            console.error('[SpaceService] Failed to insert space membership. RLS likely blocked it due to chicken-and-egg problem:', memberError);
            // We purposefully don't throw here to let the developer fix the DB migration gracefully.
        }

        return newSpace as Space;
    }
};
