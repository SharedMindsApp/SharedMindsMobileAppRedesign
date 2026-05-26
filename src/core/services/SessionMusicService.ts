// SessionMusicService
//
// Thin wrapper around the `session_tracks` table + `session-music` Storage
// bucket. Bucket is public, so we build URLs directly with `getPublicUrl()`
// (no signing round-trip on every play).

import { supabase } from '../../lib/supabase';

// 6 categories organised around USER STATE, not cognitive load.
// 7 incoming states map to these — Restless + Scattered share Anchor.
export type MusicCategory =
  | 'calm'    // 🌊 stressed / overwhelmed   → Alpha 9 Hz
  | 'anchor'  // ⚓ scattered or restless    → Low beta 13 Hz
  | 'lift'    // ☀️ low energy / foggy       → Alpha-beta 10 Hz
  | 'flow'    // 🌀 neutral / ready          → Low beta 14 Hz
  | 'deep'    // 🌑 already hyperfocused     → Gamma 40 Hz
  | 'open';   // 🌿 creative / brainstorming → Theta-alpha 8 Hz

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
  { id: 'open',   label: 'Open',   glyph: '🌿', character: 'Organic, spacious. Piano, guitar, nature.',   forState: 'Creative / brainstorming', targetHz: 8,  baseL: 200, baseR: 208 },
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
    return (data ?? []).map((row: any) => ({
      ...row,
      url: publicUrlFor(row.file_path),
    })) as SessionTrack[];
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
    return { ...data, url: publicUrlFor(data.file_path) } as SessionTrack;
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
    return (data ?? []).map((row: any) => ({
      ...row,
      url: publicUrlFor(row.file_path),
    })) as SessionTrack[];
  },
};
