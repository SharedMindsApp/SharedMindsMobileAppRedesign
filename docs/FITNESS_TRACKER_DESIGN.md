# Intelligent Fitness Tracker Design Document
## Personalized Movement Intelligence System

**Version:** 2.0  
**Date:** 2025-01-31  
**Core Principle:** The fitness tracker is not a single tracker. It is a personalized movement system assembled at setup.

---

## Executive Summary

This document outlines the design of an intelligent fitness tracker that **first learns how the user moves**, then **dynamically assembles itself** to match their movement patterns. The system begins with movement discovery, adapts its interface and data model to the user's actual activities, and provides tailored insights without judgment.

**The One Sentence to Anchor This:**

> "The fitness tracker doesn't track fitness — it learns how you move, and adapts to support that."

This sentence must be true at: onboarding, UI, data, insights, and architecture.

---

## 1. Core Principle (Locked In)

### 1.1 The Fundamental Shift

**Traditional Approach:**
- Pre-built tracker with fixed categories
- User adapts to the tool
- One-size-fits-all interface
- Generic insights

**This System:**
- Movement discovery first
- Tool adapts to the user
- Personalized interface assembly
- Tailored insights

### 1.2 The Discovery Question

Before any tracking begins, the system must answer:

1. **What kinds of movement does this person actually do?**
   - Gym training
   - Running/Walking
   - Cycling
   - Swimming
   - Team sports
   - Individual sports
   - Martial arts
   - Yoga/mobility
   - Rehab/physiotherapy
   - Other

2. **At what level?**
   - Hobbyist (casual, enjoyment-focused)
   - Regular (consistent, health-focused)
   - Competitive (structured, performance-focused)
   - Professional (high-frequency, specialized)

3. **In what environments?**
   - Gym
   - Outdoors
   - Team settings
   - Solo
   - Home
   - Studio/class

4. **With what intent?**
   - Health
   - Performance
   - Skill development
   - Enjoyment
   - Recovery
   - Social connection

**Only then** does the UI, data model, and insights activate.

---

## 2. Movement Discovery (Onboarding Intelligence)

### 2.1 Movement Profile Builder

**Design Philosophy:**
- Wizard-style flow, not a form
- No pressure, no goals
- Checkbox + frequency, not commitments
- "You can change this later" messaging throughout

### 2.2 Step 1: Primary Movement Domains

**Screen Design:**
```
┌─────────────────────────────────────┐
│  What kinds of movement are part    │
│  of your life?                       │
│                                     │
│  Select anything that applies —     │
│  you can change this later.         │
│                                     │
│  ☐ Gym training                     │
│  ☐ Running / Walking                │
│  ☐ Cycling                          │
│  ☐ Swimming                         │
│  ☐ Team sports                      │
│  ☐ Individual sports                   │
│  ☐ Martial arts / combat sports     │
│  ☐ Yoga / mobility                  │
│  ☐ Rehab / physiotherapy            │
│  ☐ Other                            │
│     [Free text input]               │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘
```

**Key Principles:**
- Multiple selections allowed
- No hierarchy implied
- "Other" always available
- No minimum required
- Clear that this is changeable

### 2.3 Step 2: Domain-Specific Follow-Up

**For Each Selected Domain:**

#### Example: Gym Training

```
┌─────────────────────────────────────┐
│  Tell us about your gym training     │
│                                     │
│  What do you usually do at the gym? │
│                                     │
│  ☐ Cardio machines                  │
│  ☐ Free weights                     │
│  ☐ Machines                         │
│  ☐ Classes                          │
│  ☐ Mixed / varies                   │
│                                     │
│  How often does this show up when    │
│  life is normal?                     │
│                                     │
│  ○ Rarely                           │
│  ○ Occasionally                     │
│  ○ Regularly                        │
│  ○ Core activity                    │
│                                     │
│  [Continue]                          │
└─────────────────────────────────────┘
```

**Design Notes:**
- Light follow-up only
- No detailed questions yet
- Frequency is relative, not absolute
- "When life is normal" language (not "your goal")

