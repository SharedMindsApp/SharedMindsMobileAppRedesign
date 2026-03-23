# Tracker Studio UI Design System
## Comprehensive Design Documentation & Enhancement Guide

**Document Type:** UI/UX Design System  
**Status:** Design Documentation + Enhancement Proposals  
**Date:** January 2025  
**Scope:** Complete Tracker Studio interface design

---

## Executive Summary

This document provides a comprehensive design system for Tracker Studio, documenting existing UI patterns and proposing enhancements for a cohesive, accessible, and user-friendly experience. Tracker Studio follows a calm, non-judgmental design philosophy that empowers users to track what matters to them without pressure or evaluation.

**Design Principles:**
- **Calm & Non-Judgmental:** No streaks, gamification, or performance language
- **Schema-Driven:** UI adapts to tracker structure dynamically
- **Accessible:** WCAG 2.1 AA compliant
- **Consistent:** Unified design language across all pages
- **Progressive:** Clear information hierarchy

---

## 1. Design System Foundation

### 1.1 Color Palette

**Primary Colors:**
- **Blue (Primary Action):** `#2563EB` (`blue-600`)
  - Used for: Primary buttons, links, active states
  - Hover: `#1D4ED8` (`blue-700`)
  - Light: `#DBEAFE` (`blue-100`)

- **Gray (Neutral):** 
  - Background: `#F9FAFB` (`gray-50`)
  - Surface: `#FFFFFF` (white)
  - Border: `#E5E7EB` (`gray-200`)
  - Text Primary: `#111827` (`gray-900`)
  - Text Secondary: `#6B7280` (`gray-600`)
  - Text Muted: `#9CA3AF` (`gray-400`)

**Semantic Colors:**
- **Success:** `#10B981` (`green-600`) - Confirmations, success states
- **Warning:** `#F59E0B` (`amber-600`) - Cautions, important info
- **Error:** `#EF4444` (`red-600`) - Errors, destructive actions
- **Info:** `#3B82F6` (`blue-500`) - Informational messages

**Status Colors (Insights):**
- **Temporal Alignment:** `#3B82F6` (blue)
- **Directional Shift:** `#10B981` (green)
- **Volatility:** `#F59E0B` (amber)
- **Context Comparison:** `#8B5CF6` (purple)
- **Missing Data:** `#6B7280` (gray)

**Badge Colors:**
- **Owner:** `#9333EA` (`purple-600`) with `#F3E8FF` background
- **Editor:** `#2563EB` (`blue-600`) with `#DBEAFE` background
- **Viewer/Read-only:** `#6B7280` (`gray-600`) with `#F3F4F6` background
- **Shared:** `#059669` (`emerald-600`) with `#D1FAE5` background
- **Global Template:** `#DC2626` (`red-600`) with `#FEE2E2` background

### 1.2 Typography

**Font Family:**
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

**Type Scale:**
- **H1 (Page Title):** `text-3xl font-bold` (30px, 700)
  - Color: `text-gray-900`
  - Usage: Page headers

- **H2 (Section Title):** `text-xl font-semibold` (20px, 600)
  - Color: `text-gray-900`
  - Usage: Section headers, card titles

- **H3 (Subsection):** `text-lg font-semibold` (18px, 600)
  - Color: `text-gray-900`
  - Usage: Subsection headers

- **Body:** `text-base` (16px, 400)
  - Color: `text-gray-900` (primary), `text-gray-600` (secondary)
  - Usage: Main content

- **Small:** `text-sm` (14px, 400)
  - Color: `text-gray-600`
  - Usage: Helper text, labels, metadata

- **Extra Small:** `text-xs` (12px, 400)
  - Color: `text-gray-500`
  - Usage: Timestamps, badges, fine print

### 1.3 Spacing System

**Tailwind Spacing Scale:**
- **xs:** `0.5rem` (8px) - Tight spacing
- **sm:** `0.75rem` (12px) - Compact spacing
- **base:** `1rem` (16px) - Default spacing
- **md:** `1.5rem` (24px) - Medium spacing
- **lg:** `2rem` (32px) - Large spacing
- **xl:** `3rem` (48px) - Extra large spacing

