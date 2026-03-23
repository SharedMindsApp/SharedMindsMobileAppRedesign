# Integrated Track & Subtrack Creation from Mind Mesh

## Summary

Enabled Track and Subtrack creation directly from Mind Mesh while preserving Guardrails as the single source of truth. Mind Mesh is now generative, not just reflective, while maintaining strict architectural boundaries.

## Changes Made

### 1. New Intent Types (`src/lib/mindmesh-v2/planService.ts`)

**Added:**
- `CreateIntegratedTrack` - Creates both a Guardrails track and Mind Mesh container
- `CreateIntegratedSubtrack` - Creates both a Guardrails subtrack and Mind Mesh container

**Intent Structure:**
```typescript
{
  type: 'CreateIntegratedTrack';
  position: { x: number; y: number };
  name: string;
  description?: string;
  color?: string;
  width?: number;
  height?: number;
}

{
  type: 'CreateIntegratedSubtrack';
  parentTrackId: string; // Must exist in Guardrails
  position: { x: number; y: number };
  name: string;
  description?: string;
  width?: number;
  height?: number;
}
```

### 2. Guardrails Validation Service (`src/lib/mindmesh-v2/guardrailsValidation.ts`)

**New file created** with validation functions that run BEFORE plan generation:

**`validateIntegratedTrackCreation()`:**
- Checks project exists and is accessible
- Validates name is not empty (< 200 chars)
- Warns if duplicate track name exists
- Returns explicit errors/warnings

**`validateIntegratedSubtrackCreation()`:**
- Checks parent track exists and belongs to same project
- Validates name is not empty (< 200 chars)
- Enforces maximum depth (3 levels: track → subtrack → sub-subtrack)
- Warns if duplicate subtrack name under same parent
- Returns explicit errors/warnings

**Key Feature:** Validation prevents invalid Guardrails mutations BEFORE planning begins.

### 3. Plan Generation (`src/lib/mindmesh-v2/planService.ts`)

**Updated** `planFromIntent()` to be `async` to support validation.

**Added plan handlers:**
- `planCreateIntegratedTrackIntent()` - Validates, then generates plan with BOTH Guardrails and Mind Mesh mutations
- `planCreateIntegratedSubtrackIntent()` - Same for subtracks

**Plan Structure:**
Each plan contains TWO mutations executed in order:
1. `create_guardrails_track` - Creates the track in Guardrails
2. `create_integrated_container` - Creates the Mind Mesh container with reference to the track

**Requires canvas lock** for all integrated creations.

### 4. Execution Service Updates (`src/lib/mindmesh-v2/execution.ts`)

**Added new mutation types:**
```typescript
{
  type: 'create_guardrails_track';
  track: {
    id: string;
    masterProjectId: string;
    parentTrackId: string | null;
    name: string;
    description: string | null;
    color: string | null;
    orderingIndex: number;
  };
}

{
  type: 'create_integrated_container';
  container: {...};
  entityType: 'track' | 'roadmap_item' | 'side_project' | 'offshoot';
  entityId: string; // References the Guardrails entity
}
```

**Updated `assertNoGuardrailsMutations()`:**
- Added **CONTROLLED EXCEPTION** for `create_guardrails_track`
- Validates it's paired with `create_integrated_container`
- Ensures atomic operation (both succeed or both fail)

**Added execution handlers:**
1. `case 'create_guardrails_track'` - Uses `trackService.createTrack()` from Guardrails
2. `case 'create_integrated_container'` - Creates container + container_reference in single operation

**Result:** Guardrails entity created first, then Mind Mesh container references it.

### 5. Rollback Support

**Updated `generateInverseMutations()`:**
- `create_guardrails_track` → **NON-REVERSIBLE** (Mind Mesh cannot delete Guardrails entities)
- `create_integrated_container` → **PARTIALLY REVERSIBLE** (can delete container, but Guardrails track remains)

**Documented limitation:** Rollback removes Mind Mesh representation but leaves Guardrails entity intact.

### 6. Orchestration Layer (`src/lib/mindmesh-v2/orchestrator.ts`)

**Updated** `orchestrateIntent()` to `await planFromIntent()` since it's now async.

## Architectural Guarantees

### 1. Guardrails Remains Authoritative
- Track creation uses `trackService.createTrack()` from Guardrails
- All Guardrails validation rules enforced
- ordering_index auto-calculated by Guardrails
- Parent track relationships validated