#### Example: Running/Walking

```
┌─────────────────────────────────────┐
│  Tell us about your running/walking │
│                                     │
│  What does this usually look like?  │
│                                     │
│  ☐ Casual walking                   │
│  ☐ Running (easy pace)              │
│  ☐ Running (structured training)    │
│  ☐ Trail running                    │
│  ☐ Mixed                           │
│                                     │
│  How often does this show up when   │
│  life is normal?                    │
│                                     │
│  ○ Rarely                           │
│  ○ Occasionally                     │
│  ○ Regularly                        │
│  ○ Core activity                    │
│                                     │
│  [Continue]                           │
└─────────────────────────────────────┘
```

#### Example: Team Sports

```
┌─────────────────────────────────────┐
│  Tell us about your team sports      │
│                                     │
│  What sports do you play?           │
│                                     │
│  ☐ Football / Soccer                │
│  ☐ Basketball                       │
│  ☐ Rugby                            │
│  ☐ Volleyball                       │
│  ☐ Other: [________]               │
│                                     │
│  How often does this show up when   │
│  life is normal?                    │
│                                     │
│  ○ Rarely                           │
│  ○ Occasionally                     │
│  ○ Regularly                        │
│  ○ Core activity                    │
│                                     │
│  [Continue]                          │
└─────────────────────────────────────┘
```

### 2.4 Step 3: Level Detection (Optional, Non-Pressuring)

**Gentle Questions:**
```
┌─────────────────────────────────────┐
│  Just a couple more questions        │
│                                     │
│  How would you describe your        │
│  relationship with movement?         │
│                                     │
│  ○ Casual — I move when I feel like │
│    it, no structure                 │
│  ○ Regular — I try to stay          │
│    consistent                       │
│  ○ Structured — I follow plans or   │
│    have goals                       │
│  ○ Competitive — I train for        │
│    performance                      │
│                                     │
│  [Skip] [Continue]                  │
└─────────────────────────────────────┘
```

**Design Notes:**
- Optional step
- "Skip" always available
- No judgment in language
- Used for initial UI adaptation, not locking

### 2.5 Discovery Output

**User Movement Profile Created:**
```typescript
interface UserMovementProfile {
  userId: string;
  
  // Discovery data
  primaryDomains: MovementDomain[];
  domainDetails: Record<MovementDomain, DomainDetail>;
  movementLevel: 'casual' | 'regular' | 'structured' | 'competitive' | null;
  
  // Generated from discovery
  trackerStructure: TrackerStructure;
  uiConfiguration: UIConfiguration;
  insightPreferences: InsightPreferences;
  
  // Metadata
  discoveryDate: Date;
  lastUpdated: Date;
}
```

---

## 3. Dynamic Tracker Assembly

### 3.1 The Assembly Process

Based on discovery, the system:

1. **Assembles the data schema** (what fields are relevant)
2. **Configures the UI** (what categories appear)
3. **Sets up pattern recognition** (what patterns to look for)
4. **Prepares insights** (what insights are relevant)

### 3.2 Example: Gym-Focused User

**Discovery Input:**
- Primary domain: Gym training
- Details: Cardio machines, Free weights, Machines, Classes
- Frequency: Regularly
- Level: Structured

**Assembled Tracker Structure:**
```
Gym Sessions (Main Category)
├── Cardio
│   ├── Machines (Treadmill, Bike, Rower, etc.)
│   └── Classes (Spin, HIIT, etc.)
├── Upper Body
│   ├── Push (Chest, Shoulders, Triceps)
│   └── Pull (Back, Biceps)
├── Lower Body
│   ├── Quad-dominant
│   ├── Hip-dominant
│   └── Full lower
├── Full Body
├── Classes
│   ├── Group fitness
│   └── Personal training
└── Recovery / Mobility
```

