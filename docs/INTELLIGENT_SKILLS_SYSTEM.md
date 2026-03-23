# Intelligent Skills System

## Overview

The Intelligent Skills System unifies Guardrails Skills Matrix with Personal Development Skills into a single, deep, adaptive, and human-centered capability tracking system.

## Core Architecture

### One Shared Data Model, Multiple Views

**user_skills** (Canonical Source of Truth)
- Structural skill definitions
- Proficiency assessments (1-5 scale)
- Confidence levels (separate from proficiency)
- Consistency scores (derived)
- Capacity context (health, stress, workload, energy)
- Sub-skills and prerequisites (soft dependencies)
- Evidence tracking (usage count, last used)

**personal_skills_context** (Personal Metadata)
- Status: active, background, paused
- Life area linkage (Work, Health, Relationships, etc.)
- Momentum indicators (dormant, emerging, stabilising, integrated)
- Personal intentions ("why this matters to me")
- Time horizons (soft, no pressure)
- Practice logs (qualitative)
- Blocked notes and growth conditions
- Effort tracking
- Reflection notes
- Privacy controls

**skill_evidence** (Structured Evidence)
- Evidence type: journal, project, habit, task, learning_resource, reflection, feedback
- Context notes ("where did I use this?")
- Difficulty felt (qualitative feedback)
- Reference links to source systems

**skill_insights** (Smart but Calm)
- Non-intrusive, explainable insights
- Types: confidence_gap, usage_pattern, correlated_growth, dormant_skill, capacity_impact, consistency_trend
- Clear explanations of why insights appear
- Dismissible, with expiry dates

## Service Layer

### `/src/lib/skillsService.ts`
Main unified skills service with three groups:
1. **skillsService**: Canonical skills management (Guardrails)
2. **personalSkillsContextService**: Personal metadata management (Personal Development)
3. **unifiedSkillsService**: Combined views with evidence counts

### `/src/lib/skillsIntelligence.ts`
Intelligence layer with four groups:
1. **skillEvidenceService**: Record and retrieve skill usage
2. **momentumCalculator**: Calculate skill momentum based on evidence patterns
3. **insightsGenerator**: Generate non-intrusive, explainable insights
4. **capacityHelpers**: Track capacity context impact

## Key Features

### 1. Proficiency ≠ Confidence ≠ Capacity

- **Proficiency**: Structural capability assessment (1-5)
- **Confidence**: Self-reported confidence level (1-5)
- **Capacity**: Context-aware performance (health, stress, workload, energy)

These are tracked separately to recognize that someone can be highly proficient but low confidence, or vice versa.

### 2. Momentum Tracking (Not Streaks)

**Dormant**: No recent usage (>30 days)
**Emerging**: Irregular practice, low consistency
**Stabilising**: Regular practice developing
**Integrated**: Consistent, frequent usage

Momentum is calculated from:
- Evidence frequency
- Consistency of practice
- Recency of usage

### 3. Smart Insights (Non-Intrusive)

Examples:
- "You practise X often, but confidence remains low — reflection might help"
- "This skill spikes during projects but fades afterward"
- "This skill is marked active but hasn't been practised in 21 days"
- "Practice pattern is irregular — might benefit from smaller, regular sessions"

All insights include:
- Clear explanation of why they appeared
- Supporting data
- Dismissal option
- Automatic expiry (30 days)

### 4. Evidence-Based Learning

Skills link to:
- Journal entries
- Projects (Guardrails)
- Habits (Self-Care)
- Tasks (Planning)
- Learning resources
- Reflections

Evidence is reference-based, never copied. Evidence tracks:
- Where/how the skill was used
- What felt harder/easier
- Qualitative difficulty feedback

### 5. Sub-Skills and Prerequisites

Skills can have:
- Parent-child relationships (sub-skills)
- Soft prerequisites (not blockers)
- Hierarchical organization

### 6. Life Area Integration

Skills can be linked to life areas:
- Work
- Health
- Relationships
- Creativity
- Learning
- Personal Growth
- Community
- Family
- Leisure

## Two Contextual Views

### View 1: Guardrails → Skills Matrix (Structural)

**Purpose**: Long-term capability structure and strategic planning

**Features**:
- Matrix and list toggle
- Category filters (Cognitive, Emotional, Social, Physical, Technical, Creative)
- Skill dependency visualization
- Long-term trend indicators
- Assessment and proficiency tracking
- Link skills to projects, roles, responsibilities

**Behaviour**: Neutral, system-level language. No emotional or reflective content.

### View 2: Personal Development → Skills Development (Growth)

