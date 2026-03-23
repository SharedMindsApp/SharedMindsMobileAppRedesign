# Perplexity Edge Function Proxy - Deployment Guide

## Overview

The Perplexity AI provider requires server-side proxy due to CORS restrictions. All API calls are routed through the `perplexity-proxy` Supabase Edge Function.

## ✅ What Was Fixed

### 1. Enhanced Error Handling
- Added structured error logging with detailed context
- Improved request body parsing with error handling
- Better validation of required fields
- Clear error messages returned to frontend

### 2. Environment Variable Validation
- Hard runtime check for `PERPLEXITY_API_KEY`
- Clear error message if key is missing
- Confirmed key is NOT prefixed with `VITE_` (server-side only)

### 3. Request Validation
- Validates model name (sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro)
- Validates messages array is non-empty
- Validates request body format

### 4. Health Check Endpoint
- GET `/perplexity-proxy` returns status for testing
- Useful for verifying deployment without making API calls

### 5. Improved Logging
- Logs all API calls with context
- Logs errors with full details
- Helps diagnose issues in production

## 🚀 Deployment Steps

### Step 1: Deploy the Edge Function

```bash
# From project root
supabase functions deploy perplexity-proxy
```

**Expected output:**
```
Deploying function perplexity-proxy...
Function deployed successfully
```

### Step 2: Set Environment Variable (CRITICAL)

The API key must be set in Supabase Edge Function secrets, NOT in your `.env` file.

#### Option A: Using Supabase CLI

```bash
# Set the secret (replace with your actual key)
supabase secrets set PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions**
3. Click **Secrets** tab
4. Add new secret:
   - **Name:** `PERPLEXITY_API_KEY`
   - **Value:** `pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (your Perplexity API key)
5. Click **Save**

**⚠️ IMPORTANT:**
- The secret name must be exactly: `PERPLEXITY_API_KEY`
- Do NOT prefix with `VITE_` (that's for client-side only)
- The key should start with `pplx-`

### Step 3: Verify Deployment

#### Test Health Check

```bash
# Get your Supabase URL and anon key
SUPABASE_URL="https://your-project.supabase.co"
ANON_KEY="your-anon-key"

# Test health check
curl -X GET \
  "${SUPABASE_URL}/functions/v1/perplexity-proxy" \
  -H "apikey: ${ANON_KEY}"
```

**Expected response:**
```json
{
  "status": "ok",
  "provider": "perplexity",
  "timestamp": "2025-02-30T12:00:00.000Z"
}
```

#### Test API Call (with auth)

```bash
# Get auth token (from your app)
AUTH_TOKEN="your-auth-token"

curl -X POST \
  "${SUPABASE_URL}/functions/v1/perplexity-proxy" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar",
    "messages": [
      {"role": "user", "content": "Say hello"}
    ],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "pplx-...",
    "model": "sonar",
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "Hello! How can I help you today?"
        },
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 10,
      "completion_tokens": 9,
      "total_tokens": 19
    }
  }
}
```

## 🔍 Troubleshooting

### Error: "Failed to send a request to the Edge Function"

**Possible causes:**
1. Function not deployed
2. Function name mismatch
3. Network/CORS issue

**Solutions:**
1. Verify deployment:
   ```bash
   supabase functions list
   ```
   Should show `perplexity-proxy` in the list

2. Check function name matches exactly: `perplexity-proxy` (lowercase, hyphen)

3. Verify Supabase URL is correct in your frontend

### Error: "PERPLEXITY_API_KEY missing on server"

**Cause:** Environment variable not set in Supabase

**Solution:**
1. Set the secret using CLI or Dashboard (see Step 2 above)
2. Redeploy the function (secrets are loaded at runtime):
   ```bash
   supabase functions deploy perplexity-proxy
   ```

### Error: "Invalid request: model and messages are required"

**Cause:** Request body format is incorrect

**Solution:** Ensure request matches this format:
```json
{
  "model": "sonar",
  "messages": [
    {"role": "user", "content": "Your prompt here"}
  ],
  "temperature": 0.7,
  "max_tokens": 4096
}
```

### Error: "Perplexity API error: HTTP 401"

**Cause:** Invalid API key

**Solution:**
1. Verify your Perplexity API key is valid
2. Check the key is set correctly in Supabase secrets
3. Ensure key starts with `pplx-`

### Error: "Perplexity API error: HTTP 400"

**Cause:** Invalid model name or request format

**Solution:**
- Use valid model names: `sonar`, `sonar-pro`, `sonar-reasoning`, `sonar-reasoning-pro`
- Ensure messages array is properly formatted
- Check temperature and max_tokens are valid numbers

## 📋 Valid Perplexity Models

- `sonar` - Fast, general-purpose
- `sonar-pro` - Higher quality, slower
- `sonar-reasoning` - With reasoning capabilities
- `sonar-reasoning-pro` - Reasoning + higher quality

## 🔐 Security Notes

- ✅ API key is stored server-side only
- ✅ Never exposed to client
- ✅ All requests go through authenticated Supabase Edge Function
- ✅ CORS handled by Edge Function
- ❌ Do NOT put `PERPLEXITY_API_KEY` in `.env` file (it won't work)
- ❌ Do NOT use `VITE_PERPLEXITY_API_KEY` (that's for client-side, which Perplexity doesn't support)

## ✅ Verification Checklist

After deployment, verify:

- [ ] Function deployed: `supabase functions list` shows `perplexity-proxy`
- [ ] Health check works: GET `/perplexity-proxy` returns `{"status": "ok"}`
- [ ] Secret set: `PERPLEXITY_API_KEY` exists in Supabase secrets
- [ ] Test call succeeds: POST with valid request returns `{"success": true, "data": {...}}`
- [ ] Admin test modal works: Can test Perplexity models in Admin → AI Providers

## 🎯 Expected Behavior After Fix

1. **Admin Test Modal:**
   - Shows "This provider runs server-side for security reasons"
   - API calls succeed without CORS errors
   - Responses show token usage and latency

2. **API Responses:**
   - Success: `{"success": true, "data": {...}}`
   - Error: `{"success": false, "error": "...", "statusCode": 500}`

3. **Logs:**
   - Edge Function logs show detailed request/response info
   - Errors include full context for debugging

## 📞 Support

If issues persist:
1. Check Supabase Edge Function logs in dashboard
2. Verify API key is valid at https://www.perplexity.ai/
3. Test health check endpoint independently
4. Review error messages in Admin test modal diagnostics
