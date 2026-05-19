# SharedMinds — Roadmap to v1

## Honest read on the "big idea" proposals

Two ideas had been floated: **AI-augmented "Invisible Presence" body doubling** and a **smart privacy-first matching engine with compatibility scoring**.

### Camera-optional / "Invisible Presence"

**Already 60% built.** Quiet mode (mic muted by default) + Solo sessions (no room at all) cover the privacy spectrum. The missing piece is the middle: camera-off-but-mic-on with a presence signal that isn't a video tile. Worth building. **Cheap.**

**Don't build** "AI focus signals" like productivity heatmaps. At 10-20 users, generating that data is a privacy minefield for marginal value. People come for human presence, not AI surveillance. Save for revenue intent.

### AI-augmented matching with compatibility scoring

**The hard truth: at 10-20 users, ML matching is theatre.** You need at least a few hundred users and thousands of session ratings before ML beats a transparent rule-based system. Use rule-based matching with explicit "why" reasoning. ML belongs after ~50+ active users and ~1,000+ rated sessions.

**The real moat isn't the algorithm — it's the RATING DATA.** Build the data pipeline now (post-session feedback → ratings table), but use rule-based matching transparently. People should be able to *see* why they were matched: *"You both write in the morning, prefer silent sessions, work on deep tasks."* That's more trustworthy than ML at small scale.

**Skip neurotype-based matching as a primary axis.** Well-intentioned but data-sensitive and easy to get socially wrong. Make it a *self-declared filter*, not a matching axis.

---

## What we need MORE than fancy matching

| Gap | Why it matters more |
|---|---|
| **No onboarding** | New signup lands on home page cold — no first-session funnel. Kills activation more than bad matching ever could. |
| **No notifications inbox + email** | Replies, reactions, project invites, "Tom just opened a 1-on-1" — all invisible. The DM badge is the only notification. Session reminders only matter if they reach the user. |
| **No mobile/PWA polish** | Show-up-at-the-scheduled-time products need push + home-screen install. |
| **No drop-in matching** | Calendar is great but Focusmate's killer feature is "Match me with someone available now." |
| **No end-of-session feedback** | We never capture *whether the pairing worked.* That's the data the matching engine will need. |
| **The Stuck → Help loop is open** | People can post "Stuck" but no closing flow ties it to "book a 1-on-1 with someone who marked this work type as a skill." |

---

## The plan, prioritised

Each item ≈ 1–3 days. Roughly 3 weeks of focused work end-to-end.

### Phase 1 — Foundations

**1. Onboarding wizard** *(3 days)* — see `03-feature-specs.md#onboarding-wizard`
- 5 steps right after signup: name+photo → work type → timezone → first project → declare first session
- Each skippable but pushes the next
- Drops user into home with momentum chips already lit
- *Why first*: Activation rate compounds everything else

**2. Notifications inbox + email + push** *(8–10 days)* — see `02-email-notifications.md`
- Bell icon + dropdown for in-app
- Resend + React Email for transactional sends
- 12 email types: signup, reminders (24h, 15min), weekly review prompt, onboarding drip, DM, post reply, etc.
- Web push for "session starting in 5 minutes"
- Per-user preferences + digest mode
- *Why first*: Without this the whole community fabric is invisible, and session reminders are the entire retention loop

**3. End-of-session feedback** *(2 days)* — see `03-feature-specs.md#end-of-session-feedback`
- After existing outcome question, add: "How was it with [partner]?" 👍 / 👎 / skip
- For group sessions: "How was the energy?" 1–5 stars
- Save to `session_feedback` table tied to user + counterpart
- *Why now*: Data foundation for everything else. With even 200 ratings you can build a great Regulars list.

### Phase 2 — Sharpen the loop

**4. Drop-in matching ("Match me now")** *(3 days)* — see `03-feature-specs.md#drop-in-matching`
- Big button on /sessions: "Find me a partner now"
- Matches against anyone tapping the same button in the last 5 minutes
- Falls through to "create an open 1-on-1 slot" if no match yet
- Rule-based: timezone hour-window + matching quiet_mode + non-conflicting active session
- Show the "why": *"Matched with Sarah — both writing this morning, both prefer quiet mode"*
- *Why*: Closes the biggest functional gap vs. Focusmate

**5. Camera-on/off as a session option** *(1 day)* — see `03-feature-specs.md#camera-modes`
- Add `video_mode` field: `video_on` (default), `audio_only`, `presence_only`
- Surface in DeclareSessionModal next to Quiet Mode
- Active session page hides Jitsi tile when audio_only or presence_only
- *Why*: The "invisible presence" idea minus the AI theatre. Cheap, real value.

