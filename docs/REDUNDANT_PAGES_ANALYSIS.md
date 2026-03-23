# Redundant & Duplicate Pages Analysis

Based on the current application architecture, here are pages that appear redundant, duplicate, or potentially obsolete:

## 🔴 **HIGH PRIORITY - Clear Duplicates to Remove**

### 1. **Household Dashboard** (`/household`) ✅ Already Identified
- **File**: `src/components/HouseholdDashboardPage.tsx`
- **Reason**: Superseded by Planner Household section (`/planner/household`)
- **Impact**: 13 navigation references need updating
- **Recommendation**: **DELETE** - redirect to `/planner/household`

### 2. **Dashboard** (`/dashboard`)
- **File**: `src/components/Dashboard.tsx`
- **What it is**: Original questionnaire/assessment dashboard from initial app
- **Superseded by**:
  - `/planner` - Main planning hub
  - `/guardrails` - Professional work hub
  - `/insights/:householdId` - Insights & reports
- **Still referenced**: Home route redirects here, Layout navigation
- **Recommendation**: **CONSIDER REMOVING** or rename to `/assessment` if questionnaire is still needed
- **Question**: Is the original assessment questionnaire still used?

### 3. **GuardrailsPage** (`/guardrails-old`)
- **File**: `src/components/GuardrailsPage.tsx` (imported but not used in routes)
- **Reason**: Appears to be legacy version before `GuardrailsLayout` + `GuardrailsDashboard`
- **Current**: `/guardrails` uses `GuardrailsLayout` + `GuardrailsDashboard`
- **Recommendation**: **DELETE FILE** - Not in routes, likely dead code

### 4. **Duplicate Guardrails Routes**
- **Routes**:
  - `/guardrails` → `GuardrailsDashboard`
  - `/guardrails/dashboard` → `GuardrailsDashboard` (same component)
- **Recommendation**: **REMOVE** `/guardrails/dashboard` route (redundant)

### 5. **Side Projects Duplication**
- **Routes**:
  - `/guardrails/side-projects` (global list)
  - `/guardrails/projects/:masterProjectId/side-projects` (project-specific)
- **Files**:
  - `src/components/SideProjectsPage.tsx` (global?)
  - `src/components/guardrails/GuardrailsSideProjects.tsx` (appears unused in routes)
- **Recommendation**: **VERIFY USAGE** - May have duplicate/unused code

### 6. **Offshoot Ideas Duplication**
- **Files**:
  - `src/components/OffshootIdeasListPage.tsx` (not in routes)
  - `src/components/OffshootIdeaDetailPage.tsx` (not in routes)
  - `src/components/guardrails/GuardrailsOffshoots.tsx` (in routes as `/guardrails/offshoots`)
  - `src/components/guardrails/offshoots/OffshootIdeaDetail.tsx` (in routes as `/guardrails/offshoots/:id`)
- **Recommendation**: **DELETE** the `src/components/Offshoot*.tsx` files (duplicates, not in routes)

## 🟡 **MEDIUM PRIORITY - Potential Consolidation**

### 7. **Multiple Calendar Views**
- **Routes**:
  - `/calendar` → `CalendarPageWrapper` (household calendar)
  - `/calendar/personal` → `PersonalCalendarPage` (personal calendar)
  - `/planner/household/calendar` → Household calendar in planner context
- **Recommendation**: **CONSOLIDATE** - Consider unified calendar with tabs/filters instead of 3 separate pages

### 8. **Journey & Profile Duplication**
- **Routes**:
  - `/journey` → `InsightJourney`
  - `/journey/individual-profile` → `IndividualProfileFlow`
  - `/brain-profile/onboarding` → `BrainProfileOnboarding`
  - `/brain-profile/cards` → `BrainProfileCards`
- **Recommendation**: **VERIFY USAGE** - Are these all still active flows or legacy onboarding?

### 9. **Interventions → Regulation Redirects** (Already Handled)
- **Routes**: All `/interventions/*` redirect to `/regulation/*`
- **Status**: ✅ Properly redirected
- **Recommendation**: **KEEP REDIRECTS** for backward compatibility (users may have bookmarks)

### 10. **Settings Pages Fragmentation**
- **Routes**:
  - `/settings` → Main settings
  - `/settings/members` → Manage members
  - `/settings/household-access` → Household access
  - `/settings/professional-access` → Professional access
  - `/settings/ui-preferences` → UI prefs
  - `/settings/meal-preferences` → Meal prefs
