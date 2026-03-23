# SharedMinds Insight Journey Redesign

## Overview
The SharedMinds questionnaire experience has been completely redesigned from a static "Section Overview" into a beautiful, emotionally rewarding journey called **"Your Insight Journey"**.

## What Changed

### 1. New Name: "Your Insight Journey"
The clinical "Section Overview" has been renamed to "Your Insight Journey" - a warm, inviting name that frames the experience as a meaningful personal discovery process rather than a form to complete.

### 2. Journey Stages
Modules are now grouped into 4 meaningful stages that create a narrative flow:

#### Stage 1: You, as an Individual (✨)
- Understanding how your mind works
- **Modules**: Personal Profile, Brain Profile, Cognitive Style

#### Stage 2: You in Daily Life (🌅)
- Your routines, patterns, and rhythms
- **Modules**: Household Responsibilities, Emotional Triggers & Stress, Daily Routines

#### Stage 3: You in Relationships (💝)
- How you connect and communicate
- **Modules**: Support Preferences, Communication Style, Dyadic Dynamics

#### Stage 4: You in Your Home (🏡)
- Your shared space and values
- **Modules**: Household Expectations & Values, Environment Needs

### 3. Micro-Dopamine Mechanisms

#### Progress Feedback
- Beautiful animated progress bars with gradient fills
- Real-time percentage updates
- Satisfying visual transitions

#### Instant Insights
After completing each module, users receive a personalized insight card:
- "You're building a clear picture of yourself"
- "You've identified your stress patterns"
- "Your household values are now clear"

#### Completion Celebration
When a module is finished, a beautiful full-screen celebration appears with:
- Animated sparkles (respects reduced motion settings)
- Encouraging message
- The personal insight in a highlighted card
- Gentle microcopy: "Take a moment to appreciate this step forward"

#### Household Progress Indicators
- Visual dots showing how many household members have completed each module
- Creates gentle accountability without pressure

### 4. Progressive Disclosure

#### Stage Locking
- Only Stage 1 is unlocked initially
- Each stage unlocks after completing the previous one
- Reduces overwhelm and creates guided progression

#### Expandable Stages
- Stages can be collapsed/expanded
- Only show modules when ready to engage
- Clear visual hierarchy

#### One Module at a Time
- Each module card is individually clickable
- Questions still appear one at a time (existing behavior)

### 5. Soft Narrative Language

**Old → New Examples:**
- "Personal Profile" → "Let's understand who you are at your core"
- "Household Responsibilities" → "How does your home function day-to-day?"
- "Emotional Triggers & Stress" → "What overwhelms you, and what helps you feel calm?"
- "Support Preferences" → "How do you prefer to be supported when things are hard?"

### 6. Beautiful Visual Design

#### Color-Coded Stages
- **Blue**: Individual (calm, introspective)
- **Amber**: Daily Life (warm, routine)
- **Rose**: Relationships (empathetic, connecting)
- **Emerald**: Home (grounding, stable)

#### Card Design
- Clean white cards with subtle shadows
- Hover effects with gentle scale and ring
- Status icons (Circle → Clock → CheckCircle)
- Gradient progress bars

#### Module Cards Feature:
- Icon representing the topic
- Emotional copy instead of clinical descriptions
- Progress bar when started
- Insight preview when complete
- Household completion dots
- Smooth hover interactions

### 7. Tone & Microcopy

Throughout the experience:
- "Take it at your own pace"
- "You're making great progress"
- "Beautiful work!"
- "You're building something meaningful"
- "There's no rush"

### 8. Technical Implementation

#### New Components
1. **InsightJourney** (`/src/components/journey/InsightJourney.tsx`)
   - Main orchestrator component
   - Handles data loading and state
   - Shows overall progress
   - Manages stage unlocking

2. **StageCard** (`/src/components/journey/StageCard.tsx`)
   - Groups modules by stage
   - Shows stage progress
   - Handles expand/collapse
   - Stage locking logic

3. **ModuleCard** (`/src/components/journey/ModuleCard.tsx`)
   - Individual module representation
   - Progress visualization
   - Completion insights
   - Household indicators
   - Interactive hover states

4. **CompletionCelebration** (`/src/components/journey/CompletionCelebration.tsx`)
   - Full-screen modal celebration
   - Animated sparkles
   - Insight highlight
   - Encouraging microcopy

#### Database Changes
Migration: `add_section_stages_and_insights`

New columns added to `sections` table:
- `stage`: Groups sections into journey stages (individual, daily_life, relationships, home)
- `stage_order`: Order within each stage
- `icon`: Visual representation (user, home, heart, eye, etc.)
- `emotional_copy`: Soft narrative description
- `completion_insight`: Personalized insight shown after completion

#### Routing
- New route: `/journey`
- Accessible from dashboard via prominent card
- Integrated into both Standard and ND-Optimized layouts

### 9. Accessibility & Inclusivity

#### Respects User Preferences
- Reduced motion settings honored (no animations if disabled)
- UI density preferences applied
- Font scale preferences respected
- Color theme preferences maintained

#### Neurodiversity-Positive
- Clear visual hierarchy
- One thing at a time
- No overwhelming lists
- Gentle encouragement without pressure
- Stage locking prevents anxiety about "what's next"

#### Adult-Appropriate
- Not childish or gamified
- Mature, calm aesthetic
- Emotionally warm but professional
- Treats users as capable adults

## How to Access

1. **From Dashboard**: Look for the prominent "Your Insight Journey" card with gradient purple/blue/teal background
2. **Direct URL**: Navigate to `/journey`
3. **Navigation**: Integrated into the main Layout navigation

## User Flow

1. User sees "Your Insight Journey" card on dashboard
2. Clicks to enter the journey
3. Sees overall progress and all 4 stages
4. Only Stage 1 is unlocked
5. Expands Stage 1 to see modules
6. Clicks a module to start
7. Completes questions (existing QuestionScreen)
8. Gets celebration modal with insight
9. Continues journey
10. Completes Stage 1
11. Stage 2 unlocks automatically
12. Process repeats

## Design Philosophy

✨ **Calm over rushed**
✨ **Guided over overwhelming**
✨ **Meaningful over mechanical**
✨ **Rewarding over clinical**
✨ **Progressive over all-at-once**
✨ **Human over robotic**

## Future Enhancements

Potential additions (not yet implemented):
- Badges or achievements for stage completion
- Journey summary/reflection page
- Share insights with household members
- Download personal insights as PDF
- Timeline view of journey progress
- Personalized recommendations based on insights
