# Planner Architecture & Philosophy

**Document Purpose**: Comprehensive overview of the Planner system, its architecture, life areas, and positioning within the SharedMinds ecosystem.

**Last Updated**: January 2025  
**Architectural Refactor**: Removed all tracking features from Planner (January 2025). Planner now contains zero tracking, logging, or measurement tools. All tracking belongs exclusively in Tracker Studio.

---

## Executive Summary

Planner is SharedMinds' **life orchestration system**—a holistic, time-aware planning platform that organizes everything from daily routines to long-term vision across 12 interconnected life areas. Unlike project management (Guardrails), canvas-based organization (Spaces), or behavior tracking (Tracker Studio), Planner provides **contextual, calendar-anchored planning** that respects the temporal nature of human life.

**Core Philosophy**: Life is not a project. Life is a flowing timeline of intentions, routines, and reflections. Planner helps you navigate time with clarity, not control.

---

## 1. Planner Philosophy

### What Planner Is

Planner is a **time-conscious planning ecosystem** that:

- **Orchestrates across life domains** — Work, personal, education, finance, household, self-care, travel, social, and more
- **Respects temporal rhythm** — Daily, weekly, monthly, quarterly, and annual planning views
- **Connects action to vision** — Bridges immediate tasks with long-term aspirations
- **Adapts to your structure** — No enforced methodology; your life areas, your categories, your pace
- **Integrates seamlessly** — Calendar is the connective tissue linking all areas and activities

### What Planner Is NOT

Planner is **not**:

