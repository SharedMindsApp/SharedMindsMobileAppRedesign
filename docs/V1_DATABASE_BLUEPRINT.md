# SharedMinds V1 Database Blueprint

**Document Purpose**: Define the V1 database shape for the redesigned SharedMinds product.

**Scope**: This document covers:
- core tables
- ownership model
- permission model
- calendar/event model
- shared project model

**Context**: This blueprint implements the collaboration-aware V1 described in [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_FUTURE_EXPANSION_ARCHITECTURE_PLAN.md`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_FUTURE_EXPANSION_ARCHITECTURE_PLAN.md).

---

## 1. Design Goals

The V1 schema should support:
- real user accounts
- personal and shared spaces
- selective sharing with trusted people
- shared projects
- calendar as source of truth
- a simple ADHD-aware daily operating system

The V1 schema should avoid:
- duplicate personal/shared versions of every table
- enterprise-grade permission complexity
- deep hierarchy as a hard requirement
- feature-specific schemas that redefine the same concepts

---

## 2. Core Modeling Rules

### Rule 1: ownership is context-based
Most user-facing data should belong to a `space`.

That gives one common ownership model for:
- personal data
- couple/family shared data
- future collaborative contexts

### Rule 2: visibility is separate from ownership
Something can remain personally owned but be selectively visible to another trusted person.

This is required for:
- private calendars with selective sharing
- personal projects with chosen visibility
- activity and journal visibility that is not globally shared

### Rule 3: calendar is the temporal layer
Events are first-class records.
Tasks may project into calendar views, but time-based commitments should have explicit event records.

### Rule 4: projects are the planning container
V1 planning hierarchy is:
- project
- task

No tracks, subtracks, roadmap trees, or taskflow structures in the base schema.

### Rule 5: future modules extend the spine
Future systems must reference the V1 spine rather than fork it.

---

## 3. Core Tables

This is the recommended V1 table set.

### Identity and profile

#### `profiles`
Purpose:
- app-level profile for each authenticated user

Suggested columns:
- `id uuid primary key` references `auth.users`
- `display_name text not null`
- `avatar_url text`
- `timezone text not null`
- `locale text`
- `neurotype text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:
- keep this focused on identity, not settings sprawl

#### `user_settings`
Purpose:
- user preferences for app behavior

Suggested columns:
- `user_id uuid primary key` references `profiles(id)`
- `default_space_id uuid`
- `voice_enabled boolean not null default false`
- `voice_choice text`
- `checkin_preferences jsonb not null default '{}'::jsonb`
- `notification_preferences jsonb not null default '{}'::jsonb`
- `ui_preferences jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:
- keep preferences grouped, but avoid hiding core relational concepts in JSON

---

### Ownership and collaboration

#### `spaces`
Purpose:
- ownership context for personal and shared data

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `type text not null check (type in ('personal', 'shared'))`
- `name text not null`
- `slug text`
- `created_by uuid not null references profiles(id)`
- `is_archived boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:
- every user gets a personal space
- couples/families/shared contexts use shared spaces
- this is not yet the future widget-based Spaces module

#### `space_members`
Purpose:
- membership and role inside a space

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `space_id uuid not null references spaces(id) on delete cascade`
- `user_id uuid not null references profiles(id) on delete cascade`
- `role text not null check (role in ('owner', 'collaborator', 'viewer'))`
- `status text not null check (status in ('active', 'invited', 'removed'))`
- `invited_by uuid references profiles(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- unique `(space_id, user_id)`

#### `person_connections`
Purpose:
- trusted relationship layer between users outside a single shared space

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `requester_id uuid not null references profiles(id)`
- `addressee_id uuid not null references profiles(id)`
- `status text not null check (status in ('pending', 'accepted', 'declined', 'blocked'))`
- `connection_type text not null default 'trusted'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- unique unordered relationship between two users

Purpose in product:
- “I trust this person enough to selectively share parts of my life with them”

#### `share_policies`
Purpose:
- selective visibility rules without changing record ownership

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `owner_user_id uuid not null references profiles(id)`
- `target_user_id uuid not null references profiles(id)`
- `resource_type text not null`
- `resource_id uuid not null`
- `access_level text not null check (access_level in ('view', 'collaborate'))`
- `created_at timestamptz not null default now()`
- `created_by uuid not null references profiles(id)`

Notes:
- use this sparingly in V1
- best for selective project/calendar visibility
- avoid trying to encode every possible permission edge case

---

### Calendar and time

#### `calendars`
Purpose:
- logical calendar containers for a space or imported source

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `space_id uuid not null references spaces(id) on delete cascade`
- `name text not null`
- `kind text not null check (kind in ('system', 'personal', 'shared', 'external'))`
- `color text`
- `is_default boolean not null default false`
- `created_by uuid not null references profiles(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `calendar_sources`
Purpose:
- metadata for synced/imported calendar providers

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `calendar_id uuid not null references calendars(id) on delete cascade`
- `provider text not null`
- `external_id text not null`
- `sync_state text not null default 'active'`
- `last_synced_at timestamptz`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `calendar_events`
Purpose:
- first-class time commitments and shared temporal visibility

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `calendar_id uuid not null references calendars(id) on delete cascade`
- `space_id uuid not null references spaces(id) on delete cascade`
- `created_by uuid not null references profiles(id)`
- `title text not null`
- `description text`
- `event_type text not null default 'general'`
- `visibility text not null check (visibility in ('space', 'restricted', 'private')) default 'space'`
- `start_at timestamptz not null`
- `end_at timestamptz not null`
- `all_day boolean not null default false`
- `location text`
- `source_type text not null default 'manual'`
- `source_ref_id uuid`
- `status text not null check (status in ('confirmed', 'tentative', 'cancelled')) default 'confirmed'`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:
- `source_type` can later reference task projection, imported external calendars, reminders, and future modules
- `visibility = restricted` means the event exists but detailed access may depend on `share_policies`

#### `calendar_event_participants`
Purpose:
- explicit participant/attendee layer

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `event_id uuid not null references calendar_events(id) on delete cascade`
- `user_id uuid not null references profiles(id) on delete cascade`
- `response_status text not null check (response_status in ('pending', 'accepted', 'declined', 'tentative')) default 'pending'`
- `role text not null default 'participant'`
- `created_at timestamptz not null default now()`

Constraints:
- unique `(event_id, user_id)`

---

### Planning

#### `projects`
Purpose:
- core planning container for personal or shared work/life efforts

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `space_id uuid not null references spaces(id) on delete cascade`
- `created_by uuid not null references profiles(id)`
- `title text not null`
- `description text`
- `status text not null check (status in ('active', 'paused', 'completed', 'archived')) default 'active'`
- `phase text`
- `color text`
- `icon text`
- `is_private boolean not null default false`
- `starts_on date`
- `target_date date`
- `completed_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:
- a project belongs to exactly one space
- personal project: belongs to personal space
- shared project: belongs to shared space

#### `project_members`
Purpose:
- explicit project-level collaboration when project access differs from general space access

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references projects(id) on delete cascade`
- `user_id uuid not null references profiles(id) on delete cascade`
- `role text not null check (role in ('owner', 'collaborator', 'viewer'))`
- `created_at timestamptz not null default now()`

Constraints:
- unique `(project_id, user_id)`

Notes:
- for many V1 cases, shared-space membership may be enough
- keep this table because shared projects are a required V1 feature

#### `tasks`
Purpose:
- simple execution model under projects

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `space_id uuid not null references spaces(id) on delete cascade`
- `project_id uuid references projects(id) on delete set null`
- `created_by uuid not null references profiles(id)`
- `assigned_to uuid references profiles(id)`
- `title text not null`
- `notes text`
- `status text not null check (status in ('inbox', 'active', 'done', 'dropped')) default 'inbox'`
- `priority text not null check (priority in ('high', 'medium', 'low')) default 'medium'`
- `energy_level text not null check (energy_level in ('high', 'medium', 'low')) default 'medium'`
- `due_on date`
- `scheduled_for date`
- `completed_at timestamptz`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:
- V1 should not embed hierarchy into tasks
- future roadmap/taskflow systems can project onto these tasks or reference them

#### `daily_plans`
Purpose:
- the selected focus context for a given day

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id)`
- `plan_date date not null`
- `space_id uuid not null references spaces(id)`
- `project_id uuid references projects(id)`
- `intention text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- unique `(user_id, plan_date)`

---

### Daily operating system

#### `brain_state_entries`
Purpose:
- track current and historical brain state changes

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id)`
- `space_id uuid not null references spaces(id)`
- `state text not null check (state in ('hyperfocus', 'energised', 'steady', 'distracted', 'low_battery', 'brain_fog'))`
- `entered_at timestamptz not null`
- `source text not null default 'manual'`
- `notes text`
- `created_at timestamptz not null default now()`

#### `responsibilities`
Purpose:
- recurring or one-off responsibilities for personal or shared life

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `space_id uuid not null references spaces(id) on delete cascade`
- `created_by uuid not null references profiles(id)`
- `name text not null`
- `type text not null check (type in ('recurring', 'one_off'))`
- `category text`
- `priority text not null check (priority in ('high', 'medium', 'low')) default 'medium'`
- `recurrence_rule jsonb`
- `due_on date`
- `scheduled_time time`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `responsibility_completions`
Purpose:
- actual completion log for responsibilities

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `responsibility_id uuid not null references responsibilities(id) on delete cascade`
- `completed_by uuid not null references profiles(id)`
- `completed_on date not null`
- `completed_at timestamptz not null default now()`
- `notes text`

Constraints:
- unique `(responsibility_id, completed_on, completed_by)`

#### `activity_logs`
Purpose:
- what actually happened during the day

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id)`
- `space_id uuid not null references spaces(id)`
- `project_id uuid references projects(id)`
- `task_id uuid references tasks(id)`
- `activity_date date not null`
- `start_time time not null`
- `end_time time`
- `duration_mins integer`
- `title text not null`
- `category text`
- `brain_state text`
- `visibility text not null check (visibility in ('private', 'space', 'restricted')) default 'private'`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `checkins`
Purpose:
- AI-generated and user-answered check-ins

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id)`
- `space_id uuid not null references spaces(id)`
- `checkin_date date not null`
- `checkin_type text not null check (checkin_type in ('morning', 'afternoon', 'evening'))`
- `brain_state text`
- `prompt_text text not null`
- `response_text text`
- `audio_url text`
- `status text not null check (status in ('generated', 'answered', 'skipped')) default 'generated'`
- `context_snapshot jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `responded_at timestamptz`

Constraints:
- unique `(user_id, checkin_date, checkin_type)`

#### `checkin_messages`
Purpose:
- threaded continuation of a check-in conversation

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `checkin_id uuid not null references checkins(id) on delete cascade`
- `author_type text not null check (author_type in ('user', 'assistant'))`
- `message_text text not null`
- `created_at timestamptz not null default now()`

#### `journal_entries`
Purpose:
- one daily reflection row per user

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id)`
- `space_id uuid not null references spaces(id)`
- `entry_date date not null`
- `sleep_quality integer`
- `bed_time time`
- `wake_time time`
- `exercise_done boolean`
- `exercise_type text`
- `exercise_mins integer`
- `water_litres numeric(4,1)`
- `day_rating integer`
- `wins text`
- `struggles text`
- `tomorrow_intention text`
- `reflection text`
- `visibility text not null check (visibility in ('private', 'space', 'restricted')) default 'private'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:
- unique `(user_id, entry_date)`

#### `reports`
Purpose:
- persisted daily/weekly outputs

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id)`
- `space_id uuid not null references spaces(id)`
- `report_date date not null`
- `report_type text not null check (report_type in ('daily', 'weekly'))`
- `title text not null`
- `summary text`
- `file_url text`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

