# SharedMinds Core Migration Handover

## Purpose

This document hands over the current SharedMinds redesign/migration state to another senior developer.

The product goal is:

- keep `SharedMinds` as the only product name
- migrate the useful daily loop from `SharedMindsLite`
- preserve legacy SharedMinds feature families in code
- remove those legacy families from the default product surface
- build a mobile-first V1 that works on web and mobile
- make the separate Launch Manager / SharedMindsLite app redundant over time

Primary working repo:

- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign)

Reference repos:

- [`/Users/matthew/Documents/GrowDoLandingPageV2-main/SharedMindsLite`](/Users/matthew/Documents/GrowDoLandingPageV2-main/SharedMindsLite)
- [`/Users/matthew/Documents/SharedMindsMobileApp-main`](/Users/matthew/Documents/SharedMindsMobileApp-main)

Important note:

- the redesign copy is currently **not a git repository**, so do not assume commit history exists here

---

## Executive Summary

The redesign now has a working core shell and a first real migration slice from SharedMindsLite:

- a mobile-first SharedMinds UI shell
- a default core route tree separate from the full legacy app
- legacy feature families packaged behind module boundaries
- a local persisted core data layer that powers the main V1 daily loop

The redesign no longer depends on static placeholder copy alone. The following core features now have working local state and interactions:

- brain state
- active project
- task capture and completion
- responsibilities
- activity log
- parked ideas
- AI check-ins
- journal fields
- report generation
- settings state

This is still an intermediate migration state, not the final architecture. The next major step is replacing the local core data layer with the real V1 Supabase schema and shared ownership model.

---

## Product Direction Locked In

### V1 visible product surface

The main app should expose only:

- Today
- Projects
- Tasks
- Check-ins
- Journal
- Reports
- Settings

And shortly after:

- calendar
- shared/personal spaces as ownership contexts
- people/collaboration entry points

### Explicitly deferred from the main surface

These are not deleted. They are packaged for later reactivation:

- Guardrails
- widget Spaces
- MindMesh / graph surfaces
- tracks / subtracks / roadmap / taskflow hierarchy
- planner subdomains
- regulation-heavy flows
- tracker studio / fitness / recipe branches
- broad household/professional/admin product surface

### Core product intent

The real SharedMinds problem being solved is:

- ADHD-friendly daily coordination
- selective sharing with trusted people
- personal and shared views
- calendar as a source of truth
- shared projects and responsibilities without oversharing everything

---

## Architecture Decisions Already Made

### 1. Core app and legacy app are split

Entrypoint:

- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/App.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/App.tsx)

Behavior:

- default app path loads the new core product
- `/legacy` loads the copied SharedMinds app

### 2. Module registry controls packaged features

Registry:

- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/moduleRegistry.ts`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/moduleRegistry.ts)

Current rule:

- `core` is visible
- `legacy` is reachable
- `guardrails`, `spaces`, `regulation`, `planner`, `tracking`, `mindmesh`, `hierarchy` are packaged/hidden

This is the current “flick of a switch” mechanism, though it is still route-level rather than full feature-flag infrastructure.

### 3. Future modules depend on the core kernel, not vice versa

This is documented in:

- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_FUTURE_EXPANSION_ARCHITECTURE_PLAN.md`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_FUTURE_EXPANSION_ARCHITECTURE_PLAN.md)

The key principle is:

- V1 must be simple in product
- modular in code
- expandable later without forcing current users through overengineered workflows

### 4. Database is being redesigned from scratch around ownership and sharing

Primary docs:

- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_DATABASE_BLUEPRINT.md`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_DATABASE_BLUEPRINT.md)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_SCHEMA_AND_MIGRATION_SPEC.md`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_SCHEMA_AND_MIGRATION_SPEC.md)

Key model:

- user accounts
- spaces as ownership contexts
- personal spaces and shared spaces
- memberships and permissions
- projects/tasks/calendars attached to spaces
- selective sharing separate from ownership

