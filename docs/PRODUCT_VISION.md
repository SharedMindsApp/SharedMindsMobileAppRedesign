# SharedMinds — Product Vision

> *Last updated: May 2026*

---

## The Pivot in One Sentence

SharedMinds was a personal ADHD productivity app. It is now a **community virtual coworking platform** for creative professionals and solopreneurs who work alone but work better together.

The codebase infrastructure (auth, Supabase, tasks, projects, calendar) is preserved and reused. The product surface — what users see, navigate, and do — is completely redirected around one loop: **declare → work → ship.**

---

## The Insight

**Body doubling works.** Research consistently shows that working alongside other people — even strangers, even silently — significantly increases focus and task completion. This is especially powerful for solo workers who lack the passive structure of an office.

Focusmate and Flow Club proved there is real demand for virtual coworking. But both leave two things on the table:

1. **No real accountability.** You can show up to a Focusmate session and browse Twitter. There is no declaration, no outcome, no record.
2. **No community.** Each session is a disposable random pairing. You never build relationships or a reputation. There is nothing to come back to.

SharedMinds solves both. You declare what you're working on before you start. You work alongside a live feed of others doing the same. You report back. Your track record grows in public. Over time, the people you work alongside become your network.

---

## Target Audience

**Primary:** Creative professionals working independently — designers, developers, writers, filmmakers, consultants, indie founders. They have full control of their time, no imposed structure, and strong intrinsic motivation that nonetheless struggles with the blank canvas of unstructured days.

**Secondary:** Remote employees who miss the casual ambient accountability of an office and want a small dose of it without a 9-to-5 obligation.

**Not:** Families, couples, teams with a shared project management problem. Those are different products.

---

## The Session Loop (The Core Product)

Every interaction in SharedMinds orbits this three-step sequence:

```
DECLARE ──► WORK ──► SHIP
```

### 1. Declare
Before starting, the user names the thing they'll finish. They can pick from their task list or type a free-text goal. No session starts without this step — it is the accountability mechanism.

### 2. Work
A focus block runs — 25, 50, or 90 minutes. During this time, their session is visible on the community hub to anyone. Other users see the declared goal, elapsed time, and duration badge. Optionally a Jitsi video room is attached (co-present video without any infrastructure cost).

### 3. Ship
When the session ends, the user is asked: **did you finish it?**
- ✅ Yes, I finished it
- 🔶 Partially done
- 💨 Something came up

This outcome is recorded, displayed on their profile, and eventually surfaced in the shipped feed on the Sessions hub. Over time, their completion record becomes a real public signal.

---

## Session Modes

| Mode | Visible to | Video room |
|------|-----------|------------|
| **Private** | Only the user | Optional Jitsi |
| **Shared** | Specific connections (invite-only) | Jitsi, invite-only |
| **Public** | The whole SharedMinds community | Jitsi, open join |

### Session Types
- **Drop-in** — start now, visible immediately
- **Scheduled** — created in advance with title, time, and description. Has a shareable join link usable outside the app (Skool, Meetup, newsletters). Joining via link creates an account if the user doesn't have one — this is the acquisition funnel.

---

## Feature Architecture

### Core (available to all users from day one)
| Feature | Purpose |
|---------|---------|
| Sessions hub | Live feed of who's working + shipped feed |
| Declare + start session | The core loop entry point |
| Active session timer | Running clock, visible to others |
| Session outcome (Ship screen) | Close the loop |
| Tasks | Private list, feeds the Declare step |
| Projects | Private / Shared / Public |
| Connections | Mutual follow, builds over session attendance |
| Profile | Avatar, bio, work type, location, stats, shipped work |
| Direct messages | 1:1 DMs with connections |
| Home dashboard | State-aware: new user hero vs returning user daily card |
| Onboarding | Name → work type → how-it-works |
| Settings | Profile editing, appearance |

### Progressive Unlock (earned through usage)
| Feature | Unlocks at |
|---------|-----------|
| Progress page | 10 sessions |
| AI post-session check-in | 10 sessions |
| Calendar (schedule focus blocks) | 25 sessions |

The unlock gates serve two purposes: they reduce cognitive overhead for new users, and they create a sense of progression that motivates early return visits.

### Admin Only (is_admin flag)
| Feature | Notes |
|---------|-------|
| Pantry / meal planning | Personal use by founder |
| Guardrails / drift detection | Legacy power feature, possible future opt-in |
| Journal | Personal use |
| Reports | Usage analytics |
| ViewAs | Support / debugging tool |

### Hidden (code preserved, not exposed)
- Family and couple onboarding copy
- Partner-linking flows
- E2E encrypted messaging (replaced by simpler DM system)

---

