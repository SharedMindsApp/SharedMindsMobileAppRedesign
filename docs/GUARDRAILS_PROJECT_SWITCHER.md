# Guardrails Project Switcher Documentation

## Overview

The Project Switcher system provides users with the ability to select which Master Project is currently "active" across the entire Guardrails system. This selection controls which project's data is loaded in all Guardrails sections including Roadmap, Mind Mesh, Task Flow, Focus Mode, and more.

## Core Principles

1. **Dashboard-Only Switching**: Users can only change the active project from the Dashboard
2. **Global Active State**: Once set, the active project applies to all Guardrails sections
3. **Persistent Selection**: Active project persists across browser sessions via localStorage
4. **Navigation Guards**: Project-specific sections are inaccessible without an active project
5. **Visual Indicators**: Clear UI feedback shows which project is currently active

## Architecture

### State Management

The active project state is managed through **ActiveProjectContext** located at:
```
src/contexts/ActiveProjectContext.tsx
```

**Context Structure**:
```typescript
interface ActiveProjectContextType {
  activeProjectId: string | null;        // ID of active project
  activeProject: MasterProject | null;    // Full project object
  setActiveProject: (project: MasterProject | null) => void;
  clearActiveProject: () => void;
}
```

**Persistence**:
- Active project ID stored in: `localStorage['guardrails_active_project_id']`
- Full project object stored in: `localStorage['guardrails_active_project']`
- Persists across browser sessions and page refreshes
- Automatically loaded on app initialization

### Component Hierarchy

```
App
└── ActiveProjectProvider (Context)
    ├── GuardrailsLayout (Shows active project in sidebar)
    │   ├── Sidebar (Disables items when no active project)
    │   └── Main Content
    │       ├── GuardrailsDashboard
    │       │   └── ProjectSwitcher (Main switching UI)
    │       ├── GuardrailsRoadmap (Requires active project)
    │       ├── GuardrailsMindMesh (Requires active project)
    │       ├── GuardrailsTaskFlow (Requires active project)
    │       └── ... other project-specific pages
    └── ProjectWizard (Auto-activates new projects)
```

## User Flows

### First-Time User Experience

1. User visits `/guardrails` for the first time
2. No projects exist → Redirected to `/guardrails/wizard`
3. User completes wizard and creates first project
4. **Project automatically set as active**
5. User redirected to `/guardrails/dashboard`
6. Can now access all Guardrails sections

### Switching Active Projects

**Step 1: Navigate to Dashboard**
- User can only change active project from Dashboard
- Other sections show active project but don't allow switching

**Step 2: View Project Switcher**
- Located at top of dashboard (below wizard prompt, above analytics)
- Shows all projects grouped by domain
- Each project shows:
  - Project name and description
  - Status badge (Active, Completed, Abandoned)
  - Last updated date
  - Number of roadmap items
  - Quick action buttons

**Step 3: Set New Active Project**
- Click "Set Active" button on desired project
- Only available for projects with status = 'active'
- Completed/Abandoned projects cannot be set active
- Current active project shows "ACTIVE" badge (no "Set Active" button)

**Step 4: Immediate Effect**
- Active project updated in context
- Saved to localStorage
- Sidebar updates to show new active project
- All menu items now enabled (if previously disabled)
- Dashboard data refreshes for new project
- No page reload required

### Accessing Project-Specific Sections

**With Active Project Selected**:
- All menu items in sidebar are enabled
- Clicking any section loads data for active project
- Sections include:
  - Roadmap
  - Task Flow
  - Mind Mesh
  - Reality Check
  - Side Projects
  - Offshoot Ideas
  - Focus Mode
  - Focus Analytics
  - Focus Sessions
  - Regulation Rules

**Without Active Project**:
- Menu items appear disabled (grayed out)
- Tooltip on hover: "Select an active project first"
- Clicking disabled item shows alert: "Please select an active project from the Dashboard first"
- User redirected to `/guardrails/dashboard`
- Attempting to directly navigate to project sections redirects to dashboard

### Working with Completed/Abandoned Projects

**Viewing**:
- Completed and abandoned projects visible in Project Switcher
- Displayed with reduced opacity (60%)
- Status clearly indicated with badge

**Limitations**:
- Cannot be set as active project
- "Set Active" button not shown
- Can view via "View Archive" button
- Archive link goes to `/guardrails/settings/archive`

**Accessing Archived Data**:
- Click "View Archive" on completed/abandoned project
- Opens archive management page
- Can view historical data
- Can potentially reactivate (if feature implemented)

## Components

### ProjectSwitcher Component

**File**: `src/components/guardrails/dashboard/ProjectSwitcher.tsx`

**Purpose**: Main UI for viewing and switching active projects