**Quick Log Interface:**
```
┌─────────────────────────────────────┐
│  Quick Log                          │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │  Cardio  │  │ Upper    │       │
│  │          │  │  Body    │       │
│  └──────────┘  └──────────┘       │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │  Lower   │  │   Full   │       │
│  │  Body    │  │   Body   │       │
│  └──────────┘  └──────────┘       │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │ Classes  │  │ Recovery │       │
│  └──────────┘  └──────────┘       │
│                                     │
│  [Add More Details]                │
└─────────────────────────────────────┘
```

**Logging Depth Options:**

**Casual User:**
- Tap "Upper Body" → Logged
- Optional: Add duration, intensity, enjoyment

**Structured User:**
- Tap "Upper Body" → Opens detail form
- Can specify: Push/Pull, exercises, sets, RPE, duration
- Or: Just log "Upper Body" and move on

**Same system. Different depth. No pressure.**

### 3.3 Example: Sport-Focused User (Running)

**Discovery Input:**
- Primary domain: Running
- Details: Running (structured training)
- Frequency: Regularly
- Level: Competitive

**Assembled Tracker Structure:**
```
Running Sessions (Main Category)
├── Easy
│   ├── Recovery run
│   └── Base building
├── Tempo
│   ├── Threshold
│   └── Progression
├── Intervals
│   ├── Speed
│   ├── VO2 max
│   └── Strides
├── Long Run
├── Competition
│   ├── Race
│   └── Time trial
└── Skills / Drills
    ├── Form work
    └── Strength
```

**Quick Log Interface:**
```
┌─────────────────────────────────────┐
│  Quick Log                          │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │   Easy   │  │  Tempo   │       │
│  └──────────┘  └──────────┘       │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │Intervals │  │   Long   │       │
│  └──────────┘  └──────────┘       │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │Competition│ │  Skills  │       │
│  └──────────┘  └──────────┘       │
│                                     │
│  [Add More Details]                │
└─────────────────────────────────────┘
```

**Logging Depth Options:**

**Hobbyist Runner:**
- Tap "Easy" → Logged
- Optional: Duration, distance, enjoyment

**Competitive Runner:**
- Tap "Easy" → Opens detail form
- Can specify: Distance, pace, heart rate zones, RPE, terrain, notes
- Or: Just log "Easy" and move on

### 3.4 Example: Mixed-Mode User

**Discovery Input:**
- Primary domains: Gym training, Running, Yoga
- Details: Mixed activities
- Frequency: Regularly
- Level: Regular

**Assembled Tracker Structure:**
```
Movement Sessions
├── Gym
│   ├── Cardio
│   ├── Strength
│   └── Classes
├── Running
│   ├── Easy
│   ├── Tempo
│   └── Long
└── Yoga / Mobility
    ├── Vinyasa
    ├── Yin
    └── Mobility
```

**Quick Log Interface:**
```
┌─────────────────────────────────────┐
│  Quick Log                          │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │   Gym    │  │ Running  │       │
│  └──────────┘  └──────────┘       │
│                                     │
│  ┌──────────┐                      │
│  │   Yoga   │                      │
│  └──────────┘                      │
│                                     │
│  [Add More Details]                │
└─────────────────────────────────────┘
```

**Design Note:** Mixed-mode users see a simplified top-level, with domain-specific details available on tap.

### 3.5 Assembly Rules

**Rule 1: No Pre-filled Junk**
- Only show categories the user actually does
- No "Strength Training" if they only run
- No "Cardio" if they only do yoga

**Rule 2: Depth Scales, Not Forks**
- Same logging system for all users
- Depth of detail is optional
- No "Pro Mode" vs "Basic Mode"

**Rule 3: Changeable**
- User can add/remove domains anytime
- UI reconfigures automatically
- No data loss when changing structure

**Rule 4: Progressive Disclosure**
- Start simple
- Unlock detail options as user engages
- Never force detail

---

## 4. Progressive Capability Unlocking

### 4.1 The Philosophy

**Do NOT:**
- Create "Pro Mode" toggle
- Show badges for "advanced" features
- Announce "You've unlocked..."
- Create ego traps

