# Shared Minds — Mobile-Friendly PWA Readiness & Implementation Plan

**Target Domain:** `https://app.sharedminds.app`  
**Framework:** Vite + React + TypeScript  
**Backend:** Supabase (Auth + Database)  
**Deployment:** Vercel

---

## 1. Success Criteria (Non-negotiables)

### 1.1 Network & Connectivity
- ✅ **Works on mobile data (4G/5G)**: App loads and functions normally when accessed via cellular network, not just WiFi
- ✅ **Works on public internet**: No dependency on local network or VPN
- ✅ **Supabase connection reliable**: Auth and database queries succeed from any network location
- ✅ **Graceful degradation**: Shows clear error messages if network is unavailable (no silent failures)

### 1.2 PWA Installability
- ✅ **Android Chrome**: Install prompt appears after user engagement (meets installability criteria)
- ✅ **iOS Safari**: User can add to home screen via Share → Add to Home Screen
- ✅ **Installation persists**: App remains installed after browser restart
- ✅ **App icon visible**: Custom icon appears on home screen (not generic browser icon)

### 1.3 Standalone Mode (App-like Feel)
- ✅ **No URL bar**: When launched from home screen, runs in standalone mode (no browser chrome)
- ✅ **Status bar styling**: Status bar matches app theme (dark/light)
- ✅ **Safe area support**: Content respects notches and iOS bottom bar (no content hidden)
- ✅ **No browser back button issues**: Navigation works correctly in standalone mode
- ✅ **Splash screen**: Custom splash screen appears on launch (iOS)

### 1.4 Auth & Session Persistence
- ✅ **Session survives app close**: User remains logged in after closing and reopening app
- ✅ **Token refresh works**: Access tokens refresh automatically in background
- ✅ **OAuth redirects work**: OAuth callbacks complete successfully in standalone mode
- ✅ **Session timeout handled**: Clear messaging if session expires

### 1.5 Performance
- ✅ **Fast initial load**: First Contentful Paint < 2s on 4G, < 1s on WiFi
- ✅ **Responsive UI**: No jank, 60fps scrolling, smooth transitions
- ✅ **Touch targets**: All interactive elements ≥ 44x44px (iOS) / 48x48px (Android)
- ✅ **No layout shift**: Content doesn't jump during load

### 1.6 Security
- ✅ **HTTPS enforced**: All traffic over HTTPS (Vercel handles this)
- ✅ **No secrets in client**: Environment variables properly scoped (VITE_* only)
- ✅ **CORS configured**: Supabase allows requests from app.sharedminds.app
- ✅ **Secure storage**: Auth tokens stored securely (localStorage is acceptable for PWA)

### 1.7 Accessibility & Touch
- ✅ **WCAG AA compliance**: Color contrast, readable text, keyboard navigation
- ✅ **Touch-friendly**: Adequate spacing between buttons, no accidental taps
- ✅ **Screen reader support**: Semantic HTML, ARIA labels where needed
- ✅ **Focus management**: Keyboard focus visible and logical

---

## 2. Current App Audit Checklist

### 2.1 Responsive Layout Issues

#### Checklist Items

**Breakpoints & Viewport**
- [ ] **Test**: Open Chrome DevTools → Toggle device toolbar → Test iPhone 12 Pro, Pixel 5, iPad
- [ ] **Check**: Does `index.html` have proper viewport meta tag?
  - Current: `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`
  - **Needs**: Add `maximum-scale=5.0, user-scalable=yes` (or `user-scalable=no` if intentional)
- [ ] **Check**: Are Tailwind breakpoints used consistently? (`sm:`, `md:`, `lg:`, `xl:`)
- [ ] **Failure mode**: Content too small/large, horizontal scroll appears

**Fixed Sidebars**
- [ ] **Test**: Inspect `Layout.tsx`, `PlannerShell.tsx`, `GuardrailsLayout.tsx` for fixed/absolute sidebars
- [ ] **Check**: Left/right sidebars on desktop → How do they behave on mobile?
  - Current pattern: `hidden lg:flex` (hidden on mobile) - **Verify this works**
- [ ] **Failure mode**: Sidebar overlays content, blocks touch targets, can't be dismissed

**Modal & Dialog Sizing**
- [ ] **Test**: Open any modal/dialog on mobile viewport
- [ ] **Check**: Do modals use `max-w-*` classes that are too wide for mobile?
- [ ] **Check**: Are modals full-screen on mobile or centered?
- [ ] **Failure mode**: Modal extends beyond viewport, can't scroll to close button

**Overflow Issues**
- [ ] **Test**: Scroll through long pages on mobile
- [ ] **Check**: Are there nested scroll containers? (`overflow-y-auto` inside `overflow-y-auto`)
- [ ] **Check**: Does horizontal scroll appear unexpectedly?
- [ ] **Failure mode**: Can't scroll, or scrolls wrong container

### 2.2 Mobile Navigation Patterns

**Left/Right Panels**
- [ ] **Test**: Navigate through app on mobile
- [ ] **Check**: How do left/right sidebars collapse? (Drawer? Bottom sheet? Hidden?)
- [ ] **Check**: Is there a hamburger menu or bottom nav?
- [ ] **Failure mode**: Navigation inaccessible, requires desktop layout