**Props**:
```typescript
interface ProjectSwitcherProps {
  domainProjectsGrouped: Array<{
    domain: Domain;
    activeProject: { project: MasterProject; stats: any } | null;
    completedProjects: Array<{ project: MasterProject; stats: any }>;
    abandonedProjects: Array<{ project: MasterProject; stats: any }>;
  }>;
  onRefresh: () => void;
}
```

**Features**:
- Groups projects by domain
- Shows domain icon and color coding
- Highlights active project with blue border
- Displays project statistics
- Quick action buttons:
  - Set Active (for inactive active projects)
  - Roadmap (opens project roadmap)
  - Mind Mesh (opens project nodes)
  - Task Flow (opens project task flow)
  - View Archive (for completed/abandoned)
- Warning banner when no project selected

**Visual States**:

*Active Project*:
- Blue border (`border-blue-500`)
- Blue background (`bg-blue-50`)
- "ACTIVE" badge in top-right corner
- Green checkmark icon
- No "Set Active" button (already active)

*Inactive Active Project*:
- Gray border (`border-gray-200`)
- White background
- "Set Active" button shown
- Full opacity
- All action buttons enabled

*Completed/Abandoned Project*:
- Gray border
- White background
- 60% opacity
- Status badge (Completed/Abandoned)
- "Set Active" button hidden
- "View Archive" button shown

### GuardrailsLayout Updates

**File**: `src/components/guardrails/GuardrailsLayout.tsx`

**Active Project Display**:
- Shows at top of sidebar (below header, above navigation)
- Icon: Target icon (`Target` from lucide-react)
- Collapsed state: Shows only icon with tooltip
- Expanded state: Shows "Active Project" label + project name

**Navigation Item States**:
```typescript
interface NavItem {
  name: string;
  path: string;
  icon: Component;
  requiresProject?: boolean;  // TRUE for project-specific sections
}
```

**Disabled State Logic**:
```typescript
const requiresProject = item.requiresProject && !activeProject;

// Visual states:
- Normal: text-gray-600 hover:bg-gray-50
- Active: bg-blue-50 text-blue-700
- Disabled: text-gray-400 cursor-not-allowed
```

**Tooltip Behavior**:
- Collapsed sidebar: Always show item name on hover
- Disabled items: Add "Needs active project" message
- Alert on click: "Please select an active project from the Dashboard first."

### RequireActiveProject Guard

**File**: `src/components/guardrails/RequireActiveProject.tsx`

**Purpose**: Wrapper component to protect project-specific routes

**Usage** (if needed in future):
```tsx
<Route path="/guardrails/roadmap" element={
  <RequireActiveProject>
    <GuardrailsRoadmap />
  </RequireActiveProject>
} />
```

**Behavior**:
- Checks if `activeProjectId` exists
- If not: Shows "No Active Project Selected" screen
- Auto-redirects to `/guardrails/dashboard?needsProject=1`
- Prevents rendering of protected content

**Note**: Currently, individual pages handle their own guards. This component exists for future use if centralized guard is preferred.

## Integration Points

### Dashboard Integration

**File**: `src/components/guardrails/dashboard/GuardrailsDashboard.tsx`

**ProjectSwitcher Placement**:
```tsx
<div>
  <h1>Guardrails Dashboard</h1>
  <p>Overview...</p>
</div>

{/* Wizard prompt if needed */}

<ProjectSwitcher
  domainProjectsGrouped={domainProjectsGrouped}
  onRefresh={loadData}
/>

<ProjectsOverview ... />
<AnalyticsPanel ... />
...
```

**Data Flow**:
1. Dashboard loads all projects and domains
2. Groups projects by domain with stats
3. Passes grouped data to ProjectSwitcher
4. ProjectSwitcher reads `activeProjectId` from context
5. When user clicks "Set Active", calls `setActiveProject(project)`
6. `onRefresh()` called to reload dashboard data
7. All sections update with new active project

### Wizard Integration

**File**: `src/components/guardrails/wizard/ProjectWizard.tsx`

**Auto-Activation on Project Creation**:
```typescript
const result = await createProjectWithWizard({...});
await markWizardCompleted();

// AUTO-ACTIVATE NEW PROJECT
setActiveProject(result.project);

resetWizard();
navigate('/guardrails/dashboard');
```

**Flow**:
1. User completes wizard
2. Project created via API
3. **Immediately set as active project**
4. Wizard marked complete
5. Redirect to dashboard
6. User can immediately access all Guardrails sections

### Project-Specific Pages

All pages that depend on an active project follow this pattern:

**File**: `src/components/guardrails/GuardrailsRoadmap.tsx` (example)

```typescript
export function GuardrailsRoadmap() {
  const { activeProject } = useActiveProject();
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeProject) {
      const timer = setTimeout(() => {
        navigate('/guardrails/dashboard?needProject=1');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeProject, navigate]);

  if (!activeProject) {
    return (
      <div>No Active Project Selected - Redirecting...</div>
    );
  }

  // Render page with activeProject data
  return <RoadmapPage projectId={activeProject.id} />;
}
```