---

## What Has Been Implemented

### Core shell and routing

Files:

- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/CoreApp.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/CoreApp.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/layout/CoreShell.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/layout/CoreShell.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/coreData.ts`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/coreData.ts)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/index.css`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/index.css)

Status:

- mobile-first shell exists
- SharedMinds branding is in place
- default route lands in `Today`
- desktop is a responsive extension of the same product, not a separate admin-style surface

### Local persisted core data layer

File:

- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/data/CoreDataContext.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/data/CoreDataContext.tsx)

Current characteristics:

- localStorage-backed
- seeded demo state
- exposes app-level actions for the main loop

Current domain objects in the provider:

- brain state
- projects
- tasks
- responsibilities
- activity log
- parked ideas
- check-ins
- journal
- reports
- settings

This is temporary scaffolding. It is useful because it proves the new UI can behave like a product now, but it is not the final backend integration.

### Core screens now wired to real local state

Files:

- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/today/TodayPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/today/TodayPage.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/projects/ProjectsPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/projects/ProjectsPage.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/tasks/TasksPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/tasks/TasksPage.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/checkins/CheckInsPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/checkins/CheckInsPage.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/journal/JournalPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/journal/JournalPage.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/reports/ReportsPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/reports/ReportsPage.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/settings/SettingsPage.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core/features/settings/SettingsPage.tsx)

What works now:

- choose brain state
- switch active project from Projects
- add/toggle tasks
- toggle responsibilities
- add activity log entries
- add/remove parked ideas
- generate check-ins and save responses
- edit journal fields
- generate reports
- edit settings fields

What does not work yet:

- real backend persistence
- shared ownership
- calendar integration
- collaborative permissions
- audio/voice playback
- report files / export flows

### Legacy feature packaging

Packaged route modules:

- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/modules/guardrails/LegacyGuardrailsRoutes.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/modules/guardrails/LegacyGuardrailsRoutes.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/modules/spaces/LegacySpacesRoutes.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/modules/spaces/LegacySpacesRoutes.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/modules/regulation/LegacyRegulationRoutes.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/modules/regulation/LegacyRegulationRoutes.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/modules/planner/LegacyPlannerRoutes.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/modules/planner/LegacyPlannerRoutes.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/modules/tracking/LegacyTrackingRoutes.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/modules/tracking/LegacyTrackingRoutes.tsx)

Mounted from:

- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/LegacyApp.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/LegacyApp.tsx)

Intent:

- remove these systems from the main product surface
- keep them reachable in code and under `/legacy`
- preserve future reactivation paths

---

## SharedMindsLite Migration Status

Reference audit:

- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/SHAREDMINDS_LITE_MIGRATION_AUDIT.md`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/SHAREDMINDS_LITE_MIGRATION_AUDIT.md)

Current status:

- SharedMindsLite is **partially migrated**
- UI parity is materially better than before
- core behaviors now exist in the redesign
- but the redesign is still running on a temporary local data layer rather than the intended V1 architecture

This is enough to continue migration productively. It is not enough to retire SharedMindsLite yet.

---

## What Still Needs To Be Done

### Highest priority: replace temporary core state with real V1 backend

Implement the first actual backend slice from the V1 schema docs:

1. Migration 001: identity and ownership spine
2. Migration 002: calendar spine
3. Migration 003: planning spine
4. Migration 004: daily operating system spine

The redesign should stop using local seeded data for the core loop once the minimal tables and RLS are in place.

### Build the real ownership model

Critical product requirement:

- personal space and shared space must both exist in V1

Needed next:

- authenticated user bootstrap
- create/fetch personal space
- create/join shared space
- membership resolution
- active space switcher
- attach projects/tasks/calendar data to spaces

### Build the calendar as the source of truth

This is central to the product and currently missing from the new core surface.

Next delivery slice should include:

- calendar entry point in the core app
- personal/shared event ownership
- project-linked events
- selective sharing behavior

### Replace heuristic Today behavior with a real recommendation model

Current Today logic is intentionally lightweight.

Needs:

- daily plan entity
- recommendation rules tied to brain state, task energy, due state, and active space/project
- wins/streaks modeled properly
- activity logs and responsibilities stored by date

### Add collaboration entry points to the core product

Needed for V1:

- invite trusted person
- accept invite
- shared space membership UI
- shared project membership UI
- visibility rules on tasks/events/reports

### Continue legacy packaging

Current packaging is good enough to hide major branches, but still incomplete as a true modular boundary.

Remaining work:

- package remaining inline legacy collaboration/account surfaces if they still creep into default flows
- ensure packaged modules own their own route prefixes and navigation exposure
- keep the core app clean of imports from future modules

---

## Recommended Next Work Order

### Phase A: real backend spine

1. generate actual Supabase migration files from [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_SCHEMA_AND_MIGRATION_SPEC.md`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_SCHEMA_AND_MIGRATION_SPEC.md)
2. implement auth bootstrap and profile fetch
3. implement personal/shared spaces bootstrap

