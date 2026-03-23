import { supabase } from '../../lib/supabase';
import type { CoreActivity, CoreCheckIn, CoreJournalEntry, CoreResponsibility } from '../data/CoreDataContext';

export const DailyOSService = {
    // --- JOURNAL ---
    async getJournalEntry(userId: string, dateStr: string): Promise<CoreJournalEntry | null> {
        const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', userId)
            .eq('entry_date', dateStr)
            .maybeSingle();

        if (error) {
            console.error('[DailyOS] getJournalEntry error:', error);
            return null;
        }

        if (!data) return null;

        return {
            sleepQuality: data.sleep_quality || 0,
            exercise: data.exercise_type ? `${data.exercise_mins || 0} mins ${data.exercise_type}` : '',
            wins: data.wins || '',
            struggles: data.struggles || '',
            reflection: data.reflection || '',
            tomorrowIntention: data.tomorrow_intention || ''
        };
    },

    async upsertJournalEntry(userId: string, spaceId: string, dateStr: string, patch: Partial<CoreJournalEntry>) {
        // Requires mapping the patch back to DB columns
        const dbPayload: any = {
            user_id: userId,
            space_id: spaceId,
            entry_date: dateStr,
            visibility: 'private'
        };
        if (patch.sleepQuality !== undefined) dbPayload.sleep_quality = patch.sleepQuality;
        if (patch.wins !== undefined) dbPayload.wins = patch.wins;
        if (patch.struggles !== undefined) dbPayload.struggles = patch.struggles;
        if (patch.reflection !== undefined) dbPayload.reflection = patch.reflection;
        if (patch.tomorrowIntention !== undefined) dbPayload.tomorrow_intention = patch.tomorrowIntention;
        if (patch.exercise) {
            dbPayload.exercise_done = true;
            dbPayload.exercise_type = patch.exercise;
        }

        const { error } = await supabase.from('journal_entries').upsert(dbPayload, { onConflict: 'user_id, entry_date' });
        if (error) console.error('[DailyOS] upsertJournalEntry error:', error);
    },

    // --- ACTIVITIES ---
    async getActivityLogs(userId: string, dateStr: string): Promise<CoreActivity[]> {
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('activity_date', dateStr)
            .order('start_time', { ascending: false });

        if (error) {
            console.error('[DailyOS] getActivityLogs error:', error);
            return [];
        }

        return (data || []).map(act => ({
            id: act.id,
            time: act.start_time.substring(0, 5), // 'HH:MM'
            title: act.title,
            category: act.category || 'general',
            durationMins: act.duration_mins || 0
        }));
    },

    async createActivityLog(userId: string, spaceId: string, dateStr: string, activity: Omit<CoreActivity, 'id'>) {
        const { data, error } = await supabase.from('activity_logs').insert({
            user_id: userId,
            space_id: spaceId,
            activity_date: dateStr,
            start_time: activity.time + ':00',
            title: activity.title,
            category: activity.category,
            duration_mins: activity.durationMins,
            visibility: 'private'
        }).select().single();

        if (error) console.error('[DailyOS] createActivityLog error:', error);
        return data;
    },

    // --- RESPONSILIBITIES ---
    async getResponsibilities(spaceId: string, userId: string, dateStr: string): Promise<CoreResponsibility[]> {
        // Get all active responsibilities for the space
        const { data: resps, error: respsError } = await supabase
            .from('responsibilities')
            .select('*')
            .eq('space_id', spaceId)
            .eq('is_active', true);

        if (respsError) {
            console.error('[DailyOS] fetch responsibilities error:', respsError);
            return [];
        }

        if (!resps || resps.length === 0) return [];

        // Get completions for today by this user
        const { data: completions, error: compError } = await supabase
            .from('responsibility_completions')
            .select('responsibility_id')
            .eq('completed_by', userId)
            .eq('completed_on', dateStr);

        if (compError) {
            console.error('[DailyOS] fetch completions error:', compError);
        }

        const completedIds = new Set((completions || []).map(c => c.responsibility_id));

        return resps.map(r => ({
            id: r.id,
            name: r.name,
            category: r.category || 'general',
            done: completedIds.has(r.id)
        }));
    },

    async toggleResponsibilityCompletion(responsibilityId: string, userId: string, dateStr: string, isDone: boolean) {
        if (isDone) {
            const { error } = await supabase.from('responsibility_completions').insert({
                responsibility_id: responsibilityId,
                completed_by: userId,
                completed_on: dateStr
            });
            if (error && error.code !== '23505') console.error('[DailyOS] toggle error (insert):', error);
        } else {
            const { error } = await supabase.from('responsibility_completions')
                .delete()
                .match({ responsibility_id: responsibilityId, completed_by: userId, completed_on: dateStr });
            if (error) console.error('[DailyOS] toggle error (delete):', error);
        }
    },

    // --- CHECKINS ---
    async getCheckins(userId: string, dateStr: string): Promise<CoreCheckIn[]> {
        const { data, error } = await supabase
            .from('checkins')
            .select('*')
            .eq('user_id', userId)
            .eq('checkin_date', dateStr)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DailyOS] getCheckins error:', error);
            return [];
        }

        return (data || []).map(c => ({
            id: c.id,
            type: c.checkin_type as any,
            prompt: c.prompt_text,
            response: c.response_text || undefined,
            createdAt: c.created_at
        }));
    },

    async createCheckin(userId: string, spaceId: string, dateStr: string, checkin: Omit<CoreCheckIn, 'id'>) {
        const { data, error } = await supabase.from('checkins').insert({
            user_id: userId,
            space_id: spaceId,
            checkin_date: dateStr,
            checkin_type: checkin.type,
            prompt_text: checkin.prompt,
            response_text: checkin.response,
            status: checkin.response ? 'answered' : 'generated'
        }).select().single();

        if (error) console.error('[DailyOS] createCheckin error:', error);
        return data;
    },

    async updateCheckinResponse(checkinId: string, response: string) {
        const { error } = await supabase.from('checkins').update({
            response_text: response,
            status: 'answered',
            responded_at: new Date().toISOString()
        }).eq('id', checkinId);
        if (error) console.error('[DailyOS] updateCheckinResponse error:', error);
    }
};
