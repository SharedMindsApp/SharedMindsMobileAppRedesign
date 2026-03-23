# Personal Planner Settings Guide

## Overview

The Personal Planner now has a comprehensive settings system that allows users to customize their planner experience. Settings are **scoped exclusively to the planner** and do not affect other parts of the application.

## Accessing Settings

A **Settings** icon appears in the top-right corner of the planner header (desktop only). Click it to open the Planner Settings modal.

## Features

### 1. Visual Style Presets

Choose from 5 predefined visual themes that affect the planner's colors, tones, and overall aesthetic:

#### Classic Planner
- **Description:** Neutral, soft paper tones with minimal color
- **Best for:** Everyone, universal appeal
- **Colors:** Soft greys and neutrals throughout

#### Bold & Structured
- **Description:** Darker accents, strong contrast, muted blues and greys
- **Best for:** Professional users, strong visual separation
- **Colors:** Deep blues, slates, and greys with high contrast

#### Calm & Minimal
- **Description:** Very low saturation, beige and grey tones, reduced visual noise
- **Best for:** ADHD-friendly, reduced distraction needs
- **Colors:** Muted beiges, stones, and neutrals

#### Bright & Playful
- **Description:** Colorful and expressive (current default)
- **Best for:** Creative users, children, expressive personalities
- **Colors:** Full spectrum of vibrant colors

#### High Contrast
- **Description:** Accessibility-focused with clear section separation
- **Best for:** Visual accessibility, maximum readability
- **Colors:** Black, white, and high-contrast greys

**Note:** Presets are instant-apply visual skins. No custom color picking is available.

### 2. Tab Layout & Order

Customize which tabs appear and in what order:

#### Features:
- **Reorder tabs** using up/down arrows
- **Show/hide tabs** using the eye icon
- **Left vs Right placement** is preserved
- **Core tabs** (Index, Daily, Weekly, Monthly) cannot be hidden

#### Usage:
1. Navigate to the "Tab Layout" section in settings
2. Use arrow buttons to reorder tabs within their side (left or right)
3. Click the eye icon to show or hide optional tabs
4. Changes apply immediately to the planner UI

### 3. Comfort Settings

Fine-tune spacing and visual intensity:

#### Spacing Options:
- **Compact:** More content visible, tighter spacing
- **Comfortable:** Default, easier to read

#### Toggles:
- **Hide secondary sections:** Simplify pages by hiding optional content
- **Reduce color intensity:** Soften tab colors for subtler appearance

## Technical Implementation

### Storage
- Settings are stored in `user_ui_preferences.custom_overrides` under the key `planner_settings`
- Persists across sessions
- User-specific (not global)

### Default Settings
All users start with the "Bright & Playful" preset and all tabs enabled.

### Scope
Settings **only** affect:
- Planner book background colors
- Planner tab colors and arrangement
- Planner spacing and padding
- Planner header styling

Settings **do not** affect:
- Dashboard
- Spaces
- Widgets globally
- Any other app sections

## Data Structure

```typescript
interface PlannerSettings {
  stylePreset: 'classic' | 'bold-structured' | 'calm-minimal' | 'bright-playful' | 'high-contrast';
  tabConfig: PlannerTabConfig[];
  comfort: {
    spacing: 'compact' | 'comfortable';
    hideSecondary: boolean;
    reduceColorIntensity: boolean;
  };
}
```

## Usage Example

1. Open planner (`/planner/*`)
2. Click Settings icon in header
3. Choose "Calm & Minimal" preset
4. Switch to "Tab Layout" tab
5. Hide "Education" and "Travel" tabs
6. Reorder "Social" to appear first on right side
7. Switch to "Comfort" tab
8. Select "Compact" spacing
9. Enable "Reduce color intensity"
10. Click "Save Changes"

The planner instantly updates with your preferences.

## Reset to Defaults

Click "Reset to Defaults" in the settings footer to restore all settings to the original "Bright & Playful" configuration.

## Mobile Support

- Settings modal is fully responsive
- Tab reordering works on mobile
- Mobile bottom tabs respect visibility and order settings
- Settings button is desktop-only (space constraints on mobile header)

## Identity & Comfort

This feature is designed to support **identity and comfort**, not productivity optimization. The goal is to allow users to make the planner feel like *their* space, aligned with their visual preferences and cognitive needs.
