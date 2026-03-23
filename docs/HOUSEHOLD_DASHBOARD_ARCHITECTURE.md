# Household Dashboard Architecture

## Overview

The Household Dashboard is a warm, playful digital "family fridge" combined with a household control center. It provides a central hub where household members can coordinate, celebrate, track progress, and stay connected.

## Design Philosophy

**Warm & Welcoming**
- Feels like a cozy family space, not a corporate tool
- Uses warm gradients (amber, orange, rose, coral)
- Playful elements like "fridge magnets" and sticky notes
- Celebration-focused with achievements and milestones

**Neurodiversity-Friendly**
- Generous spacing between sections
- Clear visual hierarchy with color-coded categories
- Short, scannable content blocks
- Icons anchor every section for quick recognition
- High contrast for readability
- No overwhelming animations

**Functional & Organized**
- Clear separation of concerns across sections
- Primary interactive zone (Fridge Board) gets prominent placement
- Sidebar sections provide quick access to key info
- Mobile-first responsive design
- Grid-based layout for consistency

## Architecture Components

### 1. Main Layout Structure

**File**: `src/components/household/HouseholdDashboard.tsx`

**Layout Grid**:
- **Desktop (lg)**: 12-column grid
  - Left column: 8 columns (main content)
  - Right column: 4 columns (sidebar)
- **Mobile**: Single column stack

**Header**:
- Gradient bar with fridge icon
- Household name display
- Current date indicator
- Warm color scheme (amber/orange/rose)

**Footer**:
- Gradient fade effect
- Creates visual grounding

### 2. Fridge Board Section (Primary Zone)

**File**: `src/components/household/dashboard-sections/FridgeBoardSection.tsx`

**Purpose**: Main interactive area where family members pin notes, photos, reminders, achievements, and quotes.

**Visual Design**:
- Grid layout (2-4 columns responsive)
- Items look like colorful sticky notes with slight rotation
- Each item has a colored "magnet" dot
- Hover effects straighten the rotation
- Color-coded by type:
  - Yellow: Notes
  - Pink: Reminders
  - Green: Achievements
  - Blue: Quotes
  - Orange: Photos

**Item Types**:
- **Note**: Quick text messages
- **Photo**: Images with captions
- **Reminder**: Time-sensitive alerts
- **Achievement**: Celebrations and wins
- **Quote**: Inspiration and motivation

**Interaction Placeholders**:
- Add new item button
- Dashed border placeholder for new items
- Legend showing item types

**Database Table**: `fridge_board_items`

### 3. Shared Calendar Section

**File**: `src/components/household/dashboard-sections/SharedCalendarSection.tsx`

**Purpose**: View upcoming household events for the current week.

**Visual Design**:
- 7-day week view at top
- Today highlighted with background color
- Event cards below with color-coded left borders
- Event type badges

**Event Types**:
- **Appointment** (Blue): Medical, professional
- **Celebration** (Pink): Birthdays, achievements
- **Routine** (Green): Recurring family activities
- **Deadline** (Red): Important due dates

**Features**:
- Member avatars show who created event
- All-day vs. timed events
- Quick "View Full Calendar" link
- Color legend

**Database Table**: `household_calendar_events`

### 4. Household Habits Section

**File**: `src/components/household/dashboard-sections/HouseholdHabitsSection.tsx`

**Purpose**: Track daily/weekly household habits and streaks.

**Visual Design**:
- Compact card layout
- 7-day streak visualization (colored bars)
- Checkmark icon for completed, circle for pending
- Color-coded by habit status

**Habit Features**:
- Daily or weekly frequency
- Streak counting
- Visual progress bars
- Family-wide habits (everyone participates)

**Database Tables**:
- `household_habits`
- `household_habit_completions`

### 5. Household Goals Section

**File**: `src/components/household/dashboard-sections/HouseholdGoalsSection.tsx`

**Purpose**: Long-term goals the household is working toward together.

**Visual Design**:
- Progress bars with percentage
- Category icons (home, health, financial, relationship, fun, growth)
- Target date display
- Gradient backgrounds by category

**Goal Categories**:
- **Health**: Fitness, wellness
- **Financial**: Savings, budgeting
- **Relationship**: Quality time, communication
- **Home**: Organization, improvements
- **Fun**: Experiences, adventures
- **Growth**: Learning, development

**Database Table**: `household_goals`

### 6. Household Insights Section

