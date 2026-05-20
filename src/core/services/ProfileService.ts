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

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const { data: sessions } = await supabase
    .from('focus_sessions')
    .select('status, session_outcome, ended_at, end_time, start_time, intended_duration_minutes, partner_user_id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('ended_at', { ascending: false });

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

  // ── Connection count ──
  const { count: connCount } = await supabase
    .from('connections')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

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
  constructor(reasons: string[]) {
    super(`Image rejected: ${reasons.join(', ')}`);
    this.name = 'AvatarRejectedError';
    this.reasons = reasons;
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
async function moderateAvatar(dataUrl: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  let data: { approved: boolean; reasons?: string[]; error?: string } | null = null;
  let error: { message?: string } | null = null;

  try {
    const result = await supabase.functions.invoke<{
      approved: boolean;
      reasons?: string[];
      error?: string;
    }>('moderate-avatar', { body: { image: dataUrl } });
    data = result.data;
    error = result.error;
  } catch (e) {
    // Network / function-not-deployed errors land here.
    console.warn('[moderateAvatar] moderation unavailable — proceeding without it:', e);
    return;
  }

  if (error) {
    // Function exists but errored. Most common cause: not deployed yet, missing
    // OPENAI_API_KEY, or transient network. Fail-open with a warning.
    console.warn('[moderateAvatar] moderation function error — proceeding without it:', error.message);
    return;
  }

  if (!data) {
    console.warn('[moderateAvatar] moderation returned no result — proceeding without it');
    return;
  }

  // Function explicitly rejected the image — this IS a hard block.
  if (data.approved === false) {
    if (data.error) throw new Error(data.error);
    throw new AvatarRejectedError(data.reasons ?? ['flagged']);
  }

  // approved === true (or anything truthy) → proceed.
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

  // 2. Moderate — throws AvatarRejectedError if flagged
  await moderateAvatar(dataUrl);

  // 3. Upload
  const path = `${user.id}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const cacheBustedUrl = `${data.publicUrl}?t=${Date.now()}`;

  // 4. Save to profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: cacheBustedUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (profileError) throw profileError;

  return cacheBustedUrl;
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