---

## 4. Ownership Model

### Ownership spine
The ownership spine is:
- `profiles`
- `spaces`
- `space_members`

### Core rule
Most records belong to a `space_id`.

This means:
- personal records live in a personal space
- shared records live in a shared space
- the same tables work for both personal and shared usage

### Why this matters
Without `space` ownership, the app will drift into duplicated models such as:
- personal projects vs shared projects
- personal calendars vs shared calendars
- personal responsibilities vs shared responsibilities

That duplication should be avoided.

### Personal ownership
Each user gets one personal space.

Personal space properties:
- single-owner by default
- can contain private projects, tasks, events, logs, journal entries
- may selectively expose some records to trusted people

### Shared ownership
Shared spaces are for:
- couples
- families
- trusted collaborators

Shared space properties:
- multiple members
- shared projects
- shared calendar visibility
- shared responsibilities
- shared events

### Visibility without ownership transfer
If a record remains in a personal space but is shared with a trusted person:
- ownership stays with the original user
- access is granted through policy
- future revocation is simple

This is essential for “share my mind, but only what I choose”.

---

## 5. Permission Model

### V1 permission philosophy
Keep V1 permissions understandable and human.

Do not rebuild a generalized enterprise policy engine.

### V1 roles

#### Space roles
- `owner`
- `collaborator`
- `viewer`

