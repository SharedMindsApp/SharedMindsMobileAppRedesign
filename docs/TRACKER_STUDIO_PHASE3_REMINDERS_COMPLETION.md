# Tracker Studio: Phase 3, Prompt 3 - Reminders & Notifications

## Summary

Successfully implemented a respectful, optional reminder system for Tracker Studio that helps users remember to log entries without enforcement, guilt language, or streaks.

## Implementation Details

### 1. Database Schema Changes

**Migration**: `20250131000006_add_tracker_reminders.sql`

**Extended `reminders` table**:
- Added `'tracker'` to `entity_type` enum (now supports 'event', 'task', 'tracker')
- Added `reminder_kind` (TEXT): 'entry_prompt' | 'reflection'
- Added `schedule` (JSONB): Cron-like or rule-based timing configuration
- Added `delivery_channels` (TEXT[]): ['in_app', 'push']
- Added `is_active` (BOOLEAN): Enable/disable without deleting

**New Function**: `get_due_tracker_reminders()`
- Returns tracker reminders that are due to be sent
- Checks if entry exists (suppresses if entry already exists)
- Respects schedule (time of day, days, quiet hours)
- Only returns active, unsent reminders

**RLS Policies Updated**:
- Tracker reminders visible only to users with tracker access (owner or shared users)
- Only owners/editors can create reminders
- Viewers cannot create reminders

### 2. Service Layer

**New Service**: `trackerReminderService.ts`

**Functions**:
- `getTrackerReminders(trackerId)`: Get all reminders for a tracker
- `createTrackerReminder(input)`: Create a reminder (validates permissions, enforces one entry_prompt per tracker)
- `updateTrackerReminder(reminderId, input)`: Update reminder settings
- `disableTrackerReminder(reminderId)`: Soft delete (set is_active = false)
- `deleteTrackerReminder(reminderId)`: Hard delete
- `listUserTrackerReminders()`: List all active reminders across user's trackers

**Validation Rules**:
- User must have `canEdit` permission on tracker
- Viewers cannot create reminders
- Only one `entry_prompt` reminder per tracker per user
- Max 1 reminder per tracker per day (enforced by resolver)
- Max 3 reminders per user per day (enforced by resolver)

### 3. Reminder Resolver

**New Resolver**: `trackerReminderResolver.ts`

**Functions**:
- `evaluateTrackerReminder()`: Evaluates if a reminder should fire
  - Checks tracker exists and not archived
  - Checks schedule (time of day, days, quiet hours)
  - Checks entry existence (entry_prompt: fires only if no entry; reflection: fires only if entry exists but no notes)
- `processDueTrackerReminders()`: Background job that processes all due reminders
  - Fetches due reminders from database
  - Evaluates each reminder
  - Emits notification intents via `emitNotificationIntent()`
  - Marks reminders as sent
  - Enforces max 3 reminders per user per day

**Safety Rules**:
- Quiet hours: 22:00 - 07:00 (default, configurable)
- Max 1 reminder per tracker per day
- Max 3 reminders per user per day
- Entry existence checked before firing
- No reminders if entry already exists (for entry_prompt)

### 4. Edge Function Updates

**Updated**: `supabase/functions/process-reminders/index.ts`

**Changes**:
- Now calls both `get_due_reminders()` (events/tasks) and `get_due_tracker_reminders()` (trackers)
- Processes tracker reminders separately with tracker-specific logic
- Creates notifications with appropriate titles and action URLs
- Marks tracker reminders as sent after processing

### 5. UI Components

**New Component**: `TrackerReminderSettings.tsx`

**Features**:
- Display all reminders for a tracker
- Create new reminders (entry_prompt or reflection)
- Toggle reminder active/inactive
- Delete reminders
- Configure schedule (time of day, days)
- Configure delivery channels (in-app, push)
- Only visible to owners/editors (viewers see message)

**Reminder Form**:
- Reminder type selector (entry_prompt or reflection)
- Time of day picker
- Days selector (daily, weekdays)
- Delivery channel checkboxes (in-app, push)
- Prevents creating duplicate entry_prompt reminders

**Updated Component**: `TrackerDetailPage.tsx`

