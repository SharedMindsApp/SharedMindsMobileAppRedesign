# Meal Planner AI Routing Setup

## Overview

The Meal Planner app uses AI routing to generate recipes via Perplexity. This ensures all recipe generation requests go through the configured AI routing system, allowing administrators to control which models are used.

## Feature: `spaces_recipe_generation`

The recipe generation feature is configured as:
- **Feature Key:** `spaces_recipe_generation`
- **Surface Type:** `shared` (meal planner is in shared spaces)
- **Required Capabilities:** `search` (Perplexity models have this)
- **Intents:** `generate_recipe`, `recipe_generation`, `recipe_search`

## Setup Instructions

### Step 1: Configure AI Route

1. Go to **Admin → AI Feature Routing**
2. Find **"Recipe Generation"** in the feature list
3. Click **"Add Route"**
4. Configure the route:
   - **Feature:** Recipe Generation
   - **Surface Type:** Shared (or leave blank for default)
   - **Provider Model:** Select a Perplexity model (e.g., `sonar`, `sonar-pro`)
   - **Priority:** 1 (higher priority)
   - **Constraints:** Leave defaults or adjust as needed
5. Click **"Save"**

### Step 2: Verify Route is Active

- The route should appear under "Recipe Generation" in the routing list
- Ensure the route is **enabled** (toggle switch should be on)
- Verify the model has `search` capability enabled

### Step 3: Test Recipe Generation

1. Go to a **Shared Space** (household/team)
2. Open the **Meal Planner** widget
3. Search for a recipe (e.g., "chicken curry")
4. If no results found, click **"Generate Recipe"**
5. The system will:
   - Route the request through AI routing
   - Use the configured Perplexity model
   - Generate the recipe via Perplexity's web search
   - Save the recipe to your space

## How It Works

### Request Flow

```
User searches for recipe
    ↓
No results found
    ↓
User clicks "Generate Recipe"
    ↓
RecipeSearchWithAI component
    ↓
generateRecipeFromQuery()
    ↓
callPerplexityAPI() with AI routing
    ↓
AI Routing Service resolves route
    ↓
Finds route for spaces_recipe_generation
    ↓
Uses configured Perplexity model
    ↓
PerplexityAdapter (via server proxy)
    ↓
Perplexity API (web search + extraction)
    ↓
Recipe created and saved
```

### AI Routing Resolution

The system will:
1. Look for a route matching `spaces_recipe_generation` + `shared` surface
2. If found, use that route's model
3. If not found, use default route (if configured)
4. If no routes exist, show helpful error message

## Troubleshooting

### Error: "Recipe AI routing not configured"

**Cause:** No route configured for `spaces_recipe_generation`

**Solution:**
1. Go to Admin → AI Feature Routing
2. Add a route for "Recipe Generation"
3. Select a Perplexity model with `search` capability
4. Save and test again

### Error: "No route found"

**Cause:** Route exists but doesn't match the request (wrong surface type, etc.)

**Solution:**
1. Check the route configuration
2. Ensure surface type is `shared` or blank (for default)
3. Verify the route is enabled
4. Check that the model has `search` capability

### Error: "Perplexity API error"

**Cause:** Perplexity API key not configured or invalid

**Solution:**
1. Verify `PERPLEXITY_API_KEY` is set in Supabase Edge Function secrets
2. Check that the `perplexity-proxy` Edge Function is deployed
3. Test the proxy health check: `GET /functions/v1/perplexity-proxy`

### Fallback Behavior

If AI routing fails, the system will:
1. Try to use direct Perplexity API call (if `VITE_PERPLEXITY_API_KEY` is set)
2. Show error message if that also fails
3. Provide helpful guidance to configure routing

## Best Practices

1. **Use Perplexity Models:** Only Perplexity models have the `search` capability needed for recipe generation
2. **Set Priority:** Use higher priority (lower number) for preferred models
3. **Surface-Specific Routes:** Create `shared` surface routes for meal planner
4. **Monitor Usage:** Check AI logs to see which models are being used

## Example Route Configuration

```
Feature: Recipe Generation
Surface Type: Shared
Provider: Perplexity
Model: sonar-pro
Priority: 1
Constraints:
  - Max Context Tokens: 100000
  - Max Output Tokens: 4096
Enabled: ✓
```

This route will be used for all recipe generation requests in shared spaces (meal planner).
