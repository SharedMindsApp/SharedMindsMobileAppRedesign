# Multi-Context Widget Architecture

## Overview

This document describes the standardized architecture for widgets that support multiple space contexts (Personal, Household, Team). This pattern ensures data isolation, prevents cross-space leakage, and provides a consistent UX across all context-aware widgets.

## Core Principles

### 1. Space Context as First-Class Concept
- **Never assume a default household context**
- All data operations must be explicitly scoped to a space
- Context must be explicit at the service layer
- No hidden global state or implicit context

### 2. No Cross-Space Data Leakage
- Each widget maintains strict isolation between spaces
- Data loaded for one space never affects another
- Context switches trigger complete data reloads
- No cached data persists across context changes

### 3. Predictable Behavior
- Context switching is instantaneous and calm
- No warnings or confirmations
- No auto-moving data between spaces
- User always knows which space they're working in

## Architecture Components

### useSpaceContext Hook

**Location:** `src/hooks/useSpaceContext.ts`

**Purpose:** Centralizes all space context logic for widgets.

**API:**
```typescript
const {
  currentSpaceId,      // Current active space ID
  currentSpaceType,    // 'personal' | 'household' | 'team' | null
  availableSpaces,     // Array of all accessible spaces
  setCurrentSpace,     // Function to switch contexts
  isLoading,           // Loading state for spaces
  error,               // Error state
  getAbortSignal,      // AbortSignal for canceling requests
  isSwitching,         // Check if currently switching contexts
} = useSpaceContext(initialSpaceId);
```

**Features:**
- Loads Personal, Household, and Team spaces
- Persists last-used space in sessionStorage
- Provides abort signals for request cancellation
- Tracks switching state to prevent race conditions

**Usage:**
```typescript
// In widget component
const { currentSpaceId, setCurrentSpace, getAbortSignal, isSwitching } = useSpaceContext(householdId);

// Use currentSpaceId for all data operations
const items = await loadPantryItems(currentSpaceId);
```

### WidgetHeader Component

**Location:** `src/components/shared/WidgetHeader.tsx`

**Purpose:** Standardized header layout for context-aware widgets.

**Props:**
- `icon`: ReactNode - Widget icon
- `title`: string - Widget title
- `subtitle`: string (optional) - Widget subtitle/metadata
- `actions`: ReactNode (optional) - Action buttons
- `currentSpaceId`: string (optional) - Current space ID
- `onSpaceChange`: (spaceId: string) => void (optional) - Space change handler
- `availableSpaces`: SpaceOption[] (optional) - Available spaces for switcher
- `showSpaceSwitcher`: boolean (optional) - Show/hide switcher
- `className`: string (optional) - Additional CSS classes

**Usage:**
```typescript
<WidgetHeader
  icon={<Package size={24} />}
  title="Pantry"
  subtitle={`${items.length} items`}
  currentSpaceId={currentSpaceId}
  onSpaceChange={setCurrentSpace}
  availableSpaces={availableSpaces}
  showSpaceSwitcher={availableSpaces.length > 1}
  actions={<button>Add</button>}
/>
```

### SpaceContextSwitcher Component

**Location:** `src/components/shared/SpaceContextSwitcher.tsx`

**Purpose:** Dropdown UI for switching between spaces.

**Features:**
- Shows current space with icon and type
- Dropdown menu with all available spaces
- Hidden on small screens (mobile-responsive)
- Auto-hides if only one space available

## Widget Implementation Pattern

### Step 1: Import Required Dependencies

```typescript
import { useSpaceContext } from '../../../hooks/useSpaceContext';
import { WidgetHeader } from '../../shared/WidgetHeader';
import { SpaceContextSwitcher } from '../../shared/SpaceContextSwitcher';
```

### Step 2: Use Hook in Widget

```typescript
export function MyWidget({ householdId, viewMode }: MyWidgetProps) {
  // Use centralized space context hook
  const {
    currentSpaceId,
    availableSpaces,
    setCurrentSpace,
    isLoading: spacesLoading,
    getAbortSignal,
    isSwitching,
  } = useSpaceContext(householdId);

  // Track context to prevent stale updates
  const contextSpaceIdRef = useRef(currentSpaceId);
  
  useEffect(() => {
    contextSpaceIdRef.current = currentSpaceId;
  }, [currentSpaceId]);
  
  // Rest of widget logic...
}
```

### Step 3: Implement Safe Data Loading

