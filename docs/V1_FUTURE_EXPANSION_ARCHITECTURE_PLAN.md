# SharedMinds V1 + Future Expansion Architecture Plan

**Document Purpose**: Define how SharedMinds V1 should be built as a focused, testable product now, while preserving clean extension seams for future feature families such as Guardrails, widget-based Spaces, MindMesh, and hierarchical planning.

**Primary Goal**: One app, one codebase, one responsive product surface for web and mobile.

**Non-Goal**: Rebuild every legacy paradigm into V1 just because it exists today.

---

## 1. Product Strategy

### V1 Product Definition
SharedMinds V1 is the ADHD-aware daily operating system:
- onboarding
- today
- calendar
- projects
- tasks
- responsibilities
- activity log
- AI check-ins
- journal
- reports
- settings
- personal space
- shared space
- selective sharing with trusted people

This is the product that should be good enough to hand to a tester without explanation overload.

### V1 Collaboration Definition
SharedMinds V1 is not a solo productivity app with collaboration bolted on as an afterthought.
It should support the original purpose of the product:
- a person with ADHD can share what matters with a trusted partner
- each person has their own account
- each person has personal views and personal data
- they can also participate in one or more shared contexts
- sharing is selective rather than all-or-nothing

This is the minimum collaborative experience:
- personal account
- personal space
- shared space with another person or small household
- shared projects
- shared calendar visibility
- permissioned access to selected information

### Future Product Direction
The long-term vision may include:
- Guardrails planning systems
- widget-based Spaces and workspace composition
- MindMesh / knowledge graph
- tracks / subtracks / roadmap / taskflow hierarchy
- other advanced collaboration or contextual surfaces

These are not deleted from the vision. They are deferred and packaged.

### Core Product Rule
Future paradigms must be able to attach to the app later without forcing their complexity into V1.

---

## 2. Architectural Principle

### Simple in product, modular in code, expandable in data

V1 should:
- feel simple to use
- expose only the core loop
- use shared services and entities
- avoid duplicate implementations of the same concept

Future modules should:
- plug into the core app rather than replace it
- be optional surfaces, not mandatory flows
- reference shared core entities instead of creating parallel data models

### Design test
Every new abstraction must pass all three checks:
1. Does it improve the V1 user experience right now?
2. Does it preserve a clean attachment point for future modules?
3. Does it avoid creating duplicate concepts or routes?

If the answer to `1` is no, it should not be in the visible V1 surface.

---

## 3. Single-App Architecture

### Canonical app
The redesign repo is the only product target:
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/App.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/App.tsx)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/core)

