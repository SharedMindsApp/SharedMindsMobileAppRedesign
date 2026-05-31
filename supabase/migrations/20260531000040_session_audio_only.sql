-- Audio-only sessions: voice + avatar coworking, no video.
--
-- Why: video is ~4× more expensive per participant-minute on Daily. Most
-- coworking is heads-down and doesn't need video, so audio-only sessions let
-- us serve the bulk of usage (especially the free tier) cheaply. The flag is
-- enforced at the Daily token layer (permissions.canSend = ['audio']) so a
-- client can't publish video even if it tried — guaranteeing audio billing.

alter table public.focus_sessions
  add column if not exists audio_only boolean not null default false;

comment on column public.focus_sessions.audio_only is
  'When true, the Daily room is voice-only (no camera/screen). ~4× cheaper. Enforced via meeting-token canSend=[audio].';
