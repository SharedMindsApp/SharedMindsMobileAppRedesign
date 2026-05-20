import { supabase } from '../../lib/supabase';

export interface ProfileStats {
  totalSessions: number;
  completedSessions: number;
  completionRate: number; // 0–100
  finishedCount: number;
  currentStreak: number; // consecutive days with a completed session
  connectionCount: number;
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
    .select('status, session_outcome, ended_at, end_time')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('ended_at', { ascending: false });

  const completed = sessions ?? [];
  const totalCompleted = completed.length;
  const finished = completed.filter((s) => s.session_outcome === 'finished').length;
  const completionRate = totalCompleted > 0 ? Math.round((finished / totalCompleted) * 100) : 0;

  // Streak: count consecutive days (from today backwards) that have at least one completed session
  const daySet = new Set(
    completed.map((s) => {
      const d = new Date(s.ended_at ?? s.end_time ?? '');
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (daySet.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // Connection count
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
    currentStreak: streak,
    connectionCount: connCount ?? 0,
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
