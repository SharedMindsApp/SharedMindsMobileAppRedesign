# CalendarCore Architecture

## Core Principle

**SpacesOS Calendar = Canonical Calendar**

This module is the **single source of truth** for all calendar UI and logic across the application.

## Rules

### ✅ Allowed

- Calendar rendering logic **only** in `calendarCore/`
- SpacesOS and Planner **compose** `CalendarShell`, not re-implement
- Context differences handled via **props/configuration**
- Shared hooks for event fetching, navigation, gestures

### ❌ Forbidden

- Calendar views in `/planner/` or `/spaces/` components
- Duplicate calendar logic outside `calendarCore/`
- Planner-specific calendar hooks
- "Temporary" calendar implementations
- Forking calendar UI "just for now"

## Structure

```
calendarCore/
├── CalendarShell.tsx          # Main container (context-agnostic)
├── CalendarHeader.tsx         # Header with navigation
├── CalendarViewRouter.tsx     # Routes to correct view
├── views/                     # View components
│   ├── DayView.tsx
│   ├── WeekView.tsx
│   ├── MonthView.tsx
│   └── AgendaView.tsx
├── components/                 # Shared UI components
│   ├── EventCard.tsx
│   ├── Timeline.tsx
│   ├── AllDayRow.tsx
│   ├── NowIndicator.tsx
│   └── EmptyState.tsx
├── hooks/                      # Shared logic
│   ├── useCalendarEvents.ts
│   ├── useCalendarNavigation.ts
│   ├── useCalendarGestures.ts
│   └── useCalendarFilters.ts
└── types.ts                    # Shared types
```

## Usage

### SpacesOS
```tsx
<CalendarShell
  context="spaces"
  scope={{ spaceId, householdId }}
  ui={{ showQuickActions: true }}
/>
```

### Planner
```tsx
<PlannerLayout>
  <CalendarShell
    context="planner"
    scope={{ userId }}
    ui={{ showQuickActions: false }}
  />
</PlannerLayout>
```

## Maintenance

- **One place** to fix calendar bugs
- **One place** to add calendar features
- Changes affect **both** SpacesOS and Planner automatically
- No code duplication = lower maintenance cost
