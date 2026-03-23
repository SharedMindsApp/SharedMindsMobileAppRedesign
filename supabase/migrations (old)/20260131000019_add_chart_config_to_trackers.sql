/*
  # Add Chart Configuration to Trackers and Templates
  
  This migration adds chart_config JSONB fields to both tracker_templates and trackers tables.
  This allows templates to define default chart configurations, and trackers to override them.
  
  Chart configuration structure:
  {
    "enabledCharts": ["timeSeries", "summary", "heatmap", "histogram", "frequency"],
    "defaultDateRange": "30d",
    "showSecondaryCharts": false,
    "chartOrder": ["summary", "timeSeries", "heatmap", "histogram", "frequency"]
  }
*/

-- Add chart_config to tracker_templates
ALTER TABLE tracker_templates
ADD COLUMN IF NOT EXISTS chart_config jsonb DEFAULT '{
  "enabledCharts": ["timeSeries", "summary", "heatmap", "histogram", "frequency"],
  "defaultDateRange": "30d",
  "showSecondaryCharts": false,
  "chartOrder": ["summary", "timeSeries", "heatmap", "histogram", "frequency"]
}'::jsonb;

-- Add chart_config to trackers
ALTER TABLE trackers
ADD COLUMN IF NOT EXISTS chart_config jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN tracker_templates.chart_config IS 'Chart configuration for analytics visualizations. Defines which charts are enabled, default date range, and chart display order.';
COMMENT ON COLUMN trackers.chart_config IS 'Chart configuration for this tracker instance. If null, inherits from template or uses defaults.';
