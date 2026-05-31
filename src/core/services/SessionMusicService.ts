// SessionMusicService
//
// Thin wrapper around the `session_tracks` table + `session-music` Storage
// bucket. Bucket is public, so we build URLs directly with `getPublicUrl()`
// (no signing round-trip on every play).

import { supabase } from '../../lib/supabase';

// 9 categories organised around USER STATE, not cognitive load.
// zen + dusk both target Theta–alpha 8 Hz but offer different sonic
// identities (East Asian instrumental vs Middle Eastern modal) so users
// can match their creative mood to a cultural/aesthetic vibe rather
// than just a brainwave target.
export type MusicCategory =
  | 'calm'    // 🌊 stressed / overwhelmed     → Alpha 9 Hz
  | 'anchor'  // ⚓ scattered or restless      → Low beta 13 Hz
  | 'lift'    // ☀️ low energy / foggy         → Alpha-beta 10 Hz
  | 'flow'    // 🌀 neutral / ready            → Low beta 14 Hz
  | 'deep'    // 🌑 already hyperfocused       → Gamma 40 Hz
  | 'zen'     // 🎋 creative / brainstorming   → Theta-alpha 8 Hz (East Asian)
  | 'dusk'    // 🌙 creative / contemplative   → Theta-alpha 8 Hz (Middle Eastern)
  | 'drive'   // ⚡ tired but must push through → Mid-beta 16 Hz
  | 'score';  // 🎬 need gravitas / purposeful  → Alpha 12 Hz

export interface MusicCategoryMeta {
  id: MusicCategory;
  label: string;
  glyph: string;
  /** Short one-liner describing the music character. */
  character: string;
  /** Which arrival state this category targets. */
  forState: string;
  /** Binaural beat frequency target (Hz) for this state. */
  targetHz: number;
  /** Left/right base tones (Hz) used to produce the beat. */
  baseL: number;
  baseR: number;
}

/** Single source of truth for category metadata. Keep aligned with the
 *  SQL function `music_category_target_hz()` in migration 20260526000010. */
export const MUSIC_CATEGORIES: MusicCategoryMeta[] = [
  { id: 'calm',   label: 'Calm',   glyph: '🌊', character: 'No rhythm. Slow piano, strings, nature.',     forState: 'Stressed / overwhelmed',  targetHz: 9,  baseL: 200, baseR: 209 },
  { id: 'anchor', label: 'Anchor', glyph: '⚓', character: 'Gentle rhythmic pulse. Soft lofi groove.',     forState: 'Scattered or restless',   targetHz: 13, baseL: 200, baseR: 213 },
  { id: 'lift',   label: 'Lift',   glyph: '☀️', character: 'Brighter, warm. More movement than Calm.',    forState: 'Low energy / foggy',      targetHz: 10, baseL: 200, baseR: 210 },
  { id: 'flow',   label: 'Flow',   glyph: '🌀', character: 'Steady lofi or downtempo. Unobtrusive.',      forState: 'Neutral / ready',         targetHz: 14, baseL: 200, baseR: 214 },
  { id: 'deep',   label: 'Deep',   glyph: '🌑', character: 'Invisible dark ambient. No melody.',           forState: 'Already hyperfocused',    targetHz: 40, baseL: 200, baseR: 240 },
  { id: 'zen',    label: 'Zen',    glyph: '🎋', character: 'Japanese / East Asian instrumental. Shakuhachi, koto.', forState: 'Creative / brainstorming',  targetHz: 8,  baseL: 200, baseR: 208 },
  { id: 'dusk',   label: 'Dusk',   glyph: '🌙', character: 'Middle Eastern modal scales. Oud, ney, maqam.',         forState: 'Creative / contemplative',  targetHz: 8,  baseL: 200, baseR: 208 },
  { id: 'drive',  label: 'Drive',  glyph: '⚡', character: 'Deep house, minimal. External rhythm as fuel.',         forState: 'Tired but pushing through',  targetHz: 16, baseL: 200, baseR: 216 },
  { id: 'score',  label: 'Score',  glyph: '🎬', character: 'Cinematic orchestral. Quiet gravitas.',                 forState: 'Need gravitas / purposeful', targetHz: 12, baseL: 200, baseR: 212 },
];

