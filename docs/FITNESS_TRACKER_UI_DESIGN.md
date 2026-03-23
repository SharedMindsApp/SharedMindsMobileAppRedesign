# Intelligent Fitness Tracker - UI/UX Design Document

**Version:** 1.0  
**Date:** 2025-01-31  
**Related Documents:** 
- `FITNESS_TRACKER_DESIGN.md`
- `FITNESS_TRACKER_IMPLEMENTATION.md`

---

## Executive Summary

This document outlines the user interface and user experience design for the Intelligent Fitness Tracker. The design prioritizes minimal friction, neurodivergent accessibility, and non-judgmental presentation of movement data. Every design decision supports the core philosophy: movement as behavior to be understood and supported, not output to be measured and judged.

---

## 1. Design Philosophy & Principles

### 1.1 Core UI Principles

**1. Minimal Friction**
- One-tap actions where possible
- Optional fields clearly marked
- No required steps beyond activity type
- Quick recovery from errors

**2. Non-Judgmental Presentation**
- No red/yellow/green status indicators
- No "missed" or "failed" language
- No streak counters (unless user explicitly enables)
- No comparison to goals or others
- Neutral, observational language

**3. Neurodivergent-First**
- Reduced visual noise
- Clear information hierarchy
- Consistent patterns and placement
- Customizable interface elements
- Executive function support built-in

**4. Information Clarity**
- Observational insights, not directives
- Pattern visualization, not goal tracking
- Optional detail views
- Progressive disclosure

**5. Respectful of Capacity**
- No push notifications for "missed" sessions
- Gentle, optional prompts only
- Easy to pause/disable features
- No guilt-inducing elements

---

## 2. Visual Design System

### 2.1 Color Palette

**Primary Colors:**
```
Primary Blue:    #3B82F6 (rgb(59, 130, 246))
Primary Indigo:  #6366F1 (rgb(99, 102, 241))
Primary Purple:  #8B5CF6 (rgb(139, 92, 246))
```

**Neutral Colors:**
```
Background:     #FFFFFF (white)
Surface:         #F9FAFB (gray-50)
Border:          #E5E7EB (gray-200)
Text Primary:    #111827 (gray-900)
Text Secondary:  #6B7280 (gray-500)
Text Muted:      #9CA3AF (gray-400)
```

**Semantic Colors (Used Sparingly):**
```
Info:            #3B82F6 (blue-500)
Success:         #10B981 (emerald-500) - Only for positive reinforcement
Warning:         #F59E0B (amber-500) - Only for gentle suggestions
Error:           #EF4444 (red-500) - Only for system errors, never for user behavior
```

**Activity Type Colors (Optional, User Customizable):**
```
Strength:        #DC2626 (red-600)
Cardio:          #EA580C (orange-600)
Flexibility:     #7C3AED (violet-600)
Skill Practice:  #059669 (emerald-600)
Team Sports:     #0284C7 (sky-600)
Individual:      #C026D3 (fuchsia-600)
Recovery:        #0891B2 (cyan-600)
Play:            #F59E0B (amber-600)
Other:           #6B7280 (gray-500)
```

**Design Note:** Colors are used for organization and recognition, not for judgment. No "good" or "bad" color associations.

### 2.2 Typography

