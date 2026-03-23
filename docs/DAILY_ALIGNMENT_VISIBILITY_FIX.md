# Daily Alignment Visibility Fix

## Issue
The Daily Alignment feature was not appearing on the main dashboard UI.

## Root Causes Identified

1. **Missing from ND-Optimized Layout**: The feature was only integrated into `StandardDashboardLayout.tsx` but not `NDOptimizedDashboardLayout.tsx`. Users with ADHD, ASD, or anxiety neurotypes use the ND-optimized layout, so they wouldn't see the feature.

2. **Default State**: The feature defaulted to disabled (`false`), requiring users to manually enable it in settings before it would appear. This made the feature non-discoverable.

## Fixes Applied

### 1. Added to Both Dashboard Layouts
- Integrated Daily Alignment panel into `StandardDashboardLayout.tsx` ✓ (already done)
- Integrated Daily Alignment panel into `NDOptimizedDashboardLayout.tsx` ✓ (newly added)

### 2. Changed Default State to Enabled
- Updated database default value from `false` to `true`
- Updated all existing users to have `daily_alignment_enabled = true`
- Changed service function fallback from `false` to `true`

### 3. Migration Applied
Created `20251216170000_enable_daily_alignment_by_default.sql` to:
- Set column default to `true`
- Enable feature for all existing users

## How to Verify

1. **Navigate to Dashboard**: The Daily Alignment panel should now appear at the top of the main dashboard page

2. **Check Settings**: Visit Settings > Daily Alignment toggle should be ON by default

3. **Test Toggle**:
   - Turn OFF in settings → panel disappears from dashboard
   - Turn ON in settings → panel reappears on dashboard

4. **Expected Behavior**:
   - Panel shows when enabled
   - Panel shows on first dashboard visit each day
   - Three action buttons: "Hide for now", "Dismiss for today", "Complete alignment"
   - Work picker on left, calendar spine on right
   - Drag-and-drop work items to calendar

## User Experience

The Daily Alignment panel now:
- Appears by default for all users
- Works in both standard and ND-optimized layouts
- Can be disabled in settings if users don't want it
- Follows all non-judgmental, optional principles from the spec

## Technical Details

**Files Modified:**
- `src/components/dashboard/NDOptimizedDashboardLayout.tsx` - Added Daily Alignment support
- `src/lib/regulation/dailyAlignmentService.ts` - Changed default fallback to `true`
- Database migration applied to enable by default

**No Breaking Changes:**
- All existing functionality preserved
- Users can still disable the feature
- Feature remains fully optional
