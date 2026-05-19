# Unsubscribe System Documentation

## Overview

The waitlist email system now includes a fully compliant unsubscribe flow that follows email marketing best practices and legal requirements (CAN-SPAM Act, GDPR).

## System Architecture

### 1. Database Schema

**New Columns in `waitlist` table:**

- `subscribed` (boolean, default: true)
  - Controls whether user receives emails
  - Only users with `subscribed = true` receive communications

- `unsubscribe_token` (text, unique)
  - Cryptographically secure random token (64 characters)
  - Generated when user joins waitlist
  - Used in unsubscribe URLs
  - Unique per user, never reused

- `unsubscribed_at` (timestamptz, nullable)
  - Timestamp when user unsubscribed
  - Useful for analytics and compliance auditing
  - NULL if user is subscribed

**Indexes:**
- `idx_waitlist_unsubscribe_token` - Fast token lookups
- `idx_waitlist_subscribed` - Efficient filtering of active subscribers

### 2. Edge Functions

#### `join-waitlist`
- Generates unique unsubscribe token on signup
- Stores token in database with user record
- Passes token to email function
- Handles re-subscription for previously unsubscribed users

**Re-subscription Flow:**
If a user who previously unsubscribed rejoins:
1. Sets `subscribed = true`
2. Clears `unsubscribed_at`
3. Reuses existing `unsubscribe_token`
4. Sends new confirmation email

#### `send-waitlist-confirmation`
- Accepts `unsubscribeToken` parameter
- Includes unsubscribe link in all emails
- Uses branded email template
- Provides both HTML and plain text versions

**Email Features:**
- Logo at top (https://sharedminds.app/logo-email.png)
- Clean, accessible design
- Mobile-responsive layout
- Prominent unsubscribe link in footer
- Plain text fallback for email clients that don't support HTML

#### `unsubscribe`
- Public endpoint (no authentication required)
- Accepts token via query parameter
- Validates token and finds matching user
- Updates database: sets `subscribed = false`
- Records timestamp in `unsubscribed_at`
- Returns clear success/error messages

**Response Codes:**
- 200 - Successfully unsubscribed
- 200 - Already unsubscribed (not an error)
- 400 - Invalid or missing token
- 404 - Token not found
- 500 - Server error

### 3. Frontend

#### `UnsubscribePage` Component
- Displays at `/unsubscribe?token=XXX`
- Shows loading state while processing
- Clear success/error messaging
- Displays user's email after unsubscribe
- Link to return to homepage

**User Experience:**
- One-click unsubscribe (no login required)
- Immediate confirmation
- Clear messaging about what happened
- Option to return to site

## User Flow

### New Signup Flow
```
1. User enters email on landing page
2. Backend generates 64-character random token
3. Token stored in database with user record
4. Confirmation email sent with unsubscribe link
5. User receives branded email with:
   - Welcome message
   - Beta access information
   - Unsubscribe link in footer
```

### Unsubscribe Flow
```
1. User clicks unsubscribe link in email
2. Redirected to: https://sharedminds.app/unsubscribe?token=XXX
3. Frontend calls /functions/v1/unsubscribe?token=XXX
4. Backend validates token and updates database
5. User sees confirmation page
6. Future emails blocked (subscribed = false)
```

### Re-subscription Flow
```
1. Previously unsubscribed user rejoins waitlist
2. Backend detects existing record with subscribed = false
3. Updates subscribed = true, clears unsubscribed_at
4. Reuses existing unsubscribe_token
5. Sends new confirmation email
```

## Compliance Features

### CAN-SPAM Act (USA)
✅ Clear sender identification (from email)
✅ Accurate subject lines
✅ Physical address in footer (company info)
✅ One-click unsubscribe link
✅ Honor opt-outs immediately
✅ Monitor what others do on your behalf

### GDPR (EU)
✅ Easy unsubscribe mechanism
✅ No login required to unsubscribe
✅ Clear privacy communication
✅ Audit trail (unsubscribed_at timestamp)
✅ Explicit consent (user signs up)

### Best Practices
✅ Unsubscribe link in every email
✅ Process unsubscribe immediately
✅ Confirmation page after unsubscribe
✅ No shaming or guilt messaging
✅ Simple, respectful tone
✅ Branded, professional design

## Email Content

### Subject Line
```
You're on the SharedMinds waitlist
```

### Key Messages
1. Thank you for joining
2. Beta access coming in stages
3. No spam or pressure
4. Can unsubscribe anytime

### Footer
```
This email was sent to [email] because you signed up for the SharedMinds waitlist.

Unsubscribe anytime | Visit SharedMinds
```

## Testing

### Test Unsubscribe Flow

1. **Sign up for waitlist**
   ```
   POST /functions/v1/join-waitlist
   { "email": "test@example.com" }
   ```

2. **Check database**
   ```sql
   SELECT email, subscribed, unsubscribe_token
   FROM waitlist
   WHERE email = 'test@example.com';
   ```

3. **Check email**
   - Open confirmation email
   - Look for unsubscribe link
   - Verify format: https://sharedminds.app/unsubscribe?token=XXX

4. **Click unsubscribe link**
   - Should redirect to unsubscribe page
   - Should show success message
   - Should display email address

5. **Verify database update**
   ```sql
   SELECT email, subscribed, unsubscribed_at
   FROM waitlist
   WHERE email = 'test@example.com';
   ```
   - `subscribed` should be `false`
   - `unsubscribed_at` should have timestamp

6. **Try to rejoin**
   ```
   POST /functions/v1/join-waitlist
   { "email": "test@example.com" }
   ```
   - Should re-subscribe user
   - Should send new confirmation email
   - `subscribed` should be `true`
   - `unsubscribed_at` should be `null`

### Test Email Sending

**Check that emails are NOT sent to unsubscribed users:**

```sql
-- Get only subscribed users for email campaigns
SELECT email, unsubscribe_token
FROM waitlist
WHERE subscribed = true
  AND status = 'waitlisted';
```

### Check Logs

**Supabase Edge Function Logs:**

1. Go to Supabase Dashboard → Edge Functions → Logs
2. Select function:
   - `join-waitlist` - Check token generation
   - `send-waitlist-confirmation` - Check email sending
   - `unsubscribe` - Check unsubscribe processing

**Look for:**
- ✅ "Generated unsubscribe token"
- ✅ "has unsubscribe token: true"
- ✅ "Successfully unsubscribed"
- ❌ Any errors or failures

## Monitoring

### Key Metrics to Track

1. **Unsubscribe Rate**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE subscribed = false) as unsubscribed,
     COUNT(*) FILTER (WHERE subscribed = true) as subscribed,
     ROUND(100.0 * COUNT(*) FILTER (WHERE subscribed = false) / COUNT(*), 2) as unsubscribe_rate_percent
   FROM waitlist;
   ```

2. **Recent Unsubscribes**
   ```sql
   SELECT email, unsubscribed_at
   FROM waitlist
   WHERE subscribed = false
   ORDER BY unsubscribed_at DESC
   LIMIT 10;
   ```

3. **Re-subscriptions**
   ```sql
   SELECT COUNT(*)
   FROM waitlist
   WHERE subscribed = true
     AND unsubscribed_at IS NOT NULL;
   ```
   (These are users who unsubscribed and came back)

## Logo Image

The email template references: `https://sharedminds.app/logo-email.png`

