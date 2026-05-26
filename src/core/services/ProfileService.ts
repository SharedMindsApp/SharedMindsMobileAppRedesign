import { supabase } from '../../lib/supabase';

export interface ProfileStats {
  totalSessions: number;
  completedSessions: number;
  completionRate: number; // 0–100
  finishedCount: number;
  currentStreak: number;       // consecutive days with a completed session, ending today
  longestStreak: number;       // best run of consecutive days, all-time
  connectionCount: number;
  totalFocusMinutes: number;   // sum of actual session durations
  avgSessionMinutes: number;   // mean session length
  bestDayOfWeek: string | null;     // e.g. "Tuesday" — null until 3+ sessions
  bestWeekCount: number;       // sessions in best 7-day window
  bestWeekStart: string | null;     // ISO date for best week
  peopleAlongsideThisMonth: number; // unique co-participants in last 30 days
}

export interface PublicProfile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url?: string | null;
  work_type?: string | null;
  work_types?: string[] | null;
  skills?: string[] | null;
  location?: string | null;
  country_code?: string | null;
  city?: string | null;
  created_at: string;
  last_seen_at?: string | null;
}

export interface RecentShip {
  id: string;
  session_goal: string | null;
  session_title: string | null;
  session_outcome: string | null;
  intended_duration_minutes: number | null;
  ended_at: string | null;
  end_time: string | null;
}

/**
 * Browse members of the SharedMinds community. Returns all visible profiles
 * (RLS controls who's visible) excluding the current user. Used by the
 * /people directory.
 */
export async function listMembers(): Promise<PublicProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, bio, avatar_url, work_type, work_types, skills, location, country_code, city, created_at, last_seen_at')
    .neq('id', user.id)
    .not('display_name', 'is', null)
    // Privacy: anyone who flipped the "hide me" toggle is excluded.
    // Their profile is still viewable by direct URL — this just keeps
    // them off browse/discover surfaces.
    .eq('is_hidden_from_directory', false)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[ProfileService] listMembers failed:', error);
    return [];
  }
  return (data ?? []) as PublicProfile[];
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, bio, avatar_url, work_type, work_types, skills, location, country_code, city, created_at')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as PublicProfile;
}

// ── Weekly stats for the Stats tab ──────────────────────────────────────────
//
// Returns daily focus minutes for the last 14 days (this week + last week)
// so the dashboard can render a sparkline, a "↑ vs last week" delta, and a
// per-day breakdown. Tracks finishes and intentions separately for the
// "things shipped this week" counter.

export interface WeeklyStats {
  /** Day-by-day minutes for the trailing 14 days, oldest first. Length = 14. */
  dailyMinutes: number[];
  /** Sum of dailyMinutes for the last 7 days. */
  thisWeekMinutes: number;
  /** Sum of dailyMinutes for the 7 days before that. */
  lastWeekMinutes: number;
  /** Count of sessions completed in the last 7 days. */
  thisWeekSessions: number;
  /** Count of session_outcomes with outcome='finished' in the last 7 days. */
  thisWeekFinished: number;
  /** Count of weekly_intentions completed this calendar week. */
  thisWeekIntentionsDone: number;
  /** Total weekly_intentions set this calendar week (≤ 3). */
  thisWeekIntentionsTotal: number;
  /** Project breakdown: project_id → minutes (last 7 days). Empty if none linked. */
  projectMinutes: Record<string, number>;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchWeeklyStats(userId: string): Promise<WeeklyStats> {
  const now = new Date();
  const startOf14d = new Date(now);
  startOf14d.setDate(startOf14d.getDate() - 13);
  startOf14d.setHours(0, 0, 0, 0);

  const [sessionsRes, outcomesRes, intentionsRes] = await Promise.all([
    supabase
      .from('focus_sessions')
      .select('actual_duration_minutes, intended_duration_minutes, ended_at, project_id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('ended_at', startOf14d.toISOString()),
    supabase
      .from('session_outcomes')
      .select('outcome, created_at')
      .eq('user_id', userId)
      .eq('outcome', 'finished')
      .gte('created_at', startOf14d.toISOString()),
    supabase
      .from('weekly_intentions')
      .select('completed_at, created_at')
      .eq('user_id', userId)
      .gte('created_at', startOfWeekIso()),
  ]);

  const sessions = sessionsRes.data ?? [];
  const finishedOutcomes = outcomesRes.data ?? [];
  const intentions = intentionsRes.data ?? [];

  // Daily minutes — 14 buckets keyed by ISO date
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(startOf14d);
    d.setDate(d.getDate() + i);
    dailyMap.set(isoDate(d), 0);
  }
  for (const s of sessions) {
    const when = s.ended_at as string | null;
    if (!when) continue;
    const key = isoDate(new Date(when));
    if (!dailyMap.has(key)) continue;
    const mins = (s.actual_duration_minutes as number | null) ?? (s.intended_duration_minutes as number | null) ?? 0;
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + mins);
  }
  const dailyMinutes = Array.from(dailyMap.values());

