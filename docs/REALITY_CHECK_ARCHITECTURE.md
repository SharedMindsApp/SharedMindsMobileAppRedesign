# Reality Check System Architecture & Implementation Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Model](#data-model)
4. [Component Structure](#component-structure)
5. [Skills Matrix](#skills-matrix)
6. [Tools Matrix](#tools-matrix)
7. [Feasibility Dashboard](#feasibility-dashboard)
8. [Computation Logic](#computation-logic)
9. [Integration Points](#integration-points)

---

## Overview

### Purpose

The **Reality Check** system is a strategic planning and feasibility assessment tool within the Guardrails module. It helps users evaluate their readiness to execute a project by comparing:

- **Current capabilities** (skills and tools the user possesses)
- **Project requirements** (skills and tools needed for the project)
- **Time constraints** (estimated project duration vs. available time)
- **Risk factors** (blockers, overwhelm, complexity)

The system provides actionable insights and recommendations to help users make informed decisions about project feasibility, scope adjustments, and resource planning.

### Key Features

1. **Skills Gap Analysis**: Compare user skills against project requirements with proficiency matching
2. **Tools Coverage Assessment**: Evaluate tool availability and identify missing essential tools
3. **Time Feasibility Analysis**: Calculate weekly hour requirements and timeline recommendations
4. **Risk Assessment**: Identify blockers, overwhelm indicators, and complexity scores
5. **Comprehensive Scoring**: Single feasibility score (0-100) with status indicator (green/yellow/red)
6. **Actionable Recommendations**: Context-aware suggestions for improving feasibility

### Location in Application

- **Route**: `/guardrails/projects/:masterProjectId/reality`
- **Component**: `src/components/guardrails/reality/RealityCheckPage.tsx`
- **Access**: Requires an active project (project-specific view)

---

## Architecture

### High-Level Structure

```
RealityCheckPage (Entry Point)
├── Tab Navigation (Feasibility / Skills / Tools)
│
├── FeasibilityDashboard
│   ├── FeasibilityScoreCard
│   ├── SkillsCoverageCard
│   ├── ToolsCoverageCard
│   ├── TimeFeasibilityCard
│   ├── RiskPanel
│   └── RecommendationsList
│
├── SkillsMatrix (uses SkillsMap component)
│   ├── User Skills Management
│   ├── Project Required Skills Management
│   └── Gap Analysis Display
│
└── ToolsMatrix
    ├── User Tools Management
    ├── Project Required Tools Management
    └── Gap Analysis Display
```

### Data Flow

```
Database Tables
    ↓
realityCheck.ts (Business Logic)
    ↓
getRealityCheckReport() (API Layer)
    ↓
FeasibilityDashboard Component
    ↓
Individual Card Components
```

### Technology Stack

- **Frontend**: React + TypeScript
- **UI Framework**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect)
- **Data Layer**: Supabase (PostgreSQL)
- **Routing**: React Router

---

## Data Model

### Database Tables

#### 1. `user_skills`
**Purpose**: Stores skills that the user currently possesses.

```sql
CREATE TABLE user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  proficiency integer NOT NULL CHECK (proficiency >= 1 AND proficiency <= 5),
  description text,
  category text CHECK (category IN ('cognitive', 'emotional', 'social', 'physical', 'technical', 'creative')),
  evidence text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Fields**:
- `proficiency`: 1-5 scale (1 = beginner, 5 = expert)
- `category`: Skill classification for organization
- `evidence`: Optional text describing proof/experience with the skill

#### 2. `project_required_skills`
**Purpose**: Defines skills needed for a specific master project.

```sql
CREATE TABLE project_required_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  importance integer NOT NULL CHECK (importance >= 1 AND importance <= 5),
  estimated_learning_hours integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

**Key Fields**:
- `importance`: 1-5 scale (1 = nice to have, 5 = critical)
- `estimated_learning_hours`: Time estimate if skill needs to be learned

#### 3. `user_tools`
**Purpose**: Stores tools, software, or resources the user owns/accesses.

```sql
CREATE TABLE user_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  cost numeric,
  created_at timestamptz DEFAULT now()
);
```

**Key Fields**:
- `category`: Tool classification (e.g., "Software", "Hardware", "Service")
- `cost`: Optional purchase/acquisition cost

#### 4. `project_required_tools`
**Purpose**: Defines tools needed for a specific master project.

```sql
CREATE TABLE project_required_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  is_essential boolean DEFAULT false,
  estimated_cost numeric,
  created_at timestamptz DEFAULT now()
);
```

**Key Fields**:
- `is_essential`: Whether tool is critical for project (blocks work if missing)
- `estimated_cost`: Expected cost if tool needs to be acquired

### TypeScript Interfaces

#### SkillCoverage
```typescript
interface SkillCoverage {
  coveragePercent: number;        // 0-100 weighted coverage percentage
  missingSkills: SkillGap[];      // Skills not in user's skill set
  gaps: SkillGap[];               // Skills with insufficient proficiency
  matchedSkills: Array<{          // Skills with adequate coverage
    name: string;
    userProficiency: number;
    requiredImportance: number;
  }>;
}
```

#### ToolCoverage
```typescript
interface ToolCoverage {
  coveragePercent: number;        // 0-100 percentage of tools available
  missingTools: ToolGap[];        // Tools not in user's inventory
  essentialMissingCount: number;  // Count of essential missing tools
  estimatedTotalCost: number;     // Sum of estimated costs for missing tools
  matchedTools: Array<{           // Tools available to user
    name: string;
    category: string;
  }>;
}
```

#### TimeFeasibility
```typescript
interface TimeFeasibility {
  weeklyHoursNeeded: number;                    // Calculated from roadmap items
  weeklyHoursAvailable: number;                 // User's available hours (default: 10)
  deficitOrSurplus: number;                     // Available - Needed (negative = deficit)
  recommendedTimelineExtensionWeeks: number;    // Weeks to extend if deficit
  estimatedProjectWeeks: number;                // Total project duration
}
```

#### RiskAnalysis
```typescript
interface RiskAnalysis {
  overwhelmIndex: number;                       // 0-100 composite risk score
  blockersCount: number;                        // Number of blocked roadmap items
  complexityScore: number;                      // Composite complexity metric
  riskLevel: 'low' | 'medium' | 'high';       // Risk classification
  warnings: string[];                           // Human-readable warnings
}
```

#### ProjectFeasibility
```typescript
interface ProjectFeasibility {
  skillCoveragePercent: number;
  toolCoveragePercent: number;
  timeFeasibility: TimeFeasibility;
  riskAnalysis: RiskAnalysis;
  feasibilityScore: number;                     // 0-100 overall score
  feasibilityStatus: 'green' | 'yellow' | 'red'; // Status indicator
  recommendations: string[];                    // Actionable suggestions
  skillCoverage: SkillCoverage;
  toolCoverage: ToolCoverage;
}
```

---

## Component Structure

### Entry Point: RealityCheckPage

**File**: `src/components/guardrails/reality/RealityCheckPage.tsx`

**Responsibilities**:
- Tab navigation between three views (Feasibility, Skills, Tools)
- Project header integration
- Layout structure

**Props**:
```typescript
interface RealityCheckPageProps {
  masterProjectId: string;
  masterProjectName: string;
}
```

**State**:
- `activeTab`: `'feasibility' | 'skills' | 'tools'` (defaults to 'feasibility')

**Key Features**:
- Tab-based navigation with icons
- Conditional rendering of child components
- Project context passed to child components

---

## Skills Matrix

### Component: SkillsMatrix

**File**: `src/components/guardrails/reality/SkillsMatrix.tsx`

**Note**: The current implementation uses the `SkillsMap` component in "guardrails" mode, which provides a unified skills management interface. A legacy implementation is also available.

### Features

#### 1. User Skills Management
- **View**: List of all user skills with proficiency indicators
- **Add/Edit**: Modal forms for creating/editing skills
- **Delete**: Remove skills from inventory
- **Proficiency Display**: Visual dots (1-5 scale) showing skill level

#### 2. Project Required Skills Management
- **View**: List of skills required for the project
- **Add/Edit**: Define skill requirements with importance level
- **Delete**: Remove requirements
- **Learning Hours**: Optional time estimate for skill acquisition

#### 3. Gap Analysis
The component performs real-time gap analysis:

- **Missing**: Skill required but not in user's inventory (red badge)
- **Insufficient**: Skill exists but proficiency < required importance (yellow badge)
- **Sufficient**: Skill exists with adequate proficiency (green badge)

#### 4. Visual Indicators
- Color-coded cards based on gap status
- Badge indicators for missing/insufficient skills
- Proficiency dots showing current level vs. required level

### Data Operations

**Loading**:
```typescript
// Fetches user skills and project required skills in parallel
const [userSkills, requiredSkills] = await Promise.all([
  supabase.from('user_skills').select('*').eq('user_id', user.id),
  supabase.from('project_required_skills')
    .select('*')
    .eq('master_project_id', masterProjectId)
]);
```

**Gap Calculation**:
```typescript
const getSkillGapStatus = (skillName: string) => {
  const userSkill = userSkills.find(s => 
    s.name.toLowerCase() === skillName.toLowerCase()
  );
  const requiredSkill = requiredSkills.find(s => 
    s.name.toLowerCase() === skillName.toLowerCase()
  );

  if (!requiredSkill) return null;
  if (!userSkill) return 'missing';
  if (userSkill.proficiency < requiredSkill.importance) return 'insufficient';
  return 'sufficient';
};
```

---

## Tools Matrix

### Component: ToolsMatrix

**File**: `src/components/guardrails/reality/ToolsMatrix.tsx`

### Features

#### 1. User Tools Management
- **View**: List of all tools in user's inventory
- **Add/Edit**: Modal forms for adding/editing tools
- **Delete**: Remove tools from inventory
- **Categories**: Organize tools by category (Software, Hardware, Service, etc.)
- **Cost Tracking**: Optional cost field for owned tools

#### 2. Project Required Tools Management
- **View**: List of tools required for the project
- **Add/Edit**: Define tool requirements with essential flag
- **Delete**: Remove requirements
- **Essential Flag**: Mark critical tools that block work if missing
- **Estimated Cost**: Expected cost if tool needs to be acquired

#### 3. Gap Analysis
The component performs gap analysis with three states:

- **Missing Essential**: Required essential tool not available (red, critical badge)
- **Missing Optional**: Required non-essential tool not available (yellow, missing badge)
- **Available**: Tool is in user's inventory (green)

#### 4. Visual Indicators
- Color-coded cards: Red (essential missing), Yellow (optional missing), Green (available)
- Essential badge for critical requirements
- Cost display for missing tools
- Estimated total cost summary

### Data Operations

**Loading**:
```typescript
const [userTools, requiredTools] = await Promise.all([
  supabase.from('user_tools').select('*').eq('user_id', user.id),
  supabase.from('project_required_tools')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .order('is_essential', { ascending: false })
]);
```

**Gap Calculation**:
```typescript
const getToolGapStatus = (toolName: string) => {
  const userTool = userTools.find(t => 
    t.name.toLowerCase() === toolName.toLowerCase()
  );
  const requiredTool = requiredTools.find(t => 
    t.name.toLowerCase() === toolName.toLowerCase()
  );

  if (!requiredTool) return null;
  if (!userTool) {
    return requiredTool.is_essential ? 'missing-essential' : 'missing-optional';
  }
  return 'available';
};
```

---

## Feasibility Dashboard

### Component: FeasibilityDashboard

**File**: `src/components/guardrails/reality/FeasibilityDashboard.tsx`

### Purpose

The Feasibility Dashboard aggregates data from Skills Matrix, Tools Matrix, Roadmap items, and Risk analysis to provide a comprehensive project feasibility assessment.

### Data Flow

```
1. Component mounts → loadReport()
2. Calls getRealityCheckReport(masterProjectId)
3. API function orchestrates data fetching and computation
4. Returns ProjectFeasibility object
5. Component renders dashboard cards
```

### Dashboard Cards

#### 1. FeasibilityScoreCard
**File**: `src/components/guardrails/reality/FeasibilityScoreCard.tsx`

**Displays**:
- Overall feasibility score (0-100) as circular progress indicator
- Status badge (Green/Yellow/Red)
- Status description

**Status Thresholds**:
- **Green** (≥70): "Fully Feasible" - Project is ready to start
- **Yellow** (40-69): "Needs Adjustments" - Some adjustments recommended
- **Red** (<40): "Not Realistic Right Now" - Significant gaps exist

**Visual Design**:
- Large circular progress ring
- Color-coded based on status
- Icon indicator (CheckCircle/AlertCircle/XCircle)

#### 2. SkillsCoverageCard
**File**: `src/components/guardrails/reality/SkillsCoverageCard.tsx`

**Displays**:
- Coverage percentage (0-100%)
- Progress bar with color coding (green/yellow/red)
- List of missing skills (top 5)
- Total estimated learning hours for missing skills

**Color Thresholds**:
- Green: ≥70%
- Yellow: 40-69%
- Red: <40%

#### 3. ToolsCoverageCard
**File**: `src/components/guardrails/reality/ToolsCoverageCard.tsx`

**Displays**:
- Coverage percentage (0-100%)
- Progress bar with color coding
- List of missing tools (top 5)
- Essential missing count badge
- Estimated total cost for missing tools

**Highlighting**:
- Essential tools prominently displayed
- Cost summary if missing tools have costs

#### 4. TimeFeasibilityCard
**File**: `src/components/guardrails/reality/TimeFeasibilityCard.tsx`

**Displays**:
- Weekly hours needed vs. available
- Deficit/Surplus indicator
- Estimated project duration (weeks)
- Recommended timeline extension (if deficit)

**Calculation**:
- Based on roadmap items' start/end dates
- Calculates total project days
- Estimates weekly hours needed
- Compares against user's available hours (default: 10/week)

#### 5. RiskPanel
**File**: `src/components/guardrails/reality/RiskPanel.tsx`

**Displays**:
- Overwhelm Index (0-100)
- Blockers count
- Complexity score
- Risk level badge (Low/Medium/High)
- List of warnings

**Risk Factors Analyzed**:
- Too many in-progress tasks (>5)
- Blocked tasks count
- Old blockers (>48 hours)
- Critical missing skills (importance ≥4)
- Essential missing tools
- Total task count (>20 tasks)

#### 6. RecommendationsList
**File**: `src/components/guardrails/reality/RecommendationsList.tsx`

**Displays**:
- Ordered list of actionable recommendations
- Context-aware suggestions

**Recommendation Types**:
- Timeline extension suggestions
- Skill learning priorities
- Tool acquisition requirements
- Budget estimates
- Risk mitigation strategies
- Blocker resolution priorities

---

## Computation Logic

### Core Logic File

**File**: `src/lib/guardrails/realityCheck.ts`

This file contains all the business logic for computing feasibility metrics.

### Functions

#### 1. Skill Coverage Computation

**Function**: `computeSkillCoverage(userSkills, projectSkills)`

**Algorithm**:
1. Create a map of user skills by name (case-insensitive)
2. For each required skill:
   - Look up user skill
   - Calculate weighted score: `proficiency * importance`
   - Track matched skills
   - Identify gaps (proficiency < importance) or missing skills
3. Calculate weighted coverage percentage:
   ```
   totalWeightedScore = Σ(proficiency × importance) for matched skills
   maxWeightedScore = Σ(5 × importance) for all required skills
   coveragePercent = (totalWeightedScore / maxWeightedScore) × 100
   ```

**Output**: `SkillCoverage` object

**Example**:
- User has "JavaScript" at proficiency 3
- Project requires "JavaScript" at importance 4
- Gap identified (3 < 4), but partial credit given (3 × 4 = 12 points)

#### 2. Tool Coverage Computation

**Function**: `computeToolCoverage(userTools, projectTools)`

**Algorithm**:
1. Create a map of user tools by name (case-insensitive)
2. For each required tool:
   - Check if tool exists in user inventory
   - If missing: add to missingTools, track if essential, sum cost
   - If found: add to matchedTools
3. Calculate simple coverage percentage:
   ```
   coveragePercent = (matchedTools.length / projectTools.length) × 100
   ```

**Output**: `ToolCoverage` object

**Note**: Tool coverage is binary (have/don't have), unlike skills which have proficiency levels.

#### 3. Time Feasibility Computation

**Function**: `computeTimeFeasibility(items, userAvailableHoursPerWeek = 10)`

**Algorithm**:
1. Calculate total project days:
   ```
   For each roadmap item:
     days = max(1, (end_date - start_date) in days)
     totalDays += days
   ```
2. Estimate total hours: `totalDays × 2` (assuming 2 hours/day)
3. Calculate project weeks: `Math.ceil(totalDays / 7)`
4. Calculate weekly hours needed:
   ```
   weeklyHoursNeeded = totalHours / estimatedProjectWeeks
   ```
5. Calculate deficit/surplus:
   ```
   deficitOrSurplus = userAvailableHoursPerWeek - weeklyHoursNeeded
   ```
6. If deficit, recommend timeline extension:
   ```
   additionalHoursNeeded = abs(deficitOrSurplus) × estimatedProjectWeeks
   recommendedTimelineExtensionWeeks = ceil(additionalHoursNeeded / userAvailableHoursPerWeek)
   ```

**Output**: `TimeFeasibility` object

**Note**: Default available hours is 10/week. This could be made configurable per user in the future.

#### 4. Risk Analysis Computation

**Function**: `computeRiskAnalysis(items, skillCoverage, toolCoverage)`

**Algorithm**:
1. Initialize overwhelm index at 0
2. Analyze task status:
   - In-progress > 5: +20 to index, add warning
   - Blocked count: +10 per blocker, add warning
   - Old blockers (>48h): +15 per old blocker, add warning
3. Analyze skills:
   - Critical missing skills (importance ≥4): +15 per skill, add warning
4. Analyze tools:
   - Essential missing tools: +10 per tool, add warning
5. Analyze project size:
   - Total tasks > 20: +10 to index, add warning
6. Calculate complexity score:
   ```
   complexityScore = skillCoverage.gaps.length × 2 + toolCoverage.missingTools.length
   ```
7. Determine risk level:
   - Low: overwhelmIndex < 30
   - Medium: 30 ≤ overwhelmIndex < 60
   - High: overwhelmIndex ≥ 60

**Output**: `RiskAnalysis` object

#### 5. Project Feasibility Computation

**Function**: `computeProjectFeasibility(userId, skillCoverage, toolCoverage, timeFeasibility, riskAnalysis)`

**Algorithm**:
1. Calculate time feasibility score (0-100):
   ```
   If deficitOrSurplus < 0:
     deficitPercent = abs(deficitOrSurplus) / weeklyHoursAvailable
     timeFeasibilityScore = max(0, 100 - deficitPercent × 100)
   Else:
     timeFeasibilityScore = 100
   ```
2. Calculate risk penalty score:
   ```
   riskPenaltyScore = max(0, 100 - overwhelmIndex)
   ```
3. Calculate overall feasibility score (weighted average):
   ```
   feasibilityScore = 
     skillCoverage.coveragePercent × 0.35 +
     toolCoverage.coveragePercent × 0.25 +
     timeFeasibilityScore × 0.20 +
     riskPenaltyScore × 0.20
   ```
4. Determine status:
   - Green: ≥70
   - Yellow: 40-69
   - Red: <40
5. Generate recommendations:
   - Timeline extension (if deficit)
   - Top 3 skill gaps (if coverage < 70%)
   - Essential tools needed
   - Budget for missing tools
   - High risk warnings
   - Blocker resolutions

**Output**: `ProjectFeasibility` object

**Weight Distribution**:
- Skills: 35% (highest priority - core capability)
- Tools: 25% (important but acquirable)
- Time: 20% (manageable with adjustments)
- Risk: 20% (mitigatable with planning)

### API Integration

**Function**: `getRealityCheckReport(masterProjectId)`

**File**: `src/lib/guardrails.ts`

**Orchestration**:
```typescript
1. Get current user
2. Fetch user skills and project required skills (parallel)
3. Fetch user tools and project required tools (parallel)
4. Fetch roadmap sections and items
5. Compute skill coverage
6. Compute tool coverage
7. Compute time feasibility
8. Compute risk analysis
9. Compute project feasibility (aggregates all above)
10. Return ProjectFeasibility object
```

---

## Integration Points

### 1. Routing

**Route Definition** (in `src/App.tsx`):
```typescript
<Route
  path="/guardrails/projects/:masterProjectId/reality"
  element={
    <AuthGuard>
      <GuardrailsLayout>
        <ProjectRealityCheckPage />
      </GuardrailsLayout>
    </AuthGuard>
  }
/>
```

**Navigation**:
- Accessible from Guardrails navigation menu
- Requires active project context
- Project ID passed via URL parameter

### 2. Project Context

**Dependencies**:
- `master_projects` table (project ownership)
- `roadmap_sections` and `roadmap_items` (for time feasibility)
- Active project context from `ActiveDataContext`

### 3. Skills System Integration

**Shared Tables**:
- `user_skills`: Canonical source shared with Personal Development skills view
- The Skills Matrix uses the unified skills system, ensuring consistency across the application

**Note**: Skills entered in Reality Check are available system-wide, and vice versa.

### 4. Roadmap Integration

**Data Source**: Roadmap items from `roadmap_sections` and `roadmap_items` tables

**Usage**:
- Time feasibility calculations
- Risk analysis (task status, blockers)
- Project duration estimation

### 5. User Preferences (Future Enhancement)

**Potential Integration**:
- Customizable available hours per week
- User-defined risk thresholds
- Personal skill categories
- Tool categorization preferences

### 6. Permissions

**Row-Level Security (RLS)**:
- Users can only view/edit their own skills and tools
- Users can manage required skills/tools for their own projects
- All tables have RLS policies enabled

**Policy Examples**:
```sql
-- Users can view their own skills
CREATE POLICY "Users can view their own skills"
  ON user_skills FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can manage required skills for their projects
CREATE POLICY "Users can view required skills for their projects"
  ON project_required_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = project_required_skills.master_project_id
      AND mp.user_id = auth.uid()
    )
  );
```

---

## Future Enhancements

### Potential Improvements

1. **Dynamic Available Hours**: Allow users to set their available hours per week
2. **Skill Learning Plans**: Integration with learning resources/timelines
3. **Tool Marketplace Integration**: Links to acquire missing tools
4. **Historical Tracking**: Track feasibility score changes over time
5. **Team Feasibility**: Multi-user feasibility assessment for shared projects
6. **Confidence Intervals**: Statistical ranges for estimates
7. **What-If Scenarios**: Simulate feasibility with different inputs
8. **Export Reports**: PDF/CSV export of feasibility reports
9. **Notifications**: Alerts when feasibility score changes significantly
10. **AI Recommendations**: Intelligent suggestions for improving feasibility

---

## Summary

The Reality Check system provides a comprehensive, data-driven approach to project feasibility assessment. By integrating skills, tools, time, and risk analysis into a single cohesive view, it helps users make informed decisions about project readiness and resource planning.

The architecture is modular, with clear separation between data access, business logic, and presentation layers. The computation logic is transparent and explainable, allowing users to understand how their feasibility score is calculated and what actions they can take to improve it.

The system is designed to be extensible, with opportunities for future enhancements while maintaining backward compatibility with the existing skills and tools data model.



