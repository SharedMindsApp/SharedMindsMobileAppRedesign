# Phase 3.4: Permission-Aware Layout & Composition Strategy

**Status:** Architecture Decision (Final Lock-In)  
**Date:** January 2025  
**Phase:** 3.4 of N (Schema → Services → API → Transport → Hooks → Permission Rules → **Layout Composition**)

---

## Overview

Phase 3.4 defines **where permission checks live structurally in the UI component tree**, ensuring permissions are handled once, at the correct layer, and never scattered or duplicated.

### Context Recap

**Already Completed (DO NOT REIMPLEMENT):**
- Phase 2.1–2.2: Permission resolver + `canUserAccessTrack`, `canUserEditTrack`
- Phase 3.1: API transport strategy (direct function calls)
- Phase 3.2: UI API consumption via domain-specific hooks
- Phase 3.3: Permission-aware UI rules (route / section / action scopes)

**Locked Rules (Non-Negotiable):**
- UI NEVER calls resolvers directly
- UI NEVER imports services
- Permission hooks NEVER talk to Supabase
- Permission checks NEVER happen in render bodies
- Permission hooks return `PermissionState = boolean | null`
- UI must not render permission-gated elements until permission is known

### Goal

Define where permission checks live in the component tree, so that:
- Permissions are checked once per scope
- Child components never re-check the same permission
- Layouts enforce permissions structurally
- Sections inherit permissions naturally
- Feature flags and permissions compose cleanly
- No permission flicker occurs
- No duplicated permission checks appear across siblings

**This phase answers:** "Which component is responsible for which permission?"

---

## Permission Ownership by UI Layer

### Layer 1: Route Guards

**Responsibility:** Own route-level permissions

**What Route Guards DO:**
- Check if user can access the entire route/page
- Prevent route component from rendering until permission confirmed
- Show loading skeleton while checking
- Redirect unauthorized users
- Gate entire feature areas

**What Route Guards MUST NOT DO:**
- Check section-level permissions (that's layout's job)
- Check action-level permissions (that's component's job)
- Render route component before permission confirmed
- Allow permission flicker

**Structural Guarantee:**
- Child layouts and pages MUST assume route access is already granted
- Route guard failure means entire tree below never renders

**Example Pattern:**
```typescript
// Route guard checks route-level permission
<ProjectRouteGuard>  // Checks: canUserAccessProject(userId, projectId)
  <ProjectLayout>    // ASSUMES: route access granted
    <ProjectPage />  // ASSUMES: route access granted
  </ProjectLayout>
</ProjectRouteGuard>
```

**Permission Functions Used:**
- `canUserAccessProject(userId, projectId)`
- Project-level permission checks
- Team membership checks

---

### Layer 2: Layouts

**Responsibility:** Own section-level permissions

**What Layouts DO:**
- Check section-level permissions (feature areas, panels)
- Gate entire feature sections structurally
- Conditionally render sections based on permissions
- Provide permission context downward (optional, via props/context)
- Handle loading states for section-level checks

**What Layouts MUST NOT DO:**
- Re-check route-level permissions (assume route guard handled it)
- Check action-level permissions (that's component's job)
- Render gated sections before permission confirmed
- Duplicate permission checks across sibling sections
- Mix route and section permission logic

**Structural Guarantee:**
- Layouts check permissions once per section
- Child components in a section MUST assume section permission is granted
- If layout renders a section, children can assume access

**Example Pattern:**
```typescript
// Layout checks section-level permissions
function TeamSettingsLayout({ teamId }: { teamId: string }) {
  const { canManage, loading } = useCanManageTeamGroups(teamId);
  
  if (loading) return <LoadingSkeleton />;
  
  return (
    <div>
      {/* Always visible - no permission check needed */}
      <GeneralSettingsSection teamId={teamId} />
      
      {/* Gated by layout - children assume access */}
      {canManage && (
        <GroupManagementSection teamId={teamId} />
        // Children MUST NOT re-check canManage
      )}
    </div>
  );
}
```

**Permission Functions Used:**
- `canUserEditTrack(userId, trackId)` (for track-level sections)
- `canUserManageTeamGroups(userId, teamId)` (for team sections)
- Project role checks (owner/admin for settings)
- Team role checks (owner/admin for team features)

**Critical Rule:** If layout guarantees `canEditTrack === true`, children MUST NOT re-check `canUserEditTrack`.

---

### Layer 3: Pages

**Responsibility:** Data composition and structure ONLY