**Tabs & Drawers**
- [ ] **Test**: Check `PlannerShell.tsx` left tabs (vertical tabs on desktop)
- [ ] **Check**: How do these render on mobile? (Bottom tabs? Horizontal scroll?)
- [ ] **Failure mode**: Tabs hidden or unusable

**Deep Navigation**
- [ ] **Test**: Navigate 3+ levels deep, then refresh page
- [ ] **Check**: Does React Router handle deep links correctly?
- [ ] **Check**: Does browser back button work in standalone mode?
- [ ] **Failure mode**: 404 on refresh, back button broken

### 2.3 Input Ergonomics

**Keyboard Behavior**
- [ ] **Test**: Focus on input fields on mobile
- [ ] **Check**: Does keyboard cover input? (Need `scrollIntoView` on focus)
- [ ] **Check**: Does `inputmode` attribute match input type? (`tel`, `email`, `numeric`, etc.)
- [ ] **Check**: Is `autocomplete` set correctly?
- [ ] **Failure mode**: Keyboard covers field, can't see what you're typing

**Form Spacing**
- [ ] **Test**: Fill out forms on mobile
- [ ] **Check**: Are form fields adequately spaced? (≥ 16px between inputs)
- [ ] **Check**: Are labels readable and properly associated?
- [ ] **Failure mode**: Hard to tap fields, labels unclear

**Focus Management**
- [ ] **Test**: Tab through form with keyboard (on mobile, use external keyboard or accessibility)
- [ ] **Check**: Does focus order make sense?
- [ ] **Check**: Is focus visible? (Outline visible on mobile?)
- [ ] **Failure mode**: Can't navigate forms, focus lost

### 2.4 Scroll Issues

**Nested Scroll Containers**
- [ ] **Test**: Scroll within modals, sidebars, cards
- [ ] **Check**: Are there `overflow-y-auto` containers inside other scroll containers?
- [ ] **Check**: Does momentum scroll work on iOS? (`-webkit-overflow-scrolling: touch`)
- [ ] **Failure mode**: Scroll doesn't work, or scrolls wrong element

**Pull-to-Refresh**
- [ ] **Test**: Pull down on mobile Safari/Chrome
- [ ] **Check**: Does native pull-to-refresh interfere with app?
- [ ] **Check**: Should we disable it? (`overscroll-behavior-y: contain`)
- [ ] **Failure mode**: Accidental refresh, loses state

**Scroll Performance**
- [ ] **Test**: Scroll long lists (e.g., calendar, task lists)
- [ ] **Check**: Is virtualization used for long lists? (react-window, react-virtual)
- [ ] **Check**: Are images lazy-loaded?
- [ ] **Failure mode**: Janky scrolling, lag

### 2.5 Safe Area Support

**Notches & Cutouts**
- [ ] **Test**: On iPhone with notch (iPhone X+), check top/bottom content
- [ ] **Check**: Does content respect safe areas? (`padding-top: env(safe-area-inset-top)`)
- [ ] **Check**: Are fixed headers positioned correctly?
- [ ] **Failure mode**: Content hidden behind notch or home indicator

**iOS Bottom Bar**
- [ ] **Test**: On iPhone, check bottom content
- [ ] **Check**: Does bottom nav/footer respect `safe-area-inset-bottom`?
- [ ] **Failure mode**: Content hidden behind home indicator

