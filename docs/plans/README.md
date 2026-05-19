# SharedMinds — v1 Implementation Plans

These docs are the working plan for the next ~3 weeks. Read in this order:

1. **[01-roadmap.md](./01-roadmap.md)** — Strategic phasing, what to build and why, what to deliberately skip
2. **[02-email-notifications.md](./02-email-notifications.md)** — Full email + in-app notifications infrastructure (the biggest single piece of foundational work)
3. **[03-feature-specs.md](./03-feature-specs.md)** — Concrete specs for the other Phase 1–3 features: onboarding wizard, drop-in matching, camera-off sessions, Stuck → Help loop, transparent matching, Regulars

## Tomorrow's recommended start

Begin with **02-email-notifications.md → Phase 1.A** (3 days of foundational schema + Resend setup + in-app inbox). It's the lowest-risk highest-leverage piece — every other future feature depends on it being in place.

Specifically, day 1 should be:

1. Resend account + domain verification (DNS records take a few hours to propagate, kick this off first)
2. `notifications` + `notification_preferences` SQL migration
3. Bell icon + notification dropdown in nav (in-app inbox)
4. Settings → Notifications panel with toggles

Day 2:

5. React Email templates package scaffolded
6. `send-notification-email` Edge Function + DB webhook wiring
7. First 3 templates (welcome, DM, post reply)

Day 3:

8. Wire existing notification triggers (DM insert, post_reply insert, connection_request insert) to also INSERT into `notifications`
9. End-to-end test: post a reply, receive in-app + email

Then **Phase 1.B** (scheduled emails — session reminders, weekly review prompts, onboarding drip) on day 4-6.

## Where these come from

Generated from the planning conversation on 2026-05-20 after the
Connections expansion (People directory, DMs with floating dock,
Community feed, Privacy toggle) shipped. The roadmap is opinionated —
push back on anything that doesn't match your read of where users are
dropping off.
