/*
  # Populate Chart Configurations for Existing Templates
  
  This migration adds default chart configurations to all existing tracker templates.
  Each template gets a sensible default based on its type and fields.
*/

-- Update all existing templates with default chart config if they don't have one
UPDATE tracker_templates
SET chart_config = CASE
  -- Sleep Tracker: Focus on time series and summary
  WHEN name ILIKE '%sleep%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "heatmap", "histogram"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "heatmap", "histogram"]
  }'::jsonb
  
  -- Exercise/Activity Trackers: Time series and frequency
  WHEN name ILIKE '%exercise%' OR name ILIKE '%activity%' OR name ILIKE '%workout%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "frequency", "heatmap"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "frequency", "heatmap"]
  }'::jsonb
  
  -- Mood/Emotion Trackers: Time series and distribution
  WHEN name ILIKE '%mood%' OR name ILIKE '%emotion%' OR name ILIKE '%feeling%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "histogram", "heatmap"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "histogram", "heatmap"]
  }'::jsonb
  
  -- Nutrition/Food Trackers: Time series and frequency
  WHEN name ILIKE '%nutrition%' OR name ILIKE '%food%' OR name ILIKE '%meal%' OR name ILIKE '%diet%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "frequency", "heatmap"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "frequency", "heatmap"]
  }'::jsonb
  
  -- Mindfulness/Meditation: Time series and summary
  WHEN name ILIKE '%mindfulness%' OR name ILIKE '%meditation%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "heatmap", "frequency"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "heatmap", "frequency"]
  }'::jsonb
  
  -- Growth/Development: Multi-field comparison
  WHEN name ILIKE '%growth%' OR name ILIKE '%development%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "histogram", "contextComparison"],
    "defaultDateRange": "90d",
    "showSecondaryCharts": true,
    "chartOrder": ["summary", "timeSeries", "histogram", "contextComparison"]
  }'::jsonb
  
  -- Gratitude/Journal: Frequency and heatmap
  WHEN name ILIKE '%gratitude%' OR name ILIKE '%journal%' THEN '{
    "enabledCharts": ["summary", "frequency", "heatmap"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "frequency", "heatmap"]
  }'::jsonb
  
  -- Finance/Money: Time series and summary
  WHEN name ILIKE '%income%' OR name ILIKE '%cash%' OR name ILIKE '%finance%' OR name ILIKE '%money%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "histogram"],
    "defaultDateRange": "90d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "histogram"]
  }'::jsonb
  
  -- Health/Wellness: All charts
  WHEN name ILIKE '%energy%' OR name ILIKE '%water%' OR name ILIKE '%hydration%' OR name ILIKE '%medication%' OR name ILIKE '%symptom%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "heatmap", "histogram", "frequency"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "heatmap", "histogram", "frequency"]
  }'::jsonb
  
  -- Productivity/Habits: Frequency and heatmap
  WHEN name ILIKE '%productivity%' OR name ILIKE '%habit%' OR name ILIKE '%focus%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "frequency", "heatmap"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "frequency", "heatmap"]
  }'::jsonb
  
  -- Social/Connection: Frequency
  WHEN name ILIKE '%social%' OR name ILIKE '%connection%' THEN '{
    "enabledCharts": ["summary", "frequency", "heatmap"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "frequency", "heatmap"]
  }'::jsonb
  
  -- Rest/Recovery: Time series and summary
  WHEN name ILIKE '%rest%' OR name ILIKE '%recovery%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "heatmap"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "heatmap"]
  }'::jsonb
  
  -- Stress: Time series and context comparison
  WHEN name ILIKE '%stress%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "contextComparison", "histogram"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "contextComparison", "histogram"]
  }'::jsonb
  
  -- Weather/Environment: Time series
  WHEN name ILIKE '%weather%' OR name ILIKE '%environment%' THEN '{
    "enabledCharts": ["summary", "timeSeries", "heatmap"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "heatmap"]
  }'::jsonb
  
  -- Default: All charts enabled
  ELSE '{
    "enabledCharts": ["summary", "timeSeries", "heatmap", "histogram", "frequency"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "heatmap", "histogram", "frequency"]
  }'::jsonb
END
WHERE chart_config IS NULL OR chart_config = 'null'::jsonb;

-- Ensure all templates have a chart_config (set to default if still null)
UPDATE tracker_templates
SET chart_config = '{
  "enabledCharts": ["summary", "timeSeries", "heatmap", "histogram", "frequency"],
  "defaultDateRange": "30d",
  "showSecondaryCharts": false,
  "chartOrder": ["summary", "timeSeries", "heatmap", "histogram", "frequency"]
}'::jsonb
WHERE chart_config IS NULL;