**Meta Tags**
- [ ] **Check**: Does `index.html` include viewport-fit=cover?
  - Current: Missing
  - **Needs**: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`

### 2.6 Routing & Deep Links

**React Router Configuration**
- [ ] **Test**: Navigate to `/guardrails/roadmap?project=123`, then refresh
- [ ] **Check**: Does Vercel routing handle client-side routes? (Need `vercel.json` with rewrites)
- [ ] **Check**: Are query params preserved on refresh?
- [ ] **Failure mode**: 404 on refresh, params lost

**OAuth Callbacks**
- [ ] **Test**: Sign in with OAuth on mobile
- [ ] **Check**: Does `/auth/callback` route work in standalone mode?
- [ ] **Check**: Does Supabase redirect URL include `app.sharedminds.app`?
- [ ] **Failure mode**: OAuth fails, stuck on callback page

### 2.7 Auth/Session Storage

**Session Persistence**
- [ ] **Test**: Sign in, close app, reopen app
- [ ] **Check**: Does `supabase.auth.getSession()` return session after app restart?
- [ ] **Check**: Is `localStorage` used? (Current: `storage: localStorage` in `supabase.ts`)
- [ ] **Failure mode**: User logged out after app close

**Token Refresh**
- [ ] **Test**: Leave app open for > 1 hour, then make API call
- [ ] **Check**: Does `autoRefreshToken: true` work? (Current: set in `supabase.ts`)
- [ ] **Check**: Are refresh errors handled gracefully?
- [ ] **Failure mode**: Silent auth failures, user kicked out

**Session Timeout**
- [ ] **Test**: Wait for token to expire (or manually expire)
- [ ] **Check**: Does app show login screen or error message?
- [ ] **Failure mode**: Infinite loading, no feedback

### 2.8 Error States & Offline

**Network Errors**
- [ ] **Test**: Turn off WiFi/data, try to use app
- [ ] **Check**: Are network errors caught and displayed?
- [ ] **Check**: Is there a "Retry" button?
- [ ] **Failure mode**: Blank screen, no error message

**Offline States**
- [ ] **Test**: Go offline, try to submit form
- [ ] **Check**: Are forms queued for later? (Or show error immediately?)
- [ ] **Check**: Is there an offline indicator?
- [ ] **Failure mode**: Data lost, no feedback

**Supabase Errors**
- [ ] **Test**: Trigger a Supabase error (e.g., invalid query)
- [ ] **Check**: Are error messages user-friendly?
- [ ] **Check**: Are errors logged for debugging?
- [ ] **Failure mode**: Technical error messages, no logging

### 2.9 Desktop-Only Assumptions

**Mouse Hover**
- [ ] **Test**: Check for `:hover` styles that are required for functionality
- [ ] **Check**: Are tooltips accessible via tap? (Or only hover?)
- [ ] **Failure mode**: Features inaccessible on mobile

**Right-Click**
- [ ] **Test**: Check for context menus that require right-click
- [ ] **Check**: Are there long-press alternatives?
- [ ] **Failure mode**: Features missing on mobile

**Keyboard Shortcuts**
- [ ] **Test**: Check for keyboard-only features
- [ ] **Check**: Are there touch alternatives?
- [ ] **Failure mode**: Features unusable on mobile

**Large Screens**
- [ ] **Test**: Check for fixed widths (e.g., `w-96`, `max-w-4xl`) that don't adapt
- [ ] **Check**: Are images/graphics sized for mobile?
- [ ] **Failure mode**: Content too small or cut off

---

## 3. PWA Requirements & Implementation

### 3.1 Web App Manifest

**File Location:** `public/manifest.json`

**Required Fields:**
```json
{
  "name": "Shared Minds",
  "short_name": "SharedMinds",
  "description": "Personal planning and collaboration app",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Implementation Steps:**
1. Create `public/manifest.json` with above content
2. Link in `index.html`: `<link rel="manifest" href="/manifest.json" />`
3. Generate icons (see 3.5)
4. Update `theme_color` to match app's primary color (check Tailwind config)

**Key Points:**
- `display: "standalone"` removes browser UI
- `start_url: "/"` is the entry point (must be within `scope`)
- Icons must include 192x192 and 512x512 (Android requirement)
- `maskable` purpose allows Android adaptive icons

### 3.2 Service Worker Strategy

**Minimal First Approach:** Cache static assets only, no complex offline logic.

**File Location:** `public/sw.js` (or use Vite PWA plugin)

**Option A: Manual Service Worker (Minimal)**
```javascript
// public/sw.js
const CACHE_NAME = 'shared-minds-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  // Add other critical assets
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first for API calls, cache-first for static assets
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

**Option B: Vite PWA Plugin (Recommended)**
```bash
npm install -D vite-plugin-pwa
```

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Shared Minds',
        short_name: 'SharedMinds',
        description: 'Personal planning and collaboration app',
        theme_color: '#3b82f6',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
```

**Registration in `main.tsx`:**
```typescript
// main.tsx (add after imports)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
```

**Caching Boundaries:**
- ✅ **Cache**: Static assets (JS, CSS, images, fonts)
- ❌ **Don't cache**: Supabase API responses (use NetworkFirst)
- ❌ **Don't cache**: Auth tokens (always fetch fresh)
- ✅ **Cache**: App shell (HTML, main JS bundle)

### 3.3 Install Prompts & UX

**Android Chrome:**
- Install prompt appears automatically after:
  - User visits site 2+ times
  - 5+ seconds of engagement
  - Meets installability criteria (manifest + service worker + HTTPS)
- **Custom prompt (optional):**
```typescript
// src/hooks/useInstallPrompt.ts
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show custom install button
});

const installApp = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User installed app');
    }
    deferredPrompt = null;
  }
};
```

**iOS Safari:**
- No programmatic prompt
- User must manually: Share button → Add to Home Screen
- **Guidance UI (optional):**
```tsx
// Show instructions if iOS and not standalone
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

{isIOS && !isStandalone && (
  <div className="fixed bottom-0 left-0 right-0 bg-blue-500 text-white p-4">
    <p>Tap Share → Add to Home Screen to install</p>
  </div>
)}
```

### 3.4 Standalone Mode Tweaks

**Status Bar Style (iOS):**
- Add to `index.html` `<head>`:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<!-- Options: default, black, black-translucent -->
```

**Theme Color:**
- Add to `index.html` `<head>`:
```html
<meta name="theme-color" content="#3b82f6" />
<!-- Should match manifest.json theme_color -->
```

**Viewport & Safe Area:**
- Update `index.html` viewport meta:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
```

**CSS Safe Area Support:**
```css
/* Add to index.css or global styles */
@supports (padding: max(0px)) {
  .safe-top {
    padding-top: max(1rem, env(safe-area-inset-top));
  }
  .safe-bottom {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }
  .safe-left {
    padding-left: max(1rem, env(safe-area-inset-left));
  }
  .safe-right {
    padding-right: max(1rem, env(safe-area-inset-right));
  }
}
```

**App Icons (iOS):**
- Add to `index.html` `<head>`:
```html
<link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
<link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
```

### 3.5 App Icons & Splash Experience

**Icon Sizes Required:**
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512 (Android)
- 152x152, 180x180 (iOS)

**Icon Design Guidelines:**
- Use app logo/branding
- Ensure icon works on light and dark backgrounds
- For Android: Create "maskable" icon (safe zone: center 80% of icon)
- For iOS: Icon will be automatically rounded and may have effects applied

**Splash Screen (iOS):**
- iOS generates splash from `apple-touch-icon`
- Ensure icon is high-quality and centered
- Background color comes from `manifest.json` `background_color`

**Generation Tools:**
- Use online tool: https://realfavicongenerator.net/
- Or create manually: Export 512x512 PNG, then resize to all sizes

**File Structure:**
```
public/
  icons/
    icon-72x72.png
    icon-96x96.png
    icon-128x128.png
    icon-144x144.png
    icon-152x152.png
    icon-180x180.png
    icon-192x192.png
    icon-384x384.png
    icon-512x512.png
  manifest.json
  sw.js (if manual)
```

### 3.6 Versioning / Update Strategy

**Service Worker Update Flow:**
1. User visits app → Service worker checks for updates
2. New SW installed in background
3. On next page load, new SW activates
4. Old cache cleared, new assets cached

**Vite PWA Plugin Auto-Update:**
- Plugin handles updates automatically
- Shows update prompt if new version available (configurable)

**Manual Update Check (Optional):**
```typescript
// src/hooks/useServiceWorkerUpdate.ts
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available, show update prompt
                setUpdateAvailable(true);
              }
            });
          }
        });
      }
    });
  }
}, []);
```

**Cache Busting:**
- Vite automatically appends hash to filenames (e.g., `main.abc123.js`)
- Service worker cache key should include version (e.g., `shared-minds-v2`)

---

## 4. Hosting & Domain Setup (Production)

### 4.1 Deploy to Vercel

**Prerequisites:**
- Vercel account (free tier works)
- GitHub/GitLab/Bitbucket repo connected

**Steps:**
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`
   - Or connect repo in Vercel dashboard → Auto-deploy on push

**Build Configuration:**
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Environment Variables:**
- Add in Vercel dashboard → Project Settings → Environment Variables:
  - `VITE_SUPABASE_URL` (production Supabase URL)
  - `VITE_SUPABASE_ANON_KEY` (production Supabase anon key)
- Scope: Production, Preview, Development (as needed)

### 4.2 Domain Configuration

**Vercel Domain Setup:**
1. In Vercel dashboard → Project Settings → Domains
2. Add domain: `app.sharedminds.app`
3. Vercel will show DNS records needed

**DNS Records (Hostinger):**
1. Login to Hostinger → DNS Management
2. Add CNAME record:
   - **Name:** `app` (or `app.sharedminds.app` depending on Hostinger UI)
   - **Value:** `cname.vercel-dns.com` (or value shown by Vercel)
   - **TTL:** 3600 (or default)

**Alternative (A Record):**
- If CNAME doesn't work, use A record:
  - **Name:** `app`
  - **Value:** Vercel IP (Vercel will provide)
  - **TTL:** 3600

**SSL/HTTPS:**
- Vercel automatically provisions SSL certificate via Let's Encrypt
- Wait 5-10 minutes after DNS propagation
- Check: `https://app.sharedminds.app` should load

### 4.3 Vercel Configuration File

**Create `vercel.json` in project root:**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/javascript"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    }
  ]
}
```

**Why:**
- `rewrites`: Ensures React Router client-side routes work (no 404 on refresh)
- `headers`: Proper MIME types for manifest and service worker

### 4.4 Supabase Configuration

**Allowed Redirect URLs:**
1. In Supabase dashboard → Authentication → URL Configuration
2. Add to "Redirect URLs":
   - `https://app.sharedminds.app/auth/callback`
   - `https://app.sharedminds.app/**` (wildcard for deep links)

