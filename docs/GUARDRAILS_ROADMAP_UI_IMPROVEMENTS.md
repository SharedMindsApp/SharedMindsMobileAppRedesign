# Guardrails Roadmap UI Improvements

## Executive Summary

This document outlines a comprehensive UI improvement plan for the Guardrails Roadmap view. The primary goals are to:
1. Improve mobile responsiveness (move away from Gantt chart on mobile)
2. Simplify navigation by removing redundant header tabs
3. Add bottom navigation buttons (similar to Calendar UI pattern)
4. Enhance collapsible tracks/subtracks handling
5. Better support for complex project management

---

## 1. Current State Analysis

### 1.1 Existing Components

**Desktop View (`InfiniteRoadmapView.tsx`):**
- Gantt-style timeline with horizontal scrolling
- Tracks displayed as rows with collapsible hierarchy
- Sidebar showing track names (300px width)
- Timeline columns for dates (day/week/month zoom levels)
- Roadmap items rendered as colored bars on timeline
- Collapse/expand functionality for tracks with children

**Mobile View (`RoadmapMobileTimeline.tsx`):**
- Vertical timeline (no horizontal scrolling)
- Grouped by period (month/quarter)
- Track filter tabs at top
- Item cards with swipe actions
- Bottom sheet for item details

**Navigation (`ProjectHeaderTabs.tsx`):**
- Redundant navigation bar with: Roadmap, Nodes, Task Flow, Reality Check
- Share Project button in header
- Settings button in header

### 1.2 Current Issues

1. **Redundant Navigation**: The header tabs (Roadmap, Nodes, Task Flow, Reality Check) are redundant since users navigate to these views via other means
2. **Mobile Gantt Limitations**: Gantt chart doesn't work well on mobile (horizontal scrolling is awkward)
3. **Collapsible Hierarchy**: Current implementation handles tracks/subtracks but could be more intuitive
4. **Action Button Placement**: Share Project and other actions are in header, taking up valuable space
5. **No Bottom Navigation**: Unlike Calendar UI, Roadmap lacks bottom navigation for quick access to settings/actions

---

## 2. UI Improvement Plan

### 2.1 Remove Redundant Navigation Bar

**Action**: Remove the navigation tabs from `ProjectHeaderTabs.tsx` when on Roadmap view.

**Rationale**:
- Users access Roadmap, Nodes, Task Flow, and Reality Check via dashboard or direct navigation
- The tabs take up vertical space unnecessarily
- Simplifies the header to focus on project information

**Implementation**:
- Modify `ProjectHeaderTabs.tsx` to conditionally hide tabs on Roadmap view
- Keep project name, description, and permission indicator
- Remove the `<nav>` section with tabs

### 2.2 Add Bottom Navigation Buttons

**Action**: Implement `CollapsibleMobileNav` component (same pattern as Calendar UI) with two buttons:
- **Left Button**: "Settings" (gear icon) - Opens settings/actions menu
- **Right Button**: "Share" (share icon) - Opens sharing drawer

**Rationale**:
- Consistent with Calendar UI pattern
- Frees up header space
- Better mobile UX (bottom buttons are easier to reach)
- Collapsible to maximize content space

**Menu Contents**:

**Settings Button Menu**:
- View Options (Zoom level, Show/Hide side projects)
- Filter Options (Track filter, Status filter)
- Display Preferences (Compact/Detailed view)
- Export Options (Export roadmap, Print)
- Project Settings (link to project settings drawer)

**Share Button Menu**:
- Share Project (opens sharing drawer)
- Copy Link
- Export as Image
- Generate Report

**Implementation**:
- Use existing `CollapsibleMobileNav` component from `src/components/shared/CollapsibleMobileNav.tsx`
- Create `RoadmapSettingsSheet.tsx` (similar to `CalendarSettingsSheet.tsx`)
- Create `RoadmapShareSheet.tsx` for sharing options
- Integrate with existing sharing drawer system

### 2.3 Enhanced Collapsible Tracks/Subtracks

**Current Behavior**:
- Tracks with children show chevron icon
- Clicking chevron toggles collapse state
- Collapsed tracks hide their children and items

**Improvements**:

1. **Visual Hierarchy**:
   - Increase indentation for subtracks (currently 20px per level)
   - Add subtle background color for nested tracks
   - Show depth indicator (e.g., "Track > Subtrack > Sub-subtrack")

2. **Collapse States**:
   - **Fully Expanded**: Show all tracks, subtracks, and items
   - **Partially Collapsed**: Show track name but hide subtracks (show item count)
   - **Fully Collapsed**: Hide track entirely (show collapsed indicator)

