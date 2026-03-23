# Tracker Studio Templates - Complete List

This document lists all Tracker Studio templates and what each one does.

## Overview

Tracker Studio includes **25 active global templates** (plus 5 deprecated templates) that are available to all users. These templates provide pre-configured tracking structures for various aspects of personal data, wellness, and productivity.

---

## Self-Care & Wellness Templates

### 1. Sleep Tracker
**Description:** Track your sleep patterns gently. Record duration, quality, and any notes about your rest.

**Fields:**
- Date (required)
- Duration (hours) - 0-24 hours
- Sleep Quality (rating 1-5, default: 3)
- Notes (optional, max 1000 chars)

**Entry Granularity:** Daily

---

### 2. ~~Exercise Tracker~~ (Deprecated)
**Status:** Deprecated - Use Fitness Tracker instead

**Reason:** Exercise Tracker has been replaced by Fitness Tracker, which provides personalized movement intelligence and better tracking capabilities.

---

### 3. ~~Nutrition Log~~ (Deprecated)
**Status:** Deprecated - Use Nutrition & Hydration Tracker instead

**Reason:** Nutrition Log has been merged into Nutrition & Hydration Tracker, which provides unified tracking for both food and hydration in one place.

---

### 4. Mindfulness & Meditation
**Description:** Track moments of presence. No timer required, no streak pressure—just awareness of your practice.

**Fields:**
- Date (required)
- Session Type (required, max 100 chars)
- Duration (minutes)
- Reflection (optional, max 1000 chars)

**Entry Granularity:** Daily

---

### 5. Rest & Recovery
**Description:** Track rest blocks, recovery days, and burnout notes. Honor your need for rest.

**Fields:**
- Date (required)
- Type (required, max 50 chars)
- Duration (minutes)
- Notes (optional, max 1000 chars)

**Entry Granularity:** Daily

---

### 6. Mental Health Check-in
**Description:** A gentle space to check in with yourself. Track mood, energy, stress, and reflections without judgment.

**Fields:**
- Date (required)
- Mood (required) - Options: Peaceful, Happy, Content, Neutral, Anxious, Sad, Overwhelmed, Tired
- Energy Level (rating 1-5, required, default: 3)
- Stress Level (rating 1-5, required, default: 3)
- Reflection (optional, max 2000 chars)

**Entry Granularity:** Daily

**Charts:** Time series for energy/stress, bar chart for mood distribution

---

### 7. Mood Tracker
**Description:** Track your mood throughout the day. Optionally note stress levels, triggers, and what helps. A gentle companion for understanding your emotional patterns.

**Fields:**
- Date (required)
- Mood (rating 1-5, required, default: 3) - How are you feeling?
- Time of Day (optional, max 50 chars) - When did you check in?
- Stress Level (rating 1-5, optional, default: 3) - Optional: How stressed do you feel? (1 = very calm, 5 = very stressed)
- What Contributed to Stress? (optional, max 500 chars) - Optional: What situations, thoughts, or events contributed to stress?
- What Helped? (optional, max 500 chars) - Optional: What helped you manage stress or improve your mood?
- Notes (optional, max 1000 chars) - Any additional thoughts or observations

**Entry Granularity:** Daily

**Charts:** 
- Time series for mood over time
- Time series for stress level over time
- Scatter plot: Mood vs Stress (to see relationships)

**Tags:** mood, emotions, stress, wellness, mental-health, self-care, tracking, awareness

**Note:** This enhanced tracker helps you understand the relationship between mood and stress. All stress-related fields are optional—use them when they're helpful, skip them when they're not. This tracker replaces the separate Stress Level Tracker.

---

### 8. Energy Level Tracker
**Description:** Track your energy levels throughout the day. Notice patterns without trying to change them.

**Fields:**
- Date (required)
- Morning Energy (rating 1-5, default: 3)
- Afternoon Energy (rating 1-5, default: 3)
- Evening Energy (rating 1-5, default: 3)
- Notes (optional, max 500 chars)

**Entry Granularity:** Daily

---