**What Pages DO:**
- Compose data and structure UI
- Organize sections and components
- Handle data fetching (via hooks)
- Coordinate UI state

**What Pages MUST NOT DO:**
- Perform permission checks (that's route guard and layout's job)
- Check route-level permissions (assume route guard handled it)
- Check section-level permissions (assume layout handled it)
- Re-check permissions already checked by parent
- Gate sections (that's layout's job)

**Structural Guarantee:**
- Pages assume all necessary permissions are already granted by parents
- Pages focus on composition, not permission logic

**Example Pattern:**
```typescript
// Page assumes permissions granted by parents
function ProjectPage({ projectId }: { projectId: string }) {
  // ✅ CORRECT: No permission checks
  // Route guard checked: canUserAccessProject
  // Layout checked: section permissions
  
  return (
    <div>
      <ProjectHeader projectId={projectId} />
      <TracksList projectId={projectId} />
      <SettingsPanel projectId={projectId} />
    </div>
  );
}
```

---

### Layer 4: Sections / Panels

**Responsibility:** Optional subsection gating (if not handled by layout)

**What Sections DO:**
- MAY gate optional subsections (via permission hooks)
- Render content based on data and props
- Compose child components

**What Sections MUST NOT DO:**
- Duplicate layout-level permission checks
- Check route-level permissions
- Check permissions already guaranteed by parent layout
- Gate sections that parent layout already gates

**Structural Guarantee:**
- Sections only check permissions if parent layout didn't gate the section
- If parent layout renders section, assume permission granted

**Example Pattern:**
```typescript
// Section only checks if layout didn't gate it
function TrackSettingsSection({ trackId }: { trackId: string }) {
  // ❌ WRONG: Re-checking if layout already gated this section
  // const { canEdit } = useCanEditTrack(trackId);
  
  // ✅ CORRECT: Assume layout granted access, focus on content
  return (
    <div>
      <TrackDetails trackId={trackId} />
      <TrackActions trackId={trackId} /> {/* Actions check their own permissions */}
    </div>
  );
}
```

**When Sections MAY Check Permissions:**
- Parent layout doesn't gate the section
- Section needs to gate optional subsections
- Permission is specific to section content (not layout-level)

---

### Layer 5: Actions (Buttons / Controls)

**Responsibility:** Own action-level permissions only

**What Actions DO:**
- Check action-level permissions (can perform specific action)
- Hide/show based on permission
- Enable/disable based on temporary state
- Use inline checks or small permission hooks

**What Actions MUST NOT DO:**
- Influence layout or routing (that's layout/route guard's job)
- Check route-level or section-level permissions
- Re-check permissions already guaranteed by parent
- Duplicate permission checks across sibling actions