3. **Bulk Actions**:
   - "Expand All" / "Collapse All" button in header
   - "Expand to Level" dropdown (e.g., "Expand to Tracks only", "Expand to Subtracks")

4. **Smart Defaults**:
   - Auto-expand tracks with items due soon
   - Remember user's collapse preferences per project
   - Auto-collapse tracks with no items

5. **Visual Feedback**:
   - Animate collapse/expand transitions
   - Show item count badge on collapsed tracks
   - Highlight active track (track with selected item)

**Implementation**:
- Enhance `InfiniteRoadmapView.tsx` collapse logic
- Add collapse state persistence (localStorage or user preferences)
- Add animation classes for smooth transitions
- Add bulk action buttons in header

### 2.4 Mobile-First Timeline Improvements

**Current Mobile View**:
- Vertical timeline with grouped items
- Track filter tabs
- Item cards with swipe actions

**Improvements**:

1. **Track Hierarchy in Mobile**:
   - Collapsible track sections (similar to desktop)
   - Show track > subtrack hierarchy in item cards
   - Filter by track/subtrack with nested options

2. **Better Grouping**:
   - Group by track first, then by period
   - Or group by period first, then by track (user preference)
   - Show track color indicator in item cards

3. **Quick Actions**:
   - Swipe left to complete item
   - Swipe right to edit item
   - Long-press for more options

4. **Sticky Headers**:
   - Sticky track headers when scrolling
   - Sticky "Today" indicator
   - Quick jump to today button

**Implementation**:
- Enhance `RoadmapMobileTimeline.tsx`
- Add collapsible track sections
- Improve grouping logic
- Add swipe gesture handlers

### 2.5 Desktop Timeline Enhancements

**Improvements**:

1. **Better Track Rendering**:
   - Show track color as left border (full height)
   - Add hover effects on tracks
   - Show item count badge on track name
   - Add "Add Item" button on hover (currently only on group hover)

2. **Timeline Improvements**:
   - Show weekend indicators (subtle background)
   - Show milestone markers
   - Show dependency lines (future enhancement)
   - Better today indicator (thicker line, pulsing animation)

3. **Zoom Controls**:
   - Add zoom slider (fine-grained control)
   - Keyboard shortcuts (Ctrl/Cmd + Plus/Minus)
   - Zoom to fit all items button

4. **Item Rendering**:
   - Show item status icon (checkmark, clock, etc.)
   - Show item progress bar (for in-progress items)
   - Show item dependencies (visual lines)
   - Better tooltip on hover (show full details)

**Implementation**:
- Enhance `InfiniteRoadmapView.tsx`
- Add new utility functions for rendering
- Improve item rendering logic
- Add keyboard shortcuts

---

## 3. Implementation Details

### 3.1 Component Structure

```
RoadmapPage.tsx
├── ProjectHeaderTabs.tsx (simplified, no tabs)
├── InfiniteRoadmapView.tsx (desktop)
│   ├── RoadmapHeader.tsx (new - zoom, filters, bulk actions)
│   ├── RoadmapTimeline.tsx (new - extracted timeline logic)
│   └── RoadmapItemBar.tsx (new - extracted item rendering)
├── RoadmapMobileTimeline.tsx (mobile)
│   ├── RoadmapMobileHeader.tsx (new - track filter, view options)
│   └── RoadmapItemCard.tsx (enhanced)
├── RoadmapSettingsSheet.tsx (new)
├── RoadmapShareSheet.tsx (new)
└── CollapsibleMobileNav.tsx (reused from shared)
```

### 3.2 New Components

#### `RoadmapSettingsSheet.tsx`
- View Options section (zoom level, show side projects)
- Filter Options section (track filter, status filter)
- Display Preferences section (compact/detailed, show/hide columns)
- Export Options section (export roadmap, print)
- Project Settings link

#### `RoadmapShareSheet.tsx`
- Share Project button (opens existing sharing drawer)
- Copy Link button
- Export as Image button
- Generate Report button

#### `RoadmapHeader.tsx` (Desktop)
- Zoom controls (zoom in/out, zoom slider, fit to view)
- Track filter dropdown
- Status filter chips
- Bulk actions (expand all/collapse all, expand to level)
- View options (show side projects toggle)

#### `RoadmapMobileHeader.tsx` (Mobile)
- Track filter tabs (enhanced with hierarchy)
- View mode toggle (timeline/list)
- Quick actions (add item, filter)

### 3.3 State Management

