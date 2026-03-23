# Phase 1 Implementation Checklist

## ✅ Completed

1. **Database Migration**
   - ✅ Created migration file: `20260220000000_add_todo_breakdown_system.sql`
   - ✅ Added `has_breakdown`, `breakdown_context`, `breakdown_generated_at` columns
   - ✅ Created `todo_micro_steps` table with RLS policies
   - ✅ Added indexes for performance

2. **Service Layer**
   - ✅ Created `intelligentTodoService.ts` with all CRUD operations
   - ✅ AI breakdown generation with fallback to rule-based
   - ✅ Micro-step management functions

3. **AI Integration**
   - ✅ Registered `breakdown_task` intent
   - ✅ Registered `intelligent_todo` feature key
   - ✅ Updated `providerRegistryTypes.ts`

4. **UI Components**
   - ✅ Created `TodoBreakdownModal.tsx`
   - ✅ Updated `UnifiedTodoList.tsx` with breakdown UI
   - ✅ Added micro-step display and completion tracking

5. **Type Definitions**
   - ✅ Extended `PersonalTodo` interface
   - ✅ Created `MicroStep` interface
   - ✅ Created `TaskBreakdownResult` interface

---

## 🔲 Remaining Tasks

### 1. Run Database Migration ⚠️ REQUIRED

**Action**: Run the migration on your database

```bash
# If using Supabase CLI
supabase migration up

# Or apply manually via Supabase dashboard
# File: supabase/migrations/20260220000000_add_todo_breakdown_system.sql
```

**Status**: ⚠️ **Must be done before testing**

---

### 2. AI Route Configuration (Optional for Phase 1)

**Current State**: The system will use the fallback route (Claude 3.5 Sonnet) if no specific route is configured.

**Optional Enhancement**: Create a specific route for `intelligent_todo` feature in the database:

```sql
-- Optional: Create specific route for intelligent_todo
-- This can be done later via admin UI or migration
INSERT INTO ai_feature_routes (
  feature_key,
  surface_type,
  provider_model_id,
  is_fallback,
  priority,
  constraints,
  is_enabled
) VALUES (
  'intelligent_todo',
  'personal',
  (SELECT id FROM ai_provider_models WHERE model_key = 'claude-3-5-sonnet-20241022' LIMIT 1),
  false,
  1,
  '{"maxContextTokens": 200000, "maxOutputTokens": 1000}'::jsonb,
  true
);
```

**Status**: ✅ **Not required** - fallback will work fine for Phase 1

---

### 3. Testing Checklist

**Manual Testing Steps**:

1. ✅ **Create a task**
   - Go to `/planner/planning/todos`
   - Create a new task (e.g., "Clean my room")

2. ✅ **Generate breakdown**
   - Click the Sparkles icon (✨) on a task
   - Select optional context (or skip)
   - Click "Break it down"
   - Verify AI generates 3-6 micro-steps

3. ✅ **Save breakdown**
   - Review generated steps
   - Click "Save breakdown"
   - Verify task now shows breakdown indicator

4. ✅ **View micro-steps**
   - Expand the task (click chevron)
   - Verify micro-steps are displayed
   - Verify progress counter (X of Y steps)

5. ✅ **Complete micro-steps**
   - Check off individual steps
   - Verify step gets strikethrough
   - Verify progress counter updates

6. ✅ **Error handling**
   - Test with AI service disabled (should fallback to rule-based)
   - Test with invalid task title
   - Test network errors

**Status**: 🔲 **Ready for testing** after migration is run

---

### 4. Edge Cases to Verify

- [ ] **Task with no breakdown** - Should show "Break this down" button
- [ ] **Task with breakdown** - Should NOT show "Break this down" button again
- [ ] **All micro-steps completed** - Progress should show "X of X"
- [ ] **Empty breakdown** - Should handle gracefully
- [ ] **Long task titles** - Should truncate or wrap properly
- [ ] **Many micro-steps** - Should scroll properly in modal
- [ ] **Concurrent updates** - Multiple users (if sharing)

**Status**: 🔲 **Test after migration**

---

### 5. Optional Enhancements (Not Required for Phase 1)

These can be added later if needed:

- [ ] **Breakdown in TodoCanvasWidget** - Add breakdown support to widget view
- [ ] **Edit micro-steps** - Allow users to edit step text after saving
- [ ] **Reorder micro-steps** - Drag-and-drop reordering
- [ ] **Delete micro-steps** - Remove individual steps
- [ ] **Regenerate breakdown** - Option to regenerate if user doesn't like it
- [ ] **Breakdown suggestions** - Gentle hints for tasks that might benefit

**Status**: 🔲 **Future enhancements** - Not in Phase 1 scope

---

### 6. Documentation Updates

- [ ] Update `UNIFIED_TODO_SYSTEM.md` to mention breakdown feature
- [ ] Add user-facing documentation (if needed)
- [ ] Update API documentation (if needed)

**Status**: 🔲 **Optional** - Implementation docs already exist

---

## 🚀 Deployment Steps

1. **Run migration** (REQUIRED)
   ```bash
   supabase migration up
   ```

2. **Verify migration**
   - Check that `personal_todos` has new columns
   - Check that `todo_micro_steps` table exists
   - Check RLS policies are active

3. **Test in development**
   - Follow testing checklist above
   - Verify AI breakdown generation works
   - Verify fallback works if AI fails

4. **Deploy to production**
   - Run migration on production database
   - Monitor for errors
   - Check AI route resolution logs

---

## 📝 Notes

### AI Route Fallback
The system will automatically use the fallback route (Claude 3.5 Sonnet) if no specific route is configured for `intelligent_todo`. This is fine for Phase 1.

### Database Fields
The `getTodos()` function uses `select('*')` which automatically includes the new breakdown fields, so no code changes needed there.

### Error Handling
- AI failures fallback to rule-based breakdown
- Database errors are caught and shown via toast
- Network errors are handled gracefully

### Performance
- Micro-steps are loaded on-demand when task is expanded
- No unnecessary API calls
- Indexes ensure fast queries

---

## ✅ Phase 1 Complete When:

1. ✅ Migration is run
2. ✅ Basic testing passes
3. ✅ Users can generate and save breakdowns
4. ✅ Users can complete micro-steps

**Everything else is optional or for future phases.**