**Component Spacing:**
- **Card Padding:** `p-6` (24px)
- **Section Gap:** `mb-6` or `mb-8` (24-32px)
- **Form Field Gap:** `space-y-4` (16px)
- **Button Gap:** `gap-2` or `gap-3` (8-12px)

### 1.4 Border Radius

- **Small:** `rounded` (4px) - Buttons, inputs
- **Medium:** `rounded-lg` (8px) - Cards, modals
- **Large:** `rounded-xl` (12px) - Large cards, containers

### 1.5 Shadows

- **Card:** `shadow-sm` - Subtle elevation
- **Modal:** `shadow-lg` - Elevated surface
- **Hover:** `hover:shadow-md` - Interactive feedback

---

## 2. Component Library

### 2.1 Buttons

**Primary Button:**
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium">
  <Icon size={18} />
  Button Text
</button>
```

**Secondary Button:**
```tsx
<button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
  <Icon size={18} />
  Button Text
</button>
```

**Destructive Button:**
```tsx
<button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
  Delete
</button>
```

**Icon Button:**
```tsx
<button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
  <Icon size={18} />
</button>
```

**Button States:**
- **Disabled:** `opacity-50 cursor-not-allowed`
- **Loading:** Show spinner, disable interaction
- **Hover:** Darker background, subtle shadow

### 2.2 Cards

**Standard Card:**
```tsx
<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
  <h2 className="text-xl font-semibold text-gray-900 mb-4">Card Title</h2>
  {/* Content */}
</div>
```

**Template Card:**
```tsx
<div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
  <div className="flex items-start justify-between mb-3">
    <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
    <Badge>{scope}</Badge>
  </div>
  <p className="text-sm text-gray-600 mb-4">{description}</p>
  <div className="flex gap-2">
    <Button>Create Tracker</Button>
  </div>
</div>
```

**Tracker Card (List View):**
```tsx
<div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors">
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
      <p className="text-sm text-gray-600">{granularity} • Created {date}</p>
    </div>
    <div className="flex gap-2">
      <Button variant="secondary">Open</Button>
      <Button variant="icon">Archive</Button>
    </div>
  </div>
</div>
```

### 2.3 Forms

**Input Field:**
```tsx
<div>
  <label htmlFor="field-id" className="block text-sm font-medium text-gray-700 mb-1">
    Label
  </label>
  <input
    id="field-id"
    type="text"
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    placeholder="Placeholder text"
  />
</div>
```

**Textarea:**
```tsx
<textarea
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
  rows={3}
/>
```

**Select Dropdown:**
```tsx
<select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
  <option>Option 1</option>
</select>
```

**Checkbox/Toggle:**
```tsx
<label className="flex items-center gap-3 cursor-pointer">
  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
  <span className="text-sm text-gray-700">Label text</span>
</label>
```

**Form Validation:**
- **Error State:** Red border (`border-red-300`), error message below
- **Success State:** Green border (`border-green-300`) (optional)
- **Error Message:** `text-sm text-red-600` below field

### 2.4 Badges

**Status Badge:**
```tsx
<span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-600">
  Status
</span>
```

**Role Badge:**
```tsx
<span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-600">
  <Icon size={12} className="mr-1" />
  Owner
</span>
```

**Granularity Badge:**
```tsx
<span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
  Daily
</span>
```

### 2.5 Modals & Drawers

**Modal (Bottom Sheet on Mobile):**
- Uses `BottomSheet` component for mobile responsiveness
- Backdrop: `bg-black/50` with `backdrop-blur-sm`
- Max height: `85vh` on mobile, `90vh` on desktop
- Padding: `p-4` or `p-6`

**Modal Header:**
```tsx
<div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
  <h2 className="text-2xl font-bold text-gray-900">Modal Title</h2>
  <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
    <X size={20} />
  </button>
</div>
```

**Drawer (Side Panel):**
- Slides in from right on desktop
- Full screen on mobile
- Same styling as modal

### 2.6 Loading States

**Page Loading:**
```tsx
<div className="text-center py-12">
  <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
  <p className="text-gray-600">Loading...</p>
</div>
```

**Skeleton Loader:**
```tsx
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

**Button Loading:**
```tsx
<button disabled className="...">
  <Loader2 className="h-4 w-4 animate-spin" />
  Loading...
</button>
```

