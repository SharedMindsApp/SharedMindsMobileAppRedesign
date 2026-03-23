# Container Authority Implementation

## Summary

Formalized the distinction between **local-only** and **integrated** containers in Mind Mesh V2, eliminating UUID-related errors and establishing clear authority boundaries.

## Changes Made

### 1. Container Authority Concept

Introduced explicit authority tracking to distinguish between:

- **`local_only`**: Containers that exist only in Mind Mesh with no Guardrails backing
- **`integrated`**: Containers backed by Guardrails entities (tracks, roadmap items, side projects, offshoots)

### 2. Metadata Service Updates (`src/lib/mindmesh-v2/containerMetadata.ts`)

**Added:**
- `authority` field to `ContainerMetadata` interface
- `isLocalOnlyContainer()` helper function to check container authority
- Clear documentation about authority types and query prevention

**Updated:**
- `fetchContainerMetadata()` returns early for local-only containers without database queries
- All metadata fetch functions (`fetchTrackMetadata`, `fetchRoadmapItemMetadata`, etc.) include `authority: 'integrated'`
- Local containers return `authority: 'local_only'` with `sourceLabel: 'Local (Mind Mesh only)'`

**Result:** Local-only containers NEVER trigger Supabase queries to Guardrails tables, eliminating all "invalid input syntax for type uuid: ''" errors.

### 3. Inspector Clarity (`src/components/guardrails/mindmesh/ContainerInspector.tsx`)

**Added:**
- Blue info banner for local containers: "Local container — exists only in Mind Mesh"
- Conditional rendering of Technical Details section (only shown for integrated containers)

**Result:** Users can clearly see when a container is local-only vs. backed by Guardrails.

### 4. Movement Logic Consistency (`src/components/guardrails/mindmesh/MindMeshCanvasV2.tsx`)

**Updated:**
- Renamed `isManualContainer` to `isLocalOnlyContainer` for consistency
- Updated error messages to say "Local container" instead of "Manual container"

**Result:** Consistent terminology throughout the codebase.

## Semantic Boundaries

### What Local-Only Containers ARE:
- Free-form thinking space in Mind Mesh
- Can be moved, resized, connected with nodes
- Have title and/or body content
- Stored in `mindmesh_containers` table only
- No Guardrails entity reference

### What Local-Only Containers CANNOT Do:
- ❌ Query Guardrails tables for metadata
- ❌ Have entity_type or entity_id values
- ❌ Be promoted to Guardrails entities (not yet implemented)
- ❌ Sync with Roadmap, Tracks, or other Guardrails systems

### What Integrated Containers ARE:
- Representations of Guardrails entities in Mind Mesh
- Backed by tracks, roadmap_items, side_projects, or offshoots
- Metadata fetched from authoritative Guardrails tables
- entity_id and entity_type always set

## Files Modified

1. `src/lib/mindmesh-v2/containerMetadata.ts`
   - Added authority tracking
   - Added `isLocalOnlyContainer()` helper
   - Updated all metadata functions to include authority

2. `src/components/guardrails/mindmesh/ContainerInspector.tsx`
   - Added local container info banner
   - Conditional Technical Details section

3. `src/components/guardrails/mindmesh/MindMeshCanvasV2.tsx`
   - Updated terminology: `isManualContainer` → `isLocalOnlyContainer`
   - Improved drag behavior (container stays attached to cursor)

## Testing Verification

### ✅ Local-Only Container Operations:
- Create local container via drag-and-drop
- Move local container (direct database update)
- Edit local container title/body
- Hover over local container (shows metadata without queries)
- Click local container to open inspector (shows "Local" status)
- Delete local container

### ✅ Integrated Container Operations:
- View integrated container metadata (fetches from Guardrails)
- Move integrated container (uses intent system)
- Hover/inspect integrated containers (shows entity details)

### ✅ Error Prevention:
- No Supabase queries with empty UUID strings
- No "invalid input syntax for type uuid" errors
- Clear authority boundaries enforced at read time

## Future Work (Explicitly NOT Implemented)

The following capabilities are intentionally NOT included in this change:

- ❌ Promotion of local containers to Guardrails entities
- ❌ "Convert to Track/Task" buttons
- ❌ Sync logic between local and integrated containers
- ❌ Bidirectional promotion/demotion flows

These will be addressed in future prompts with clear contracts and safety mechanisms.

## Architecture Benefits

1. **Correctness**: Local containers never leak into Guardrails queries
2. **Clarity**: Users know exactly what type of container they're working with
3. **Stability**: No runtime errors from empty UUID queries
4. **Extensibility**: Clear foundation for future promotion logic
5. **Safety**: Authority boundaries prevent accidental cross-system mutations