**Guard Pattern**:
1. Import `useActiveProject` hook
2. Check if `activeProject` exists
3. If not: Show message and redirect after delay
4. If yes: Render page with active project data

## API & Data Flow

### Setting Active Project

```typescript
// From ProjectSwitcher
const handleSetActive = (project: MasterProject) => {
  setActiveProject(project);  // Updates context + localStorage
  onRefresh();                 // Reload dashboard data
};
```

**What Happens**:
1. `setActiveProject()` called with full project object
2. Context updates:
   - `activeProjectId` = project.id
   - `activeProject` = project object
3. localStorage updated:
   - `guardrails_active_project_id` = ID string
   - `guardrails_active_project` = JSON stringified object
4. All components subscribed to context re-render
5. Sidebar updates
6. Menu items re-enable
7. Dashboard data refreshes

### Clearing Active Project

```typescript
// Programmatic clear (if needed)
clearActiveProject();
```

**When to Use**:
- User logs out
- Active project is deleted
- Reset functionality needed
- Testing/debugging

### Validating Stored Project

**On App Boot** (handled automatically by context):
1. Context provider initializes
2. Reads from localStorage
3. Loads `activeProjectId` and `activeProject`
4. If present: Sets in state
5. If invalid/missing: Stays null

**Validation** (recommended for future enhancement):
```typescript
useEffect(() => {
  async function validateActiveProject() {
    if (activeProjectId) {
      try {
        const project = await getMasterProjectById(activeProjectId);
        if (!project) {
          clearActiveProject();
        }
      } catch {
        clearActiveProject();
      }
    }
  }
  validateActiveProject();
}, []);
```

## Visual Design

### Color Coding by Domain

```typescript
const DOMAIN_COLORS = {
  work: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-600',
  },
  personal: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-600',
  },
  creative: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: 'text-orange-600',
  },
  health: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-600',
  },
};
```

### Status Badges

```tsx
// Active status
<span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
  Active
</span>

// Completed status
<span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
  Completed
</span>

// Abandoned status
<span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
  Abandoned
</span>
```

### Active Project Badge

```tsx
<div className="px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
  <Check className="w-3 h-3" />
  ACTIVE
</div>
```

### Button Styles

```tsx
// Primary action (Set Active)
<button className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
  Set Active
</button>

// Secondary actions (Roadmap, Mind Mesh, etc.)
<button className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
  <Icon className="w-3.5 h-3.5" />
  Action Name
</button>
```

## User Experience Considerations

### Clear Visual Feedback

**Problem**: User unsure which project is active
**Solution**:
- Blue border + background on active project card
- "ACTIVE" badge with checkmark
- Sidebar shows active project name
- Warning banner if no project selected

### Prevented Navigation Confusion

**Problem**: User tries to access Roadmap without active project
**Solution**:
- Menu items visually disabled
- Tooltip explains requirement
- Click shows alert + redirects to dashboard
- Dashboard clearly shows how to select project

### Smooth Project Creation Flow

**Problem**: User creates project but has to manually activate it
**Solution**:
- Wizard auto-activates new project
- Immediate redirect to dashboard
- All features unlocked immediately
- No additional steps required

### Handling Archived Projects

**Problem**: User confused why completed project can't be activated
**Solution**:
- Clear status badge
- Reduced opacity (60%)
- No "Set Active" button shown
- "View Archive" button for accessing data

## Edge Cases & Error Handling

### Active Project Deleted

**Scenario**: User's active project is deleted (by admin, another session, etc.)

**Current Behavior**:
- localStorage still has stale project ID
- Page attempts to load data
- API returns 404 or null
- Page shows error or loading indefinitely

**Recommended Solution** (future enhancement):
```typescript
// In project-specific pages
useEffect(() => {
  async function validateProject() {
    if (activeProjectId) {
      const exists = await getMasterProjectById(activeProjectId);
      if (!exists) {
        clearActiveProject();
        navigate('/guardrails/dashboard');
      }
    }
  }
  validateProject();
}, [activeProjectId]);
```

### Multiple Active Projects Per Domain

**Current Design**: One project can be active across ALL domains

**Scenario**: User has active project in Work domain, creates new project in Personal domain

**Behavior**:
- New project can be set active
- Replaces Work project as active
- Only ONE active project at a time globally

**Alternative Design Consideration**: One active project per domain
- Would require more complex state management
- Current single-project design is simpler and clearer

### Rapid Project Switching

**Scenario**: User rapidly clicks between different "Set Active" buttons

**Behavior**:
- Each click triggers state update
- localStorage updated each time
- Dashboard refresh called each time
- Last click wins

