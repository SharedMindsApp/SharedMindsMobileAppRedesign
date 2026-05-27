-- Dusk album — realign DB file_paths with what's actually in Storage.
--
-- Migration 20260527000013 seeded file_paths as slugified strings
-- (e.g. `dusk/court-of-lions.mp3`) on the assumption files would be
-- uploaded under those exact paths. In practice the user uploaded the
-- MP3s with their human-readable titles preserved ("Court of Lions.mp3"
-- etc.) which is fine — Supabase Storage handles spaces + mixed case
-- in keys and URL-encodes them in the public URL.
--
-- Rather than ask the user to rename 31 files in the Storage UI, we
-- update the DB to point at the actual stored filenames. Spaces will
-- be URL-encoded to %20 when getPublicUrl() builds the playback URL.

-- ── Re-point each row to its actual storage filename ────────────

UPDATE public.session_tracks SET file_path = 'dusk/Caravanserai.mp3'           WHERE file_path = 'dusk/caravanserai.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Silk Road.mp3'              WHERE file_path = 'dusk/silk-road.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Desert Stillness.mp3'       WHERE file_path = 'dusk/desert-stillness.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Dune Hush.mp3'              WHERE file_path = 'dusk/dune-hush.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Desert Trance.mp3'          WHERE file_path = 'dusk/desert-trance.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Sand Mirage.mp3'            WHERE file_path = 'dusk/sand-mirage.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Forgotten Pastures.mp3'     WHERE file_path = 'dusk/forgotten-pastures.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Wandering Pastures.mp3'     WHERE file_path = 'dusk/wandering-pastures.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Hammam.mp3'                 WHERE file_path = 'dusk/hammam.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Marble Hammam.mp3'          WHERE file_path = 'dusk/marble-hammam.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Harbor Lullaby.mp3'         WHERE file_path = 'dusk/harbor-lullaby.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Quay Lullaby.mp3'           WHERE file_path = 'dusk/quay-lullaby.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Harbor Nights.mp3'          WHERE file_path = 'dusk/harbor-nights.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Harbor Stars.mp3'           WHERE file_path = 'dusk/harbor-stars.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Infinite Pattern.mp3'       WHERE file_path = 'dusk/infinite-pattern.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Endless Tile.mp3'           WHERE file_path = 'dusk/endless-tile.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/La Alhambra.mp3'            WHERE file_path = 'dusk/la-alhambra.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Court of Lions.mp3'         WHERE file_path = 'dusk/court-of-lions.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Ledger of Stone.mp3'        WHERE file_path = 'dusk/ledger-of-stone.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Maqam Study.mp3'            WHERE file_path = 'dusk/maqam-study.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Hijaz Study.mp3'            WHERE file_path = 'dusk/hijaz-study.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Midnight Oil.mp3'           WHERE file_path = 'dusk/midnight-oil.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Late Lamp.mp3'              WHERE file_path = 'dusk/late-lamp.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Mirage.mp3'                 WHERE file_path = 'dusk/mirage.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Heat Shimmer.mp3'           WHERE file_path = 'dusk/heat-shimmer.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Saudade Sem Fim.mp3'        WHERE file_path = 'dusk/saudade-sem-fim.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Saudade do Mar.mp3'         WHERE file_path = 'dusk/saudade-do-mar.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/The Well of Stars.mp3'      WHERE file_path = 'dusk/the-well-of-stars.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Star Cistern.mp3'           WHERE file_path = 'dusk/star-cistern.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Whispers of the Desert.mp3' WHERE file_path = 'dusk/whispers-of-the-desert.mp3';
UPDATE public.session_tracks SET file_path = 'dusk/Whispering Dunes.mp3'       WHERE file_path = 'dusk/whispering-dunes.mp3';