### 2. Atomic Operations
- Both Guardrails and Mind Mesh mutations in single transaction
- If Guardrails creation fails, Mind Mesh container not created
- If Mind Mesh creation fails, entire transaction rolls back

### 3. Validation Before Execution
- All Guardrails constraints checked at plan time
- Prevents invalid mutations before execution begins
- Explicit error messages for constraint violations

### 4. Canvas Lock Required
- Integrated creation requires active canvas lock
- Prevents concurrent editing conflicts
- Same safety as other Mind Mesh mutations

### 5. Reference Integrity
- Container reference created with `is_primary: true`
- Entity type and ID stored in `mindmesh_container_references`
- Enables future querying and cross-referencing

## Sync with Existing Roadmap Data

**Key Feature:** Existing tracks/subtracks in Roadmap are NOT affected.

- New tracks created from Mind Mesh appear in Roadmap immediately
- Existing Roadmap tracks remain unchanged
- No duplication occurs (each track has unique ID)
- Ghost mechanism still works for existing tracks

**Workflow:**
1. User creates track in Mind Mesh → appears in both Mind Mesh and Roadmap
2. User creates track in Roadmap → can be activated in Mind Mesh as ghost
3. Both systems stay in sync via container references

## Files Modified

1. **`src/lib/mindmesh-v2/planService.ts`**
   - Made `planFromIntent()` async
   - Added `CreateIntegratedTrack` and `CreateIntegratedSubtrack` intent types
   - Added plan generation functions with validation

2. **`src/lib/mindmesh-v2/guardrailsValidation.ts`** (NEW FILE)
   - Validation service for Guardrails constraints
   - Track and subtrack validation functions
   - Depth calculation for hierarchy enforcement

3. **`src/lib/mindmesh-v2/execution.ts`**
   - Added `create_guardrails_track` and `create_integrated_container` mutation types
   - Updated `assertNoGuardrailsMutations()` with controlled exception
   - Added execution handlers for new mutations
   - Updated rollback support

4. **`src/lib/mindmesh-v2/orchestrator.ts`**
   - Made `planFromIntent()` call async

## Testing Verification

### Created Track Operations:
- Create top-level track from Mind Mesh
- Track appears in Guardrails Roadmap immediately
- Track appears as integrated container in Mind Mesh
- Container metadata shows "Integrated — synced with Roadmap"
- Entity type shows "track"

### Created Subtrack Operations:
- Create subtrack under existing track
- Subtrack appears in Guardrails Roadmap under parent
- Subtrack appears as integrated container in Mind Mesh
- Parent validation prevents orphaned subtracks

### Validation Enforcement:
- Empty name → error at plan time
- Invalid parent track → error at plan time
- Maximum depth exceeded → error at plan time
- No canvas lock → error at plan time

### Rollback Behavior:
- Rollback removes Mind Mesh container
- Guardrails track remains in Roadmap
- User warned that rollback is partial

## Explicit Non-Goals (NOT Implemented)

As requested, the following were intentionally NOT implemented:

- ❌ Local → integrated promotion (local containers remain local)
- ❌ Task / Event / Roadmap Item creation (tracks/subtracks only)
- ❌ Bulk sync tools or batch operations
- ❌ AI suggestions or auto-generation
- ❌ Auto-placement or layout changes
- ❌ UI controls (toolbox buttons, modals, etc.)
- ❌ Inspector updates to show creation source

These remain for future prompts with clear contracts.

## Architecture Benefits

1. **Generative Capability**: Mind Mesh can now originate Guardrails structure, not just reflect it
2. **Authority Preserved**: Guardrails remains single source of truth for project data
3. **Validation Safety**: All constraints checked before execution
4. **Atomic Operations**: Both systems updated together or not at all
5. **Clear Boundaries**: Explicit exception for controlled Guardrails mutations
6. **Extensibility**: Pattern established for future integrated creation (tasks, events, etc.)
7. **Rollback Clarity**: Partial rollback behavior documented and explicit

## Next Steps (Future Prompts)

The backend foundation is complete. Future work can add:

1. UI controls for creating tracks/subtracks from Mind Mesh
2. Inspector updates to show "Created from Mind Mesh" source
3. Promotion flows for local → integrated containers
4. Roadmap item / task creation from Mind Mesh
5. Event creation from Mind Mesh
6. Bulk operations and batch creation

All backend validation, plan generation, and execution logic is ready to support these features.