### Temporary legacy reference
The existing broad app remains available only as a migration reference:
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/LegacyApp.tsx`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/src/LegacyApp.tsx)

`/legacy` is a migration bridge, not the future product surface.

### SharedMindsLite role
SharedMindsLite is not a second app to maintain.
It is the working product reference for:
- the daily-use workflow
- feature priority
- minimal useful schema
- what actually earns space in V1

### Database reset
The database should be redesigned from scratch for the unified product.

The new schema should be built around:
- real user accounts
- ownership contexts
- selective sharing
- personal and shared visibility
- calendar as source of truth

The legacy schema is a reference for ideas and patterns, not the schema contract for V1.

---

## 4. V1 Core Domains

These are the only domains that should shape the primary route tree and main navigation.

### A. Identity and setup
- auth
- onboarding
- profile basics
- settings

### B. Collaboration baseline
- personal space
- shared space
- memberships
- trusted people / collaborators
- selective permissions

### C. Calendar and planning baseline
- calendar as source of truth
- projects
- tasks
- shared projects
- shared calendar visibility

### D. Daily execution
- current brain state
- active project for the day
- recommended tasks
- responsibility completion
- activity logging

### E. Reflection and support
- AI check-ins
- journal
- reports

No deeper planning hierarchy should be exposed in V1.

---

## 5. Core Entities

These entities form the stable kernel that future modules should depend on.

### Required V1 entities
- `user`
- `profile`
- `user_settings`
- `space`
- `space_member`
- `person_connection`
- `share_policy`
- `calendar`
- `calendar_source`
- `calendar_event`
- `project`
- `task`
- `daily_plan`
- `brain_state_entry`
- `responsibility`
- `responsibility_completion`
- `activity_log`
- `checkin`
- `checkin_message`
- `journal_entry`
- `report`

### Core relationship rule
Future modules may reference these entities, but should not fork them.

Examples:
- a future roadmap item may reference `project_id`
- a future widget page may reference `space_id`
- a future MindMesh node may reference `project_id`, `task_id`, or `journal_entry_id`
- a future widget may render `calendar_event`, `activity_log`, or `task` data

The kernel stays small and shared.

### Ownership model
The app should distinguish between:
- **personal ownership**: data visible only to one user by default
- **shared ownership**: data that belongs to a shared space/context
- **shared visibility**: personal data selectively visible to another person without transferring ownership

This distinction is critical.
It allows the product to support:
- personal views
- shared views
- permissioned collaboration
- future spaces and widgets

without duplicating all entities into personal and shared versions.

---

## 6. V1 Collaboration Model

### Personal space vs shared space
V1 should include the concept of spaces, but only as ownership and visibility contexts.

V1 `space` means:
- a personal context for one user
- a shared context for a couple, family, or trusted collaborator group

V1 `space` does **not** mean:
- widget canvas
- app launcher
- composable workspace builder
- page layout system

Those are future module concerns.

### Recommended V1 collaboration rules
- every user has a personal space
- users can create or join a shared space
- projects can belong to either a personal space or a shared space
- calendar events can belong to either a personal space or a shared space
- some personal items can be selectively shared into another person's visibility layer

### Permission model for V1
Keep permissions simple:
- owner
- collaborator
- viewer

Permission scope should apply to:
- project access
- calendar access
- activity visibility
- selected journal/check-in visibility if shared intentionally

Avoid the full enterprise-style permission system in V1.

### Product principle
The point of collaboration is not generic teamwork.
It is trusted visibility and accountability between people who share life, time, responsibilities, and planning.

---

## 7. Calendar As Source Of Truth

### Why it stays in V1
Calendar is one of the strongest ideas in the original SharedMinds architecture and should remain a foundational part of the redesign.

It should act as the shared temporal layer for:
- personal commitments
- shared commitments
- project-related events
- routines and responsibilities that have time meaning
- visibility into what a trusted person is doing and when

### Calendar rule
Tasks are not the calendar.
But time-bound commitments should project into the calendar and be readable from it.

### V1 calendar capabilities
- personal calendar view
- shared calendar view
- events owned by personal or shared spaces
- permission-aware visibility
- project-linked events

### Future expansion
Advanced sync, richer projections, and complex context composition can come later, but the V1 model should already preserve calendar as the temporal source of truth.

---

## 8. Packaging Future Modules

The feature families below should be packaged as optional modules that bolt onto the core app later.

### A. Guardrails module
Owns:
- advanced project planning
- tracks and subtracks
- roadmap views
- taskflow views
- side-project capture
- offshoot capture
- reality-check tooling
- focus session analytics if expanded beyond V1

Rules:
- must attach to `project`
- must not replace the simple V1 task model
- must remain optional at the route and navigation level

### B. Spaces module
Owns:
- widget-based spaces
- widgets
- page/canvas composition
- future workspace-style app hosting

Rules:
- must sit on top of the existing V1 `space` ownership model
- must embed core features rather than clone them
- should consume existing feature panels as widgets where possible
- should not become the only way to access tasks, reports, or activity logs

Important distinction:
- V1 keeps `space` as a collaboration and ownership concept
- the future Spaces module adds widget composition and workspace UI on top of that concept

### C. MindMesh module
Owns:
- graph relationships
- idea mapping
- visual knowledge/context linking
- higher-order project thinking

Rules:
- must reference existing entities instead of redefining them
- should be a graph overlay, not the primary storage model for planning
- should not be required for the core task workflow

### D. Hierarchy module
Owns:
- tracks
- subtracks
- roadmap hierarchy
- future execution hierarchy beyond project -> task

Rules:
- must sit above or alongside the V1 project layer
- must not force all V1 users into a hierarchy they do not need
- should support projection into simple task views

---

## 9. How To Avoid Duplication

### One concept, one home
There must never be:
- two task systems
- two activity logs
- two check-in engines
- two project models
- two collaboration models
- two calendar models
- separate web/mobile versions of the same feature logic

### Duplication policy
If a legacy module and SharedMindsLite solve the same problem:
1. keep the better user workflow
2. keep the better architecture where possible
3. rebuild one canonical implementation
4. retire the duplicate surface

### Specific examples
- `Today` becomes the canonical focus surface
  It replaces scattered planner/focus/regulation overlaps.
- `Projects` become the canonical lightweight planning container
  They replace 12 life areas and avoid immediate track hierarchy.
- `Tasks` become the canonical execution model
  No planner tasks vs roadmap tasks vs taskflow tasks for V1.
- `Calendar` becomes the canonical temporal layer
  No parallel planning calendar and collaboration calendar in V1.
- `Space` becomes the canonical ownership context
  No separate personal-space system and shared-space system with duplicated entities.
- `Activity log` becomes the canonical “what actually happened” stream
  No separate diary systems.

---

## 10. UI Architecture For Web And Mobile

### One feature set, multiple layouts
The app should not become:
- a web app plus a separate mobile app
- desktop logic duplicated in mobile components
- different product flows depending on screen size

Instead:
- features are shared
- data/services are shared
- routes are shared
- layout adapts responsively

### UI rule
Desktop and mobile may differ in:
- navigation pattern
- panel density
- grid vs stacked layout
- modal vs sheet presentation

They must not differ in:
- feature availability
- business logic
- data ownership
- primary workflow concepts

### Mobile-first requirement
Every V1 feature must be usable in a small-screen, touch-first layout before it is considered done.

---

## 11. Database Architecture Principles

### Database should be redesigned from scratch
Do not attempt to preserve the current schema shape for compatibility.

Instead, design a new schema around:
- authenticated users
- ownership contexts
- selective sharing
- personal and shared spaces
- calendar-first time modeling
- simple permissions

### Database design goals
- small enough to reason about
- expressive enough for trusted collaboration
- extensible enough for future modules
- free of duplicate entity trees

### Suggested ownership spine
- `users`
- `profiles`
- `spaces`
- `space_members`
- `person_connections`
- `share_policies`

### Suggested planning spine
- `calendar_events`
- `projects`
- `tasks`
- `responsibilities`
- `activity_logs`
- `checkins`
- `journal_entries`
- `reports`

### Extensibility rule
Future modules should add their own tables that reference the ownership and planning spine rather than redefining it.

Examples:
- future `widgets` reference `space_id`
- future `mindmesh_nodes` reference `space_id`, `project_id`, or `task_id`
- future `roadmap_items` reference `project_id`

---

## 12. Recommended Code Organization

### Core app shell
- `src/core/layout`
- `src/core/features`
- `src/core/ui`
- `src/core/services`
- `src/core/types`

### Future packaged modules
- `src/modules/guardrails`
- `src/modules/spaces`
- `src/modules/mindmesh`
- `src/modules/hierarchy`
- `src/modules/calendar-sync`

### Shared platform layers
- `src/lib`
- `src/contexts`
- `src/hooks`

### Important rule
Future modules should depend on the core kernel.
The core kernel must not depend on future modules.

That dependency direction keeps V1 small and prevents expansion features from leaking into the base product.

---

## 13. Route Strategy

### V1 routes
- `/`
- `/today`
- `/calendar`
- `/projects`
- `/tasks`
- `/check-ins`
- `/journal`
- `/reports`
- `/settings`
- `/people`
- `/shared`

### Future module routes
These should be mounted later as optional route groups:
- `/guardrails/*`
- `/spaces/*`
- `/mindmesh/*`
- `/hierarchy/*`

### Route policy
Future route groups may exist later, but none of them should be necessary to complete the V1 daily loop.

---

## 14. Service Boundaries

### Core services to create first
- auth service
- profile/settings service
- spaces service
- membership/people service
- sharing policy service
- calendar service
- projects service
- tasks service
- brain state service
- responsibilities service
- activity log service
- check-in service
- journal service
- report service

### Shared orchestration layer
Create a central context assembly layer for AI and summaries.

It should pull from:
- current space context
- current project
- calendar commitments
- current tasks
- brain state
- activity log
- responsibilities
- journal

This allows future modules to add extra context later without rewriting the AI stack.

---

## 15. Migration Strategy

### Phase 1: product kernel
Use SharedMindsLite as the workflow reference and rebuild:
- calendar
- personal/shared space model
- today
- projects
- tasks
- responsibilities
- activity log
- check-ins
- journal
- reports

### Phase 2: retire duplicate surfaces
As each V1 feature becomes usable:
- stop adding functionality to equivalent legacy surfaces
- hide or redirect overlapping routes
- keep `/legacy` for fallback only

### Phase 3: package legacy feature families
Refactor remaining broad systems into module boundaries:
- guardrails package
- spaces package
- mindmesh package
- hierarchy package

### Phase 4: selective reintroduction
Only reintroduce a future module if:
- V1 has active usage
- the module solves a proven need
- it can be attached without duplicating the kernel

---

## 16. What V1 Explicitly Defers

The following are intentionally not part of the initial product surface:
- widget-based spaces
- MindMesh or graph-first navigation
- track/subtrack/roadmap/taskflow hierarchy
- professional/therapist workflows
- broad planner domain trees
- experimental behavioral systems

V1 does **not** defer:
- real users
- personal/shared spaces as ownership contexts
- collaboration with trusted people
- shared projects
- shared calendar visibility
- selective sharing

These remain valid future directions, but they are not part of the first testable product.

---

## 17. Decision Rules For Future Bolt-Ons

When revisiting a deferred feature family later, use these rules:

1. It must attach to existing core entities.
2. It must not require a new duplicate task or project model.
3. It must not replace the V1 route tree for ordinary users.
4. It must offer clear value beyond what the simple product already does.
5. It must work responsively on both web and mobile.

If a feature fails these rules, it should stay deferred.

---

## 18. Final Architecture Statement

SharedMinds V1 should be a focused daily operating system built from the proven SharedMindsLite workflow and implemented in the redesign repo as the only real app.

It should also restore the original collaborative purpose of SharedMinds in a much simpler form:
- real users
- personal spaces
- shared spaces
- selective sharing
- shared projects
- permission-aware calendar visibility

Guardrails, Spaces, MindMesh, and hierarchical planning are not being abandoned.
They are being moved out of the base product contract and treated as future packages that can be added later once there is real user pull.

The architecture should therefore optimize for:
- one app
- one responsive codebase
- one shared kernel
- one ownership model
- one calendar model
- no duplicated concepts
- optional expansion modules later

That is how the product stays simple enough to ship now without killing the larger vision.