**Site URL:**
- Set Site URL to: `https://app.sharedminds.app`

**CORS (if needed):**
- Supabase should allow requests from any origin by default
- If issues, check Supabase dashboard → Settings → API → CORS settings

### 4.5 Common Misconfigurations

**❌ Wrong Environment Variables:**
- Using local/dev Supabase URL in production
- **Fix:** Use production Supabase project URL and keys

**❌ DNS Not Propagated:**
- Domain shows "Not found" or wrong site
- **Fix:** Wait 24-48 hours, check DNS propagation: `dig app.sharedminds.app`

**❌ HTTPS Not Working:**
- Mixed content errors, insecure warnings
- **Fix:** Ensure all assets use HTTPS, check Vercel SSL status

**❌ Service Worker Not Registering:**
- PWA not installable, SW errors in console
- **Fix:** Ensure SW is served from root (`/sw.js`), check `Service-Worker-Allowed` header

**❌ React Router 404s:**
- Deep links return 404 on refresh
- **Fix:** Add `vercel.json` rewrites (see 4.3)

---

## 5. "Native App Feel" Mobile UX Spec

### 5.1 Navigation Pattern

**Proposed: Bottom Tab Navigation (Primary)**
- **Why:** Most familiar mobile pattern, thumb-friendly, always visible
- **Implementation:**
  - Show bottom tabs on mobile (`< md` breakpoint)
  - Hide desktop sidebars on mobile
  - Tabs: Home, Planner, Guardrails, Calendar, Profile (or similar)