  const thisWeekMinutes = dailyMinutes.slice(7).reduce((a, b) => a + b, 0);
  const lastWeekMinutes = dailyMinutes.slice(0, 7).reduce((a, b) => a + b, 0);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thisWeekSessions = sessions.filter(
    (s) => s.ended_at && new Date(s.ended_at as string) >= sevenDaysAgo,
  ).length;
  const thisWeekFinished = finishedOutcomes.filter(
    (o) => new Date(o.created_at as string) >= sevenDaysAgo,
  ).length;

  // Calendar-week intentions: created since Monday 00:00 local
  const thisWeekIntentionsTotal = intentions.length;
  const thisWeekIntentionsDone = intentions.filter((i) => i.completed_at).length;

  // Project minutes (last 7 days)
  const projectMinutes: Record<string, number> = {};
  for (const s of sessions) {
    if (!s.ended_at || new Date(s.ended_at as string) < sevenDaysAgo) continue;
    const pid = s.project_id as string | null;
    if (!pid) continue;
    const mins = (s.actual_duration_minutes as number | null) ?? (s.intended_duration_minutes as number | null) ?? 0;
    projectMinutes[pid] = (projectMinutes[pid] ?? 0) + mins;
  }

  return {
    dailyMinutes,
    thisWeekMinutes,
    lastWeekMinutes,
    thisWeekSessions,
    thisWeekFinished,
    thisWeekIntentionsDone,
    thisWeekIntentionsTotal,
    projectMinutes,
  };
}

