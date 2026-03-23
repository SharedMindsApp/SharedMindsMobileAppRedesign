# Widget Colour Customisation System

## Overview

A comprehensive widget color customization system that allows users to customize the color of each widget type via the Add Widget menu. Colors persist across all three theme modes (Light, Dark, Neon Dark) while respecting each theme's visual rules.

## Features

### Widget-Type Level Customization
- Colors are configured **per widget type** (e.g., all "Files" widgets, all "Notes" widgets)
- Not per-instance customization
- 8 color options available: Cyan, Blue, Violet, Pink, Orange, Green, Yellow, Neutral

### Theme-Specific Behavior

#### Light Mode
- Soft pastel backgrounds with subtle tints
- Color affects: background fill, header accents, icons
- Example: `background: rgba(cyan, 0.12); border: rgba(cyan, 0.25)`

#### Dark Mode
- Accent colors on dark backgrounds
- Color affects: header strip, icons, subtle border glow
- Background remains dark-neutral
- Example: `background: rgba(cyan, 0.08); border: rgba(cyan, 0.3)`

#### Neon Dark Mode (Critical)
- **ONLY affects rim glow and borders**
- **NO interior background tinting**
- Interior stays dark glass
- Example: Cyan border glow with holographic effect

## Implementation

### 1. Data Structure

```typescript
// Location: src/lib/uiPreferencesTypes.ts

export type WidgetColorToken =
  | 'cyan' | 'blue' | 'violet' | 'pink'
  | 'orange' | 'green' | 'yellow' | 'neutral';

export type WidgetColorPreferences = Record<WidgetTypeId, WidgetColorToken>;
```

### 2. Storage

Colors are persisted in:
- UI Preferences context
- Supabase `user_ui_preferences.custom_overrides` column
- Synced across devices and sessions

### 3. UI Components

#### Widget Toolbox with Color Picker
Location: `src/components/fridge-canvas/WidgetToolboxWithColorPicker.tsx`

**Behavior:**
1. User clicks a widget tile in Add Widget menu
2. Color picker panel appears showing 8 color swatches
3. User selects a color (applies to all widgets of that type)
4. Preview updates live in the widget tile
5. User clicks widget again to add it to canvas

**Clear Messaging:**
- "Widget Colour (applies to all [Type] widgets)"
- Color selection is global for that widget type

#### Canvas Widget
Location: `src/components/fridge-canvas/CanvasWidget.tsx`

**Changes:**
- Added `data-widget-color` attribute to widget root
- Added `data-widget-type` attribute for debugging
- Automatically applies color from UI preferences

### 4. CSS System

Location: `src/index.css`

**CSS Variables:**
```css
:root {
  --widget-cyan: 34, 211, 238;
  --widget-blue: 59, 130, 246;
  --widget-violet: 139, 92, 246;
  --widget-pink: 236, 72, 153;
  --widget-orange: 251, 146, 60;
  --widget-green: 34, 197, 94;
  --widget-yellow: 234, 179, 8;
  --widget-neutral: 148, 163, 184;
}
```

**Attribute-Based Styling:**
```css
/* Light Mode Example */
.theme-light [data-widget-color="cyan"] {
  background: rgba(var(--widget-cyan), 0.12) !important;
  border-color: rgba(var(--widget-cyan), 0.25) !important;
}

/* Dark Mode Example */
.theme-dark [data-widget-color="cyan"] {
  background: rgba(var(--widget-cyan), 0.08) !important;
  border-color: rgba(var(--widget-cyan), 0.3) !important;
}

/* Neon Dark Mode Example */
.theme-neon-dark [data-widget-color="cyan"] {
  border-color: rgba(var(--widget-cyan), 0.45) !important;
  box-shadow:
    0 0 0 1px rgba(var(--widget-cyan), 0.35),
    0 0 35px rgba(var(--widget-cyan), 0.45) !important;
}
```

### 5. API Methods

Location: `src/contexts/UIPreferencesContext.tsx`

```typescript
// Get color for a specific widget type
getWidgetColor(widgetType: WidgetTypeId): WidgetColorToken

// Set color for a widget type (persists to database)
setWidgetColor(widgetType: WidgetTypeId, color: WidgetColorToken): Promise<void>

// Get all widget colors
getWidgetColors(): WidgetColorPreferences
```

## Usage Example

```tsx
import { useUIPreferences } from '../../contexts/UIPreferencesContext';

function MyComponent() {
  const { getWidgetColor, setWidgetColor } = useUIPreferences();

  // Get current color for Files widgets
  const filesColor = getWidgetColor('files'); // Returns: 'cyan' | 'blue' | etc

  // Change color for Notes widgets
  const handleColorChange = async () => {
    await setWidgetColor('note', 'violet');
  };

  return (
    <div data-widget-color={filesColor}>
      {/* Widget content */}
    </div>
  );
}
```

## Supported Widget Types

All widget types support color customization:
- note
- reminder
- calendar
- goal
- habit
- habit_tracker
- achievements
- photo
- insight
- meal_planner
- grocery_list
- stack_card
- files
- collections
- tables

## Default Colors

```typescript
{
  note: 'yellow',
  reminder: 'pink',
  calendar: 'blue',
  goal: 'green',
  habit: 'orange',
  habit_tracker: 'cyan',
  achievements: 'yellow',
  photo: 'neutral',
  insight: 'violet',
  meal_planner: 'orange',
  grocery_list: 'cyan',
  stack_card: 'blue',
  files: 'neutral',
  collections: 'blue',
  tables: 'cyan',
}
```

## Guardrails

### Security
- Colors never affect text readability
- Sufficient contrast ratios maintained across all themes
- Proper WCAG compliance

### UX Rules
- No per-widget-instance colors (yet)
- No neon fill in Neon Dark mode (only glow)
- Respects reduced motion preferences
- Degrades gracefully if color data missing

### Performance
- Attribute-based CSS selector approach
- No JavaScript style calculations during render
- Efficient CSS custom properties system
- Minimal impact on paint/layout

## Migration

Existing widgets automatically migrate to the system:
- Widgets without color settings use default colors
- No database migration required
- Works immediately upon deployment

## Testing

### Manual Testing
1. Open Add Widget menu
2. Click a widget type
3. Color picker should appear
4. Select different colors
5. Widget tile should update live
6. Click widget again to add to canvas
7. Widget should have the selected color
8. Switch themes - color should adapt correctly
9. Refresh page - color preference should persist

### Theme Testing
- Light Mode: Background fill should be soft and pastel
- Dark Mode: Accent on dark background, no bright fill
- Neon Dark: Only rim glow, interior stays dark glass

## Success Criteria

✅ Users can pick a color in Add Widget menu
✅ Color applies to all widgets of that type
✅ Behavior differs correctly per theme
✅ Neon Dark remains holographic, not tinted
✅ Visual identity feels custom, premium, OS-like
✅ Colors persist across sessions and devices
✅ All widgets respect color settings
✅ Text remains readable in all color combinations

## Future Enhancements

Potential future features (not implemented):
- Custom hex color input
- Per-widget-instance colors
- Color themes/presets
- Import/export color configurations
- Color accessibility analyzer
- Gradient color options
