# Frosted Glass Neon Effect - MANDATORY GLOBAL SPEC

## CRITICAL: Apply to ROOT Container Only

The frosted glass effect **MUST** be applied to the **outermost container** of each widget.
NOT to inner elements, headers, or child components.

## Exact Implementation (Non-Negotiable)

```tsx
// ROOT container className for ALL widgets in Neon Dark mode:
className={`your-layout-classes ${
  isNeonMode
    ? 'bg-[rgba(10,14,30,0.55)] backdrop-blur-[18px] saturate-[1.4] border border-[rgba(80,200,255,0.25)] rounded-[18px] shadow-[0_0_0_1px_rgba(80,200,255,0.15),0_0_25px_rgba(0,180,255,0.25),inset_0_0_12px_rgba(255,255,255,0.05)] hover:shadow-[0_0_0_1px_rgba(120,220,255,0.35),0_0_40px_rgba(0,200,255,0.45)] transition-all duration-[180ms] ease-out'
    : 'bg-white dark:bg-slate-700'
}`}
```

### Breakdown:

**Background (Semi-transparent dark glass)**
```tsx
bg-[rgba(10,14,30,0.55)]
```

**Backdrop Filter (Glass blur effect)**
```tsx
backdrop-blur-[18px] saturate-[1.4]
```
Note: This creates the "see-through" frosted glass effect

**Border (Subtle neon edge)**
```tsx
border border-[rgba(80,200,255,0.25)] rounded-[18px]
```

**Glow (Neon lighting)**
```tsx
shadow-[0_0_0_1px_rgba(80,200,255,0.15),0_0_25px_rgba(0,180,255,0.25),inset_0_0_12px_rgba(255,255,255,0.05)]
```

**Hover State (Intensified glow)**
```tsx
hover:shadow-[0_0_0_1px_rgba(120,220,255,0.35),0_0_40px_rgba(0,200,255,0.45)]
```

**Transition**
```tsx
transition-all duration-[180ms] ease-out
```

## Inner Content Styling

Once the root container has the glass effect, inner content should use:

### Text Colors
- **Headings**: `text-cyan-50` (bright white with cyan tint)
- **Body text**: `text-cyan-100` or `text-cyan-200`
- **Icons**: `text-cyan-300`
- **Muted text**: `text-cyan-400/70`

### Inner Elements
- **Borders**: `border-cyan-500/30` or `border-[rgba(80,200,255,0.2)]`
- **Backgrounds** (if needed): `bg-[rgba(15,23,42,0.3)]` (very subtle)
- **Buttons**: `bg-[rgba(6,182,212,0.15)] hover:bg-[rgba(6,182,212,0.25)]`

## Widgets That MUST Use This Pattern

Every single widget in the Spaces UI:
- FilesWidget
- CollectionsWidget
- StackCardsWidget
- CalendarWidgetCore (all view modes)
- NoteWidget
- GoalWidgetCore
- ReminderWidgetCore
- HabitCanvasWidget
- HabitTrackerWidget
- MealPlannerWidget
- GroceryListWidget
- AchievementsWidget
- InsightCanvasWidget
- TablesCanvasWidget
- PhotoCanvasWidget
- GraphicsCanvasWidget

## Validation Checklist

✅ Background is semi-transparent (can see through to grid)
✅ Strong blur effect makes content behind look frosted
✅ Subtle cyan neon border visible
✅ Soft glow around edges
✅ Hover intensifies the glow
✅ NO solid backgrounds blocking transparency
✅ Consistent across ALL widgets

## Common Mistakes to Avoid

❌ Applying effect to inner divs instead of root
❌ Using solid backgrounds that block transparency
❌ Forgetting backdrop-blur (this is what makes it "glass")
❌ Weak or missing glow effects
❌ Inconsistent border radius
❌ Light theme colors in neon mode

## Visual Target

Think: VisionOS × Blade Runner × High-end Sci-Fi OS
- Floating glass panels
- Neon edge lighting
- Deep transparency
- Cinematic blur
- Subtle but visible glow
