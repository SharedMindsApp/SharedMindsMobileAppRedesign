# Fitness Tracker Stress Test: MMA Athlete Analysis

## Use Case: Professional/Amateur MMA Athlete

**Profile:**
- Trains at MMA gym with multiple disciplines:
  - Brazilian Jiu-Jitsu (BJJ)
  - Boxing (striking)
  - Wrestling
  - Possibly Muay Thai, Kickboxing, Judo
- Also does weightlifting/gym work
- Includes running/cardio sessions
- Needs accurate tracking across all activities

---

## Current Design Analysis

### ✅ **What Works Well**

1. **Multi-Domain Support**
   - Can select `martial_arts`, `gym`, and `running` as separate domains
   - System creates separate trackers for each domain
   - Each domain has its own category structure

2. **Team Sports Pattern (Could Apply to Martial Arts)**
   - `team_sports` uses `detail.sports` array to generate subcategories dynamically
   - Similar pattern could work: `detail.disciplines` → generate BJJ, Boxing, Wrestling subcategories

3. **Cross-Domain Pattern Analysis**
   - `DomainAwarePatternService` analyzes patterns across domains
   - Can track frequency, consistency across all domains
   - Mixed-mode analysis exists

4. **Session Type Granularity**
   - Supports `sessionType` field (subcategory)
   - Can distinguish between different types within a domain

### ❌ **Critical Gaps Identified**

#### 1. **Missing Martial Arts Subcategory Generation**

**Issue:** No `getMartialArtsSubcategories()` method in `TrackerAssembler`

**Impact:** 
- Martial arts selected as domain → creates "Martial Arts" category
- BUT no subcategories generated (BJJ, Boxing, Wrestling, etc.)
- Quick log only shows "Martial Arts" button, not individual disciplines
- Cannot distinguish between BJJ training vs Boxing training vs Wrestling

**Required Fix:**
```typescript
private getMartialArtsSubcategories(detail: DomainDetail): TrackerSubcategory[] {
  const disciplines = detail.disciplines || []; // e.g., ['BJJ', 'Boxing', 'Wrestling']
  
  return disciplines.map(discipline => ({
    id: discipline.toLowerCase().replace(/\s+/g, '_'),
    name: discipline,
    parentCategory: 'martial_arts',
    optionalFields: ['session_type', 'rounds', 'duration_minutes', 'intensity', 'notes'],
  }));
}
```

#### 2. **No Martial Arts Discovery Questions**

**Issue:** `DomainDetailsStep` has no martial arts specific questions

**Current:** Only gym, running, team_sports have specific questions

**Impact:**
- User selects "Martial Arts" → generic "Tell us about your martial arts" question
- No way to specify which disciplines they train
- System can't generate proper subcategories

**Required Fix:**
```typescript
case 'martial_arts':
  return {
    question: 'What disciplines do you train?',
    options: [
      'Brazilian Jiu-Jitsu (BJJ)',
      'Boxing',
      'Wrestling',
      'Muay Thai',
      'Kickboxing',
      'Judo',
      'Mixed / MMA',
      'Other'
    ],
  };
```

#### 3. **No Martial Arts-Specific Fields**

**Issue:** `unlockFields()` doesn't unlock martial arts specific fields

**Current Fields Available:**
- Common: duration, intensity, body state, enjoyment, notes
- Gym: exercises, sets, reps, weight, RPE
- Running/Cycling: distance, pace, terrain
- Swimming: distance_meters, stroke_type

**Missing Martial Arts Fields:**
- `rounds` (number of rounds)
- `round_duration` (minutes per round)
- `sparring_type` (drilling, light sparring, hard sparring, competition prep)
- `technique_focus` (what techniques worked on)
- `rolling_partner_level` (white/blue/purple/brown/black belt)
- `competition_context` (training, competition prep, actual competition)

**Required Fix:**
Add to `unlockFields()`:
```typescript
if (domains.includes('martial_arts')) {
  allFields.push(
    { id: 'rounds', type: 'number', label: 'Rounds', optional: true },
    { id: 'round_duration', type: 'number', label: 'Minutes per Round', optional: true },
    { id: 'sparring_type', type: 'select', label: 'Session Type', optional: true, options: [...] },
    { id: 'technique_focus', type: 'text', label: 'Technique Focus', optional: true },
    { id: 'partner_level', type: 'select', label: 'Partner Level', optional: true },
  );
}
```

#### 4. **No Mixed Session Support**

**Issue:** System expects one domain per session

**Real MMA Training Scenario:**
- "BJJ + Boxing" same session (drill BJJ for 30 min, then boxing for 30 min)
- "MMA Class" (mixed training across disciplines)
- "Strength + Conditioning + Technique" same day

**Impact:**
- User must log multiple separate sessions
- Can't capture the reality of MMA training
- Pattern analysis doesn't understand cross-training within sessions

**Options to Consider:**
- Option A: Allow multiple `sessionType` values per session (array)
- Option B: Create "Mixed" subcategory that allows discipline tags
- Option C: Track sessions separately but add "same_day_domains" metadata

#### 5. **Training vs Sparring vs Competition**

**Issue:** No martial arts specific pattern analysis

**Current:** Only sport domains have "training vs competition" analysis

**MMA Needs:**
- Distinguish: drilling → light sparring → hard sparring → competition prep → competition
- Track sparring intensity patterns
- Monitor recovery between hard sparring sessions
- Recognize competition cycles

**Required Fix:**
Add to `DomainAwarePatternService.analyzeDomainPatterns()`:
```typescript
if (category.domain === 'martial_arts') {
  if (config.trackSparringIntensity) {
    patterns.sparringIntensity = this.analyzeSparringIntensity(sessions);
  }
  if (config.trackTrainingVsCompetition) {
    patterns.trainingVsCompetition = this.analyzeTrainingVsCompetition(sessions);
  }
}
```

