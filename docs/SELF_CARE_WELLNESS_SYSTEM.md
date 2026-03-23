# Self-Care & Wellness System

## Overview
A comprehensive, privacy-first self-care and wellness tracking system integrated into the Personal Planner. Designed with a supportive, non-clinical approach that emphasizes awareness over achievement.

## Core Principles

### 1. Privacy by Default
- **All data is private by default**
- Users have explicit control over what gets shared
- Mental health check-ins are NEVER auto-shared
- Opt-in sharing model for all features

### 2. Non-Clinical, Non-Judgmental
- No diagnostic language or medical framing
- No streaks or forced daily engagement
- No "success/failure" terminology
- Supportive infrastructure, not self-improvement theatre

### 3. Awareness Over Achievement
- Focus on building self-awareness
- Track patterns, not metrics
- Qualitative reflection encouraged
- No competition or comparisons

## Features Implemented

### 1. Wellness Goals
**Route:** `/planner/selfcare/goals`

**Purpose:** Set gentle intentions for wellbeing

**Features:**
- Create goals with title, description, and category (physical, mental, emotional, social)
- Optional timeframe (flexible, no pressure)
- Reflection notes for qualitative tracking
- Mark as active or completed (not "failed")
- Edit and update anytime

**Privacy:** Private to personal space by default

**Database:** `wellness_goals` table

### 2. Exercise Tracker
**Route:** `/planner/selfcare/exercise`

**Purpose:** Support movement without obsession

**Features:**
- Log activity type (walk, yoga, gym, etc.)
- Optional duration in minutes
- Intensity levels (low, medium, high)
- Reflection notes ("felt good", "tiring")
- Date-based tracking

**Privacy:** Private by default, optional aggregated sharing

**Database:** `exercise_entries` table

**Key Design:** No calories, no competition, no forced metrics

### 3. Mental Health Check-Ins
**Route:** `/planner/selfcare/mental`

**Purpose:** Emotional awareness, not diagnosis

**Features:**
- Mood selection with visual emoji options (peaceful, happy, anxious, sad, etc.)
- Energy level slider (1-5)
- Stress level slider (1-5)
- Open reflection text box
- Date and time stamped

**Privacy:**
- **Most private feature**
- Completely locked down by default
- NEVER shared unless explicitly enabled
- Encrypted reflection notes
- Clear "Completely Private" warning displayed

**Database:** `mental_health_checkins` table

**Key Design:** Never labeled as medical, purely for self-awareness

## Additional Features (Database Ready)

### 4. Nutrition Log
**Purpose:** Awareness-based meal logging

**Features Ready:**
- Meal entries (free text)
- Optional tags (balanced, rushed, social)
- Mood correlation tracking
- No macro counting or diet scoring

**Database:** `nutrition_logs` table

### 5. Sleep Tracker
**Purpose:** Track rest gently

**Features Ready:**
- Sleep duration (optional)
- Quality rating (1-5, self-assessed)
- Notes field for reflections
- No sleep scores or judgment

**Database:** `sleep_logs` table

### 6. Mindfulness & Meditation
**Purpose:** Presence, not performance

**Features Ready:**
- Session type tracking
- Optional duration
- Reflection notes
- No timer requirements

**Database:** `mindfulness_sessions` table

### 7. Self-Care Routines
**Purpose:** Build repeatable care habits

**Features Ready:**
- Routine name and activities (JSONB array)
- Flexible frequency tracking
- Completion logging
- Optional gentle reminders

**Database:** `selfcare_routines` + `selfcare_routine_completions` tables

### 8. Gratitude Journal
**Purpose:** Cultivate positive awareness

**Features Ready:**
- Daily entries
- Free-write or bullet format
- Optional prompt suggestions
- No forced daily use

**Database:** `gratitude_entries` table

### 9. Beauty & Skincare
**Purpose:** Practical self-maintenance

**Features Ready:**
- Routine steps (JSONB)
- Product notes (JSONB)
- Frequency tracking
- Last completed date

**Database:** `beauty_routines` table

### 10. Rest & Recovery
**Purpose:** Normalize intentional rest

**Features Ready:**
- Rest blocks, recovery days, burnout notes
- Duration tracking
- Optional daily planner surfacing
- Shared signal option ("Rest day")

**Database:** `rest_recovery_logs` table

## Database Architecture

### Tables Created
1. `wellness_goals` - Goal intentions with categories
2. `exercise_entries` - Movement activity logs
3. `nutrition_logs` - Meal and nutrition awareness
4. `sleep_logs` - Rest quality tracking (unique per user/date)
5. `mental_health_checkins` - Private emotional awareness
6. `mindfulness_sessions` - Meditation and presence
7. `selfcare_routines` - Repeatable care habits
8. `selfcare_routine_completions` - Completion tracking
9. `gratitude_entries` - Positive awareness entries
10. `beauty_routines` - Self-maintenance routines
11. `rest_recovery_logs` - Intentional rest tracking
12. `wellness_shares` - Privacy control (future use)

### Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Strict policies: SELECT, INSERT, UPDATE, DELETE only for owner
- No cross-user visibility
- Sharing table prepared but not yet implemented in UI

## Service Layer

**File:** `src/lib/selfCareService.ts`

**Functions Available:**
- `getPersonalSpaceId()` - Get user's personal space ID
- `getWellnessGoals()` - Fetch wellness goals
- `createWellnessGoal()` - Create new goal
- `updateWellnessGoal()` - Update existing goal
- `deleteWellnessGoal()` - Delete goal
- `getExerciseEntries()` - Fetch exercise logs
- `createExerciseEntry()` - Log exercise
- `deleteExerciseEntry()` - Delete exercise log
- Similar CRUD operations for all features
- Type-safe with TypeScript interfaces

