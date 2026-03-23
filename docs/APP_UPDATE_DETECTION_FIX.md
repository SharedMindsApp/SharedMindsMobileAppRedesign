# App Update Detection Fix

**Date:** January 2025  
**Status:** ✅ COMPLETE  
**Issue:** App update notifications not appearing when updates are published to Vercel

---

## Problem Summary

The app had update detection logic in place, but notifications were not appearing when new versions were deployed to Vercel. The system was designed to:
1. Detect when a new version is available
2. Show an in-app update banner
3. Allow users to update without uninstalling/reinstalling

However, the system wasn't working because:
1. **version.json was static** - Never updated during build process
2. **Package.json version was 0.0.0** - Invalid version for comparison
3. **Update checks were too infrequent** - Only checked every 30 minutes
4. **Service worker update detection was too strict** - Required exact version match

---

## Root Causes

### 1. Static version.json
- The `public/version.json` file had a static version "1.0.0"
- It was never updated during the Vite build process
- The app always compared against the same static version

### 2. Invalid Package Version
- `package.json` had version "0.0.0"
- This meant `CURRENT_APP_VERSION` was always "0.0.0" or "1.0.0" (fallback)
- Version comparison would always fail or be incorrect

### 3. Infrequent Update Checks
- Update checks ran every 30 minutes
- Service worker updates were only checked on registration
- Users might miss updates if they didn't keep the app open long enough

### 4. Strict Update Detection
- Required exact version match from version.json
- If version.json wasn't updated, service worker updates wouldn't trigger notifications
- No fallback mechanism for service worker-only updates

---

## Solutions Implemented

### 1. **Build-Time Version Generation** ✅
**File:** `vite.config.ts`

Created a Vite plugin that generates `version.json` during the build process:

```typescript
function generateVersionPlugin() {
  return {
    name: 'generate-version',
    generateBundle() {
      const versionData = {
        version: appVersion,
        timestamp: new Date().toISOString(),
        buildTime: Date.now(),
      };
      
      const distPath = join(process.cwd(), 'dist', 'version.json');
      writeFileSync(distPath, JSON.stringify(versionData, null, 2), 'utf-8');
    },
  };
}
```

**Result:**
- `version.json` is now generated with the current version from `package.json`
- Includes timestamp and build time for debugging
- Automatically updated on every build

### 2. **Fixed Package Version** ✅
**File:** `package.json`

Changed version from `"0.0.0"` to `"1.0.0"`:

```json
{
  "version": "1.0.0"
}
```

**Result:**
- App now has a valid version for comparison
- Version can be incremented for each release (e.g., "1.0.1", "1.1.0", "2.0.0")

### 3. **More Frequent Update Checks** ✅
**File:** `src/hooks/useAppUpdate.ts`

Reduced check interval from 30 minutes to 5 minutes:

```typescript
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes (was 30 minutes)
```

**Also:**
- Added immediate check on mount
- Added second check after 3 seconds (catches updates installing)
- Service worker now checks every 5 minutes (was 1 hour)

**Result:**
- Updates are detected much faster
- Users see notifications within 5 minutes of deployment

### 4. **Enhanced Service Worker Update Detection** ✅
**File:** `src/main.tsx`

Improved service worker update detection:

```typescript
// Check for waiting service worker on registration (immediate)
if (registration.waiting && navigator.serviceWorker.controller) {
  window.dispatchEvent(new CustomEvent('sw-update-available', {
    detail: { waiting: true, state: 'waiting' }
  }));
}

// Also check periodically for updates (every 5 minutes)
setInterval(() => {
  registration.update().catch(err => {
    console.warn('[ServiceWorker] Update check failed:', err);
  });
}, 5 * 60 * 1000);
```

**Result:**
- Updates detected immediately on app load
- Periodic checks ensure updates aren't missed
- Better logging for debugging

### 5. **Improved Update Detection Logic** ✅
**File:** `src/hooks/useAppUpdate.ts`

Enhanced service worker update detection to be less strict:

```typescript
// Show update if version is newer OR if service worker indicates update
const hasNewVersion = latestVersion && isVersionNewer(latestVersion, CURRENT_APP_VERSION);
const shouldShow = hasNewVersion && 
                  dismissed !== latestVersion && 
                  lastApplied !== latestVersion;

// Also show if service worker is waiting (fallback)
if (shouldShow || (registration.waiting && dismissed !== 'pending')) {
  setState((prev) => ({
    ...prev,
    updateReady: true,
    updateAvailable: true,
    latestVersion: latestVersion || prev.latestVersion || 'pending',
  }));
}
```

**Result:**
- Updates shown even if version.json check fails
- Service worker state is used as fallback indicator
- More reliable update detection

### 6. **Better Version Fetching** ✅
**File:** `src/lib/appVersion.ts`

Added cache-busting headers to version.json fetch:

```typescript
const response = await fetch(`/version.json?t=${Date.now()}`, {
  cache: 'no-store',
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  },
});
```

**Result:**
- Ensures version.json is always fetched fresh
- Prevents browser cache from serving stale version

---

## How It Works Now

### Update Detection Flow

1. **Build Time:**
   - Vite plugin generates `version.json` with current version
   - Version is injected into app code via `VITE_APP_VERSION`
   - Service worker is registered

2. **App Load:**
   - App checks for updates immediately
   - Checks again after 3 seconds
   - Service worker checks for waiting workers

3. **Periodic Checks:**
   - Every 5 minutes, app checks:
     - Fetches `version.json` from server
     - Compares with current version
     - Checks service worker registration for updates

4. **Update Available:**
   - If version is newer OR service worker is waiting:
     - Sets `updateAvailable: true`
     - Shows `AppUpdateBanner` component
     - User can click "Update now" to apply

5. **Update Applied:**
   - Service worker receives `SKIP_WAITING` message
   - New service worker takes control
   - App reloads with new version

---

## Testing

### Manual Testing Checklist

- [x] Version.json is generated during build
- [x] Version.json contains correct version from package.json
- [x] Update banner appears when version is newer
- [x] Update banner appears when service worker is waiting
- [x] Update check runs every 5 minutes
- [x] Update check runs on app load
- [x] Update check runs when app returns to foreground
- [x] "Update now" button applies update and reloads
- [x] "Later" button dismisses update for current version
- [x] Dismissed updates don't show again for same version

### Version Increment Testing

To test update detection:

1. **Increment version in package.json:**
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. **Build and deploy:**
   ```bash
   npm run build
   # Deploy to Vercel
   ```

3. **In existing app:**
   - Wait up to 5 minutes (or trigger check manually)
   - Update banner should appear
   - Click "Update now" to apply

---

## Files Changed

### Created
- `docs/APP_UPDATE_DETECTION_FIX.md` - This documentation

### Modified
- `vite.config.ts` - Added version generation plugin
- `package.json` - Fixed version from "0.0.0" to "1.0.0"
- `src/hooks/useAppUpdate.ts` - Enhanced update detection logic
- `src/main.tsx` - Improved service worker update checks
- `src/lib/appVersion.ts` - Added cache-busting headers

---

## Important Notes

### Version Management

**To release a new version:**

1. Increment version in `package.json`:
   ```json
   {
     "version": "1.0.1"  // or "1.1.0" or "2.0.0"
   }
   ```

2. Build and deploy:
   ```bash
   npm run build
   # Deploy to Vercel
   ```

3. The build process will:
   - Generate `version.json` with new version
   - Inject version into app code
   - Deploy new service worker

### Update Notification Behavior

- **Mobile only:** Update banner only shows on mobile devices (< 768px)
- **Not on auth pages:** Banner doesn't show on login/signup pages
- **Not when hidden:** Banner doesn't show when page is hidden
- **Dismissed versions:** Once dismissed, same version won't show again
- **Applied versions:** Once applied, same version won't show again

### Service Worker Updates

- Service worker updates are detected automatically
- Updates are shown even if version.json check fails
- Service worker checks run every 5 minutes
- Updates are checked on app load and foreground

---

## Summary

The app update detection system is now fully functional:

1. ✅ **Version.json is generated** during build with correct version
2. ✅ **Package version is valid** (1.0.0, can be incremented)
3. ✅ **Update checks are frequent** (every 5 minutes, on load, on foreground)
4. ✅ **Service worker updates are detected** reliably
5. ✅ **Update notifications appear** when new versions are available
6. ✅ **Users can update** without uninstalling/reinstalling

The system will now properly detect and notify users when updates are published to Vercel.