### 9. ~~Water Intake Tracker~~ (Deprecated)
**Status:** Deprecated - Use Nutrition & Hydration Tracker instead

**Reason:** Water Intake Tracker has been merged into Nutrition & Hydration Tracker, which provides unified tracking for both food and hydration in one place.

---

### 10. Nutrition & Hydration Tracker
**Description:** Track what you eat and drink with awareness — no macro counting, no targets, no pressure. This tracker records inputs, not outcomes.

**Fields:**
- Entry Type (required) - Options: Meal, Hydration, General Nutrition
- Date (required)

**Conditional Fields:**

**When Entry Type = Meal:**
- Meal Type (optional, max 50 chars) - e.g., Breakfast, Lunch, Dinner, Snack
- What did you eat? (required, max 1000 chars)
- Tags (optional, max 200 chars)
- Mood/Feelings (optional, max 500 chars)
- Notes (optional, max 1000 chars)

**When Entry Type = Hydration:**
- Amount (number, optional)
- Unit (optional) - Options: Cups, Glasses, ml
- Notes (optional, max 200 chars)

**When Entry Type = General Nutrition:**
- Nutrition Notes (optional, max 1000 chars) - For things like appetite, cravings, digestion, or general observations

**Entry Granularity:** Daily

**Charts:** Bar chart for nutrition entries by type, time series for hydration over time

**Tags:** nutrition, hydration, food, wellness, self-care, tracking, health

**Note:** This template replaces Nutrition Log and Water Intake Tracker. The form dynamically shows only relevant fields based on the selected entry type. This tracker is observational, not prescriptive—no calorie counting, macro tracking, or nutrition scoring.

---

### 11. Health Tracker
**Description:** Track medications, symptoms, and general health events in one place. Select the type of entry first, then fill in the relevant fields.

**Fields:**
- Entry Type (required) - Options: Medication, Symptom, General Health
- Date (required)

**Conditional Fields:**

**When Entry Type = Medication:**
- Medication Name (text, max 200 chars)
- Dosage (optional, max 100 chars)
- Time Taken (optional, max 50 chars)
- Notes (optional, max 500 chars)

**When Entry Type = Symptom:**
- Symptom Name (text, max 200 chars)
- Severity (rating 1-5, default: 3)
- Duration (optional, max 100 chars)
- Notes (optional, max 1000 chars)

**When Entry Type = General Health:**
- Health Notes (text, max 1000 chars)

**Entry Granularity:** Daily

**Charts:** Bar chart for health events by type, time series for symptom severity

**Tags:** health, medication, symptoms, wellness, self-care, tracking

**Note:** This template replaces Medication Tracker and Symptom Tracker. The form dynamically shows only relevant fields based on the selected entry type.

---

### 12. ~~Stress Level Tracker~~ (Deprecated)
**Status:** Deprecated - Use enhanced Mood Tracker instead

**Reason:** Stress Level Tracker has been replaced by the enhanced Mood Tracker, which provides integrated mood and stress tracking in one place. This helps you see the relationship between mood and stress patterns.

---

## Personal Development Templates

### 13. Growth Tracking
**Description:** Track your personal growth across key dimensions: confidence, emotional resilience, focus & clarity, and self-trust.

**Fields:**
- Date (required)
- Confidence (rating 1-5, required, default: 3)
- Emotional Resilience (rating 1-5, required, default: 3)
- Focus & Clarity (rating 1-5, required, default: 3)
- Self-Trust (rating 1-5, required, default: 3)
- Notes (optional, max 500 chars)
- Reflection (optional, max 2000 chars)

**Entry Granularity:** Daily

---

### 14. ~~Gratitude Journal~~ (Deprecated)
**Status:** Deprecated - Use Journal app in Spaces instead

**Reason:** Gratitude Journal has been moved to a standalone Journal app in Spaces, which provides a unified interface for both personal journaling and gratitude entries with better organization, search, and tagging capabilities.

---

### 15. ~~Personal Journal~~ (Deprecated)
**Status:** Deprecated - Use Journal app in Spaces instead