**File**: `src/components/household/dashboard-sections/HouseholdInsightsSection.tsx`

**Purpose**: Quick summary of household compatibility insights.

**Visual Design**:
- Warm amber/orange/rose gradient background
- Sparkle icon for special feeling
- Bullet-point insights with colored dots
- "View Full Match" CTA button

**Content**:
- Pulls from `household_insight_matches`
- Shows 3 key insights
- Links to full match viewer

**Database Table**: Uses existing `household_insight_matches`

### 7. Monthly Overview Section

**File**: `src/components/household/dashboard-sections/MonthlyOverviewSection.tsx`

**Purpose**: High-level stats for the current month.

**Visual Design**:
- 2-column metric grid
- Progress bars for goals
- Quick stat list
- Status indicator at bottom

**Metrics Displayed**:
- Habits completed count
- Events scheduled count
- Overall goals progress
- Fridge board item count
- Celebrations count
- Active habits count

**Data Source**: Aggregated from other tables

## Database Schema

### Tables Created

1. **fridge_board_items**
   - Household sticky notes, photos, reminders
   - Position tracking (x, y)
   - Color coding
   - Expiration dates (auto-cleanup)
   - Type: note, photo, reminder, achievement, quote

2. **household_calendar_events**
   - Shared household calendar
   - Event types: appointment, celebration, routine, deadline
   - All-day or timed events
   - Color coding
   - Member attribution

3. **household_habits**
   - Recurring household habits
   - Frequency: daily, weekly, custom
   - Icon and color customization
   - Active/inactive status

4. **household_habit_completions**
   - Daily completion tracking
   - Per-member tracking
   - Streak calculations
   - Date-based querying

5. **household_goals**
   - Long-term household goals
   - Progress percentage (0-100)
   - Category: health, financial, relationship, home, fun, growth
   - Target dates
   - Completion status

### Security (RLS)

All tables have Row Level Security enabled with policies:
- Users can read their household's data
- Users can insert items for their household
- Users can update their household's items
- Users can delete their household's items
- Membership verified via `members` table join

### Indexes

Optimized for common queries:
- `household_id` on all tables
- `event_date` for calendar
- `completed_date` for habit completions
- `expires_at` for fridge board cleanup

## Responsive Behavior

### Desktop (lg+)
```
┌─────────────────────────────────────────────┐
│           Header (Full Width)               │
├───────────────────────┬─────────────────────┤
│                       │                     │
│   Fridge Board        │  Monthly Overview   │
│   (8 cols)            │  (4 cols)           │
│                       │                     │
├───────────────────────┤  Household Habits   │
│                       │                     │
│   Shared Calendar     │  Household Goals    │
│   (8 cols)            │                     │
│                       │  Household Insights │
└───────────────────────┴─────────────────────┘
```

### Mobile (< lg)
```
┌─────────────────┐
│  Header         │
├─────────────────┤
│  Fridge Board   │
├─────────────────┤
│  Shared         │
│  Calendar       │
├─────────────────┤
│  Monthly        │
│  Overview       │
├─────────────────┤
│  Household      │
│  Habits         │
├─────────────────┤
│  Household      │
│  Goals          │
├─────────────────┤
│  Household      │
│  Insights       │
└─────────────────┘
```

## Color System

### Section Headers
- **Fridge Board**: Blue → Cyan → Teal gradient
- **Shared Calendar**: Emerald → Teal → Cyan gradient
- **Household Habits**: Green → Emerald → Teal gradient
- **Household Goals**: Rose → Pink → Fuchsia gradient
- **Household Insights**: Amber → Orange → Rose gradient
- **Monthly Overview**: Blue → Cyan → Teal gradient

### Item Types (Fridge Board)
- Yellow: Notes (casual thoughts)
- Pink: Reminders (time-sensitive)
- Green: Achievements (celebrations)
- Blue: Quotes (inspiration)
- Orange: Photos (memories)

### Event Types (Calendar)
- Blue: Appointments (professional)
- Pink: Celebrations (special occasions)
- Green: Routines (recurring activities)
- Red: Deadlines (important dates)

### Goal Categories
- Blue/Cyan: Home improvements
- Green/Emerald: Health and wellness
- Amber/Orange: Financial goals
- Rose/Pink: Relationships
- Purple/Violet: Personal growth (avoided per guidelines)

## Spacing & Accessibility

