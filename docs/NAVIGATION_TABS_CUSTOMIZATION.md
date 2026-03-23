# Navigation Tabs Customization

## Overview

The main navigation header now supports user customization, allowing users to choose which tabs appear in the top navigation bar. This reduces cognitive load while maintaining access to all features through a "More" dropdown menu.

## Key Features

### 1. Favourite Navigation Tabs

Users can select up to **8 favourite tabs** to display in the main navigation bar:
- **Minimum**: 1 tab (cannot remove last favourite)
- **Maximum**: 8 tabs
- **Default favourites**: Dashboard, Spaces, Planner, Guardrails, Regulation

### 2. More Dropdown

Tabs not marked as favourites appear in a "More" dropdown menu:
- Automatically populated with non-favourite tabs
- Shows active state (blue highlight)
- Includes all available tabs
- Automatically hides if all tabs are favourited

### 3. Settings Interface

New "Navigation Tabs" section in UI Preferences Settings:
- Live counter showing X / 8 tabs used
- Two sections:
  - **Favourited Tabs**: Shows current favourites with reordering controls
  - **Available Tabs**: Shows non-favourited tabs that can be added
- Drag-free reordering with up/down buttons
- Star icon to toggle favourite status
- Clear visual distinction (sky blue for favourited, gray for available)

### 4. Smart Filtering

The system automatically filters tabs based on user permissions:
- **Admin tab**: Only visible to users with admin role
- **Spaces tab**: Special dropdown with Personal/Shared submenu
- All other tabs: Always visible

## User Experience

### For New Users
- Start with 5 sensible defaults (Dashboard, Spaces, Planner, Guardrails, Regulation)
- Can customize immediately via Settings
- Clear counter shows remaining capacity
- No learning curve - star icons are intuitive

### For Existing Users
- Seamless transition with default favourites
- No disruption to workflow
- All tabs remain accessible (either in nav or More dropdown)
- Settings clearly explain limits with helpful tooltips

### Visual Feedback

**Maximum Reached (8 tabs)**
- Warning banner: "You have reached the maximum of 8 favourite tabs. Remove a tab to add another."
- Star buttons on available tabs become disabled with tooltip

**Minimum Enforced (1 tab)**
- Cannot remove last favourite tab
- Remove button disabled with tooltip: "Must have at least 1 favourite tab"

**Reordering Controls**
- Up button disabled on first item (tooltip: "Already at top")
- Down button disabled on last item (tooltip: "Already at bottom")

## Data Model

### Storage Location
```typescript
config.favouriteNavTabs?: NavigationTabId[]
```

Stored in: `user_ui_preferences.custom_overrides.favouriteNavTabs`

### Type Definitions
```typescript
export type NavigationTabId =
  | 'dashboard'
  | 'spaces'
  | 'planner'
  | 'guardrails'
  | 'regulation'
  | 'messages'
  | 'report'
  | 'admin';

export interface NavigationTab {
  id: NavigationTabId;
  label: string;
  path: string;
  icon: string;
  requiresAdmin?: boolean;
}

export const DEFAULT_FAVOURITE_NAV_TABS: NavigationTabId[] = [
  'dashboard',
  'spaces',
  'planner',
  'guardrails',
  'regulation',
];
```

### Tab Definitions
```typescript
export const ALL_NAVIGATION_TABS: NavigationTab[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'Home' },
  { id: 'spaces', label: 'Spaces', path: '/spaces', icon: 'Users' },
  { id: 'planner', label: 'Planner', path: '/planner', icon: 'Calendar' },
  { id: 'guardrails', label: 'Guardrails', path: '/guardrails', icon: 'Target' },
  { id: 'regulation', label: 'Regulation', path: '/regulation', icon: 'Zap' },
  { id: 'messages', label: 'Messages', path: '/messages', icon: 'MessageCircle' },
  { id: 'report', label: 'Report', path: '/report', icon: 'FileText' },
  { id: 'admin', label: 'Admin', path: '/admin', icon: 'Shield', requiresAdmin: true },
];
```