**Reason:** Personal Journal has been moved to a standalone Journal app in Spaces, which provides a unified interface for both personal journaling and gratitude entries with better organization, search, and tagging capabilities.

---

### 16. Monthly Vision Check-in
**Description:** Monthly check-in to reflect on alignment with your vision. Notice what feels aligned, what doesn't, and small adjustments you can make.

**Fields:**
- Check-in Date (required)
- What Felt Aligned (required, max 2000 chars)
- What Didn't Feel Aligned (optional, max 2000 chars)
- Small Adjustment (optional, max 1000 chars)
- Overall Feeling (optional, max 500 chars)

**Entry Granularity:** Range (Monthly entries)

**Tags:** vision, reflection, planning, alignment, monthly-checkin

---

## Productivity & Habits Templates

### 17. Productivity Tracker
**Description:** Track your productivity and focus. Notice patterns without self-criticism.

**Fields:**
- Date (required)
- Focus Level (rating 1-5, default: 3)
- Tasks Completed (number, default: 0)
- Distractions (optional, max 500 chars)
- Notes (optional, max 1000 chars)

**Entry Granularity:** Daily

---

### 18. Habit Tracker
**Description:** Track your daily habits. Log check-ins with status, values, and notes. Support habits without streak pressure.

**Fields:**
- Habit Name (required, max 200 chars)
- Status (required) - Options: Done, Missed, Skipped, Partial
- Value (Count/Minutes/Rating) (number, optional)
- Completed (boolean, optional)
- Notes (optional, max 1000 chars)

**Entry Granularity:** Daily

**Charts:** Heatmap for status, time series for numeric values

**Tags:** habits, productivity, personal-development, tracking, daily-routine

**Note:** This template is prioritized to appear first in template lists.

---

### 19. Habit Check-in Tracker
**Description:** Track daily habit check-ins. Simple yes/no tracking without streak pressure.

**Fields:**
- Date (required)
- Habit Name (required, max 200 chars)
- Completed (boolean, required, default: false)
- Notes (optional, max 500 chars)

**Entry Granularity:** Daily

---

## Social & Connection Templates

### 20. Social Connection Tracker
**Description:** Track social interactions and connections. Notice what feels nourishing.

**Fields:**
- Date (required)
- Interaction Type (optional, max 100 chars)
- Quality (rating 1-5, default: 3)
- Duration (minutes)
- Notes (optional, max 1000 chars)

**Entry Granularity:** Daily

---

## Finance Templates

### 21. Income & Cash Flow
**Description:** Track income sources and cash flow. Record expected and actual amounts over time.

**Fields:**
- Date (required)
- Source Name (required, max 200 chars)
- Source Type (optional, max 100 chars)
- Frequency (optional, max 50 chars)
- Expected Amount (number, min: 0)
- Actual Amount (number, min: 0)
- Notes (optional, max 500 chars)

**Entry Granularity:** Daily

---

### 22. Financial Reflection
**Description:** Reflect on your financial journey. Track what went well, challenges, insights, and decisions made.

**Fields:**
- Reflection Date (required)
- Reflection Period (required) - Options: Monthly, Quarterly, Annual
- Title (optional, max 200 chars)
- What Went Well (optional, max 2000 chars)
- What Was Hard (optional, max 2000 chars)
- Emotional Check-in (optional, max 1000 chars)
- Key Insights (optional, max 2000 chars)
- Decisions Made (optional, max 2000 chars)
- Goals for Next Period (optional, max 2000 chars)

**Entry Granularity:** Range (Monthly, Quarterly, or Annual)

**Tags:** finance, reflection, planning, financial-wellness

---

## Digital Wellness Templates

### 23. Digital Wellness Tracker
**Description:** Understand how your digital environment affects your attention, energy, mood, and behavior. Track app usage, interruptions, boundaries, and how your digital habits feel—without judgment or enforcement.

**Note:** This tracker evolved from Screen Time Tracker and includes all existing screen time functionality plus expanded digital wellness tracking.

**Fields:**

