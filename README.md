# SharedMinds

**Where solo founders and remote workers show up, get work done, and build their network.**

SharedMinds is a community virtual coworking platform built around one loop:  
**declare → work → ship.**

You say what you're going to finish. You work alongside others in real time. You report back. Your track record builds in public.

---

## The Problem

Body doubling works. Sitting alongside other people — even strangers — makes it dramatically easier to start and finish work. Focusmate proved this. Flow Club proved this. But neither of them:

- Requires you to declare what you're working on (no real accountability)
- Builds a lasting community identity (each session is a disposable event)
- Connects you with people you'd actually want to know (no connections model)

SharedMinds pairs presence-based accountability with a real task declaration loop, a shipped-work feed, and a connections layer that lets your community grow over time.

---

## Who It's For

**Creative professionals and solopreneurs** — designers, developers, writers, filmmakers, consultants, founders — who work alone and need external structure to do their best work. Not a family app. Not a team project manager. A place to show up and ship.

---

## The Session Loop

Every session follows the same three steps:

1. **Declare** — pick a task from your list or type a one-line goal
2. **Work** — focus block runs (25, 50, or 90 min), live on the Sessions hub for others to see
3. **Ship** — did you finish? *Yes* / *Partially* / *Something came up*

Your outcomes accumulate on your public profile. Over time, your completion record becomes a real signal — to yourself and to others.

---

## Session Modes

| Mode | Visible to | Video |
|------|-----------|-------|
| **Private** | Only you | Optional |
| **Shared** | Connections you invite | Jitsi room (invite-only) |
| **Public** | The whole community | Jitsi room (open) |

**Drop-in** — start immediately, visible to your chosen audience at once.  
**Scheduled** — create in advance with a time and description, shareable join link for Skool / Meetup GTM.

---

## Navigation

| Tab | Purpose |
|-----|---------|
| **Home** | State-aware dashboard — daily focus, week streak, live peers, recent ships |
| **Sessions** | Community hub — who's working now, scheduled sessions, shipped feed |
| **Connections** | Your network — connect, see mutual activity |
| **Settings** | Profile, work type, appearance |

Additional tabs unlock progressively:
- **Tasks** — private task list, feeds the Declare step
- **Projects** — private / shared / public project tracking
- **Progress** — completion history, streak, session stats (unlocks at 10 sessions)
- **Calendar** — schedule focus blocks (unlocks at 25 sessions)

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + TypeScript + Vite | Fast, type-safe |
| Styling | Tailwind CSS + Stitch design tokens | Consistent, mobile-first |
| Backend | Supabase (Postgres + Auth + Realtime + Storage) | Already built, free at MVP scale |
| Video | Jitsi IFrame API | Free, zero infrastructure, self-hostable later |
| Hosting | Vercel | Free tier, instant deploys |
| Real-time | Supabase Realtime (Postgres changes) | Live session presence, DMs |

**Cost at MVP scale: effectively zero.**

---

## Current Build Status

- [x] Auth (Supabase, email magic link)
- [x] Onboarding (name, work type, how-it-works explainer)
- [x] Home dashboard (state-aware, new vs returning users)
- [x] Sessions hub (live community feed, real-time subscriptions)
- [x] Declare session modal (pick task or type goal, choose duration)
- [x] Session outcome recording (finished / partially / something came up)
- [x] Connections (request, accept, list)
- [x] Profile (avatar upload, bio, work type, location, stats, shipped feed)
- [x] Direct messages (1:1 DMs, real-time, unread badges)
- [x] Settings (profile editing, work type, sign out)
- [x] Progress page (completion history, week streak, stats)
- [ ] Jitsi video embed in active session
- [ ] Scheduled sessions + shareable join link
- [ ] Progressive feature unlock (session count gates)
- [ ] Shipped feed on Sessions hub (public)

---

## Running Locally

```bash
npm install
npx vite --port 5174
```

Requires a `.env` file with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## Go-to-Market

Host virtual coworking sessions via **Skool** and **Meetup**. Participants sign up to SharedMinds to join — the accountability loop happens on platform, the audience comes from existing communities. Free at launch. Freemium once the community reaches ~100 active members.

**MVP success criteria:**
1. Ten people attend a session willingly without being paid or pressured
2. At least three come back the following week without being reminded
3. At least one tells someone else unprompted

---

## Design Principles

1. **Friction where it matters.** The declaration step is intentional — making someone name what they'll do before they start is the whole product.
2. **Presence over features.** Knowing other people are working right now is the core value. Everything else serves that.
3. **Track record as identity.** Your shipped work is public. Over time it becomes a real signal, not a vanity metric.
4. **Zero cognitive overhead.** Three tabs, one loop. No configurability for its own sake. Complexity unlocks only when a user has earned it through usage.
5. **Community first.** Every feature decision must pass: does it serve the declare → work → ship loop, or does it serve the community that forms around it? If neither, it waits.