**Performance**: No issues, state updates are fast

### Offline/Network Issues

**Scenario**: User sets active project while offline

**Behavior**:
- State updates in context (synchronous)
- localStorage updates (synchronous)
- Dashboard refresh may fail (async)
- Active project still set in sidebar
- Data may be stale until online

## Testing Scenarios

### Happy Path: First Project Creation

1. New user completes wizard
2. Project created successfully
3. ✓ Project auto-activated
4. ✓ Redirected to dashboard
5. ✓ Sidebar shows active project
6. ✓ All menu items enabled
7. ✓ Can access Roadmap, Mind Mesh, etc.

### Happy Path: Switching Projects

1. User has multiple projects
2. Navigate to dashboard
3. See all projects in ProjectSwitcher
4. ✓ Current active project has blue border + badge
5. Click "Set Active" on different project
6. ✓ Previous project loses blue styling
7. ✓ New project gains blue styling
8. ✓ Sidebar updates
9. ✓ Dashboard data refreshes

### Edge Case: Direct Navigation Without Active Project

1. User has no active project set
2. Directly navigate to `/guardrails/roadmap` via URL
3. ✓ Page shows "No Active Project" message
4. ✓ After 3 seconds, redirects to dashboard
5. ✓ Dashboard shows how to select project

### Edge Case: localStorage Cleared

1. User has active project
2. Clear browser localStorage manually
3. Refresh page
4. ✓ No active project selected
5. ✓ Sidebar shows no active project
6. ✓ Menu items disabled
7. ✓ Can select new active project from dashboard

### Persistence: Page Refresh

1. User sets active project
2. Refresh page
3. ✓ Active project still selected
4. ✓ Sidebar shows correct project
5. ✓ Dashboard loads correct data
6. ✓ Menu items enabled

## Future Enhancements

### Per-Domain Active Projects

Allow one active project per domain:
- Work domain: Project A active
- Personal domain: Project B active
- Passion domain: Project C active

**Context Changes**:
```typescript
interface ActiveProjectContextType {
  activeProjects: Record<string, MasterProject>; // domainId -> project
  setActiveProjectForDomain: (domainId: string, project: MasterProject) => void;
  getActiveProjectForDomain: (domainId: string) => MasterProject | null;
}
```

### Quick Project Switcher in Sidebar

Add dropdown in sidebar for quick switching without going to dashboard:
- Shows list of active projects
- Click to switch
- Updates immediately
- Stays on current page (Roadmap switches to new project's roadmap)

### Recently Active Projects

Track and display recently active projects for quick switching:
- Store list in localStorage
- Show in sidebar dropdown
- Max 5 recent projects
- Ordered by last activation time

### Project Favorites

Allow marking projects as favorites:
- Star icon on project cards
- Favorites section at top of ProjectSwitcher
- Quick access to most important projects

### Project Search

For users with many projects:
- Search bar in ProjectSwitcher
- Filter by name, domain, status
- Fuzzy search support

## Troubleshooting

### Problem: Sidebar Shows No Active Project but localStorage Has Value

**Diagnosis**:
```javascript
// In browser console
localStorage.getItem('guardrails_active_project_id');
localStorage.getItem('guardrails_active_project');
```

**Possible Causes**:
1. Context not wrapping component tree
2. JSON parse error on stored project
3. Project ID exists but project object is null

**Solution**:
- Clear localStorage and reselect project
- Check browser console for errors
- Verify ActiveProjectProvider wraps app

### Problem: Menu Items Stay Disabled After Selecting Project

**Diagnosis**:
- Check React DevTools for ActiveProjectContext
- Verify `activeProject` is not null
- Check if GuardrailsLayout receives update

**Solution**:
- May be stale closure issue
- Try refresh
- Check that layout uses `useActiveProject()` hook

### Problem: Dashboard Doesn't Show "Set Active" Button

**Possible Causes**:
1. Project status is not 'active'
2. Project is already active
3. ProjectSwitcher not receiving correct props

**Solution**:
- Check project status in database
- Verify `activeProjectId` matches project.id
- Console log props to ProjectSwitcher

## Related Documentation

- [GUARDRAILS_PROJECT_WIZARD.md](./GUARDRAILS_PROJECT_WIZARD.md) - Project creation wizard
- [GUARDRAILS_WIZARD_FRONTEND.md](./GUARDRAILS_WIZARD_FRONTEND.md) - Wizard UI implementation
- [USER_TEMPLATES.md](./USER_TEMPLATES.md) - Track template system

## Support

For issues with project switching:

1. Check ActiveProjectContext in React DevTools
2. Verify localStorage values in browser console
3. Confirm project exists in database
4. Check sidebar display for active project
5. Review network tab for API errors
6. Try clearing localStorage and reselecting project
7. Check this documentation for expected behavior
