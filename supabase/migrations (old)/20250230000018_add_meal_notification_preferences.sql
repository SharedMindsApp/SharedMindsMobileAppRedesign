/*
  # Meal Notification Preferences
  
  Adds meal-specific notification preferences to the notification_preferences table.
  These preferences control when and how meal notifications are sent.
*/

-- Add meal notification preference columns
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS meal_notifications_enabled BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS meal_upcoming_reminder_minutes INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS meal_cook_start_enabled BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS meal_check_in_enabled BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS meal_missed_enabled BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS meal_quiet_hours_start TIME,
  ADD COLUMN IF NOT EXISTS meal_quiet_hours_end TIME;

-- Comments
COMMENT ON COLUMN public.notification_preferences.meal_notifications_enabled IS 'Master toggle for all meal notifications';
COMMENT ON COLUMN public.notification_preferences.meal_upcoming_reminder_minutes IS 'Minutes before meal to send reminder (null = disabled)';
COMMENT ON COLUMN public.notification_preferences.meal_cook_start_enabled IS 'Enable cook start prompts';
COMMENT ON COLUMN public.notification_preferences.meal_check_in_enabled IS 'Enable meal check-in prompts (most important)';
COMMENT ON COLUMN public.notification_preferences.meal_missed_enabled IS 'Enable missed meal prompts (opt-in only)';
COMMENT ON COLUMN public.notification_preferences.meal_quiet_hours_start IS 'Start of quiet hours (HH:mm format)';
COMMENT ON COLUMN public.notification_preferences.meal_quiet_hours_end IS 'End of quiet hours (HH:mm format)';
