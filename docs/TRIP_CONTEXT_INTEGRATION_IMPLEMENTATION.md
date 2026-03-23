# Trip Context Integration Implementation

## Summary

This document describes the implementation of wiring Trips into the Context Container + Nested Events architecture. This is an **enhancement**, not a rewrite.

## Architecture Overview

### Trip → Context Mapping
- Every trip can have a context (lazy creation)
- Context is created on first use, not via migration
- Context links to trip via `linked_trip_id` (bidirectional)

### Trip Container Event
- Represents the trip as a macro time block
- Created automatically when trip has dates
- Non-blocking: failures don't prevent trip creation

### Itinerary → Nested Events
- Each itinerary item becomes a nested context event
- Synced automatically on itinerary CRUD operations
- Nested events never auto-project to calendars

## Database Changes

### Migration: `20260103000008_add_trip_context_integration.sql`

**New Field:**
- `trips.context_id` (uuid, nullable, FK to contexts)
  - Optional link to context
  - Created lazily on first use
  - No data migration (existing trips unaffected)

**Index:**
- `idx_trips_context` for efficient lookups

## Service Functions

### File: `src/lib/personalSpaces/tripContextIntegration.ts`

#### `ensureTripContext(tripId: string)`
- Ensures trip has a context
- Creates context if missing (lazy creation)
- Links context to trip bidirectionally
- Returns context_id

#### `ensureTripContainerEvent(tripId: string)`
- Ensures trip has a container event
- Creates container if missing (non-blocking)
- Requires trip to have start_date and end_date
- Returns container_event_id

#### `syncItineraryToNestedEvents(tripId: string)`
- Syncs all itinerary items to nested context events
- Creates/updates nested events for each itinerary item
- Deletes nested events for removed itinerary items
- Non-blocking: failures are logged

#### `syncItineraryItemToNestedEvent(...)` (internal)
- Syncs single itinerary item to nested event
- Maps itinerary category to event type
- Handles time conversion (date + time → timestamptz)

## Integration Points

### Trip Creation (`createTrip`)
- After trip creation, ensures context exists
- If trip has dates, ensures container event exists
- All operations are non-blocking (async, fire-and-forget)

### Trip Update (`updateTrip`)
- If dates or name changed, syncs container event
- Non-blocking: failures don't prevent trip update

### Itinerary CRUD
- **Create**: Syncs to nested events after creation
- **Update**: Syncs to nested events after update
- **Delete**: Syncs to nested events (removes orphaned nested event)

## Calendar Projection Rules

### Container Projection
- Container events can be projected to:
  - Personal calendar (opt-in)
  - Shared calendar (opt-in)
- Appears as single block
- No nested items included
- Title only (no itinerary detail)

### Nested Event Projection
- Nested events can be projected to:
  - Personal calendar ONLY
  - Only to users with explicit permission
- **NEVER** appear in shared calendars
- Container projection does NOT imply nested projection
- Requires explicit user action

## Backward Compatibility

### Existing Trips
- All existing trips continue to work
- No context required for trip functionality
- Context creation is lazy (on first use)
- No breaking changes to existing queries

### Existing Behavior
- Trip creation works exactly as before
- Trip editing works exactly as before
- Itinerary CRUD works exactly as before
- Calendar rendering unchanged (unless explicitly projected)

### Safety Guarantees
- All integration operations are non-blocking
- Failures are logged, not thrown
- No auto-sharing or auto-projection
- No calendar pollution
- Existing trips without contexts continue to function

## Files Modified/Created

### Database
- `supabase/migrations/20260103000008_add_trip_context_integration.sql` (NEW)

### Services
- `src/lib/personalSpaces/tripContextIntegration.ts` (NEW)
- `src/lib/travelService.ts` (UPDATED - wired integration)

## Verification Checklist

- [x] Trip creation works
- [x] Trip editing works
- [x] Itinerary CRUD works
- [x] No calendar pollution exists
- [x] No auto-sharing exists
- [x] Nested events are fully isolated
- [x] Backward compatibility maintained
- [x] All operations are non-blocking
- [x] Failures are logged, not thrown

## Usage Example

### Creating a Trip
```typescript
// Normal trip creation
const trip = await createTrip({
  name: "Amsterdam Trip",
  start_date: "2026-02-02",
  end_date: "2026-02-09",
  owner_id: userId,
});

// Context and container are created automatically (non-blocking)
// No user action required
```

### Adding Itinerary Items
```typescript
// Normal itinerary creation
await createItineraryItem({
  trip_id: tripId,
  title: "Flight to Amsterdam",
  date: "2026-02-02",
  start_time: "10:00",
  category: "travel",
});

// Nested event is created automatically (non-blocking)
// No calendar projection (explicit opt-in required)
```

### Projecting to Calendar
```typescript
// Explicit projection (user action required)
import { projectContainerToCalendar } from './contextSovereign/containerCalendarService';

await projectContainerToCalendar(
  containerEventId,
  targetUserId,
  null, // Personal calendar
  'title', // Scope
  userId
);
```

## Next Steps (Future)

1. **UI Integration:**
   - Add "Add to Calendar" button in trip detail page
   - Show projection status
   - Allow users to project container and/or nested events

2. **Permission Refinement:**
   - Check context permissions for projections
   - Respect trip collaborator roles

3. **Bulk Operations:**
   - Project all nested events for a trip
   - Revoke all projections for a trip