**Alternative: Drawer Navigation**
- Hamburger menu → Slide-out drawer
- Use if too many top-level sections (> 5)

**Stacked Navigation (Secondary)**
- For nested routes (e.g., `/planner/daily`), show:
  - Back button (top left)
  - Page title (center)
  - Action button (top right, if needed)

### 5.2 Left/Right Panel Collapse

**Current Pattern Analysis:**
- `PlannerShell.tsx`: Left sidebar with vertical tabs (`hidden xl:block`)
- `Layout.tsx`: Top nav bar, potentially sidebars
- `GuardrailsLayout.tsx`: Left nav sidebar

**Mobile Transformation:**
1. **Left Sidebar → Drawer:**
   - Hamburger icon (top left) opens drawer
   - Drawer slides in from left, overlay backdrop
   - Close on tap outside or X button

2. **Right Sidebar → Bottom Sheet:**
   - If right sidebar exists, convert to bottom sheet on mobile
   - Swipe down to dismiss
   - Or button opens modal

**Implementation Example:**
```tsx
// Mobile drawer component
const [drawerOpen, setDrawerOpen] = useState(false);

<>
  {/* Hamburger button (mobile only) */}
  <button
    onClick={() => setDrawerOpen(true)}
    className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
  >
    <Menu size={24} />
  </button>

  {/* Drawer */}
  {drawerOpen && (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={() => setDrawerOpen(false)}
      />
      <aside className="fixed inset-y-0 left-0 w-64 bg-white z-50 md:hidden transform transition-transform">
        {/* Sidebar content */}
      </aside>
    </>
  )}
</>
```

### 5.3 Touch Targets & Spacing

**Minimum Sizes:**
- iOS: 44x44px
- Android: 48x48px
- **Tailwind classes:** `min-h-[44px] min-w-[44px]` or `h-11 w-11`

**Spacing:**
- Between buttons: ≥ 8px (prefer 16px)
- Form fields: ≥ 16px vertical spacing
- List items: ≥ 12px padding

**Typography Scaling:**
- Base font: 16px minimum (prevents iOS zoom on focus)
- Headings: Scale appropriately (h1: 24-32px on mobile)
- Body: 16-18px for readability

### 5.4 App-like Transitions

**Page Transitions:**
- Use React Router transitions (framer-motion or CSS transitions)
- Slide left/right for forward/back navigation
- Fade for modals

**Loading States:**
- Skeleton screens (not spinners) for better perceived performance
- Optimistic UI updates (show change immediately, sync in background)

**Sticky Headers:**
- Main nav bar: `sticky top-0 z-30`
- Respect safe area: `pt-safe-top`

**Sticky Actions:**
- Bottom action bar (e.g., "Save", "Submit") on forms
- `sticky bottom-0 pb-safe-bottom`

### 5.5 Keyboard Behavior

**Input Focus:**
```typescript
// Scroll input into view when focused
const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  setTimeout(() => {
    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300); // Delay for keyboard animation
};
```

**Input Types:**
- Use correct `inputmode`: `tel`, `email`, `numeric`, `decimal`, `url`
- Use correct `type`: `email`, `tel`, `number`, `date`, etc.

**Form Submission:**
- Show loading state on submit
- Disable submit button while processing
- Show success/error feedback

### 5.6 Haptics (Optional)

**Constraints:**
- PWAs can't trigger haptics directly (no Vibration API on iOS)
- Android: Limited support via Vibration API
- **Recommendation:** Skip haptics for MVP, focus on visual feedback

**Visual Feedback Instead:**
- Button press animations
- Ripple effects (CSS)
- Color changes on tap

---

## 6. Supabase Reliability & Security Notes

### 6.1 Auth in Mobile Browsers/PWA

**Session Persistence:**
- Current config (`supabase.ts`): `persistSession: true`, `storage: localStorage`
- ✅ **Works in PWA:** localStorage persists in standalone mode
- ✅ **Works across tabs:** Session shared across browser tabs

**Token Refresh:**
- Current: `autoRefreshToken: true`
- ✅ **Works automatically:** Supabase refreshes tokens before expiry
- ⚠️ **Edge case:** If app backgrounded for > 1 hour, token may expire
- **Fix:** Check session on app resume (see 7.4)

**OAuth Redirects:**
- **Critical:** OAuth callback URL must be in Supabase allowed redirects
- **Test:** Sign in with OAuth on mobile, verify redirect completes
- **Common issue:** Redirect fails in standalone mode if URL not whitelisted