### 2.7 Empty States

**Standard Empty State:**
```tsx
<div className="text-center py-12">
  <Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
  <h3 className="text-lg font-semibold text-gray-900 mb-2">No items yet</h3>
  <p className="text-gray-600 mb-4">Get started by creating your first item.</p>
  <Button>Create Item</Button>
</div>
```

**Empty State with Illustration:**
- Use lucide-react icons as illustrations
- Size: `h-16 w-16` or `h-20 w-20`
- Color: `text-gray-300` or `text-gray-400`

### 2.8 Error States

**Inline Error:**
```tsx
<div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 flex items-center gap-2">
  <AlertCircle size={20} />
  <p className="text-sm">Error message</p>
</div>
```

**Page Error:**
```tsx
<div className="bg-red-50 border border-red-200 rounded-lg p-4">
  <p className="text-red-800 mb-2">Error message</p>
  <Button onClick={retry}>Retry</Button>
</div>
```

---

## 3. Page Layouts

### 3.1 Page Structure

**Standard Page Layout:**
```tsx
<div className="min-h-screen bg-gray-50 p-4 md:p-8">
  <div className="max-w-6xl mx-auto">
    {/* Header */}
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Title</h1>
      <p className="text-gray-600">Page description</p>
    </div>
    
    {/* Content */}
    <div className="space-y-6">
      {/* Sections */}
    </div>
  </div>
</div>
```

**Max Widths:**
- **List Pages:** `max-w-6xl` (1152px)
- **Detail Pages:** `max-w-4xl` (896px)
- **Form Pages:** `max-w-3xl` (768px)

### 3.2 Navigation

**Breadcrumbs:**
```tsx
<nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
  <Link to="/tracker-studio">Tracker Studio</Link>
  <span>/</span>
  <Link to="/tracker-studio/my-trackers">My Trackers</Link>
  <span>/</span>
  <span className="text-gray-900">Tracker Name</span>
</nav>
```

**Back Button:**
```tsx
<button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
  <ArrowLeft size={18} />
  Back
</button>
```

**Page Header Actions:**
```tsx
<div className="mb-8 flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Title</h1>
    <p className="text-gray-600">Description</p>
  </div>
  <div className="flex gap-3">
    <Button variant="secondary">Action 1</Button>
    <Button variant="primary">Action 2</Button>
  </div>
</div>
```

---

## 4. Existing Component Specifications

### 4.1 TrackerTemplatesPage

**Layout:**
- Full-width container (`max-w-6xl`)
- Header with title and description
- "Create Custom Tracker" CTA button
- Two sections: "Featured Templates (Global)" and "My Templates"
- Grid layout for template cards

**Template Card:**
- White background, gray border
- Hover: Blue border, shadow
- Shows: Name, description, granularity, field count
- Actions: "Create Tracker", "Share" (user templates), "Duplicate" (global)
- Badge: "Global" or "My Template"

**Enhancements:**
- Add template preview on hover
- Add search/filter functionality
- Add template categories/tags
- Add "Recently Used" section

### 4.2 MyTrackersPage

**Layout:**
- Full-width container (`max-w-6xl`)
- Header with title, description, and action buttons
- Grid or list view of trackers
- Empty state with CTA

**Tracker Card:**
- White background, gray border
- Shows: Name, granularity, created date, entry count (optional)
- Actions: "Open", "Archive"
- Hover: Blue border, shadow

**Enhancements:**
- Add view toggle (grid/list)
- Add search and filter
- Add sorting options (name, date, recent activity)
- Add quick stats (last entry date, total entries)
- Add bulk actions

### 4.3 TrackerDetailPage

**Layout:**
- Centered container (`max-w-4xl`)
- Header with back button, title, badges, actions
- Sections: Entry Form, Entry History, Your Notes, Reminders, Shared Access

**Header:**
- Tracker name (large, bold)
- Description (muted)
- Badges: Role (Owner/Editor/Viewer), Read-only
- Actions: Share, Share to Project

**Entry Form Section:**
- Date picker
- Schema-driven fields
- Notes textarea
- Submit button
- Read-only banner (if applicable)

**Entry History Section:**
- Chronological list
- Date, field values, notes
- Edit button per entry
- Date range filter (optional)

