# System Side Effects Map

## Overview

This document defines **explicit, bounded side-effect propagation** across the Guardrails system. Every action has a well-defined set of allowed and forbidden side effects.

**Core Principle: Side effects are explicit, not implicit. No silent cascades. No hidden automation.**

---

## Side Effect Categories

### ✅ Allowed Side Effects
Side effects that are architecturally sound and explicitly designed.

### ⚠️ Conditional Side Effects
Side effects that require explicit user opt-in or configuration.

### ❌ Forbidden Side Effects
Side effects that violate architectural invariants and must never occur.

---

## Roadmap Item Operations

### Create Roadmap Item

**Trigger:** User creates a roadmap item via UI or API

**✅ Allowed Side Effects:**
- Create Mind Mesh node representing the item
- Create Mind Mesh edges for relationships (parent, track, dependencies)
- Sync task to Task Flow board (if item is a task)
- Create collaboration log entry
- Update project analytics cache
- Trigger presence update (ephemeral)

**⚠️ Conditional Side Effects:**
- Send notification to assigned users (if notifications enabled)
- Update shared track visibility (if track is shared)

**❌ Forbidden Side Effects:**
- Create AI draft
- Mutate Personal Spaces
- Create unrelated entities
- Trigger automation
- Send external webhooks
- Mutate other projects

**Machine-Readable:**
```json
{
  "trigger": "create_roadmap_item",
  "allowed": [
    "create_mindmesh_node",
    "create_mindmesh_edges",
    "sync_taskflow",
    "create_collaboration_log",
    "update_analytics_cache",
    "trigger_presence"
  ],
  "conditional": [
    "send_notification",
    "update_shared_track"
  ],
  "forbidden": [
    "create_ai_draft",
    "mutate_personal_spaces",
    "trigger_automation",
    "send_webhook",
    "mutate_other_projects"
  ]
}
```

---

### Update Roadmap Item

**Trigger:** User updates roadmap item (status, deadline, assignment, etc.)

**✅ Allowed Side Effects:**
- Update Mind Mesh node attributes
- Update Task Flow task (if synced)
- Create collaboration log entry
- Update project analytics cache
- Trigger presence update (ephemeral)
- Recalculate track dates (if deadline changed)

**⚠️ Conditional Side Effects:**
- Send notification to assignees (if status changed)
- Trigger regulation engine check (if deadline extended)

**❌ Forbidden Side Effects:**
- Create AI draft
- Mutate Personal Spaces
- Create new entities
- Trigger external automation

---

### Delete Roadmap Item

**Trigger:** User deletes roadmap item

**✅ Allowed Side Effects:**
- Soft delete item (archive)
- Archive Mind Mesh node
- Archive Task Flow task (if synced)
- Create collaboration log entry
- Update project analytics cache
- Recalculate track dates

**⚠️ Conditional Side Effects:**
- Cascade delete children (if user confirms)
- Archive assignments

**❌ Forbidden Side Effects:**
- Hard delete without confirmation
- Mutate unrelated entities
- Trigger external actions

---

## Track Operations

### Create Track

**Trigger:** User creates a track

**✅ Allowed Side Effects:**
- Create collaboration log entry
- Update project analytics cache

**⚠️ Conditional Side Effects:**
- Create shared track link (if marked as shared)

**❌ Forbidden Side Effects:**
- Create items
- Mutate Personal Spaces
- Trigger AI generation

---

### Update Track

**Trigger:** User updates track (name, color, shared status)

**✅ Allowed Side Effects:**
- Update collaboration log entry
- Update project analytics cache
- Update Mind Mesh track node (if exists)

**⚠️ Conditional Side Effects:**
- Update shared track visibility (if shared status changed)

**❌ Forbidden Side Effects:**
- Mutate items within track
- Trigger AI regeneration

---

### Delete Track

**Trigger:** User deletes track

**✅ Allowed Side Effects:**
- Soft delete track (archive)
- Create collaboration log entry

**⚠️ Conditional Side Effects:**
- Cascade archive items (if user confirms)
- Remove shared track links (if shared)

**❌ Forbidden Side Effects:**
- Hard delete without confirmation
- Orphan items without warning

---

## AI Operations

### Generate AI Content

**Trigger:** User requests AI assistance

**✅ Allowed Side Effects:**
- Create AI draft
- Create AI interaction log
- Parse and resolve tags
- Create tag resolution log
- Consume context within budget

**⚠️ Conditional Side Effects:**
- Create presence indicator (if opted in)

**❌ Forbidden Side Effects:**
- Create roadmap items directly
- Update roadmap items directly
- Create tracks
- Mutate Personal Spaces
- Trigger automation
- Send notifications
- Execute any write to authoritative tables