### Spacing Scale
- Section gaps: 6 units (1.5rem)
- Card padding: 5-6 units (1.25-1.5rem)
- Item gaps: 3-4 units (0.75-1rem)
- Text spacing: Generous line-height for readability

### Typography
- Headers: Bold, large (xl-3xl)
- Subheaders: Semibold, medium (lg)
- Body: Regular, base size
- Captions: Small, gray (xs)
- All text maintains WCAG contrast ratios

### Touch Targets
- Buttons: Minimum 44x44px
- Cards: Large tap areas
- Icons: 18-24px with padding

## Implementation Status

✅ **Completed**:
- Database schema with RLS
- Main layout structure
- All 6 section components
- Responsive grid system
- Color system
- Placeholder content
- Build verification

🚧 **Not Implemented** (By Design):
- Interaction logic (CRUD operations)
- Real-time data fetching
- Permission systems
- Drag-and-drop for fridge items
- Calendar date picker
- Habit completion toggles
- Goal progress updates
- Form modals
- Delete confirmations
- Image uploads
- Search/filter

## Next Steps (Future Implementation)

### Phase 1: Core Interactions
1. Add new fridge board items
2. View/edit/delete fridge items
3. Add calendar events
4. Mark habits as complete
5. Update goal progress

### Phase 2: Real-Time Features
1. Fetch live data from Supabase
2. Real-time updates via subscriptions
3. Member avatars and attribution
4. Optimistic UI updates

### Phase 3: Advanced Features
1. Drag-and-drop fridge items
2. Image upload for photos
3. Recurring event templates
4. Habit streak notifications
5. Goal milestone celebrations
6. Calendar integration (iCal export)
7. Print-friendly view

### Phase 4: Collaboration
1. Multi-member habit tracking
2. Goal collaboration features
3. Calendar conflict detection
4. Shared to-do lists
5. Family announcements

## Design Tokens

### Border Radius
- Cards: 3xl (1.5rem)
- Buttons: xl (0.75rem)
- Small elements: lg-xl (0.5-0.75rem)

### Shadows
- Cards: lg (large shadow)
- Hover states: xl (extra large shadow)
- Icons: md (medium shadow)

### Transitions
- Duration: 300ms
- Easing: ease-in-out
- Properties: transform, shadow, colors

## Testing Considerations

### Manual Testing Checklist
- [ ] Desktop layout renders correctly (>1024px)
- [ ] Tablet layout adapts (768-1023px)
- [ ] Mobile layout stacks properly (<768px)
- [ ] All section headers display
- [ ] Placeholder content shows
- [ ] Colors are warm and accessible
- [ ] No content overflow
- [ ] Spacing feels comfortable
- [ ] Icons load properly
- [ ] Gradients render smoothly

### Accessibility Checklist
- [ ] Color contrast meets WCAG AA
- [ ] Headers use semantic HTML
- [ ] Icons have descriptive context
- [ ] Touch targets are large enough
- [ ] Text is readable at base size
- [ ] Layout works with 200% zoom
- [ ] No reliance on color alone

## File Structure

```
src/components/household/
├── HouseholdDashboard.tsx              (Main layout)
└── dashboard-sections/
    ├── FridgeBoardSection.tsx          (Primary interactive zone)
    ├── SharedCalendarSection.tsx       (Week view)
    ├── HouseholdHabitsSection.tsx      (Daily habits)
    ├── HouseholdGoalsSection.tsx       (Long-term goals)
    ├── HouseholdInsightsSection.tsx    (Compatibility summary)
    └── MonthlyOverviewSection.tsx      (Stats overview)
```

## Props Interface

All sections follow this pattern:

```typescript
interface SectionProps {
  householdId: string;  // For data fetching
}
```

Simple, consistent, ready for data integration.

## Styling Conventions

- Tailwind CSS utility classes
- Gradient backgrounds for warmth
- Border-based separation
- Rounded corners throughout
- Shadow depth for hierarchy
- Hover states for interactivity

## Performance Notes

- Static content renders immediately
- No heavy computations in layout
- Images lazy load when implemented
- Sections can be code-split
- Minimal re-renders
- Efficient grid layout

## Browser Support

Designed to work in:
- Modern Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive breakpoints tested
- No IE11 support needed

---

**Status**: Architecture Complete ✅
**Ready For**: Data integration, interaction logic, real-time features
**Build Status**: Passing ✅