**Enhancements:**
- Add entry statistics (total entries, last entry date)
- Add quick entry shortcuts
- Add entry search
- Add export functionality
- Add calendar view

### 4.4 TrackerEntryForm

**Schema-Driven Rendering:**
- Dynamically renders fields based on `field_schema_snapshot`
- Supports: text, number, boolean, rating, date
- Inline validation
- Error messages per field

**Field Types:**
- **Text:** Textarea (multi-line)
- **Number:** Number input with min/max
- **Boolean:** Toggle switch
- **Rating:** 1-5 radio buttons or stars
- **Date:** Date picker

**Enhancements:**
- Add field-level help text
- Add field grouping
- Add conditional fields
- Add field validation preview
- Add autosave draft

### 4.5 CreateTrackerFromScratchPage

**Layout:**
- Centered form (`max-w-3xl`)
- Multi-step or single-page form
- Sections: Basic Info, Entry Granularity, Fields

**Field Builder:**
- Add/remove fields
- Field configuration: label, type, validation
- Preview of field schema

**Enhancements:**
- Add field templates
- Add field import from other trackers
- Add field validation rules UI
- Add preview mode

### 4.6 TrackerSharingDrawer

**Layout:**
- Bottom sheet (mobile) or drawer (desktop)
- Sections: Add People, Current Access

**Add People Section:**
- Email search input
- User selector
- Access level selector (Viewer/Editor)
- Grant button

**Current Access Section:**
- List of users with access
- Role badges
- Revoke button per user

**Enhancements:**
- Add user avatars
- Add access history
- Add bulk operations
- Add link sharing (future)

### 4.7 CrossTrackerInsightsPage

**Layout:**
- Full-width container
- Tracker selector (multi-select)
- Date range selector
- Insights grid

**Insight Card:**
- Colored background based on insight type
- Title, date range, explanation
- Related trackers
- Context labels

**Enhancements:**
- Add insight filtering
- Add insight export
- Add insight bookmarks
- Add insight comparison view

### 4.8 ContextEventsPage

**Layout:**
- Full-width container
- Timeline view
- Add event button
- Event list

**Event Card:**
- Type badge
- Date range
- Label, severity, notes
- Edit/archive actions

**Enhancements:**
- Add calendar view
- Add event templates
- Add event recurrence
- Add event linking to trackers

---

## 5. Enhanced Design Proposals

### 5.1 Visual Hierarchy Improvements

**Proposed Changes:**
1. **Stronger Typography Scale:**
   - Increase H1 to `text-4xl` (36px) for more presence
   - Add `text-2xl` (24px) for sub-headers
   - Improve line-height for readability

2. **Enhanced Card Design:**
   - Add subtle gradient backgrounds for featured items
   - Add hover animations (scale, shadow)
   - Add focus states for accessibility

3. **Better Color Contrast:**
   - Ensure all text meets WCAG AA (4.5:1)
   - Add dark mode support (future)
   - Improve focus indicators

### 5.2 Interaction Enhancements

**Proposed Changes:**
1. **Micro-interactions:**
   - Button press animations
   - Form field focus animations
   - Success/error state animations
   - Loading skeleton animations

2. **Keyboard Navigation:**
   - Full keyboard support for all actions
   - Clear focus indicators
   - Skip links for accessibility
   - Keyboard shortcuts (future)

3. **Touch Optimizations:**
   - Larger touch targets (min 44x44px)
   - Swipe gestures for mobile
   - Pull-to-refresh
   - Bottom sheet modals on mobile

### 5.3 Information Architecture

**Proposed Changes:**
1. **Dashboard View:**
   - Add Tracker Studio dashboard
   - Quick stats: Total trackers, recent entries, active reminders
   - Recent activity feed
   - Quick actions

2. **Better Navigation:**
   - Add sidebar navigation (desktop)
   - Add bottom navigation (mobile)
   - Add breadcrumbs consistently
   - Add search functionality

3. **Contextual Help:**
   - Add tooltips for complex features
   - Add inline help text
   - Add "What's this?" links
   - Add onboarding tour (future)

### 5.4 Data Visualization