**Machine-Readable:**
```json
{
  "trigger": "ai_generate_content",
  "allowed": [
    "create_ai_draft",
    "create_ai_interaction_log",
    "parse_tags",
    "create_tag_resolution_log",
    "consume_context"
  ],
  "conditional": [
    "create_presence_indicator"
  ],
  "forbidden": [
    "create_roadmap_item",
    "update_roadmap_item",
    "create_track",
    "mutate_personal_spaces",
    "trigger_automation",
    "send_notification",
    "write_authoritative_tables"
  ]
}
```

---

### Apply AI Draft

**Trigger:** User confirms AI draft

**✅ Allowed Side Effects:**
- Create roadmap items (if draft contains items)
- Update roadmap items (if draft contains updates)
- Create tracks (if draft contains tracks)
- Create collaboration log entries
- Update analytics cache
- Mark draft as applied

**⚠️ Conditional Side Effects:**
- Sync to Task Flow (if applicable)
- Create Mind Mesh nodes (if applicable)

**❌ Forbidden Side Effects:**
- Apply without user confirmation
- Mutate unrelated entities
- Trigger chained AI generation

---

### Discard AI Draft

**Trigger:** User discards AI draft

**✅ Allowed Side Effects:**
- Mark draft as discarded
- Update user preference (if user opts to hide similar suggestions)

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Delete draft permanently (soft delete only)
- Affect authoritative data

---

## Personal Spaces Operations

### Consume Roadmap Data

**Trigger:** User views roadmap in Personal Space

**✅ Allowed Side Effects:**
- Create personal_space_consumption record
- Update last_accessed timestamp
- Create ephemeral visibility log

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Mutate roadmap items
- Mutate tracks
- Create Personal Space entities in Guardrails
- Affect other users
- Trigger AI generation

---

### Create Personal Link

**Trigger:** User creates personal link to Guardrails entity

**✅ Allowed Side Effects:**
- Create personal_space_consumption record
- Update Personal Space index

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Mutate linked entity
- Share link with other users (owner-only)

---

## Task Flow Operations

### View Task Flow Board

**Trigger:** User views Task Flow

**✅ Allowed Side Effects:**
- Load synced tasks from roadmap
- Create presence indicator
- Create collaboration log entry

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Create tasks not from roadmap
- Mutate roadmap items
- Create items in Guardrails

---

### Update Task Status

**Trigger:** User drags task card in Task Flow

**✅ Allowed Side Effects:**
- Update corresponding roadmap item status
- Create collaboration log entry
- Update analytics cache

**⚠️ Conditional Side Effects:**
- Send notification (if opted in)

**❌ Forbidden Side Effects:**
- Create new tasks
- Mutate unrelated entities

---

## Mind Mesh Operations

### Create Node

**Trigger:** User creates node in Mind Mesh

**✅ Allowed Side Effects:**
- Create node record
- Create collaboration log entry
- Update graph metadata

**⚠️ Conditional Side Effects:**
- Auto-link to related nodes (if AI-assisted)

**❌ Forbidden Side Effects:**
- Create roadmap item
- Create track
- Mutate authoritative entities

---

### Create Edge

**Trigger:** User creates relationship in Mind Mesh

**✅ Allowed Side Effects:**
- Create edge record
- Create collaboration log entry
- Update graph metrics

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Mutate linked entities
- Create dependencies in roadmap

---

## Collaboration Operations

### User Joins Session

**Trigger:** User opens project page

**✅ Allowed Side Effects:**
- Create presence record (ephemeral)
- Update session timestamp
- Trigger cursor broadcast

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Mutate project data
- Create entities

---

### User Edits Entity

**Trigger:** User types or makes change

**✅ Allowed Side Effects:**
- Create collaboration log entry (append-only)
- Broadcast cursor position
- Update presence timestamp

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Mutate collaboration logs
- Delete logs
- Affect other users' sessions

---

### Collaboration Log Entry

**Trigger:** Any mutation operation

**✅ Allowed Side Effects:**
- Append log entry (immutable)
- Update entity metadata (last_modified_by, last_modified_at)

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Update existing logs
- Delete logs
- Mutate unrelated entities

---

## Shared Track Operations

### Share Track

**Trigger:** User marks track as shared

**✅ Allowed Side Effects:**
- Update track is_shared flag
- Create collaboration log entry
- Create shared_track_links records

**⚠️ Conditional Side Effects:**
- Send notification to consuming projects (if opted in)

**❌ Forbidden Side Effects:**
- Mutate items in track
- Grant permissions automatically
- Duplicate track

---

### Link Shared Track

**Trigger:** User consumes shared track in another project

**✅ Allowed Side Effects:**
- Create shared_track_links record
- Validate source project access
- Create collaboration log entry

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Mutate source track
- Create local copy
- Grant permissions to source project

---

## Permission Operations

### Grant User Access

**Trigger:** Admin invites user to project

