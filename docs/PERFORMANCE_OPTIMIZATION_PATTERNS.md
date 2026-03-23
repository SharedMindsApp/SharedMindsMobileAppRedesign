# Performance Optimization Patterns

## Overview

This document outlines the performance optimization patterns implemented across the app to improve initial load time, dashboard render speed, and screen-to-screen transitions, especially on mobile.

## Key Principles

1. **UI First, Data Second** - Never block layout render on data
2. **Progressive Hydration** - Show structure immediately, fill in content progressively
3. **Parallel Fetching** - Use Promise.all instead of sequential awaits
4. **Stale-While-Revalidate** - Show cached data immediately, update in background
5. **Defer Non-Critical** - Load AI, analytics, and enhancements after critical UI

## Patterns

### 1. Skeleton-First Rendering

**❌ Anti-Pattern:**
```tsx
if (loading) {
  return <Spinner />;
}
return <Content data={data} />;
```

**✅ Correct Pattern:**
```tsx
return (
  <PageShell>
    <Header />
    {loading ? <DashboardSkeleton /> : <DashboardContent data={data} />}
  </PageShell>
);
```

**Benefits:**
- User sees structure immediately (< 100ms)
- Perceived performance dramatically improved
- No blank screens

### 2. Parallel Data Fetching

**❌ Anti-Pattern (Waterfall):**
```tsx
const user = await getUser();
const household = await getHousehold(user.id);
const members = await getMembers(household.id);
```

**✅ Correct Pattern:**
```tsx
const [user, household, members] = await Promise.all([
  getUser(),
  getHousehold(user.id),
  getMembers(household.id),
]);
```

**Benefits:**
- 3x faster on slow networks
- All data loads simultaneously
- Better mobile experience

### 3. Critical vs Deferred Data

**Critical (Render Immediately):**
- Page shell
- Header/navigation
- Empty state placeholders
- Section titles
- Skeletons

**Deferred (Load After Render):**
- AI suggestions
- Analytics
- Meal stats
- Recipe popularity
- Favorites (can show empty state first)
- Pantry integration

**Implementation:**
```tsx
// Render shell immediately
useEffect(() => {
  DashboardMarks.start();
  loadCriticalData(); // Auth, basic structure
}, []);

// Defer non-critical data
useEffect(() => {
  startTransition(() => {
    loadDeferredData(); // AI, analytics, etc.
  });
}, []);
```

### 4. Caching with Stale-While-Revalidate

**Usage:**
```tsx
import { staleWhileRevalidate, CacheKeys } from '../lib/dataCache';

const data = await staleWhileRevalidate(
  CacheKeys.dashboard(userId),
  () => fetchDashboardData(),
  5 * 60 * 1000 // 5 minute TTL
);
```

**Benefits:**
- Instant back navigation
- Reduced network calls
- Better mobile experience

### 5. Performance Marks

**Usage:**
```tsx
import { DashboardMarks, timeAsync } from '../lib/performance';

// Mark lifecycle events
DashboardMarks.start();
DashboardMarks.shellVisible();
DashboardMarks.criticalDataLoaded();

// Time async operations
await timeAsync('dashboard:load', async () => {
  // ... async work
});
```

**Benefits:**
- Dev-only diagnostics
- Identify bottlenecks
- Track improvements

## Component-Specific Optimizations

### Dashboard

**Before:**
- Blocked entire render until all data loaded
- Sequential waterfall fetching
- Full-page spinner

**After:**
- Renders shell immediately with skeletons
- Parallel data fetching
- Progressive content loading

### Meal Planner

**Optimizations Needed:**
- Add skeleton states
- Defer pantry intelligence loading
- Cache meal plans
- Lazy load recipe details

## Validation Checklist

After optimizations, verify:

- [ ] Dashboard appears in <300ms on mobile
- [ ] Navigation never shows blank screen
- [ ] Skeletons appear immediately
- [ ] AI loads feel "progressive", not blocking
- [ ] No spinner-only screens
- [ ] Back navigation is instant
- [ ] Meal Planner scrolls and loads smoothly

## Performance Targets

- **First Contentful Paint:** < 300ms
- **Time to Interactive:** < 1.5s
- **Largest Contentful Paint:** < 1.2s
- **Cumulative Layout Shift:** < 0.1

## Future Optimizations

1. Route-level code splitting (lazy load routes)
2. Image lazy loading
3. Service worker caching
4. Prefetch critical routes
5. Virtual scrolling for long lists