#### Project roles
- `owner`
- `collaborator`
- `viewer`

#### Selective share levels
- `view`
- `collaborate`

### V1 permission behavior

#### Personal space
- owner controls everything
- no other user sees data unless explicitly shared

#### Shared space
- members inherit access according to membership role
- most shared objects do not need object-by-object grants

#### Selectively shared personal records
- use `share_policies`
- visibility can be narrower than space membership

### Suggested permission matrix

| Scope | Owner | Collaborator | Viewer |
|---|---|---|---|
| Shared space project | Full edit | Edit tasks and updates | Read-only |
| Shared calendar event | Full edit | Edit if allowed by space rules | Read-only |
| Personal project shared selectively | Full edit | Edit only if explicitly granted | Read-only |
| Journal/check-in shared selectively | Full edit | Usually not applicable | Read-only |

### Recommended V1 simplifications
- do not allow arbitrary nested grants
- do not support inheritance chains beyond space/project
- do not create separate permission systems per module

All future modules should map back to:
- space role
- project role
- selective share policy

---

## 6. Calendar/Event Model

### Calendar as source of truth
Calendar is the temporal source of truth for the app.

That means:
- events are real objects, not just derived labels
- personal and shared commitments are visible through calendar context
- project timing can project into the calendar
- trust and coordination happen partly through time visibility