**Do:**
- Quietly adapt based on usage
- Unlock features when patterns suggest they're needed
- No visual distinction between "basic" and "advanced"
- System adapts without announcing itself

### 4.2 Hobbyist Lens (Default)

**What They See:**
- Simple session logging
- Activity type + optional details
- Pattern-level insights
- Sustainability & recovery emphasis
- Minimal terminology

**Example Quick Log:**
```
[Gym - Upper Body]
[Running - Easy]
[Yoga]
```

**Example Insight:**
"You've been consistent with gym sessions this month. That's a stable pattern."

### 4.3 Performance Lens (Auto-Activated)

**Activation Triggers:**
- High frequency (consistent logging)
- Structured sessions (session types used consistently)
- Low variance (predictable patterns)
- Consistent intensity reporting
- Detailed logging (user provides depth)

**What Unlocks (Quietly):**
- Session categorization options
- Load trend insights
- Cycle recognition (build → peak → deload)
- Sport-specific pattern language
- Advanced visualization options

**Example Quick Log (Same Interface):**
```
[Gym - Upper Body - Push]
[Running - Tempo - Threshold]
[Yoga - Vinyasa]
```

**Example Insight (More Detailed):**
"Your training load has increased 15% over the past 3 weeks. Recovery sessions have decreased. Consider adding a deload week."

**Design Note:** The interface looks the same. The system just understands more.

### 4.4 Detection Algorithm

```typescript
interface CapabilityUnlock {
  feature: string;
  trigger: UsagePattern;
  activated: boolean;
  activatedDate: Date | null;
}

class CapabilityDetector {
  detectUnlocks(profile: UserMovementProfile, sessions: MovementSession[]): CapabilityUnlock[] {
    const unlocks: CapabilityUnlock[] = [];
    
    // Check for structured training patterns
    if (this.hasStructuredSessions(sessions)) {
      unlocks.push({
        feature: 'session_categorization',
        trigger: 'structured_sessions',
        activated: true,
        activatedDate: new Date(),
      });
    }
    
    // Check for high-frequency patterns
    if (this.hasHighFrequency(sessions)) {
      unlocks.push({
        feature: 'load_tracking',
        trigger: 'high_frequency',
        activated: true,
        activatedDate: new Date(),
      });
    }
    
    // Check for consistent intensity reporting
    if (this.hasConsistentIntensity(sessions)) {
      unlocks.push({
        feature: 'intensity_analysis',
        trigger: 'intensity_reporting',
        activated: true,
        activatedDate: new Date(),
      });
    }
    
    return unlocks;
  }
}
```

---

## 5. Unified Data Model

### 5.1 The Core Structure

**Everything resolves to the same underlying model:**

```typescript
interface MovementSession {
  id: string;
  userId: string;
  timestamp: Date;
  
  // Core structure (always present)
  domain: MovementDomain;              // 'gym' | 'sport' | 'mobility' | 'other'
  activity: string;                    // 'upper_body' | 'running' | 'yoga' | etc.
  sessionType?: string;                // 'push' | 'easy' | 'tempo' | etc. (optional)
  
  // Intent and context
  intent: MovementIntent;              // 'training' | 'maintenance' | 'recovery' | etc.
  context?: string;                    // 'training' | 'competition' | 'match' | etc.
  
  // Perceived experience
  perceivedIntensity?: number;          // 1-5 scale
  bodyState?: BodyState;                // 'fresh' | 'sore' | 'fatigued' | etc.
  enjoyment?: number;                   // 1-5 scale
  
  // Optional detail (scales with user)
  duration?: number;                    // minutes
  notes?: string;
  
  // Domain-specific optional fields (unlocked based on domain)
  // Gym-specific
  exercises?: ExerciseDetail[];
  sets?: number;
  reps?: number;
  weight?: number;
  rpe?: number;                        // Rate of Perceived Exertion
  
  // Sport-specific
  distance?: number;
  pace?: string;
  heartRateZones?: HeartRateZone[];
  terrain?: string;
  
  // Metadata
  loggedAt: Date;
  loggedRetroactively: boolean;
}
```

