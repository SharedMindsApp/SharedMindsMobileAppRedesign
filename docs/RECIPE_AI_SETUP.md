# Recipe AI Setup Guide

## Overview

The Recipe AI system uses Perplexity AI to search the internet and extract recipe information, automatically linking ingredients to your pantry system.

## Setup

### Step 1: Get Your Perplexity API Key

1. Go to [Perplexity AI Platform](https://www.perplexity.ai/settings/api)
2. Sign in or create an account
3. Generate an API key
4. Copy your API key (starts with `pplx-`)

### Step 2: Add API Key to Environment

Create or update your `.env` file in the project root:

```env
VITE_PERPLEXITY_API_KEY=pplx-your-api-key-here
```

**Important:** The `.env` file is gitignored and will not be committed to version control.

### Step 3: Restart Dev Server

After adding the API key, restart your development server for the changes to take effect.

## Configuration Options

The service supports two ways to provide the API key:

1. **Environment Variable (Recommended)**: Set `VITE_PERPLEXITY_API_KEY` in your `.env` file
2. **Inline Config**: Pass `apiKey` directly in the function call (useful for testing)

### Example Usage

```typescript
import { generateRecipeFromQuery } from './lib/recipeAIService';

// Using environment variable (recommended)
const recipe = await generateRecipeFromQuery(
  {
    query: "chicken curry recipe",
    meal_type: "dinner",
    cuisine: "indian",
    servings: 4
  },
  userId,
  householdId
  // No config needed - uses VITE_PERPLEXITY_API_KEY
);

// Or with inline config
const recipe = await generateRecipeFromQuery(
  {
    query: "vegetarian pasta",
    meal_type: "dinner"
  },
  userId,
  householdId,
  {
    apiKey: 'pplx-...', // Optional override
    model: 'sonar-pro'  // Optional: use pro model
  }
);
```

## Perplexity Models

Available models:
- `sonar` (default) - Standard model for recipe searches
- `sonar-pro` - More powerful, higher quality results

## Ingredient Matching

The system automatically:
1. Extracts ingredient names from Perplexity's response
2. Matches them to existing `food_items` in your pantry using fuzzy search
3. Creates new `food_items` if no match is found
4. Links all ingredients via `food_item_id` for pantry integration

### Data Quality Safeguards

The system includes several safeguards to ensure data quality:

**Ingredient Accuracy:**
- Uses EXACT ingredient names as they appear in the source
- Forbids normalization, simplification, or generalization
- Preserves specific descriptors (e.g., "chicken breast" not "chicken")

**Unit Handling:**
- Prevents duplicate units (e.g., "1/2 cup" + "cup" is invalid)
- If unit is embedded in quantity, unit field is set to empty string
- Only uses unit field when quantity is purely numeric

**Nutrition Data:**
- Only includes nutrition values if explicitly available from source
- Forbids estimation, inference, or guessing
- Omitted entirely if not found

**Images:**
- Only includes image URLs if they exist on the source page
- Forbids inventing or guessing image URLs

**Deduplication:**
- Generates SHA-256 hash of recipe (name + ingredients + instructions)
- Stored in metadata for duplicate detection
- Enables confidence upgrades over time

## Error Handling

If the API key is missing, you'll see:
```
Error: Perplexity API key not found. Please set VITE_PERPLEXITY_API_KEY environment variable or provide apiKey in config.
```

## Security Notes

- Never commit your `.env` file to version control
- API keys are client-side (Vite environment variables are exposed in the browser bundle)
- For production, consider using a Supabase Edge Function to hide the API key server-side

## Troubleshooting

### API Key Not Working

1. Verify the key is correct in `.env`
2. Check the key hasn't expired or been revoked
3. Ensure `.env` file is in the project root
4. Restart the dev server after adding the key

### Rate Limits

Perplexity has rate limits based on your plan. If you hit limits:
- The service processes requests sequentially
- Consider implementing retry logic with exponential backoff
- Upgrade your Perplexity plan if needed
