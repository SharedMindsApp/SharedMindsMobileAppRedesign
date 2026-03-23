# Planner Trackers Inventory

This document lists all tracking features currently in the Planner section that could be migrated to Tracker Studio.

## Self-Care Trackers

### 1. **Sleep Tracker** (`selfcare/SleepTracker.tsx`)
- **Fields:**
  - Date (required)
  - Duration (hours, optional)
  - Quality Rating (1-5 stars)
  - Notes (optional)
- **Granularity:** Daily
- **Current Data:** `sleep_logs` table via `selfCareService`
- **Migration Priority:** High

### 2. **Exercise Tracker** (`selfcare/ExerciseTracker.tsx`)
- **Fields:**
  - Activity Type (text, required)
  - Date (required)
  - Duration (minutes, optional)
  - Intensity (low/medium/high, optional)
  - Notes (optional)
- **Granularity:** Daily/Event
- **Current Data:** `exercise_entries` table via `selfCareService`
- **Migration Priority:** High

### 3. **Nutrition Log** (`selfcare/NutritionLog.tsx`)
- **Fields:**
  - Meal Type (breakfast/lunch/dinner/snack/other, optional)
  - Date & Time (required)
  - Content (what you ate, required)
  - Tags (balanced/rushed/social/comfort/healthy/homemade/takeout, optional array)
  - Mood Note (optional)
- **Granularity:** Daily (multiple entries per day)
- **Current Data:** `nutrition_logs` table via `selfCareService`
- **Migration Priority:** High

### 4. **Gratitude Journal** (`selfcare/GratitudeJournal.tsx`)
- **Fields:**
  - Date (required)
  - Format (free_write/bullets, required)
  - Content (required)
- **Granularity:** Daily
- **Current Data:** `gratitude_entries` table via `selfCareService`
- **Migration Priority:** Medium (could be a journal tracker)

### 5. **Mindfulness & Meditation** (`selfcare/MindfulnessMeditation.tsx`)
- **Fields:**
  - Session Type (Breathing Exercise/Meditation/Body Scan/Grounding Exercise/Mindful Walk/Visualization/Other, required)
  - Date (required)
  - Duration (minutes, optional)
  - Reflection (optional)
- **Granularity:** Daily/Event
- **Current Data:** `mindfulness_sessions` table via `selfCareService`
- **Migration Priority:** High

### 6. **Rest & Recovery** (`selfcare/RestRecovery.tsx`)
- **Fields:**
  - Date (required)
  - Log Type (rest_block/recovery_day/burnout_note, required)
  - Duration (minutes, optional)
  - Notes (optional)
- **Granularity:** Daily/Event
- **Current Data:** `rest_recovery_logs` table via `selfCareService`
- **Migration Priority:** High

### 7. **Beauty Routines** (`selfcare/BeautyRoutines.tsx`)
- **Fields:**
  - Routine Name (text, required)
  - Routine Type (morning/evening/weekly/other, required)
  - Steps (array of text, required)
  - Frequency (text, optional)
- **Granularity:** Event-based (not time-series)
- **Current Data:** `beauty_routines` table via `selfCareService`
- **Migration Priority:** Low (more of a checklist/routine than a tracker)

## Personal Development Trackers

### 8. **Goal Tracker** (`widgets/GoalTrackerWidget.tsx`)
- **Current Implementation:** Wrapper around `GoalTrackerCore` from `activities/goals`
- **Fields:** Managed by Goals domain
- **Granularity:** Varies
- **Current Data:** Goals system (separate domain)
- **Migration Priority:** Low (already has its own domain, but could be unified)

### 9. **Habit Tracker** (`widgets/HabitTrackerWidget.tsx`)
- **Current Implementation:** Wrapper around `HabitTrackerCore` from `activities/habits`
- **Fields:** Managed by Habits domain
- **Granularity:** Daily
- **Current Data:** Habits system (separate domain)
- **Migration Priority:** Low (already has its own domain, but could be unified)

### 10. **Skills Development** (`personal/SkillsDevelopmentView.tsx`)
- **Current Implementation:** Skills management with contexts and links
- **Fields:** Skill name, category, proficiency, contexts, links
- **Granularity:** Not time-series (skill state tracking)
- **Current Data:** `user_skills`, `skill_contexts`, `skill_entity_links` tables
- **Migration Priority:** Low (more of a skill management system than a tracker)

