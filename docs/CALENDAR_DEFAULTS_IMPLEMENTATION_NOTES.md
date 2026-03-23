# Calendar Default Visibility - Implementation Notes

## STOP Condition Report

**Missing Persistence Mechanism for Server-Side Access:**

Calendar defaults need to be applied during event/task creation. However:
- Events/tasks can be created server-side (e.g., sync operations)
- localStorage is client-side only
- No schema migrations allowed (cannot create new database table)

**Decision:** Use localStorage (like `useCalendarSettings`) with the limitation that defaults only apply when events/tasks are created from UI components that have access to localStorage. Server-side creation (sync, etc.) will not apply defaults.

This matches the constraint: "Applies only at creation time" and "Reuses existing APIs + hooks" - defaults are applied client-side when UI components create events/tasks.

## Implementation Approach

1. **Data Model:** localStorage-based hook (`useCalendarVisibilityDefaults.ts`) - ✅ COMPLETE
2. **UI:** Section in CalendarSettingsSheet (Personal Calendar settings) - ✅ COMPLETE
3. **Application:** Apply defaults in UI components that create events/tasks (client-side only) - ⏳ PENDING (Phase 6.3 - Prompt 3)

## Phase 6.3 - Prompt 2 Completion

✅ **Hook Updated:**
- Added `enabled` field to `CalendarVisibilityDefaults` interface
- Hook supports enable/disable toggle
- Hook supports add/remove audiences

✅ **UI Section Implemented:**
- Added "Default Visibility & Sharing" section to `CalendarSettingsSheet`
- Gated behind `ENABLE_GROUP_DISTRIBUTION` feature flag
- Master toggle: "Automatically share new items"
- Audience selection (Group/User/Household via text input - MVP)
- Read-only summary showing audience count
- Clear messaging that defaults only apply to new items

**MVP Limitations:**
- Audience selection uses text input (not dropdown selector) because group selectors require `teamId` which isn't available in personal calendar settings context
- This matches the pattern used in `GrantPermissionForm` for MVP simplicity
- Can be enhanced later when team context is available

## Limitations

- Defaults only apply to events/tasks created via UI components
- Server-side creation (sync, API calls) will not apply defaults
- No persistence across devices (localStorage is browser-local)
- MVP: Text input for audience IDs (no dropdown selector)

## Phase 6.3 - Prompt 3 STOP CONDITION

**CRITICAL BLOCKER:** Distribution APIs are incompatible with personal calendar events.

**Issue:**
- Personal calendar events are stored in `calendar_events` table
- Distribution service (`eventDistributionService.ts`) queries `context_events` table
- `calendar_projections.event_id` has FOREIGN KEY constraint: `REFERENCES context_events(id) ON DELETE CASCADE`
- Distribution APIs cannot work with `calendar_events` table events

**Evidence:**
- `createPersonalCalendarEvent()` inserts into `calendar_events` table (line 519 in `calendarService.ts`)
- `canDistributeEvent()` queries `context_events` table (line 45 in `eventDistributionService.ts`)
- `calendar_projections` table schema (migration `20260102000000_create_context_sovereign_foundation.sql` line 243):
  ```sql
  event_id uuid NOT NULL REFERENCES context_events(id) ON DELETE CASCADE
  ```
- This foreign key constraint means `calendar_projections.event_id` can ONLY reference `context_events.id`, NOT `calendar_events.id`

**Resolution Required:**
- Either: Distribution service needs to support `calendar_events` table (schema change required)
- Or: Personal calendar events need to be migrated/adapted to work with distribution APIs
- Or: A new distribution mechanism is needed for personal calendar events

**Cannot proceed with Phase 6.3 - Prompt 3 until this is resolved.**

**STOP Condition Met:** "A new API or service is needed" - Distribution APIs require schema changes to support `calendar_events`.

## Future Enhancement Path

If server-side application is needed, would require:
- Database table for calendar defaults (schema migration)
- Or extension of existing `calendar_sync_settings` table

If enhanced audience selection is needed:
- Team context integration in calendar settings
- Or reusable audience selector component that doesn't require team context