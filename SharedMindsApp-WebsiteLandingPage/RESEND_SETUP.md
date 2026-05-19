# Resend Email Setup for SharedMinds Waitlist

## Overview

The SharedMinds waitlist automatically sends confirmation emails to users when they sign up. This guide explains how to configure Resend for email delivery.

**Related Documentation:**
- [UNSUBSCRIBE_SYSTEM.md](./UNSUBSCRIBE_SYSTEM.md) - Complete unsubscribe system documentation

---

## Prerequisites

- Supabase project (already configured)
- Resend account
- Domain for sending emails (or use Resend's test domain for development)

---

## Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

**Free Tier Limits:**
- 100 emails per day
- 3,000 emails per month
- Perfect for MVP and initial launch

---

## Step 2: Get Your API Key

1. Log in to [Resend Dashboard](https://resend.com/dashboard)
2. Click on **API Keys** in the left sidebar
3. Click **Create API Key**
4. Name it: `SharedMinds Waitlist`
5. Select permissions: **Sending access**
6. Click **Create**
7. **Copy the API key immediately** (you won't see it again)

---

## Step 3: Configure Domain (Recommended for Production)

### Option A: Use Your Domain (Recommended)

1. In Resend Dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `sharedminds.app`
4. Follow the DNS setup instructions:
   - Add SPF record
   - Add DKIM records
   - Add DMARC record (optional but recommended)
5. Wait for DNS propagation (can take up to 48 hours)
6. Verify domain in Resend Dashboard

**Sender Email Format:**
```
no-reply@sharedminds.app
```

### Option B: Use Resend Test Domain (Development Only)

For testing, Resend provides a test domain:
```
onboarding@resend.dev
```

**Important:** Test domain emails may go to spam and have limitations.

---

## Step 4: Configure Environment Variables in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `fxbpimfbpxjuyyzactup`
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Add the following secrets:

### Required Secrets

| Secret Name | Value | Example |
|-------------|-------|---------|
| `RESEND_API_KEY` | Your Resend API key | `re_123abc...` |
| `FROM_EMAIL` | Your sender email | `no-reply@sharedminds.app` |

### How to Add Secrets

```bash
# Using Supabase CLI (if you have it installed locally)
supabase secrets set RESEND_API_KEY=your_actual_api_key_here
supabase secrets set FROM_EMAIL=no-reply@sharedminds.app
```

**Or via Dashboard:**
1. Click **Add Secret**
2. Enter `RESEND_API_KEY` as the name
3. Paste your API key as the value
4. Click **Save**
5. Repeat for `FROM_EMAIL`

---

## Step 5: Test the Email Flow

### Test Signup

1. Go to your landing page
2. Enter your email address
3. Click "Join Waitlist"
4. Check your inbox for the confirmation email

### Expected Behavior

- **Immediate:** User sees success message
- **Within seconds:** Confirmation email arrives
- **If email fails:** Signup still succeeds (email error is logged but doesn't block)

### Check Logs

1. Go to Supabase Dashboard → **Edge Functions** → **Logs**
2. Select both `join-waitlist` and `send-waitlist-confirmation` functions
3. Look for:
   - ✅ "Function called" - Confirms function execution
   - ✅ "email: [email address]" - Shows the email being processed
   - ✅ "has resend key: true" - Confirms API key is configured
   - ✅ "Confirmation email sent successfully" - Email delivered
   - ❌ Error messages if something failed

### Check Resend Dashboard

1. Go to [Resend Dashboard](https://resend.com/emails)
2. View **Emails** tab
3. See delivery status for each email:
   - **Delivered**: Email successfully sent
   - **Bounced**: Invalid email address
   - **Complained**: Marked as spam

---

## Architecture

### How It Works

```
User Submits Email
       ↓
join-waitlist Edge Function
       ↓
1. Validates email
2. Inserts into database
3. Triggers email (non-blocking)
       ↓
send-waitlist-confirmation Edge Function
       ↓
Calls Resend API
       ↓
Email Delivered to User
```

### Key Design Decisions

1. **Non-blocking emails:** Signup succeeds even if email fails
2. **Server-side only:** Emails sent from edge functions, not client
3. **No authentication required:** Public endpoints don't require user JWT
4. **Service role key:** Edge functions use admin credentials to access database
5. **Graceful degradation:** Email failures are logged but don't block users
6. **Duplicate handling:** Existing emails don't receive duplicate confirmations
7. **Compliance built-in:** Every email includes one-click unsubscribe link
8. **User-respectful:** Clear unsubscribe flow with no barriers

---

## Email Content

### Subject Line
```
You're on the SharedMinds waitlist 🌱
```

### Key Messages

1. **Confirmation:** You're successfully on the waitlist
2. **Expectation:** Beta invites coming in stages
3. **Reassurance:** No spam, meaningful updates only
4. **Trust:** Easy to unsubscribe anytime

### Design Principles

- Calm, friendly tone
- On-brand with SharedMinds
- Clear and minimal
- Accessible (text + HTML versions)
- Mobile-responsive

---

## Troubleshooting

### Email Not Arriving

**Check 1: Spam Folder**
- Confirmation emails may initially go to spam
- Mark as "Not Spam" to train filters

**Check 2: Domain Verification**
- Verify domain is properly configured in Resend
- Check DNS records are propagated

**Check 3: Resend Logs**
- Check Resend Dashboard for delivery status
- Look for bounce or complaint notifications

**Check 4: Edge Function Logs**
- Check Supabase logs for errors
- Look for API key issues or network errors

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Email service not configured" | Missing `RESEND_API_KEY` | Add secret in Supabase Dashboard |
| "Invalid JWT" error | Authorization header in function call | Fixed in latest version - no auth required |
| "has resend key: false" | Secret not configured | Add `RESEND_API_KEY` in Edge Functions Secrets |
| Emails go to spam | Domain not verified | Verify domain and add DNS records |
| API rate limit exceeded | Too many emails | Upgrade Resend plan |
| Invalid API key | Wrong key or expired | Regenerate key in Resend |
| 409 Conflict | Email already on waitlist | This is expected behavior, not an error |

### Test Email Command

You can manually test the email function:

```bash
curl -X POST https://fxbpimfbpxjuyyzactup.supabase.co/functions/v1/send-waitlist-confirmation \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

---

## Production Checklist

Before launching:

- [ ] Domain verified in Resend
- [ ] SPF, DKIM, DMARC records configured
- [ ] `RESEND_API_KEY` secret configured in Supabase
- [ ] `FROM_EMAIL` secret configured in Supabase
- [ ] Test email received successfully
- [ ] Email doesn't go to spam
- [ ] Resend plan upgraded (if expecting > 100 signups/day)
- [ ] Monitoring set up for email failures

---

## Monitoring & Maintenance

### Daily Checks

1. **Resend Dashboard:** Check email delivery rates
2. **Supabase Logs:** Monitor for errors
3. **Bounce Rate:** Should be < 5%

### Weekly Checks

1. **Email deliverability:** Test from different providers
2. **Spam score:** Use tools like mail-tester.com
3. **API usage:** Ensure within plan limits

### Monthly Tasks

1. Review email content for improvements
2. Check unsubscribe rates
3. Analyze open rates (when available)
4. Update copy based on feedback

---

## Future Enhancements

Potential improvements for later:

1. **Email templates:** Move to Resend's template system
2. **Personalization:** Add user's name (if collected)
3. **Drip campaigns:** Follow-up emails for engaged users
4. **Analytics:** Track open and click rates
5. **A/B testing:** Test different subject lines
6. **Unsubscribe flow:** Add preference center

---

## Cost Estimates

### Resend Pricing

| Plan | Emails/Month | Cost | Best For |
|------|--------------|------|----------|
| Free | 3,000 | $0 | MVP, Testing |
| Pro | 50,000 | $20 | Early Growth |
| Scale | 500,000 | $100 | Production |

**Recommendation:** Start with Free tier for MVP, upgrade to Pro when approaching 100 signups/day.

---

## Security Notes

1. **API Key Security:**
   - Never commit API keys to Git
   - Use Supabase secrets management
   - Rotate keys periodically

2. **Email Security:**
   - SPF/DKIM prevent spoofing
   - DMARC provides reporting
   - Always use HTTPS for API calls

3. **Privacy:**
   - Only send to confirmed signups
   - Honor unsubscribe requests immediately
   - Don't share email addresses with third parties

---

## Support

### Resend Support
- Documentation: [resend.com/docs](https://resend.com/docs)
- Email: support@resend.com
- Status: [status.resend.com](https://status.resend.com)

### Supabase Support
- Documentation: [supabase.com/docs](https://supabase.com/docs)
- Discord: [discord.supabase.com](https://discord.supabase.com)
- Status: [status.supabase.com](https://status.supabase.com)

---

## Summary

**What's Implemented:**
- ✅ Automatic confirmation emails on waitlist signup
- ✅ Beautiful, on-brand email template
- ✅ Non-blocking email delivery (signups never fail due to email issues)
- ✅ Duplicate prevention
- ✅ Error logging and monitoring

**What You Need to Do:**
1. Create Resend account
2. Get API key
3. Configure domain (or use test domain)
4. Add secrets to Supabase
5. Test the flow
6. Monitor delivery

**Ready for Production:**
Once you've completed the setup steps and verified email delivery, your waitlist is fully functional and ready to collect signups with automatic confirmation emails.

---

**Last Updated:** December 19, 2025
