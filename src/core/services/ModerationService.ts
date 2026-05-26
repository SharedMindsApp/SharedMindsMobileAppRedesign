/**
 * ModerationService
 *
 * All content moderation operations:
 *   - User-submitted reports (flagContent)
 *   - Admin queue (listFlags, resolveFlag, removeContent, warnUser)
 *   - User blocking (blockUser, unblockUser, getBlockedUserIds)
 *   - Automated scanning (moderateText — calls the Edge Function)
 */

import { supabase } from '../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ContentType = 'chat' | 'dm' | 'post' | 'reply' | 'session' | 'user';

export type WarningSeverity = 'warning' | 'final_warning' | 'suspension' | 'ban';

export interface UserWarning {
  id: string;
  user_id: string;
  issued_by: string;
  severity: WarningSeverity;
  reason: string;
  related_flag_id: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface UserSafetySummary {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  warning_count: number;
  suspended_until: string | null;
  open_flag_count: number;
  total_flag_count: number;
  warning_history_count: number;
  latest_flag_at: string | null;
  latest_warning_severity: WarningSeverity | null;
  latest_warning_at: string | null;
}

export type FlagReason =
  | 'harassment'
  | 'hate_speech'
  | 'spam'
  | 'inappropriate'
  | 'safety_concern'
  | 'other';

export type FlagStatus = 'open' | 'resolved' | 'dismissed';

export type ModAction =
  | 'content_removed'
  | 'user_warned'
  | 'user_suspended'
  | 'flag_dismissed';

export interface ContentFlag {
  id:                string;
  reporter_id:       string;
  flagged_user_id:   string;
  flagged_chat_id:   string | null;
  flagged_dm_id:     string | null;
  flagged_post_id:   string | null;
  flagged_reply_id:  string | null;
  flagged_session_id: string | null;
  reason:            FlagReason;
  notes:             string | null;
  content_snapshot:  string | null;
  content_type:      ContentType;
  status:            FlagStatus;
  auto_flagged:      boolean;
  auto_flag_score:   number | null;
  created_at:        string;
  resolved_at:       string | null;
  resolved_by:       string | null;
  // Joined from profiles
  reporter_name?:    string;
  flagged_user_name?: string;
}

export interface ModerationAction {
  id:              string;
  admin_id:        string;
  flag_id:         string | null;
  action:          ModAction;
  target_user_id:  string | null;
  content_type:    string | null;
  content_id:      string | null;
  notes:           string | null;
  created_at:      string;
  admin_name?:     string;
}

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  harassment:     'Harassment',
  hate_speech:    'Hate speech',
  spam:           'Spam',
  inappropriate:  'Inappropriate content',
  safety_concern: 'Safety concern',
  other:          'Other',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  chat:    'Community chat',
  dm:      'Direct message',
  post:    'Community post',
  reply:   'Post reply',
  session: 'Session',
};

// ── User reporting ─────────────────────────────────────────────────────────────

/** Submit a content flag from the current user. */
/** Submit a content flag. Returns the new flag id so callers can attach
 *  evidence (screenshots, transcripts) referencing it. */
export async function flagContent(opts: {
  contentType:      ContentType;
  contentId:        string;
  flaggedUserId:    string;
  reason:           FlagReason;
  notes?:           string;
  contentSnapshot?: string;
}): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // The 'user' content type isn't tied to a specific FK column — we just
  // rely on flagged_user_id + content_type='user' to identify it.
  const colMap: Partial<Record<ContentType, string>> = {
    chat:    'flagged_chat_id',
    dm:      'flagged_dm_id',
    post:    'flagged_post_id',
    reply:   'flagged_reply_id',
    session: 'flagged_session_id',
  };
  const fkCol = colMap[opts.contentType];

  const { data, error } = await supabase.from('content_flags').insert({
    reporter_id:       user.id,
    flagged_user_id:   opts.flaggedUserId,
    ...(fkCol ? { [fkCol]: opts.contentId } : {}),
    content_type:      opts.contentType,
    reason:            opts.reason,
    notes:             opts.notes ?? null,
    content_snapshot:  opts.contentSnapshot?.slice(0, 500) ?? null,
    auto_flagged:      false,
    status:            'open',
  }).select('id').single();

  if (error) throw error;
  return (data as { id: string }).id;
}

// ── Admin: list + action ───────────────────────────────────────────────────────