### 5.2 Why This Matters

**Gym ≠ Special Case**
- Gym sessions use the same structure
- "Upper Body" is just an activity type
- Detail fields are optional

**Sports ≠ Special Case**
- Running sessions use the same structure
- "Easy" is just a session type
- Detail fields are optional

**Pro ≠ Special Case**
- Professional athletes use the same structure
- More detail fields available, but same model
- Interpretation changes, not structure

**This is what makes it hard to copy.**

### 5.3 Domain-Specific Field Unlocking

**Gym Domain Unlocks:**
- Exercise tracking
- Sets/reps/weight
- RPE (Rate of Perceived Exertion)
- Muscle group tracking

**Running Domain Unlocks:**
- Distance
- Pace
- Heart rate zones
- Terrain
- Elevation

**Team Sports Domain Unlocks:**
- Match vs training
- Position
- Minutes played
- Performance notes

**All optional. All unlocked based on domain selection.**

---

## 6. Tailored Pattern Views

### 6.1 The Adaptation Principle

**No one sees irrelevant charts.**

The pattern view adapts to show:
- What's relevant to their movement type
- Patterns that matter for their level
- Insights that support their intent

### 6.2 Gym-Oriented Pattern View

**What They See:**
```
┌─────────────────────────────────────┐
│  Movement Patterns                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Session Balance             │   │
│  │                              │   │
│  │  Upper: ████████ 40%        │   │
│  │  Lower: ██████ 30%          │   │
│  │  Cardio: ████ 20%           │   │
│  │  Full:   ██ 10%             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Intensity Clustering        │   │
│  │                              │   │
│  │  [Heat map showing intensity │   │
│  │   distribution by session    │   │
│  │   type]                      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Recovery Spacing             │   │
│  │                              │   │
│  │  [Timeline showing rest days │   │
│  │   between intense sessions]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Enjoyment vs Fatigue         │   │
│  │                              │   │
│  │  [Line chart showing trends] │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Insights Shown:**
- "You tend to do upper body sessions on Tuesdays and Thursdays."
- "Your intensity has been higher on lower body days."
- "Recovery sessions have decreased as intensity increased."

### 6.3 Sport-Oriented Pattern View (Running Example)

**What They See:**
```
┌─────────────────────────────────────┐
│  Movement Patterns                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Training vs Competition      │   │
│  │                              │   │
│  │  Training: ████████████ 85% │   │
│  │  Competition: ██ 15%        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Session Type Distribution    │   │
│  │                              │   │
│  │  Easy: ████████ 50%          │   │
│  │  Tempo: ████ 25%             │   │
│  │  Intervals: ███ 15%          │   │
│  │  Long: ██ 10%                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Build-up and Drop-off Cycles │   │
│  │                              │   │
│  │  [Timeline showing training  │   │
│  │   cycles and recovery periods]│   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Recovery After Peak Effort  │   │
│  │                              │   │
│  │  [Chart showing recovery    │   │
│  │   patterns after high       │   │
│  │   intensity sessions]        │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Insights Shown:**
- "Your training load increased before your last competition."
- "Easy runs have been consistent, supporting recovery."
- "Interval sessions cluster on Tuesdays and Thursdays."

### 6.4 Mixed-Mode Pattern View