**Font Family:**
- Primary: System font stack (San Francisco on iOS, Segoe UI on Windows, Roboto on Android)
- Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`

**Type Scale:**
```
Display:     32px / 40px (2rem / 2.5rem) - Page titles only
Heading 1:   24px / 32px (1.5rem / 2rem) - Section headers
Heading 2:   20px / 28px (1.25rem / 1.75rem) - Subsection headers
Heading 3:   18px / 24px (1.125rem / 1.5rem) - Card titles
Body Large:  16px / 24px (1rem / 1.5rem) - Primary body text
Body:        14px / 20px (0.875rem / 1.25rem) - Secondary text
Body Small:  12px / 16px (0.75rem / 1rem) - Captions, labels
```

**Font Weights:**
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700 (used sparingly)

### 2.3 Spacing System

**Base Unit:** 4px

```
xs:   4px   (0.25rem)
sm:   8px   (0.5rem)
md:   12px  (0.75rem)
base: 16px  (1rem)
lg:   20px  (1.25rem)
xl:   24px  (1.5rem)
2xl:  32px  (2rem)
3xl:  48px  (3rem)
4xl:  64px  (4rem)
```

### 2.4 Border Radius

```
none:  0px
sm:    4px
base:  8px
md:    12px
lg:    16px
xl:    20px
full:  9999px
```

### 2.5 Shadows

```
sm:    0 1px 2px 0 rgba(0, 0, 0, 0.05)
base:  0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)
md:    0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)
lg:    0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)
xl:    0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)
```

### 2.6 Animation & Transitions

**Principles:**
- Subtle and purposeful
- Never distracting
- Respects reduced motion preferences
- Quick feedback (100-200ms for interactions)

**Timing Functions:**
```
ease-in-out:  For most transitions
ease-out:     For entrances
ease-in:      For exits
```

**Duration:**
```
fast:   100ms  - Hover states, quick feedback
base:   150ms  - Standard transitions
slow:   200ms  - Complex animations
```

---

## 3. Information Architecture

### 3.1 Primary Navigation

**Bottom Navigation (Mobile):**
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Quick     │  Patterns   │  History    │  Insights   │
│    Log      │             │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Sidebar Navigation (Desktop):**
```
┌─────────────────────────┐
│  Quick Log              │
│  Patterns                │
│  History                 │
│  Insights                │
│  ─────────────           │
│  Settings                │
└─────────────────────────┘
```

### 3.2 Screen Hierarchy

**Level 1: Main Screens**
1. **Quick Log** (Primary entry point)
2. **Patterns** (Observational insights)
3. **History** (Chronological log)
4. **Insights** (Optional reflections)
5. **Settings** (Customization)

**Level 2: Detail Screens**
- Session Detail
- Pattern Detail
- Insight Detail
- Activity Detail

**Level 3: Modal/Overlay**
- Full Log Form
- Pattern Explanation
- Insight Actions

---

## 4. Component Designs

### 4.1 Quick Log Component

**Purpose:** Ultra-low-friction movement logging

**Mobile Design:**
```
┌─────────────────────────────────────┐
│  Quick Log                          │
│                                     │
│  ┌─────────┐  ┌─────────┐         │
│  │ Walking │  │ Running │         │
│  └─────────┘  └─────────┘         │
│                                     │
│  ┌─────────┐  ┌─────────┐         │
│  │Strength │  │  Yoga   │         │
│  └─────────┘  └─────────┘         │
│                                     │
│  ┌─────────┐  ┌─────────┐         │
│  │ Cycling │  │  Other  │         │
│  └─────────┘  └─────────┘         │
│                                     │
│  [ + Add More Details ]            │
│                                     │
│  Recent Activities:                │
│  • Strength Training (2 days ago)  │
│  • Yoga (3 days ago)               │
└─────────────────────────────────────┘
```

**Design Specifications:**
- Large, tappable buttons (minimum 44x44px)
- Grid layout: 2 columns on mobile, 3-4 on tablet/desktop
- Buttons use activity type colors (optional)
- "Add More Details" opens full log form
- Recent activities shown below for quick re-logging

**Interaction:**
- Tap button → Session logged immediately
- Optional: Show brief confirmation (toast, 2 seconds)
- If user wants to add details, tap "Add More Details" or long-press button

**Desktop Design:**
- Similar layout, wider grid (3-4 columns)
- Hover states on buttons
- Keyboard navigation supported

### 4.2 Full Log Form

**Purpose:** Detailed movement logging (optional)

**Design:**
```
┌─────────────────────────────────────┐
│  Log Movement                    [×] │
├─────────────────────────────────────┤
│                                     │
│  Activity Type *                   │
│  ┌─────────────────────────────┐  │
│  │ [Select or type...]        ▼│  │
│  └─────────────────────────────┘  │
│                                     │
│  When did this happen?              │
│  ○ Just now                         │
│  ○ Earlier today                     │
│  ○ Yesterday                        │
│  ○ [Pick date/time]                 │
│                                     │
│  Optional Details                   │
│  ┌─────────────────────────────┐  │
│  │ Duration (minutes)          │  │
│  └─────────────────────────────┘  │
│                                     │
│  How did it feel?                   │
│  [😊] [😐] [😕] [😟] [😣]          │
│                                     │
│  Intensity (optional)              │
│  [1] [2] [3] [4] [5]                │
│  Very Light      →      Maximal     │
│                                     │
│  Body State (optional)             │
│  ○ Fresh  ○ Sore  ○ Fatigued       │
│  ○ Stiff  ○ Injured                │
│                                     │
│  Notes (optional)                   │
│  ┌─────────────────────────────┐  │
│  │                             │  │
│  │                             │  │
│  └─────────────────────────────┘  │
│                                     │
│  [Cancel]        [Save Movement]   │
└─────────────────────────────────────┘
```

**Design Specifications:**
- Modal overlay (mobile) or side panel (desktop)
- Clear separation of required vs. optional fields
- Progressive disclosure: Basic fields first, details below
- Emoji-based enjoyment scale (more intuitive)
- Visual intensity slider with labels
- Large tap targets for all inputs

**Accessibility:**
- All form fields properly labeled
- Keyboard navigation supported
- Screen reader announcements
- Focus management

### 4.3 Pattern View

**Purpose:** Show observational movement patterns (not goals)

**Mobile Design:**
```
┌─────────────────────────────────────┐
│  Movement Patterns                   │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ Frequency Pattern            │  │
│  │                              │  │
│  │  Average: 3.2 sessions/week │  │
│  │  ────────────────────────    │  │
│  │  [Simple line chart]        │  │
│  │                              │  │
│  │  You tend to move more on    │  │
│  │  weekends.                   │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ Sustainability               │  │
│  │                              │  │
│  │  [Circular progress, neutral] │  │
│  │  78%                         │  │
│  │                              │  │
│  │  This pattern appears        │  │
│  │  sustainable.                │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ Activity Variety            │  │
│  │                              │  │
│  │  Strength: ████████ 40%     │  │
│  │  Cardio:    ████ 20%        │  │
│  │  Yoga:      ██████ 30%      │  │
│  │  Other:     ██ 10%          │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Design Specifications:**
- Card-based layout
- Neutral visualizations (no red/yellow/green)
- Observational language only
- Tap cards to see more detail
- No comparison to goals or others

