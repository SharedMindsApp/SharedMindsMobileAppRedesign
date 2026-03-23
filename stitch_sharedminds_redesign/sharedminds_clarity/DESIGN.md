# Design System Specification: The Cognitive Sanctuary

## 1. Overview & Creative North Star
**Creative North Star: "The Mindful Curator"**
This design system rejects the frantic, high-density "productivity dashboard" in favor of a serene, editorial experience. It is designed specifically for the ADHD brain, where cognitive load is the enemy and clarity is the cure. By moving away from rigid grids and industrial borders, we embrace **Organic Flow**—a layout strategy that uses intentional asymmetry, generous breathing room (whitespace), and soft, layered depth to guide the eye without overstimulating the senses.

The goal is to transition the user from a state of "Executive Dysfunction" to "Flow" through a UI that feels more like a high-end wellness journal than a corporate tool.

---

## 2. Colors & Surface Philosophy
Color is used as a functional anchor, not just decoration. We prioritize "Tonal Signaling" over structural lines.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts or subtle tonal transitions. Use `surface-container-low` (#f2f4f6) sections against a `surface` (#f9f9fb) background to create definition.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-transparent materials.
*   **Base:** `surface` (#f9f9fb)
*   **Nesting Level 1:** `surface-container-low` (#f2f4f6) for large content areas.
*   **Nesting Level 2:** `surface-container` (#eceef1) for grouped elements.
*   **Nesting Level 3 (The Focus Card):** `surface-container-lowest` (#ffffff) for the primary interactive element on the screen.

### The "Glass & Gradient" Rule
To elevate the experience, use **Backdrop Blur** (Glassmorphism) for floating navigation bars or overlays. 
*   **Signature Texture:** Use a subtle linear gradient from `primary` (#005bc4) to `primary-container` (#4388fd) at a 135° angle for hero CTAs. This adds "soul" and depth that prevents the app from feeling flat or sterile.

### Theme Variants
*   **Standard Dark:** Uses `inverse_surface` (#0c0e10) as the base. Low-contrast text prevents eye strain in low light.
*   **Neon-Dark:** Designed for "Dopamine-Seeking" brain states. High-contrast primary accents (`primary_fixed`: #4388fd) set against the deepest blacks to make interactive elements "pop" and sustain engagement.

---

## 3. Typography: Editorial Clarity
The typography system uses a dual-font approach to balance authority with approachability.

*   **The Display Scale (Manrope):** Used for Headlines (`headline-lg` 2rem, `display-sm` 2.25rem). Manrope’s geometric but warm curves provide a modern, high-end editorial feel. Use `headline-lg` for daily affirmations or primary task headers.
*   **The Reading Scale (Plus Jakarta Sans):** Used for all body text and labels (`body-lg` 1rem, `title-md` 1.125rem). This font is chosen for its high x-height and open counters, which are essential for readability for neurodivergent users.
*   **Hierarchy Note:** Use `on_surface_variant` (#5b6063) for secondary metadata to reduce visual noise. Reserve `on_surface` (#2e3336) only for primary content.

---

## 4. Elevation & Depth
We eschew the "material" drop-shadow in favor of **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by "stacking." A card using `surface_container_lowest` (#ffffff) sitting on a `surface_container_low` (#f2f4f6) background creates a natural, soft lift.
*   **Ambient Shadows:** If a floating element is required (e.g., a "Create Task" button), use a shadow with a 24px-32px blur and 4% opacity, tinted with the `primary` color (#005bc4) to simulate natural ambient light.
*   **The Ghost Border Fallback:** If accessibility requires a border, use `outline_variant` (#aeb2b6) at **15% opacity**. Never use a 100% opaque border.
*   **Corner Radii:** Use the `xl` scale (3rem) for main containers and `md` (1.5rem) for smaller buttons to maintain a "friendly, non-threatening" tactile feel.

---

## 5. Components & Interaction

### Buttons
*   **Primary:** Uses the Signature Gradient (`primary` to `primary_container`). Large tap target (min 56px height for primary actions). Radius: `full`.
*   **Secondary:** No fill. `outline` token at 20% opacity. Text in `primary`.

### Cards & Lists
*   **The Anti-Divider Rule:** Forbid 1px dividers between list items. Use the **Spacing Scale** `3` (1rem) or `4` (1.4rem) to create separation through whitespace. Alternatively, alternate backgrounds between `surface` and `surface_container_low`.

### Input Fields
*   **Floating Field:** Inputs should not have a bottom line. They should be containers (`surface_container_highest`) with a `xl` radius. This creates a "well" for the user to type into, reducing the feeling of a "test-taking" form.

### Specialized ADHD Components
*   **Brain State Tones:** Use `tertiary` (#006d4a) for "Calm/Focused" states and `error_container` (#fa746f) for "Urgent/Overwhelmed" states.
*   **The Progress Orbit:** Instead of a linear bar, use a large, soft-stroked circular progress indicator to gamify completion without inducing anxiety.

---

## 6. Do’s and Don'ts

### Do:
*   **Do** use asymmetrical margins. A larger left-hand margin for headlines can create a sophisticated, editorial rhythm.
*   **Do** use Lucide-style line icons with a 1.5px stroke weight to match the lightness of the typography.
*   **Do** maximize whitespace. If it feels like "too much" space, it is likely the correct amount for an ADHD user.

### Don't:
*   **Don't** use pure black (#000000) for text. Use `on_background` (#2e3336) to avoid high-contrast vibration.
*   **Don't** use "Alert" reds for non-critical errors. Use `error_container` with `on_error_container` for a softer, supportive correction.
*   **Don't** use more than two levels of nesting. Deeply nested containers increase cognitive load and make the UI feel cluttered.

### Accessibility Note
All color pairings must be checked against WCAG 2.1 AA standards. For the Neon-Dark theme, ensure that `primary_fixed` on `inverse_surface` maintains a contrast ratio of at least 4.5:1.