## Connections Model

Symmetric — both users must accept. No follower model for MVP.

**How connections form:** After a session ends, participants see a Connect button next to each other. This is the primary connection surface — connections form naturally through shared work, not cold browsing.

**What a connection gives you:**
- Visibility into each other's shared-visibility content
- Ability to invite to Shared sessions
- Ability to DM
- Appearance in each other's connections list
- Social proof: connection count on profile

---

## Privacy Model

Every piece of content has exactly one visibility state. Three options, consistently applied everywhere:

| State | Visible to |
|-------|-----------|
| **Private** | Only you |
| **Connections** | Mutually connected users |
| **Public** | The entire SharedMinds community |

**Defaults:**
- Sessions: Public while active (this is the core community mechanic — hiding by default breaks it)
- Tasks: Private
- Projects: Private
- Profile stats and shipped feed: Public

---

## Video Strategy

**Jitsi IFrame API** — embedded directly in the session page. Free, no per-minute cost, no infrastructure required. Users create or join a Jitsi room within the app without leaving. Camera-on is optional but encouraged.

Future option: self-host Jitsi on a VPS for full control if needed at scale. The IFrame API contract makes this a zero-code swap.

---

## Navigation Structure

```
Bottom nav (4 tabs):
├── Home        — daily dashboard, state-aware
├── Sessions    — community hub
├── Connections — network
└── Settings    — profile + prefs

More menu (secondary):
├── Tasks
├── Projects
├── Progress    (unlocks at 10 sessions)
└── Calendar    (unlocks at 25 sessions)

Admin section (is_admin only):
├── Pantry
├── Journal
└── Reports
```

---

## Design Principles

### 1. Friction is the feature
The declaration step exists specifically because naming a thing creates commitment. Do not remove, shorten, or make skippable. The moment the declaration step becomes optional, the product stops working.

### 2. The feed is the product
The live Sessions hub — seeing other people working right now — is the primary motivational mechanism. It must load fast, update in real time, and never be empty. For new users with no community yet, seed the feed with any active users globally.

### 3. Public track record > private stats
Privacy-first products are fine. But SharedMinds' value proposition is *social accountability*. Your completion rate being visible to others is the point. The default should lean public.

### 4. Zero configuration for new users
Show four tabs. One loop. No settings to configure before the first session. Complexity is earned through usage (progressive unlock), not offered upfront.

### 5. Sessions as the acquisition funnel
Scheduled sessions with shareable links are the GTM mechanism. The join link must work for non-users — anyone who clicks it should land on a sign-up + declare + join flow that takes under 60 seconds. This is how SharedMinds grows without a marketing budget.

### 6. Community compounds
The product gets better as more people use it. A user at session 1 sees a sparse feed. A user at session 50 has a rich network, a track record, and regular connections they work with. Design every feature with "what does this feel like with 10 users? 100? 1,000?" in mind.

---

## Go-to-Market

**Phase 0 — Founder-led sessions (now)**
Matthew hosts virtual coworking sessions on Skool and Meetup. Participants sign up to SharedMinds to join. Zero ad spend. The product is the marketing: people who ship work in a session have a concrete, tangible experience to share.

**Phase 1 — Community seeding (~20 active members)**
Identify 3–5 regulars from early sessions. Give them early-access framing, not beta-tester framing. They are founding members, not guinea pigs. Their feedback shapes prioritisation.

**Phase 2 — Freemium introduction (~100 active members)**
Introduce a free tier (limited sessions/month) and a paid tier (unlimited + features TBD). The community itself is the retention mechanism — people pay to stay connected to the network they've built, not for feature unlocks.

**Phase 3 — Community-hosted sessions**
Allow any user to host public scheduled sessions. SharedMinds becomes a network of coworking rooms, not just one room run by the founder.

---

## MVP Success Criteria

1. Ten people attend a session willingly without being paid or pressured
2. At least three come back the following week without being reminded  
3. At least one tells someone else unprompted

These three criteria, if met, prove product-market fit at the smallest meaningful scale.

---

## What This Product Is Not

Documenting what we are *not* building is as important as what we are building.

| Not this | Why |
|----------|-----|
| A project management tool | Asana exists. Tasks serve the Declare step only. |
| A time tracker | Toggl exists. Session duration is fixed, not measured. |
| A social network | LinkedIn exists. Connections are a byproduct of work, not the goal. |
| A team communication tool | Slack exists. DMs serve the network, not the workplace. |
| An AI productivity assistant | Derivative. The human presence is the product. |
| A meditation / wellness app | SharedMinds is about output, not input. |

The test for any new feature: **does it serve the declare → work → ship loop, or does it serve the community that forms around it?** If neither, it waits.