**Key Visualizations:**
1. **Frequency Chart:** Simple line chart showing sessions over time
2. **Sustainability Indicator:** Circular progress (neutral color, not green/red)
3. **Activity Distribution:** Horizontal bar chart
4. **Intensity Pattern:** Heat map or line chart
5. **Recovery Pattern:** Timeline showing rest days

**Desktop Design:**
- Wider cards, side-by-side layout
- More detailed visualizations
- Hover states for additional info

### 4.4 History View

**Purpose:** Chronological log of movement sessions

**Mobile Design:**
```
┌─────────────────────────────────────┐
│  Movement History                    │
│                                     │
│  [Filter] [Sort]                    │
│                                     │
│  Today                               │
│  ┌─────────────────────────────┐   │
│  │ 🏋️ Strength Training        │   │
│  │ 45 min • High intensity     │   │
│  │ 2:00 PM                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  Yesterday                           │
│  ┌─────────────────────────────┐   │
│  │ 🧘 Yoga                      │   │
│  │ 30 min • Light intensity     │   │
│  │ 6:00 PM                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  3 days ago                          │
│  ┌─────────────────────────────┐   │
│  │ 🏃 Running                    │   │
│  │ 25 min • Moderate intensity  │   │
│  │ 7:00 AM                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Load More]                         │
└─────────────────────────────────────┘
```

