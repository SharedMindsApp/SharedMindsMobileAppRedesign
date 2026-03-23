/*
  # Add Comprehensive Chart Configurations to All Tracker Templates
  
  This migration updates all existing tracker templates to include appropriate
  chart configurations for analytics visualization. Each tracker gets multiple
  charts where appropriate to provide comprehensive insights.
  
  Charts added:
  - Time series charts for numeric/rating fields over time
  - Bar charts for categorical data distribution
  - Pie charts for category breakdowns
  - Heatmaps for daily status tracking
  - Line charts for trends
*/

-- Helper function to update chart_config for a template
DO $$
DECLARE
  template_id_val UUID;
BEGIN
  -- 1. Mood Tracker: Add charts for mood rating and time of day
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Mood Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'mood_rating',
          'title', 'Mood Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Mood (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'heatmap',
          'field_id', 'mood_rating',
          'title', 'Mood Heatmap by Day'
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'time_of_day',
          'title', 'Mood by Time of Day'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 2. Energy Level Tracker: Add charts for energy levels
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Energy Level Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'morning_energy',
          'title', 'Morning Energy Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Energy (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'afternoon_energy',
          'title', 'Afternoon Energy Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Energy (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'evening_energy',
          'title', 'Evening Energy Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Energy (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'line',
          'field_id', 'morning_energy',
          'title', 'Energy Comparison: Morning vs Afternoon vs Evening',
          'config', jsonb_build_object(
            'groupBy', jsonb_build_array('morning_energy', 'afternoon_energy', 'evening_energy'),
            'yAxisLabel', 'Energy (1-5)'
          )
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 3. Water Intake Tracker: Add chart for cups/glasses
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Water Intake Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'cups_glasses',
          'title', 'Water Intake Over Time',
          'config', jsonb_build_object(
            'yAxisLabel', 'Cups/Glasses'
          )
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'cups_glasses',
          'title', 'Daily Water Intake'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 4. Medication Tracker: No numeric fields, skip charts
  -- (Text-based tracker, no charts needed)

  -- 5. Symptom Tracker: Add charts for severity and symptom type
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Symptom Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'severity',
          'title', 'Symptom Severity Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Severity (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'symptom_type',
          'title', 'Symptom Type Frequency'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 6. Stress Level Tracker: Add chart for stress level
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Stress Level Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'stress_level',
          'title', 'Stress Level Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Stress Level (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'heatmap',
          'field_id', 'stress_level',
          'title', 'Stress Level Heatmap'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 7. Productivity Tracker: Add charts for focus and tasks
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Productivity Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'focus_level',
          'title', 'Focus Level Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Focus Level (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'tasks_completed',
          'title', 'Tasks Completed Over Time',
          'config', jsonb_build_object(
            'yAxisLabel', 'Tasks Completed'
          )
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'focus_level',
          'title', 'Focus Level Distribution'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 8. Social Connection Tracker: Add charts for quality and duration
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Social Connection Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'quality_rating',
          'title', 'Interaction Quality Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Quality (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'duration_minutes',
          'title', 'Interaction Duration Over Time',
          'config', jsonb_build_object(
            'yAxisLabel', 'Duration (minutes)'
          )
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'interaction_type',
          'title', 'Interaction Types'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 9. Weather & Environment Tracker: Add charts for temperature and humidity
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Weather & Environment Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'temperature',
          'title', 'Temperature Over Time',
          'config', jsonb_build_object(
            'yAxisLabel', 'Temperature (°F/°C)'
          )
        ),
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'humidity',
          'title', 'Humidity Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 0,
            'yAxisMax', 100,
            'yAxisLabel', 'Humidity (%)'
          )
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'weather',
          'title', 'Weather Conditions'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 10. Sleep Tracker: Add charts for duration and quality
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Sleep Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'duration_hours',
          'title', 'Sleep Duration Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 0,
            'yAxisMax', 24,
            'yAxisLabel', 'Hours'
          )
        ),
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'quality_rating',
          'title', 'Sleep Quality Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Quality (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'heatmap',
          'field_id', 'quality_rating',
          'title', 'Sleep Quality Heatmap'
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'duration_hours',
          'title', 'Average Sleep Duration by Day of Week'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 11. Exercise Tracker: Add charts for duration and activity types
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Exercise Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'duration_minutes',
          'title', 'Exercise Duration Over Time',
          'config', jsonb_build_object(
            'yAxisLabel', 'Duration (minutes)'
          )
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'activity_type',
          'title', 'Exercise Activity Types'
        ),
        jsonb_build_object(
          'type', 'pie',
          'field_id', 'activity_type',
          'title', 'Activity Type Distribution'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 12. Nutrition Log: Text-based, no numeric charts needed

  -- 13. Mindfulness & Meditation: Add charts for duration and session types
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Mindfulness & Meditation' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'duration_minutes',
          'title', 'Meditation Duration Over Time',
          'config', jsonb_build_object(
            'yAxisLabel', 'Duration (minutes)'
          )
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'session_type',
          'title', 'Session Types'
        ),
        jsonb_build_object(
          'type', 'heatmap',
          'field_id', 'duration_minutes',
          'title', 'Meditation Practice Heatmap'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 14. Rest & Recovery: Add charts for duration and log types
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Rest & Recovery' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'duration_minutes',
          'title', 'Rest Duration Over Time',
          'config', jsonb_build_object(
            'yAxisLabel', 'Duration (minutes)'
          )
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'log_type',
          'title', 'Rest Types'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 15. Growth Tracking: Add charts for all rating dimensions
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Growth Tracking' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'confidence_level',
          'title', 'Confidence Level Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Confidence (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'emotional_resilience',
          'title', 'Emotional Resilience Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Resilience (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'focus_clarity',
          'title', 'Focus & Clarity Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Focus & Clarity (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'self_trust',
          'title', 'Self-Trust Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 1,
            'yAxisMax', 5,
            'yAxisLabel', 'Self-Trust (1-5)'
          )
        ),
        jsonb_build_object(
          'type', 'line',
          'field_id', 'confidence_level',
          'title', 'Growth Dimensions Comparison',
          'config', jsonb_build_object(
            'groupBy', jsonb_build_array('confidence_level', 'emotional_resilience', 'focus_clarity', 'self_trust'),
            'yAxisLabel', 'Rating (1-5)'
          )
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 16. Gratitude Journal: Text-based, no numeric charts needed

  -- 17. Personal Journal: Text-based, no numeric charts needed

  -- 18. Income & Cash Flow: Add charts for amounts and source types
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Income & Cash Flow' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'expected_amount',
          'title', 'Expected Income Over Time',
          'config', jsonb_build_object(
            'yAxisLabel', 'Amount ($)'
          )
        ),
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'actual_amount',
          'title', 'Actual Income Over Time',
          'config', jsonb_build_object(
            'yAxisLabel', 'Amount ($)'
          )
        ),
        jsonb_build_object(
          'type', 'line',
          'field_id', 'expected_amount',
          'title', 'Expected vs Actual Income',
          'config', jsonb_build_object(
            'groupBy', jsonb_build_array('expected_amount', 'actual_amount'),
            'yAxisLabel', 'Amount ($)'
          )
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'source_type',
          'title', 'Income by Source Type'
        ),
        jsonb_build_object(
          'type', 'pie',
          'field_id', 'source_type',
          'title', 'Income Source Distribution'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 19. Habit Tracker: Enhance existing charts (add bar chart for status)
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Habit Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'heatmap',
          'field_id', 'status',
          'title', 'Habit Check-in Heatmap'
        ),
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'value_numeric',
          'title', 'Habit Value Over Time'
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'status',
          'title', 'Habit Status Distribution'
        ),
        jsonb_build_object(
          'type', 'pie',
          'field_id', 'status',
          'title', 'Habit Completion Status'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  -- 20. Goal Tracker: Enhance existing charts (add bar chart for status)
  SELECT id INTO template_id_val
  FROM tracker_templates
  WHERE name = 'Goal Tracker' AND scope = 'global' AND archived_at IS NULL;

  IF template_id_val IS NOT NULL THEN
    UPDATE tracker_templates
    SET chart_config = jsonb_build_object(
      'enabled', true,
      'charts', jsonb_build_array(
        jsonb_build_object(
          'type', 'time_series',
          'field_id', 'progress',
          'title', 'Progress Over Time',
          'config', jsonb_build_object(
            'yAxisMin', 0,
            'yAxisMax', 100,
            'yAxisLabel', 'Progress (%)'
          )
        ),
        jsonb_build_object(
          'type', 'bar',
          'field_id', 'status',
          'title', 'Goal Status Distribution'
        ),
        jsonb_build_object(
          'type', 'pie',
          'field_id', 'status',
          'title', 'Goal Status Breakdown'
        )
      )
    )
    WHERE id = template_id_val;
  END IF;

  RAISE NOTICE 'Successfully updated chart configurations for all tracker templates';
END $$;

-- Comments
COMMENT ON COLUMN tracker_templates.chart_config IS 'Chart configuration for analytics visualization. Supports multiple chart types per tracker.';
