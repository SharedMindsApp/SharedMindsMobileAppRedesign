# ⚠️ Migration Required Before Enabling Context Calendar

## Issue

If you're seeing HMR (Hot Module Reload) errors like:

```
Failed to load resource: the server responded with a status of 500 ()
[hmr] Failed to reload /src/components/personal-spaces/PersonalCalendarPage.tsx
```

This is because the new database tables don't exist yet.

## Solution

### Step 1: Run the Context-Sovereign Foundation Migration

```bash
# Apply the migration that creates the new tables
npx supabase migration up
```

Or if using the Supabase CLI:

```bash
supabase db push
```

This will create the following tables:
- `contexts`
- `context_members`
- `context_events`
- `calendar_projections`

The migration file is:
- `supabase/migrations/20260102000000_create_context_sovereign_foundation.sql`

### Step 2: Verify Tables Exist

After running the migration, verify the tables exist:

```sql
-- In Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contexts', 'context_events', 'calendar_projections', 'context_members');
```

You should see all 4 tables listed.

### Step 3: Restart Dev Server

After the migration is applied:

```bash
# Stop the dev server (Ctrl+C)
# Restart it
npm run dev
```

## Why This Happens

The new code tries to query Supabase tables that don't exist yet. Even though the feature flag is OFF (`CONTEXT_CALENDAR_ENABLED = false`), the module imports and function definitions are still parsed, which can cause issues if Supabase validates table existence at module load time.

The code is designed to gracefully handle missing tables (returns empty arrays, logs warnings), but the dev server HMR can still fail during hot reload.

## Feature Flag Status

**Current Status**: `CONTEXT_CALENDAR_ENABLED = false`

Location: `src/lib/personalSpaces/calendarService.ts` (line 9)

```typescript
const CONTEXT_CALENDAR_ENABLED = false; // Feature is disabled by default
```

### To Enable After Migration:

1. Run the migration (see above)
2. Restart dev server
3. Change the flag to `true`:

```typescript
const CONTEXT_CALENDAR_ENABLED = true; // Enable context calendar features
```

4. Test in your browser:
   - Go to Personal Calendar page
   - Create a trip with itinerary items
   - Click "Offer to calendar" on an itinerary item
   - Check Personal Calendar for pending projection
   - Accept the projection
   - Event should appear in calendar

## If Migration Cannot Be Run Yet

If you cannot run the migration immediately, you can temporarily comment out the new imports to allow the dev server to run:

### In `src/components/personal-spaces/PersonalCalendarPage.tsx`:

```typescript
// Temporarily comment these out:
/*
import {
  getPendingProjections,
  acceptProjection,
  declineProjection,
  type PendingProjection,
} from '../../lib/personalSpaces/calendarService';
*/

// And comment out the pending projections UI and handler functions
```

### In `src/components/planner/travel/TripDetailPage.tsx`:

```typescript
// Temporarily comment this out:
/*
import { offerTripItineraryToCalendar, isItineraryItemOffered } from '../../../lib/personalSpaces/tripCalendarIntegration';
*/

// And comment out the "Offer to calendar" button functionality
```

**Note**: This is only a temporary workaround. The proper solution is to run the migration.

## Troubleshooting

### Error: "relation 'calendar_projections' does not exist"

**Cause**: Migration hasn't been run.

**Solution**: Run the migration (see Step 1 above).

### Error: "column 'contexts.name' does not exist"

**Cause**: You have an older version of the context tables without the `name` column.

**Solution**: Drop and recreate the tables by running the migration again:

```sql
-- ⚠️ WARNING: This will delete all data in these tables!
DROP TABLE IF EXISTS calendar_projections CASCADE;
DROP TABLE IF EXISTS context_events CASCADE;
DROP TABLE IF EXISTS context_members CASCADE;
DROP TABLE IF EXISTS contexts CASCADE;

-- Then re-run the migration
```

### HMR Still Failing After Migration

**Solution**: Clear build cache and restart:

```bash
# Delete node_modules/.vite cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev
```

## Migration Safety

The migration is safe to run because:
- ✅ All new tables (no ALTER statements on existing tables)
- ✅ All new RLS policies (no changes to existing policies)
- ✅ Feature flag OFF by default (no behavior changes)
- ✅ Can be rolled back by dropping new tables

## Need Help?

If you continue to experience issues:
1. Check the browser console for specific error messages
2. Check the terminal/dev server output for Supabase errors
3. Verify your Supabase connection is working
4. Check that RLS policies are enabled (they should be by default)

