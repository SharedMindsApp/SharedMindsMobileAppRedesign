# SharedMindsLite Migration Audit

## Purpose

This document defines what "fully migrated from SharedMindsLite" should mean inside `SharedMindsMobileApp-Redesign`.

It is not "copy the GrowDo app as-is".

It is:

- migrate the reusable SharedMindsLite product loop
- preserve the useful mobile UI patterns
- discard GrowDo-specific launch-manager baggage
- rebuild those pieces in the SharedMinds architecture and ownership model

## Current conclusion

SharedMindsLite is **not yet fully migrated** into the redesign.

The redesign now has:

- a mobile-first SharedMinds shell
- the right top-level product routes
- Lite-inspired screen structure
- packaged legacy systems behind module boundaries

But it does **not** yet have full parity with SharedMindsLite's real feature set or actual data behavior.

## SharedMindsLite screens and parity

### 1. Focus / Today

SharedMindsLite includes:

- brain state picker with 6 states
- task recommendation logic based on brain state, time context, due date, and energy map
- project switching and "daily plan" selection
- time tracker bar with check-in / break states
- daily wins and streak display
- parked ideas / parking lot
- responsibilities management and completion tracking
- activity log entry and editing
- inline AI voice check-in card
- scope filters: today, week, all, overdue, completed

Redesign status:

- `partial`

What exists now:

- page structure and UI sections in [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/today/TodayPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/today/TodayPage.tsx)

What is still missing:

- actual task recommendation engine
- actual brain-state persistence
- real daily plan / project switching
- real time tracking state
- real wins, streaks, parked ideas, responsibilities, and activity log data flow

### 2. Check-In History

SharedMindsLite includes:

- morning / afternoon / evening schedule windows
- generate-now flow
- saved check-in history
- audio playback for historical check-ins
- grouped history by date
- test generation flow

Redesign status:

- `partial`

What exists now:

- schedule and history UI direction in [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/checkins/CheckInsPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/checkins/CheckInsPage.tsx)

What is still missing:

- real check-in persistence
- audio fetch/playback
- grouped history data
- generate-now behavior

### 3. Daily Journal

SharedMindsLite includes:

- sleep capture
- exercise capture
- day rating
- hour-by-hour timeline logging
- activity timeline editing
- evening reflection
- tomorrow intention

Redesign status:

- `partial`

What exists now:

- surface structure in [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/journal/JournalPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/journal/JournalPage.tsx)

What is still missing:

- actual daily journal form state and persistence
- timeline log editing
- sleep/exercise/day-rating inputs wired to data

### 4. Reports

SharedMindsLite includes:

- generate today's report
- saved reports list
- download saved report
- delete saved report
- report file storage

Redesign status:

- `partial`

What exists now:

- report structure and saved-report UI in [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/reports/ReportsPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/reports/ReportsPage.tsx)

What is still missing:

- report generation
- report persistence
- file download/delete behavior

### 5. Settings

SharedMindsLite includes:

- Supabase connection settings
- push / pull sync actions
- Google Calendar connection and sync
- voice-check-in enablement and voice choice
- provider/API configuration
- import/export/reset

Redesign status:

- `partial`

What exists now:

- correct panel direction in [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/settings/SettingsPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/settings/SettingsPage.tsx)

What is still missing:

- actual settings persistence
- actual sync integrations
- actual import/export/reset flows

## SharedMindsLite data model worth migrating

The Lite repo contains these reusable feature tables:

- `planner_energy_map`
- `planner_daily_wins`
- `planner_streak`
- `planner_parked_ideas`
- `planner_nudges`
- `planner_voice_checkins`
- `planner_responsibilities`
- `planner_responsibility_completions`
- `planner_activity_log`
- `planner_daily_journal`
- `planner_reports`
- project support added onto `planner_checklist`

These should not be copied table-for-table.

They should be mapped into the new SharedMinds v1 schema:

- brain state and energy history
- tasks
- projects
- daily plans
- responsibilities
- responsibility completions
- activity logs
- journal entries
- check-ins
- saved reports
- settings

## SharedMindsLite UI patterns worth migrating

These patterns are genuinely part of the product and should be carried over:

- mobile header with immediate context
- bottom navigation with only the most important views
- dense action cards instead of sparse desktop panels
- compact chips for brain state and scope switching
- timeline-style daily logging
- lightweight sheets/modals with mobile-safe interaction
- "generate now" / "download" / "log" actions on the same surface as the data

## SharedMindsLite parts that should not migrate

These are GrowDo-specific and should not be treated as SharedMinds requirements:

- launch manager terminology
- content calendar and social posts
- outreach and discovery logs
- launch metrics and beta/public launch countdowns
- GrowDo/BPA hardcoded projects
- Perplexity-powered local discovery

## Required migration work still outstanding

To say SharedMindsLite is fully migrated, the redesign still needs:

1. A real core data layer for:

- tasks
- projects
- brain states
- daily plans
- responsibilities
- activity logs
- journal entries
- check-ins
- reports
- settings

2. A real Today implementation:

- state-aware recommendations
- responsibilities and activity log CRUD
- daily wins / streaks / parked ideas
- project switching and daily plan state
- time-tracker state

3. A real check-in system:

- check-in generation
- history
- text and optional voice playback
- persistence and schedule windows

4. A real journal flow:

- sleep/exercise/day summary inputs
- timeline editing
- evening reflection

5. A real reports flow:

- generate
- save
- list
- download
- delete

6. A real settings flow:

- provider configuration
- calendar integration
- import/export/reset
- check-in and voice preferences

## Recommended implementation order

1. `Today` data slice

- brain state
- daily plan
- projects
- tasks
- responsibilities
- activity log

2. `Check-ins`

- generate
- save
- history

3. `Journal`

- daily form
- timeline

4. `Reports`

- generation and persistence

5. `Settings`

- real settings framework
- calendar integration
- voice / AI preferences

## Bottom line

SharedMindsLite has now been translated into the redesign at the level of:

- product boundary
- screen structure
- mobile-first UI direction

It has **not yet** been fully migrated at the level of:

- working feature parity
- stored data behavior
- integration behavior

This document should be the reference for closing that gap without dragging GrowDo-specific baggage into SharedMinds.