### 6.2 Session Persistence Configuration

**Current Setup (Good):**
```typescript
// src/lib/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});
```

**Pitfalls:**
- ❌ Using `sessionStorage` instead of `localStorage` (lost on tab close)
- ❌ Not handling session errors (silent failures)
- ❌ Not checking session on app resume

**Recommended Enhancement:**
```typescript
// Add session check on app visibility change
useEffect(() => {
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        // Handle expired session
        navigate('/auth/login');
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

### 6.3 CORS Considerations

**Supabase Default:**
- Supabase allows requests from any origin (CORS enabled)
- No additional CORS config needed

**If Issues:**
- Check Supabase dashboard → Settings → API
- Ensure "Enable CORS" is checked
- Verify request headers include `Origin: https://app.sharedminds.app`

### 6.4 Rate Limiting & Error Handling

**Supabase Rate Limits:**
- Free tier: 500 requests/second per project
- Paid tiers: Higher limits
- **Monitoring:** Check Supabase dashboard → Logs

**Error Handling Pattern:**
```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - handle gracefully
    } else if (error.code === '42501') {
      // Permission denied - show error
    } else {
      // Generic error
      console.error('Supabase error:', error);
      showErrorToast('Something went wrong. Please try again.');
    }
  }
} catch (networkError) {
  // Network error (offline, timeout)
  showErrorToast('Network error. Check your connection.');
}
```

### 6.5 Logging & Debugging

**Production Logging:**
- Use `console.error` for errors (visible in browser console)
- **Optional:** Integrate Sentry for error tracking:
```bash
npm install @sentry/react
```

```typescript
// main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

**Debugging Tips:**
- Check browser console for Supabase errors
- Use Supabase dashboard → Logs for server-side errors
- Test with network throttling (Chrome DevTools → Network → Throttling)

---

## 7. Testing Plan (Must be Real-Device)

### 7.1 Android Chrome Install & Behavior

**Prerequisites:**
- Android device (phone or tablet)
- Chrome browser installed
- Access to `https://app.sharedminds.app`

**Test Steps:**
1. Open Chrome, navigate to `https://app.sharedminds.app`
2. **Install Prompt:**
   - Wait 5+ seconds, interact with page
   - Check if install banner appears (bottom of screen)
   - Tap "Install" → Verify app installs
3. **Launch from Home Screen:**
   - Open app from home screen icon
   - Verify: No URL bar, no browser chrome
   - Verify: App loads correctly
4. **Navigation:**
   - Navigate through app
   - Verify: Back button works (Android back gesture)
   - Verify: Deep links work
5. **Session Persistence:**
   - Sign in
   - Close app completely
   - Reopen app
   - Verify: Still logged in
6. **Network:**
   - Turn off WiFi, use mobile data
   - Verify: App loads and functions
   - Turn on airplane mode
   - Verify: Error message shown (not blank screen)

**Expected Results:**
- ✅ Install prompt appears
- ✅ App launches in standalone mode
- ✅ Navigation works
- ✅ Session persists
- ✅ Works on mobile data

### 7.2 iPhone Safari Install & Behavior

**Prerequisites:**
- iPhone (iOS 12.2+)
- Safari browser
- Access to `https://app.sharedminds.app`

**Test Steps:**
1. Open Safari, navigate to `https://app.sharedminds.app`
2. **Install (Manual):**
   - Tap Share button (bottom center)
   - Tap "Add to Home Screen"
   - Verify: Icon appears on home screen
3. **Launch from Home Screen:**
   - Open app from home screen
   - Verify: No Safari UI, standalone mode
   - Verify: Splash screen appears (brief)
4. **Safe Areas:**
   - Check top content (not hidden behind notch)
   - Check bottom content (not hidden behind home indicator)
5. **Navigation:**
   - Navigate through app
   - Swipe back gesture works
   - Deep links work
6. **Session Persistence:**
   - Sign in
   - Close app (swipe up, swipe away)
   - Reopen app
   - Verify: Still logged in
7. **Network:**
   - Turn off WiFi, use cellular data
   - Verify: App works
   - Enable airplane mode
   - Verify: Error message shown

**Expected Results:**
- ✅ Can add to home screen
- ✅ Standalone mode works
- ✅ Safe areas respected
- ✅ Navigation works
- ✅ Session persists
- ✅ Works on cellular data

### 7.3 Mobile Data Tests

**Test on Real Mobile Network (Not WiFi):**
1. Disable WiFi on device
2. Ensure cellular data enabled
3. Navigate to `https://app.sharedminds.app`
4. **Verify:**
   - App loads (may be slower, but loads)
   - Supabase auth works
   - Database queries succeed
   - Images/assets load
5. **Performance:**
   - Measure load time (should be < 5s on 4G)
   - Check for timeout errors
   - Verify no CORS errors

**Common Issues:**
- ❌ CORS errors → Check Supabase allowed origins
- ❌ Timeout errors → Check network request timeouts
- ❌ Slow loads → Optimize bundle size, lazy load routes

### 7.4 Edge Cases