**Design Specifications:**
- Grouped by date (Today, Yesterday, This Week, etc.)
- Minimal card design
- Activity icon/emoji for quick recognition
- Tap to view/edit details
- Infinite scroll or "Load More" button
- Filter by activity type, date range
- Sort by date (newest/oldest)

**Empty State:**
```
┌─────────────────────────────────────┐
│                                     │
│         [Illustration]              │
│                                     │
│  No movement logged yet            │
│                                     │
│  Tap "Quick Log" to get started     │
│                                     │
│  [Quick Log]                        │
│                                     │
└─────────────────────────────────────┘
```

### 4.5 Insights View

**Purpose:** Optional observational insights and suggestions

**Mobile Design:**
```
┌─────────────────────────────────────┐
│  Insights                            │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ Pattern Observation         │  │
│  │                              │  │
│  │ You've maintained a          │  │
│  │ consistent movement pattern  │  │
│  │ for 6 weeks. That's a        │  │
│  │ stable rhythm.               │  │
│  │                              │  │
│  │ [Dismiss]                    │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ Capacity Insight             │  │
│  │                              │  │
│  │ Your recent pattern          │  │
│  │ suggests you might benefit   │  │
│  │ from lighter movement or     │  │
│  │ more recovery.               │  │
│  │                              │  │
│  │ [View Suggestion] [Dismiss]  │  │
│  └─────────────────────────────┘  │
│                                     │
│  [Generate New Insights]            │
└─────────────────────────────────────┘
```

**Design Specifications:**
- Card-based layout
- Clear insight type label
- Observational, non-directive language
- Optional action buttons
- Dismissible (no pressure to act)
- "Generate New Insights" button (manual trigger)

**Insight Types:**
1. **Pattern Observation:** Neutral observations
2. **Capacity Insight:** Suggestions based on patterns
3. **Activity Insight:** Observations about activity choices
4. **Sustainability Insight:** Long-term pattern validation
5. **Suggestion:** Optional recommendations

**Tone Guidelines:**
- ✅ "You seem to..."
- ✅ "Your pattern suggests..."
- ✅ "That's a stable rhythm"
- ❌ "You should..."
- ❌ "You need to..."
- ❌ "You're not..."

### 4.6 Settings View

**Purpose:** Customization and preferences

**Mobile Design:**
```
┌─────────────────────────────────────┐
│  Settings                            │
│                                     │
│  Quick Log                          │
│  ┌─────────────────────────────┐  │
│  │ Quick Log Activities        │  │
│  │ [Edit]                      │  │
│  └─────────────────────────────┘  │
│                                     │
│  Preferences                        │
│  ┌─────────────────────────────┐  │
│  │ Show insights               │  │
│  │ [Toggle: ON]                │  │
│  └─────────────────────────────┘  │
│  ┌─────────────────────────────┐  │
│  │ Show pattern visualizations │  │
│  │ [Toggle: ON]                │  │
│  └─────────────────────────────┘  │
│                                     │
│  Reminders (Optional)               │
│  ┌─────────────────────────────┐  │
│  │ Gentle prompts              │  │
│  │ [Toggle: OFF]               │  │
│  └─────────────────────────────┘  │
│                                     │
│  Appearance                         │
│  ┌─────────────────────────────┐  │
│  │ Color scheme                 │  │
│  │ [Light] [Dark] [Auto]        │  │
│  └─────────────────────────────┘  │
│  ┌─────────────────────────────┐  │
│  │ Reduce motion                │  │
│  │ [Toggle: OFF]                │  │
│  └─────────────────────────────┘  │
│                                     │
│  Data                                │
│  ┌─────────────────────────────┐  │
│  │ Export data                  │  │
│  └─────────────────────────────┘  │
│  ┌─────────────────────────────┐  │
│  │ Delete all data              │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Design Specifications:**
- Grouped sections
- Clear labels
- Toggle switches for on/off preferences
- Destructive actions (delete) clearly separated
- Confirmation required for destructive actions

---

## 5. User Flows

### 5.1 Quick Log Flow

```
[Quick Log Screen]
    │
    ├─→ [Tap Activity Button]
    │       │
    │       ├─→ [Session Logged]
    │       │       │
    │       │       └─→ [Brief Confirmation Toast]
    │       │
    │       └─→ [Long Press Activity Button]
    │               │
    │               └─→ [Full Log Form Opens]
    │                       │
    │                       └─→ [Fill Details] → [Save]
    │
    └─→ [Tap "Add More Details"]
            │
            └─→ [Full Log Form Opens]
