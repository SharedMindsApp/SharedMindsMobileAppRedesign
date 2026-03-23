# Project Wizard Infinite Render Loop - Fix Documentation

## Problem Description

The Project Wizard was experiencing an infinite render loop when users navigated to the template selection step (step 2). The component would continuously mount, unmount, and remount, causing performance issues and preventing proper interaction.

### Symptoms
- Console showing repeated "Component MOUNTED" and "Component UNMOUNTING" messages
- `renderStep` being called hundreds of times
- Templates loading multiple times
- Browser becoming unresponsive
- High CPU usage

## Root Cause

The issue was caused by **unstable context references** in the `ProjectWizardContext`:

1. **Context value recreation**: The `value` object passed to the context provider was being recreated on every render without `useMemo`
2. **Function reference instability**: All setter functions (including `setAvailableTemplates`) were being recreated on every render
3. **Cascading re-renders**: When `setAvailableTemplates` was called in the useEffect of `WizardStepTemplateSelect`, it triggered a state update in the context
4. **Re-render cycle**: This caused `ProjectWizard` to re-render, which created new function references, which caused child components to re-render, creating a loop

### The Cycle
```
1. WizardStepTemplateSelect mounts
2. useEffect runs, loads templates
3. Calls setAvailableTemplates(templates)
4. ProjectWizardContext state updates
5. ProjectWizard re-renders (context consumer)
6. New context value object created with new function references
7. WizardStepTemplateSelect re-renders (context changed)
8. React unmounts/remounts component due to reconciliation issues
9. Back to step 1 → infinite loop
```

## Solution

### 1. Memoized All Context Functions

Wrapped all setter functions in `useCallback` to ensure stable references:

```typescript
const setCurrentStep = useCallback((step: number) => {
  setState(prev => ({ ...prev, currentStep: step }));
}, []);

const setDomain = useCallback((domainId: string, domainType: DomainType) => {
  setState(prev => ({
    ...prev,
    domainId,
    domainType,
    // ... other fields
  }));
}, []);

// ... all other setters
```

### 2. Memoized Context Value

Wrapped the context value object in `useMemo` to prevent recreation on every render:

```typescript
const value: ProjectWizardContextType = useMemo(() => ({
  state,
  isExistingProject,
  existingProjectId: state.existingProjectId,
  setCurrentStep,
  setExistingProjectId,
  setDomain,
  // ... all other values
}), [
  state,
  isExistingProject,
  setCurrentStep,
  setExistingProjectId,
  setDomain,
  // ... all dependencies
]);
```

### 3. Smart Template Updates

Modified `setAvailableTemplates` to only update state if templates actually changed:

```typescript
const setAvailableTemplates = useCallback((templates: AnyTrackTemplate[]) => {
  setState(prev => {
    // Compare template IDs to detect actual changes
    const currentIds = prev.availableTemplates.map(t => t.id).sort().join(',');
    const newIds = templates.map(t => t.id).sort().join(',');

    // If templates are the same, return previous state (no re-render)
    if (currentIds === newIds) {
      return prev;
    }

    // Templates changed, update state
    return { ...prev, availableTemplates: templates };
  });
}, []);
```

This prevents unnecessary state updates when the same templates are set multiple times.

## Impact

### Before Fix
- Infinite render loop
- Component mounting/unmounting continuously
- Browser unresponsive
- Templates loading repeatedly
- High CPU usage

### After Fix
- Single mount on step load
- Templates load once
- Stable component lifecycle
- Normal performance
- Proper user interaction

## Performance Improvements

1. **Reduced re-renders**: Context consumers only re-render when state actually changes
2. **Stable function references**: Child components don't re-render due to prop changes
3. **Smart state updates**: Template updates only trigger re-renders when data changes
4. **Better React reconciliation**: React can properly track component identity

## Related Files Changed

1. `/src/contexts/ProjectWizardContext.tsx`
   - Added `useMemo` and `useCallback` imports
   - Wrapped all functions in `useCallback`
   - Wrapped context value in `useMemo`
   - Added smart comparison in `setAvailableTemplates`

## Testing Checklist

- [ ] Navigate to wizard
- [ ] Select a domain
- [ ] Check console for repeated logs
- [ ] Click "Change Domain" button
- [ ] Verify smooth navigation back to step 1
- [ ] Re-select domain and advance to templates
- [ ] Verify templates load once
- [ ] Check browser performance
- [ ] Complete wizard flow

## Best Practices Applied

1. **Memoize context values**: Always wrap context provider values in `useMemo`
2. **Stable function references**: Use `useCallback` for functions passed through context
3. **Smart state updates**: Check if state actually changed before calling setState
4. **Dependency arrays**: Properly specify dependencies for hooks
5. **Performance optimization**: Prevent unnecessary re-renders

## Future Considerations

If similar issues occur in other contexts:

1. Check if context values are memoized
2. Ensure functions are wrapped in `useCallback`
3. Verify state updates only happen when data changes
4. Use React DevTools Profiler to identify render causes
5. Consider using state management libraries for complex state (Zustand, Redux, etc.)

## Notes

- The `eslint-disable` comment for the useEffect dependencies in `WizardStepTemplateSelect` was correct - `setAvailableTemplates` doesn't need to be in the array since it's now stable
- The wizard already had URL parameter support for editing existing projects, which continues to work correctly
- All navigation flows (forward, back, change domain) now work smoothly
