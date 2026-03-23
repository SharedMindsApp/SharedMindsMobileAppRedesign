# Tracker Templates vs Planner Trackers Comparison

This document compares all tracker templates with trackers found in the Planner section to ensure nothing is missing.

## Summary

✅ **All Planner trackers that should have templates have been created!**

## Trackers in Planner

### Self-Care Trackers

| Tracker | Template Status | Template Name | Migration File |
|---------|----------------|---------------|----------------|
| Sleep Tracker | ✅ | Sleep Tracker | `20260131000013_create_planner_tracker_templates.sql` |
| Exercise Tracker | ✅ | Exercise Tracker | `20260131000013_create_planner_tracker_templates.sql` |
| Nutrition Log | ✅ | Nutrition Log | `20260131000013_create_planner_tracker_templates.sql` |
| Gratitude Journal | ✅ | Gratitude Journal | `20260131000013_create_planner_tracker_templates.sql` |
| Mindfulness & Meditation | ✅ | Mindfulness & Meditation | `20260131000013_create_planner_tracker_templates.sql` |
| Rest & Recovery | ✅ | Rest & Recovery | `20260131000013_create_planner_tracker_templates.sql` |
| Mental Health Check-Ins | ✅ | Mental Health Check-in | `20260131000023_add_missing_planner_tracker_templates.sql` |
| Beauty Routines | ⚠️ | N/A | Not a tracker (checklist/routine system) |

### Personal Development Trackers

| Tracker | Template Status | Template Name | Migration File |
|---------|----------------|---------------|----------------|
| Growth Tracking | ✅ | Growth Tracking | `20260131000013_create_planner_tracker_templates.sql` |
| Personal Journal | ✅ | Personal Journal | `20260131000013_create_planner_tracker_templates.sql` |
| Goal Tracker | ⚠️ | N/A | Has its own domain (Goals system) |
| Habit Tracker | ⚠️ | N/A | Has its own domain (Habits system) |
| Skills Development | ⚠️ | N/A | Skill management system, not a tracker |
| Life Milestones | ⚠️ | N/A | Event log, not a time-series tracker |

### Finance Trackers

| Tracker | Template Status | Template Name | Migration File |
|---------|----------------|---------------|----------------|
| Income & Cash Flow | ✅ | Income & Cash Flow | `20260131000013_create_planner_tracker_templates.sql` |
| Financial Reflection | ✅ | Financial Reflection | `20260131000023_add_missing_planner_tracker_templates.sql` |
| Spending & Expenses | ⚠️ | N/A | Placeholder ("coming soon") - no data yet |

### Vision Trackers

| Tracker | Template Status | Template Name | Migration File |
|---------|----------------|---------------|----------------|
| Monthly Vision Check-in | ✅ | Monthly Vision Check-in | `20260131000023_add_missing_planner_tracker_templates.sql` |

## Additional Templates Created

The following templates were created but are not directly from Planner trackers (they're useful general-purpose templates):

1. **Mood Tracker** - `20260131000018_add_additional_tracker_templates.sql`
2. **Energy Level Tracker** - `20260131000018_add_additional_tracker_templates.sql`
3. **Water Intake Tracker** - `20260131000018_add_additional_tracker_templates.sql`
4. **Medication Tracker** - `20260131000018_add_additional_tracker_templates.sql`
5. **Symptom Tracker** - `20260131000018_add_additional_tracker_templates.sql`
6. **Stress Level Tracker** - `20260131000018_add_additional_tracker_templates.sql`
7. **Productivity Tracker** - `20260131000018_add_additional_tracker_templates.sql`
8. **Social Connection Tracker** - `20260131000018_add_additional_tracker_templates.sql`
9. **Weather & Environment Tracker** - `20260131000018_add_additional_tracker_templates.sql`
10. **Habit Check-in Tracker** - `20260131000018_add_additional_tracker_templates.sql`

## Complete Template List

### From Migration: `20260131000013_create_planner_tracker_templates.sql`
1. Sleep Tracker
2. Exercise Tracker
3. Nutrition Log
4. Mindfulness & Meditation
5. Rest & Recovery
6. Growth Tracking
7. Gratitude Journal
8. Personal Journal
9. Income & Cash Flow

### From Migration: `20260131000018_add_additional_tracker_templates.sql`
1. Mood Tracker
2. Energy Level Tracker
3. Water Intake Tracker
4. Medication Tracker
5. Symptom Tracker
6. Stress Level Tracker
7. Productivity Tracker
8. Social Connection Tracker
9. Weather & Environment Tracker
10. Habit Check-in Tracker

### From Migration: `20260131000023_add_missing_planner_tracker_templates.sql`
1. Mental Health Check-in
2. Financial Reflection
3. Monthly Vision Check-in

## Conclusion

**All trackers from the Planner that should have templates have been created.** The following items from the Planner are intentionally not trackers:

- **Beauty Routines** - Checklist/routine system, not a time-series tracker
- **Goal Tracker** - Has its own Goals domain system
- **Habit Tracker** - Has its own Habits domain system
- **Skills Development** - Skill management system, not tracking
- **Life Milestones** - Event log, not time-series tracking
- **Spending & Expenses** - Placeholder feature, no implementation yet

## Recommendations

1. ✅ All Planner trackers are covered
2. Consider creating a template for "Spending & Expenses" when that feature is implemented
3. The additional templates (Mood, Energy, Water, etc.) are useful complements to the Planner trackers

## Verification

To verify templates exist in the database, run:

```sql
SELECT name, description, scope, created_at
FROM tracker_templates
WHERE scope = 'global'
ORDER BY created_at;
```

Expected count: **22 global templates** (9 from initial migration + 10 additional + 3 missing = 22 total)