```

### 5.2 View Pattern Flow

```
[Patterns Screen]
    │
    ├─→ [View Frequency Pattern]
    │       │
    │       └─→ [Pattern Detail Modal]
    │               │
    │               └─→ [Explanation] → [Close]
    │
    ├─→ [View Sustainability]
    │       │
    │       └─→ [Sustainability Detail]
    │
    └─→ [View Activity Distribution]
            │
            └─→ [Activity Detail]
```

### 5.3 Insight Flow

```
[Insights Screen]
    │
    ├─→ [View Insight]
    │       │
    │       ├─→ [Dismiss] → [Insight Removed]
    │       │
    │       └─→ [View Suggestion] → [Suggestion Detail]
    │                                   │
    │                                   └─→ [Optional Action]
    │
    └─→ [Generate New Insights]
            │
            └─→ [Processing] → [New Insights Shown]
```

---

## 6. Responsive Design

### 6.1 Breakpoints

```
Mobile:     320px - 767px
Tablet:     768px - 1023px
Desktop:    1024px+
Large:      1280px+
```

### 6.2 Layout Adaptations

**Mobile:**
- Single column layout
- Bottom navigation
- Full-screen modals
- Stacked cards

**Tablet:**
- 2-column layout where appropriate
- Side navigation (collapsible)
- Modal overlays (centered)
- Grid layouts (2-3 columns)

**Desktop:**
- 3-column layout (main content + sidebar)
- Persistent sidebar navigation
- Side panels for forms
- Grid layouts (3-4 columns)

### 6.3 Touch Targets

**Minimum Sizes:**
- Primary actions: 44x44px (mobile), 40x40px (desktop)
- Secondary actions: 36x36px
- Text links: Minimum 32px height with padding
- Form inputs: Minimum 44px height

**Spacing:**
- Minimum 8px between touch targets
- Comfortable padding in cards (16px+)

---

## 7. Accessibility

### 7.1 WCAG 2.1 Compliance

**Level AA Target:**
- Color contrast: 4.5:1 for text, 3:1 for UI components
- Keyboard navigation: All interactive elements accessible
- Screen reader support: Proper ARIA labels and roles
- Focus indicators: Clear, visible focus states

### 7.2 Neurodivergent Considerations

**Visual:**
- Reduced visual noise
- Clear information hierarchy
- Consistent patterns
- Customizable color schemes
- Option to reduce motion

**Cognitive:**
- Simple, clear language
- No overwhelming information
- Progressive disclosure
- Clear error messages
- No time pressure

**Motor:**
- Large touch targets
- Generous spacing
- No precision required
- Keyboard alternatives
- Voice input support

### 7.3 Screen Reader Support

**Announcements:**
- "Movement logged successfully"
- "Pattern updated"
- "New insight available" (optional)
- Form field labels
- Button purposes

**Structure:**
- Proper heading hierarchy
- Landmark regions
- List markup
- Form labels
- Button labels

---

## 8. Micro-interactions

### 8.1 Logging Feedback

**Quick Log:**
- Button press: Slight scale down (0.95)
- Success: Brief checkmark animation
- Toast notification: Slide in from bottom, auto-dismiss after 2s

**Full Log:**
- Form submission: Loading state on button
- Success: Modal closes with fade
- Error: Inline error message, field highlighted

### 8.2 Pattern Updates

**Visualization Updates:**
- Smooth transitions when data changes
- No jarring jumps
- Respect reduced motion preference

**Insight Generation:**
- Subtle pulse on "Generate" button when processing
- New insights slide in from right
- Dismiss animations: Fade out and slide up

### 8.3 Navigation

**Page Transitions:**
- Fade transition (150ms)
- Respect reduced motion
- Maintain scroll position where appropriate

**Tab Switching:**
- Active tab indicator: Underline animation
- Content fade in/out

---

## 9. Empty States

### 9.1 No Sessions Logged

```
┌─────────────────────────────────────┐
│                                     │
│         [Illustration: Person       │
│          in motion, simple]         │
│                                     │
│  No movement logged yet             │
│                                     │
│  Tap "Quick Log" to record your     │
│  first movement session.            │
│                                     │
│  [Quick Log]                        │
│                                     │
└─────────────────────────────────────┘
```

**Tone:** Encouraging, not pressuring

### 9.2 No Patterns Yet

```
┌─────────────────────────────────────┐
│                                     │
│  [Illustration: Chart/graph]        │
│                                     │
│  Patterns will appear here         │
│                                     │
│  Log a few movement sessions to    │
│  start seeing your patterns.        │
│                                     │
└─────────────────────────────────────┘
```

**Tone:** Informative, patient

### 9.3 No Insights Available

```
┌─────────────────────────────────────┐
│                                     │
│  [Illustration: Lightbulb]          │
│                                     │
│  No insights yet                    │
│                                     │
│  Insights will appear as the       │
│  system learns your movement        │
│  patterns.                          │
│                                     │
│  [Generate Insights]                │
│                                     │
└─────────────────────────────────────┘
```

**Tone:** Informative, optional

---

## 10. Error States

### 10.1 Form Errors

**Design:**
- Inline error messages below field
- Red border on field (subtle)
- Clear error message
- Suggestion for fix

**Example:**
```
Activity Type *
┌─────────────────────────────┐
│ [Invalid entry]            │ ← Red border
└─────────────────────────────┘
Please select an activity type
```

### 10.2 Network Errors

**Design:**
- Toast notification
- Retry button
- Offline indicator if applicable

**Tone:**
- "Couldn't save movement. Please try again."
- Not: "Failed to save" (too harsh)

### 10.3 System Errors

**Design:**
- Full-screen error state
- Clear explanation
- Action to retry or contact support

**Tone:**
- Helpful, not alarming
- "Something went wrong. We're looking into it."

---

## 11. Loading States

### 11.1 Skeleton Screens

**Pattern View:**
```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Design:**
- Animated shimmer effect
- Matches content layout
- Respects reduced motion