### Calendar layers

#### A. Personal calendar
- belongs to a personal space
- contains private and selectively shared events

#### B. Shared calendar
- belongs to a shared space
- contains shared commitments, household/couple coordination, and shared project events

#### C. External calendar source
- optional future sync layer
- references the internal calendar model rather than replacing it

### Event ownership
Every event belongs to:
- one `calendar`
- one `space`
- one creator

This makes event visibility predictable.

### Event visibility
Suggested V1 visibility values:
- `space`: visible to members of the owning space
- `restricted`: visible only to explicitly allowed users
- `private`: visible only to owner unless shared via policy

### Project-linked events
Tasks and projects may create or link to events.

Examples:
- a deadline becomes a calendar event
- a shared appointment attaches to a shared project
- a personal commitment appears in personal calendar but may be visible to a trusted partner

### Calendar model principles
- calendar is not only for meetings
- calendar is how the app represents time commitments, routines, and shared temporal awareness
- task lists remain useful, but the calendar is where shared time becomes legible

---

## 7. Shared Project Model

### What a shared project is
A shared project is a normal `project` record whose `space_id` points to a shared space.

That is the key V1 simplification.

Avoid creating:
- `shared_projects` as a separate concept
- separate project service paths for shared/personal
- duplicated project UI

### Shared project behavior
- visible to members of the shared space
- optionally refined by `project_members`
- tasks inside the project inherit the same collaboration context
- project events can appear in the shared calendar

### Personal project with selective sharing
Some projects should stay personally owned but be visible to a partner.

That should be handled via:
- personal space ownership
- optional `share_policies`
- optional `project_members` rows if collaboration is allowed

This supports the product intent:
- “this is my project”
- “I want you to see it”
- “I may or may not want you to edit it”

### Recommended project access rules
- project belongs to one space
- shared-space projects are collaborative by default
- personal-space projects are private by default
- selective sharing can make personal projects visible or collaborative

### Why this model works
It preserves:
- simple project ownership
- selective sharing
- collaborative planning
- future extensibility for roadmap/taskflow modules

without creating parallel project systems.

---

## 8. How Future Modules Attach

### Guardrails
Future tables may include:
- `tracks`
- `subtracks`
- `roadmap_items`
- `taskflow_boards`

They should reference:
- `project_id`
- `space_id`

### Widget-based Spaces
Future tables may include:
- `widget_pages`
- `widgets`
- `widget_layouts`

They should reference:
- `space_id`
- canonical core entities such as `project_id`, `calendar_id`, `task_id`

### MindMesh
Future tables may include:
- `mindmesh_nodes`
- `mindmesh_edges`

They should reference:
- `space_id`
- `project_id`
- optional entity references to tasks, journals, people, or events

The V1 spine remains the same.

---

## 9. Recommended First Migration Order

1. Create identity and ownership spine:
   - `profiles`
   - `spaces`
   - `space_members`
   - `person_connections`
   - `user_settings`

2. Create temporal spine:
   - `calendars`
   - `calendar_sources`
   - `calendar_events`
   - `calendar_event_participants`

3. Create planning spine:
   - `projects`
   - `project_members`
   - `tasks`
   - `daily_plans`

4. Create daily operating system spine:
   - `brain_state_entries`
   - `responsibilities`
   - `responsibility_completions`
   - `activity_logs`
   - `checkins`
   - `checkin_messages`
   - `journal_entries`
   - `reports`

5. Add selective sharing:
   - `share_policies`

---

## 10. Final Blueprint Statement

The V1 database should be rebuilt around:
- users
- spaces
- memberships
- selective sharing
- calendars
- projects
- tasks
- daily operating system records

This creates a schema that is:
- small enough for a focused V1
- collaborative enough for the real SharedMinds use case
- structured enough to support future Guardrails, widget-Spaces, MindMesh, and hierarchy systems

without duplicating the heart of the product.