**Backgrounding & Resume:**
1. Open app, sign in
2. Background app (home button/gesture)
3. Wait 5+ minutes
4. Resume app
5. **Verify:**
   - Session still valid (or re-authenticates)
   - No blank screen
   - App state preserved

**Token Refresh:**
1. Open app, sign in
2. Leave app open for 1+ hour (token expires)
3. Make an API call
4. **Verify:**
   - Token refreshes automatically
   - No auth errors
   - User not logged out

**Network Drop:**
1. Open app, start action (e.g., submit form)
2. Turn off network mid-action
3. **Verify:**
   - Error message shown
   - No data loss (form data preserved)
   - Retry option available

**Deep Link Refresh:**
1. Navigate to `/guardrails/roadmap?project=123`
2. Refresh page
3. **Verify:**
   - Page loads (no 404)
   - Query params preserved
   - User still authenticated

### 7.5 Performance Tests

**Lighthouse (Mobile):**
1. Open Chrome DevTools → Lighthouse
2. Select "Mobile" device
3. Run audit
4. **Targets:**
   - Performance: ≥ 70
   - Accessibility: ≥ 90
   - Best Practices: ≥ 90
   - SEO: N/A (not public site)
   - PWA: 100 (all checks pass)

**Manual Performance:**
1. **First Load:**
   - Clear cache, hard refresh
   - Measure time to interactive
   - Target: < 3s on 4G
2. **Subsequent Loads:**
   - Measure with cache
   - Target: < 1s
3. **Scrolling:**
   - Scroll long lists
   - Verify: 60fps, no jank
4. **Animations:**
   - Check transitions
   - Verify: Smooth, no lag

### 7.6 Release Checklist

