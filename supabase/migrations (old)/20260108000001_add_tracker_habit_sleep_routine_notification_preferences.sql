/**
 * Add Tracker, Habit, Sleep, and Routine Notification Preferences
 * 
 * Extends notification preferences to support new features.
 * All new categories default to false (opt-in model).
 */

-- Add new category preferences (in-app)
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS tracker_reminders BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS habit_reminders BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sleep_reminders BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS routine_reminders BOOLEAN NOT NULL DEFAULT false;

-- Add new category preferences (push)
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS tracker_reminders_push BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS habit_reminders_push BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sleep_reminders_push BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS routine_reminders_push BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.notification_preferences.tracker_reminders IS 'In-app notifications for tracker reminders and missed actions';
COMMENT ON COLUMN public.notification_preferences.habit_reminders IS 'In-app notifications for habit reminders and streak updates';
COMMENT ON COLUMN public.notification_preferences.sleep_reminders IS 'In-app notifications for sleep reminders and summaries';
COMMENT ON COLUMN public.notification_preferences.routine_reminders IS 'In-app notifications for routine reminders and completions';

COMMENT ON COLUMN public.notification_preferences.tracker_reminders_push IS 'Push notifications for tracker reminders and missed actions';
COMMENT ON COLUMN public.notification_preferences.habit_reminders_push IS 'Push notifications for habit reminders and streak updates';
COMMENT ON COLUMN public.notification_preferences.sleep_reminders_push IS 'Push notifications for sleep reminders and summaries';
COMMENT ON COLUMN public.notification_preferences.routine_reminders_push IS 'Push notifications for routine reminders and completions';