**✅ Allowed Side Effects:**
- Create project_users record
- Create collaboration log entry
- Send invitation (if user external)

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Grant cross-project access
- Escalate permissions silently

---

### Revoke User Access

**Trigger:** Admin removes user from project

**✅ Allowed Side Effects:**
- Delete project_users record
- Create collaboration log entry
- Archive user's Personal Space links (if opted in)

**⚠️ Conditional Side Effects:**
- Reassign user's assignments (if user confirms)

**❌ Forbidden Side Effects:**
- Delete user's data
- Mutate unrelated projects

---

## Regulation Engine Operations

### Check Regulation Rules

**Trigger:** User action or time-based check

**✅ Allowed Side Effects:**
- Create regulation_events record
- Update regulation_state
- Display warning/pause overlay

**⚠️ Conditional Side Effects:**
- Send notification (if critical threshold)

**❌ Forbidden Side Effects:**
- Mutate roadmap items
- Block user permanently
- Trigger automation

---

## Focus Mode Operations

### Start Focus Session

**Trigger:** User starts focus mode

**✅ Allowed Side Effects:**
- Create focus_sessions record
- Update focus state
- Start timer

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Mutate roadmap items
- Create tasks
- Lock other users

---

### Log Distraction

**Trigger:** User logs distraction during focus

**✅ Allowed Side Effects:**
- Create focus_distractions record
- Update session metrics

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Affect roadmap
- Create offshoots automatically

---

## Template Operations

### Create User Template

**Trigger:** User saves template

**✅ Allowed Side Effects:**
- Create user_templates record
- Create template metadata

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Share template without permission
- Mutate official templates

---

### Apply Template

**Trigger:** User applies template to project

**✅ Allowed Side Effects:**
- Create tracks from template
- Create roadmap items from template
- Create collaboration log entries

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Overwrite existing data
- Mutate template

---

## Archive Operations

### Archive Project

**Trigger:** User archives project

**✅ Allowed Side Effects:**
- Set project archived_at timestamp
- Create collaboration log entry
- Update analytics

**⚠️ Conditional Side Effects:**
- None

**❌ Forbidden Side Effects:**
- Delete project
- Remove user access
- Mutate data

---

## Summary Tables

### Authoritative Write Operations

| Source | Target | Allowed |
|--------|--------|---------|
| Guardrails UI | roadmap_items | ✅ |
| Guardrails API | roadmap_items | ✅ |
| AI | roadmap_items | ❌ (drafts only) |
| Personal Spaces | roadmap_items | ❌ |
| Task Flow | roadmap_items | ⚠️ (sync only) |
| Mind Mesh | roadmap_items | ❌ |

### Side Effect Propagation

| Action | Mind Mesh | Task Flow | Personal Spaces | AI | Notifications |
|--------|-----------|-----------|-----------------|-----|---------------|
| Create Item | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| Update Item | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| Delete Item | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| AI Generate | ❌ | ❌ | ❌ | ✅ | ❌ |
| Personal View | ❌ | ❌ | ✅ | ❌ | ❌ |

### Forbidden Flows

| Source | Target | Operation | Reason |
|--------|--------|-----------|--------|
| AI | roadmap_items | write | AI outputs are drafts only |
| Personal Spaces | roadmap_items | write | Personal Spaces are consumption-only |
| Task Flow | roadmap_items | create | Task Flow syncs, doesn't originate |
| Mind Mesh | roadmap_items | create | Mind Mesh represents, doesn't create authority |
| Household | guardrails_tracks_v2 | write | Domain separation |
| External API | roadmap_items | write | External systems read-only |

---

## Future Extension Points

### Notifications (Not Yet Implemented)

**When implemented, must:**
- Consume collaboration logs + analytics
- Require explicit user opt-in
- Never mutate any entities
- Be user-configurable
- Respect notification preferences

### Automations (Not Yet Implemented)

**When implemented, must:**
- Require explicit user configuration
- Show preview before execution
- Never execute silently
- Create audit trail
- Be reversible

### Proactive AI (Not Yet Implemented)

**When implemented, must:**
- Create drafts only
- Require user opt-in
- Never execute automatically
- Respect AI usage limits
- Be transparent

---

## Enforcement

All side effects are enforced via:

1. **Runtime Assertions:** `systemConstraintService.ts`
2. **Database RLS Policies:** PostgreSQL Row Level Security
3. **Service Layer Validation:** Pre-operation checks
4. **Type System:** TypeScript compile-time checks
5. **Audit Logs:** All mutations logged

**Violations trigger:** `InvariantViolationError` and are logged for review.

---

## Conclusion

Side effects in Guardrails are:
- **Explicit:** Documented and known
- **Bounded:** No cascading chains
- **Auditable:** All logged
- **Enforceable:** Runtime checks
- **Reversible:** Soft deletes preferred

No silent automation. No hidden cascades. Every action has defined, predictable consequences.