### 11.2 Progress Indicators

**Pattern Analysis:**
- Subtle spinner
- "Analyzing patterns..." message
- Non-blocking (can navigate away)

**Insight Generation:**
- Pulse animation on button
- "Generating insights..." message

---

## 12. Dark Mode

### 12.1 Color Adaptations

**Background:**
- Light: #FFFFFF
- Dark: #111827 (gray-900)

**Surface:**
- Light: #F9FAFB (gray-50)
- Dark: #1F2937 (gray-800)

**Text:**
- Light: #111827 (gray-900)
- Dark: #F9FAFB (gray-50)

**Borders:**
- Light: #E5E7EB (gray-200)
- Dark: #374151 (gray-700)

### 12.2 Implementation

- System preference detection
- Manual toggle in settings
- Smooth transition between modes
- Preserve user preference

---

## 13. Component Library

### 13.1 Button Variants

**Primary Button:**
- Background: Primary blue
- Text: White
- Size: 44px height (mobile), 40px (desktop)
- Padding: 12px 24px
- Border radius: 8px

**Secondary Button:**
- Background: Transparent
- Border: 1px solid gray-300
- Text: gray-900
- Hover: gray-50 background

**Text Button:**
- Background: Transparent
- Text: Primary blue
- Hover: blue-50 background