- ❌ A project management system (that's Guardrails)
- ❌ A widget-based canvas (that's Spaces)
- ❌ A behavior tracking engine (that's Tracker Studio) — **Planner contains zero tracking, logging, or measurement tools**
- ❌ A rigid productivity framework (no GTD, no Bullet Journal enforcement)
- ❌ A goal-setting tool in isolation (goals exist within life areas)
- ❌ A calendar replacement (calendar is the anchor, not the feature)
- ❌ A data logging system (tracking belongs exclusively in Tracker Studio)

### Core Principles

1. **Temporal Awareness**: Everything exists in time. Planner acknowledges daily rhythms, weekly patterns, monthly cycles, and annual reflections.

2. **Life-Area Modularity**: Your life has domains. Planner organizes planning by these domains (Personal, Work, Education, Finance, etc.) without forcing rigid boundaries.

3. **Intention Over Execution**: Planner helps you **plan** and **reflect**, not micromanage execution. Execution belongs in Guardrails, Spaces, or Tracker Studio.

4. **Low-Friction Entry**: Log plans, intentions, and reflections without heavy workflows. Quick capture, thoughtful organization.

5. **Vision-Driven**: Long-term vision (Vision Board, 5-Year Plan) informs daily planning. Planner connects "where you want to be" to "what you do today."

6. **Contextual Intelligence**: Planner surfaces relevant information across life areas based on time, context, and your patterns.

---

## 2. Life Areas Architecture

Planner is organized into **12 Life Areas**, each representing a distinct domain of human life. Each area has its own dashboard, categories, and specialized features.

### 2.1 PERSONAL

**Purpose**: Self-discovery, personal growth, values, hobbies, and life milestones.

**Categories**:
- **Self-Discovery Journal**: Reflective writing prompts, values exploration, identity questions
- **Motivation Board**: Visual inspiration board for personal aspirations and reminders
- **Life Milestones**: Document significant personal achievements, transitions, and markers
- **Personal Values List**: Define and prioritize core values that guide decisions
- **Personal SWOT Analysis**: Strengths, weaknesses, opportunities, threats for self-assessment
- **Personal Manifesto**: Personal mission statement and guiding principles

**Philosophy**: Personal life planning is about **knowing yourself** and **intentionally growing**, not optimizing productivity.

---

### 2.2 WORK

**Purpose**: Professional planning, project coordination, daily workflows, and career development.

**Categories**:
- **Daily Work Planner**: Morning planning, daily priorities, end-of-day reflection
- **Work Planner**: Weekly work planning, task batching, time blocking
- **Project Tracker**: High-level project tracking (detailed execution in Guardrails)
- **Inbox Tracker**: Email, messages, and communication triage
- **Meeting Notes Template**: Structured meeting notes with action items
- **Task List**: Work-specific task lists (synced with Guardrails Task Flow)
- **Brainstorming**: Ideation space for work projects and solutions
- **Contact List**: Professional contacts, network management, relationship tracking

**Philosophy**: Work planning is about **clarity** and **coordination**, not task management. Deep execution happens in Guardrails.

---

### 2.3 EDUCATION

**Purpose**: Learning planning, study schedules, course management, and academic progress.

**Categories**:
- **Study Schedule**: Time-blocked study sessions, recurring learning blocks
- **Assignment Planner**: Assignment planning, due dates, submission planning
- **Class Information**: Course details, instructor notes, syllabus tracking
- **Revision Planner**: Exam preparation planning, review cycles, knowledge reinforcement
- **Research Projects**: Research planning, source tracking, writing milestones
- **Grade Planner**: Academic goal planning and grade targets
- **Reading List**: Books, articles, papers to read, reading planning
- **Lesson Planner**: For educators—lesson planning, curriculum mapping

**Philosophy**: Education planning respects **learning rhythms** and **knowledge building** over time, not cramming schedules.

---

### 2.4 FINANCE

**Purpose**: Financial planning, budgeting, expense tracking, and long-term financial health.

**Categories**:
- **Financial Overview**: Dashboard of income, expenses, assets, liabilities
- **Monthly Budget**: Budget planning, spending categories, allocation
- **Expense Tracker**: Transaction logging, categorization, spending patterns
- **Savings Goals**: Savings targets, progress tracking, milestone planning
- **Debt Tracker**: Debt balances, payoff plans, progress monitoring
- **Investment Tracker**: Portfolio overview, asset allocation, performance notes
- **Bill Payments**: Recurring bills, due dates, payment reminders
- **Emergency Fund**: Safety net planning, target amounts, progress

**Philosophy**: Financial planning is about **awareness** and **intentional allocation**, not budgeting shame.

---

### 2.5 BUDGET

**Purpose**: Category-specific budgeting for discretionary spending, events, and special expenses.

**Categories**:
- **Weekly Budget**: Short-term spending plan for weekly expenses
- **Grocery Budget**: Food shopping budget, meal planning costs
- **Holiday Budget**: Holiday spending planning, gift budgets
- **Event Budget**: Party, celebration, and special event budgeting
- **Gift Budget**: Gift-giving budget, recipient planning
- **Pet Care Budget**: Pet expenses, veterinary, supplies
- **Clothing Budget**: Wardrobe planning, seasonal purchases

**Philosophy**: Budgeting by category reduces decision fatigue and promotes **intentional spending** without rigid constraints.

---

### 2.6 VISION

**Purpose**: Long-term visioning, life direction, values alignment, and aspirational planning.

**Categories**:
- **Vision Board**: Visual collage of aspirations, dreams, and desired outcomes
- **Long-term Goals**: 5-10 year goals across life areas
- **5-Year Plan**: Detailed 5-year vision with milestones and markers
- **Monthly Reflection**: Monthly check-ins on vision alignment and progress
- **Dream Journal**: Aspirational writing, "what if" scenarios, future visioning
- **Career Vision**: Professional aspirations, career path planning
- **Relationship Vision**: Relationship goals, social aspirations, connection intentions
- **Values Alignment**: Ensuring actions align with core values and vision

**Philosophy**: Vision is the **compass**, not the destination. Regular reflection keeps vision alive and actionable.

---

### 2.7 PLANNING

**Purpose**: Cross-cutting planning tools, goal-action planning, and timeline orchestration.

**Categories**:
- **Goal Planner**: Goal breakdown, action planning, milestone setting
- **Priority Planner**: Priority identification, importance vs urgency, focus planning
- **To-Do List**: Unified task list across life areas (synced with Guardrails)
- **Project Planner**: High-level project planning (detailed execution in Guardrails)
- **Event Planner**: Special event planning, timelines, coordination
- **Weekly Overview**: Weekly planning synthesis across all life areas
- **Daily Timeline**: Hour-by-hour daily planning, time blocking, schedule awareness
- **Goal Action Plan**: Detailed action plans connecting goals to daily actions

**Philosophy**: Planning bridges **intention** (Vision) and **execution** (Guardrails/Spaces/Tracker Studio).

---

### 2.8 HOUSEHOLD

**Purpose**: Home management, family coordination, shared responsibilities, and household logistics.

**Categories**:
- **Household Overview**: Dashboard of household tasks, schedules, and responsibilities
- **Meal Planner**: Weekly meal planning, recipes, grocery coordination
- **Chore Chart**: Household chore distribution, rotation, accountability
- **Cleaning Schedule**: Cleaning schedules, deep clean planning, maintenance
- **Family Calendar**: Shared family events, appointments, activities
- **Appointments**: Medical, service, and maintenance appointments
- **Grocery List**: Shopping lists, pantry tracking, household needs
- **Maintenance Jobs**: Home maintenance, repairs, seasonal tasks

**Philosophy**: Household planning is about **coordination** and **shared responsibility**, not individual productivity.

---

### 2.9 SELF-CARE

**Purpose**: Wellness planning, health routines, and personal maintenance.

**Categories**:
- **Wellness Goals**: Health and wellness objectives and intentions
- **Mindfulness & Meditation**: Meditation planning, mindfulness routines, stress management planning
- **Self-Care Routines**: Self-care ritual planning, recharge activity planning, personal maintenance scheduling

**Philosophy**: Self-care planning is **preventative** and **sustaining**, not crisis management or optimization. All tracking (exercise, nutrition, sleep, mood) belongs in Tracker Studio, not Planner.

---

### 2.10 TRAVEL

**Purpose**: Trip planning, itinerary management, travel logistics, and travel memories.

**Categories**:
- **Travel Itinerary**: Day-by-day travel plans, activity scheduling, location notes
- **Packing Checklist**: Packing lists, travel essentials, weather-based packing
- **Travel Budget**: Trip budgeting, expense allocation, cost tracking
- **Trip Overview**: High-level trip summary, travel goals, trip notes
- **Weekly Planner**: Weekly travel planning, activity coordination
- **Accommodation**: Lodging details, booking information, stay preferences
- **Places to Visit**: Destination list, attractions, restaurants, recommendations
- **Road Trip Planner**: Route planning, stops, driving schedule, vehicle prep

**Philosophy**: Travel planning reduces **stress** and increases **presence** during trips by handling logistics upfront.

---

### 2.11 SOCIAL

**Purpose**: Relationship management, social planning, connection tracking, and social goals.

**Categories**:
- **Upcoming Social Events**: Social calendar, gatherings, parties, meetups
- **Reach-Out Reminders**: Stay-in-touch reminders, relationship maintenance
- **Important Dates**: Birthdays, anniversaries, special occasions
- **People Notes**: Relationship notes, personal details, conversation topics
- **Social Goals**: Relationship goals, networking objectives, connection intentions
- **Recent Interactions**: Recent social interactions, follow-up reminders
- **Relationship Reflection**: Relationship quality assessment, connection notes

**Philosophy**: Social planning maintains **intentional connection** in a busy world, not relationship optimization.

---

### 2.12 JOURNAL

**Purpose**: Reflective writing, daily journaling, and life documentation.

**Categories**:
- **Daily Journal**: Daily free-form journaling, thoughts, experiences
- **Weekly Reflection**: Weekly synthesis, lessons learned, patterns noticed
- **Monthly Review**: Monthly reflection, progress assessment, goal alignment
- **Free Writing**: Unstructured writing, stream of consciousness, creative expression
- **Past Entries**: Historical journal entries, searchable archive, timeline view

**Philosophy**: Journaling is **documentation** and **reflection**, not performance tracking or goal enforcement. All structured tracking (mood, energy, gratitude logs) belongs in Tracker Studio.

---

## 3. Temporal Architecture

Planner operates across **multiple time horizons**, each serving a distinct planning purpose:

### Daily Planning
- **Purpose**: Today's intentions, priorities, time blocking, end-of-day reflection
- **Components**: Daily timeline, task list, calendar events, daily journal
- **Philosophy**: Today shapes tomorrow. Daily planning is about **presence** and **intention**, not productivity metrics.

### Weekly Planning
- **Purpose**: Week synthesis, priorities, weekly goals, weekly reflection
- **Components**: Weekly overview, weekly work planner, weekly meal planner, weekly reflection
- **Philosophy**: Weeks are the **rhythm unit** of modern life. Weekly planning respects natural cycles.

### Monthly Planning
- **Purpose**: Month-at-a-glance, monthly goals, budget allocation, monthly reflection
- **Components**: Monthly calendar, monthly planner, monthly budget, monthly vision check-in
- **Philosophy**: Months provide **scope** for meaningful progress without overwhelming detail.

### Quarterly Planning
- **Purpose**: Quarter goals, project planning, seasonal adjustments, quarterly review
- **Components**: Quarterly planner, quarterly goals, quarterly financial review
- **Philosophy**: Quarters offer **strategic perspective** and natural review cycles.

### Annual Planning
- **Purpose**: Year vision, annual goals, year reflection, life direction
- **Components**: Vision board, 5-year plan, annual review, yearly goals
- **Philosophy**: Annual planning connects **daily actions** to **life direction**.

---

## 4. Calendar as Connective Tissue

**Calendar is the backbone** of Planner architecture:

- **Events exist in calendar** — All time-bound items (meetings, appointments, deadlines, travel) live in the unified calendar
- **Calendar integrates all areas** — Work events, personal appointments, household activities, travel, social events all flow through one calendar
- **Planner views calendar** — Daily, weekly, monthly, quarterly views are calendar-aware
- **Calendar syncs with Guardrails** — Roadmap deadlines, milestone events sync to calendar
- **Calendar syncs with Spaces** — Calendar widgets in Spaces show Planner events

**Philosophy**: Time is unified. One calendar prevents double-booking, time conflicts, and fragmented time awareness.

---

## 5. How Planner Differs from Other Systems

### Planner vs. Guardrails

| Aspect | Planner | Guardrails |
|--------|---------|------------|
| **Purpose** | Life orchestration, time-aware planning | Project execution, task management |
| **Scope** | All life areas, holistic | Projects, domains, tracks |
| **Time Horizon** | Daily to annual | Project timeline, sprint cycles |
| **Structure** | Life areas, calendar | Projects, tracks, roadmap items |
| **Execution** | Planning and reflection | Task execution, work sessions |
| **Philosophy** | "What do I want to do?" | "How do I execute this?" |
| **Data Model** | Events, plans, reflections | Projects, tasks, roadmap items |

**Key Difference**: Planner is **planning**. Guardrails is **execution**. Planner asks "what and when?" Guardrails asks "how?"

---

### Planner vs. Spaces

| Aspect | Planner | Spaces |
|--------|---------|--------|
| **Purpose** | Time-aware planning and organization | Widget-based canvases and dashboards |
| **Structure** | Calendar, life areas, temporal views | Widgets, layouts, infinite canvas |
| **Interaction** | Timeline navigation, calendar views | Drag-and-drop, widget arrangement |
| **Time Awareness** | Deeply time-aware (daily, weekly, monthly) | Time-agnostic (widgets, boards) |
| **Use Case** | "When am I doing this?" | "How do I organize this?" |
| **Philosophy** | Temporal orchestration | Spatial organization |

**Key Difference**: Planner is **temporal**. Spaces is **spatial**. Planner organizes by time. Spaces organizes by visual layout.

---

### Planner vs. Tracker Studio

| Aspect | Planner | Tracker Studio |
|--------|---------|----------------|
| **Purpose** | Planning and reflection | Behavior tracking and measurement |
| **Time Model** | Forward-looking (planning) | Backward-looking (tracking) |
| **Data Type** | Intentions, plans, events, reflections | Behaviors, habits, measurements, logs |
| **Philosophy** | "What will I do?" | "What did I do?" |
| **Use Case** | Schedule, plan, reflect | Track, measure, observe patterns |
| **Integration** | Planner may reference tracker signals (e.g., low energy) for adaptive planning | Measurement logs, pattern insights |
| **Boundary** | **Zero tracking features** — Planner contains no logs, trackers, or measurement tools | **Sole owner of all tracking** — All logs, trackers, habits, measurements live here |

**Key Difference**: Planner is **intention**. Tracker Studio is **observation**. Planner looks forward. Tracker Studio looks backward. **Planner must never store tracker data**—it may only read tracker signals for planning context.

---

## 6. Why People Use Planner

### The Planning Gap

Most people struggle with **planning fragmentation**:

- ❌ Calendar apps are event-focused, not life-area-aware
- ❌ Task managers lack temporal context and vision connection
- ❌ Productivity apps enforce rigid methodologies
- ❌ Goal-setting tools are disconnected from daily actions
- ❌ Life organization tools lack time awareness

**Planner solves this** by providing:

✅ **Unified planning across life areas** — One place for personal, work, finance, household, etc.

✅ **Time-aware planning** — Daily, weekly, monthly, quarterly views that respect natural rhythms

✅ **Vision-action connection** — Long-term vision informs daily planning

✅ **Calendar integration** — All time-bound items flow through one calendar

✅ **Low-friction entry** — Quick capture, thoughtful organization

✅ **Reflection tools** — Planning without reflection is planning in vain

---

### Unique Value Propositions

#### 1. **Life-Area Modularity Without Fragmentation**

Planner organizes by life areas (Personal, Work, Education, Finance, etc.) without creating isolated silos. Calendar connects all areas, and cross-area views (Weekly Overview, Daily Timeline) provide synthesis.

**Market Differentiator**: Most tools force you to choose between unified views (losing context) or siloed views (losing connection). Planner provides both.

---

#### 2. **Temporal Awareness at Multiple Scales**

Planner operates at daily, weekly, monthly, quarterly, and annual scales, each serving distinct planning needs. This respects natural human rhythms and planning horizons.

**Market Differentiator**: Most planning tools focus on one time scale (daily task managers, annual goal trackers). Planner spans all scales with awareness of how they connect.

---

#### 3. **Planning Without Execution Pressure**

Planner helps you **plan** and **reflect**, not execute. Execution belongs in Guardrails (projects), Spaces (widgets), or Tracker Studio (habits). This separation reduces planning anxiety and increases planning clarity.

**Market Differentiator**: Most planning tools conflate planning and execution, leading to planning paralysis or execution overwhelm. Planner separates concerns.

---

#### 4. **Vision-Driven Planning**

Vision (Vision Board, 5-Year Plan) informs daily planning. Daily actions connect to long-term aspirations. This creates alignment and meaning.

**Market Differentiator**: Most planning tools are tactical (task management) or aspirational (vision boards), but disconnected. Planner bridges the gap.

---

#### 5. **Calendar as Connective Tissue**

All time-bound items (meetings, appointments, deadlines, travel, social events) flow through one unified calendar that integrates across life areas. This prevents double-booking, time conflicts, and fragmented time awareness.

**Market Differentiator**: Most planning tools treat calendar as a feature, not infrastructure. Planner treats calendar as the backbone.

---

#### 6. **Life-Area Specialization Without Complexity**

Each life area (Personal, Work, Education, Finance, Household, Self-Care, Travel, Social, Journal) has specialized features and categories, but the underlying architecture is simple and consistent.

**Market Differentiator**: Most life organization tools are either generic (losing specialization) or complex (losing usability). Planner provides specialization without complexity.

---

#### 7. **Reflection as First-Class Citizen**

Planner includes reflection tools (Daily Journal, Weekly Reflection, Monthly Review) as integral planning components, not afterthoughts.

**Market Differentiator**: Most planning tools focus on forward-looking planning without reflection tools. Planner treats reflection as essential to effective planning.

---

## 7. What Makes Planner Different from Market Alternatives

### vs. Calendar Apps (Google Calendar, Apple Calendar)

| Feature | Market Calendar Apps | Planner |
|---------|---------------------|---------|
| **Life Areas** | Generic events | Life-area-specific planning (Personal, Work, Finance, etc.) |
| **Planning Context** | Event scheduling | Planning + reflection + vision connection |
| **Goal Integration** | None | Goals within life areas, vision-driven planning |
| **Temporal Views** | Daily, weekly, monthly | Daily, weekly, monthly, quarterly, annual |

**Planner Advantage**: Calendar apps are **event schedulers**. Planner is a **life orchestrator** with calendar integration.

---

### vs. Task Managers (Todoist, Asana, TickTick)

| Feature | Task Managers | Planner |
|---------|---------------|---------|
| **Life Context** | Task lists | Life-area organization, holistic planning |
| **Time Horizon** | Short-term tasks | Daily to annual planning |
| **Vision Connection** | None or weak | Vision-driven planning, long-term goals |
| **Reflection** | Task completion tracking | Reflection tools (journal, monthly review) |

**Planner Advantage**: Task managers are **execution tools**. Planner is a **planning system** that connects vision to daily actions.

---

### vs. Goal-Setting Apps (Goals on Track, Strides)

| Feature | Goal-Setting Apps | Planner |
|---------|-------------------|---------|
| **Daily Planning** | Goal tracking only | Daily planning, time blocking, calendar integration |
| **Life Areas** | Goal categories | Full life-area planning (not just goals) |
| **Temporal Context** | Goal progress tracking | Daily, weekly, monthly, quarterly planning |

**Planner Advantage**: Goal-setting apps are **goal trackers**. Planner is a **planning system** with goal integration.

---

### vs. Productivity Frameworks (Notion, Obsidian, Roam)

| Feature | Productivity Frameworks | Planner |
|---------|------------------------|---------|
| **Time Awareness** | Time-agnostic notes/docs | Deeply time-aware (calendar, temporal views) |
| **Planning Structure** | Flexible, user-defined | Life-area structure with calendar backbone |
| **Reflection Tools** | Manual, ad-hoc | Built-in reflection (journal, monthly review) |
| **Vision Integration** | Manual linking | Vision-driven planning with vision board |

**Planner Advantage**: Productivity frameworks are **information systems**. Planner is a **time-aware planning system** with built-in structure and reflection.

---

### vs. Life Organization Apps (Life360, Cozi, Any.do)

| Feature | Life Organization Apps | Planner |
|---------|----------------------|---------|
| **Planning Depth** | Surface-level task/event lists | Deep planning with reflection and vision |
| **Life-Area Specialization** | Generic categories | Specialized features per life area |
| **Vision Connection** | None | Vision-driven planning, long-term goals |
| **Reflection Tools** | None | Built-in journal, monthly review, reflection |

**Planner Advantage**: Life organization apps are **task/event managers**. Planner is a **comprehensive planning system** with vision, reflection, and life-area depth.

---

## 8. Architecture Principles

### 8.1 Calendar-Centric

**Principle**: Calendar is the single source of truth for time-bound items across all life areas.

**Implementation**:
- All events, appointments, deadlines flow through unified calendar
- Planner views (daily, weekly, monthly) read from calendar
- Calendar syncs with Guardrails (project deadlines) and Spaces (calendar widgets)

---

### 8.2 Life-Area Modularity

**Principle**: Life areas are modular units with specialized features, but unified architecture.

**Implementation**:
- Each life area has dashboard, categories, and specialized components
- Calendar connects all areas
- Cross-area views (Weekly Overview) synthesize across areas

---

### 8.3 Temporal Awareness

**Principle**: Planning exists at multiple time scales with awareness of how they connect.

**Implementation**:
- Daily, weekly, monthly, quarterly, annual views
- Each view serves distinct planning purpose
- Long-term vision informs short-term planning

---

### 8.4 Vision-Action Alignment

**Principle**: Long-term vision (Vision Board, 5-Year Plan) informs daily planning and actions.

**Implementation**:
- Vision area defines long-term aspirations
- Daily/Weekly planning surfaces vision-aligned actions
- Monthly reflection checks vision alignment

---

### 8.5 Planning Without Execution Pressure

**Principle**: Planner handles planning and reflection. Execution belongs in Guardrails, Spaces, or Tracker Studio.

**Implementation**:
- Planner creates plans, schedules, intentions
- Execution details link to Guardrails (projects) or Tracker Studio (habits)
- Planner reflection tools assess plan execution without enforcing it
- **Planner contains zero tracking features** — no logs, trackers, measurements, or historical data collection

---

### 8.6 Low-Friction Entry

**Principle**: Quick capture, thoughtful organization. Reduce friction to increase planning frequency.

**Implementation**:
- Quick capture tools (daily journal, task list, calendar events)
- Organized later through life-area categorization
- Mobile-optimized for on-the-go planning

---

## 9. Integration Points

### Planner ↔ Guardrails

- **Planner creates project plans** → Guardrails executes projects
- **Guardrails roadmap deadlines** → Planner calendar events
- **Guardrails project status** → Planner project tracker updates

---

### Planner ↔ Spaces

- **Planner calendar events** → Spaces calendar widgets
- **Planner goals** → Spaces goal widgets
- **Planner tasks** → Spaces task widgets

---

### Planner ↔ Tracker Studio

**Architectural Boundary**: Planner **never stores** tracker data. All tracking belongs exclusively in Tracker Studio.

- **Planner reads tracker signals** (e.g., energy level, mood) for adaptive planning context (future enhancement)
- **Planner wellness intentions** → Tracker Studio executes tracking (exercise, sleep, nutrition, mood)
- **Planner reflection insights** → Tracker Studio provides historical data context when needed
- **One-way data flow**: Planner may reference tracker signals, but Planner does not own or duplicate any tracker data

---

## 10. Data Model Summary

### Core Entities

- **Events**: Calendar events across life areas (meetings, appointments, deadlines, travel)
- **Plans**: Planning items (daily plans, weekly plans, monthly plans, goals, intentions)
- **Reflections**: Journal entries, monthly reviews, weekly reflections
- **Life Areas**: Personal, Work, Education, Finance, Budget, Vision, Planning, Household, Self-Care, Travel, Social, Journal
- **Categories**: Life-area-specific categories (e.g., Personal → Self-Discovery Journal, Self-Care → Wellness Goals)

**Explicitly Excluded**: Planner contains **zero tracking entities**—no logs, trackers, measurements, or historical data collection. All tracking belongs in Tracker Studio.

### Calendar Integration

- **Calendar is authoritative** for time-bound items
- Events flow through calendar and display in Planner views
- Calendar syncs with Guardrails (deadlines) and Spaces (widgets)

---

## 11. Success Criteria

Planner succeeds when:

✅ Users **plan across life areas** without fragmentation

✅ Users **connect daily actions** to **long-term vision**

✅ Users **reflect regularly** on plans and progress

✅ Users **navigate time** with clarity, not anxiety

✅ Users **coordinate household** responsibilities seamlessly

✅ Users **maintain work-life balance** through holistic planning

✅ Users **feel aligned** between intentions and actions

---

## 12. Conclusion

Planner is SharedMinds' **life orchestration system**—a holistic, time-aware planning platform that bridges vision and action across 12 life areas. It differs from Guardrails (execution), Spaces (spatial organization), and Tracker Studio (behavior tracking) by focusing on **planning and reflection** within a **calendar-anchored, vision-driven architecture**.

**Core Value**: Planner helps you **navigate time with clarity and intention**, connecting what you do today to who you want to become.

**Market Position**: Planner occupies a unique space between calendar apps, task managers, goal trackers, and productivity frameworks by providing **life-area-aware, temporal, vision-driven planning** with built-in reflection tools.

**Architectural Boundary**: Planner contains **zero tracking features**. All tracking, logging, and measurement belongs exclusively in Tracker Studio. Planner focuses on forward-looking planning and reflection, never backward-looking data collection.

**Philosophy**: Life is not a project. Life is a flowing timeline of intentions, routines, and reflections. Planner helps you orchestrate your life across time, not optimize it into submission.

---

**End of Document**
