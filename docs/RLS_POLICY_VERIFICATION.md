# RLS Policy Verification Guide

## Overview

This document provides SQL queries to verify that RLS policies are correctly configured for the `recipes` and `meal_schedules` tables.

## Policy Verification Queries

### 1. List All Policies on Recipes Table

```sql
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'recipes'
ORDER BY policyname;
```

Expected policies:
- `AI can create personal recipes` (INSERT)
- `Users can create manual recipes` (INSERT)
- `Users can view accessible recipes` (SELECT)
- `Users can update their recipes` (UPDATE)
- `Users can delete their recipes` (DELETE)

### 2. Test Helper Function: Profile Ownership

```sql
-- Replace '<profile_uuid>' with an actual profile ID
SELECT public.is_user_profile('<profile_uuid>');
```

Expected: Returns `true` if the profile belongs to the current authenticated user, `false` otherwise.

### 3. Test Helper Function: Household Membership

```sql
-- Replace '<household_uuid>' with an actual household ID
SELECT public.is_user_household_member('<household_uuid>');
```

Expected: Returns `true` if the current user is an active member of the household, `false` otherwise.

### 4. Debug AI Recipe Insert (RLS Diagnostics)

```sql
-- Replace '<profile_uuid>' with the profile ID you're trying to use
SELECT public.debug_can_insert_ai_recipe('<profile_uuid>');
```

Expected output (JSON):
```json
{
  "auth_uid": "<current_user_uuid>",
  "created_for_profile_id": "<profile_uuid>",
  "is_user_profile": true,
  "checks": {
    "source_type_ai": true,
    "created_by_null": true,
    "household_null": true,
    "is_public_false": true,
    "created_for_profile_not_null": true,
    "is_user_profile_true": true
  },
  "policy_would_pass": true
}
```

If `policy_would_pass` is `false`, check which condition in `checks` is `false`.

## Policy Architecture Notes

### Why Split Policies?

The recipes table uses **separate INSERT policies** for AI and non-AI recipes:

1. **"AI can create personal recipes"** - Only evaluates for `source_type = 'ai'`
2. **"Users can create manual recipes"** - Only evaluates for `source_type IS DISTINCT FROM 'ai'`

**Benefits:**
- **Deterministic evaluation**: PostgreSQL only evaluates the relevant policy branch
- **No NULL traps**: Each policy has explicit conditions, no complex OR chains
- **No accidental branch execution**: Policies are completely isolated
- **Readable and auditable**: Clear separation of concerns

**Why this matters:**
- A single monolithic policy with complex OR chains can cause PostgreSQL to evaluate branches you expect to be skipped
- Boolean + NULL logic inside RLS is not short-circuited like in application code
- Split policies prevent these issues by ensuring only one policy is evaluated per insert

### Policy Conditions

#### AI Recipe Policy
- `source_type = 'ai'`
- `created_by IS NULL`
- `household_id IS NULL`
- `is_public = false`
- `created_for_profile_id IS NOT NULL`
- `public.is_user_profile(created_for_profile_id) = true`

#### Non-AI Recipe Policy
- `source_type IS DISTINCT FROM 'ai'`
- `created_by IS NULL OR public.is_user_profile(created_by) = true`
- One of:
  - `is_public = true AND household_id IS NULL` (public recipe)
  - `household_id IS NOT NULL AND public.is_user_household_member(household_id) = true` (household recipe)
  - `household_id IS NULL AND is_public = false AND (created_for_profile_id IS NULL OR public.is_user_profile(created_for_profile_id) = true)` (personal recipe)

## Troubleshooting

### RLS Error 42501 (new row violates row-level security policy)

1. Check which policy applies:
   - AI recipe? → Check "AI can create personal recipes" policy
   - Non-AI recipe? → Check "Users can create manual recipes" policy

2. Run the debug function:
   ```sql
   SELECT public.debug_can_insert_ai_recipe('<profile_uuid>');
   ```

3. Verify helper functions work:
   ```sql
   SELECT public.is_user_profile('<profile_uuid>');
   SELECT public.is_user_household_member('<household_uuid>');
   ```

4. Check current user:
   ```sql
   SELECT auth.uid();
   ```

5. Verify profile ownership:
   ```sql
   SELECT id, user_id 
   FROM public.profiles 
   WHERE id = '<profile_uuid>' 
     AND user_id = auth.uid();
   ```