**Icon Button:**
- Circular or square
- Minimum 44x44px
- Icon centered
- Hover: subtle background

### 13.2 Card Component

**Default Card:**
- Background: White (light) / gray-800 (dark)
- Border: 1px solid gray-200 (light) / gray-700 (dark)
- Border radius: 12px
- Padding: 16px
- Shadow: sm (base shadow)

**Interactive Card:**
- Hover: shadow-md
- Cursor: pointer
- Active: scale(0.98)

### 13.3 Form Inputs

**Text Input:**
- Height: 44px
- Border: 1px solid gray-300
- Border radius: 8px
- Padding: 12px 16px
- Focus: border-primary-blue, ring-2 ring-blue-100

**Select:**
- Same as text input
- Dropdown arrow indicator

**Toggle Switch:**
- Width: 44px
- Height: 24px
- Thumb: 20px
- Active: Primary blue
- Inactive: gray-300

**Radio/Checkbox:**
- Size: 20x20px
- Border: 2px solid gray-300
- Checked: Primary blue
- Focus: ring-2 ring-blue-100

### 13.4 Toast Notification

**Design:**
- Position: Bottom center (mobile), top right (desktop)
- Background: gray-900 with opacity
- Text: White
- Border radius: 8px
- Padding: 12px 16px
- Auto-dismiss: 2-3 seconds
- Slide in animation

---

## 14. Design Tokens

### 14.1 Spacing Tokens

```typescript
const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  base: '1rem',     // 16px
  lg: '1.25rem',    // 20px
  xl: '1.5rem',     // 24px
  '2xl': '2rem',    // 32px
  '3xl': '3rem',    // 48px
  '4xl': '4rem',    // 64px
};
```

### 14.2 Color Tokens

```typescript
const colors = {
  primary: {
    blue: '#3B82F6',
    indigo: '#6366F1',
    purple: '#8B5CF6',
  },
  neutral: {
    background: '#FFFFFF',
    surface: '#F9FAFB',
    border: '#E5E7EB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
  },
  // ... activity colors, semantic colors
};
```

### 14.3 Typography Tokens

```typescript
const typography = {
  fontFamily: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  fontSize: {
    display: ['2rem', { lineHeight: '2.5rem' }],
    h1: ['1.5rem', { lineHeight: '2rem' }],
    h2: ['1.25rem', { lineHeight: '1.75rem' }],
    h3: ['1.125rem', { lineHeight: '1.5rem' }],
    body: ['1rem', { lineHeight: '1.5rem' }],
    bodySmall: ['0.875rem', { lineHeight: '1.25rem' }],
    caption: ['0.75rem', { lineHeight: '1rem' }],
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};
```

---

## 15. Prototype Specifications

### 15.1 Key Screens to Prototype

1. **Quick Log Screen** (Primary)
2. **Full Log Form** (Modal)
3. **Pattern View** (Main screen)
4. **History View** (List)
5. **Insights View** (Cards)
6. **Settings** (Form)

### 15.2 Interaction Prototypes

1. **Quick Log Flow** (Tap → Log → Feedback)
2. **Pattern Detail** (Tap card → Modal)
3. **Insight Dismiss** (Swipe or tap)
4. **Form Submission** (Validation → Success)

### 15.3 Animation Prototypes

1. **Toast Notification** (Slide in/out)
2. **Modal Open/Close** (Fade + scale)
3. **Card Interactions** (Hover, press)
4. **Pattern Updates** (Smooth transitions)

