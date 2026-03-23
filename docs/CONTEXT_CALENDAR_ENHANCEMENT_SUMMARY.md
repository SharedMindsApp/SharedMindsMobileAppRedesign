# Context Calendar Enhancement Implementation Summary

## Overview

This implementation enhances the existing personal calendar (used by both Personal Spaces and the Planner) to support context-based event projections, without creating a new calendar UI or concept. The personal calendar remains **one calendar**, **one mental model**, shared across Planner and Personal Spaces.

## What Was Added

### 1. Calendar Service Enhancement (`src/lib/personalSpaces/calendarService.ts`)

**Purpose**: Augment the existing calendar data source to merge context projections with personal events.

**Key Changes**:
- Added `CONTEXT_CALENDAR_ENABLED` feature flag (currently set to `false`)
- Extended `PersonalCalendarEvent` interface to include context projection metadata:
  - `contextId?: string`
  - `contextName?: string`
  - `contextType?: 'trip' | 'project' | 'personal' | 'shared_space'`
  - `projectionId?: string`
  - `isReadOnly?: boolean`
- Enhanced `getPersonalCalendarEvents()` to:
  - Fetch existing `calendar_events` (existing behavior)
  - When feature flag is ON: Fetch and merge accepted `context_events` via `calendar_projections`
  - Deduplicate and sort by start time
  - **Graceful degradation**: If projection fetch fails, returns existing events only
- Enhanced `getPersonalEventsForDateRange()` with the same projection merging logic
- Added projection management functions:
  - `getPendingProjections()` - Fetch pending calendar invitations
  - `acceptProjection()` - Accept a projection (event appears in calendar)
  - `declineProjection()` - Decline a projection (event never appears)

**Behavior**:
- **Feature flag OFF**: Calendar behaves exactly as before (no change)
- **Feature flag ON**: Calendar includes accepted context projections alongside existing events
- No breaking changes to existing code
- All new functionality is additive

### 2. Personal Calendar Page Enhancement (`src/components/personal-spaces/PersonalCalendarPage.tsx`)

**Purpose**: Add projection awareness and acceptance UI without changing the core calendar experience.