**Purpose**: Human-centered growth tracking and reflection

**Features**:
- Active/Background/Paused status
- Personal intentions
- Momentum indicators
- Practice logs
- Reflections and blocked notes
- Growth conditions
- Smart insights (optional)
- Effort tracking

**Behaviour**: Growth-focused, qualitative, emotionally safe.

## Intelligence Principles

1. **Non-Intrusive**: Insights are optional and dismissible
2. **Explainable**: Every insight explains why it appeared
3. **No Pressure**: No scoring, ranking, or optimization pressure
4. **No Gamification**: No XP, levels, or streaks
5. **Calm**: Directional indicators, not numeric targets
6. **Deep**: Can grow with the user for years
7. **Trustworthy**: Transparent data handling

## Privacy & Sharing

**Default**: All skills and context are private

**Optional Sharing**:
- Selected skills
- Reflections
- Evidence links

**Share With**:
- Shared Spaces
- Specific people
- Specific contexts (e.g., "this project only")

**Guardrails-level data** is never auto-shared.

## Usage Examples

### Adding a Skill
```typescript
const skill = await skillsService.create({
  user_id: userId,
  name: 'Active Listening',
  description: 'Fully engaging with and understanding others',
  category: 'social',
  proficiency: 2, // Developing
  confidence_level: 2 // Somewhat uncertain
});
```

### Recording Evidence
```typescript
await skillEvidenceService.recordEvidence({
  user_id: userId,
  skill_id: skillId,
  evidence_type: 'project',
  reference_id: projectId,
  context_notes: 'Used during team retrospective',
  difficulty_felt: 'easier_than_before',
  occurred_at: new Date().toISOString()
});
```

### Setting Personal Context
```typescript
await personalSkillsContextService.upsertContext({
  user_id: userId,
  skill_id: skillId,
  status: 'active',
  life_area: 'Work',
  personal_intention: 'Want to build stronger team relationships',
  time_horizon: 'Over the next few months',
  is_private: true
});
```

### Adding Practice Log
```typescript
await personalSkillsContextService.addPracticeLog(userId, skillId, {
  context: '1:1 meeting with direct report',
  felt: 'More natural than last time',
  notes: 'Remembered to pause before responding'
});
```

### Calculating Momentum
```typescript
const momentum = await momentumCalculator.calculateMomentum(userId, skillId);
// Returns: 'dormant' | 'emerging' | 'stabilising' | 'integrated'
```

### Generating Insights
```typescript
await insightsGenerator.generateInsights(userId);
const insights = await insightsGenerator.getActiveInsights(userId);
```

## Database Schema Highlights

**Enhanced user_skills**:
- parent_skill_id (sub-skills)
- prerequisites (soft dependencies)
- confidence_level (separate from proficiency)
- consistency_score (derived, 0-1)
- capacity_context (JSON)
- last_used_at, usage_count

**Enhanced personal_skills_context**:
- status (active/background/paused, replaces boolean)
- life_area
- momentum (derived)
- practice_logs (JSONB array)
- blocked_notes, growth_conditions
- effort_level
- last_practice_at

**New skill_evidence table**:
- Structured evidence tracking
- Reference-based linking
- Qualitative difficulty feedback

**New skill_insights table**:
- Smart, explainable insights
- Dismissible with expiry
- Supporting data for transparency

## Design Philosophy

**Skills are long-term capabilities, not tasks.**

**Progress is contextual, non-linear, and capacity-based.**

The system recognizes that skill development is:
- Affected by context (health, stress, workload)
- Non-linear (plateaus and breakthroughs)
- Multifaceted (proficiency ≠ confidence)
- Personal (same skill, different meanings)

## Future-Ready

The architecture supports future enhancements:
- Feedback from others (already has evidence_type: 'feedback')
- Coach/mentor sharing (privacy controls in place)
- Cross-user insights (with explicit permission)
- AI-assisted reflection prompts (infrastructure ready)
- Skill marketplace/sharing (structured for portability)

## What This System Is NOT

- Not gamified (no XP, levels, badges)
- Not competitive (no leaderboards)
- Not automated scoring (human judgment retained)
- Not mandatory tracking (opt-in intelligence)
- Not surveillance (private by default)
- Not shallow (designed to scale for years)

## Outcome

Users experience:
- **One coherent skills system** (no duplication)
- **Structural clarity** (Guardrails view)
- **Emotional safety** (Personal Development view)
- **Intelligence without pressure** (smart but calm)
- **Growth without surveillance** (private first)

The system feels:
- Calm
- Serious
- Adult
- Trustworthy
- Deep enough to grow for years