function startOfWeekIso(): string {
  // Monday 00:00 local
  const d = new Date();
  const day = d.getDay() || 7;  // Sun=0 → 7
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Cheap "has the user ever completed a session?" check. Used by the home
 * dashboard to pick the day-zero vs returning-user branch without waiting
 * for the full stats aggregation. Server-side count, head-only request —
 * resolves in ~10ms vs hundreds of ms for fetchProfileStats.
 */
export async function fetchHasCompletedAnySession(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('focus_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');
  if (error) {
    console.warn('[fetchHasCompletedAnySession]', error);
    return false; // fail-closed to day-zero rather than blocking render
  }
  return (count ?? 0) > 0;
}

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  // Parallelise the two queries — the connection count used to be a
  // sequential await at the end of this function, adding a full round-trip
  // for no good reason. Now both kick off together.
  const [sessionsRes, connRes] = await Promise.all([
    supabase
      .from('focus_sessions')
      .select('status, session_outcome, ended_at, end_time, start_time, intended_duration_minutes, partner_user_id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('ended_at', { ascending: false }),
    supabase
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
  ]);
  const sessions = sessionsRes.data;

  const completed = sessions ?? [];
  const totalCompleted = completed.length;
  const finished = completed.filter((s) => s.session_outcome === 'finished').length;
  const completionRate = totalCompleted > 0 ? Math.round((finished / totalCompleted) * 100) : 0;

  // ── Total focus minutes + avg ──
  let totalMinutes = 0;
  for (const s of completed) {
    if (s.start_time && (s.ended_at || s.end_time)) {
      const start = new Date(s.start_time).getTime();
      const end = new Date(s.ended_at ?? s.end_time).getTime();
      const mins = Math.max(0, Math.round((end - start) / 60000));
      // Cap at intended + 25% to ignore stuck/forgotten sessions
      const cap = s.intended_duration_minutes ? Math.round(s.intended_duration_minutes * 1.25) : 240;
      totalMinutes += Math.min(mins, cap);
    } else if (s.intended_duration_minutes) {
      totalMinutes += s.intended_duration_minutes;
    }
  }
  const avgSessionMinutes = totalCompleted > 0 ? Math.round(totalMinutes / totalCompleted) : 0;

  // ── Day-key set for streak math ──
  function dayKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

  const dayKeys = completed
    .map((s) => new Date(s.ended_at ?? s.end_time ?? ''))
    .filter((d) => !isNaN(d.getTime()));
  const daySet = new Set(dayKeys.map(dayKey));

  // Current streak: from today backwards
  let currentStreak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (daySet.has(dayKey(d))) currentStreak++;
    else if (i > 0) break;
  }

  // Longest streak: walk every day with a session, count consecutive runs
  const sortedDays = Array.from(daySet)
    .map((k) => { const [y, m, day] = k.split('-').map(Number); return new Date(y, m, day).getTime(); })
    .sort((a, b) => a - b);
  let longestStreak = 0;
  let run = 0;
  let prev = -Infinity;
  for (const ms of sortedDays) {
    if (ms - prev === 86400000) run++;
    else run = 1;
    if (run > longestStreak) longestStreak = run;
    prev = ms;
  }

  // ── Best day of the week (gated to 3+ sessions for signal) ──
  let bestDayOfWeek: string | null = null;
  if (totalCompleted >= 3) {
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const d of dayKeys) dowCounts[d.getDay()]++;
    const peak = Math.max(...dowCounts);
    if (peak > 0) {
      const idx = dowCounts.indexOf(peak);
      bestDayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][idx];
    }
  }

  // ── Best week: sliding 7-day window across all sessions ──
  let bestWeekCount = 0;
  let bestWeekStart: string | null = null;
  if (sortedDays.length > 0) {
    const dayCounts = new Map<number, number>();
    for (const d of dayKeys) {
      const ms = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      dayCounts.set(ms, (dayCounts.get(ms) ?? 0) + 1);
    }
    for (const startMs of sortedDays) {
      let count = 0;
      for (let i = 0; i < 7; i++) {
        count += dayCounts.get(startMs + i * 86400000) ?? 0;
      }
      if (count > bestWeekCount) {
        bestWeekCount = count;
        bestWeekStart = new Date(startMs).toISOString().slice(0, 10);
      }
    }
  }

  // ── People worked alongside this month (unique partner_user_ids in last 30d) ──
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const partnerSet = new Set<string>();
  for (const s of completed) {
    const t = new Date(s.ended_at ?? s.end_time ?? '').getTime();
    if (isNaN(t) || t < thirtyDaysAgo) continue;
    if (s.partner_user_id) partnerSet.add(s.partner_user_id);
  }
  const peopleAlongsideThisMonth = partnerSet.size;

  // Connection count came in parallel from the Promise.all above.
  const connCount = connRes.count;

  return {
    totalSessions: totalCompleted,
    completedSessions: totalCompleted,
    completionRate,
    finishedCount: finished,
    currentStreak,
    longestStreak,
    connectionCount: connCount ?? 0,
    totalFocusMinutes: totalMinutes,
    avgSessionMinutes,
    bestDayOfWeek,
    bestWeekCount,
    bestWeekStart,
    peopleAlongsideThisMonth,
  };
}