### Phase B: replace local core provider with repository/services layer

Refactor `CoreDataContext` into:

- core repositories or services backed by Supabase
- optional local optimistic state on top

Do not let `CoreDataContext` become the final app architecture.

### Phase C: calendar + collaboration

1. add core calendar route
2. connect events to spaces/projects
3. add invite and membership flows

### Phase D: finish Lite redundancy path

Once the real backend exists for:

- Today
- Tasks
- Projects
- Check-ins
- Journal
- Reports
- Settings
- Calendar

then SharedMindsLite can be treated as a reference only, then retired.

---

## Risks And Constraints

### 1. The legacy app is enormous

`LegacyApp` still pulls in a very large dependency surface.

Implications:

- build size is large
- code splitting is poor
- many warnings are legacy-related, not core-related

This is acceptable short term because `/legacy` is acting as a migration fallback.

### 2. Current build warnings are pre-existing

Known build warnings:

- duplicate key in [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/lib/foodEmojis.ts`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/lib/foodEmojis.ts)
- duplicate key in [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/lib/recipeCategoryNormalizer.ts`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/lib/recipeCategoryNormalizer.ts)
- many dynamic/static import warnings from the legacy codebase
- huge legacy bundle chunks

Do not confuse these with regressions from the core migration work.

### 3. There is a lot of historical documentation

The repo contains a large `docs/` surface from older phases and subsystems.

Use these documents as reference only when they are directly relevant. The current source of truth for this migration is:

- architecture plan
- database blueprint
- migration spec
- Lite migration audit
- this handover

### 4. Avoid reintroducing duplicated concepts

Non-negotiable rule:

- one concept, one model, one visible workflow

Examples:

- no separate task systems for Today, planner, and roadmap
- no separate personal/shared schemas for the same concept
- no widget Spaces mixed into the ownership-space model in V1

---

## Verification

Last known verification command:

```bash
cd /Users/matthew/Documents/SharedMindsMobileApp-Redesign
npm run build
```

Status at handover:

- build passes
- warnings remain from legacy code

No full test suite validation was completed in this migration slice.

---

## First Actions For The Incoming Developer

If continuing immediately, do this next:

1. create the first Supabase migration files for `profiles`, `user_settings`, `spaces`, `space_members`, and `person_connections`
2. add a proper authenticated core bootstrap layer
3. replace seeded `CoreDataContext` reads/writes with backend-backed services
4. add a real calendar route to the core product
5. add personal/shared space switching and selective sharing UI

If you do those five things cleanly, the project moves from “UI migration with scaffolding” to “real product replacement path.”

---

## Practical Rule For Every Change

Before adding any abstraction, ask:

- does this help the V1 user complete the daily loop faster?
- does this keep future modules attachable without leaking complexity into V1?
- does this duplicate an existing concept or route?

If the answer to the first two is not clearly yes, or the third is yes, do not add it.