**Proposed Enhancements:**
1. **Entry History Visualization:**
   - Add simple line/bar charts
   - Add calendar heatmap
   - Add trend indicators
   - Add comparison views

2. **Insight Visualization:**
   - Add chart components for insights
   - Add timeline visualizations
   - Add correlation graphs
   - Add context overlays

3. **Tracker Overview:**
   - Add summary cards with stats
   - Add activity timeline
   - Add completion indicators
   - Add goal progress (if applicable)

### 5.5 Responsive Design

**Breakpoints:**
- **Mobile:** `< 640px` (sm)
- **Tablet:** `640px - 1024px` (md)
- **Desktop:** `> 1024px` (lg)

**Mobile Optimizations:**
- Stack layouts vertically
- Full-width buttons
- Bottom sheet modals
- Touch-friendly targets
- Simplified navigation

**Tablet Optimizations:**
- Two-column layouts where appropriate
- Side-by-side forms
- Collapsible sections

**Desktop Optimizations:**
- Multi-column grids
- Sidebar navigation
- Hover states
- Keyboard shortcuts

---

## 6. Accessibility Guidelines

### 6.1 WCAG 2.1 AA Compliance

**Color Contrast:**
- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

**Keyboard Navigation:**
- All interactive elements keyboard accessible
- Logical tab order
- Skip links for main content
- Focus indicators visible

**Screen Readers:**
- Semantic HTML
- ARIA labels where needed
- Alt text for images
- Form labels associated

**Motion:**
- Respect `prefers-reduced-motion`
- No auto-playing animations
- Pause/stop controls for animations

### 6.2 ARIA Patterns

**Modal:**
```tsx
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Modal Title</h2>
</div>
```

**Form:**
```tsx
<form aria-label="Create tracker">
  <label htmlFor="name">Name</label>
  <input id="name" aria-describedby="name-help" />
  <span id="name-help" className="sr-only">Helper text</span>
</form>
```

**Button:**
```tsx
<button aria-label="Share tracker" aria-describedby="share-description">
  <Share2 />
</button>
```

### 6.3 Focus Management

**Focus Trapping:**
- Modals trap focus
- Drawers trap focus
- Focus returns to trigger on close

**Focus Indicators:**
- Visible outline: `focus:ring-2 focus:ring-blue-500`
- High contrast
- Consistent across components

---

## 7. Component Enhancement Roadmap

### 7.1 Phase 1: Foundation (Current)

✅ **Completed:**
- Basic component library
- Page layouts
- Form components
- Modal/drawer patterns
- Loading/error states

### 7.2 Phase 2: Polish (Next)

**Planned:**
- Enhanced typography scale
- Improved color system
- Micro-interactions
- Better empty states
- Enhanced cards

### 7.3 Phase 3: Advanced (Future)

**Planned:**
- Data visualizations
- Dashboard view
- Advanced search
- Keyboard shortcuts
- Dark mode

### 7.4 Phase 4: Mobile (Future)

**Planned:**
- Mobile-first redesign
- Touch gestures
- Bottom navigation
- Swipe actions
- Pull-to-refresh

---

## 8. Design Tokens

### 8.1 Spacing Tokens

```typescript
const spacing = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
};
```

### 8.2 Color Tokens

```typescript
const colors = {
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    400: '#9CA3AF',
    600: '#6B7280',
    900: '#111827',
  },
};
```

### 8.3 Typography Tokens

```typescript
const typography = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  sizes: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};
```

---

## 9. Implementation Guidelines

### 9.1 Component Structure

**File Organization:**
```
src/components/tracker-studio/
  ├── pages/
  │   ├── TrackerTemplatesPage.tsx
  │   ├── MyTrackersPage.tsx
  │   ├── TrackerDetailPage.tsx
  │   └── ...
  ├── components/
  │   ├── TrackerEntryForm.tsx
  │   ├── TrackerEntryList.tsx
  │   └── ...
  └── modals/
      ├── CreateTrackerFromTemplateModal.tsx
      └── ...
```

### 9.2 Styling Approach

**Tailwind CSS:**
- Use utility classes primarily
- Extract repeated patterns to components
- Use CSS variables for theming (future)

**Component Styling:**
```tsx
// Good: Utility classes
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg">

// Avoid: Inline styles
<button style={{ padding: '8px 16px', backgroundColor: '#2563EB' }}>
```