## Technical Implementation

### Files Modified

1. **src/lib/uiPreferencesTypes.ts**
   - Added `NavigationTabId` type
   - Added `NavigationTab` interface
   - Added `ALL_NAVIGATION_TABS` constant
   - Added `DEFAULT_FAVOURITE_NAV_TABS` constant
   - Updated `UIPreferencesConfig` with `favouriteNavTabs` field

2. **src/components/Layout.tsx**
   - Added `ICON_MAP` for dynamic icon rendering
   - Added `showMoreMenu` state
   - Added logic to filter tabs by favourites
   - Added `renderNavTab()` function for dynamic tab rendering
   - Added `isTabActive()` function for active state detection
   - Replaced hardcoded navigation tabs with dynamic rendering
   - Added "More" dropdown for non-favourite tabs

3. **src/components/UIPreferencesSettings.tsx**
   - Added `NAV_ICON_MAP` for icon rendering
   - Added `useAuth` hook for admin detection
   - Added favourite navigation tabs state management
   - Added `toggleNavFavourite()` function
   - Added `moveNavFavourite()` function
   - Added new "Navigation Tabs" settings section with:
     - Live counter
     - Favourited tabs list with reordering
     - Available tabs list with add buttons
     - Warning banner when max reached
     - Tooltips for disabled actions

### Key Functions

**Layout.tsx**

```typescript
const favouriteNavTabs = config.favouriteNavTabs || DEFAULT_FAVOURITE_NAV_TABS;

const availableTabs = ALL_NAVIGATION_TABS.filter((tab) => {
  if (tab.requiresAdmin && !isAdmin) return false;
  return true;
});

const favouriteTabs = availableTabs.filter((tab) =>
  favouriteNavTabs.includes(tab.id)
);

const moreTabs = availableTabs.filter((tab) =>
  !favouriteNavTabs.includes(tab.id)
);
```

**UIPreferencesSettings.tsx**

```typescript
const toggleNavFavourite = async (tabId: NavigationTabId) => {
  const isFavourited = favouriteNavTabs.includes(tabId);

  if (isFavourited) {
    if (favouriteNavTabs.length === 1) return; // Min 1
    const newFavourites = favouriteNavTabs.filter((id) => id !== tabId);
    await handleUpdate({ favouriteNavTabs: newFavourites });
  } else {
    if (favouriteNavTabs.length >= 8) return; // Max 8
    const newFavourites = [...favouriteNavTabs, tabId];
    await handleUpdate({ favouriteNavTabs: newFavourites });
  }
};

const moveNavFavourite = async (tabId: NavigationTabId, direction: 'up' | 'down') => {
  const currentIndex = favouriteNavTabs.indexOf(tabId);
  if (currentIndex === -1) return;

  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= favouriteNavTabs.length) return;

  const newFavourites = [...favouriteNavTabs];
  [newFavourites[currentIndex], newFavourites[newIndex]] = [
    newFavourites[newIndex],
    newFavourites[currentIndex],
  ];

  await handleUpdate({ favouriteNavTabs: newFavourites });
};
```

## Backwards Compatibility

Users without `favouriteNavTabs` in their preferences:
- Automatically receive default favourites
- No migration required
- Graceful fallback in both Layout and Settings
- No disruption to existing workflows

**Fallback Logic:**
```typescript
const favouriteNavTabs = config.favouriteNavTabs || DEFAULT_FAVOURITE_NAV_TABS;
```

## UI/UX Design Decisions

### Why 8 tabs maximum?
- Prevents navigation bar from becoming cluttered
- Forces intentional curation of most-used features
- Maintains clean, modern aesthetic
- All other tabs remain accessible via More dropdown

### Why 1 tab minimum?
- Ensures users always have quick access to at least one section
- Prevents accidental removal of all navigation
- Maintains usability baseline