**Structural Guarantee:**
- Actions check their own permissions independently
- Actions don't affect layout structure
- Actions hide if no permission (don't disable)

**Example Pattern:**
```typescript
// Action checks its own permission
function EditTrackButton({ trackId }: { trackId: string }) {
  const { canEdit, loading } = useCanEditTrack(trackId);
  
  if (loading || canEdit === null) return null;
  if (!canEdit) return null;
  
  return <button onClick={handleEdit}>Edit Track</button>;
}
```

**Permission Functions Used:**
- `canUserEditTrack(userId, trackId)`
- `canUserAccessTrack(userId, trackId)`
- Entity-level permission checks

---

## Canonical Layout Patterns

### Pattern 1: Protected Route Layout

**Structure:** Route guard → Layout → Page

**Permission Flow:**
1. Route guard checks route-level permission
2. Layout receives guaranteed route access
3. Page receives guaranteed route access + layout-gated sections

**Pattern:**
```typescript
// Route Configuration
<Route
  path="/projects/:projectId/*"
  element={
    <ProjectRouteGuard>  {/* Checks: canUserAccessProject */}
      <ProjectLayout>    {/* Assumes: route access granted */}
        <ProjectPage />  {/* Assumes: route access granted */}
      </ProjectLayout>
    </ProjectRouteGuard>
  }
/>

// Route Guard
function ProjectRouteGuard({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const check = async () => {
      const result = await canUserAccessProject(user.id, projectId);
      setCanAccess(result);
      setLoading(false);
      if (!result) navigate('/projects');
    };
    check();
  }, [projectId, user.id]);
  
  if (loading || canAccess === null) return <ProjectPageSkeleton />;
  if (!canAccess) return null;
  
  return <>{children}</>; // Render layout + page
}

// Layout (no route permission check)
function ProjectLayout({ children }: { children: React.ReactNode }) {
  // ✅ CORRECT: No route permission check (route guard handled it)
  return (
    <div>
      <ProjectHeader />
      {children} {/* Page rendered here */}
    </div>
  );
}

// Page (no permission checks)
function ProjectPage({ projectId }: { projectId: string }) {
  // ✅ CORRECT: No permission checks (parents handled it)
  return <TracksList projectId={projectId} />;
}
```

**Key Rules:**
- Route guard is the only place that checks route-level permission
- Layout and page NEVER check route-level permission
- No permission logic inside page

---

### Pattern 2: Permission-Aware Layout

**Structure:** Layout checks permission once → Conditionally renders sections

**Permission Flow:**
1. Layout checks section-level permission
2. Layout conditionally renders section
3. Children in section assume permission granted

**Pattern:**
```typescript
function TeamSettingsLayout({ teamId }: { teamId: string }) {
  // Layout checks permission once
  const { canManage, loading } = useCanManageTeamGroups(teamId);
  
  if (loading) return <TeamSettingsSkeleton />;
  
  return (
    <div>
      {/* Always visible - no permission check */}
      <GeneralSettingsSection teamId={teamId} />
      
      {/* Gated by layout - children assume access */}
      {canManage && (
        <GroupManagementSection teamId={teamId} />
        // ✅ Children MUST NOT re-check canManage
      )}
    </div>
  );
}

// Child section (assumes permission granted)
function GroupManagementSection({ teamId }: { teamId: string }) {
  // ❌ WRONG: Re-checking layout permission
  // const { canManage } = useCanManageTeamGroups(teamId);
  
  // ✅ CORRECT: Assume layout granted access
  return (
    <div>
      <GroupsList teamId={teamId} />
      <CreateGroupButton teamId={teamId} /> {/* Action checks its own permission */}
    </div>
  );
}
```

**Key Rules:**
- Layout checks permission once per section
- Children MUST NOT re-check layout permission
- Prevents child permission duplication

---

### Pattern 3: Nested Permission Composition

**Structure:** Higher-level permission implies lower-level permissions

**Permission Hierarchy:**
- Route-level → Section-level → Action-level
- Higher-level permission implies lower-level access
- Children must not re-check implied permissions

**Pattern:**
```typescript
// Route guard: canUserAccessProject
<ProjectRouteGuard>
  <ProjectLayout>
    {/* Layout: canUserEditTrack (section-level) */}
    {canEditTrack && (
      <TrackEditSection trackId={trackId}>
        {/* ✅ CORRECT: Action assumes section permission granted */}
        <EditTrackButton trackId={trackId} /> {/* Action checks: canUserEditTrack (action-level) */}
        {/* ❌ WRONG: Action re-checks section permission */}
      </TrackEditSection>
    )}
  </ProjectLayout>
</ProjectRouteGuard>
```

**Rule:** If layout guarantees `canEditTrack === true`, children MUST NOT re-check `canUserEditTrack` for the same entity.

**Exception:** Actions may check action-level permissions for different entities or different actions.

**Example:**
```typescript
// Layout guarantees: canEditTrack(trackId) === true
function TrackEditSection({ trackId }: { trackId: string }) {
  return (
    <div>
      {/* ✅ CORRECT: Different action (grant permission) */}
      <GrantPermissionButton trackId={trackId} /> {/* Checks: canGrantPermission (different permission) */}
      
      {/* ❌ WRONG: Re-checking layout permission */}
      {/* <EditTrackButton trackId={trackId} /> // Already guaranteed by layout */}
    </div>
  );
}
```

---

## Feature Flags + Permissions Composition

### Rule: Feature Flags Evaluated Before Permissions

**Ordering:** Feature flag → Permission → UI render

**Rules:**
1. Feature flags are evaluated before permissions
2. Disabled features are hidden structurally (not conditionally in children)
3. Permission hooks must assume feature is enabled
4. UI must not leak existence of disabled features

**Pattern:**
```typescript
// ✅ CORRECT: Feature flag at layout level
function TeamSettingsLayout({ teamId }: { teamId: string }) {
  const { canManage, loading } = useCanManageTeamGroups(teamId);
  
  if (loading) return <TeamSettingsSkeleton />;
  
  return (
    <div>
      <GeneralSettingsSection teamId={teamId} />
      
      {/* Feature flag checked before permission */}
      {ENABLE_GROUPS && canManage && (
        <GroupManagementSection teamId={teamId} />
      )}
    </div>
  );
}

// ❌ WRONG: Feature flag in child component
function GroupManagementSection({ teamId }: { teamId: string }) {
  // Feature flag should be checked by parent layout
  if (!ENABLE_GROUPS) return null;
  return <GroupsList teamId={teamId} />;
}
```

**Key Rules:**
- Feature flags checked at layout level (before permission)
- Permission hooks assume feature is enabled
- Disabled features hidden structurally (parent doesn't render)
- Children don't check feature flags

---

## Permission Context (Optional, Non-Mandatory)

**Status:** Future-safe pattern, NOT mandatory implementation

**Purpose:** Used only when multiple children need the same permission

**Constraints:**
- Must NOT replace permission functions
- Must NOT store derived business logic
- Used only when truly needed (don't over-engineer)

**Pattern (Optional):**
```typescript
// Optional: Permission context provider (only if needed)
const TrackPermissionContext = createContext<{
  canEdit: boolean;
  canView: boolean;
} | null>(null);

function TrackLayout({ trackId }: { trackId: string }) {
  const { canEdit, canView, loading } = useTrackPermissions(trackId);
  
  if (loading) return <LoadingSkeleton />;
  
  return (
    <TrackPermissionContext.Provider value={{ canEdit, canView }}>
      <TrackHeader trackId={trackId} />
      <TrackContent trackId={trackId} />
      <TrackActions trackId={trackId} />
    </TrackPermissionContext.Provider>
  );
}

// Children consume context (optional)
function TrackActions({ trackId }: { trackId: string }) {
  const permissions = useContext(TrackPermissionContext);
  
  // ✅ CORRECT: Use context if available
  // ✅ CORRECT: Fall back to permission hook if context not available
  const { canEdit } = permissions || useCanEditTrack(trackId);
  
  if (!canEdit) return null;
  return <EditButton trackId={trackId} />;
}
```

**When to Use:**
- Multiple children need same permission
- Permission is expensive to check
- Permission context simplifies child components

**When NOT to Use:**
- Single child needs permission (use hook directly)
- Permission is cheap to check
- Adds unnecessary complexity

**Note:** This pattern is optional. Permission hooks are the default pattern.

---

## Explicit Anti-Patterns

### ❌ Anti-Pattern 1: Checking Permissions in Pages

```typescript
// ❌ WRONG: Page checking permissions
function ProjectPage({ projectId }: { projectId: string }) {
  const { canAccess, loading } = useCanAccessProject(projectId);
  
  if (!canAccess) return <Redirect to="/projects" />;
  return <TracksList projectId={projectId} />;
}
```

**Why Wrong:**
- Route guard should handle route-level permissions
- Duplicates permission check
- Breaks structural guarantees

**Correct:**
- Route guard checks route-level permission
- Page assumes access granted

---

### ❌ Anti-Pattern 2: Re-Checking Layout Permissions in Children

```typescript
// ❌ WRONG: Child re-checking layout permission
function TeamSettingsLayout({ teamId }: { teamId: string }) {
  const { canManage } = useCanManageTeamGroups(teamId);
  
  return (
    <div>
      {canManage && <GroupManagementSection teamId={teamId} />}
    </div>
  );
}

function GroupManagementSection({ teamId }: { teamId: string }) {
  // ❌ WRONG: Re-checking layout permission
  const { canManage } = useCanManageTeamGroups(teamId);
  return <GroupsList teamId={teamId} />;
}
```

**Why Wrong:**
- Duplicates permission check
- Layout already gated section
- Wastes resources

**Correct:**
- Layout checks permission once
- Children assume permission granted

---

### ❌ Anti-Pattern 3: Multiple Siblings Calling Same Permission Hook

```typescript
// ❌ WRONG: Multiple siblings checking same permission
function TrackSection({ trackId }: { trackId: string }) {
  return (
    <div>
      <EditButton trackId={trackId} /> {/* Checks: canUserEditTrack */}
      <DeleteButton trackId={trackId} /> {/* Checks: canUserEditTrack */}
      <GrantButton trackId={trackId} /> {/* Checks: canUserEditTrack */}
    </div>
  );
}
```

**Why Wrong:**
- Duplicates permission checks
- Multiple hooks for same permission
- Wastes resources

**Correct:**
- Layout checks permission once, gates section
- Actions assume permission granted
- OR: Single permission hook at section level, pass to children

---

### ❌ Anti-Pattern 4: Mixing Route and Section Permissions

```typescript
// ❌ WRONG: Route guard checking section permissions
function ProjectRouteGuard({ children }: { children: React.ReactNode }) {
  const canAccess = await canUserAccessProject(userId, projectId);
  const canEdit = await canUserEditTrack(userId, trackId); // ❌ Wrong layer
  
  if (!canAccess) return <Redirect />;
  return <>{children}</>;
}
```

**Why Wrong:**
- Route guard should only check route-level permissions
- Section permissions belong in layout
- Breaks separation of concerns

**Correct:**
- Route guard: route-level only
- Layout: section-level only

---

### ❌ Anti-Pattern 5: Feature Flag Checks Inside Leaf Components

```typescript
// ❌ WRONG: Feature flag in leaf component
function GroupManagementSection({ teamId }: { teamId: string }) {
  if (!ENABLE_GROUPS) return null; // ❌ Feature flag in child
  return <GroupsList teamId={teamId} />;
}
```

**Why Wrong:**
- Feature flags should be checked at layout level
- Leaks feature existence to children
- Breaks structural hiding

**Correct:**
- Layout checks feature flag before rendering
- Children don't check feature flags

---

### ❌ Anti-Pattern 6: Permission-Based Branching Inside Render Bodies

```typescript
// ❌ WRONG: Permission check in render body
function TrackSection({ trackId }: { trackId: string }) {
  const canEdit = await canUserEditTrack(userId, trackId); // ❌ Async in render
  
  return canEdit ? <EditSection /> : <ViewSection />;
}
```

**Why Wrong:**
- Breaks React rules (async in render)
- Causes race conditions
- Impossible to memoize

**Correct:**
- Permission check in `useEffect` or hook
- State-based conditional rendering

---

### ❌ Anti-Pattern 7: Layouts Calling Action-Level Permission Checks

```typescript
// ❌ WRONG: Layout checking action-level permission
function TrackLayout({ trackId }: { trackId: string }) {
  const { canEdit } = useCanEditTrack(trackId); // ❌ Action-level in layout
  
  return (
    <div>
      {canEdit && <EditButton trackId={trackId} />}
    </div>
  );
}
```

**Why Wrong:**
- Layout should check section-level permissions
- Actions should check their own permissions
- Breaks layer responsibilities

**Correct:**
- Layout: section-level permissions
- Actions: action-level permissions

---

## Flicker-Free Structural Guarantees

### Guarantee 1: Routes Never Render Before Permission Known

**Rule:** Route guard must confirm permission before rendering children

**Pattern:**
```typescript
function ProjectRouteGuard({ children }: { children: React.ReactNode }) {
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkPermission().then(result => {
      setCanAccess(result);
      setLoading(false);
    });
  }, []);
  
  // ✅ CORRECT: Don't render until permission known
  if (loading || canAccess === null) return <ProjectPageSkeleton />;
  if (!canAccess) return null;
  
  return <>{children}</>; // Only render if permission confirmed
}
```

---

### Guarantee 2: Layouts Never Render Gated Sections Until Permission Resolved

**Rule:** Layout must confirm permission before rendering gated section

**Pattern:**
```typescript
function TeamSettingsLayout({ teamId }: { teamId: string }) {
  const { canManage, loading } = useCanManageTeamGroups(teamId);
  
  // ✅ CORRECT: Don't render gated section until permission known
  if (loading) return <TeamSettingsSkeleton />;
  
  return (
    <div>
      <GeneralSettingsSection teamId={teamId} />
      {canManage && <GroupManagementSection teamId={teamId} />}
    </div>
  );
}
```

---

### Guarantee 3: Children Never "Flash" Then Disappear

**Rule:** No permission-gated component may render before its permission is resolved

**Pattern:**
```typescript
// ✅ CORRECT: Hide until permission confirmed
function EditButton({ trackId }: { trackId: string }) {
  const { canEdit, loading } = useCanEditTrack(trackId);
  
  // ✅ CORRECT: null means unknown (hide)
  if (loading || canEdit === null) return null;
  if (!canEdit) return null;
  
  return <button>Edit</button>;
}
```

---

### Guarantee 4: Loading States Handled Above Render Points

**Rule:** Loading states must be handled at the layer that performs the permission check

**Pattern:**
```typescript
// ✅ CORRECT: Loading state at permission check layer
function ProjectRouteGuard({ children }: { children: React.ReactNode }) {
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Loading handled here (permission check layer)
  if (loading) return <ProjectPageSkeleton />;
  
  return <>{children}</>;
}
```

---

### Explicit Rule

**No permission-gated component may render before its permission is resolved.**

This means:
- `PermissionState === null` → component doesn't render
- `PermissionState === false` → component doesn't render
- `PermissionState === true` → component renders

---

## Final Architecture Summary

### Permission Responsibility Table

| Layer | Responsibility | Permission Scope | Checks | Children Assume |
|-------|---------------|------------------|--------|----------------|
| **Route Guard** | Route-level access | Entire page/route | `canUserAccessProject`, team membership | Route access granted |
| **Layout** | Section-level access | Feature sections/panels | `canUserEditTrack`, `canUserManageTeamGroups`, project/team roles | Section access granted |
| **Page** | Data composition | None | None | All permissions granted |
| **Section** | Optional subsection gating | Optional subsections (if layout didn't gate) | Only if parent didn't gate | Permission granted by parent |
| **Action** | Action-level access | Specific actions | `canUserEditTrack`, `canUserAccessTrack` | Nothing (checks own permission) |

### Visual Mental Model

```
Route Guard (Route Permission)
  └─> Layout (Section Permissions)
       └─> Page (No Permission Checks)
            └─> Section (Optional Subsection Permissions)
                 └─> Action (Action Permissions)
```

**Key Principles:**
1. Permissions flow downward (parent → child)
2. Each layer checks its own scope
3. Children assume parent permissions granted
4. No upward permission checks
5. No duplicate permission checks

### "Where to Put Permission Checks" Checklist

**Route-Level Permissions:**
- ✅ Route guard component
- ❌ Layout
- ❌ Page
- ❌ Section
- ❌ Action

**Section-Level Permissions:**
- ✅ Layout component
- ❌ Route guard (unless route-level)
- ❌ Page
- ❌ Section (unless optional subsection)
- ❌ Action

**Action-Level Permissions:**
- ✅ Action component (button/control)
- ✅ Small permission hook in action
- ❌ Route guard
- ❌ Layout
- ❌ Page
- ❌ Section (unless action-specific)

**Feature Flags:**
- ✅ Layout component (before permission)
- ❌ Route guard (unless feature-level route)
- ❌ Page
- ❌ Section
- ❌ Action

### Clear Guidance for Future Contributors

**When Adding a New Feature:**

1. **Identify Permission Scope:**
   - Route-level? → Route guard
   - Section-level? → Layout
   - Action-level? → Action component

2. **Check Existing Permissions:**
   - Does parent already check this permission? → Don't re-check
   - Is permission already guaranteed? → Assume granted

3. **Follow Layer Responsibilities:**
   - Route guard: route-level only
   - Layout: section-level only
   - Page: no permissions
   - Action: action-level only

4. **Prevent Flicker:**
   - Use `PermissionState = boolean | null`
   - Hide until permission confirmed (`null` → hide)
   - Handle loading at permission check layer

5. **Respect Feature Flags:**
   - Check feature flag at layout level
   - Before permission check
   - Hide structurally (parent doesn't render)

**Red Flags (Stop and Reconsider):**
- ❌ Permission check in page component
- ❌ Re-checking parent permission
- ❌ Multiple siblings checking same permission
- ❌ Permission check in render body
- ❌ Feature flag in leaf component
- ❌ Layout checking action-level permission

---

## Summary

### Key Principles

1. **Permission Ownership:** Each layer owns its permission scope
2. **Single Check:** Permissions checked once per scope
3. **Downward Flow:** Permissions flow parent → child
4. **No Duplication:** Children don't re-check parent permissions
5. **Structural Gating:** Permissions gate structure, not just visibility
6. **Flicker Prevention:** No rendering until permission resolved

### Layer Responsibilities

- **Route Guard:** Route-level permissions
- **Layout:** Section-level permissions
- **Page:** No permissions (composition only)
- **Section:** Optional subsection permissions
- **Action:** Action-level permissions

### Composition Rules

- Feature flags → Permissions → UI render
- Higher-level permissions imply lower-level access
- Children assume parent permissions granted
- No permission-gated component renders before permission resolved

### Benefits

- ✅ Single source of truth for permissions
- ✅ No duplicated permission checks
- ✅ Clear layer responsibilities
- ✅ Flicker-free UI
- ✅ Scalable permission architecture
- ✅ Easy to reason about and maintain

---

**End of Permission-Aware Layout & Composition Strategy Document**