```typescript
const loadData = async () => {
  const expectedSpaceId = contextSpaceIdRef.current;
  const abortSignal = getAbortSignal();
  
  try {
    const data = await fetchData(currentSpaceId);
    
    // Verify we're still in the same context
    if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
      return; // Context changed, discard results
    }
    
    setData(data);
  } catch (error: any) {
    // Ignore aborted requests
    if (error.name === 'AbortError' || abortSignal?.aborted) {
      return;
    }
    // Handle other errors...
  }
};

useEffect(() => {
  if (!isSwitching()) {
    loadData();
  }
  
  // Cleanup: reset state when context changes
  return () => {
    setData([]);
  };
}, [currentSpaceId]);
```

### Step 4: Use WidgetHeader

```typescript
return (
  <div>
    <WidgetHeader
      icon={<MyIcon />}
      title="My Widget"
      subtitle={`${items.length} items`}
      currentSpaceId={currentSpaceId}
      onSpaceChange={setCurrentSpace}
      availableSpaces={availableSpaces}
      showSpaceSwitcher={availableSpaces.length > 1 && !spacesLoading}
      actions={<button>Action</button>}
    />
    {/* Widget content */}
  </div>
);
```

## Service Layer Requirements

### Explicit spaceId Parameter

**Required:** All service functions must accept `spaceId` as an explicit parameter.

**✅ Good:**
```typescript
async function loadPantryItems(spaceId: string): Promise<PantryItem[]> {
  // Implementation
}

async function addPantryItem(params: {
  householdId: string; // Explicit, required
  foodItemId: string;
  // ...
}): Promise<PantryItem> {
  // Implementation
}
```

**❌ Bad:**
```typescript
// Don't use global state or context
async function loadPantryItems(): Promise<PantryItem[]> {
  const householdId = getCurrentHousehold(); // ❌ Hidden dependency
}

// Don't make spaceId optional with fallback
async function loadPantryItems(spaceId?: string): Promise<PantryItem[]> {
  const id = spaceId || getDefaultHousehold(); // ❌ Implicit default
}
```

### Type Safety

Type signatures should make it impossible to call functions without context:

```typescript
// ✅ Required parameter - TypeScript will error if omitted
function loadData(spaceId: string): Promise<Data[]>;

// ❌ Optional parameter - allows calls without context
function loadData(spaceId?: string): Promise<Data[]>;
```

## Safety Mechanisms

### 1. Request Cancellation

When context switches, cancel in-flight requests:

```typescript
const loadData = async () => {
  const abortSignal = getAbortSignal();
  const expectedSpaceId = contextSpaceIdRef.current;
  
  try {
    const data = await fetchData(currentSpaceId, { signal: abortSignal });
    // Verify context hasn't changed...
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return; // Ignore canceled requests
    }
    // Handle other errors...
  }
};
```

### 2. State Reset on Context Change

Reset UI state when context switches:

```typescript
useEffect(() => {
  // Load data for new context
  loadData();
  
  // Reset edit states
  setEditingItem(null);
  setShowModal(false);
  setSelectedItems(new Set());
  
  return () => {
    // Cleanup: clear data for old context
    setData([]);
  };
}, [currentSpaceId]);
```

### 3. Context Verification

Always verify context hasn't changed before updating state:

```typescript
const expectedSpaceId = contextSpaceIdRef.current;
const data = await fetchData(currentSpaceId);

// Verify still in same context
if (contextSpaceIdRef.current !== expectedSpaceId) {
  return; // Context changed, discard results
}

setData(data); // Safe to update
```

## Widgets Supporting Multi-Context

### PantryWidget
- ✅ Uses `useSpaceContext`
- ✅ Uses `WidgetHeader`
- ✅ All operations scoped to `currentSpaceId`
- ✅ Safe request cancellation
- ✅ State reset on context change

### GroceryListWidget
- ✅ Uses `useSpaceContext`
- ✅ Uses `WidgetHeader`
- ✅ All operations scoped to `currentSpaceId`
- ✅ Safe request cancellation
- ✅ State reset on context change

### MealPlannerWidget
- ✅ Uses `useSpaceContext`
- ✅ Space switcher in header
- ✅ All operations scoped to `currentSpaceId`:
  - Meal plans
  - Meal library
  - Recipe ingredients
  - Pantry intelligence
  - Grocery suggestions

## Meal Planner Specific Considerations

The Meal Planner is more complex because it:
1. **Reads from multiple sources:**
   - Meal plans (space-scoped)
   - Meal library (shared, but favourites are space-scoped)
   - Recipe links (space-scoped)
   - Pantry intelligence (space-scoped)

2. **Writes to multiple destinations:**
   - Meal plans
   - Custom meals
   - Recipe links
   - Grocery list (via intelligence)

