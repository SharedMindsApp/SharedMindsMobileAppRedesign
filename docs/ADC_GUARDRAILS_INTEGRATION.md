# Active Data Context Integration with Guardrails

## Overview

The Active Data Context (ADC) system has been successfully integrated into the Guardrails module, establishing it as the single source of truth for which project is currently active. This replaces the previous `ActiveProjectContext` implementation with a more robust, persistent state management solution.

## What Changed

### 1. New React Hook for ADC

**File:** `src/state/useActiveDataContext.ts`

Created a React hook that subscribes to ADC state changes and automatically triggers component re-renders when the active project or other tracked data changes.

```typescript
export function useActiveDataContext(): ADCState
```

This hook:
- Returns the current ADC state
- Automatically subscribes to all ADC events
- Cleans up subscriptions on unmount
- Triggers re-renders when state changes

### 2. Dashboard Integration

**Files Updated:**
- `src/components/guardrails/dashboard/GuardrailsDashboard.tsx`
- `src/components/guardrails/dashboard/ProjectsOverview.tsx`
- `src/components/guardrails/dashboard/ProjectCard.tsx`

**Changes:**
- Removed dependency on `ActiveProjectContext`
- Now reads `activeProjectId` from ADC using `useActiveDataContext()`
- Project selection now calls `setActiveProjectId(projectId, domainId)` which:
  - Updates ADC state
  - Automatically resets track, task, focus, offshoot, and side project contexts
  - Persists to localStorage
  - Triggers all subscribers

**Visual Indicator:**
- Active projects are highlighted with a blue border and shadow
- Shows "Selected" badge on the currently active project
- Other projects show "Select" button

### 3. Sidebar Active Project Display

**File:** `src/components/guardrails/GuardrailsLayout.tsx`

**Changes:**
- Removed dependency on `ActiveProjectContext`
- Now reads `activeProjectId` from ADC
- Fetches project details from database when `activeProjectId` changes
- Shows active project name in a clickable banner at the top of sidebar
- If no project is active (and not on dashboard), shows warning banner:
  - "No Active Project"
  - "Go to Dashboard to select one"
  - Clicking navigates to Dashboard

**Clickable Banner:**
- Clicking the active project banner navigates to Dashboard
- Allows users to quickly change projects

### 4. Route Protection

**New Component:** `src/components/guardrails/RequireActiveProjectADC.tsx`

A wrapper component that:
- Checks if `activeProjectId` exists in ADC
- Verifies the project still exists in the database
- Shows loading state while checking
- Redirects to Dashboard with helpful message if:
  - No project is selected
  - Selected project no longer exists (deleted)
- Otherwise renders children normally

**Protected Routes:**
All Guardrails pages that require an active project are now wrapped:
- `/guardrails/roadmap`
- `/guardrails/taskflow`
- `/guardrails/mindmesh`
- `/guardrails/side-projects`
- `/guardrails/side-projects/:id`
- `/guardrails/offshoots`
- `/guardrails/offshoots/:id`
- `/guardrails/sessions`
- `/guardrails/regulation`
- `/guardrails/focus` (all focus mode routes)
- `/guardrails/focus/live`
- `/guardrails/focus/summary/:sessionId`
- `/guardrails/focus/sessions`
- `/guardrails/focus/analytics`

**Not Protected:**
- `/guardrails/dashboard` - Where users select projects
- `/guardrails/wizard` - Project creation wizard
- `/guardrails/settings/archive` - Archive management

### 5. App.tsx Route Updates

**File:** `src/App.tsx`

All protected Guardrails routes now follow this pattern:

```tsx
<Route
  path="/guardrails/roadmap"
  element={
    <AuthGuard>
      <GuardrailsLayout>
        <RequireActiveProjectADC>
          <GuardrailsRoadmap />
        </RequireActiveProjectADC>
      </GuardrailsLayout>
    </AuthGuard>
  }
/>
```

## How It Works

### Project Selection Flow

1. **User selects project in Dashboard**
   - Clicks "Select" button on ProjectCard
   - Calls `setActiveProjectId(project.id, project.domain_id)`

2. **ADC updates**
   - Sets `activeProjectId` and `activeDomainId`
   - Resets all child contexts (tracks, tasks, focus, offshoots, side projects)
   - Persists to localStorage
   - Emits `projectChanged` event

3. **All subscribers react**
   - Dashboard highlights the selected project
   - Sidebar updates to show project name
   - All pages using `useActiveDataContext()` receive new state

4. **User navigates to Guardrails page**
   - `RequireActiveProjectADC` wrapper checks for active project
   - If present, renders the page
   - If absent, shows friendly message and redirects to Dashboard

### Persistence

The `activeProjectId` is persisted to localStorage through ADC's built-in persistence mechanism. This means:
- Active project survives page refreshes
- Active project survives browser restarts
- If persisted project no longer exists, user is prompted to select a new one

### Graceful Failure

If the stored `activeProjectId` references a deleted project:
1. `RequireActiveProjectADC` detects project doesn't exist
2. Shows message: "The selected project is no longer available. Please select another project."
3. Provides button to navigate to Dashboard
4. ADC state remains until user selects a new project

## Benefits

### 1. Single Source of Truth
- No more confusion about which project is active
- All components read from same source
- Guaranteed consistency across the app

### 2. Dashboard as Control Center
- Only place where active project can be changed
- Clear, predictable UX
- No hidden project switchers in subpages