## UI/UX Design

### Landing Page
**Route:** `/planner/selfcare` (or `/planner/self-care`)

**Design:**
- Beautiful card-based grid layout
- Gradient icons for each feature
- Hover animations and transitions
- Privacy notice prominently displayed
- "How Self-Care Works" educational section

### Feature Pages

**Consistent Design Patterns:**
- Back navigation to section index
- Feature icon with gradient background
- Clear title and supportive subtitle
- Privacy/context notices where relevant
- Form-based data entry with validation
- List-based display of entries
- Edit and delete capabilities
- Empty states with encouraging messaging
- Clean, calming color palette

**Color Scheme:**
- Wellness Goals: Rose/Pink gradient
- Exercise: Orange/Amber gradient
- Mental Health: Violet/Purple gradient
- Each feature has its own calming color identity

## How to Use

### As a User

1. **Navigate to Self-Care**
   - Go to Planner → Self-Care & Wellness
   - Explore the feature cards
   - Click any feature to dive in

2. **Create Entries**
   - Click "New Goal", "Log Activity", or "Check In"
   - Fill in as much or as little as you want
   - No fields are forced beyond minimums
   - Save when ready

3. **Review and Reflect**
   - Browse your history
   - Notice patterns over time
   - Update reflections as insights emerge
   - Delete entries if no longer relevant

4. **Stay Private**
   - Everything stays private automatically
   - No data shared without explicit consent
   - Mental health check-ins especially protected

### As a Developer

1. **Add New Features**
   - Follow the pattern of existing pages (WellnessGoals, ExerciseTracker, MentalHealthCheckins)
   - Use the service layer functions
   - Maintain privacy-first design
   - Add routes to App.tsx

2. **Extend Service Layer**
   - Add functions to `src/lib/selfCareService.ts`
   - Follow TypeScript type definitions
   - Maintain RLS patterns

3. **Create New Pages**
   - Copy structure from `src/components/planner/selfcare/WellnessGoals.tsx`
   - Update icons, colors, and wording
   - Test privacy controls

## Implementation Status

### ✅ Completed
- Database schema with all 12 tables
- RLS policies for all tables
- Service layer with full CRUD operations
- Section landing page with all 10 features
- 3 fully implemented feature pages:
  - Wellness Goals
  - Exercise Tracker
  - Mental Health Check-Ins
- Routing and navigation
- Build verification

### 🔄 Ready to Implement
The remaining 7 features have:
- Database tables created
- Service functions ready
- Just need UI pages following the established patterns

**Remaining Pages:**
- Nutrition Log (`/planner/selfcare/nutrition`)
- Sleep Tracker (`/planner/selfcare/sleep`)
- Mindfulness & Meditation (`/planner/selfcare/mindfulness`)
- Self-Care Routines (`/planner/selfcare/routines`)
- Gratitude Journal (`/planner/selfcare/gratitude`)
- Beauty & Skincare (`/planner/selfcare/beauty`)
- Rest & Recovery (`/planner/selfcare/rest`)

### 🔮 Future Enhancements
- Sharing controls UI (data model ready)
- Weekly/monthly trend visualizations
- Integration with Daily Planner
- Integration with Meal Planner
- Journal bi-directional linking
- Habit tracking integration
- Reminder system integration

## Code Examples

### Creating a Wellness Goal
```typescript
import * as selfCareService from '../../../lib/selfCareService';

const handleSubmit = async () => {
  const spaceId = await selfCareService.getPersonalSpaceId();

  await selfCareService.createWellnessGoal({
    household_id: spaceId,
    title: 'Sleep better',
    description: 'Aim for 8 hours most nights',
    category: 'physical',
    timeframe: 'This month',
    reflection: 'Been feeling tired lately'
  });
};
```

### Logging Exercise
```typescript
await selfCareService.createExerciseEntry({
  household_id: spaceId,
  activity_type: 'Morning walk',
  duration_minutes: 30,
  intensity: 'low',
  notes: 'Felt refreshing',
  entry_date: '2026-01-01'
});
```

### Mental Health Check-In
```typescript
await selfCareService.createMentalHealthCheckin({
  household_id: spaceId,
  mood: 'content',
  energy_level: 3,
  stress_level: 2,
  reflection: 'Productive day, feeling balanced'
});
```

## Testing

1. **Navigate:** Visit `/planner/self-care` or `/planner/selfcare`
2. **Explore:** Click through the feature cards
3. **Create:** Add wellness goals, log exercise, check in mentally
4. **Verify Privacy:** Confirm no data appears in shared spaces
5. **Test CRUD:** Create, view, edit, and delete entries
6. **Check Validation:** Test required fields and data types

## Design Philosophy

This system embodies the principle that self-care is:
- **Personal** - Your data, your control
- **Supportive** - Encouragement, not judgment
- **Flexible** - Use what helps, ignore the rest
- **Awareness-focused** - Understanding patterns, not hitting targets
- **Non-clinical** - Wellbeing support, not medical advice

The goal is to provide infrastructure for self-awareness without creating pressure or turning wellbeing into a performance metric.

## Success Criteria

Users should:
- Feel safe using these features
- Trust the privacy controls
- Engage without pressure or guilt
- Share only what they choose
- Build genuine self-awareness
- See wellbeing as part of life, not a task to complete