- **Recommendation**: **KEEP** - This is appropriate settings structure (not duplicate)

## 🟢 **LOW PRIORITY - Review Later**

### 11. **Mobile Mode Container** (`/mobile`)
- **File**: `src/components/mobile/MobileModeContainer.tsx`
- **Question**: Is this still used or was it experimental?
- **Recommendation**: **VERIFY USAGE** - If unused, consider removing

### 12. **How It Works** (`/how-it-works`)
- **File**: `src/components/HowItWorks.tsx`
- **Question**: Is this still relevant marketing page?
- **Recommendation**: **KEEP** unless marketing is no longer needed

### 13. **Professional Onboarding/Dashboard**
- **Routes**:
  - `/professional/onboarding`
  - `/professional/dashboard`
  - `/professional/households/:householdId`
  - `/professional/request-access`
- **Question**: Is professional access feature still active?
- **Recommendation**: **VERIFY USAGE** - If not used, consider removing entire professional module

### 14. **Behavioral Insights** (`/behavioral-insights`)
- **File**: `src/components/behavioral-insights/BehavioralInsightsDashboard.tsx`
- **Question**: Is this separate from regular Insights Dashboard?
- **Recommendation**: **VERIFY USAGE** - May be duplicate of `/insights/:householdId`

## 📊 **Summary of Recommendations**

### **Definitely Remove** (High Confidence):
1. ✅ `/household` route + `HouseholdDashboardPage.tsx` + `HouseholdDashboard.tsx` + 10 section files
2. ✅ `src/components/GuardrailsPage.tsx` (dead code, not in routes)
3. ✅ `/guardrails/dashboard` route (duplicate of `/guardrails`)
4. ✅ `src/components/OffshootIdeasListPage.tsx` (not in routes)
5. ✅ `src/components/OffshootIdeaDetailPage.tsx` (not in routes)
6. ✅ `src/components/SideProjectsPage.tsx` (verify not used, then delete)

**Estimated Cleanup**: ~15-20 files

### **Need Your Input** (Questions):
1. **Dashboard** (`/dashboard` - `Dashboard.tsx`): Is the original assessment questionnaire still needed?
2. **Mobile Mode** (`/mobile`): Still used or experimental?
3. **Professional Module**: Still active feature or can it be removed?
4. **Journey/Brain Profile**: Are these still active onboarding flows?
5. **Behavioral Insights**: Duplicate of regular insights?

### **Files to Delete Count by Category**:
- Household Dashboard: **12 files** (1 page + 1 dashboard + 10 sections)
- Dead Code: **3 files** (GuardrailsPage, OffshootIdeasListPage, OffshootIdeaDetailPage)
- Possibly Dead: **1 file** (SideProjectsPage)
- **Routes to remove**: 2-3 routes
- **Navigation references to update**: 13 locations

---

## 🎯 **Next Steps - Proposed Cleanup Order**

### Phase 1: Safe Deletions (No Questions Needed)
1. Delete `src/components/GuardrailsPage.tsx`
2. Delete `src/components/OffshootIdeasListPage.tsx`
3. Delete `src/components/OffshootIdeaDetailPage.tsx`
4. Remove `/guardrails/dashboard` route (keep `/guardrails`)

### Phase 2: Household Dashboard Cleanup (After You Confirm Redirect)
1. Decide redirect destination for `/household`
2. Update 13 navigation references
3. Delete HouseholdDashboardPage + HouseholdDashboard + 10 sections
4. Remove route

### Phase 3: Verify & Clean Based on Your Answers
1. Assessment Dashboard (`Dashboard.tsx`)
2. Mobile Mode
3. Professional Module
4. Journey/Brain Profile flows
5. Behavioral Insights

---

## 📝 **Questions for You**

Please answer these to guide the cleanup:

1. **Assessment Dashboard**: Do you still need the original questionnaire/assessment flow at `/dashboard`?
2. **Mobile Mode**: Is `/mobile` still used or was it experimental?
3. **Professional Access**: Is the professional practitioner feature still active?
4. **Journey Flows**: Are `/journey`, `/journey/individual-profile`, and brain profile pages still used?
5. **Behavioral Insights**: Is `/behavioral-insights` different from `/insights/:householdId` or duplicate?

Once you answer these, I can proceed with a comprehensive cleanup!

