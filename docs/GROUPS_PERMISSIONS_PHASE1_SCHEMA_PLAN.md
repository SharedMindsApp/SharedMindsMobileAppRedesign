# Phase 1: Schema Foundation - Implementation Plan

**Status:** Phase 1 - Schema Implementation Plan  
**Date:** January 2025  
**Based on:** `GROUPS_PERMISSIONS_PHASE0_LOCKIN.md`

---

## Overview

This document outlines the schema-only implementation for Phase 1 of the Groups + Permissions + Distribution extension. All changes are **additive only** and maintain full backward compatibility.

**No business logic. No service code. No permission resolution. Schema only.**

---

## 1. Team-Scoped Groups Schema

### 1.1 Table: `team_groups`

**Purpose:** Store team-scoped groups used for permission scoping and distribution.

**Columns:**
- `id` (uuid, PK, DEFAULT gen_random_uuid())
- `team_id` (uuid, NOT NULL, FK → teams.id, ON DELETE CASCADE)
- `name` (text, NOT NULL)
- `description` (text, nullable)
- `created_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())
- `archived_at` (timestamptz, nullable) - Soft delete

**Constraints:**
- UNIQUE(team_id, name) WHERE archived_at IS NULL
- Groups cascade delete when team is deleted

**Indexes:**
- `idx_team_groups_team_id` ON team_groups(team_id)
- `idx_team_groups_archived` ON team_groups(archived_at) WHERE archived_at IS NULL

**RLS:** Enabled, default-deny (minimal policies in Phase 1)

### 1.2 Table: `team_group_members`

**Purpose:** Store membership in team groups. Members must be team members.

**Columns:**
- `id` (uuid, PK, DEFAULT gen_random_uuid())
- `group_id` (uuid, NOT NULL, FK → team_groups.id, ON DELETE CASCADE)
- `user_id` (uuid, NOT NULL, FK → profiles.id)
- `added_by` (uuid, FK → profiles.id, nullable)
- `created_at` (timestamptz, DEFAULT now())

**Constraints:**
- UNIQUE(group_id, user_id) - User can only be in group once
- Membership validation: user_id must exist in team_members for the group's team (service layer validation, not DB constraint)

**Indexes:**
- `idx_team_group_members_group_id` ON team_group_members(group_id)
- `idx_team_group_members_user_id` ON team_group_members(user_id)

**RLS:** Enabled, default-deny (minimal policies in Phase 1)

**Note:** Group membership validation against team_members will be enforced in service layer (Phase 2), not schema.

---

## 2. Entity-Level Permission Grants Schema

### 2.1 Table: `entity_permission_grants`

**Purpose:** Store entity-level permission grants for tracks and subtracks.

**Columns:**
- `id` (uuid, PK, DEFAULT gen_random_uuid())
- `entity_type` (text, NOT NULL) - 'track' or 'subtrack' (MVP)
- `entity_id` (uuid, NOT NULL)
- `subject_type` (text, NOT NULL) - 'user' or 'group'
- `subject_id` (uuid, NOT NULL) - References profiles.id or team_groups.id
- `permission_role` (text, NOT NULL) - 'owner', 'editor', 'commenter', or 'viewer'
- `granted_by` (uuid, FK → profiles.id, nullable)
- `granted_at` (timestamptz, DEFAULT now())
- `revoked_at` (timestamptz, nullable) - Soft delete

**Constraints:**
- CHECK(entity_type IN ('track', 'subtrack'))
- CHECK(subject_type IN ('user', 'group'))
- CHECK(permission_role IN ('owner', 'editor', 'commenter', 'viewer'))
- UNIQUE(entity_type, entity_id, subject_type, subject_id) WHERE revoked_at IS NULL

**Indexes:**
- `idx_entity_grants_entity` ON entity_permission_grants(entity_type, entity_id) WHERE revoked_at IS NULL
- `idx_entity_grants_subject` ON entity_permission_grants(subject_type, subject_id) WHERE revoked_at IS NULL
- `idx_entity_grants_revoked` ON entity_permission_grants(revoked_at) WHERE revoked_at IS NULL

**RLS:** Enabled, default-deny (minimal policies in Phase 1)

**Notes:**
- Uses text columns with CHECK constraints (not enums) for flexibility
- Supports all canonical permission roles (including 'commenter' per Phase 0 Correction #3)
- Foreign key validation for entity_id and subject_id will be enforced in service layer (Phase 2)

---

## 3. Creator Attribution Schema

### 3.1 Add `created_by` to `guardrails_tracks`

**Column:** `created_by` (uuid, nullable, FK → profiles.id)

**Migration:** Additive only, no backfill in Phase 1.

**Indexes:**
- `idx_guardrails_tracks_created_by` ON guardrails_tracks(created_by) WHERE created_by IS NOT NULL

**Note:** Nullable to maintain backward compatibility. Backfill will happen in Phase 3.

### 3.2 Add `created_by` to `guardrails_subtracks`

**Column:** `created_by` (uuid, nullable, FK → profiles.id)

**Migration:** Additive only, no backfill in Phase 1.

**Indexes:**
- `idx_guardrails_subtracks_created_by` ON guardrails_subtracks(created_by) WHERE created_by IS NOT NULL

**Note:** Nullable to maintain backward compatibility. Backfill will happen in Phase 3.

---

## 4. Creator Rights Revocation Schema

### 4.1 Table: `creator_rights_revocations`

**Purpose:** Store explicit revocations of creator default rights.

**Columns:**
- `id` (uuid, PK, DEFAULT gen_random_uuid())
- `entity_type` (text, NOT NULL) - 'track' or 'subtrack'
- `entity_id` (uuid, NOT NULL)
- `creator_user_id` (uuid, NOT NULL, FK → profiles.id)
- `revoked_by` (uuid, FK → profiles.id, nullable)
- `revoked_at` (timestamptz, DEFAULT now())

**Constraints:**
- CHECK(entity_type IN ('track', 'subtrack'))
- UNIQUE(entity_type, entity_id, creator_user_id) - One revocation per creator per entity

**Indexes:**
- `idx_creator_revocations_entity` ON creator_rights_revocations(entity_type, entity_id)
- `idx_creator_revocations_creator` ON creator_rights_revocations(creator_user_id)

**RLS:** Enabled, default-deny (minimal policies in Phase 1)

**Note:** Revocation is permanent (no undo column). Re-granting requires explicit entity grant.

---

## 5. Distribution Support Schema

### 5.1 Table: `task_projections`

**Purpose:** Store task projections for group-based distribution.

**Columns:**
- `id` (uuid, PK, DEFAULT gen_random_uuid())
- `task_id` (uuid, NOT NULL, FK → event_tasks.id, ON DELETE CASCADE)
- `target_user_id` (uuid, NOT NULL, FK → auth.users(id))
- `source_group_id` (uuid, FK → team_groups.id, nullable)
- `can_edit` (boolean, DEFAULT false)
- `can_complete` (boolean, DEFAULT true)
- `status` (text, NOT NULL, DEFAULT 'pending') - 'pending', 'accepted', 'declined', 'revoked'
- `created_by` (uuid, FK → auth.users(id), nullable)
- `created_at` (timestamptz, DEFAULT now())
- `accepted_at` (timestamptz, nullable)
- `revoked_at` (timestamptz, nullable)

**Constraints:**
- CHECK(status IN ('pending', 'accepted', 'declined', 'revoked'))
- UNIQUE(task_id, target_user_id) - One projection per user per task

**Indexes:**
- `idx_task_projections_task_id` ON task_projections(task_id)
- `idx_task_projections_target_user` ON task_projections(target_user_id, status) WHERE status = 'accepted'
- `idx_task_projections_source_group` ON task_projections(source_group_id) WHERE source_group_id IS NOT NULL

**RLS:** Enabled, default-deny (minimal policies in Phase 1)

**Notes:**
- References `event_tasks` table (existing tasks table)
- Uses `auth.users(id)` for user references (consistent with calendar_projections)
- Status enum matches calendar projections pattern

### 5.2 Extend `calendar_projections` Table

**Column:** `source_group_id` (uuid, nullable, FK → team_groups.id)

**Migration:** Additive only, no behavioral changes.

**Indexes:**
- `idx_calendar_projections_source_group` ON calendar_projections(source_group_id) WHERE source_group_id IS NOT NULL

**Note:** Nullable to maintain backward compatibility. Existing projections remain unchanged.

---

## 6. Migration Files

### Migration 1: Team-Scoped Groups
**File:** `20250130000001_create_team_groups_schema.sql`
- Creates `team_groups` table
- Creates `team_group_members` table
- Adds indexes
- Enables RLS with minimal policies

### Migration 2: Entity Permission Grants
**File:** `20250130000002_create_entity_permission_grants.sql`
- Creates `entity_permission_grants` table
- Adds indexes
- Enables RLS with minimal policies

### Migration 3: Creator Attribution
**File:** `20250130000003_add_creator_attribution.sql`
- Adds `created_by` to `guardrails_tracks`
- Adds `created_by` to `guardrails_subtracks`
- Adds indexes
- No backfill (Phase 3)

### Migration 4: Creator Rights Revocation
**File:** `20250130000004_create_creator_rights_revocations.sql`
- Creates `creator_rights_revocations` table
- Adds indexes
- Enables RLS with minimal policies

### Migration 5: Distribution Support
**File:** `20250130000005_add_distribution_support.sql`
- Creates `task_projections` table
- Adds `source_group_id` to `calendar_projections`
- Adds indexes
- Enables RLS with minimal policies

---

## 7. RLS Policy Strategy

**Phase 1 Approach:** Minimal, default-deny policies only.

All new tables will have:
- RLS enabled
- Default-deny access (no SELECT policies in Phase 1)
- Service layer will use SECURITY DEFINER functions for access (Phase 2)

**Rationale:**
- Schema-only phase (no permission logic)
- Service layer will implement permission checks (Phase 2)
- Prevents accidental exposure in Phase 1
- Policies can be enhanced in Phase 2 when permission resolution is implemented

---

## 8. Backward Compatibility Guarantees

✅ **All changes are additive:**
- New tables only (no existing tables modified except additive columns)
- New columns are nullable (no NOT NULL constraints on new columns)
- No existing constraints modified
- No existing indexes dropped
- No existing RLS policies modified

✅ **No breaking changes:**
- Existing queries continue to work
- Existing service code continues to work
- Feature flags control visibility (not schema)

✅ **No data migration:**
- No backfills in Phase 1
- No data transformation
- No triggers for data migration

---

## 9. Validation Checklist

Before marking Phase 1 complete, verify:

- [ ] All tables created successfully
- [ ] All columns added successfully
- [ ] All foreign keys created
- [ ] All indexes created
- [ ] RLS enabled on all new tables
- [ ] No existing tables modified (except additive columns)
- [ ] No existing RLS policies modified
- [ ] All migrations are reversible (down migrations provided)
- [ ] Schema supports Phase 0 requirements
- [ ] No business logic in schema
- [ ] No permission resolution logic in schema
- [ ] No triggers for behavior (only data integrity if needed)

---

## 10. Next Steps (Phase 2)

After Phase 1 completion:
- Service layer implementation
- Permission resolution logic
- RLS policy enhancement
- Group membership validation
- Entity grant validation

**Phase 1 must be complete before Phase 2 begins.**

---

**End of Schema Plan**