**Key Changes**:
- Added pending projections section at the top of the page:
  - Displays pending calendar invitations with amber alert styling
  - Shows event title, context name, and date/time
  - Provides "Accept" and "Decline" buttons
  - Non-blocking (doesn't prevent using the calendar)
- Enhanced event display:
  - Context-sourced events show purple badge with context name
  - Read-only indicator for projected events
  - Different styling (purple tint) for projected events
- Enhanced event interaction:
  - Edit button disabled for read-only (projected) events
  - Delete button disabled for read-only (projected) events
  - Alert messages explain why projected events can't be edited/deleted
- Improved event badges:
  - `context` source type → Purple badge with context icon and name
  - `guardrails` source type → Blue badge with link icon
  - `personal` source type → Gray badge

**User Flow**:
1. User receives a projection (e.g., from a trip itinerary)
2. Pending invitation appears at the top of the calendar page
3. User clicks "Accept" → Event appears in calendar
4. User clicks "Decline" → Event never appears
5. Accepted events are read-only and visually distinct

### 3. Trip Calendar Integration Service (`src/lib/personalSpaces/tripCalendarIntegration.ts`)

**Purpose**: Enable trip itinerary items to be offered to personal calendar via context projections.

**Key Functions**:
- `offerTripItineraryToCalendar()`:
  - Creates or gets a context for the trip
  - Creates a `context_event` from the itinerary item
  - Creates a pending `calendar_projection` for the user
  - Handles re-offering declined projections
  - Returns success/error status
- `isItineraryItemOffered()`:
  - Checks if an itinerary item is already offered
  - Returns offer status (`pending`, `accepted`, `declined`)

**Behavior**:
- Trip → Context → Event → Projection → Personal Calendar
- No auto-acceptance (user must explicitly accept)
- Supports re-offering declined events
- Handles missing context/event gracefully

### 4. Trip Itinerary UI Enhancement (`src/components/planner/travel/TripDetailPage.tsx`)

**Purpose**: Add "Offer to calendar" action for trip itinerary items.

**Key Changes**:
- Added "Offer to calendar" button for each itinerary item
- Button states:
  - **Default**: "Offer to Calendar" (purple)
  - **Pending**: "Pending" (amber)
  - **Accepted**: "In Calendar" (green, disabled)
  - **Declined**: "Declined" (gray)
  - **Loading**: Spinner animation
- Load offer status on mount for all itinerary items
- Handle offer action with loading state and error handling
- Visual feedback for each state

**User Flow**:
1. User creates trip itinerary items
2. User clicks "Offer to calendar" button
3. Button changes to "Pending" state
4. User navigates to Personal Calendar page
5. Pending invitation appears at the top
6. User accepts → Event appears in calendar
7. Back in trip itinerary, button shows "In Calendar" (green)

## Files Touched

### Modified Files:
1. `src/lib/personalSpaces/calendarService.ts` - Enhanced to merge context projections
2. `src/components/personal-spaces/PersonalCalendarPage.tsx` - Added projection acceptance UI
3. `src/components/planner/travel/TripDetailPage.tsx` - Added "Offer to calendar" button

### New Files:
1. `src/lib/personalSpaces/tripCalendarIntegration.ts` - Trip-to-calendar integration service

## Files Intentionally NOT Touched

### Existing Tables (No Schema Changes):
- `calendar_events` - Existing household/personal calendar table (untouched)
- `trips` - Existing trips table (untouched)
- `trip_itinerary_items` - Existing itinerary table (untouched)

### Existing Services (No Breaking Changes):
- `src/lib/calendar.ts` - Household calendar service (untouched)
- `src/lib/travelService.ts` - Travel service (untouched)
- Any existing calendar RLS policies (untouched)

### Existing UI (No Changes):
- Household Calendar Page - Works as before
- Calendar Widget - Works as before
- Any other calendar views - Work as before

## Feature Flag Usage

### Feature Flag: `CONTEXT_CALENDAR_ENABLED`
- **Location**: `src/lib/personalSpaces/calendarService.ts` (line 9)
- **Default**: `false` (feature disabled by default)
- **Purpose**: Control context calendar integration rollout
- **Behavior**:
  - `false`: Calendar behaves exactly as before (existing events only)
  - `true`: Calendar includes accepted context projections

### Recommendation:
Move this to a centralized feature flags system (e.g., `src/lib/featureFlags.ts`) for production use.

## Known Limitations

### Current Scope (Implemented):
1. ✅ Trip itinerary → personal calendar
2. ✅ Pending projection acceptance UI
3. ✅ Read-only projected events
4. ✅ Visual distinction for projected events
5. ✅ Re-offering declined projections

### Not Implemented (Future Work):
1. ❌ Project integration (only trips)
2. ❌ Shared space integration (only trips)
3. ❌ Calendar widget support (only PersonalCalendarPage)
4. ❌ External calendar sync (e.g., Google Calendar)
5. ❌ Bulk accept/decline projections
6. ❌ Notification system for new projections
7. ❌ Projection revocation flow (accept → revoke later)
8. ❌ Custom projection scopes (date_only, title, full)
9. ❌ Target space selection for projections
10. ❌ Mobile optimization

## Assumptions Made

### Technical Assumptions:
1. **Database**: All context-sovereign tables (`contexts`, `context_events`, `calendar_projections`) exist (from `20260102000000_create_context_sovereign_foundation.sql` migration)
2. **Foreign Keys**: 
   - `trips.id` exists and can be referenced by `contexts.linked_trip_id`
   - `auth.users(id)` exists and can be referenced
3. **RLS**: New table RLS policies are enforced and correct
4. **Supabase Client**: Available as `supabase` from `../supabase` in all service files

### Business Logic Assumptions:
1. **Trip Collaborators**: All trip collaborators can offer itinerary items to their own calendar
2. **Event Ownership**: Context events are owned by the context, not individual users
3. **Projection Target**: Projections target individual users, not groups
4. **Acceptance Model**: Must be explicitly accepted (no auto-acceptance)
5. **Read-Only**: All projected events are read-only in personal calendar
6. **Deletion**: Deleting source itinerary item should cascade-delete the context event and projection (handled by database FK constraints)

### UI/UX Assumptions:
1. **Calendar Layout**: Existing PersonalCalendarPage layout is sufficient for pending projections
2. **Visual Distinction**: Purple color for context events doesn't conflict with existing color scheme
3. **Button Placement**: "Offer to calendar" button fits in existing trip itinerary layout
4. **Error Handling**: Alert dialogs are acceptable for error messages (no toast notifications)

## Follow-Up Decisions Required Before Further Work

### 1. Feature Flag Management
**Decision Needed**: Move `CONTEXT_CALENDAR_ENABLED` to centralized feature flags system?
- **Options**:
  - Keep in service file (current)
  - Move to `src/lib/featureFlags.ts`
  - Use environment variable
  - Use database-driven feature flags (Supabase Vault)

### 2. Notification System
**Decision Needed**: How should users be notified of new pending projections?
- **Options**:
  - No notifications (user must check calendar page)
  - Badge count on calendar navigation item
  - Toast notification when projection is created
  - Email notification
  - In-app notification center

### 3. Calendar Widget Integration
**Decision Needed**: Should calendar widgets show projected events?
- **Options**:
  - No (widgets show only existing events)
  - Yes (widgets show all accepted projections)
  - Configurable per widget

### 4. Projection Scope
**Decision Needed**: Should users control what information is shown?
- **Options**:
  - Always full detail (current)
  - Allow date_only, title, or full scopes
  - Context creator chooses default scope
  - User overrides scope when accepting

### 5. Revocation Flow
**Decision Needed**: Can users remove accepted projections?
- **Options**:
  - No revocation (accept is permanent)
  - Allow revocation (event disappears from calendar)
  - Allow hiding (event still accepted but not visible)

### 6. Project & Space Integration
**Decision Needed**: When to add project and space calendar integration?
- **Options**:
  - Wait for user feedback on trips
  - Implement alongside trips (parallel)
  - Implement after trips are validated

### 7. Bulk Operations
**Decision Needed**: Should users accept/decline multiple projections at once?
- **Options**:
  - No bulk operations (one at a time)
  - Select multiple and accept/decline
  - "Accept all from [context name]" shortcut

## Testing Considerations

### Manual Testing Checklist:
1. ✅ Feature flag OFF: Calendar works as before
2. ⚠️ Feature flag ON: Projections appear when accepted
3. ⚠️ Offer itinerary item to calendar creates pending projection
4. ⚠️ Accept projection: Event appears in calendar
5. ⚠️ Decline projection: Event never appears
6. ⚠️ Projected events are read-only (can't edit/delete)
7. ⚠️ Visual distinction: Purple badges and styling
8. ⚠️ Re-offering declined projection works
9. ⚠️ Multiple projections from same trip work
10. ⚠️ Date range queries include projected events

### Edge Cases to Test:
1. Projection without context (should not appear)
2. Projection with deleted event (should fail gracefully)
3. Projection for deleted trip (should cascade delete)
4. Multiple users offering same trip item (should create separate projections)
5. Accepting already-accepted projection (should be idempotent)
6. Declining already-declined projection (should be idempotent)
7. Projection fetch failure (should fallback to existing events)

### Performance Considerations:
1. Loading offer status for many itinerary items (O(n) queries)
2. Fetching projections on every calendar load (consider caching)
3. Large number of pending projections (pagination?)

## Migration Path (Future)

### Phase 1: Current Implementation ✅
- Trip itinerary → personal calendar
- Manual acceptance via PersonalCalendarPage
- Read-only projected events

### Phase 2: Enhanced UX (Next)
- Notification system for new projections
- Badge counts on navigation
- Calendar widget support
- Bulk accept/decline

### Phase 3: Additional Contexts
- Guardrails project milestones → personal calendar
- Shared space events → personal calendar
- Personal space tasks → personal calendar

### Phase 4: Advanced Features
- Projection scoping (date_only, title, full)
- Target space selection
- External calendar sync (Google, Outlook)
- Mobile app integration

### Phase 5: Migration & Consolidation
- Migrate existing `calendar_events` to context model (if desired)
- Consolidate calendar authority
- Deprecate legacy household calendar (if desired)

## Rollback Strategy

If issues arise, rollback is straightforward:

1. **Set feature flag to `false`**:
   - Change `CONTEXT_CALENDAR_ENABLED` to `false` in `calendarService.ts`
   - No data loss, no breaking changes
   - Calendar reverts to existing behavior immediately

2. **Remove UI elements** (optional):
   - Remove pending projections section from PersonalCalendarPage
   - Remove "Offer to calendar" buttons from trip itinerary
   - Service layer remains in place for future re-enable

3. **Database rollback** (nuclear option):
   - Drop new tables: `contexts`, `context_events`, `calendar_projections`
   - Only if absolutely necessary (would lose all projection data)
   - Not recommended unless critical issue

## Success Metrics

### User Adoption:
- % of trip itinerary items offered to calendar
- % of projections accepted vs declined
- Average time to accept projection

### User Satisfaction:
- Reduction in duplicate calendar entries
- User feedback on read-only limitation
- Requests for additional context types (projects, spaces)

### Technical Health:
- No increase in calendar page load time
- No errors in production logs
- Graceful degradation when projection fetch fails

## Conclusion

This implementation successfully enhances the personal calendar to support context-based event projections while maintaining full backward compatibility. The feature is:

- ✅ **Additive only**: No breaking changes
- ✅ **Feature flagged**: Safe to deploy with flag OFF
- ✅ **Non-invasive**: Existing code untouched
- ✅ **User-controlled**: Explicit acceptance required
- ✅ **Visually distinct**: Clear indication of projected events
- ✅ **Trip-scoped**: Limited to travel planning (first use case)

The foundation is in place for expanding to projects, spaces, and other contexts in the future.