## Meal Schedules RLS Verification

### 1. List All Policies on Meal Schedules Table

```sql
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'meal_schedules'
ORDER BY policyname;
```

Expected policies:
- `Users can create personal meal schedules` (INSERT)
- `Users can create household meal schedules` (INSERT)
- `Users can read meal schedules` (SELECT)
- `Users can update meal schedules` (UPDATE)
- `Users can delete meal schedules` (DELETE)

### 2. Debug Meal Schedule Insert (Personal)

```sql
-- Replace '<profile_uuid>' with the profile ID you're trying to use
SELECT public.debug_can_insert_meal_schedule('<profile_uuid>', NULL);
```

Expected output (JSON):
```json
{
  "auth_uid": "<current_user_uuid>",
  "household_id": null,
  "created_for_profile_id": "<profile_uuid>",
  "checks": {
    "profile_ok": true,
    "household_ok": false,
    "personal_branch": true,
    "household_branch": false,
    "household_id_null": true,
    "profile_id_not_null": true,
    "household_id_not_null": false,
    "profile_id_null": false
  },
  "policy_would_pass": true
}
```

### 3. Debug Meal Schedule Insert (Household)

```sql
-- Replace '<household_uuid>' with the household ID you're trying to use
SELECT public.debug_can_insert_meal_schedule(NULL, '<household_uuid>');
```

Expected output (JSON):
```json
{
  "auth_uid": "<current_user_uuid>",
  "household_id": "<household_uuid>",
  "created_for_profile_id": null,
  "checks": {
    "profile_ok": false,
    "household_ok": true,
    "personal_branch": false,
    "household_branch": true,
    "household_id_null": false,
    "profile_id_not_null": false,
    "household_id_not_null": true,
    "profile_id_null": true
  },
  "policy_would_pass": true
}
```

### Meal Schedules Policy Architecture

The meal_schedules table uses **separate INSERT policies** for personal and household schedules:

1. **"Users can create personal meal schedules"** - Only evaluates for `household_id IS NULL AND profile_id IS NOT NULL`
2. **"Users can create household meal schedules"** - Only evaluates for `household_id IS NOT NULL AND profile_id IS NULL`

**Benefits:**
- **Deterministic evaluation**: PostgreSQL only evaluates the relevant policy branch
- **No NULL traps**: Each policy has explicit conditions, no complex OR chains
- **No accidental branch execution**: Policies are completely isolated
- **Readable and auditable**: Clear separation of concerns

**Policy Conditions:**

#### Personal Meal Schedule Policy
- `household_id IS NULL`
- `profile_id IS NOT NULL`
- `public.is_user_profile(profile_id) = true`

#### Household Meal Schedule Policy
- `household_id IS NOT NULL`
- `profile_id IS NULL`
- `public.is_user_household_member(household_id) = true`

### Troubleshooting Meal Schedule RLS Errors

1. Check which policy applies:
   - Personal schedule? → Check "Users can create personal meal schedules" policy
   - Household schedule? → Check "Users can create household meal schedules" policy

2. Run the debug function:
   ```sql
   SELECT public.debug_can_insert_meal_schedule('<profile_uuid>', NULL);
   -- or
   SELECT public.debug_can_insert_meal_schedule(NULL, '<household_uuid>');
   ```

3. Verify helper functions work:
   ```sql
   SELECT public.is_user_profile('<profile_uuid>');
   SELECT public.is_user_household_member('<household_uuid>');
   ```

4. Check current user:
   ```sql
   SELECT auth.uid();
   ```

5. Verify profile ownership:
   ```sql
   SELECT id, user_id 
   FROM public.profiles 
   WHERE id = '<profile_uuid>' 
     AND user_id = auth.uid();
   ```

6. Verify household membership:
   ```sql
   SELECT household_id, auth_user_id, status
   FROM public.household_members
   WHERE household_id = '<household_uuid>'
     AND auth_user_id = auth.uid()
     AND status = 'active';
   ```

## Security Notes

- All helper functions use `SECURITY DEFINER` to bypass RLS on dependent tables
- Functions are granted `EXECUTE` to `authenticated` role only
- Policies use explicit schema qualification (`public.*`) for clarity
- No policies use `USING (true)` or disable RLS - security remains strict
