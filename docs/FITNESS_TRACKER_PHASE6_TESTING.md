# Phase 6: Testing & Refinement

**Project:** Intelligent Fitness Tracker  
**Date:** 2025-01-31  
**Owner:** Product + Engineering  
**Goal:** Validate the full discovery → logging → patterns → insights → reconfiguration loop with realistic user journeys, edge cases, and performance baselines.

---

## 1. Test Environments

### 1.1 Local Dev
- Run `npm run dev`
- Use local Supabase (if configured) or dev project
- Test on desktop and mobile viewport sizes

### 1.2 Test Users
Create or reuse at least three accounts:
1. **Casual Single-Domain** (Running only)
2. **Multi-Domain Regular** (Gym + Running + Yoga)
3. **MMA Mixed** (Martial Arts + Gym + Running)

---

## 2. Discovery Flow Testing

### 2.1 Single-Domain: Running Only
**Goal:** Ensure quick setup yields correct UI and data model.

**Steps:**
1. Open `/fitness-tracker/discovery`
2. Select **Running / Walking**
3. Choose activities: *Running (easy pace), Trail running*
4. Frequency: *Regularly*
5. Movement level: *Casual*
6. Complete discovery

**Expected:**
- Profile created with `primaryDomains: ['running']`
- UI shows quick log buttons relevant to running
- Pattern view shows empty state
- Insights view shows empty state
- Session list shows empty state

---

### 2.2 Multi-Domain: Gym + Running + Yoga
**Goal:** Ensure multi-domain assembly and UI config are correct.

**Steps:**
1. Open discovery flow
2. Select **Gym Training**, **Running / Walking**, **Yoga / Mobility**
3. Gym activities: *Free weights, Cardio machines*
4. Running activities: *Running (structured training)*
5. Yoga frequency: *Occasionally*
6. Level: *Structured*
7. Complete discovery

**Expected:**
- Tracker structure includes gym, running, and yoga categories
- Quick log shows at least one button per domain
- UI config includes gym fields (sets/reps) and running fields (distance/pace)
- Pattern config includes gym and running pattern analysis

---

### 2.3 MMA Mixed Profile (Stress Test)
**Goal:** Validate martial arts multi-discipline support with mixed domains.

**Steps:**
1. Select **Martial Arts**, **Gym Training**, **Running / Walking**
2. Martial arts disciplines: *Brazilian Jiu-Jitsu, Boxing, Wrestling, Muay Thai*
3. Gym activities: *Free weights, Mixed / varies*
4. Running activities: *Running (easy pace)*
5. Level: *Competitive*

**Expected:**
- Martial arts subcategories include BJJ, Boxing, Wrestling, Muay Thai
- Mixed-mode pattern analysis is configured
- Quick log buttons include martial arts sessions
- Insight generation includes cross-domain insights

---

## 3. Session Logging Testing

### 3.1 Quick Log (Running)
**Steps:**
1. Click running quick log
2. Set intensity: 3
3. Duration: 35 minutes
4. Notes: *Easy run, flat terrain*
5. Submit

**Expected:**
- Session appears in SessionListView
- Entry is created in `tracker_entries` with proper mapping
- Pattern and insights refresh after session creation

---

### 3.2 Quick Log (Gym)
**Steps:**
1. Click gym quick log
2. Set intensity: 4
3. Duration: 60 minutes
4. Notes: *Upper body push day*
5. Submit

**Expected:**
- Session appears in list with correct domain
- Pattern updates show gym-specific session types

---

### 3.3 Quick Log (Martial Arts)
**Steps:**
1. Click martial arts quick log
2. Set intensity: 5
3. Duration: 90 minutes
4. Notes: *BJJ rolling + drilling*
5. Submit

**Expected:**
- Session appears in list
- Martial arts patterns update (sparring intensity / discipline distribution)

---

## 4. Pattern Analysis Testing

### 4.1 Gym Patterns
Log 5 gym sessions:
- 2 easy, 2 moderate, 1 high intensity

**Expected:**
- Session balance chart shows distribution
- Intensity clustering chart reflects intensity spread
- Sustainability score > 0

---

### 4.2 Running Patterns
Log 4 running sessions:
- 2 easy, 1 tempo, 1 long run

**Expected:**
- Frequency pattern shows sessions per week
- Consistency score reflects frequency

---

### 4.3 Martial Arts Patterns
Log 6 martial arts sessions:
- 3 BJJ, 2 Boxing, 1 Wrestling
- Mix sparring and skill sessions

**Expected:**
- Discipline distribution reflects 3/2/1 split
- Sparring intensity chart populated

---

## 5. Insights Testing

### 5.1 Low Data
**Goal:** Ensure insights are empty or gentle when insufficient data.

**Expected:**
- Insights view shows empty state
- No judgmental language

---

### 5.2 Moderate Data (10–15 sessions)
**Expected:**
- At least 2–4 insights
- Mix of overall + domain-specific insights
- Non-judgmental, supportive tone

---

## 6. Reconfiguration Testing

### 6.1 Add Domain
**Steps:**
1. Open “Update Profile”
2. Add **Swimming**
3. Complete flow

**Expected:**
- New tracker created for swimming
- Quick log includes swimming
- Profile updated without losing past sessions

---

### 6.2 Remove Domain
**Steps:**
1. Remove **Running**
2. Complete flow

**Expected:**
- Running tracker archived (not deleted)
- Running sessions remain in history
- UI no longer shows running quick logs

---

### 6.3 Update Domain Details
**Steps:**
1. Add **Judo** to martial arts disciplines
2. Complete flow

**Expected:**
- Subcategory list includes Judo
- Quick log updated

---

## 7. Edge Case Testing

### 7.1 No Sessions
**Expected:**
- Pattern and insights show empty state
- No errors or crashes

---

### 7.2 Large Data (50+ sessions)
**Expected:**
- Session list loads within 2 seconds
- No UI freezes when switching tabs

---

### 7.3 User Switch / Auth Expiration
**Expected:**
- Profile reloads on auth changes
- Redirects to discovery if profile missing

---

## 8. Performance Baselines

Record the following on local dev:
- Profile load time (target < 1s)
- Session list load time (target < 2s for 50 sessions)
- Pattern analysis time (target < 2s for 8-week window)
- Insights generation time (target < 2s)

---

## 9. Issues Log

Use this section to track findings during testing:
- **Issue ID:** FT-TEST-001  
  **Title:**  
  **Steps:**  
  **Observed:**  
  **Expected:**  
  **Severity:**  

---

## 10. Completion Criteria

Phase 6 is complete when:
- All Discovery, Logging, Patterns, Insights, and Reconfiguration flows pass
- No critical issues remain
- Edge cases are verified
- Performance meets baseline targets

---
