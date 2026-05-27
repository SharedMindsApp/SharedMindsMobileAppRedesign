/**
 * CommunityService — feed posts, reactions, replies.
 *
 * Posts come in two flavours: manual (typed by a user) and auto
 * (trigger-inserted on session finish, project start, profile join).
 * The UI uses `is_auto` to render auto-events more quietly.
 */

import { supabase } from '../../lib/supabase';

export type CommunityPostType =
  | 'working_on'
  | 'stuck'
  | 'win'
  | 'question'
  | 'session_finished'
  | 'project_started'
  | 'joined';

export type ReactionEmoji = '👏' | '💡' | '🙏' | '🔥' | '💪';
export const REACTION_OPTIONS: ReactionEmoji[] = ['👏', '💡', '🙏', '🔥', '💪'];

export interface CommunityPostAuthor {
  id: string;
  display_name: string;
  avatar_url: string | null;
  work_type: string | null;
}

export interface CommunityReaction {
  user_id: string;
  emoji: ReactionEmoji;
}

export interface CommunityReply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: CommunityPostAuthor;
}

export interface CommunityPost {
  id: string;
  author_id: string;
  post_type: CommunityPostType;
  is_auto: boolean;
  content: string;
  related_session_id: string | null;
  related_project_id: string | null;
  created_at: string;
  author: CommunityPostAuthor;
  reactions: CommunityReaction[];
  reply_count: number;
}

// ── Feed ────────────────────────────────────────────────────────

/** Fetch the most recent N posts. Pulls authors, reactions, and reply
 *  counts via joins so the feed renders in one round-trip.
 *
 *  Defensive filter: we exclude `is_auto = true AND post_type =
 *  'project_started'` even when no explicit types filter is set.
 *  The trigger that creates those auto-posts was retired in
 *  20260528000001 (projects are too sensitive to be public-unless-
 *  flagged), but any rows from before the migration applies — or
 *  from a Supabase env where the migration hasn't run yet — should
 *  still disappear from the visible feed. Belt-and-braces. */
export async function fetchFeed(opts: { limit?: number; types?: CommunityPostType[] } = {}): Promise<CommunityPost[]> {
  const limit = opts.limit ?? 50;
  let query = supabase
    .from('community_posts')
    .select(`
      id, author_id, post_type, is_auto, content,
      related_session_id, related_project_id, created_at,
      author:profiles!community_posts_author_id_fkey(id, display_name, avatar_url, work_type),
      reactions:community_post_reactions(user_id, emoji),
      replies:community_post_replies(id)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts.types && opts.types.length > 0) {
    query = query.in('post_type', opts.types);
  }

  // Filter out auto-shared projects regardless of any types filter.
  // PostgREST's .not() with a compound predicate isn't directly
  // expressible — we use .or() to express "NOT (is_auto AND type=project_started)"
  // as "is_auto IS false OR post_type IS NOT project_started".
  query = query.or('is_auto.is.false,post_type.neq.project_started');

  const { data, error } = await query;
  if (error) {
    console.error('[CommunityService] fetchFeed failed:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    author_id: row.author_id,
    post_type: row.post_type,
    is_auto: row.is_auto,
    content: row.content,
    related_session_id: row.related_session_id,
    related_project_id: row.related_project_id,
    created_at: row.created_at,
    author: row.author ?? { id: row.author_id, display_name: 'Someone', avatar_url: null, work_type: null },
    reactions: row.reactions ?? [],
    reply_count: (row.replies ?? []).length,
  })) as CommunityPost[];
}

// ── Compose ─────────────────────────────────────────────────────

export async function createPost(input: {
  postType: 'working_on' | 'stuck' | 'win' | 'question';
  content: string;
  relatedProjectId?: string;
}): Promise<CommunityPost | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      author_id: user.id,
      post_type: input.postType,
      is_auto: false,
      content: input.content.trim(),
      related_project_id: input.relatedProjectId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[CommunityService] createPost failed:', error);
    throw error;
  }

  // Refetch with joins for clean return shape
  const fresh = await fetchFeed({ limit: 1, types: [input.postType] });
  return fresh.find((p) => p.id === data.id) ?? null;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('community_posts').delete().eq('id', postId);
  if (error) throw error;
}

// ── Reactions ───────────────────────────────────────────────────

export async function addReaction(postId: string, emoji: ReactionEmoji): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('community_post_reactions')
    .insert({ post_id: postId, user_id: user.id, emoji });

  // Ignore unique-violation (user already reacted with this emoji)
  if (error && error.code !== '23505') {
    console.error('[CommunityService] addReaction failed:', error);
    throw error;
  }
}

export async function removeReaction(postId: string, emoji: ReactionEmoji): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('community_post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .eq('emoji', emoji);

  if (error) throw error;
}

// ── Replies ─────────────────────────────────────────────────────

export async function fetchReplies(postId: string): Promise<CommunityReply[]> {
  const { data, error } = await supabase
    .from('community_post_replies')
    .select(`
      id, post_id, author_id, content, created_at,
      author:profiles!community_post_replies_author_id_fkey(id, display_name, avatar_url, work_type)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[CommunityService] fetchReplies failed:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    post_id: row.post_id,
    author_id: row.author_id,
    content: row.content,
    created_at: row.created_at,
    author: row.author ?? { id: row.author_id, display_name: 'Someone', avatar_url: null, work_type: null },
  })) as CommunityReply[];
}

export async function createReply(postId: string, content: string): Promise<CommunityReply> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('community_post_replies')
    .insert({ post_id: postId, author_id: user.id, content: content.trim() })
    .select(`
      id, post_id, author_id, content, created_at,
      author:profiles!community_post_replies_author_id_fkey(id, display_name, avatar_url, work_type)
    `)
    .single();

  if (error) throw error;
  return {
    ...(data as any),
    author: (data as any).author ?? { id: user.id, display_name: 'You', avatar_url: null, work_type: null },
  } as CommunityReply;
}

// ── Realtime ────────────────────────────────────────────────────

export function subscribeToFeed(onChange: () => void): () => void {
  // Subscribe to any insert/update on community_posts so the feed
  // refreshes when someone else posts, reacts, or auto-events fire.
  const channel = supabase
    .channel('community:feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'community_post_reactions' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'community_post_replies' }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
