# Team Members RLS Infinite Recursion - Root Cause Analysis

## The Problem

When creating a new team, the system tries to insert the first `team_member` (the team creator as owner). This triggers an infinite recursion error in PostgreSQL's Row Level Security (RLS) policies.

## Root Cause: Circular Policy Dependencies

### The Recursive Chain

**Scenario: Creating a new team and adding the first member**

1. **User creates team** → INSERT into `teams` table ✅ (works fine)

2. **User tries to add themselves as first member** → INSERT into `team_members` table

3. **INSERT Policy Evaluates:**
   ```sql
   CREATE POLICY "Team owners can invite members"
     ON team_members FOR INSERT
     WITH CHECK (
       EXISTS (
         SELECT 1 FROM team_members tm  -- ⚠️ QUERIES team_members!
         WHERE tm.team_id = team_members.team_id
         AND tm.user_id = get_current_profile_id()
         AND tm.role = 'owner'
         AND tm.status = 'active'
       )
     );
   ```

4. **The Problem:** The policy queries `team_members` to check if user is an owner, BUT:
   - This is a NEW team, so `team_members` is EMPTY
   - Even if it weren't empty, querying `team_members` triggers the SELECT policy

5. **SELECT Policy Also Queries Itself:**
   ```sql
   CREATE POLICY "Active members can view team members"
     ON team_members FOR SELECT
     USING (
       EXISTS (
         SELECT 1 FROM team_members tm  -- ⚠️ ALSO QUERIES team_members!
         WHERE tm.team_id = team_members.team_id
         AND tm.user_id = get_current_profile_id()
         AND tm.status = 'active'
       )
     );
   ```

6. **Infinite Loop:**
   - INSERT policy queries `team_members` → triggers SELECT policy
   - SELECT policy queries `team_members` → triggers SELECT policy again
   - SELECT policy queries `team_members` → triggers SELECT policy again
   - ... **INFINITE RECURSION** 🔄

## Why This Happens

### PostgreSQL RLS Evaluation

When a policy queries the same table it protects:
- PostgreSQL evaluates RLS policies for that query
- If the policy queries the same table again, it triggers RLS again
- This creates a recursive loop that PostgreSQL detects and stops

### The Specific Issue

**For New Teams:**
- No `team_members` exist yet
- INSERT policy checks: "Is user an owner?" → Queries `team_members` → Empty
- But even checking "is empty" triggers SELECT policy
- SELECT policy queries `team_members` → Triggers itself → Recursion

**For Existing Teams:**
- Even if members exist, the SELECT policy queries `team_members`
- This query triggers the SELECT policy again
- Creates recursion even when data exists

## The Solution

### Use SECURITY DEFINER Functions

SECURITY DEFINER functions run with the privileges of the function creator, **bypassing RLS**:

```sql
CREATE OR REPLACE FUNCTION can_insert_team_member(...)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER  -- ⭐ This bypasses RLS
SET search_path = public
AS $$
BEGIN
  -- Queries to team_members here bypass RLS
  -- No recursion because RLS is not evaluated
END;
$$;
```

### How It Works

1. **Policy calls helper function** → Function executes with elevated privileges
2. **Function queries `team_members`** → RLS is bypassed (no policy evaluation)
3. **Function returns result** → Policy uses result (no recursion)

### Key Points

- **SECURITY DEFINER** = Function runs as creator, bypasses RLS
- **SET search_path = public** = Security best practice (prevents search path attacks)
- **STABLE** = Function result doesn't change within a transaction (allows optimization)

## Why the Original Policy Failed

The original policy tried to check permissions by querying `team_members` directly:

```sql
-- ❌ BAD: Queries team_members, triggers RLS, causes recursion
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = get_current_profile_id()
    AND tm.role = 'owner'
  )
)
```

## Why the Fix Works

The fixed policy uses a SECURITY DEFINER helper function:

```sql
-- ✅ GOOD: Function bypasses RLS, no recursion
WITH CHECK (
  can_insert_team_member(
    team_id,
    user_id,
    role::text,
    invited_by
  )
)
```

The helper function:
1. Checks `teams.created_by` first (no recursion risk)
2. Queries `team_members` with RLS bypassed (no recursion)
3. Returns boolean result (policy uses it, no further queries)

## Similar Issues in Other Policies

The SELECT policy had the same problem:

```sql
-- ❌ BAD: Queries team_members, triggers itself
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_members.team_id
    ...
  )
)
```

Fixed with:

```sql
-- ✅ GOOD: Uses SECURITY DEFINER helper
USING (
  is_active_team_member(
    team_id,
    get_current_profile_id()
  )
)
```

## Prevention Guidelines

**When writing RLS policies:**

1. ✅ **DO:** Use SECURITY DEFINER helper functions for complex checks
2. ✅ **DO:** Query other tables (not the protected table) when possible
3. ❌ **DON'T:** Query the same table the policy protects
4. ❌ **DON'T:** Create policies that trigger other policies on the same table

**Pattern to Follow:**

```sql
-- Helper function (bypasses RLS)
CREATE FUNCTION check_permission(...)
RETURNS boolean
SECURITY DEFINER
AS $$ ... $$;

-- Policy uses helper (no recursion)
CREATE POLICY "..." ON table_name
USING (check_permission(...));
```

## Summary

The infinite recursion happens because:
1. INSERT policy queries `team_members` to check permissions
2. That query triggers SELECT policy on `team_members`
3. SELECT policy also queries `team_members`
4. This creates an infinite loop

The fix:
- Use SECURITY DEFINER helper functions
- Functions bypass RLS when querying `team_members`
- No recursion because RLS is not evaluated inside the function
