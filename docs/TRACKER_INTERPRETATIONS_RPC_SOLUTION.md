# Tracker Interpretations RPC Solution

## Problem

The `tracker_interpretations` table was missing, causing 404 errors. Additionally, RLS recursion issues were occurring when RLS policies queried other RLS-protected tables.

## Solution

Instead of creating a table with RLS policies, we use **SECURITY DEFINER RPCs** to handle all CRUD operations. This approach:

1. **Avoids RLS Recursion**: RPCs use `SECURITY DEFINER` to bypass RLS, preventing circular dependencies
2. **Maintains Security**: All RPCs check `auth.uid()` to ensure users only access their own data
3. **Preserves Functionality**: All CRUD operations are supported via RPCs

## Implementation

### Database Migration

**File**: `supabase/migrations/20260131000017_create_tracker_interpretations_rpc.sql`

- Creates `tracker_interpretations` table **without RLS enabled**
- Creates 5 RPC functions:
  - `get_tracker_interpretations()` - List with filters
  - `get_tracker_interpretation()` - Get single by ID
  - `create_tracker_interpretation()` - Create new
  - `update_tracker_interpretation()` - Update existing
  - `archive_tracker_interpretation()` - Soft delete
- All RPCs use `SECURITY DEFINER` and check `owner_id = auth.uid()`
- Grants `EXECUTE` permission to `authenticated` role

### Frontend Changes

**File**: `src/lib/trackerStudio/trackerInterpretationNoteService.ts`

All `.from('tracker_interpretations')` calls replaced with RPC calls:

```typescript
// Before
const { data } = await supabase
  .from('tracker_interpretations')
  .select('*')
  .eq('owner_id', user.id);

// After
const { data } = await supabase.rpc('get_tracker_interpretations', {
  p_start_date: null,
  p_end_date: null,
  p_tracker_id: null,
  p_context_event_id: null,
  p_include_archived: false,
});
```

## Why This Avoids RLS Recursion

1. **No RLS on Table**: The `tracker_interpretations` table has RLS disabled
2. **SECURITY DEFINER**: RPCs run with elevated privileges, bypassing RLS checks
3. **Direct User Check**: RPCs check `auth.uid()` directly, not through other tables
4. **No Cross-Table Queries**: RPCs only query `tracker_interpretations`, never `trackers` or `tracker_observation_links`

## RPC Function Signatures

### List Interpretations
```sql
get_tracker_interpretations(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_tracker_id uuid DEFAULT NULL,
  p_context_event_id uuid DEFAULT NULL,
  p_include_archived boolean DEFAULT false
)
```

### Get Single Interpretation
```sql
get_tracker_interpretation(p_id uuid)
```

### Create Interpretation
```sql
create_tracker_interpretation(
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_tracker_ids uuid[] DEFAULT NULL,
  p_context_event_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_body text
)
```

### Update Interpretation
```sql
update_tracker_interpretation(
  p_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_tracker_ids uuid[] DEFAULT NULL,
  p_context_event_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_body text DEFAULT NULL
)
```

### Archive Interpretation
```sql
archive_tracker_interpretation(p_id uuid)
```

## Frontend Usage Example

```typescript
import { supabase } from '../lib/supabase';

// List interpretations
const { data, error } = await supabase.rpc('get_tracker_interpretations', {
  p_start_date: '2025-01-01',
  p_end_date: '2025-01-31',
  p_tracker_id: 'tracker-uuid',
  p_include_archived: false,
});

// Create interpretation
const { data, error } = await supabase.rpc('create_tracker_interpretation', {
  p_start_date: '2025-01-01',
  p_end_date: '2025-01-31',
  p_tracker_ids: ['tracker-uuid-1', 'tracker-uuid-2'],
  p_title: 'My Reflection',
  p_body: 'This is my interpretation...',
});
```

## Security

- All RPCs require authentication (`auth.uid()` must not be NULL)
- All RPCs filter by `owner_id = auth.uid()` to ensure users only access their own data
- No RLS policies means no recursion, but security is maintained through RPC logic
- `SECURITY DEFINER` ensures RPCs can bypass RLS when needed

## Benefits

1. ✅ **No RLS Recursion**: Table has no RLS, RPCs bypass RLS
2. ✅ **Secure**: All operations check ownership
3. ✅ **Performant**: Direct table access without RLS overhead
4. ✅ **Maintainable**: Clear separation of concerns
5. ✅ **Flexible**: Easy to add new filters or operations