**Before Daily Use:**
- [ ] App installs on Android Chrome
- [ ] App installs on iOS Safari (via Share menu)
- [ ] Standalone mode works (no browser UI)
- [ ] Safe areas respected (notch, home indicator)
- [ ] Session persists after app close/reopen
- [ ] Works on mobile data (not just WiFi)
- [ ] OAuth sign-in works
- [ ] Deep links work (refresh doesn't 404)
- [ ] Forms are usable (keyboard doesn't cover inputs)
- [ ] Touch targets are adequate (≥ 44px)
- [ ] No horizontal scroll
- [ ] Performance acceptable (< 3s load on 4G)
- [ ] Error messages are clear
- [ ] Offline state handled (shows error, not blank)

**Lighthouse Scores:**
- [ ] Performance: ≥ 70
- [ ] Accessibility: ≥ 90
- [ ] Best Practices: ≥ 90
- [ ] PWA: 100

**Real Device Tests:**
- [ ] Tested on Android phone (Chrome)
- [ ] Tested on iPhone (Safari)
- [ ] Tested on tablet (if applicable)

---

## 8. Implementation Tasks (Actionable)

### Stage 0: Prep & Deployment

**Task 0.1: Create Web App Manifest**
- **Files:** `public/manifest.json`
- **Done when:** Manifest exists with all required fields, linked in `index.html`
- **Risk:** Low

**Task 0.2: Generate App Icons**
- **Files:** `public/icons/*.png` (all sizes)
- **Done when:** All icon sizes exist, referenced in manifest
- **Risk:** Low (can use placeholder initially)

**Task 0.3: Update index.html Meta Tags**
- **Files:** `index.html`
- **Changes:**
  - Add viewport-fit=cover
  - Add apple-mobile-web-app-capable
  - Add apple-mobile-web-app-status-bar-style
  - Add theme-color
  - Add apple-touch-icon links
  - Link manifest.json
- **Done when:** All meta tags present, validated
- **Risk:** Low

**Task 0.4: Set Up Vercel Deployment**
- **Files:** `vercel.json` (create)
- **Steps:**
  1. Deploy to Vercel
  2. Add environment variables
  3. Configure domain (app.sharedminds.app)
  4. Add DNS records in Hostinger
- **Done when:** App accessible at https://app.sharedminds.app
- **Risk:** Medium (DNS propagation delay)

**Task 0.5: Configure Supabase Redirect URLs**
- **Files:** Supabase dashboard
- **Changes:** Add `https://app.sharedminds.app/auth/callback` to allowed redirects
- **Done when:** OAuth works on production domain
- **Risk:** Low

### Stage 1: PWA Installability

**Task 1.1: Implement Service Worker**
- **Files:** `vite.config.ts` (add VitePWA plugin) OR `public/sw.js` (manual)
- **Done when:** Service worker registers, caches assets, updates work
- **Risk:** Medium (SW caching can cause issues if misconfigured)

**Task 1.2: Test Installability**
- **Files:** N/A (testing)
- **Steps:**
  1. Deploy to production
  2. Test Android Chrome install prompt
  3. Test iOS Safari "Add to Home Screen"
- **Done when:** Both platforms can install app
- **Risk:** Low

**Task 1.3: Add Install Prompt UI (Optional)**
- **Files:** `src/hooks/useInstallPrompt.ts`, `src/components/InstallPrompt.tsx`
- **Done when:** Custom install button shows on Android, instructions show on iOS
- **Risk:** Low (optional enhancement)

### Stage 2: Mobile UX Fixes

**Task 2.1: Audit Current Layouts**
- **Files:** `src/components/Layout.tsx`, `src/components/planner/PlannerShell.tsx`, `src/components/guardrails/GuardrailsLayout.tsx`
- **Steps:**
  1. Test each layout on mobile viewport (Chrome DevTools)
  2. Document issues (use checklist from Section 2)
  3. Prioritize fixes
- **Done when:** Audit complete, issues documented
- **Risk:** Low

**Task 2.2: Implement Mobile Navigation**
- **Files:** `src/components/Layout.tsx` (or new `MobileNav.tsx`)
- **Changes:**
  - Add bottom tab nav for mobile
  - Or add hamburger menu + drawer
- **Done when:** Navigation works on mobile, desktop unchanged
- **Risk:** Medium (may require significant refactoring)

**Task 2.3: Fix Sidebar Collapse**
- **Files:** Layout components with sidebars
- **Changes:**
  - Convert left sidebar to drawer on mobile
  - Convert right sidebar to bottom sheet/modal on mobile
- **Done when:** Sidebars accessible on mobile, don't block content
- **Risk:** Medium

**Task 2.4: Fix Touch Targets**
- **Files:** All component files with buttons/links
- **Changes:**
  - Ensure all interactive elements ≥ 44px
  - Add adequate spacing
- **Done when:** All buttons/links meet size requirements
- **Risk:** Low

**Task 2.5: Fix Input Ergonomics**
- **Files:** All form components
- **Changes:**
  - Add `inputmode` attributes
  - Scroll inputs into view on focus
  - Fix keyboard covering inputs
- **Done when:** Forms usable on mobile
- **Risk:** Low

**Task 2.6: Add Safe Area Support**
- **Files:** `src/index.css`, layout components
- **Changes:**
  - Add safe area CSS utilities
  - Apply to headers/footers
- **Done when:** Content not hidden behind notches/home indicator
- **Risk:** Low

**Task 2.7: Fix Scroll Issues**
- **Files:** Components with nested scroll
- **Changes:**
  - Remove nested scroll containers
  - Add `-webkit-overflow-scrolling: touch`
  - Fix pull-to-refresh conflicts
- **Done when:** Scrolling smooth, no conflicts
- **Risk:** Medium (may require layout changes)

### Stage 3: Resilience & Polish

**Task 3.1: Add Error Handling**
- **Files:** `src/lib/supabase.ts`, API call sites
- **Changes:**
  - Add try/catch blocks
  - Show user-friendly error messages
  - Log errors for debugging
- **Done when:** All errors handled, no silent failures
- **Risk:** Low

**Task 3.2: Add Offline Detection**
- **Files:** `src/hooks/useOnlineStatus.ts`, `src/components/OfflineBanner.tsx`
- **Changes:**
  - Detect online/offline status
  - Show banner when offline
  - Disable actions when offline
- **Done when:** Offline state visible, actions disabled
- **Risk:** Low

**Task 3.3: Add Session Resume Handling**
- **Files:** `src/contexts/AuthContext.tsx`
- **Changes:**
  - Check session on app visibility change
  - Re-authenticate if session expired
- **Done when:** Session persists across app backgrounding
- **Risk:** Low

**Task 3.4: Optimize Performance**
- **Files:** `vite.config.ts`, route components
- **Changes:**
  - Lazy load routes (React.lazy)
  - Optimize images (lazy load, WebP)
  - Reduce bundle size
- **Done when:** Lighthouse performance ≥ 70
- **Risk:** Medium (may require significant optimization)

**Task 3.5: Add Loading States**
- **Files:** All data-fetching components
- **Changes:**
  - Replace spinners with skeleton screens
  - Add optimistic UI updates
- **Done when:** Loading states smooth, no layout shift
- **Risk:** Low

**Task 3.6: Final Testing**
- **Files:** N/A (testing)
- **Steps:**
  1. Run through release checklist (Section 7.6)
  2. Test on real Android device
  3. Test on real iPhone
  4. Fix any issues found
- **Done when:** All checklist items pass
- **Risk:** Medium (may find unexpected issues)

---

## Appendix: Quick Reference

### Required Files Checklist
- [ ] `public/manifest.json`
- [ ] `public/icons/*.png` (all sizes)
- [ ] `public/sw.js` (if manual) OR VitePWA plugin in `vite.config.ts`
- [ ] `vercel.json`
- [ ] Updated `index.html` (meta tags, manifest link)

### Environment Variables (Vercel)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### DNS Records (Hostinger)
- CNAME: `app` → `cname.vercel-dns.com` (or A record if needed)

### Supabase Configuration
- Redirect URL: `https://app.sharedminds.app/auth/callback`
- Site URL: `https://app.sharedminds.app`

### Testing Checklist
- [ ] Android Chrome install
- [ ] iOS Safari install
- [ ] Standalone mode
- [ ] Safe areas
- [ ] Session persistence
- [ ] Mobile data
- [ ] Performance (Lighthouse)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-05  
**Status:** Ready for Implementation