### 3. Persistence
- Active project survives sessions
- Users don't need to re-select project every time
- Better UX for multi-session workflows

### 4. Automatic Context Cleanup
- Changing projects automatically resets child contexts
- Prevents stale data from previous project bleeding into new project
- Reduces bugs related to context mismatch

### 5. Type Safety
- All ADC interactions are fully typed
- TypeScript catches errors at compile time
- Better developer experience

### 6. Performance
- ADC uses efficient subscription model
- Only components that subscribe get re-renders
- No unnecessary renders across the app

## Developer Guide

### Reading Active Project ID

```typescript
import { useActiveDataContext } from '../../state/useActiveDataContext';

function MyComponent() {
  const { activeProjectId, activeDomainId } = useActiveDataContext();

  // activeProjectId will be string | null
  if (!activeProjectId) {
    // Handle case where no project is active
    return <div>No project selected</div>;
  }

  // Use activeProjectId to fetch project-specific data
  return <div>Project: {activeProjectId}</div>;
}
```

### Setting Active Project

```typescript
import { setActiveProjectId } from '../../state/activeDataContext';

function selectProject(project: MasterProject) {
  setActiveProjectId(project.id, project.domain_id);
  // That's it! All subscribers will be notified automatically
}
```

### Protecting a New Route

If you add a new Guardrails page that requires an active project:

1. Import the wrapper:
```typescript
import { RequireActiveProjectADC } from './components/guardrails/RequireActiveProjectADC';
```

2. Wrap your component in the route:
```tsx
<Route
  path="/guardrails/my-new-page"
  element={
    <AuthGuard>
      <GuardrailsLayout>
        <RequireActiveProjectADC>
          <MyNewPage />
        </RequireActiveProjectADC>
      </GuardrailsLayout>
    </AuthGuard>
  }
/>
```

### Clearing Active Project

```typescript
import { setActiveProjectId } from '../../state/activeDataContext';

// Clear active project (e.g., when user logs out)
setActiveProjectId(null, null);
```

### Subscribing to Project Changes

```typescript
import { useEffect } from 'react';
import { subscribeToADC } from '../../state/activeDataContext';

function MyComponent() {
  useEffect(() => {
    const unsubscribe = subscribeToADC('projectChanged', ({ projectId, domainId }) => {
      console.log('Active project changed:', projectId);
      // React to project change
    });

    return unsubscribe; // Cleanup on unmount
  }, []);
}
```

## Testing Checklist

- [x] Navigate to Dashboard
- [x] Select a project
- [x] Verify project is highlighted with blue border
- [x] Verify "Selected" badge appears on project card
- [x] Verify sidebar shows active project name
- [x] Navigate to Roadmap page
- [x] Verify page loads with active project data
- [x] Click sidebar active project banner
- [x] Verify navigation to Dashboard
- [x] Navigate to Roadmap without selecting a project
- [x] Verify redirect to Dashboard with friendly message
- [x] Refresh page while on Roadmap
- [x] Verify active project persists and page loads correctly
- [x] Select different project
- [x] Verify UI updates across all components
- [x] Navigate through multiple Guardrails pages
- [x] Verify all pages respect active project

## Files Changed

### Created
- `src/state/useActiveDataContext.ts` - React hook for ADC
- `src/components/guardrails/RequireActiveProjectADC.tsx` - Route protection wrapper
- `ADC_GUARDRAILS_INTEGRATION.md` - This documentation

### Modified
- `src/components/guardrails/dashboard/GuardrailsDashboard.tsx` - Use ADC instead of ActiveProjectContext
- `src/components/guardrails/dashboard/ProjectsOverview.tsx` - Pass activeProjectId to children
- `src/components/guardrails/dashboard/ProjectCard.tsx` - Use ADC for selection and highlighting
- `src/components/guardrails/GuardrailsLayout.tsx` - Show active project from ADC in sidebar
- `src/App.tsx` - Wrap protected routes with RequireActiveProjectADC

## Migration Notes

### Removed Dependencies
- `ActiveProjectContext` is no longer used in Guardrails
- Individual components no longer need to manage project selection state
- URL parameters for project IDs in Guardrails routes are now secondary to ADC

### Backward Compatibility
- Existing URL patterns still work
- Old routes redirect appropriately
- No database schema changes required

## Future Enhancements

Potential improvements for future iterations:

1. **Project Quick Switcher**
   - Keyboard shortcut to open project switcher modal
   - Search/filter projects
   - Switch without navigating to Dashboard

2. **Recent Projects**
   - Track recently accessed projects
   - Quick access to last 5 projects

3. **Project Breadcrumbs**
   - Show domain → project hierarchy in header
   - Clickable breadcrumbs for navigation

4. **Multi-Project Workflows**
   - Pin multiple projects for quick switching
   - Compare data across projects

5. **Project Context Warnings**
   - Alert user if they're about to leave active project
   - Confirm before switching contexts

## Troubleshooting

### Active project not showing in sidebar
- Check browser console for errors
- Verify `activeProjectId` in ADC state (use React DevTools)
- Verify project exists in database

### Page redirects to Dashboard unexpectedly
- Check if `activeProjectId` is set in ADC
- Verify project hasn't been deleted
- Check browser localStorage for persisted state

### Active project not persisting
- Check browser localStorage is enabled
- Verify ADC persistence configuration
- Check browser console for localStorage errors

### Multiple components showing different active projects
- This should never happen with ADC
- If it does, there's a bug in ADC implementation
- Check that all components use `useActiveDataContext()` hook
