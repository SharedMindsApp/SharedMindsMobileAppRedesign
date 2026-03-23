/*
  # Create Screen Time Tracker Template
  
  This migration creates a global tracker template for Screen Time tracking
  with app usage monitoring and soft lockout session management.
  
  Template: Screen Time Tracker
*/

-- Helper function to check if template already exists (idempotent)
DO $$
DECLARE
  template_exists boolean;
BEGIN
  -- Check if Screen Time Tracker template already exists
  SELECT EXISTS (
    SELECT 1 FROM tracker_templates
    WHERE scope = 'global'
      AND name = 'Screen Time Tracker'
  ) INTO template_exists;
  
  -- Only proceed if template doesn't exist
  IF NOT template_exists THEN
    
    -- Screen Time Tracker Template
    INSERT INTO tracker_templates (
      owner_id,
      created_by,
      name,
      description,
      field_schema,
      entry_granularity,
      is_system_template,
      scope,
      is_locked,
      published_at,
      version,
      tags,
      chart_config
    ) VALUES (
      NULL, -- Global template has no owner
      NULL, -- System-created
      'Screen Time Tracker',
      'Track your phone usage, app activity, and manage soft lockout sessions to reduce screen time. Similar to ScreenZen, helping you break phone addiction and improve digital wellness.',
      jsonb_build_array(
        -- App Usage Tracking
        jsonb_build_object(
          'id', 'app_name',
          'label', 'App Name',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 200),
          'description', 'Name of the app being tracked or blocked'
        ),
        jsonb_build_object(
          'id', 'app_category',
          'label', 'App Category',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 100),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'social', 'label', 'Social Media'),
            jsonb_build_object('value', 'entertainment', 'label', 'Entertainment'),
            jsonb_build_object('value', 'games', 'label', 'Games'),
            jsonb_build_object('value', 'productivity', 'label', 'Productivity'),
            jsonb_build_object('value', 'shopping', 'label', 'Shopping'),
            jsonb_build_object('value', 'news', 'label', 'News'),
            jsonb_build_object('value', 'other', 'label', 'Other')
          )
        ),
        jsonb_build_object(
          'id', 'usage_minutes',
          'label', 'Usage Time (minutes)',
          'type', 'number',
          'validation', jsonb_build_object('min', 0, 'required', true),
          'default', 0,
          'description', 'Time spent using the app in minutes'
        ),
        jsonb_build_object(
          'id', 'session_type',
          'label', 'Session Type',
          'type', 'text',
          'validation', jsonb_build_object('required', true),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'tracking', 'label', 'Regular Tracking'),
            jsonb_build_object('value', 'lockout', 'label', 'Lockout Session'),
            jsonb_build_object('value', 'blocked', 'label', 'Blocked Attempt'),
            jsonb_build_object('value', 'break', 'label', 'Break Time'),
            jsonb_build_object('value', 'focus', 'label', 'Focus Mode')
          ),
          'default', 'tracking'
        ),
        jsonb_build_object(
          'id', 'lockout_duration',
          'label', 'Lockout Duration (minutes)',
          'type', 'number',
          'validation', jsonb_build_object('min', 1, 'max', 1440),
          'description', 'Duration of soft lockout session in minutes'
        ),
        jsonb_build_object(
          'id', 'lockout_trigger',
          'label', 'Lockout Trigger',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 100),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'time_limit', 'label', 'Time Limit Reached'),
            jsonb_build_object('value', 'app_blocked', 'label', 'App in Blocked List'),
            jsonb_build_object('value', 'schedule', 'label', 'Scheduled Lockout'),
            jsonb_build_object('value', 'manual', 'label', 'Manual Lockout'),
            jsonb_build_object('value', 'focus_mode', 'label', 'Focus Mode Active')
          ),
          'description', 'Reason why lockout was triggered'
        ),
        jsonb_build_object(
          'id', 'unlock_method',
          'label', 'Unlock Method',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 100),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'time_expired', 'label', 'Time Expired'),
            jsonb_build_object('value', 'manual_unlock', 'label', 'Manual Unlock'),
            jsonb_build_object('value', 'break_completed', 'label', 'Break Completed'),
            jsonb_build_object('value', 'emergency_override', 'label', 'Emergency Override')
          ),
          'description', 'How the lockout was ended'
        ),
        jsonb_build_object(
          'id', 'blocked_apps',
          'label', 'Blocked Apps (comma-separated)',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000),
          'description', 'List of apps that were blocked during this session'
        ),
        jsonb_build_object(
          'id', 'total_screen_time',
          'label', 'Total Screen Time Today (minutes)',
          'type', 'number',
          'validation', jsonb_build_object('min', 0),
          'default', 0,
          'description', 'Cumulative screen time for the day'
        ),
        jsonb_build_object(
          'id', 'pickups',
          'label', 'Phone Pickups',
          'type', 'number',
          'validation', jsonb_build_object('min', 0),
          'default', 0,
          'description', 'Number of times phone was picked up'
        ),
        jsonb_build_object(
          'id', 'notifications_received',
          'label', 'Notifications Received',
          'type', 'number',
          'validation', jsonb_build_object('min', 0),
          'default', 0,
          'description', 'Number of notifications received'
        ),
        jsonb_build_object(
          'id', 'goals_met',
          'label', 'Daily Goal Met',
          'type', 'boolean',
          'default', false,
          'description', 'Whether daily screen time goal was met'
        ),
        jsonb_build_object(
          'id', 'notes',
          'label', 'Notes / Reflection',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 2000),
          'description', 'Reflections on screen time usage or lockout experience'
        )
      ),
      'session', -- Session-based entries for detailed tracking (can have multiple entries per day)
      true, -- System template
      'global', -- Global scope
      true, -- Locked (admin-only edits)
      NOW() - INTERVAL '1 day', -- Published yesterday to appear early in list
      1, -- Version 1
      jsonb_build_array('screen-time', 'digital-wellness', 'productivity', 'self-control', 'health', 'mobile', 'tracking'),
      jsonb_build_object(
        'enabled', true,
        'charts', jsonb_build_array(
          jsonb_build_object(
            'type', 'time_series',
            'field_id', 'usage_minutes',
            'title', 'App Usage Over Time',
            'config', jsonb_build_object(
              'yAxisLabel', 'Minutes',
              'stacked', true,
              'groupBy', 'app_name'
            )
          ),
          jsonb_build_object(
            'type', 'pie',
            'field_id', 'app_category',
            'title', 'Time by App Category',
            'config', jsonb_build_object()
          ),
          jsonb_build_object(
            'type', 'bar',
            'field_id', 'pickups',
            'title', 'Phone Pickups per Day',
            'config', jsonb_build_object(
              'yAxisLabel', 'Pickups'
            )
          ),
          jsonb_build_object(
            'type', 'line',
            'field_id', 'total_screen_time',
            'title', 'Total Screen Time Trend',
            'config', jsonb_build_object(
              'yAxisLabel', 'Minutes',
              'showGoal', true
            )
          )
        )
      )
    );
    
    RAISE NOTICE 'Screen Time Tracker template created successfully';
  ELSE
    RAISE NOTICE 'Screen Time Tracker template already exists, skipping';
  END IF;
END $$;