**What They See:**
```
┌─────────────────────────────────────┐
│  Movement Patterns                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Activity Distribution       │   │
│  │                              │   │
│  │  Gym: ████████ 40%           │   │
│  │  Running: ██████ 35%         │   │
│  │  Yoga: ████ 25%              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Cross-Training Effects      │   │
│  │                              │   │
│  │  [Chart showing how          │   │
│  │   activities complement      │   │
│  │   each other]                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Switching as Stability      │   │
│  │                              │   │
│  │  "You switch between         │   │
│  │   activities regularly.      │   │
│  │   This variety appears to    │   │
│  │   support continued          │   │
│  │   engagement."               │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Load Distribution           │   │
│  │                              │   │
│  │  [Chart showing intensity   │   │
│  │   distribution across         │   │
│  │   activities]                │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Insights Shown:**
- "Gym sessions tend to be higher intensity than running."
- "Yoga sessions often follow high-intensity days."
- "Activity switching appears to support consistency."

### 6.5 Pattern View Assembly Rules

**Rule 1: Relevance First**
- Only show patterns relevant to user's domains
- Hide irrelevant visualizations
- Adapt insights to movement type

**Rule 2: Level-Appropriate**
- Hobbyists see simple patterns
- Competitive users see detailed analysis
- No overwhelming information

**Rule 3: Observational**
- Patterns, not goals
- Trends, not targets
- Insights, not directives

---

## 7. Behavior Analysis Engine (Adapted)

### 7.1 Domain-Aware Pattern Recognition

**Gym Patterns:**
- Session balance (upper/lower/cardio)
- Intensity clustering
- Recovery spacing
- Muscle group fatigue
- Volume trends

**Sport Patterns:**
- Training vs competition balance
- Build-up and drop-off cycles
- Recovery after peak effort
- Consistency relative to sport demands
- Seasonal patterns

**Mixed Patterns:**
- Cross-training effects
- Activity switching as stability
- Load distribution
- Recovery patterns across activities

### 7.2 Level-Aware Insights

**Hobbyist Insights:**
- "You've been consistent with gym sessions this month."
- "Your movement continued even during busy weeks."
- "Switching between activities appears to support engagement."

**Competitive Insights:**
- "Training load increased 15% over 3 weeks. Recovery sessions decreased."
- "Your intensity distribution shows 50% easy, 25% tempo, 15% intervals — typical for base building."
- "Consider a deload week after this training block."

**Same System. Different Interpretation. No Announcement.**

### 7.3 Progressive Insight Unlocking

**Initial Insights (All Users):**
- Frequency patterns
- Consistency observations
- Sustainability indicators

**Unlocked Insights (Based on Usage):**
- Load trends (high frequency detected)
- Cycle recognition (structured patterns detected)
- Sport-specific patterns (domain-specific usage detected)
- Performance indicators (competitive level detected)

---

## 8. System Architecture (Updated)

### 8.1 Discovery → Assembly → Tracking Flow

```
User Onboarding
    │
    ├─→ Movement Discovery
    │       │
    │       ├─→ Primary Domains
    │       ├─→ Domain Details
    │       └─→ Level Detection (optional)
    │
    ├─→ Profile Creation
    │       │
    │       ├─→ UserMovementProfile
    │       ├─→ TrackerStructure
    │       ├─→ UIConfiguration
    │       └─→ InsightPreferences
    │
    ├─→ Dynamic Assembly
    │       │
    │       ├─→ Data Schema Assembly
    │       ├─→ UI Component Assembly
    │       ├─→ Pattern Recognition Setup
    │       └─→ Insight Generation Setup
    │
    └─→ Active Tracking
            │
            ├─→ Session Logging (tailored UI)
            ├─→ Pattern Analysis (domain-aware)
            └─→ Insight Generation (level-appropriate)
```

### 8.2 Tracker Structure Definition

```typescript
interface TrackerStructure {
  userId: string;
  
  // Main categories (from discovery)
  categories: TrackerCategory[];
  
  // Subcategories (domain-specific)
  subcategories: Record<string, TrackerSubcategory[]>;
  
  // Available fields (unlocked based on domain)
  availableFields: FieldDefinition[];
  
  // Pattern recognition config
  patternConfig: PatternRecognitionConfig;
  
  // Insight preferences
  insightConfig: InsightGenerationConfig;
}

interface TrackerCategory {
  id: string;
  name: string;
  domain: MovementDomain;
  icon: string;
  color: string;
  subcategories: string[];
}

interface TrackerSubcategory {
  id: string;
  name: string;
  parentCategory: string;
  optionalFields: string[];
}
```

### 8.3 UI Configuration

```typescript
interface UIConfiguration {
  userId: string;
  
  // Quick log configuration
  quickLogButtons: QuickLogButton[];
  