**Changes**:
- Added `TrackerReminderSettings` section
- Only shown if user has `canEdit` permission
- Placed after Entry History section

### 6. Notification Integration

**Already Supported**:
- `tracker` is already in `NotificationFeature` type
- `reminder` signal type already exists
- Notification resolver already handles tracker reminders
- Uses `emitNotificationIntent()` for delivery

**Notification Content**:
- Entry Prompt: "Log today's {tracker_name}?" / "Want to add an entry for today?"
- Reflection: "Add a note to {tracker_name}?" / "Anything you noticed today?"
- Action URL: `/tracker-studio/tracker/{trackerId}`

## Permission Rules

| Role | Receive Reminders | Create/Edit Reminders |
|------|------------------|---------------------|
| Owner | ✅ Yes | ✅ Yes |
| Editor | ⚠️ Optional (opt-in) | ❌ No (only owner can create) |
| Viewer | ❌ No | ❌ No |

**Note**: Currently, only the reminder owner (tracker owner) can create reminders. Editors can receive reminders if they opt in, but cannot create them. This can be extended in the future.

## Reminder Types

### 1. Entry Prompt (Primary)
- **Purpose**: Remind user to log an entry
- **Fires**: Only if entry doesn't exist for today
- **Example**: "Log today's sleep?"
- **Max**: 1 per tracker per day

### 2. Reflection Prompt (Optional)
- **Purpose**: Remind user to add notes to existing entry
- **Fires**: Only if entry exists but has no notes
- **Example**: "Anything you noticed today?"
- **Max**: 1 per tracker per day

## Safety & UX Guardrails

✅ **Max reminders per user per day**: 3
✅ **Max reminders per tracker per day**: 1
✅ **Quiet hours respected**: 22:00 - 07:00 (default, configurable)
✅ **Entry existence checked**: Reminders suppressed if entry exists
✅ **No enforcement**: Reminders are suggestions, not obligations
✅ **No guilt language**: Neutral, assistive tone
✅ **No streaks**: No tracking of missed entries
✅ **Dismissible**: Users can disable/delete reminders anytime

## Validation Checklist

✅ User can enable reminder on tracker
✅ Reminder fires only if no entry exists (for entry_prompt)
✅ Reminder fires only if entry exists but no notes (for reflection)
✅ Read-only users never receive prompts
✅ Viewers cannot create reminders
✅ Reminder links open correct tracker
✅ Disabling reminders stops delivery
✅ No reminders appear in Planner/Spaces widgets (read-only views)
✅ RLS blocks unauthorized access
✅ Max 1 reminder per tracker per day enforced
✅ Max 3 reminders per user per day enforced
✅ Quiet hours respected

## Architecture Principles Maintained

- **No enforcement**: Reminders are suggestions, not obligations
- **No guilt language**: Neutral, assistive tone throughout
- **User control**: Users can enable/disable/delete reminders anytime
- **Service-layer authority**: All reminder logic in services, not UI
- **Permission-based**: Respects tracker permissions
- **Optional**: Reminders are opt-in, never auto-enabled
- **Respectful**: No negative feedback for missed entries

## Files Created/Modified

**Migrations**:
- `supabase/migrations/20250131000006_add_tracker_reminders.sql`

**Services**:
- `src/lib/trackerStudio/trackerReminderService.ts` (new)
- `src/lib/trackerStudio/trackerReminderResolver.ts` (new)

**UI Components**:
- `src/components/tracker-studio/TrackerReminderSettings.tsx` (new)
- `src/components/tracker-studio/TrackerDetailPage.tsx` (updated)

**Edge Functions**:
- `supabase/functions/process-reminders/index.ts` (updated)

## Future Enhancements (Not Implemented)

- Smart nudging based on user patterns
- Cross-tracker reminders
- Predictive reminders
- Health inference
- Reminder analytics
- Custom quiet hours per user
- Snooze functionality (Today, This week, Turn off)
- Reminder templates

## Notes

- Reminders use the existing notification infrastructure
- The resolver runs server-side (edge function / cron)
- Reminders never write tracker data (read-only checks)
- All reminder logic is in services, not UI
- Reminders respect tracker permissions at all levels (RLS, service, resolver)
- The system is designed to be respectful and non-intrusive