#### 6. **Cross-Domain Recovery Patterns**

**Issue:** Pattern analysis doesn't track cross-domain fatigue/recovery

**MMA Reality:**
- Hard BJJ session Monday → sore Tuesday → affects gym session Tuesday
- Heavy lifting Wednesday → affects striking Thursday
- Running on sore legs from grappling

**Current:**
- Each domain analyzed independently
- No cross-domain recovery analysis

**Missing:**
- "Body state" should influence subsequent sessions across domains
- Track fatigue accumulation across domains
- Suggest recovery days based on cross-domain load

#### 7. **Weight Class / Competition Context**

**Issue:** No fields for competition-specific tracking

**MMA Needs:**
- Weight class tracking
- Competition date / fight prep cycles
- Weight cut periods
- Competition vs training distinction

**Current:** Generic "competition" context, but no weight/fight specific fields

#### 8. **Session Intent for MMA**

**Issue:** `intent` field is generic

**MMA Needs:**
- Technical work (drilling)
- Conditioning
- Competition prep
- Recovery / mobility
- Skill development (new techniques)
- Maintenance

**Current:** `intent` exists but options aren't MMA-specific

---

## Scenarios to Test

### Scenario 1: Daily MMA Training
**Session:** Monday morning - BJJ drilling (30 min) + Boxing (30 min) + Conditioning (20 min)

**Current Ability:**
- ❌ Cannot log as single "MMA Class" session with disciplines
- ⚠️ Must log 3 separate sessions (BJJ, Boxing, Conditioning)
- ❌ Pattern analysis treats them as unrelated

### Scenario 2: Training Week
- Monday: BJJ + Boxing
- Tuesday: Weightlifting (Upper Body) + Wrestling drills
- Wednesday: Running (easy pace)
- Thursday: Boxing + BJJ sparring (hard)
- Friday: Weightlifting (Lower Body) + Mobility

**Current Ability:**
- ✅ Can log all sessions
- ⚠️ Can't see "MMA Week" as cohesive unit
- ❌ No pattern for "BJJ + Boxing" combinations
- ✅ Can see frequency across domains

### Scenario 3: Competition Prep
**Period:** 8 weeks before fight

**Tracking Needs:**
- Increase sparring intensity
- Weight management
- Competition-specific drills
- Peak timing

**Current Ability:**
- ❌ No competition prep mode
- ❌ No weight tracking
- ❌ No peak timing analysis
- ⚠️ Can manually track but no automated insights

### Scenario 4: Recovery Patterns
**Pattern:** Hard BJJ session → next day body state "sore" → affects gym session

**Current Ability:**
- ✅ Can log body state
- ❌ No cross-domain recovery analysis
- ❌ No "soreness from previous session" tracking
- ⚠️ Patterns don't connect domains for recovery

---

## Priority Fixes Needed

### **Critical (Blocking MMA Use)**

1. **Add Martial Arts Subcategory Generation**
   - Implement `getMartialArtsSubcategories()` similar to `getTeamSportsSubcategories()`
   - Use `detail.disciplines` array to generate BJJ, Boxing, Wrestling, etc.

2. **Add Martial Arts Discovery Questions**
   - Update `DomainDetailsStep` to ask "What disciplines do you train?"
   - Store in `domainDetails.martial_arts.disciplines`

3. **Add Martial Arts Specific Fields**
   - `rounds`, `round_duration`, `sparring_type`, `technique_focus`
   - Update `unlockFields()` for martial_arts domain

### **Important (Enhances MMA Use)**

4. **Martial Arts Pattern Analysis**
   - Add sparring intensity tracking
   - Add training vs competition patterns
   - Recognize competition prep cycles

5. **Cross-Domain Recovery Analysis**
   - Track how sessions in one domain affect subsequent sessions
   - Body state correlations across domains
   - Fatigue accumulation tracking

### **Nice to Have (Advanced MMA Features)**

6. **Mixed Session Support**
   - Allow multiple disciplines per session
   - "MMA Class" session type with discipline tags

7. **Competition Prep Mode**
   - Weight tracking
   - Competition date integration
   - Peak timing analysis

8. **Session Intent Granularity**
   - MMA-specific intent options
   - Technical work vs conditioning vs competition prep

---

## Design Validation

### ✅ **Multi-Activity Approach: SUPPORTED**

The system CAN handle multiple domains (martial_arts, gym, running). The architecture supports this.

### ❌ **Discipline Granularity: MISSING**

The system CANNOT distinguish between BJJ, Boxing, Wrestling within martial_arts. This is a critical gap.

### ⚠️ **Cross-Domain Patterns: PARTIAL**

The system CAN see patterns across domains, but CANNOT see cross-domain recovery/fatigue effects.

### ⚠️ **Professional Athlete Needs: PARTIAL**

The system CAN track frequency and consistency, but MISSING competition prep features, weight tracking, and peak timing.

---

## Recommendations

1. **Immediate:** Implement martial arts subcategories and discovery questions (blocks all MMA use)
2. **Short-term:** Add martial arts fields and pattern analysis (enables proper tracking)
3. **Medium-term:** Cross-domain recovery analysis (enables better insights)
4. **Long-term:** Mixed sessions, competition prep mode (nice-to-have features)

---

## Conclusion

**The current design CAN support MMA athletes, but requires:**
- Martial arts subcategory generation (similar to team sports pattern)
- Martial arts discovery questions
- Martial arts specific fields
- Martial arts pattern analysis

**The multi-domain architecture is sound** - we just need to fill in the martial arts specific implementation.
