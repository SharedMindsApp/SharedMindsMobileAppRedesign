/**
 * Centralized Feature Flags
 * 
 * All feature flags are defined here. Do NOT hardcode feature flags in components.
 * Import from this file to check feature availability.
 */

/**
 * Enable Habits and Goals tracking features
 * When true: HabitTrackerCore and GoalTrackerCore are functional
 * When false: Components show disabled message
 */
export const FEATURE_HABITS_GOALS = true;

/**
 * Enable calendar extras (habit instances, goal deadlines)
 * When true: Calendar shows derived habit instances and goal deadlines
 * When false: Calendar shows only traditional events
 */
export const FEATURE_CALENDAR_EXTRAS = true;

/**
 * Enable AI Chat Widget
 * When true: AI chat widget is visible and functional
 * When false: AI chat widget is hidden but code remains intact for reactivation
 */
export const FEATURE_AI_CHAT_WIDGET = false;

/**
 * Enable realtime subscriptions for habits and goals
 * When true: Uses Supabase realtime for multi-device sync
 * When false: Falls back to activityEvents bus
 */
export const FEATURE_HABITS_GOALS_REALTIME = true;

/**
 * Enable unified context tagging system
 * When true: Tags can be applied to habits, goals, projects, trips, and calendar events
 * When false: Tagging UI is hidden and tag operations are disabled
 */
export const FEATURE_CONTEXT_TAGGING = true;

/**
 * Enable team-scoped groups feature
 * When true: Groups can be created and managed within teams
 * When false: Group features are disabled
 */
export const ENABLE_GROUPS = true;

/**
 * Enable entity-level permission grants
 * When true: Permission grants can be created for tracks and subtracks
 * When false: Entity grants are disabled (only project permissions apply)
 */
export const ENABLE_ENTITY_GRANTS = false;

/**
 * Enable creator default rights and revocation
 * When true: Creator rights are applied and can be revoked by project owners
 * When false: Creator rights are disabled
 */
export const ENABLE_CREATOR_RIGHTS = false;

/**
 * Enable group-based distribution
 * When true: Tasks and calendar events can be distributed via groups
 * When false: Distribution features are disabled
 */
export const ENABLE_GROUP_DISTRIBUTION = false;

