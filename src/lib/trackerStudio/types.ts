/**
 * Tracker Studio Domain Types
 * 
 * Core domain models for Tracker Studio, a generic tracking engine.
 * 
 * Principles:
 * - Templates never contain data
 * - Trackers are instances that contain data
 * - Tracker entries are append-only time-based records
 * - Trackers store a snapshot of their schema at creation
 */

/**
 * Entry granularity determines how entries are recorded
 */
export type TrackerEntryGranularity = 'daily' | 'session' | 'event' | 'range';

/**
 * Field types supported by tracker templates
 */
export type TrackerFieldType = 'text' | 'number' | 'boolean' | 'rating' | 'date';

/**
 * Field validation rules (optional)
 */
export interface TrackerFieldValidation {
  required?: boolean;
  min?: number; // For number/rating types
  max?: number; // For number/rating types
  pattern?: string; // For text types (regex)
  minLength?: number; // For text types
  maxLength?: number; // For text types
}

/**
 * Field definition in a tracker template
 */
export interface TrackerFieldSchema {
  id: string; // Unique identifier within template
  label: string; // Display label
  type: TrackerFieldType;
  validation?: TrackerFieldValidation;
  default?: string | number | boolean; // Default value (optional)
  conditional?: {
    field: string; // Field ID to check
    value: string | number | boolean; // Value that must match for this field to be shown
  }; // Conditional field visibility (e.g., show medication fields only when entry_type = 'medication')
  options?: Array<{ value: string; label: string }>; // Options for text fields with predefined choices
  description?: string; // Optional field description/help text
}

/**
 * Template scope: user-owned or global (visible to all)
 */
export type TrackerTemplateScope = 'user' | 'global';

/**
 * Chart configuration for analytics
 */
export interface TrackerChartConfig {
  enabledCharts?: string[]; // ['timeSeries', 'summary', 'heatmap', 'histogram', 'frequency', 'multiField', 'contextComparison']
  defaultDateRange?: '7d' | '30d' | '90d' | '1y' | 'all';
  showSecondaryCharts?: boolean;
  chartOrder?: string[]; // Order in which charts appear
}

/**
 * Tracker Template
 * 
 * Structure-only template that defines what fields a tracker should have.
 * Templates never contain data.
 */
export interface TrackerTemplate {
  id: string;
  owner_id: string | null; // null = system template (deprecated, use scope instead)
  name: string;
  description: string | null;
  version: number;
  field_schema: TrackerFieldSchema[];
  entry_granularity: TrackerEntryGranularity;
  is_system_template: boolean; // Deprecated, use scope instead
  scope: TrackerTemplateScope; // 'user' or 'global'
  created_by: string | null; // auth.uid of creator (null for system global templates)
  is_locked: boolean; // Prevents non-admin edits (global templates are always locked)
  published_at: string | null; // Timestamp when template was published (for rollout/versioning)
  chart_config: TrackerChartConfig | null; // Chart configuration for analytics
  tags: string[]; // Tags for categorization and filtering (e.g., ["Health", "Wellness", "Sleep"])
  icon: string | null; // Icon name from lucide-react (e.g., 'Moon', 'Activity', 'Heart')
  color: string | null; // Color theme name (e.g., 'indigo', 'blue', 'green')
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deprecated_at: string | null; // Timestamp when template was deprecated (hidden from new template selection)
}

/**
 * Tracker Instance
 * 
 * Live tracker that contains data. Stores a snapshot of its schema
 * at creation time, so template changes don't affect existing trackers.
 */
export interface Tracker {
  id: string;
  owner_id: string;
  template_id: string | null; // null if created from scratch
  name: string;
  description: string | null;
  field_schema_snapshot: TrackerFieldSchema[]; // Snapshot at creation
  entry_granularity: TrackerEntryGranularity;
  chart_config: TrackerChartConfig | null; // Chart configuration (inherits from template if null)
  display_order: number; // User-defined display order (lower values appear first)
  icon: string | null; // Icon name from lucide-react (e.g., 'Moon', 'Activity', 'Heart'). Overrides template icon if set.
  color: string | null; // Color theme name (e.g., 'indigo', 'blue', 'green'). Overrides template color if set.
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Tracker Entry
 * 
 * Time-based data record for a tracker. Entries are append-only
 * (no deletes, only updates).
 */
export interface TrackerEntry {
  id: string;
  tracker_id: string;
  user_id: string;
  entry_date: string; // ISO date string (YYYY-MM-DD)
  field_values: Record<string, string | number | boolean | null>; // {field_id: value}
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input types for creating templates
 */
export interface CreateTrackerTemplateInput {
  name: string;
  description?: string;
  field_schema: TrackerFieldSchema[];
  entry_granularity?: TrackerEntryGranularity;
  scope?: TrackerTemplateScope; // Defaults to 'user', only admins can set 'global'
  published_at?: string | null; // Optional publish timestamp
  chart_config?: TrackerChartConfig; // Optional chart configuration
  tags?: string[]; // Optional tags for categorization
  icon?: string | null; // Optional icon name from lucide-react
  color?: string | null; // Optional color theme name
}

/**
 * Input types for updating templates
 */
export interface UpdateTrackerTemplateInput {
  name?: string;
  description?: string;
  field_schema?: TrackerFieldSchema[];
  entry_granularity?: TrackerEntryGranularity;
  chart_config?: TrackerChartConfig;
  tags?: string[]; // Optional tags for categorization
  icon?: string | null; // Optional icon name from lucide-react
  color?: string | null; // Optional color theme name
}

/**
 * Input types for creating trackers from templates
 */
export interface CreateTrackerFromTemplateInput {
  template_id: string;
  name: string;
  description?: string;
  icon?: string | null; // Optional icon name from lucide-react (overrides template icon)
  color?: string | null; // Optional color theme name (overrides template color)
}

/**
 * Input types for creating trackers from schema (no template)
 */
export interface CreateTrackerFromSchemaInput {
  name: string;
  description?: string;
  field_schema: TrackerFieldSchema[];
  entry_granularity?: TrackerEntryGranularity;
  chart_config?: TrackerChartConfig; // Optional chart configuration
  icon?: string | null; // Optional icon name from lucide-react
  color?: string | null; // Optional color theme name
}

/**
 * Input types for updating trackers
 */
export interface UpdateTrackerInput {
  name?: string;
  description?: string;
  chart_config?: TrackerChartConfig; // Chart configuration can be updated
  icon?: string | null; // Optional icon name from lucide-react
  color?: string | null; // Optional color theme name
  // Note: field_schema_snapshot is immutable
}

/**
 * Input types for creating entries
 */
export interface CreateTrackerEntryInput {
  tracker_id: string;
  entry_date: string; // ISO date string (YYYY-MM-DD)
  field_values: Record<string, string | number | boolean | null>;
  notes?: string;
}

/**
 * Input types for updating entries
 */
export interface UpdateTrackerEntryInput {
  field_values?: Record<string, string | number | boolean | null>;
  notes?: string;
}

/**
 * Query options for listing entries
 */
export interface ListTrackerEntriesOptions {
  tracker_id: string;
  user_id?: string; // If not provided, uses current user
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  limit?: number;
  offset?: number;
}
