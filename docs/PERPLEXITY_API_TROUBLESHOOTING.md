# Perplexity API Troubleshooting Guide

## API Key Not Found Error

If you're getting the error "Perplexity API key not found" even though you've added it to `.env`, follow these steps:

### Step 1: Verify .env File Location
The `.env` file must be in the **project root** (same directory as `package.json`), not in `src/` or any subdirectory.

```
project/
  ├── .env              ← Must be here
  ├── package.json
  ├── src/
  └── ...
```

### Step 2: Verify .env File Format
The `.env` file should have this exact format (no quotes, no spaces around `=`):

```env
VITE_PERPLEXITY_API_KEY=pplx-your-actual-api-key-here
```

**Common mistakes:**
- ❌ `VITE_PERPLEXITY_API_KEY = "pplx-..."` (spaces and quotes)
- ❌ `PERPLEXITY_API_KEY=pplx-...` (missing VITE_ prefix)
- ❌ `VITE_PERPLEXITY_API_KEY="pplx-..."` (quotes)
- ✅ `VITE_PERPLEXITY_API_KEY=pplx-...` (correct)

### Step 3: Restart Development Server
**CRITICAL**: After adding or changing environment variables, you MUST restart your dev server:

1. Stop the current dev server (Ctrl+C)
2. Start it again: `npm run dev` or `vite`

Vite only reads `.env` files when the server starts. Changes to `.env` won't be picked up without a restart.

### Step 4: Check Browser Console
Open your browser's developer console and look for debug messages. The code will log:
- Whether the key was found
- The key's length (first 4 characters hidden for security)
- All environment variables containing "PERPLEXITY" or "API"

### Step 5: Verify API Key Format
Perplexity API keys typically start with `pplx-`. Make sure:
- The key is complete (not truncated)
- There are no extra spaces or newlines
- The key hasn't expired or been revoked

### Step 6: Test API Key Manually
You can test if your API key works by running this in the browser console:

```javascript
const key = import.meta.env.VITE_PERPLEXITY_API_KEY;
console.log('Key found:', !!key);
console.log('Key length:', key?.length);
console.log('Key prefix:', key?.substring(0, 4));
```

If `key` is `undefined`, the environment variable isn't being loaded.

## Still Not Working?

1. **Check for typos**: Ensure the variable name is exactly `VITE_PERPLEXITY_API_KEY`
2. **Check .gitignore**: Make sure `.env` is in `.gitignore` (it should be)
3. **Clear browser cache**: Sometimes cached environment variables can cause issues
4. **Check for multiple .env files**: Make sure you're editing the right one
5. **Verify Vite is running**: Environment variables only work in Vite dev mode

## Getting Your Perplexity API Key

1. Go to [Perplexity AI Platform](https://www.perplexity.ai/settings/api)
2. Sign in or create an account
3. Navigate to API settings
4. Generate a new API key
5. Copy the key (it starts with `pplx-`)
6. Add it to your `.env` file as shown above
7. **Restart your dev server**

## API Endpoint and Model

The code uses:
- **Endpoint**: `https://api.perplexity.ai/chat/completions`
- **Model**: `sonar` (default) or `sonar-pro`
- **Authentication**: Bearer token in Authorization header

This matches the official Perplexity API documentation.