3. **Intelligence features:**
   - Compares recipes against pantry (space-scoped)
   - Suggests recipes based on pantry (space-scoped)
   - Adds missing ingredients to grocery list (space-scoped)

**All intelligence operations must respect space context.**

## Common Mistakes to Avoid

### ❌ Mistake 1: Using householdId prop directly

```typescript
// ❌ Bad: Using prop directly
useEffect(() => {
  loadData(householdId);
}, [householdId]);

// ✅ Good: Using currentSpaceId from hook
useEffect(() => {
  if (!isSwitching()) {
    loadData(currentSpaceId);
  }
}, [currentSpaceId]);
```

### ❌ Mistake 2: Not verifying context before state updates

```typescript
// ❌ Bad: No verification
const data = await fetchData(currentSpaceId);
setData(data); // May be stale if context changed

// ✅ Good: Verify context
const expectedSpaceId = contextSpaceIdRef.current;
const data = await fetchData(currentSpaceId);
if (contextSpaceIdRef.current === expectedSpaceId) {
  setData(data); // Safe to update
}
```

### ❌ Mistake 3: Not canceling requests

```typescript
// ❌ Bad: No cancellation
useEffect(() => {
  fetchData(currentSpaceId).then(setData);
}, [currentSpaceId]);

// ✅ Good: Cancel previous requests
useEffect(() => {
  const abortSignal = getAbortSignal();
  fetchData(currentSpaceId, { signal: abortSignal })
    .then(data => {
      if (!abortSignal.aborted) {
        setData(data);
      }
    });
}, [currentSpaceId]);
```

### ❌ Mistake 4: Not resetting UI state on context change

```typescript
// ❌ Bad: Edit states persist across contexts
const [editingItem, setEditingItem] = useState(null);

// ✅ Good: Reset on context change
useEffect(() => {
  setEditingItem(null);
  setShowModal(false);
  // ... other state resets
}, [currentSpaceId]);
```

### ❌ Mistake 5: Using implicit default space

```typescript
// ❌ Bad: Implicit default
async function loadData(spaceId?: string) {
  const id = spaceId || getDefaultHousehold();
  // ...
}

// ✅ Good: Explicit required parameter
async function loadData(spaceId: string) {
  // spaceId is required, no defaults
}
```

## Testing Considerations

When testing multi-context widgets:

1. **Test context switching:**
   - Switch from Personal to Household
   - Switch from Household to Team
   - Verify data reloads correctly
   - Verify no cross-space data leakage

2. **Test request cancellation:**
   - Start loading data
   - Switch context mid-load
   - Verify old request is canceled
   - Verify only new context's data loads

3. **Test state reset:**
   - Open edit modal in one context
   - Switch context
   - Verify modal closes and edit state resets

4. **Test service layer:**
   - Verify all functions require explicit spaceId
   - Verify no functions use global state
   - Verify type safety prevents invalid calls

## Future Widgets

When creating a new widget that needs multi-context support:

1. **Use the hook:**
   ```typescript
   const { currentSpaceId, setCurrentSpace, ... } = useSpaceContext(householdId);
   ```

2. **Use the header:**
   ```typescript
   <WidgetHeader ... showSpaceSwitcher={availableSpaces.length > 1} />
   ```

3. **Scope all operations:**
   - All data loads use `currentSpaceId`
   - All mutations use `currentSpaceId`
   - All intelligence uses `currentSpaceId`

4. **Implement safety mechanisms:**
   - Cancel requests on context switch
   - Reset UI state on context switch
   - Verify context before state updates

## ADHD-First UX Principles

### No Pressure
- No warnings when switching spaces
- No confirmations required
- No "you're in the wrong place" messaging

### Calm and Predictable
- Context switching is instant
- Clear visual indication of current space
- No unexpected behavior

### Reversible
- Can switch back and forth freely
- Data is always preserved
- No data loss on context switch

### Optional
- Space switcher only shows when multiple spaces available
- Single-space users see no switcher
- No forced context awareness

## Acceptance Criteria Checklist

For any widget implementing multi-context:

- [ ] Uses `useSpaceContext` hook
- [ ] Uses `WidgetHeader` component
- [ ] All data operations use `currentSpaceId`
- [ ] Implements request cancellation
- [ ] Resets UI state on context change
- [ ] Verifies context before state updates
- [ ] Service functions require explicit `spaceId`
- [ ] No global state or implicit context
- [ ] Handles loading states gracefully
- [ ] Mobile-responsive (switcher hidden on small screens)
- [ ] No warnings or confirmations on context switch
- [ ] ADHD-first UX principles maintained
