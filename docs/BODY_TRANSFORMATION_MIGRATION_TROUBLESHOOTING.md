# Body Transformation Migration Troubleshooting

## Issue: 406 (Not Acceptable) Error Persisting

If you're seeing repeated `406 (Not Acceptable)` errors for `body_profiles` table, follow these steps:

## Step 1: Verify Tables Exist

Run this in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT 
  table_name,
  table_schema,
  CASE 
    WHEN table_name IN ('body_profiles', 'body_measurements') THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('body_profiles', 'body_measurements');
```

**Expected Result**: Should return 2 rows with "✓ EXISTS" status.

**If 0 rows returned**: Tables don't exist - run migration `20260215000000_create_body_transformation_tables.sql` again.

## Step 2: Verify RLS is Enabled

```sql
-- Check RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('body_profiles', 'body_measurements');
```

**Expected Result**: Both tables should have `rls_enabled = true`.

## Step 3: Check Policies Exist

```sql
-- List all policies for body transformation tables
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename IN ('body_profiles', 'body_measurements')
ORDER BY tablename, policyname;
```

**Expected Result**: 
- `body_profiles`: 3 policies (SELECT, INSERT, UPDATE)
- `body_measurements`: 4 policies (SELECT, INSERT, UPDATE, DELETE)

## Step 4: Force PostgREST Schema Reload

Run this in Supabase SQL Editor:

```sql
-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Wait 5-10 seconds, then verify PostgREST can see the tables
SELECT 
  schemaname,
  tablename
FROM pg_catalog.pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('body_profiles', 'body_measurements');
```

## Step 5: Manual PostgREST Restart (If Above Doesn't Work)

### Option A: Supabase Dashboard (Recommended)
1. Go to **Settings** → **API** in your Supabase Dashboard
2. Look for **PostgREST** section
3. Click **"Restart"** or **"Reload Schema"** button
4. Wait 30-60 seconds for PostgREST to restart
5. Refresh your browser

### Option B: Using Supabase CLI (If Available)
```bash
# Restart PostgREST service (if using local Supabase)
supabase stop
supabase start
```

## Step 6: Verify PostgREST Can Access Tables

After restarting PostgREST, test the API endpoint directly:

```bash
# Test if PostgREST can see body_profiles
# Replace YOUR_SUPABASE_URL with your actual Supabase URL
curl -X GET \
  "YOUR_SUPABASE_URL/rest/v1/body_profiles?select=*&limit=0" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Expected Response**: 
- `200 OK` with empty array `[]` = Success (table exists, just no data)
- `406 Not Acceptable` = PostgREST still can't see the table

## Step 7: Check Migration Application Status

```sql
-- Check if migrations have been applied (if using Supabase migrations table)
SELECT 
  version,
  name,
  applied_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%body_transformation%'
ORDER BY applied_at DESC;
```

## Common Issues & Solutions

### Issue: Tables Exist But PostgREST Returns 406

**Cause**: PostgREST schema cache is stale.

**Solution**: 
1. Run `NOTIFY pgrst, 'reload schema';` in SQL Editor
2. Wait 10-30 seconds
3. If still 406, restart PostgREST via Dashboard
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: Migration Runs But Tables Don't Appear

**Cause**: Migration may have failed silently on certain statements.

**Solution**:
1. Check migration logs in Supabase Dashboard → Logs → Postgres
2. Run migration statements one section at a time
3. Verify each CREATE TABLE statement succeeded

### Issue: Policies Exist But 406 Still Occurs

**Cause**: PostgREST needs explicit schema refresh after policy changes.

**Solution**:
1. Drop and recreate policies (migration should do this)
2. Run `NOTIFY pgrst, 'reload schema';` after policy changes
3. Restart PostgREST if NOTIFY doesn't work

## Quick Fix Script

Run this complete diagnostic and fix script:

```sql
-- 1. Verify tables exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'body_profiles'
  ) THEN
    RAISE EXCEPTION 'body_profiles table does not exist. Run migration first.';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'body_measurements'
  ) THEN
    RAISE EXCEPTION 'body_measurements table does not exist. Run migration first.';
  END IF;
  
  RAISE NOTICE '✓ Tables exist';
END $$;

-- 2. Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT rowsecurity FROM pg_tables WHERE tablename = 'body_profiles') THEN
    ALTER TABLE body_profiles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on body_profiles';
  END IF;
  
  IF NOT (SELECT rowsecurity FROM pg_tables WHERE tablename = 'body_measurements') THEN
    ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on body_measurements';
  END IF;
END $$;

-- 3. Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

RAISE NOTICE '✓ Schema cache reloaded. Wait 10-30 seconds, then refresh browser.';
```

## Still Not Working?

If you've completed all steps above and still see 406 errors:

1. **Check PostgREST logs** in Supabase Dashboard → Logs → PostgREST
2. **Verify table is in `public` schema** (not another schema)
3. **Contact Supabase support** if PostgREST restart doesn't help

## Note About 406 Errors in Browser

The code is designed to handle 406 errors gracefully:
- Returns `null` instead of throwing errors
- Logs a warning: "Body profiles table may not exist yet"
- App continues to work (body transformation features just won't be available)

These console errors are **not breaking the app** - they're expected until the migration is fully applied and PostgREST recognizes the tables.