export async function fetchRecentShips(userId: string, limit = 8): Promise<RecentShip[]> {
  const { data } = await supabase
    .from('focus_sessions')
    .select('id, session_goal, session_title, session_outcome, intended_duration_minutes, ended_at, end_time')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('session_outcome', 'is', null)
    .order('ended_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as RecentShip[];
}

export async function fetchWeekSessions(userId: string): Promise<{ start_time: string }[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('focus_sessions')
    .select('start_time')
    .eq('user_id', userId)
    .gte('start_time', sevenDaysAgo.toISOString());

  return (data ?? []) as { start_time: string }[];
}

export async function updateProfileBio(bio: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ bio, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) throw error;
}

export async function updateProfile(patch: {
  display_name?: string;
  bio?: string | null;
  location?: string | null;
  country_code?: string | null;
  city?: string | null;
  work_type?: string | null;
  work_types?: string[] | null;
  skills?: string[] | null;
  skill_levels?: Record<string, number> | null;
  offering?: string[] | null;
  seeking?: string[] | null;
  wanted_skills?: string[] | null;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) throw error;
}

/** Custom error thrown when an avatar is rejected by moderation. */
export class AvatarRejectedError extends Error {
  reasons: string[];
  /** Which gate the image failed at — drives the UI copy shown to the user */
  status: 'rejected_face' | 'rejected_safety';
  constructor(reasons: string[], status: 'rejected_face' | 'rejected_safety' = 'rejected_safety') {
    super(`Image rejected: ${reasons.join(', ')}`);
    this.name = 'AvatarRejectedError';
    this.reasons = reasons;
    this.status = status;
  }
}

/**
 * Client-side image processor: load the user's File, draw to a max 512x512
 * canvas (cover-cropped to square), and re-encode as JPEG at quality 0.85.
 * Returns a data URL ready to send to the moderation endpoint and the bucket.
 */
async function processAvatarImage(file: File, size = 512): Promise<{
  dataUrl: string;
  blob: Blob;
}> {
  // Reject obviously wrong types early
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image is larger than 10 MB');
  }

  // Load
  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;
  const min = Math.min(w, h);
  const sx = (w - min) / 2;
  const sy = (h - min) / 2;

  // Draw square-cropped, resized
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, sx, sy, min, min, 0, 0, size, size);
  bitmap.close?.();

  // Encode
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Image encoding failed'))),
      'image/jpeg',
      0.85,
    );
  });
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Image read failed'));
    r.readAsDataURL(blob);
  });
  return { dataUrl, blob };
}

/**
 * Call the moderation Edge Function.
 *
 * - Throws AvatarRejectedError if the function explicitly says `approved: false`
 *   (the only hard-block path).
 * - **Fails open** if the function isn't deployed or returns a network error —
 *   logs a warning and proceeds. This lets uploads work in dev / pre-launch
 *   before OPENAI_API_KEY is configured on the Supabase project. Once the
 *   function IS deployed and returns flagged content, this still blocks it.
 */
export type AvatarStatus = 'none' | 'pending' | 'approved' | 'rejected_face' | 'rejected_safety';

interface ModerateResult {
  status: AvatarStatus;
  reason: string | null;
}

/**
 * Runs the moderation Edge Function and returns the verdict.
 * Throws AvatarRejectedError on rejection so the upload flow can stop
 * before writing to storage — but ALSO returns the structured verdict
 * via callers that need it (e.g. background re-verification).
 */
