import { supabase } from '../../lib/supabase';

export interface Profile {
    id: string;
    display_name: string;
    avatar_url: string | null;
}

export interface Connection {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: 'pending' | 'accepted' | 'declined' | 'blocked';
    connection_type: string;
}

export interface SpaceMemberDetail {
    id: string;
    space_id: string;
    user_id: string;
    role: string;
    status: string;
    profile: Profile;
}

export const SharingService = {
    async searchUsers(query: string): Promise<Profile[]> {
        if (!query || query.length < 3) return [];

        // In a real app we'd search by email or exact handle. Because of privacy, 
        // we only allow exact matches on display_name for this demo.
        const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .ilike('display_name', `%${query}%`)
            .limit(5);

        if (error) {
            console.error('[SharingService] searchUsers error:', error);
            return [];
        }
        return data as Profile[];
    },

    async getConnections(userId: string): Promise<(Connection & { profile: Profile })[]> {
        const { data, error } = await supabase
            .from('person_connections')
            .select(`
        *,
        requester:requester_id(id, display_name, avatar_url),
        addressee:addressee_id(id, display_name, avatar_url)
      `)
            .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
            .eq('status', 'accepted');

        if (error) {
            console.error('[SharingService] getConnections error:', error);
            return [];
        }

        return (data || []).map((conn: any) => {
            const isRequester = conn.requester_id === userId;
            return {
                ...conn,
                profile: isRequester ? conn.addressee : conn.requester
            };
        });
    },

    async getSpaceMembers(spaceId: string): Promise<SpaceMemberDetail[]> {
        const { data, error } = await supabase
            .from('space_members')
            .select(`
        id, space_id, user_id, role, status,
        profile:profiles!space_members_user_id_fkey(id, display_name, avatar_url)
      `)
            .eq('space_id', spaceId)
            .eq('status', 'active');

        if (error) {
            console.error('[SharingService] getSpaceMembers error:', error);
            return [];
        }

        // Supabase foreign key join returns a single object if it's a 1:1 or N:1 relation, 
        // but the generated type might be an array depending on how it's analyzed.
        return (data || []).map((m: any) => ({
            ...m,
            profile: Array.isArray(m.profile) ? m.profile[0] : m.profile
        })) as SpaceMemberDetail[];
    },

    async inviteToSpace(spaceId: string, targetUserId: string, role: 'collaborator' | 'viewer' = 'collaborator') {
        const { error } = await supabase
            .from('space_members')
            .insert({
                space_id: spaceId,
                user_id: targetUserId,
                role,
                status: 'active'
            });

        if (error) {
            console.error('[SharingService] inviteToSpace error:', error);
            throw error;
        }
    },

    async updateSpaceMemberRole(spaceMemberId: string, role: 'collaborator' | 'viewer') {
        const { error } = await supabase
            .from('space_members')
            .update({ role })
            .eq('id', spaceMemberId);

        if (error) {
            console.error('[SharingService] updateSpaceMemberRole error:', error);
            throw error;
        }
    },

    async removeFromSpace(spaceMemberId: string) {
        const { error } = await supabase
            .from('space_members')
            .update({ status: 'removed' })
            .eq('id', spaceMemberId);

        if (error) {
            console.error('[SharingService] removeFromSpace error:', error);
            throw error;
        }
    }
};