**New State Variables**:
```typescript
// Collapse state
const [collapsedTracks, setCollapsedTracks] = useState<Set<string>>(new Set());
const [collapsePreferences, setCollapsePreferences] = useState<Record<string, boolean>>({});

// Filter state
const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(['not_started', 'in_progress']));

// View state
const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
const [showSideProjects, setShowSideProjects] = useState(true);
const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

// UI state
const [settingsOpen, setSettingsOpen] = useState(false);
const [shareOpen, setShareOpen] = useState(false);
```

### 3.4 Persistence

**Store in localStorage** (per project):
- Collapse preferences
- Zoom level preference
- Filter preferences
- View mode preference

**Store in user preferences** (global):
- Default zoom level
- Default view mode
- Show side projects by default

---

## 4. Mobile Considerations

### 4.1 Bottom Navigation

**Pattern**: Reuse `CollapsibleMobileNav` component from Calendar UI.

**Buttons**:
- **Left**: Settings (gear icon) → Opens `RoadmapSettingsSheet`
- **Right**: Share (share icon) → Opens `RoadmapShareSheet`

**Behavior**:
- Default expanded
- Collapsible via swipe down
- Long-press to show collapse hint
- Minimal recovery handle when collapsed

### 4.2 Mobile Timeline

**Improvements**:
1. **Track Hierarchy**:
   - Collapsible track sections
   - Show track > subtrack in item cards
   - Track color indicator

2. **Grouping Options**:
   - Group by track, then period
   - Group by period, then track
   - User preference toggle

3. **Quick Actions**:
   - Swipe gestures for common actions
   - Long-press for context menu
   - Quick add button (floating)

4. **Navigation**:
   - Sticky track headers
   - Sticky "Today" indicator
   - Quick jump buttons

### 4.3 Touch Interactions

- **Swipe Left**: Complete item
- **Swipe Right**: Edit item
- **Long Press**: Context menu
- **Pinch Zoom**: Zoom timeline (if applicable)
- **Pull to Refresh**: Reload data

---

## 5. Collapsible Tracks/Subtracks - Detailed Design

### 5.1 Visual Hierarchy

**Track Levels**:
- **Level 0 (Track)**: No indentation, full-width color border
- **Level 1 (Subtrack)**: 20px indentation, subtle background
- **Level 2+ (Nested)**: 20px additional indentation per level

**Visual Indicators**:
- Chevron icon (right = collapsed, down = expanded)
- Track color dot (left side)
- Item count badge (right side)
- Depth indicator (optional, subtle text)

### 5.2 Collapse States

**Fully Expanded**:
```
▼ Marketing Track (5 items)
  ▼ Branding Subtrack (3 items)
    • Logo Design
    • Brand Guidelines
    • Website Redesign
  ▼ Campaign Subtrack (2 items)
    • Q1 Campaign
    • Q2 Campaign
```

**Partially Collapsed** (track expanded, subtracks collapsed):
```
▼ Marketing Track (5 items)
  ▶ Branding Subtrack (3 items)
  ▶ Campaign Subtrack (2 items)
```

**Fully Collapsed**:
```
▶ Marketing Track (5 items)
```

### 5.3 Bulk Actions

**Header Buttons**:
- "Expand All" - Expands all tracks and subtracks
- "Collapse All" - Collapses all tracks (keeps top-level visible)
- "Expand to Level" - Dropdown:
  - "Tracks Only" - Expands tracks, collapses subtracks
  - "Subtracks" - Expands tracks and subtracks
  - "All Levels" - Expands everything

### 5.4 Smart Defaults

**Auto-Expand Rules**:
1. Tracks with items due in next 7 days
2. Tracks with in-progress items
3. Tracks with overdue items
4. User's most recently viewed tracks

**Auto-Collapse Rules**:
1. Tracks with no items
2. Tracks with only completed items (if preference set)
3. Tracks not viewed in last 30 days (if preference set)

### 5.5 Persistence

**Per-Project Preferences** (localStorage):
```typescript
{
  "roadmap_collapse_prefs_<projectId>": {
    "track_<trackId>": true, // collapsed
    "track_<trackId2>": false, // expanded
  }
}
```

**Global Preferences** (user settings):
- Default collapse behavior
- Auto-expand rules
- Remember collapse state per project

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Remove redundant navigation tabs from header
- [ ] Add `CollapsibleMobileNav` to Roadmap page
- [ ] Create `RoadmapSettingsSheet` component
- [ ] Create `RoadmapShareSheet` component
- [ ] Move Share Project button to bottom nav

