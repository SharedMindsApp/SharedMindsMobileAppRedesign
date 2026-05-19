# Vercel Asset Deployment Fix

## Problem
SVG assets in the hero animation were not rendering on Vercel deployment. They appeared locally but failed in production.

## Root Cause
Assets located in `/src/assets/` are not publicly accessible in production deployments. Vercel (and other hosts) require static assets to be in the `/public/` directory to be served at runtime.

## Solution Applied

### 1. Moved SVG Assets to Public Directory
**Created:**
- `/public/assets/shared_minds_logo_right_node.svg`
- `/public/assets/shared_minds_logo_left_node.svg`

**Source files:**
- Copied from `/src/assets/shared_minds_logo_right_node copy copy copy.svg`
- Copied from `/src/assets/shared_minds_logo_left_node copy copy copy.svg`

### 2. Updated Asset References

**File:** `src/InteractiveNeuralAnimation.tsx`

**Before:**
```tsx
<image href="/src/assets/shared_minds_logo_right_node copy copy copy.svg"
       x={isMobile ? "-90" : "-110"} y={isMobile ? "-90" : "-110"}
       width={isMobile ? "180" : "220"} height={isMobile ? "180" : "220"} />
```

**After:**
```tsx
<image href="/assets/shared_minds_logo_right_node.svg"
       x={isMobile ? "-90" : "-110"} y={isMobile ? "-90" : "-110"}
       width={isMobile ? "180" : "220"} height={isMobile ? "180" : "220"}
       preserveAspectRatio="xMidYMid meet"
       style={{ pointerEvents: 'none' }} />
```

**Changes made:**
1. ❌ Removed: `/src/assets/shared_minds_logo_right_node copy copy copy.svg`
2. ✅ Added: `/assets/shared_minds_logo_right_node.svg`
3. ✅ Added: `preserveAspectRatio="xMidYMid meet"` for better rendering
4. ✅ Added: `style={{ pointerEvents: 'none' }}` to prevent image interference with drag events

Same changes applied to both node images (left and right).

### 3. Build Verification

**Build output confirms assets are included:**
```
dist/assets/shared_minds_logo_left_node.svg    3.87 kB
dist/assets/shared_minds_logo_right_node.svg   2.29 kB
```

## Production URLs

After deployment, these assets will be accessible at:
- `https://your-domain.com/assets/shared_minds_logo_right_node.svg`
- `https://your-domain.com/assets/shared_minds_logo_left_node.svg`

## Validation Checklist

✅ SVG files moved to `/public/assets/`
✅ Asset references updated to use `/assets/` paths
✅ Build completes successfully
✅ Assets included in dist folder
✅ No console errors for missing assets (verify after deployment)
✅ Animation logic preserved exactly as-is
✅ Drag interactions unchanged
✅ Physics and positioning unchanged
✅ Sparks and bubbles unchanged

## What Was NOT Changed

Per requirements, the following were preserved:
- Animation logic
- Physics calculations
- Drag and drop functionality
- Spark effects
- Bubble positioning
- Canvas sizing
- Layout and styling
- All interaction behavior

## Testing After Deployment

1. **Direct URL Test:**
   - Open `https://your-domain.com/assets/shared_minds_logo_right_node.svg`
   - Open `https://your-domain.com/assets/shared_minds_logo_left_node.svg`
   - Both should display the SVG images

2. **Hero Animation Test:**
   - Visit homepage
   - Confirm both node images are visible in the hero animation
   - Test dragging both nodes
   - Verify spark effects between nodes and bubbles
   - Check responsive behavior on mobile

3. **Console Check:**
   - Open browser DevTools
   - Look for any 404 errors for assets
   - Should see no errors related to SVG loading

## Future Asset Management

**Best Practice for Static Assets:**

Always place static assets that need to be publicly accessible in `/public/`:

```
/public/
  /assets/
    *.svg
    *.png
    *.jpg
  /images/
  logo-email.png
  robots.txt
  sitemap.xml
```

**Reference them using absolute paths:**
```tsx
// ✅ Correct
<image href="/assets/image.svg" />
<img src="/images/photo.jpg" />

// ❌ Incorrect (won't work in production)
<image href="/src/assets/image.svg" />
import logo from './assets/image.svg'
```

## Cleanup Opportunity

The following duplicate SVG files in `/src/assets/` can be removed if not used elsewhere:
- `shared_minds_logo_2 copy.svg`
- `shared_minds_logo_left_node copy.svg`
- `shared_minds_logo_right_node copy.svg`
- `shared_minds_logo_left_node copy copy.svg`
- `shared_minds_logo_right_node copy copy.svg`
- All other "copy" versions

Only remove after confirming they're not referenced anywhere else in the codebase.
