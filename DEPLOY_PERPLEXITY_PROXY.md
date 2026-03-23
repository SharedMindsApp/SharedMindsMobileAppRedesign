# Deploy Perplexity Proxy - Quick Guide

## Step 1: Install Supabase CLI (if not installed)

```bash
# Install globally
npm install -g supabase

# Or using npx (no installation needed)
npx supabase --version
```

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

## Step 3: Link Your Project (if not already linked)

```bash
# From your project root directory
supabase link --project-ref your-project-ref
```

You can find your project ref in Supabase Dashboard → Settings → General → Reference ID

## Step 4: Deploy the Edge Function

```bash
supabase functions deploy perplexity-proxy
```

## Step 5: Set the Environment Variable

### Using CLI:
```bash
supabase secrets set PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Using Dashboard (Alternative):
1. Go to Supabase Dashboard
2. Navigate to **Project Settings** → **Edge Functions**
3. Click **Secrets** tab
4. Add new secret:
   - **Name:** `PERPLEXITY_API_KEY`
   - **Value:** Your Perplexity API key (starts with `pplx-`)
5. Click **Save**

## Step 6: Verify Deployment

Test the health check:
```bash
# Replace with your actual Supabase URL and anon key
curl -X GET "https://your-project.supabase.co/functions/v1/perplexity-proxy" \
  -H "apikey: your-anon-key"
```

Expected response:
```json
{"status":"ok","provider":"perplexity","timestamp":"2025-02-30T..."}
```

---

## Alternative: Deploy via Supabase Dashboard

If you prefer not to use CLI:

1. **Upload Function Files:**
   - Go to Supabase Dashboard → Edge Functions
   - Click "Create Function"
   - Name: `perplexity-proxy`
   - Copy the contents of `supabase/functions/perplexity-proxy/index.ts`
   - Paste into the editor
   - Click "Deploy"

2. **Set Environment Variable:**
   - Go to Project Settings → Edge Functions → Secrets
   - Add `PERPLEXITY_API_KEY` with your key value
   - Save

---

## Troubleshooting

### "Command not found: supabase"
- Install: `npm install -g supabase`
- Or use: `npx supabase functions deploy perplexity-proxy`

### "Not logged in"
- Run: `supabase login`

### "Project not linked"
- Run: `supabase link --project-ref your-project-ref`

### "Function not found"
- Make sure you're in the project root directory
- Verify `supabase/functions/perplexity-proxy/index.ts` exists