### Phase 2: Collapsible Enhancements (Week 2)
- [ ] Enhance track collapse/expand logic
- [ ] Add visual hierarchy improvements
- [ ] Add bulk action buttons
- [ ] Implement collapse state persistence
- [ ] Add smart defaults for auto-expand/collapse

### Phase 3: Mobile Improvements (Week 3)
- [ ] Enhance mobile timeline with track hierarchy
- [ ] Add collapsible track sections in mobile view
- [ ] Improve grouping options
- [ ] Add swipe gestures
- [ ] Add sticky headers

### Phase 4: Desktop Enhancements (Week 4)
- [ ] Improve track rendering (colors, hover effects)
- [ ] Enhance timeline (weekend indicators, milestones)
- [ ] Add zoom slider and keyboard shortcuts
- [ ] Improve item rendering (status icons, progress bars)
- [ ] Add better tooltips

### Phase 5: Polish & Testing (Week 5)
- [ ] Add animations for collapse/expand
- [ ] Performance optimization
- [ ] Accessibility improvements
- [ ] Cross-browser testing
- [ ] User testing and feedback

---

## 7. Success Metrics

### 7.1 User Experience
- **Reduced Navigation Clicks**: Users can access settings/share with 1 click (bottom nav)
- **Faster Track Navigation**: Collapse/expand is more intuitive
- **Better Mobile Experience**: No horizontal scrolling on mobile
- **Improved Discoverability**: Settings and share options are more visible

### 7.2 Performance
- **Render Time**: < 100ms for 100 tracks
- **Scroll Performance**: 60fps during scroll
- **Memory Usage**: < 50MB for large projects

### 7.3 Accessibility
- **Keyboard Navigation**: All actions accessible via keyboard
- **Screen Reader Support**: All elements have proper ARIA labels
- **Touch Targets**: All interactive elements ≥ 44px

---

## 8. Technical Considerations

### 8.1 Performance

**Optimizations**:
- Virtual scrolling for large track lists
- Memoization of track/item rendering
- Lazy loading of collapsed track children
- Debounced collapse state updates

### 8.2 Accessibility

**Requirements**:
- ARIA labels for all interactive elements
- Keyboard shortcuts for common actions
- Focus management for modals/sheets
- Screen reader announcements for state changes

### 8.3 Browser Support

**Target Browsers**:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

---

## 9. Open Questions & Future Enhancements

### 9.1 Open Questions
1. Should we support drag-and-drop reordering of tracks?
2. Should we add dependency visualization (lines between items)?
3. Should we support multiple timeline views (Gantt, Kanban, List)?
4. Should we add filtering by assignee/team member?

### 9.2 Future Enhancements
- **Dependency Visualization**: Show dependencies between items as lines
- **Critical Path**: Highlight critical path in timeline
- **Resource Allocation**: Show resource usage per track
- **Timeline Comparison**: Compare planned vs actual dates
- **Export Options**: Export to PDF, Excel, image
- **Collaboration**: Real-time collaboration indicators
- **AI Suggestions**: AI-powered timeline optimization

---

## 10. Conclusion

This UI improvement plan addresses the key issues with the current Roadmap implementation:
1. ✅ Removes redundant navigation
2. ✅ Adds bottom navigation (consistent with Calendar UI)
3. ✅ Enhances collapsible tracks/subtracks
4. ✅ Improves mobile experience
5. ✅ Better supports complex project management

The phased implementation approach allows for incremental improvements while maintaining system stability. Each phase builds on the previous one, ensuring a smooth transition and minimal disruption to users.

---

## Appendix: Component Dependencies

### Existing Components (Reuse)
- `CollapsibleMobileNav` - Bottom navigation pattern
- `BottomSheet` - Mobile sheet component
- `SharingDrawer` - Sharing functionality
- `ProjectSettingsDrawer` - Project settings

### New Components (Create)
- `RoadmapSettingsSheet` - Settings menu
- `RoadmapShareSheet` - Share menu
- `RoadmapHeader` - Desktop header with controls
- `RoadmapMobileHeader` - Mobile header
- `RoadmapItemBar` - Desktop item rendering
- `RoadmapItemCard` - Mobile item card (enhanced)

### Utility Functions (Create/Enhance)
- `collapseTrackTree` - Collapse/expand logic
- `getVisibleTracks` - Filter visible tracks based on collapse state
- `persistCollapseState` - Save collapse preferences
- `loadCollapseState` - Load collapse preferences
- `getSmartDefaults` - Calculate auto-expand/collapse rules
