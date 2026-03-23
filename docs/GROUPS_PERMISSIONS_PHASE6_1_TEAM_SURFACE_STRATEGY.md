# Phase 6.1: Team Surface Strategy — Decision Lock-In

**Status**: ✅ DECIDED  
**Date**: January 2025  
**Depends on**: Phase 6.0  
**Architecture Status**: 🔒 LOCKED

## Decision Summary

### Team UX Strategy

**Decision**: 🟢 **Teams are Admin-Level Infrastructure Surfaces (for now)**

Teams exist to support:
- Permissions
- Groups
- Distribution
- Collaboration scaffolding

They are **not yet** a first-class user navigation concept.

---

## Implications

### ✅ What This Means

- ✅ `/teams/:teamId/groups` remains a standalone admin route
- ✅ Team Groups are considered power-user / admin tooling
- ✅ No Team Settings page is created
- ✅ No Team Overview page is created
- ✅ No partial or placeholder team UX is introduced
- ✅ Phase 4.0 remains complete and valid

### ❌ What This Explicitly Avoids

- ❌ Creating a team page without a clear product role
- ❌ Fragmented navigation
- ❌ Premature collaboration UX
- ❌ Locking SharedMinds into a team-first model too early

---

## Rationale

### Product Honesty

Teams exist primarily for **structural reasons** today (permissions, groups, distribution). Surfacing them prematurely would mislead users about their role in the product.

### UX Discipline

A surface implies intent. We are **not yet ready** to define what "being in a team" means experientially. Creating team pages now would require making assumptions we're not ready to make.

### Architectural Strength

The system already supports teams cleanly at the backend/service level. There is no need to force UI to justify backend existence. Infrastructure can exist without UI surfaces.

### Future Optionality

Teams can later be promoted to:
- Full collaboration spaces
- Organization accounts
- Paid plans

No rework required when that happens. The existing admin routes (`/teams/:teamId/groups`) remain valid and can be integrated or linked when team UX is defined.

---

## Effect on Integration Phases

### Phase 5.1 (Integration)

- ✅ **Track Permissions**: Integrated (complete)
- ✅ **Team Groups**: Remain standalone (intentional decision, not blocked)
- ⏸️ **Task Distribution**: Deferred (no task detail surface)
- ⏸️ **Event Distribution**: Deferred (no event detail surface)

**No changes required to Phase 5.1 implementation.**

### Forward Compatibility

When (and only when) teams become product-level entities, a new phase will define:
- Team purpose
- Team lifecycle
- Team navigation

Existing admin routes can be:
- Embedded into team pages
- Linked from team navigation
- Deprecated gradually (if replaced)

**No architectural debt is created by this decision.**

---

## Lock-In Statement

This decision is **final** for the current development cycle.

Any future change to team UX requires:
- A new phase
- Explicit product goals
- Separate approval

This is not a temporary deferral — it is an explicit decision that teams remain infrastructure-level for the foreseeable future.

---

## Integration Status Update

### Team Groups Route

**Route**: `/teams/:teamId/groups`

**Status**: ✅ **Standalone Admin Route (Intentional)**

**Visibility**: 
- Direct URL access
- Power-user / admin tooling
- Not integrated into team navigation (teams don't have navigation yet)

**Future Path**: 
- When teams become product-level entities, this route can be integrated
- Until then, standalone access is the correct UX

---

## Related Phases

### Phase 4.0 (Team Groups UI)
- ✅ Complete and valid
- ✅ Standalone route implemented
- ✅ No changes needed

### Phase 5.1 (Integration)
- ✅ Track Permissions integrated
- ✅ Team Groups intentionally standalone (not blocked)
- ⏸️ Task/Event Distribution deferred

### Phase 6.0 (Decision Framework)
- ✅ Decision framework created
- ✅ Team surface decision documented here (Phase 6.1)

---

**Document Status**: ✅ Decision Locked  
**Last Updated**: January 2025  
**Next Phase**: N/A (Decision complete, no further team UX work required)