async function moderateAvatar(dataUrl: string): Promise<ModerateResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  let data: { approved: boolean; status?: AvatarStatus; reason?: string; reasons?: string[]; error?: string } | null = null;
  let error: { message?: string } | null = null;

  try {
    const result = await supabase.functions.invoke<{
      approved: boolean;
      status?: AvatarStatus;
      reason?: string;
      reasons?: string[];
      error?: string;
    }>('moderate-avatar', { body: { image: dataUrl } });
    data = result.data;
    error = result.error;
  } catch (e) {
    console.warn('[moderateAvatar] moderation unavailable — proceeding without it:', e);
    return { status: 'pending', reason: 'Verification service unavailable.' };
  }

  if (error) {
    console.warn('[moderateAvatar] moderation function error — proceeding without it:', error.message);
    return { status: 'pending', reason: 'Verification service error.' };
  }

  if (!data) {
    console.warn('[moderateAvatar] moderation returned no result');
    return { status: 'pending', reason: null };
  }

  // Rejected — throw so upload flow halts. Caller can catch and decide how
  // to surface the reason. Status comes through on the error object too.
  if (data.approved === false) {
    if (data.error) throw new Error(data.error);
    const status = (data.status ?? 'rejected_safety') as AvatarStatus;
    throw new AvatarRejectedError(
      data.reason ? [data.reason] : (data.reasons ?? ['flagged']),
      status,
    );
  }

  return { status: data.status ?? 'approved', reason: data.reason ?? null };
}

/**
 * Full avatar upload flow: resize → moderate → upload to bucket → update profile.
 * Returns the cache-busted public URL of the new avatar.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Process (resize + re-encode as JPEG)
  const { dataUrl, blob } = await processAvatarImage(file);

  // 2. Moderate — throws AvatarRejectedError if flagged (face or safety).
  //    We catch and surface the failure with status info so the caller
  //    can show the right message.
  let verdict: ModerateResult;
  try {
    verdict = await moderateAvatar(dataUrl);
  } catch (err) {
    if (err instanceof AvatarRejectedError) {
      // Persist the rejection so future sessions remember the verdict
      // (and the user sees the banner on their profile until they re-upload).
      await supabase
        .from('profiles')
        .update({
          avatar_status: err.status,
          avatar_rejection_reason: err.reasons.join('; '),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }
    throw err;
  }

  // 3. Upload
  const path = `${user.id}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const cacheBustedUrl = `${data.publicUrl}?t=${Date.now()}`;

  // 4. Save to profile with verification status
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      avatar_url: cacheBustedUrl,
      avatar_status: verdict.status,
      avatar_rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (profileError) throw profileError;

  return cacheBustedUrl;
}

/**
 * Re-runs face verification on the user's existing avatar (without re-uploading).
 * Called once on login for users whose avatars predate the verification system
 * (status='pending') so we don't grandfather a two-tier identity standard.
 *
 * Failures are non-fatal — we just leave the status as 'pending' for retry later.
 */
export async function reverifyExistingAvatar(userId: string, avatarUrl: string): Promise<void> {
  try {
    // Fetch the image and re-encode it as a data URL so the Edge Function
    // accepts it (it requires data:image/... format).
    const res = await fetch(avatarUrl);
    if (!res.ok) return;
    const blob = await res.blob();

    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    try {
      const verdict = await moderateAvatar(dataUrl);
      await supabase
        .from('profiles')
        .update({
          avatar_status: verdict.status,
          avatar_rejection_reason: verdict.reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } catch (err) {
      if (err instanceof AvatarRejectedError) {
        await supabase
          .from('profiles')
          .update({
            avatar_status: err.status,
            avatar_rejection_reason: err.reasons.join('; '),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } else {
        // Network/transient error — leave as 'pending' for the next retry.
        console.warn('[reverifyExistingAvatar] non-fatal failure:', err);
      }
    }
  } catch (err) {
    console.warn('[reverifyExistingAvatar] could not fetch avatar:', err);
  }
}

export async function fetchProfileFull(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, bio, avatar_url, work_type, work_types, skills, location, country_code, city, created_at')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as PublicProfile;
}
