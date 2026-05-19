-- Move Profile out of the main nav; consolidate behind the avatar dropdown.
-- Default favourites are now Home · Sessions · Connections (3 tabs).

UPDATE public.user_ui_preferences
SET favourite_nav_tabs = '["home","sessions","connections"]'::jsonb
WHERE favourite_nav_tabs = '["home","sessions","connections","profile"]'::jsonb
   OR favourite_nav_tabs = '["home","sessions","connections","settings"]'::jsonb;