  // Pattern view configuration
  patternVisualizations: VisualizationConfig[];
  
  // Insight display preferences
  insightTypes: InsightType[];
  
  // Feature unlocks
  unlockedFeatures: string[];
  
  // Customization
  preferences: UserPreferences;
}

interface QuickLogButton {
  id: string;
  label: string;
  category: string;
  subcategory?: string;
  icon: string;
  color: string;
  order: number;
}
```

---

## 9. Why This Is Strategically Important

### 9.1 Solves Three Major Problems

**1. Relevance Problem**
- ❌ Traditional: Pre-filled with irrelevant categories
- ✅ This System: Only shows what user actually does
- **Result:** Tracker fits the person from day one

**2. Abandonment Problem**
- ❌ Traditional: User must adapt to the tool
- ✅ This System: Tool adapts to the user
- **Result:** Lower abandonment, higher engagement

**3. Copyability Problem**
- ❌ Traditional: Easy to copy (fixed structure)
- ✅ This System: Requires:
  - Behavior modeling
  - Dynamic UI assembly
  - Longitudinal interpretation
  - Ethical restraint
- **Result:** Hard to copy, sustainable advantage

### 9.2 Competitive Differentiation

**What Competitors Do:**
- Fixed tracker structure
- One-size-fits-all interface
- Generic insights
- User adapts to tool

**What This System Does:**
- Dynamic tracker assembly
- Personalized interface
- Tailored insights
- Tool adapts to user

**This is a fundamental architectural difference, not a feature.**

---

## 10. Implementation Considerations

### 10.1 Discovery Flow Implementation

**Step 1: Domain Selection**
- Multi-select checkboxes
- "Other" with free text
- No minimum required
- Clear "change later" messaging

**Step 2: Domain Details**
- Conditional flow (only for selected domains)
- Light questions only
- Frequency relative, not absolute
- Skip option always available

**Step 3: Level Detection**
- Optional step
- Non-pressuring language
- Used for initial adaptation, not locking

### 10.2 Assembly Engine

**Components:**
1. **Structure Generator:** Creates tracker categories
2. **UI Assembler:** Builds quick log buttons
3. **Field Unlocker:** Enables domain-specific fields
4. **Pattern Configurator:** Sets up pattern recognition
5. **Insight Configurator:** Prepares insight generation

**Key Functions:**
```typescript
class TrackerAssembler {
  assembleTracker(profile: UserMovementProfile): TrackerStructure {
    const categories = this.generateCategories(profile.primaryDomains);
    const subcategories = this.generateSubcategories(profile.domainDetails);
    const fields = this.unlockFields(profile.primaryDomains);
    const patternConfig = this.configurePatterns(profile);
    const insightConfig = this.configureInsights(profile);
    
    return {
      categories,
      subcategories,
      availableFields: fields,
      patternConfig,
      insightConfig,
    };
  }
  
  generateCategories(domains: MovementDomain[]): TrackerCategory[] {
    // Generate categories based on selected domains
    // Gym → Gym Sessions
    // Running → Running Sessions
    // etc.
  }
  
  generateSubcategories(details: DomainDetail[]): Record<string, TrackerSubcategory[]> {
    // Generate subcategories based on domain details
    // Gym → Cardio, Upper Body, Lower Body, etc.
    // Running → Easy, Tempo, Intervals, etc.
  }
  
  unlockFields(domains: MovementDomain[]): FieldDefinition[] {
    // Unlock domain-specific fields
    // Gym → exercises, sets, reps, weight, RPE
    // Running → distance, pace, heart rate, terrain
  }
}
```

### 10.3 Reconfiguration

**User Can:**
- Add new domains anytime
- Remove domains (data preserved)
- Change domain details
- Adjust level

**System Response:**
- Reassembles tracker structure
- Updates UI configuration
- Reconfigures pattern recognition
- Regenerates insights
- No data loss

**Implementation:**
```typescript
async function reconfigureTracker(
  userId: string,
  updatedProfile: Partial<UserMovementProfile>
): Promise<void> {
  // Update profile
  await updateUserProfile(userId, updatedProfile);
  
  // Reassemble tracker
  const newStructure = await assembleTracker(updatedProfile);
  
  // Update UI configuration
  await updateUIConfiguration(userId, newStructure);
  
  // Reconfigure patterns
  await reconfigurePatterns(userId, newStructure);
  
  // Regenerate insights
  await regenerateInsights(userId);
}
```

---

## 11. User Experience Flow

### 11.1 First-Time User Journey

```
1. Welcome Screen
   "Let's learn about your movement"
   