**Screen & App Usage (Existing):**
- App Name (required, max 200 chars)
- App Category (optional) - Options: Social Media, Entertainment, Games, Productivity, Shopping, News, Other
- Usage Time (minutes, required, default: 0)
- Session Type (required) - Options: Regular Tracking, Lockout Session, Blocked Attempt, Break Time, Focus Mode
- Lockout Duration (minutes, 1-1440)
- Lockout Trigger (optional) - Options: Time Limit Reached, App in Blocked List, Scheduled Lockout, Manual Lockout, Focus Mode Active
- Unlock Method (optional) - Options: Time Expired, Manual Unlock, Break Completed, Emergency Override
- Blocked Apps (comma-separated, optional, max 1000 chars)
- Total Screen Time Today (minutes, default: 0)
- Phone Pickups (number, default: 0)
- Notifications Received (number, default: 0)
- Daily Goal Met (boolean, default: false)
- Notes / Reflection (optional, max 2000 chars)

**Attention & Interruption (New):**
- Interruption Level (rating 1-5, default: 3) - How interrupted did you feel by your devices?
- Primary Distraction Source (optional) - Options: Social Media, Messaging, News, Work Apps, Entertainment, Notifications, Other

**Intentional Use & Boundaries (New):**
- Intended Use (optional) - Options: Focus, Rest, Connection, Entertainment, Work, Other
- Boundary Respected (optional boolean) - Did your actual usage match your intention?
- Boundary Notes (optional, max 1000 chars)

**Subjective Digital Wellbeing (New):**
- Digital Wellbeing Score (rating 1-5, default: 3) - How did your digital habits feel today?
- Emotional Impact (optional) - Options: Energising, Neutral, Draining, Anxious, Overstimulating
- After Use State (optional) - Options: Focused, Calm, Distracted, Tired, Overloaded

**Entry Granularity:** Session (can have multiple entries per day)

**Charts:** 
- Time series for app usage over time (stacked by app)
- Pie chart for time by app category
- Bar chart for phone pickups per day
- Line chart for total screen time trend
- Time series for digital wellbeing score over time (new)
- Time series for interruption level trend (new)
- Bar chart for boundary respected vs broken (new)
- Bar chart for usage intention distribution (new)

**Tags:** digital-wellness, screen-time, attention, boundaries, wellness, self-care, mobile, tracking

---

## Goals & Planning Templates

### 24. Goal Tracker
**Description:** Track your goals and progress over time. Log daily progress, milestones, and reflections.

**Fields:**
- Goal Name (required, max 200 chars)
- Progress (%) (number, 0-100, required, default: 0)
- Status (required) - Options: Active, In Progress, Completed, Paused, Archived
- Milestone / Achievement (optional, max 500 chars)
- Target Date (optional, date)
- Notes / Reflection (optional, max 2000 chars)

**Entry Granularity:** Daily

**Charts:** Time series for progress over time (0-100%)

**Tags:** goals, planning, productivity, personal-development, tracking

---

## Specialized Templates

### 25. ~~Weather & Environment Tracker~~ (Deprecated)
**Status:** Deprecated - Use Environmental Impact Tracker instead

**Reason:** Weather tracking provides low user value (data is externally available) and does not reflect user behavior. Environmental Impact Tracker focuses on user-controlled environmental actions instead.

---

### 25. Environmental Impact Tracker
**Description:** Track environmentally conscious actions you take. Notice patterns, reflect on choices, and build awareness—no scoring, no judgment.

**Fields:**
- Entry Type (required) - Options: Waste Management, Transport, Energy Use, Consumption Choices, General Environmental Reflection
- Date (required)

**Conditional Fields:**

**When Entry Type = Waste Management:**
- Waste Action (required) - Options: Recycled, Composted, Reduced Waste, Reused Item, Avoided Single-Use Plastic, Other
- Notes (optional, max 1000 chars)

**When Entry Type = Transport:**
- Transport Mode (required) - Options: Walking, Cycling, Public Transport, Car, Car Share, Remote / No Travel
- Distance Estimate (number, optional)
- Notes (optional, max 1000 chars)

