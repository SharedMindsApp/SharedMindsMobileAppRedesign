/*
  # Add Icon and Color Customization to Trackers
  
  This migration adds icon and color fields to both tracker_templates and trackers
  to allow users to customize the visual appearance of their trackers.
  
  - icon: Text field storing the icon name (e.g., 'Moon', 'Activity', 'Heart')
  - color: Text field storing the color theme name (e.g., 'indigo', 'blue', 'green')
*/

-- Add icon and color to tracker_templates
ALTER TABLE tracker_templates
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text;

-- Add icon and color to trackers
ALTER TABLE trackers
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text;

-- Add comments for documentation
COMMENT ON COLUMN tracker_templates.icon IS 'Icon name from lucide-react (e.g., Moon, Activity, Heart). Used for visual customization.';
COMMENT ON COLUMN tracker_templates.color IS 'Color theme name (e.g., indigo, blue, green). Used for visual customization.';
COMMENT ON COLUMN trackers.icon IS 'Icon name from lucide-react (e.g., Moon, Activity, Heart). Overrides template icon if set.';
COMMENT ON COLUMN trackers.color IS 'Color theme name (e.g., indigo, blue, green). Overrides template color if set.';