### Why up/down buttons instead of drag-and-drop?
- More accessible (keyboard navigation, screen readers)
- Works better on mobile devices
- Clearer interaction model
- Consistent with Planner favourites pattern

### Why star icons?
- Universal symbol for favourites
- Clear visual metaphor
- Filled star = favourited
- Outline star = available

## Settings Location

Navigation to settings:
1. Click "Settings" in top navigation
2. Select "UI Preferences" (default view)
3. Scroll to "Navigation Tabs" section
4. Manage favourites directly

## Mobile Behavior

Mobile drawer navigation (< md breakpoint):
- Shows all tabs in vertical list
- No "More" dropdown needed (all tabs visible)
- Favourites system applies to desktop only
- Mobile users see complete tab list always

## Success Criteria

All success criteria met:

✅ Users can customize which tabs appear in navigation
✅ Maximum of 8 favourite tabs enforced
✅ Minimum of 1 favourite tab enforced
✅ Non-favourite tabs accessible via More dropdown
✅ Settings UI allows adding, removing, and reordering
✅ Clear visual feedback for all actions
✅ Tooltips explain disabled actions
✅ Warning banner when maximum reached
✅ Backwards compatibility maintained
✅ Build passes with no errors
✅ Mobile navigation unaffected
✅ Admin tab filtering works correctly
✅ Spaces dropdown functionality preserved

## Design Philosophy

> "Show me what I use most — not everything that exists."

This change:
- **Reduces cognitive load** without removing power
- **Allows personalization** without complexity
- **Maintains access** to all features through multiple paths
- **Follows user-controlled** (not algorithmic) customization
- **Respects user choice** with clear limits and feedback

## What Was NOT Done

❌ No auto-hiding based on usage patterns
❌ No "recent tabs" feature
❌ No AI suggestions
❌ No removal of any sections
❌ No changes to mobile drawer
❌ No new data tables or models
❌ No analytics or tracking

This is purely a presentation layer change that reorganizes existing functionality for better UX.

## Future Enhancements

Potential future additions (not implemented):
- Drag-and-drop reordering (accessibility permitting)
- Quick access keyboard shortcuts for favourite tabs
- Import/export favourite configurations
- Preset favourite configurations (e.g., "Developer", "Manager", "Personal")
- Tab groups or separators

These would maintain the clean, intentional design while adding power user features.

## Relationship to Planner Favourites

This feature mirrors the existing Planner favourites system:
- Same max limit logic (8 items)
- Same min limit logic (1 item)
- Same up/down reordering pattern
- Same star icon metaphor
- Same warning banner pattern
- Same settings integration

Users familiar with Planner favourites will instantly understand navigation favourites.

## Testing Checklist

Manual testing completed:
- ✅ Add tabs to favourites
- ✅ Remove tabs from favourites
- ✅ Reorder favourites (up/down)
- ✅ Maximum limit enforcement (8 tabs)
- ✅ Minimum limit enforcement (1 tab)
- ✅ More dropdown appears when needed
- ✅ More dropdown hides when all tabs favourited
- ✅ Active state highlighting in nav
- ✅ Active state highlighting in More dropdown
- ✅ Spaces dropdown still works in nav
- ✅ Admin tab filtering works
- ✅ Defaults applied to new/existing users
- ✅ Settings save and persist
- ✅ Mobile drawer unchanged
- ✅ Build passes successfully

## Summary

The navigation tabs customization feature provides users with a clean, personalized navigation experience while maintaining access to all features. It follows established patterns from the Planner favourites system and integrates seamlessly into the existing UI preferences architecture.

Users can now focus on their most-used sections while keeping their navigation bar clean and uncluttered. The More dropdown ensures no functionality is lost, and the settings interface makes customization simple and intuitive.

This is a purely UI/UX enhancement with no impact on data models, permissions, or existing workflows.