/** Fetch flags for the admin queue. */
export async function listFlags(status: FlagStatus = 'open'): Promise<ContentFlag[]> {
  const { data, error } = await supabase
    .from('content_flags')
    .select(`
      *,
      reporter:profiles!reporter_id(display_name),
      flagged_user:profiles!flagged_user_id(display_name)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[ModerationService] listFlags:', error);
    return [];
  }

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    reporter_name:     row.reporter?.display_name ?? 'Unknown',
    flagged_user_name: row.flagged_user?.display_name ?? 'Unknown',
  }));
}

/** Fetch the open flag count (for admin nav badge). */
export async function getOpenFlagCount(): Promise<number> {
  const { data, error } = await supabase.rpc('open_flag_count');
  if (error) return 0;
  return Number(data ?? 0);
}

/** Take an admin action on a flag. */
export async function resolveFlag(opts: {
  flagId:        string;
  action:        ModAction;
  targetUserId:  string;
  contentType?:  string;
  contentId?:    string;
  notes?:        string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Mark the flag resolved
  const { error: flagErr } = await supabase
    .from('content_flags')
    .update({
      status:      opts.action === 'flag_dismissed' ? 'dismissed' : 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', opts.flagId);

  if (flagErr) throw flagErr;

  // 2. Write the immutable audit entry
  const { error: actionErr } = await supabase.from('moderation_actions').insert({
    admin_id:       user.id,
    flag_id:        opts.flagId,
    action:         opts.action,
    target_user_id: opts.targetUserId,
    content_type:   opts.contentType ?? null,
    content_id:     opts.contentId   ?? null,
    notes:          opts.notes        ?? null,
  });

  if (actionErr) throw actionErr;
}

/**
 * Soft-delete a piece of content as admin.
 * Sets deleted_at + deleted_by on the appropriate table.
 */
export async function adminRemoveContent(opts: {
  contentType: ContentType;
  contentId:   string;
  flagId:      string;
  targetUserId: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const tableMap: Record<ContentType, string | null> = {
    chat:    'global_chat_messages',
    dm:      'dm_messages',
    post:    'community_posts',
    reply:   'community_post_replies',
    session: null,  // sessions aren't deleted, just flagged
  };

  const table = tableMap[opts.contentType];

  if (table) {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq('id', opts.contentId);
    if (error) throw error;
  }

  await resolveFlag({
    flagId:       opts.flagId,
    action:       'content_removed',
    targetUserId: opts.targetUserId,
    contentType:  opts.contentType,
    contentId:    opts.contentId,
  });
}

/**
 * Send a warning notification to the flagged user and resolve the flag.
 */
export async function warnUser(opts: {
  flagId:       string;
  targetUserId: string;
  reason:       string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Insert a notification for the flagged user
  await supabase.from('notifications').insert({
    user_id:    opts.targetUserId,
    type:       'content_warning',
    title:      'Content warning',
    body:       `One of your messages was flagged and reviewed. Reason: ${opts.reason}. Please review our community guidelines.`,
    deep_link:  '/home',
  });

  await resolveFlag({
    flagId:       opts.flagId,
    action:       'user_warned',
    targetUserId: opts.targetUserId,
    notes:        `Reason given: ${opts.reason}`,
  });
}

/** Fetch recent moderation actions for the audit log tab. */
export async function listModerationActions(limit = 50): Promise<ModerationAction[]> {
  const { data, error } = await supabase
    .from('moderation_actions')
    .select(`*, admin:profiles!admin_id(display_name)`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ModerationService] listModerationActions:', error);
    return [];
  }

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    admin_name: row.admin?.display_name ?? 'Admin',
  }));
}

// ── User blocking ──────────────────────────────────────────────────────────────

export async function blockUser(blockedId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('user_blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedId });
  if (error && error.code !== '23505') throw error; // ignore duplicate
}

export async function unblockUser(blockedId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);
}

/** Returns a Set of user IDs the current user has blocked. */
export async function getBlockedUserIds(): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_blocks')
    .select('blocked_id');
  return new Set((data ?? []).map((r: any) => r.blocked_id));
}

// ── Automated text scanning ────────────────────────────────────────────────────

/**
 * Run a piece of text through the moderate-content Edge Function.
 * Returns `true` if the content is approved, `false` if it should be blocked.
 * Fails open (returns true) if the function is unavailable.
 */
export async function moderateText(opts: {
  contentType: ContentType;
  contentId:   string;
  contentText: string;
  userId:      string;
}): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: {
        content_type: opts.contentType,
        content_id:   opts.contentId,
        content_text: opts.contentText,
        user_id:      opts.userId,
      },
    });

    if (error) return true; // fail open
    return data?.approved !== false;
  } catch {
    return true; // fail open
  }
}

// ── Escalation: warnings + suspensions (admin only) ────────────────────────

/**
 * Report a member as a whole (not a specific message). Convenience wrapper
 * around flagContent — uses content_type='user' and synthesises the
 * content_id from the user id so the admin queue can group reports by user.
 */
export async function reportUser(opts: {
  flaggedUserId: string;
  reason:        FlagReason;
  notes?:        string;
  contextUrl?:   string;
}): Promise<void> {
  return flagContent({
    contentType:     'user',
    // For user-level reports there's no specific content row to reference,
    // so we pass the flagged user id as the contentId. The schema treats it
    // as an opaque uuid — it just needs to be there so the row links back.
    contentId:       opts.flaggedUserId,
    flaggedUserId:   opts.flaggedUserId,
    reason:          opts.reason,
    notes:           opts.notes,
    contentSnapshot: opts.contextUrl,
  });
}

/**
 * Issue a warning, suspension, or ban. Trigger on user_warnings INSERT
 * handles updating profiles.warning_count + suspended_until + the
 * notification fan-out to the user.
 */
export async function issueWarning(opts: {
  userId:         string;
  severity:       WarningSeverity;
  reason:         string;
  relatedFlagId?: string;
  /** Only used when severity = 'suspension'. Defaults to 7 days from now. */
  expiresAt?:     string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('user_warnings').insert({
    user_id:         opts.userId,
    issued_by:       user.id,
    severity:        opts.severity,
    reason:          opts.reason,
    related_flag_id: opts.relatedFlagId ?? null,
    expires_at:      opts.expiresAt ?? null,
  });

  if (error) throw error;
}

/** Lift a suspension early. */
export async function liftSuspension(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ suspended_until: null })
    .eq('id', userId);
  if (error) throw error;
}

/** Admin: top-N users by open flag count + warning history. */
export async function listFlaggedUsers(limit = 50): Promise<UserSafetySummary[]> {
  const { data, error } = await supabase.rpc('admin_user_safety_summary', { _limit: limit });
  if (error) {
    console.warn('[ModerationService] listFlaggedUsers failed:', error.message);
    return [];
  }
  return (data ?? []) as UserSafetySummary[];
}

/** Evidence attached to a flag (admin view). Resolves storage paths into
 *  signed URLs valid for 5 minutes so admins can preview screenshots
 *  without exposing them publicly. */
export interface FlagEvidence {
  id: string;
  flag_id: string;
  evidence_type: 'screenshot' | 'chat_transcript';
  storage_path: string | null;
  transcript: Array<{ user_id: string; content: string; created_at: string }> | null;
  captured_at: string;
  auto_delete_at: string;
  legal_hold: boolean;
  /** Populated by getFlagEvidence — short-lived signed URL for screenshots. */
  signed_url?: string;
}

export async function getFlagEvidence(flagId: string): Promise<FlagEvidence[]> {
  const { data, error } = await supabase
    .from('flag_evidence')
    .select('*')
    .eq('flag_id', flagId)
    .order('captured_at', { ascending: true });
  if (error) {
    console.warn('[ModerationService] getFlagEvidence failed:', error.message);
    return [];
  }
  const rows = (data ?? []) as FlagEvidence[];
  // Resolve signed URLs for screenshots in parallel. Five-minute lifetime
  // is long enough for admin to view + short enough that a copied URL
  // expires before it spreads.
  await Promise.all(
    rows
      .filter((r) => r.evidence_type === 'screenshot' && r.storage_path)
      .map(async (r) => {
        const { data: signed } = await supabase.storage
          .from('flag-evidence')
          .createSignedUrl(r.storage_path!, 300);
        if (signed) r.signed_url = signed.signedUrl;
      }),
  );
  return rows;
}

/** All warnings issued to a single user (admin or self). */
export async function getWarningHistory(userId: string): Promise<UserWarning[]> {
  const { data, error } = await supabase
    .from('user_warnings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[ModerationService] getWarningHistory failed:', error.message);
    return [];
  }
  return (data ?? []) as UserWarning[];
}
