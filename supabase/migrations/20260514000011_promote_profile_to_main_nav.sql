-- Promote Profile to the main 4-tab nav; demote Settings into More dropdown.
-- This rewrites favourite_nav_tabs for any user whose preferences still hold
-- the old default ['home','sessions','connections','settings'].

UPDATE public.user_ui_preferences
SET favourite_nav_tabs = '["home","sessions","connections","profile"]'::jsonb
WHERE favourite_nav_tabs = '["home","sessions","connections","settings"]'::jsonb;
