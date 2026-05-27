# Email templates

Source-of-truth copies of the Supabase Auth email templates. **Editing
a file here doesn't change anything in production** — you have to paste
the updated HTML into the Supabase dashboard. We track them in the repo
anyway so:

1. Design changes are version-controlled + reviewable in PRs
2. Anyone setting up a fresh Supabase project can paste-and-go
3. The wording is editable without remembering "which dashboard tab"

## How to update a template in production

1. Edit the relevant `*.html` file in this folder + commit
2. Go to **Supabase Dashboard → Authentication → Email Templates**
3. Pick the matching template (e.g. "Confirm signup")
4. Paste the HTML into the **Message (HTML)** tab
5. Update the **Subject** line if it changed (see top of each file for the
   suggested subject)
6. Click **Save**

A handful of providers cache template HTML aggressively — when in doubt,
send yourself a test email through the auth flow to confirm the change
landed.

## Template inventory

| File | Supabase template | When it fires |
|------|-------------------|---------------|
| `confirm-signup.html` | **Confirm signup** | Right after `supabase.auth.signUp()` — user must click to verify their email |
| _todo_ | **Magic link** | User requests password-less sign-in |
| _todo_ | **Reset password** | User clicks "Forgot password" |
| _todo_ | **Email change** | User changes their email in settings |
| _todo_ | **Invite** | Admin invites a user (currently unused) |

We've prioritised the signup template because it's the **first** thing
every user sees — the others can stay on Supabase defaults until we
need them to feel branded.

## Template variables

Supabase exposes these placeholders inside the HTML:

| Variable | Notes |
|---|---|
| `{{ .ConfirmationURL }}` | The full magic link including `redirect_to` — use this for the main CTA |
| `{{ .Token }}` | 6-digit OTP fallback if the link is unusable |
| `{{ .TokenHash }}` | Server-hashed token (advanced flows) |
| `{{ .Email }}` | Recipient email — show in fine print so they know which account this is for |
| `{{ .SiteURL }}` | The Site URL configured in dashboard settings |

## Design rules (kept consistent across all templates)

* **Table-based layout** — `<div>` flexbox breaks in Outlook
* **Inline CSS only** — `<style>` blocks get stripped by Gmail's clipping
* **Web-safe font stack** — system fonts (Apple/Segoe/Roboto)
* **Max width 560px** — readable on mobile, comfortable on desktop
* **Single CTA** — one prominent button, no competing actions
* **Plain fallback URL** — accessibility + paranoia for clients that
  strip the button styling
* **No external images** — wordmark is text-only with a gradient
  background bar; cuts dependency on a CDN and avoids the
  "click to download images" prompt in many clients
