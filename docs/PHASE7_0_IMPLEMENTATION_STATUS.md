# Phase 7.0: Personal → Context Event Promotion - Implementation Status

**Status**: In Progress  
**Date**: January 2025  
**Architecture Status**: 🔒 CONTROLLED EXTENSION (Explicitly Approved)

## Objective

Enable personal calendar events to be shared using the existing distribution system by promoting them into the `context_events` domain, without modifying the existing distribution architecture.

## Completed Components

### 1. Schema Migration ✅

**File**: `supabase/migrations/20250131000001_add_source_calendar_event_id_to_context_events.sql`

- Added `source_calendar_event_id` column to `context_events` table
- Nullable UUID, references `calendar_events(id) ON DELETE SET NULL`
- Index created for querying by source calendar event
- Comments added for documentation
- **Status**: ✅ Complete

### 2. Event Promotion Service ✅

**File**: `src/lib/calendar/calendarEventPromotionService.ts`

- Implemented `promoteCalendarEventToContextEvent()` function
- Handles idempotency (checks for existing promotion)
- Creates/get personal context for user
- Maps calendar_event fields to context_event fields
- Converts IDs (profiles.id → auth.users.id)
- Links records via `source_calendar_event_id`
- **Status**: ✅ Complete

**Key Functions**:
- `promoteCalendarEventToContextEvent()` - Main promotion function
- `getOrCreatePersonalContext()` - Helper to get/create personal context
- `getUserIdFromProfileId()` - ID conversion helper
- `mapEventType()` - Event type mapping
- `mapTimeScope()` - Time scope mapping

### 3. Calendar Defaults Helper (Updated) ✅

**File**: `src/lib/calendar/applyCalendarDefaults.ts`

- Updated `applyCalendarDefaultsToEvent()` to promote first, then distribute
- Promotes calendar_event to context_event before distribution
- Uses context_event.id for distribution (not calendar_event.id)
- Non-blocking, error-tolerant
- **Status**: ✅ Complete

## Pending Components

### 4. Wire Promotion into Event Creation ⏳

**File**: `src/components/personal-spaces/PersonalEventModal.tsx`

**Requirements**:
- After event creation, check if defaults are enabled
- If enabled, call `applyCalendarDefaultsToEvent()`
- Use `useDistributeEvent` hook for distribution
- Non-blocking (errors don't fail creation)

**Status**: ⏳ Pending

### 5. Manual Sharing Trigger ⏳

**Requirements**:
- When user explicitly adds people/groups to event/task
- Trigger promotion before distribution
- **Status**: ⏳ Pending (Future enhancement)

## Architecture Compliance

✅ **Allowed**:
- New service (promotion service)
- One new nullable column (source_calendar_event_id)
- Reuse of existing distribution APIs
- Explicit domain boundary

❌ **Forbidden** (Not Violated):
- Making distribution work on calendar_events
- Dual-table logic in distribution services
- Schema polymorphism
- Implicit auto-sharing without promotion

## Testing Checklist

- [ ] Promotion creates context_event correctly
- [ ] Promotion is idempotent (reuses existing context_event)
- [ ] Distribution works with promoted context_event
- [ ] Defaults apply correctly after promotion
- [ ] Errors in promotion/distribution don't fail event creation
- [ ] No regression to existing context workflows

## Next Steps

1. Wire promotion into `PersonalEventModal.tsx` event creation flow
2. Test promotion + distribution end-to-end
3. Document any issues or edge cases
4. Consider manual sharing trigger (future enhancement)

## Notes

- Promotion is one-way (personal → context)
- Distribution always targets `context_events.id`
- Personal contexts are created automatically for users
- Future phases may support project-linked contexts