---

## 16. Design Validation Checklist

### 16.1 Philosophy Alignment

- [ ] No judgmental language
- [ ] No goal-oriented visuals
- [ ] No streak counters (unless user enables)
- [ ] No "missed" or "failed" indicators
- [ ] Observational tone throughout

### 16.2 Neurodivergent Support

- [ ] Reduced visual noise
- [ ] Clear hierarchy
- [ ] Consistent patterns
- [ ] Large touch targets
- [ ] Customizable elements
- [ ] Reduced motion option

### 16.3 Accessibility

- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast
- [ ] Focus indicators
- [ ] Error messages

### 16.4 Usability

- [ ] Minimal friction logging
- [ ] Clear navigation
- [ ] Helpful empty states
- [ ] Clear error states
- [ ] Loading feedback
- [ ] Success confirmation

---

## 17. Implementation Notes

### 17.1 Framework Considerations

**Recommended:**
- React + TypeScript
- Tailwind CSS (for utility-first styling)
- Framer Motion (for animations, respects reduced motion)
- React Hook Form (for form management)
- React Query (for data fetching)

### 17.2 Component Structure

```
src/
  components/
    fitness-tracker/
      QuickLog.tsx
      FullLogForm.tsx
      PatternView.tsx
      PatternCard.tsx
      HistoryView.tsx
      SessionCard.tsx
      InsightsView.tsx
      InsightCard.tsx
      SettingsView.tsx
  lib/
    fitness-tracker/
      design-tokens.ts
      components/
        Button.tsx
        Card.tsx
        Input.tsx
        Toast.tsx
```

### 17.3 Styling Approach

**Tailwind CSS Configuration:**
- Custom color palette
- Custom spacing scale
- Custom typography scale
- Dark mode support
- Reduced motion support

**Component Styling:**
- Utility-first with Tailwind
- Custom components for complex patterns
- CSS variables for theming
- Responsive utilities

---

## 18. Design Iteration Process

### 18.1 User Testing

**Target Users:**
- Neurodivergent individuals (ADHD, autism, etc.)
- People who have abandoned fitness trackers
- Movement enthusiasts of all types

**Testing Focus:**
- Friction in logging
- Clarity of patterns
- Tone of insights
- Overall comfort with interface

### 18.2 Iteration Cycles

1. **Design** → Prototype → Test → Refine
2. **Weekly design reviews**
3. **User feedback integration**
4. **Accessibility audits**
5. **Performance optimization**

---

## 19. Success Metrics (UI/UX)

### 19.1 Usability Metrics

- Time to log first session (< 30 seconds)
- Time to understand patterns (< 2 minutes)
- Error rate in logging (< 5%)
- User satisfaction (self-reported)

### 19.2 Engagement Metrics

- Return rate after first use
- Frequency of logging
- Feature discovery rate
- Settings customization rate

### 19.3 Accessibility Metrics

- Screen reader compatibility score
- Keyboard navigation completeness
- Color contrast compliance
- WCAG 2.1 AA compliance

---

## 20. Conclusion

This UI design document provides a comprehensive guide for building an interface that supports the Intelligent Fitness Tracker's core philosophy: movement as behavior to be understood and supported, not output to be measured and judged.

**Key Design Principles:**
1. **Minimal Friction:** One-tap logging, optional details
2. **Non-Judgmental:** No goals, streaks, or comparisons
3. **Neurodivergent-First:** Reduced noise, clear hierarchy, customizable
4. **Observational:** Patterns and insights, not directives
5. **Respectful:** No pressure, no guilt, no shame

**Next Steps:**
1. Create high-fidelity mockups
2. Build interactive prototypes
3. Conduct user testing
4. Iterate based on feedback
5. Begin implementation

---

**Document Status:** Ready for Review  
**Last Updated:** 2025-01-31