**When Entry Type = Energy Use:**
- Energy Action (required) - Options: Reduced Usage, Used Renewable Source, Energy-Efficient Choice, Monitored Consumption
- Notes (optional, max 1000 chars)

**When Entry Type = Consumption Choices:**
- Consumption Action (required) - Options: Bought Second-Hand, Avoided Purchase, Chose Sustainable Product, Repaired Item
- Notes (optional, max 1000 chars)

**When Entry Type = General Environmental Reflection:**
- Environmental Reflection (optional, max 1500 chars)

**Entry Granularity:** Daily

**Charts:** Bar chart for environmental actions by type, waste management actions, transport mode distribution

**Tags:** environment, sustainability, values, behavior, tracking, awareness, impact

**Note:** This template replaces Weather & Environment Tracker. The form dynamically shows only relevant fields based on the selected entry type. This tracker focuses on user actions and awareness, not external conditions or carbon scoring.

---

### 26. Fitness Tracker
**Description:** A personalized movement intelligence system. First, we learn about your movement patterns (gym, running, sports, etc.), then we build a tracker tailored to you. No goals, no judgment—just understanding and support.

**Fields:**
- Movement Type (required, max 100 chars) - Will be customized after discovery
- Intensity (1-5) (number, 1-5)
- Body State (optional) - Options: Fresh, Sore, Fatigued, Stiff, Injured, Recovered
- Enjoyment (1-5) (number, 1-5)
- Notes (optional, max 2000 chars)

**Entry Granularity:** Session (not daily)

**Charts:** Time series for intensity over time

**Tags:** fitness, movement, exercise, sports, health, wellness, personalized, intelligent

**Note:** This is a special template that triggers a discovery flow. The actual fields are created dynamically after learning about the user's movement patterns.

---

## Template Statistics

- **Total Active Templates:** 24 (26 created, 3 deprecated)
- **Daily Granularity:** 20 templates
- **Session Granularity:** 2 templates (Digital Wellness Tracker, Fitness Tracker)
- **Range Granularity:** 2 templates (Financial Reflection, Monthly Vision Check-in)

## Template Categories

1. **Self-Care & Wellness:** 10 templates (Medication/Symptom merged into Health Tracker, Exercise Tracker deprecated)
2. **Personal Development:** 4 templates
3. **Productivity & Habits:** 3 templates
4. **Social & Connection:** 1 template
5. **Finance:** 2 templates
6. **Digital Wellness:** 1 template
7. **Goals & Planning:** 1 template
8. **Specialized:** 2 templates

## Deprecated Templates

The following templates have been deprecated and are hidden from new template selection:

1. **Medication Tracker** - Merged into Health Tracker
2. **Symptom Tracker** - Merged into Health Tracker
3. **Exercise Tracker** - Replaced by Fitness Tracker (which provides personalized movement tracking)

**Note:** Existing trackers created from these templates continue to function normally. Users can still access and edit their existing trackers. New users should use the replacement templates instead.

---

## Notes

- All templates are **global templates** (available to all users)
- All templates are **locked** (admin-only edits)
- Templates are **structure-only** (they never contain data)
- When users create a tracker from a template, the tracker stores a snapshot of the template's schema
- Templates can be versioned; existing trackers never break when templates are updated
- The **Habit Tracker** template is prioritized to appear first in template lists

---

## Migration Files

Templates were created in the following migrations:

1. `20260131000013_create_planner_tracker_templates.sql` - 9 templates
2. `20260131000018_add_additional_tracker_templates.sql` - 10 templates
3. `20260131000023_add_missing_planner_tracker_templates.sql` - 3 templates
4. `20260131000026_create_habit_tracker_template.sql` - 1 template
5. `20260131000025_create_goal_tracker_template.sql` - 1 template
6. `20260131000027_create_screen_time_tracker_template.sql` - 1 template
7. `20260131000030_create_fitness_tracker_template.sql` - 1 template

**Total:** 26 templates across 7 migration files