export function categoryMeta(id: MusicCategory): MusicCategoryMeta {
  return MUSIC_CATEGORIES.find((c) => c.id === id) ?? MUSIC_CATEGORIES[3]; // flow fallback
}

export interface SessionTrack {
  id: string;
  title: string;
  artist: string | null;
  category: MusicCategory;
  file_path: string;
  duration_seconds: number | null;
  attribution: string | null;
  is_active: boolean;
  sort_weight: number;
  created_at: string;
  /** Computed: public CDN URL for the file. */
  url: string;
}

const BUCKET = 'session-music';

/** Build the public URL for a track file. The bucket is public-read so this
 *  works for everyone without a signed URL. */
function publicUrlFor(filePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Make a track name display-ready. A human title (it has a space, e.g.
 * "Raga Dawn Halo") is trusted as-is. A slug / filename
 * ("zen/raga-dawn-halo.mp3" or "raga-dawn-halo") is stripped of its folder
 * + extension, de-hyphenated, and Title-Cased → "Raga Dawn Halo". Idempotent
 * and safe for apostrophes (those titles already contain spaces, so they're
 * returned untouched).
 */
export function prettifyTrackTitle(raw: string | null | undefined): string {
  const input = (raw ?? '').trim();
  if (!input) return 'Untitled';
  // Strip any folder prefix + file extension (in case a file_path slips in).
  const base = input.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '');
  // Already a human title (contains a space) → trust it verbatim.
  if (base.includes(' ')) return base;
  // Slug → words + Title Case.
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Map a raw DB row → SessionTrack with a public URL + display-ready title. */
function toTrack(row: Record<string, unknown>): SessionTrack {
  return {
    ...(row as Omit<SessionTrack, 'url' | 'title'>),
    title: prettifyTrackTitle((row.title as string) || (row.file_path as string)),
    url: publicUrlFor(row.file_path as string),
  } as SessionTrack;
}

export const SessionMusicService = {
  /**
   * List all active tracks in a category, ordered by sort_weight DESC. The
   * caller decides whether to shuffle, loop, or sequence them.
   */
  async listActiveTracks(category: MusicCategory): Promise<SessionTrack[]> {
    const { data, error } = await supabase
      .from('session_tracks')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('sort_weight', { ascending: false });
    if (error) {
      console.error('[SessionMusicService] listActiveTracks', error);
      return [];
    }
    return (data ?? []).map(toTrack);
  },

  /**
   * Weighted-random pick. Each track contributes `sort_weight` lottery
   * tickets; we draw one. A track at weight 200 is twice as likely as one
   * at weight 100. Returns null when the category has no active tracks.
   */
  async pickRandomTrack(category: MusicCategory): Promise<SessionTrack | null> {
    const tracks = await SessionMusicService.listActiveTracks(category);
    if (tracks.length === 0) return null;
    const totalWeight = tracks.reduce((s, t) => s + Math.max(1, t.sort_weight), 0);
    let r = Math.random() * totalWeight;
    for (const t of tracks) {
      r -= Math.max(1, t.sort_weight);
      if (r <= 0) return t;
    }
    // Floating-point safety net — return last
    return tracks[tracks.length - 1];
  },

  /**
   * Same as pickRandomTrack but with a fallback chain: if the preferred
   * category has no active tracks, try every OTHER category in the
   * declared order and return the first non-empty pick. Useful for
   * onboarding when the admin has only populated some categories — we
   * want music to "just play" rather than the user opening the player
   * and discovering "No tracks in this mood yet."
   *
   * Returns null only when literally every category is empty.
   */
  async pickRandomTrackWithFallback(preferred: MusicCategory): Promise<SessionTrack | null> {
    const first = await SessionMusicService.pickRandomTrack(preferred);
    if (first) return first;
    for (const meta of MUSIC_CATEGORIES) {
      if (meta.id === preferred) continue;
      const t = await SessionMusicService.pickRandomTrack(meta.id);
      if (t) return t;
    }
    return null;
  },

  /**
   * "Shuffle-all-then-loop" queue. Plays every track in the category
   * once in a random order, then reshuffles and starts the cycle
   * again — Spotify-style shuffle, not random-with-replacement. Falls
   * back to other categories if the preferred one is empty.
   *
   * The queue is module-scoped state (see _queues / _queueCategoryKey
   * below). It resets automatically when:
   *   • the category changes (different mood → new queue)
   *   • the queue drains (all tracks played → reshuffle)
   *   • the user calls resetShuffleQueue() explicitly
   *
   * Returns null only when literally every category is empty.
   */
  async nextInShuffle(preferred: MusicCategory): Promise<SessionTrack | null> {
    // Decide which category to actually pull from (may fall back).
    const sourceCategory = await pickFirstNonEmptyCategory(preferred);
    if (!sourceCategory) return null;

    // If we've switched categories OR drained the queue, rebuild it.
    const cached = _queues.get(sourceCategory);
    if (!cached || cached.length === 0) {
      const tracks = await SessionMusicService.listActiveTracks(sourceCategory);
      if (tracks.length === 0) return null;
      _queues.set(sourceCategory, shuffleByWeight(tracks));
    }

    const queue = _queues.get(sourceCategory)!;
    const next = queue.shift() ?? null;
    return next;
  },

  /**
   * Forces the next nextInShuffle() call to rebuild the queue.
   * Useful when the admin adds/removes tracks mid-session — though in
   * practice that's rare enough that we don't bother to subscribe.
   */
  resetShuffleQueue(category?: MusicCategory): void {
    if (category) _queues.delete(category);
    else _queues.clear();
  },

  /**
   * Fetch a single track by id — used by participants who receive a
   * broadcast from the host with just the track id.
   */
  async getTrackById(id: string): Promise<SessionTrack | null> {
    const { data, error } = await supabase
      .from('session_tracks')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return toTrack(data);
  },

  /**
   * For convenience: list ALL active tracks regardless of category, used
   * when the player UI lets the user manually browse.
   */
  async listAllActiveTracks(): Promise<SessionTrack[]> {
    const { data, error } = await supabase
      .from('session_tracks')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('sort_weight', { ascending: false });
    if (error) {
      console.error('[SessionMusicService] listAllActiveTracks', error);
      return [];
    }
    return (data ?? []).map(toTrack);
  },
};

// ── Shuffle-queue internals ────────────────────────────────────────
// Module-scoped state so the queue survives across React re-renders.
// There's only ever one music session active per page, so a global
// map keyed by category is fine.

const _queues = new Map<MusicCategory, SessionTrack[]>();

/** Weighted Fisher-Yates: tracks with higher sort_weight are more
 *  likely to land near the FRONT of the shuffle (so they play first
 *  / more often within a cycle), but every track is guaranteed to
 *  appear exactly once before the queue drains. This is the cleanest
 *  way to honour weights without violating the "play all then loop"
 *  contract. */
function shuffleByWeight(tracks: SessionTrack[]): SessionTrack[] {
  // Assign each track a "shuffle key" of -log(rand) / weight. Sorting
  // ascending by this key is mathematically equivalent to weighted
  // sampling without replacement (Efraimidis-Spirakis algorithm).
  const keyed = tracks.map((t) => {
    const w = Math.max(1, t.sort_weight ?? 1);
    const u = Math.max(1e-12, Math.random());
    return { track: t, key: -Math.log(u) / w };
  });
  keyed.sort((a, b) => a.key - b.key);
  return keyed.map((k) => k.track);
}

/** Walk the requested category first, then every other category in
 *  declared order, returning the FIRST one that has at least one
 *  active track. Returns null when literally everything is empty. */
async function pickFirstNonEmptyCategory(
  preferred: MusicCategory
): Promise<MusicCategory | null> {
  const order: MusicCategory[] = [
    preferred,
    ...MUSIC_CATEGORIES.map((m) => m.id).filter((id) => id !== preferred),
  ];
  for (const cat of order) {
    // Cheap existence check — count is faster than a full select.
    const { count, error } = await supabase
      .from('session_tracks')
      .select('id', { count: 'exact', head: true })
      .eq('category', cat)
      .eq('is_active', true);
    if (error) {
      console.warn('[SessionMusicService] count failed for', cat, error);
      continue;
    }
    if ((count ?? 0) > 0) return cat;
  }
  return null;
}