### 9.3 State Management

**Local State:**
- Use `useState` for component state
- Use `useEffect` for side effects
- Use `useCallback` for memoized functions

**Shared State:**
- Use React Context for shared state
- Use custom hooks for data fetching
- Avoid prop drilling

### 9.4 Performance

**Optimizations:**
- Lazy load heavy components
- Memoize expensive computations
- Virtualize long lists
- Debounce search inputs
- Optimize images

---

## 10. Design Checklist

### 10.1 Before Implementation

- [ ] Design reviewed with team
- [ ] Accessibility requirements met
- [ ] Responsive breakpoints defined
- [ ] Component specifications complete
- [ ] Design tokens documented

### 10.2 During Implementation

- [ ] Follows design system
- [ ] Accessible (keyboard, screen reader)
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Loading states implemented
- [ ] Error states implemented
- [ ] Empty states implemented

### 10.3 After Implementation

- [ ] Visual QA completed
- [ ] Accessibility audit passed
- [ ] Browser testing completed
- [ ] Mobile testing completed
- [ ] Performance benchmarks met
- [ ] User testing feedback incorporated

---

## 11. Design Resources

### 11.1 Icons

**Library:** Lucide React
- Consistent icon style
- Accessible (SVG)
- Customizable size/color

**Common Icons:**
- `Plus` - Add/create
- `Edit` - Edit
- `Trash2` - Delete
- `Archive` - Archive
- `Share2` - Share
- `Calendar` - Date/time
- `BarChart3` - Analytics
- `Settings` - Settings
- `Eye` - View
- `Lock` - Locked/read-only

### 11.2 Illustrations

**Placeholder:**
- Use lucide-react icons as illustrations
- Size: 64x64px or 96x96px
- Color: `text-gray-300`

**Future:**
- Custom illustrations
- Empty state illustrations
- Onboarding illustrations

---

## 12. Success Metrics

### 12.1 Design Quality

- **Consistency:** 95%+ components follow design system
- **Accessibility:** WCAG 2.1 AA compliance
- **Performance:** < 3s initial load, < 100ms interactions
- **Responsiveness:** Works on all breakpoints

### 12.2 User Experience

- **Clarity:** Users understand interface without help
- **Efficiency:** Common tasks completed in < 3 clicks
- **Satisfaction:** User feedback positive
- **Error Rate:** < 2% user errors

---

## Document Status

This document is a living design system that will evolve with Tracker Studio. It documents current patterns and proposes enhancements for a cohesive, accessible, and user-friendly experience.

**Next Steps:**
1. Review and approve design system
2. Implement Phase 2 enhancements
3. Gather user feedback
4. Iterate on design patterns

---

## Appendix: Component Reference

### A.1 All Tracker Studio Components

**Pages:**
- `TrackerTemplatesPage` - Browse templates
- `MyTrackersPage` - List user trackers
- `TrackerDetailPage` - View/edit tracker
- `CreateTrackerFromScratchPage` - Create custom tracker
- `CrossTrackerInsightsPage` - View insights
- `ContextEventsPage` - Manage context events

**Components:**
- `TrackerEntryForm` - Entry input form
- `TrackerEntryList` - Entry history list
- `TrackerSharingDrawer` - Share permissions
- `TrackerReminderSettings` - Reminder configuration
- `InterpretationTimelinePanel` - User notes
- `CrossTrackerInsightsPanel` - Insights panel
- `ContextTimelinePanel` - Context events panel

**Modals:**
- `CreateTrackerFromTemplateModal` - Create from template
- `TemplateShareLinkModal` - Share template link
- `AddContextEventModal` - Add context event
- `AddInterpretationModal` - Add interpretation

### A.2 Design Patterns

**Pattern: Schema-Driven UI**
- UI adapts to data structure
- No hardcoded field types
- Dynamic form generation

**Pattern: Progressive Disclosure**
- Show essential info first
- Expand for details
- Collapsible sections

**Pattern: Optimistic Updates**
- Update UI immediately
- Rollback on error
- Show loading states

**Pattern: Calm Design**
- No gamification
- No judgment language
- Neutral, factual tone

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Maintained By:** Design Team
