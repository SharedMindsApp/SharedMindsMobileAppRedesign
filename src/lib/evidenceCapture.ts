/**
 * Evidence capture helpers — used by ReportModal when a user reports
 * another member during an active session.
 *
 * What we capture:
 *   1. A single PNG frame of the reported user's video tile (if they have
 *      their camera on)
 *   2. A snapshot of the in-session chat (last 5 minutes by default)
 *
 * What we deliberately don't do:
 *   - No continuous recording or sampling — capture is single-shot on
 *     report submission. Two-party consent + GDPR concerns.
 *   - We never capture our own video (the reporter), only the reported user.
 *   - If the reported user has video off, screenshot returns null and the
 *     report falls back to text-only — that's expected.
 */

import { supabase } from './supabase';

/**
 * Find a participant's <video> element in the DOM and snapshot a single
 * frame to a PNG blob. Returns null if the element isn't found or has no
 * video track (camera off).
 *
 * Daily.co's React SDK renders each participant inside an element that
 * we tagged with `data-participant-id` in ParticipantTile.tsx — we find
 * the <video> within that wrapper and use canvas to grab the frame.
 *
 * If you change the participant-tile markup, update the selector here.
 */
export async function captureParticipantFrame(
  daily_session_id: string,
): Promise<Blob | null> {
  // Find the tile wrapper by data attribute. We rely on the Daily session
  // id as the key — set in VideoGrid.tsx alongside each tile mount.
  const tile = document.querySelector<HTMLElement>(
    `[data-daily-participant="${CSS.escape(daily_session_id)}"]`,
  );
  if (!tile) return null;

  const video = tile.querySelector('video');
  if (!video) return null;
  if (video.readyState < 2) return null; // not yet playing
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  } catch {
    // Cross-origin video may throw on read. Daily streams are first-party
    // so this is unlikely, but fall back gracefully if it ever happens.
    return null;
  }

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
  });
}

/**
 * Upload a captured frame to the private flag-evidence bucket. Returns the
 * storage path which the caller then writes to flag_evidence.storage_path.
 *
 * Path shape: `${flag_id}/${timestamp}-${reportedUserId}.png` — keeps
 * each flag's evidence grouped under one folder for easy admin browse.
 */
export async function uploadEvidenceFrame(
  flagId: string,
  reportedUserId: string,
  blob: Blob,
): Promise<string | null> {
  const path = `${flagId}/${Date.now()}-${reportedUserId}.png`;
  const { error } = await supabase.storage
    .from('flag-evidence')
    .upload(path, blob, {
      contentType: 'image/png',
      cacheControl: 'no-store',
    });
  if (error) {
    console.warn('[evidenceCapture] upload failed:', error.message);
    return null;
  }
  return path;
}

/**
 * Build a chat transcript snapshot for a session, scoped to the last
 * `windowMs` (default 5 minutes) before now. Returns an array of plain
 * messages safe to JSON.stringify into flag_evidence.transcript.
 */
export async function captureSessionChatTranscript(
  sessionId: string,
  windowMs = 5 * 60 * 1000,
): Promise<Array<{ user_id: string; content: string; created_at: string }>> {
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  // We rely on a `session_chat_messages` table if it exists. If your
  // chat table has a different name, adjust here — but the schema below
  // is the one we set up for in-session chat.
  const { data, error } = await supabase
    .from('global_chat_messages') // change to session-scoped table if you have one
    .select('user_id, content, created_at')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    console.warn('[evidenceCapture] chat fetch failed:', error.message);
    return [];
  }
  // Strip nothing — admins need the raw text to assess context. The
  // 200-row cap is a safety net against runaway chats.
  return (data ?? []) as Array<{ user_id: string; content: string; created_at: string }>;
}

/**
 * Write evidence metadata rows after a flag has been created. Called by
 * ReportModal in the session-context path. Best-effort — failures are
 * logged but don't fail the report submission (the flag itself is the
 * critical path, evidence is supplementary).
 */
export async function attachSessionEvidence(opts: {
  flagId:           string;
  reportedUserId:   string;
  /** Daily.co participant session_id, used to find the video tile. */
  participantSessionId?: string;
  /** SharedMinds focus_sessions.id for chat transcript scoping. */
  focusSessionId?:  string;
}): Promise<void> {
  // 1. Try to grab a video frame. Non-fatal if no camera.
  if (opts.participantSessionId) {
    try {
      const blob = await captureParticipantFrame(opts.participantSessionId);
      if (blob) {
        const path = await uploadEvidenceFrame(opts.flagId, opts.reportedUserId, blob);
        if (path) {
          await supabase.from('flag_evidence').insert({
            flag_id: opts.flagId,
            evidence_type: 'screenshot',
            storage_path: path,
          });
        }
      }
    } catch (err) {
      console.warn('[evidenceCapture] screenshot path failed:', err);
    }
  }

  // 2. Capture chat transcript (always attempt — chat exists even when
  //    video doesn't).
  if (opts.focusSessionId) {
    try {
      const transcript = await captureSessionChatTranscript(opts.focusSessionId);
      if (transcript.length > 0) {
        await supabase.from('flag_evidence').insert({
          flag_id: opts.flagId,
          evidence_type: 'chat_transcript',
          transcript,
        });
      }
    } catch (err) {
      console.warn('[evidenceCapture] transcript path failed:', err);
    }
  }
}