2. Domain Selection
   "What kinds of movement are part of your life?"
   
3. Domain Details (for each selected)
   "Tell us about your [domain]"
   
4. Level Detection (optional)
   "How would you describe your relationship with movement?"
   
5. Assembly
   "Setting up your tracker..."
   [Brief loading]
   
6. Ready Screen
   "Your tracker is ready!"
   [Show quick log interface]
   "Tap to log your first movement"
```

### 11.2 Returning User Experience

**Quick Log (Primary):**
- See personalized quick log buttons
- Tap to log immediately
- Optional: Add details

**Pattern View:**
- See domain-relevant patterns
- Level-appropriate insights
- No irrelevant charts

**Insights:**
- Domain-aware observations
- Level-appropriate language
- Optional, dismissible

### 11.3 Reconfiguration Flow

```
Settings → Movement Profile → Edit
    │
    ├─→ Add Domain
    │       │
    │       └─→ Domain Details → Save
    │
    ├─→ Remove Domain
    │       │
    │       └─→ Confirm (data preserved) → Save
    │
    └─→ Change Details
            │
            └─→ Update Details → Save

[System reassembles automatically]
```

---

## 12. Success Metrics

### 12.1 Discovery Success

- Completion rate of discovery flow (>80%)
- Time to complete (<5 minutes)
- User satisfaction with initial setup
- Accuracy of assembled tracker (user-reported)

### 12.2 Assembly Success

- Relevance of quick log buttons (user-reported)
- Usage of assembled categories (>70% of sessions use assembled categories)
- Reconfiguration frequency (low = good fit)

### 12.3 Engagement Success

- Return rate after first use
- Frequency of logging
- Feature discovery rate
- Long-term retention

### 12.4 Adaptation Success

- Capability unlock rate (appropriate unlocks)
- User satisfaction with insights
- Pattern recognition accuracy
- Level detection accuracy

---

## 13. Future Enhancements

### 13.1 Advanced Discovery

- Machine learning for domain suggestion
- Pattern-based domain detection
- Automatic domain addition based on logging

### 13.2 Enhanced Assembly

- Community templates for common setups
- Coach/therapist-assisted setup
- Import from other trackers

### 13.3 Deeper Adaptation

- Real-time UI adaptation based on usage
- Predictive category suggestions
- Automatic subcategory addition

---

## 14. Conclusion

This design document outlines a fundamentally different approach to fitness tracking:

**Core Innovation:**
1. **Movement Discovery First:** Learn how the user moves before building the tracker
2. **Dynamic Assembly:** Build the tracker to match the user, not the other way around
3. **Progressive Unlocking:** Adapt capabilities based on usage, not user selection
4. **Unified Model:** Same data structure, different interpretation
5. **Tailored Views:** Show only what's relevant

**The One Sentence:**
> "The fitness tracker doesn't track fitness — it learns how you move, and adapts to support that."

This must be true at: onboarding, UI, data, insights, and architecture.

**Strategic Advantage:**
- Solves relevance, abandonment, and copyability problems
- Creates sustainable competitive differentiation
- Supports all users from hobbyist to professional
- Maintains core philosophy: movement as behavior, not output

**Next Steps:**
1. Implement discovery flow
2. Build assembly engine
3. Create dynamic UI components
4. Test with diverse user types
5. Iterate based on feedback

---

**Document Status:** Complete  
**Last Updated:** 2025-01-31  
**Version:** 2.0