**6. Stuck → Help match flow** *(2 days)* — see `03-feature-specs.md#stuck-to-help-loop`
- "Help out" button on Stuck posts in community feed
- Opens a 1-on-1 scheduled session pre-filled with the post's content as the goal, with the original poster as the partner
- Notifications fire: "Tom offered to help with your stuck post"
- *Why*: Closes a currently-open loop into a real value loop unique to SharedMinds

### Phase 3 — Transparent matching

**7. Preference tags on profile** *(1 day)* — see `03-feature-specs.md#preference-tags`
- Add to profile: preferred energy (deep/admin/creative), preferred chattiness (silent/light/collaborative), default session length
- Show on profile + suggested-connections + drop-in matching

**8. Compatibility "why" surface** *(2 days)* — see `03-feature-specs.md#compatibility-why`
- For every match suggestion show 1–2 concrete reasons: *"Both deep-work mornings"*, *"Both UK time"*, *"Last 2 sessions: 👍👍"*
- No score number — that triggers gaming. Just the reasons.
- Backed by simple Postgres queries over `session_feedback` + `profiles.preferred_*`

**9. Past-session compatibility (Regulars)** *(2 days)* — see `03-feature-specs.md#regulars`
- When you've sessioned with someone 2+ times with 👍 each time, surface them as a "Regular"
- Auto-suggest them at the top of session declare flow
- *Why*: This IS the small-N compatibility scoring. Just past behaviour. Hard to game, easy to trust.

### Phase 4 — Habit + retention mechanics

**10. Streak weekly target** *(1 day)*
- Per-user weekly session goal (default 3). Visible progress. Sunday-night nudge if behind.

**11. Pattern reflection (smart, not AI)** *(2 days)*
- Auto-generated weekly summary on /reflection: *"You finished 7 sessions, averaged 50min. Best day: Tuesday. Most-finished project: Q4 deck."*
- Pure SQL over existing data. Zero AI. Feels insightful.

### Phase 5 — Paid tier candidates

Defer until ~50+ active users:
- **Recording + transcripts** (storage + transcription cost = real)
- **Google/iCal calendar sync** (real engineering, ongoing OAuth)
- **Larger group sessions** (8+ people, capacity gates)
- **Coach/agency tier** (branded rooms, multiple host profiles)

---

## What to deliberately NOT build

- **ML-based matching** — premature. Build the data pipeline, defer the model.
- **AI focus signals / heatmaps** — privacy-fragile, low real value. Stretches what users trust.
- **Generic avatars / AI presence overlays** — gimmicky for an accountability product.
- **Posts ranking / feed algorithm** — chronological is right for small N.
- **Endless preference fields** — pick 3 axes. More than that creates a setup-tax that kills activation.

---

## 3-week execution sketch

| Week | Focus | Outcome |
|---|---|---|
| **1** | Phase 1: Onboarding + Notifications/Email + Session feedback | Activation rate rises. Community feels alive. Future matching has data flowing in. |
| **2** | Phase 2: Drop-in matching + Camera-off + Stuck→Help | "What makes us different from Focusmate" answer becomes concrete. |
| **3** | Phase 3: Preference tags + transparent compatibility + Regulars | Matching wedge built — without ML, without theatre, with the data pipeline already running. |

By end of week 3, SharedMinds has: a real activation funnel, complete communication+notification fabric, Focusmate-equivalent drop-in matching, camera-optional sessions, transparent matching that gets smarter with the network, and the data infrastructure to add real ML later if the user base ever justifies it.

---

## Strategic point

Matching data is the moat, but the trap is building ML before you have data. **Phase 1 #3 (session feedback)** and **Phase 3 #9 (regulars)** are the two highest-leverage things — they build the data asset *without* the algorithmic complexity.

Pure-AI matching is what Focusmate competitors have already tried and abandoned. The reason Focusmate still wins on matching isn't ML — it's that they have years of compatibility data and critical mass in every timezone. You won't beat that with AI; you beat it by being the platform where the **ritual is richer** — intentions, reflections, projects, weekly cadence — i.e. exactly what SharedMinds already does that Focusmate doesn't.

**Stay focused on the ritual moat. Build matching as plumbing, not as the headline feature.**

---

## Open questions to settle before locking the plan

1. **Is "Match me now" really table-stakes, or are scheduled sessions the differentiator?** If you think SharedMinds users are more deliberate (scheduled-only), drop-in matching drops in priority.

2. **Mobile-first or desktop-first?** If 70% of usage will be mobile, Phase 1 should prioritise PWA polish above the notifications inbox UI work.

3. **Is the founding cohort comfortable with cameras?** If yes, camera-off is a Phase 3 nice-to-have. If you're seeing people decline because of camera anxiety, it jumps to Phase 1.

4. **Vercel-side API routes or Supabase Edge Functions for emails?** Recommendation: Supabase Edge Functions (closer to DB, free tier is generous). See `02-email-notifications.md` for the trade-off.