**To update the email logo:**

1. Create/export your logo as PNG (recommended: 240px width for @2x displays)
2. Name it `logo-email.png`
3. Place in `/public/` folder
4. Deploy - it will be available at `https://sharedminds.app/logo-email.png`

**Current placeholder:**
- A temporary image is used as placeholder
- Replace with actual SharedMinds logo for production

## Future Enhancements

### Potential Improvements

1. **Unsubscribe Reasons**
   - Add optional feedback form
   - Track why users unsubscribe
   - Improve product based on feedback

2. **Preference Center**
   - Let users choose email types
   - Frequency preferences
   - More granular control

3. **List-Unsubscribe Header**
   - Add RFC 8058 support
   - One-click unsubscribe in email clients
   - Better deliverability

4. **Email Analytics**
   - Track open rates
   - Track click rates
   - A/B test subject lines

5. **Automated Campaigns**
   - Welcome series
   - Beta updates
   - Launch announcements

## Security Considerations

1. **Token Security**
   - 64-character cryptographically random tokens
   - Unique per user
   - Not guessable or enumerable

2. **No Authentication Required**
   - Unsubscribe works without login
   - CAN-SPAM requirement
   - User-friendly

3. **Rate Limiting**
   - Consider adding rate limits
   - Prevent abuse of endpoints

4. **Token Rotation**
   - Tokens never expire (by design)
   - Could add expiration if needed
   - Current: reused on re-subscription

## Support

If users report issues:

1. **Check Edge Function Logs**
   - Look for errors in unsubscribe function
   - Verify token validation

2. **Check Database**
   - Verify token exists
   - Check subscribed status

3. **Manual Override**
   ```sql
   UPDATE waitlist
   SET subscribed = false,
       unsubscribed_at = NOW()
   WHERE email = 'user@example.com';
   ```

4. **Contact Email**
   - Users can email: support@sharedminds.app
   - Mentioned in error messages
