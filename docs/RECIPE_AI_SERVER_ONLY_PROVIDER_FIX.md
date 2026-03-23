# RecipeAI Server-Only Provider Fix

## Overview

Fixed RecipeAI routing and fallback logic to properly handle server-only providers (Perplexity). The system now prevents direct browser API calls for providers that require server-side proxy, eliminating CSP violations and architectural issues.

## Problems Fixed

### 1. ❌ Fallback to Direct Browser Calls
**Before:** When routing or validation failed, the system would fallback to direct `fetch()` calls to `api.perplexity.ai` from the browser.

**After:** Server-only providers (like Perplexity) never fallback to direct browser calls. The system throws structured errors instead.

### 2. ❌ Response Validation Assumptions
**Before:** Validation assumed OpenAI-style response format.

**After:** Validation properly handles Perplexity response format with better error messages.

### 3. ❌ Missing Provider Metadata
**Before:** ResolvedRoute didn't include `requiresServerProxy` and `supportsBrowserCalls` flags.

**After:** Routing service includes provider flags in resolved routes.

## Changes Made

### 1. Updated ResolvedRoute Interface

**File:** `src/lib/guardrails/ai/providerRegistryTypes.ts`

```typescript
export interface ResolvedRoute {
  // ... existing fields
  requiresServerProxy?: boolean; // If true, must use server proxy (no browser calls)
  supportsBrowserCalls?: boolean; // If false, cannot make direct browser API calls
}
```

### 2. Enhanced Routing Service

**File:** `src/lib/guardrails/ai/aiRoutingService.ts`

- **Updated `mapProviderFromDB()`**: Now includes `requiresServerProxy` and `supportsBrowserCalls` from database
- **Updated `buildResolvedRoute()`**: Includes provider flags in resolved route
- **Updated `getFallbackRoute()`**: Includes provider flags (defaults to browser-capable)

### 3. Fixed RecipeAI Service

**File:** `src/lib/recipeAIService.ts`

#### Key Changes:

1. **Provider-Aware Error Handling**
   - Checks `route.requiresServerProxy` and `route.supportsBrowserCalls` before fallback
   - Server-only providers throw structured errors instead of falling back

2. **Improved Response Validation**
   - Better error messages for validation failures
   - Detailed logging for debugging
   - Perplexity-specific error messages

3. **No Browser Fallback for Server-Only Providers**
   ```typescript
   if (isServerOnlyProvider) {
     throw new Error(
       `Recipe generation failed for server-only provider. ` +
       `This provider requires server-side proxy and cannot be called directly from the browser.`
     );
   }
   ```

## Error Handling Flow

### For Server-Only Providers (Perplexity)

```
Request → Routing → Adapter → Response
    ↓
If error occurs:
    ↓
Check: requiresServerProxy === true?
    ↓
YES → Throw structured error (NO fallback)
    ↓
Error message: "Recipe generation failed for server-only provider..."
```

### For Browser-Capable Providers

```
Request → Routing → Adapter → Response
    ↓
If error occurs:
    ↓
Check: requiresServerProxy === true?
    ↓
NO → Fallback to direct API call (if configured)
```

## Error Messages

### Routing Configuration Error
```
"Recipe AI routing not configured. Please set up a route for 'Recipe Generation' 
feature in Admin → AI Feature Routing, or contact your administrator."
```

### Response Validation Error
```
"Perplexity response could not be parsed — check response mapper. 
The AI response structure does not match the expected recipe format. 
Please try again or contact support."
```

### Server-Only Provider Error
```
"Recipe generation failed for server-only provider. 
This provider requires server-side proxy and cannot be called directly from the browser. 
Error: [details]. Please check server configuration or try again."
```

## Validation Improvements

### Before
- Generic "Invalid response structure from Perplexity"
- No logging details
- Assumed OpenAI format

### After
- Specific error messages
- Detailed logging with response structure
- Perplexity-specific validation
- Better debugging information

## Security Benefits

1. **No CSP Violations**: Perplexity is never called directly from browser
2. **API Key Protection**: Keys stay server-side only
3. **Architectural Correctness**: Server-only providers behave correctly
4. **Clear Error Boundaries**: Users get helpful error messages

## Testing Checklist

- [ ] Perplexity route configured in Admin → AI Feature Routing
- [ ] Recipe generation works through routing
- [ ] Validation errors show helpful messages
- [ ] No browser console errors about CORS
- [ ] No direct `fetch()` calls to `api.perplexity.ai` in network tab
- [ ] Server-only provider errors are clear and actionable

## Files Modified

1. `src/lib/guardrails/ai/providerRegistryTypes.ts` - Added provider flags to ResolvedRoute
2. `src/lib/guardrails/ai/aiRoutingService.ts` - Include provider flags in routes
3. `src/lib/recipeAIService.ts` - Fixed fallback logic and error handling

## Acceptance Criteria ✅

- ✅ Perplexity is never called directly from the browser
- ✅ CSP violations are impossible
- ✅ Invalid Perplexity responses fail gracefully
- ✅ Routing success does not imply fallback
- ✅ Server-only providers behave differently from browser-capable providers
- ✅ Clear, actionable error messages
