# Planner Redesign Architecture

**Document Purpose**: Redesigned architecture for Planner as a calendar-anchored, forward-looking planning system with strict boundaries.

**Last Updated**: January 2025  
**Status**: Architectural Redesign Proposal

---

## Executive Summary

Planner is **time-aware life orchestration**—a calendar-anchored planning system that helps users navigate time, plan across life domains, and connect daily actions to long-term vision. Planner is **not** a tracking system, execution engine, or spatial canvas.

**Core Principle**: Planner helps you answer "What will I do?" and "When?" It does not track "What did I do?" or optimize how you do it.

---

## 1. What Planner Is

Planner is a **temporal planning system** that:

- **Orchestrates time** — Daily, weekly, monthly, quarterly, annual planning views
- **Bridges vision and action** — Long-term aspirations inform immediate planning
- **Coordinates across life domains** — Work, personal, household, finance, social, travel
- **Reflects without tracking** — Reflection tools that support planning, not data collection
- **Calendar-anchored** — All time-bound items flow through a unified calendar

---

## 2. What Planner Is NOT

Planner is **not**:

- ❌ A tracking system (that's Tracker Studio)
- ❌ A project execution engine (that's Guardrails)
- ❌ A spatial canvas or widget system (that's Spaces)
- ❌ A productivity optimizer or habit enforcer
- ❌ A data collection or analytics platform
- ❌ A backlog manager or catch-up system

---

## 3. Core Architectural Principles

### 3.1 Temporal First

**Principle**: Time is the primary organizing dimension. Life areas are secondary.

**Implementation**:
- Users navigate by time (Today, This Week, This Month, This Quarter, This Year)
- Life areas appear within temporal contexts, not as top-level navigation
- Calendar is the single source of truth for time-bound items

### 3.2 Forward-Looking Only

**Principle**: Planner asks "What will I do?" and "When?" Never "What did I do?"

**Implementation**:
- No historical logs, trackers, or measurement tools
- Reflection supports future planning, not backward-looking analysis
- No "catch-up" pressure or backlog management

### 3.3 Calendar-Centric

**Principle**: Calendar is the backbone. All time-bound items flow through calendar.

**Implementation**:
- Events, appointments, deadlines live in calendar
- Planning views read from calendar
- Calendar syncs with Guardrails (project deadlines) and Spaces (calendar widgets)

### 3.4 Life-Area Clarity

**Principle**: Each life area serves distinct planning needs with no overlap.

**Implementation**:
- Life areas are planning contexts, not data silos
- Clear boundaries between areas
- Redundant areas merged (Finance + Budget, Vision + Planning merged)

### 3.5 Optionality Over Enforceability

**Principle**: Planning is optional, flexible, and pressure-free.

**Implementation**:
- No required fields or completion tracking
- Soft defaults and suggestions, not enforcement
- Gentle resurfacing instead of alerts
- Incomplete plans are valid

---

## 4. Redesigned Life Areas (7 Core Areas)

After architectural audit, Planner is simplified to **7 core life areas**, each with clear planning purpose:

### 4.1 VISION

**Purpose**: Long-term direction, aspirations, and life planning that informs daily actions.

**Categories**:
- **Vision Board**: Visual representation of aspirations (linked to Spaces for actual images)
- **Long-term Goals**: 5-10 year goals across life dimensions
- **5-Year Plan**: Detailed multi-year vision with milestones
- **Monthly Reflection**: Monthly check-ins on vision alignment and progress
- **Career Vision**: Professional aspirations and career path planning
- **Values Alignment**: Ensuring daily actions align with core values

**What It Does NOT Contain**:
- ❌ Goal tracking or progress metrics (Tracker Studio)
- ❌ Project execution details (Guardrails)
- ❌ Visual creation tools (Spaces)
- ❌ Structured gratitude logs (Tracker Studio)

**Philosophy**: Vision is the compass. Regular reflection keeps vision alive and actionable, not tracked or measured.

---

### 4.2 WORK

**Purpose**: Professional planning, work coordination, and career development.

**Categories**:
- **Daily Work Intentions**: Morning planning, daily priorities, end-of-day reflection
- **Weekly Work Planning**: Weekly priorities, task batching, time blocking
- **Project Planning**: High-level project planning (detailed execution in Guardrails)
- **Meeting Planning**: Meeting preparation, agendas, notes planning
- **Career Development**: Career goals, skill development planning, professional growth
- **Professional Network**: Relationship planning, outreach intentions

**What It Does NOT Contain**:
- ❌ Task execution or completion tracking (Guardrails)
- ❌ Email management or inbox tracking (Spaces or Guardrails)
- ❌ Time tracking or productivity metrics (Tracker Studio)
- ❌ Detailed project management (Guardrails)

**Philosophy**: Work planning is about **clarity** and **coordination**, not task management. Execution belongs in Guardrails.

---

### 4.3 PERSONAL

**Purpose**: Personal life planning, self-discovery, values, and milestones.

**Categories**:
- **Personal Goals**: Personal development intentions and aspirations
- **Life Milestones**: Planning for significant life events and transitions
- **Hobbies & Interests**: Planning time for hobbies and personal activities
- **Personal Values**: Values identification and alignment planning
- **Self-Discovery**: Reflection prompts and personal exploration planning
- **Personal Manifesto**: Personal mission statement and guiding principles

**What It Does NOT Contain**:
- ❌ Habit tracking or daily logs (Tracker Studio)
- ❌ Mood tracking or energy logs (Tracker Studio)
- ❌ Growth metrics or progress tracking (Tracker Studio)
- ❌ Journal entries (belongs in Spaces or Journal temporal view)
- ❌ Skills tracking (Tracker Studio)

**Philosophy**: Personal planning is about **intentional living**, not optimization or measurement.

---

### 4.4 HOUSEHOLD

**Purpose**: Home management, family coordination, and household logistics.

**Categories**:
- **Household Overview**: Family calendar, shared responsibilities, coordination
- **Meal Planning**: Weekly meal planning, recipes, grocery planning
- **Household Maintenance**: Cleaning schedules, maintenance planning, seasonal tasks
- **Family Events**: Shared family events, celebrations, activities planning
- **Appointments**: Medical, service, and household appointments
- **Grocery Planning**: Shopping lists, pantry management planning

**What It Does NOT Contain**:
- ❌ Chore tracking or completion logs (Tracker Studio)
- ❌ Meal logging or nutrition tracking (Tracker Studio)
- ❌ Expense tracking (Financial Planning)
- ❌ Cleaning habit tracking (Tracker Studio)

**Philosophy**: Household planning is about **coordination** and **shared responsibility**, not individual productivity or tracking.

---

### 4.5 FINANCIAL PLANNING

**Purpose**: Financial planning, budgeting, and long-term financial health.

**Categories**:
- **Financial Overview**: Income planning, expense planning, financial goals
- **Budget Planning**: Monthly and weekly budget allocation
- **Savings Planning**: Savings goals, target planning, milestone planning
- **Debt Planning**: Debt payoff plans and strategy planning
- **Investment Planning**: Investment goals and portfolio planning
- **Bill Planning**: Bill payment planning and reminders

**What It Does NOT Contain**:
- ❌ Expense logging or transaction tracking (Tracker Studio or dedicated finance app)
- ❌ Investment performance tracking (external tools)
- ❌ Financial metrics or analytics (analytics tools)
- ❌ Budget adherence tracking (Tracker Studio)

**Philosophy**: Financial planning is about **intentional allocation** and **awareness**, not transaction logging or budget enforcement.

---

### 4.6 SOCIAL

**Purpose**: Relationship planning, social coordination, and connection intentions.

**Categories**:
- **Social Calendar**: Upcoming social events, gatherings, parties
- **Relationship Planning**: Reach-out intentions, connection goals
- **Important Dates**: Birthdays, anniversaries, special occasions
- **People Planning**: Relationship notes, conversation topics, follow-up planning
- **Social Goals**: Relationship aspirations and connection intentions

**What It Does NOT Contain**:
- ❌ Interaction logging or tracking (Tracker Studio)
- ❌ Relationship metrics or analytics
- ❌ Social media tracking
- ❌ Detailed relationship notes (belongs in Spaces)

**Philosophy**: Social planning maintains **intentional connection** in a busy world, not relationship optimization or tracking.

---

## 5. Removed Life Areas (Migration Notes)

### Education → Merged into Personal/Work
**Rationale**: Education planning overlaps with personal development (Personal) or professional development (Work). Academic planning is time-bound and fits into temporal views rather than needing a separate life area.

**Migration**:
- Study schedules → Daily/Weekly Timeline (temporal view)
- Assignment planning → Work project planning or Personal goals
- Grade planning → Personal goals or removed (tracking belongs in Tracker Studio)

### Budget → Merged into Financial Planning
**Rationale**: Budget is a subset of financial planning. Separating them creates redundancy and confusion.

**Migration**: All budget categories merge into Financial Planning.

### Self-Care → Split/Moved
**Rationale**: Self-care was mixing planning (intentions) with tracking (exercise logs, mood tracking). Tracking removed. Planning aspects belong in Personal or temporal views.

**Migration**:
- Wellness goals → Personal goals
- Exercise planning → Daily/Weekly Timeline (when to exercise, not tracking)
- Mindfulness planning → Daily/Weekly Timeline or Personal
- All tracking (exercise logs, sleep logs, nutrition logs, mood tracking) → Tracker Studio

### Travel → Kept as Core Life Area
**Rationale**: Travel planning is a standout feature that users actively seek. Trip planning involves complex logistics (itineraries, packing, budgets, accommodation) that benefit from a dedicated life area while remaining calendar-integrated. Travel is inherently temporal and planning-focused.

**Note**: Travel remains a core life area due to its distinct planning needs and user demand for trip planning features.

### Journal → Integrated into Temporal Reflection
**Rationale**: Journaling is reflection, not planning. Reflection belongs in temporal views (Daily Reflection, Weekly Reflection, Monthly Review), not a separate life area. Free-form journaling is identity-based and belongs in Spaces.

**Migration**:
- Daily journaling → Spaces (personal narrative, identity)
- Weekly/Monthly reflection → Temporal views (Daily Reflection, Weekly Reflection, Monthly Review)
- Gratitude logs → Tracker Studio (structured tracking)
- Mood/energy logs → Tracker Studio (tracking)

### Planning → Merged into Vision/Temporal Views
**Rationale**: "Planning" as a life area is redundant—everything in Planner is planning. Goal planning belongs in Vision. Task planning belongs in temporal views or Work.

**Migration**:
- Goal planning → Vision
- Priority planning → Daily/Weekly Timeline
- Project planning → Work
- Event planning → Calendar (temporal)

---

## 6. Temporal Architecture (The Core Structure)

Planner is organized around **temporal scales**, not life areas. Life areas appear within temporal contexts. Travel, as a time-bound activity, integrates seamlessly with calendar views.

### 6.1 Daily View

**Purpose**: Today's intentions, priorities, and end-of-day reflection.

**Structure**:
- **Morning**: Today's intentions (what you plan to do, not what you must do)
- **Calendar**: Today's events, appointments, deadlines
- **Time Blocks**: Optional time blocking for focused work or activities
- **Evening**: End-of-day reflection (what happened, what shifted, what's tomorrow)

**Life Areas Present**: Work, Personal, Household, Financial, Social appear as planning contexts

**Philosophy**: Today shapes tomorrow. Daily planning is about **presence** and **intention**, not productivity metrics or completion tracking.

---

### 6.2 Weekly View

**Purpose**: Week synthesis, priorities, and weekly reflection.

**Structure**:
- **Week Overview**: Week's major priorities and intentions across life areas
- **Weekly Calendar**: Week's events, appointments, deadlines
- **Weekly Goals**: Optional weekly intentions (not required, not tracked)
- **Weekly Reflection**: End-of-week reflection (what worked, what didn't, next week)

**Life Areas Present**: All 7 life areas appear as planning contexts

**Philosophy**: Weeks are the **rhythm unit** of modern life. Weekly planning respects natural cycles without enforcement.

---

### 6.3 Monthly View

**Purpose**: Month-at-a-glance, monthly planning, and monthly reflection.

**Structure**:
- **Monthly Calendar**: Full month view with events and deadlines
- **Monthly Intentions**: Optional monthly goals and priorities
- **Budget Planning**: Monthly budget allocation (Financial Planning)
- **Monthly Reflection**: End-of-month reflection on vision alignment and progress

**Life Areas Present**: All 7 life areas appear as planning contexts

**Philosophy**: Months provide **scope** for meaningful progress without overwhelming detail.

---

### 6.4 Quarterly View

**Purpose**: Quarterly alignment with vision, strategic planning, and quarterly reflection.

**Structure**:
- **Quarterly Calendar**: Quarter view with major milestones
- **Quarterly Goals**: Quarterly intentions aligned with vision
- **Quarterly Reflection**: End-of-quarter reflection on vision alignment

**Life Areas Present**: Vision, Work, Personal, Financial Planning, Travel prominently featured

**Philosophy**: Quarters offer **strategic perspective** and natural review cycles.

---

### 6.5 Annual View

**Purpose**: Year vision, annual planning, and year reflection.

**Structure**:
- **Annual Calendar**: Year view with major events and milestones
- **Vision Alignment**: Connection between vision and annual goals
- **Annual Reflection**: End-of-year reflection on life direction and vision

**Life Areas Present**: Vision prominently featured, all areas accessible

**Philosophy**: Annual planning connects **daily actions** to **life direction**.

---

## 7. Planner vs Other Systems (Clear Boundaries)

### Planner vs Tracker Studio

| Aspect | Planner | Tracker Studio |
|--------|---------|----------------|
| **Purpose** | Forward-looking planning | Backward-looking tracking |
| **Question** | "What will I do?" | "What did I do?" |
| **Data Type** | Intentions, plans, reflections | Behaviors, habits, measurements, logs |
| **Time Model** | Future-oriented | Historical data collection |
| **Boundary** | Zero tracking features | Sole owner of all tracking |

**Integration**: Planner may reference tracker signals (e.g., "low energy today") for adaptive planning in the future, but Planner never stores tracker data.

---

### Planner vs Guardrails

| Aspect | Planner | Guardrails |
|--------|---------|------------|
| **Purpose** | Time-aware planning | Project execution |
| **Question** | "What and when?" | "How?" |
| **Focus** | Calendar, schedules, intentions | Tasks, workflows, execution |
| **Boundary** | Planning and reflection | Task management and execution |

**Integration**: Planner creates project plans and schedules. Guardrails executes projects and manages tasks. Planner's calendar syncs with Guardrails deadlines.

---

### Planner vs Spaces

| Aspect | Planner | Spaces |
|--------|---------|--------|
| **Purpose** | Temporal planning | Spatial organization |
| **Organizing Dimension** | Time (calendar, timeline) | Space (canvas, widgets) |
| **Content Type** | Plans, events, intentions | Notes, ideas, identity, memory |
| **Boundary** | Planning and reflection only | Everything else (identity, memory, exploration) |

**Integration**: Planner calendar events appear in Spaces calendar widgets. Planner reflections may link to Spaces journals, but detailed journaling belongs in Spaces.

---

## 8. ADHD-Friendly Design Principles

### 8.1 Reduce Overwhelm

- **Temporal views prioritized**: Users navigate by time (Today, This Week), not life areas
- **Life areas are contexts**: Life areas appear within temporal views, not as separate dashboards
- **Optionality everywhere**: Nothing is required or enforced

### 8.2 Avoid Backlogs

- **No catch-up pressure**: Past incomplete items don't accumulate
- **Incomplete plans are valid**: Not finishing today's plan is fine
- **Soft resurfacing**: Unfinished items gently resurface in future views, not as alerts

### 8.3 Gentle Structure

- **Soft defaults**: Suggested time blocks, not enforced schedules
- **Flexible boundaries**: Daily plans can shift, weekly plans can change
- **No scoring**: No productivity metrics, completion rates, or streak tracking

### 8.4 Reflection Without Judgment

- **Reflection supports planning**: Reflection helps plan tomorrow, not judge today
- **No tracking**: Reflection is narrative, not data collection
- **Optional**: Reflection is always optional, never required

---

## 9. Migration Summary

### What Moves to Tracker Studio

- **All tracking**: Exercise logs, sleep logs, nutrition logs, mood tracking, energy logs
- **All habits**: Habit tracking, check-ins, streaks
- **All measurements**: Metrics, progress tracking, analytics
- **Structured logs**: Gratitude logs, mood logs, any repeatable data collection

### What Moves to Spaces

- **Identity-based content**: Personal narratives, detailed journaling, life story
- **Visual content**: Vision board images (linked from Planner, created in Spaces)
- **Exploratory content**: Ideas, inspiration boards, creative projects
- **Memory content**: Travel memories, life milestones documentation

### What Is Removed

- **Redundant life areas**: Education, Budget (merged), Travel (temporal), Journal (temporal), Planning (merged)
- **Tracking features**: All trackers, logs, metrics from Self-Care and Journal
- **Execution logic**: Task completion tracking, habit enforcement
- **Analytics**: Progress metrics, completion rates, productivity scoring

### What Stays in Planner (Refined)

- **6 core life areas**: Vision, Work, Personal, Household, Financial Planning, Social
- **Temporal views**: Daily, Weekly, Monthly, Quarterly, Annual
- **Calendar**: Unified calendar as backbone
- **Reflection tools**: Integrated into temporal views, not separate areas
- **Planning tools**: Intentions, schedules, time blocking

---

## 10. Implementation Priorities

### Phase 1: Core Temporal Views
1. Redesign navigation to be time-first (Today, This Week, etc.)
2. Implement Daily, Weekly, Monthly views with life-area contexts
3. Remove all tracking UI from existing views

### Phase 2: Life Area Consolidation
1. Merge Budget into Financial Planning
2. Merge Planning into Vision/Temporal
3. Remove Education, Journal as life areas (Travel remains)
4. Split Self-Care (remove tracking, move planning to Personal/Temporal)

### Phase 3: Reflection Integration
1. Integrate reflection into temporal views (Daily Reflection, Weekly Reflection, Monthly Review)
2. Remove standalone Journal life area
3. Link reflection to Spaces for detailed journaling (if desired)

### Phase 4: Calendar Strengthening
1. Ensure all time-bound items flow through calendar
2. Strengthen calendar as single source of truth
3. Improve calendar integration with Guardrails and Spaces

---

## 11. Success Criteria

Planner succeeds when:

✅ Users navigate by time, not life areas

✅ Users plan without tracking pressure

✅ Users reflect meaningfully without data collection

✅ Users connect daily actions to long-term vision

✅ Users feel clarity, not overwhelm

✅ Planner contains zero tracking features

✅ Boundaries between Planner, Tracker Studio, Guardrails, and Spaces are unambiguous

---

## 12. Conclusion

Planner is **time-aware life orchestration**—a calendar-anchored planning system with 7 core life areas, organized around temporal scales. Planner helps users navigate time, plan across life domains, and connect daily actions to long-term vision.

**Core Value**: Planner helps you **plan time with clarity**, not optimize yourself into submission.

**Architectural Discipline**: Planner contains **zero tracking**, **zero execution logic**, and **zero spatial canvases**. It is purely temporal planning and reflection.

**Human-Centered**: Planner respects human rhythms, optionality, and imperfection. It reduces overwhelm, avoids backlogs, and allows incomplete planning without punishment.

---

**End of Document**
