# Phase 5.1: Controlled Integration into Defined Product Surfaces

**Status**: ✅ COMPLETE (Track Permissions + Team Groups Standalone), ⏸️ DEFERRED (Task/Event Distribution)  
**Date**: January 2025  
**Depends on**: Phase 4.0–4.4 (Completed), Phase 5.0 (Correctly Blocked), Phase 6.0 (Decisions LOCKED)  
**Architecture Status**: 🔒 LOCKED — NO CHANGES ALLOWED

## Executive Summary

Phase 5.1 mechanically integrates existing, production-ready permission-aware UIs into real product navigation flows, based strictly on Phase 6.0 decisions.

**This is integration only. No new architecture. No new permissions.**

---

## Integration Status

### ✅ Track Permissions Integration (COMPLETED)

**Route**: `/projects/:projectId/tracks/:trackId/permissions`

**Integration Location**: Track Workspace Menu (WorkspaceShell)

**Implementation**:
- Added "Permissions" menu item to track workspace context menu
- Link visible only when `ENABLE_ENTITY_GRANTS` is enabled
- Link visible only to users with edit permission (`useCanEditTrack`)
- Navigates to existing standalone route
- No permission re-checks (route guard handles this)

**File Modified**: `src/components/guardrails/workspace/WorkspaceShell.tsx`

**Status**: ✅ Complete and discoverable

---

### ✅ Team Groups Integration (INTENTIONALLY STANDALONE)

**Route**: `/teams/:teamId/groups`

**Status**: ✅ **Standalone Admin Route (Intentional Decision)**

**Phase 6.1 Decision**: Teams are admin-level infrastructure surfaces (not first-class UX)

**Rationale**:
- Teams exist primarily for structural reasons (permissions, groups, distribution)
- No Team Settings/Overview pages will be created at this time
- Team Groups remain power-user / admin tooling
- Standalone route is the correct UX for current team model

**Integration Status**: ✅ **Complete as standalone route** (no integration required)

**Future Path**: When teams become product-level entities, integration can be reconsidered in a new phase

---

### ⏸️ Task Distribution (DEFERRED)

**Route**: Not configured (no integration target)

**Phase 6.0 Decision**: Explicitly deferred — no task detail surface exists

**Status**: ⏸️ **Intentionally Deferred**

**Action**: 
- ❌ No routes added
- ❌ No navigation added
- ✅ Documented as deferred

---

### ⏸️ Event Distribution (DEFERRED)

**Route**: Not configured (no integration target)

**Phase 6.0 Decision**: Explicitly deferred — no event detail/calendar surface exists

**Status**: ⏸️ **Intentionally Deferred**

**Action**: 
- ❌ No routes added
- ❌ No navigation added
- ✅ Documented as deferred

---

## Integration Summary

### Successfully Integrated

| Feature | Route | Integration Point | Status |
|---------|-------|-------------------|--------|
| Track Permissions | `/projects/:projectId/tracks/:trackId/permissions` | Track Workspace Menu | ✅ Complete |

### Blocked / Deferred

| Feature | Route | Reason | Status |
|---------|-------|--------|--------|
| Team Groups | `/teams/:teamId/groups` | Intentionally standalone (Phase 6.1 decision) | ✅ Standalone |
| Task Distribution | N/A | No task detail surface (Phase 6.0 deferred) | ⏸️ Deferred |
| Event Distribution | N/A | No event detail surface (Phase 6.0 deferred) | ⏸️ Deferred |

---

## Verification Checklist

### ✅ Completed Checks

- ✅ No new routes created (only navigation links added)
- ✅ No permissions modified (existing permission hooks used)
- ✅ No architecture drift (only navigation entry points)
- ✅ No duplicated UI (links to existing routes only)
- ✅ Feature flags respected (`ENABLE_ENTITY_GRANTS` checked)
- ✅ Permission visibility respected (`useCanEditTrack` used)
- ✅ Route guards remain canonical (no permission re-checks)

### ✅ Standalone / Deferred Items

- ✅ Team Groups (intentionally standalone per Phase 6.1)
- ⏸️ Task Distribution (explicitly deferred)
- ⏸️ Event Distribution (explicitly deferred)

---

## Files Modified

### Track Permissions Integration

**File**: `src/components/guardrails/workspace/WorkspaceShell.tsx`

**Changes**:
- Added import for `Shield` icon from `lucide-react`
- Added import for `ENABLE_ENTITY_GRANTS` feature flag
- Added import for `useCanEditTrack` permission hook
- Added permission hook call: `useCanEditTrack(trackId)`
- Added "Permissions" menu item to track context menu (between Edit and Delete)
- Menu item visible only when feature flag enabled and user has edit permission
- Menu item uses `navigate()` to route to `/projects/${projectId}/tracks/${trackId}/permissions`
- Menu closes on click (same behavior as Edit/Delete)

---

## Deferred Integration Log

### Task Distribution (Phase 4.3)

**Status**: ⏸️ Deferred

**Reason**: Phase 6.0 explicitly deferred integration — no task detail surface exists

**Phase 6.0 Decision**: Task Distribution integration deferred until task detail view exists

**Action in Phase 5.1**: 
- ❌ No routes added
- ❌ No navigation added
- ✅ Documented as intentionally deferred

---

### Event Distribution (Phase 4.4)

**Status**: ⏸️ Deferred

**Reason**: Phase 6.0 explicitly deferred integration — no event detail/calendar surface exists

**Phase 6.0 Decision**: Event Distribution integration deferred until event detail view exists

**Action in Phase 5.1**: 
- ❌ No routes added
- ❌ No navigation added
- ✅ Documented as intentionally deferred

---

### Team Groups (Phase 4.0)

**Status**: ✅ Standalone Admin Route (Intentional Decision)

**Phase 6.1 Decision**: Teams are admin-level infrastructure surfaces (not first-class UX)

**Rationale**:
- Teams exist primarily for structural reasons (permissions, groups, distribution)
- No Team Settings/Overview pages will be created
- Team Groups remain power-user / admin tooling

**Action in Phase 5.1**: 
- ✅ Route remains standalone admin surface (intentional)
- ✅ No integration required (teams are infrastructure-level)
- ✅ Documented as intentional decision

**Status**: ✅ **Complete as standalone route**

---

## Completion Criteria

### ✅ Met

- ✅ Track Permissions are discoverable via track navigation
- ✅ Team Groups remain standalone admin route (intentional decision)
- ✅ Admin routes remain canonical (no routes modified)
- ✅ Deferred features remain untouched
- ✅ No architectural rules violated
- ✅ Feature flags respected
- ✅ Permission visibility respected

---

## Next Steps

### For Team Groups

✅ **Decision Locked (Phase 6.1)**: Teams remain infrastructure-level
- Route `/teams/:teamId/groups` remains standalone admin surface
- No integration required (intentional decision)
- When teams become product-level entities, integration can be reconsidered in a new phase

### For Task/Event Distribution

- Wait for task detail view and event detail view to be created
- Then integrate distribution UI into those views

---

**Document Status**: ✅ Integration Complete (Track Permissions + Team Groups Standalone), ⏸️ Deferred (Task/Event Distribution)  
**Last Updated**: January 2025 (Updated per Phase 6.1 decision)  
**Next Phase**: TBD (Task/Event Detail Surfaces or Other Features)