### 11. **Growth Tracking** (`personal/GrowthTrackingView.tsx`)
- **Fields:**
  - Date (required)
  - Confidence Level (1-5 rating, required)
  - Emotional Resilience (1-5 rating, required)
  - Focus & Clarity (1-5 rating, required)
  - Self-Trust (1-5 rating, required)
  - Notes (optional)
  - Reflection (optional)
- **Granularity:** Daily/Weekly
- **Current Data:** `growth_checkins` table via `personalDevelopmentService`
- **Migration Priority:** High

### 12. **Personal Journal** (`personal/PersonalJournalView.tsx`)
- **Fields:**
  - Title (optional)
  - Content (required)
  - Tags (array, optional)
  - Date (required)
  - Privacy (boolean, required)
- **Granularity:** Daily
- **Current Data:** `personal_dev_ideas` table
- **Migration Priority:** Medium (could be a journal tracker or interpretation)

### 13. **Life Milestones** (`personal/LifeMilestonesView.tsx`)
- **Fields:**
  - Title (required)
  - Description (optional)
  - Reflection (optional)
  - Milestone Date (required)
  - Is Approximate Date (boolean)
  - Category (required)
  - Tags (array, optional)
  - Privacy (boolean, required)
- **Granularity:** Event-based (not time-series)
- **Current Data:** `milestones` table via `personalDevelopmentService`
- **Migration Priority:** Low (more of a milestone log than a tracker)

## Education Trackers

### 14. **Progress Metrics** (`education/ProgressMetrics.tsx`)
- **Current Implementation:** Aggregated metrics dashboard
- **Fields:** Calculated from goals, courses, study hours, notes, skills
- **Granularity:** Aggregated (not entry-based)
- **Current Data:** Aggregated from multiple sources
- **Migration Priority:** Low (this is analytics, not a tracker)

## Finance Trackers

### 15. **Income & Cash Flow** (`finance/IncomeAndCashFlow.tsx`)
- **Fields:**
  - Source Name (required)
  - Source Type (salary/freelance/benefits/passive/business/investment_income/other, required)
  - Frequency (weekly/biweekly/monthly/quarterly/annual/irregular, required)
  - Expected Amount (number, optional)
  - Actual Amount (number, optional)
  - Notes (optional)
  - Currency (default: USD)
  - Is Active (boolean, required)
- **Granularity:** Recurring (not daily entries)
- **Current Data:** `income_sources` table via `financeService`
- **Migration Priority:** Medium (could be a recurring tracker)

### 16. **Spending & Expenses** (`finance/SpendingAndExpenses.tsx`)
- **Current Implementation:** Placeholder ("coming soon")
- **Fields:** TBD
- **Granularity:** TBD
- **Current Data:** None
- **Migration Priority:** Future

## Already Integrated

### 17. **Tracker Studio Trackers** (`tracker/PlannerTrackerBlock.tsx`)
- **Current Implementation:** Read-only view of Tracker Studio trackers
- **Fields:** Schema-driven (any field types)
- **Granularity:** Configurable (daily/session/event/range)
- **Current Data:** Tracker Studio system
- **Status:** ✅ Already using Tracker Studio

## Summary by Migration Priority

### High Priority (Clear Tracker Use Cases)
1. Sleep Tracker
2. Exercise Tracker
3. Nutrition Log
4. Mindfulness & Meditation
5. Rest & Recovery
6. Growth Tracking

### Medium Priority (Could Work as Trackers)
7. Gratitude Journal
8. Personal Journal
9. Income & Cash Flow

### Low Priority (Different Use Cases)
10. Beauty Routines (checklist/routine, not time-series)
11. Goal Tracker (has its own domain)
12. Habit Tracker (has its own domain)
13. Skills Development (skill management, not tracking)
14. Life Milestones (event log, not time-series)
15. Progress Metrics (analytics, not tracking)

## Migration Considerations

### Data Migration
- Most trackers use `selfCareService` or `personalDevelopmentService`
- Need to map existing data structures to Tracker Studio schema
- Consider data export/import tools

### Feature Parity
- Some trackers have specific UI/UX (e.g., star ratings for sleep quality)
- Need to ensure Tracker Studio supports all required field types
- Consider custom field types if needed (e.g., star rating widget)

### User Experience
- Users may be familiar with current tracker UIs
- Migration should feel like an upgrade, not a downgrade
- Consider migration guides or templates

### Integration Points
- Some trackers are embedded in Planner pages
- Need to maintain Planner integration after migration
- Consider Tracker Studio widgets for Planner embedding
