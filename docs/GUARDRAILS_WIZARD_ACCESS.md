# Guardrails Wizard Access Documentation

## Overview

The Project Setup Wizard is a guided, multi-step interface that helps users configure their Master Projects with tracks, subtracks, and templates. The wizard is **optional** and can be **accessed at any time** for projects that haven't completed it yet. Each project tracks its own wizard completion state independently.

## Core Principles

1. **Optional Setup**: Users can skip the wizard during initial project creation
2. **Per-Project State**: Each project tracks wizard completion independently
3. **One-Time Completion**: Wizard can only be completed once per project
4. **Post-Creation Access**: Users can launch wizard anytime before completion
5. **URL-Based Access**: Direct links to wizard for specific projects via `?project=` parameter

## Architecture

### Database Schema

**Table**: `guardrails_master_projects`

**New Column**:
```sql
wizard_completed boolean NOT NULL DEFAULT false
```

**Purpose**:
- Tracks whether project has completed the setup wizard
- Defaults to `false` for new projects
- Set to `true` after wizard completion
- Used to control wizard button visibility

**Migration**:
```sql
ALTER TABLE guardrails_master_projects
ADD COLUMN wizard_completed boolean NOT NULL DEFAULT false;

CREATE INDEX idx_master_projects_wizard_completed
ON guardrails_master_projects(wizard_completed);
```

### TypeScript Types

**MasterProject Interface** (`src/lib/guardrailsTypes.ts`):
```typescript
export interface MasterProject {
  id: string;
  user_id: string;
  domain_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  is_archived: boolean;
  archived_at: string | null;
  completed_at: string | null;
  abandonment_reason: string | null;
  wizard_completed: boolean;  // NEW FIELD
  created_at: string;
  updated_at: string;
}
```

**Wizard State** (`src/contexts/ProjectWizardContext.tsx`):
```typescript
export interface WizardState {
  currentStep: number;
  existingProjectId: string | null;  // NEW FIELD
  domainId: string | null;
  domainType: DomainType | null;
  projectName: string;
  projectDescription: string;
  useDefaultTemplates: boolean;
  selectedSystemTemplateIds: string[];
  selectedUserTemplateIds: string[];
  generateInitialRoadmap: boolean;
  availableTemplates: AnyTrackTemplate[];
}
```

## User Flows

### Flow 1: Initial Project Creation (First Time User)

**Scenario**: Brand new user creating their first project

1. User navigates to `/guardrails` for the first time
2. No projects exist → Dashboard shows wizard prompt
3. User clicks "Start Project Wizard"
4. Navigate to `/guardrails/wizard`
5. User completes wizard steps:
   - Step 1: Select Domain (Work, Personal, Creative, Health)
   - Step 2: Choose Templates (default or custom)
   - Step 3: Enter Project Details (name, description)
   - Step 4: Review & Confirm
6. User clicks "Create Project"
7. **System Actions**:
   - Creates new Master Project
   - Sets `wizard_completed = true`
   - Applies selected templates
   - Creates tracks and subtracks
   - Sets project as active
8. User redirected to `/guardrails/dashboard`
9. Can immediately access all Guardrails features

### Flow 2: Project Creation with Wizard Skip

**Scenario**: User wants to create project quickly without wizard

1. User creates project manually via dashboard
2. Project created with `wizard_completed = false`
3. Project appears in dashboard
4. **Project card shows "Complete Setup Wizard" button** (gradient blue/purple)
5. User can work with project immediately, but wizard remains available
6. User clicks "Complete Setup Wizard" when ready
7. Navigates to `/guardrails/wizard?project=<project_id>`
8. Wizard loads existing project data
9. User selects tracks/templates to add
10. On completion:
    - Selected tracks added to project
    - Sets `wizard_completed = true`
    - "Complete Setup Wizard" button disappears

### Flow 3: Re-Accessing Wizard for Incomplete Project

**Scenario**: User started project without wizard, wants to complete setup later

1. User has active project with `wizard_completed = false`
2. Views project card on dashboard
3. Sees prominent "Complete Setup Wizard" button
4. Clicks button
5. Navigates to `/guardrails/wizard?project=<project_id>`
6. Wizard pre-populates with project details:
   - Domain pre-selected (read-only/auto-filled)
   - Project name pre-filled (read-only/auto-filled)
   - Project description pre-filled (read-only/auto-filled)
7. User proceeds through template selection
8. User reviews and confirms
9. System adds selected tracks to existing project
10. Sets `wizard_completed = true`
11. Returns to dashboard
12. "Complete Setup Wizard" button no longer visible

### Flow 4: Direct URL Access

**Scenario**: Deep-linking to wizard for specific project

**URL Pattern**:
```
/guardrails/wizard?project=<project_id>
```

**Behavior**:
1. User accesses URL with `project` parameter
2. Wizard checks if project exists and belongs to user
3. If valid:
   - Loads project data
   - Sets `existingProjectId` in wizard state
   - Pre-populates domain and project details
   - Starts at step 1 (domain pre-selected, can't change)
4. If invalid:
   - Shows error message
   - Redirects to dashboard after delay
5. User proceeds through wizard
6. On completion, tracks added to existing project

## UI Components

### ProjectCard Component

**File**: `src/components/guardrails/dashboard/ProjectCard.tsx`

**Wizard Button Display Logic**:
```typescript
{project.status === 'active' && (
  <div className="space-y-2">
    {!project.wizard_completed && (
      <button
        onClick={handleLaunchWizard}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-sm font-semibold shadow-md"
      >
        <Wand2 size={16} />
        Complete Setup Wizard
      </button>
    )}

    <div className="flex gap-2">
      <button onClick={() => onOpenRoadmap(project.id)}>Roadmap</button>
      <button onClick={() => onOpenMindMesh(project.id)}>Mesh</button>
      <button onClick={() => onOpenTaskFlow(project.id)}>Tasks</button>
    </div>
  </div>
)}
```

**Visual Characteristics**:
- **Gradient Background**: Blue to purple gradient for eye-catching appearance
- **Icon**: Magic wand (`Wand2`) suggesting setup/configuration
- **Full Width**: Button spans entire card width
- **Positioned Above**: Action buttons placed above Roadmap/Mesh/Tasks buttons
- **Only for Active Projects**: Wizard button only shown for projects with status='active'
- **Conditional Display**: Hidden once `wizard_completed = true`

**Click Handler**:
```typescript
function handleLaunchWizard() {
  navigate(`/guardrails/wizard?project=${project.id}`);
}
```

### ProjectWizard Component

**File**: `src/components/guardrails/wizard/ProjectWizard.tsx`

**URL Parameter Handling**:
```typescript
useEffect(() => {
  async function loadExistingProject() {
    const projectId = searchParams.get('project');

    if (projectId) {
      try {
        const project = await getMasterProjectById(projectId);
        if (project) {
          const domains = await getDomains();
          const projectDomain = domains.find(d => d.id === project.domain_id);

          if (projectDomain) {
            setExistingProjectId(projectId);
            setDomain(project.domain_id, projectDomain.name as DomainType);
            setProjectName(project.name);
            setProjectDescription(project.description || '');
          }
        }
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project');
      }
    }

    setLoading(false);
  }

  loadExistingProject();
}, [searchParams, setExistingProjectId, setDomain, setProjectName, setProjectDescription]);
```

**Conditional Header Text**:
```typescript
const isExistingProject = !!state.existingProjectId;

<h1 className="text-2xl font-bold text-gray-900">
  {isExistingProject ? 'Complete Project Setup' : 'Create Your First Project'}
</h1>
<p className="text-gray-600 mt-1">
  {isExistingProject
    ? 'Add tracks and subtracks to your project'
    : 'Set up a structured project with tracks and subtracks'}
</p>
```

**Completion Handler**:
```typescript
const handleCreateProject = async () => {
  if (!state.domainId || !state.domainType) {
    setError('Domain information is missing');
    return;
  }

  setIsCreating(true);
  setError(null);

  try {
    if (state.existingProjectId) {
      // EXISTING PROJECT PATH
      await addTracksToProject({
        project_id: state.existingProjectId,
        domain_type: state.domainType,
        use_default_templates: state.useDefaultTemplates,
        selected_system_template_ids: state.selectedSystemTemplateIds,
        selected_user_template_ids: state.selectedUserTemplateIds,
      });

      const updatedProject = await getMasterProjectById(state.existingProjectId);
      if (updatedProject) {
        setActiveProject(updatedProject);
      }

      resetWizard();
      navigate(`/guardrails/dashboard`);
    } else {
      // NEW PROJECT PATH
      const result = await createProjectWithWizard({
        domain_id: state.domainId,
        domain_type: state.domainType,
        name: state.projectName,
        description: state.projectDescription || undefined,
        use_default_templates: state.useDefaultTemplates,
        selected_system_template_ids: state.selectedSystemTemplateIds,
        selected_user_template_ids: state.selectedUserTemplateIds,
        generate_initial_roadmap: state.generateInitialRoadmap,
      });

      await markWizardCompleted();
      setActiveProject(result.project);
      resetWizard();
      navigate(`/guardrails/dashboard`);
    }
  } catch (err: any) {
    console.error('Failed to complete wizard:', err);
    setError(err.message || 'Failed to complete wizard. Please try again.');
    setIsCreating(false);
  }
};
```

## API Functions

### addTracksToProject

**File**: `src/lib/guardrails/wizard.ts`

**Signature**:
```typescript
export async function addTracksToProject(input: {
  project_id: string;
  domain_type: DomainType;
  use_default_templates?: boolean;
  selected_system_template_ids?: string[];
  selected_user_template_ids?: string[];
}): Promise<{
  tracks: Track[];
  subtracks: SubTrack[];
  applied_templates: AnyTrackTemplate[];
}>;
```

**Purpose**: Adds tracks and subtracks to an existing project

**Process**:
1. Resolves templates based on domain type and selections
2. Creates tracks from system templates
3. Creates tracks from user templates
4. Creates subtracks for each track
5. **Sets `wizard_completed = true`**
6. Returns created tracks, subtracks, and applied templates

**Key Difference from createProjectWithWizard**:
- Does NOT create a new project
- Does NOT set up initial roadmap items
- DOES mark wizard as completed
- Works with existing project ID

**Usage**:
```typescript
const result = await addTracksToProject({
  project_id: 'existing-project-uuid',
  domain_type: 'work',
  use_default_templates: true,
  selected_system_template_ids: ['template-id-1'],
  selected_user_template_ids: [],
});
```

### createProjectWithWizard (Updated)

**File**: `src/lib/guardrails/wizard.ts`

**Enhancement**: Now marks project as wizard completed

```typescript
export async function createProjectWithWizard(
  input: CreateProjectWizardInput
): Promise<ProjectWizardResult> {
  // ... create project ...
  const project = await createMasterProject(domain_id, name, description);

  // NEW: Mark wizard as completed immediately
  await supabase
    .from('guardrails_master_projects')
    .update({ wizard_completed: true })
    .eq('id', project.id);

  // ... continue with track creation ...
}
```

## Wizard Completion Logic

### Setting wizard_completed Flag

**When it happens**:
1. **New project via wizard**: Set in `createProjectWithWizard()`
2. **Existing project via wizard**: Set in `addTracksToProject()`

**Database Update**:
```typescript
await supabase
  .from('guardrails_master_projects')
  .update({ wizard_completed: true })
  .eq('id', project_id);
```

**Effects**:
- Project card wizard button disappears
- Can't re-run wizard for this project
- Tracks and subtracks have been configured
- Project is considered "fully set up"

### Why wizard_completed is Permanent

**Design Decision**: Once wizard completes, tracks are configured

**Reasoning**:
1. **Prevents Confusion**: User completed setup, shouldn't see button again
2. **Tracks Can Be Modified**: User can add/edit tracks manually anytime
3. **Templates Applied**: Initial structure is in place
4. **One-Time Setup**: Wizard is for initial configuration, not ongoing management

**Alternative Approaches** (Not Implemented):
- Reset flag if user deletes all tracks (considered too complex)
- Allow wizard re-run (could cause duplicate tracks)
- Track-level wizard completion (over-engineered for use case)

## Step-by-Step Wizard Flow

### Step 1: Domain Selection

**For New Project**:
- User selects domain: Work, Personal, Creative, or Health
- Domain determines available templates

**For Existing Project**:
- Domain pre-selected from project data
- Cannot change domain (project already assigned)
- Step shown for consistency but read-only

### Step 2: Template Selection

**Options**:
- Use default templates (recommended)
- Select specific system templates
- Select user-created templates
- Combination of above

**Behavior**:
- Templates filtered by domain
- Preview shows track names and subtracks
- User can select multiple templates
- At least one template required (or use defaults)

### Step 3: Project Details

**For New Project**:
- Enter project name (required)
- Enter project description (optional)
- Configure initial roadmap generation

**For Existing Project**:
- Name and description pre-filled (read-only)
- Cannot modify existing project details
- May show current track count
- Step shown for consistency

### Step 4: Review

**Summary Displays**:
- Project name and domain
- Selected templates
- Number of tracks to be created
- Number of subtracks to be created
- Estimated roadmap items (if applicable)

**Final Actions**:
- User confirms selections
- Click "Create Project" (new) or "Add Tracks" (existing)
- Loading state during processing
- Success redirect to dashboard

## Validation & Error Handling

### Project Existence Validation

**Check**: Does project exist and belong to current user?

**Implementation**:
```typescript
const project = await getMasterProjectById(projectId);
if (!project) {
  setError('Project not found or access denied');
  navigate('/guardrails/dashboard');
}
```

**Error States**:
- Project doesn't exist → Redirect to dashboard
- Project belongs to another user → Redirect to dashboard
- Project load fails → Show error message

### Wizard Already Completed

**Current Behavior**: No check implemented

**Recommended Enhancement**:
```typescript
if (project.wizard_completed) {
  setError('Wizard already completed for this project');
  navigate('/guardrails/dashboard');
  return;
}
```

**Reason Not Implemented**: UI hides wizard button when completed, so URL access unlikely

### Template Selection Validation

**Rule**: At least one template required (or use defaults)

**Check**: Performed in `canProceedToNextStep()`

```typescript
case 2:
  return state.useDefaultTemplates ||
         state.selectedSystemTemplateIds.length > 0 ||
         state.selectedUserTemplateIds.length > 0;
```

### Project Name Validation

**Rule**: Name required for new projects

**Check**:
```typescript
case 3:
  return state.projectName.trim().length > 0;
```

**Note**: Skipped for existing projects (name already exists)

## Edge Cases

### Edge Case 1: User Navigates Away Mid-Wizard

**Scenario**: User starts wizard, navigates to another page

**Behavior**:
- Wizard state lost (not persisted)
- Project not created (if new project flow)
- Tracks not added (if existing project flow)
- Can restart wizard cleanly

**No Data Corruption**: Wizard only commits on final step

### Edge Case 2: Wizard Completion Fails

**Scenario**: API error during track creation

**Behavior**:
- Error message displayed
- `wizard_completed` not set
- Partial tracks may exist (database transaction rollback recommended)
- User can retry

**Retry Behavior**:
- Same wizard session can retry
- Or user can exit and restart wizard
- Existing tracks won't be duplicated (template IDs prevent duplication)

### Edge Case 3: Project Deleted While Wizard Open

**Scenario**: Project deleted in another tab/session

**Behavior**:
- Wizard completion fails
- Error: "Project not found"
- User redirected to dashboard

**Prevention**: Not feasible to lock project during wizard

### Edge Case 4: Multiple Users Access Same Project

**Scenario**: Shared workspace, multiple users with access

**Behavior**:
- Each user can access wizard independently
- First to complete sets `wizard_completed = true`
- Second user's wizard shows button initially
- Second user's completion attempt may fail (already completed)

**Recommendation**: Add completion check before processing

### Edge Case 5: Direct URL to Wizard Without Project Param

**Scenario**: User accesses `/guardrails/wizard` directly

**Behavior**:
- `existingProjectId` remains null
- Wizard treats as new project creation
- Normal new-project flow

**This is Expected**: Wizard supports both flows

## Visual Design Patterns

### Wizard Button States

**Default State** (wizard not completed):
```css
background: linear-gradient(to right, #2563eb, #9333ea);
color: white;
padding: 10px 16px;
border-radius: 8px;
font-weight: 600;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
```

**Hover State**:
```css
background: linear-gradient(to right, #1d4ed8, #7e22ce);
```

**Hidden State** (wizard completed):
```css
display: none;
```

### Loading States

**Wizard Loading** (project data fetch):
```tsx
<div className="min-h-screen bg-gray-50 flex items-center justify-center">
  <div className="text-center">
    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
    <p className="text-gray-600">Loading wizard...</p>
  </div>
</div>
```

**Wizard Processing** (creating tracks):
```tsx
<button disabled className="opacity-50 cursor-not-allowed">
  <Loader2 className="animate-spin" />
  {isExistingProject ? 'Adding Tracks...' : 'Creating Project...'}
</button>
```

### Error Messages

**Generic Error**:
```tsx
<div className="bg-red-50 border-b border-red-200 px-6 py-4">
  <div className="flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-600" />
    <div>
      <div className="font-semibold text-red-900">Error completing wizard</div>
      <div className="text-sm text-red-700">{error}</div>
    </div>
  </div>
</div>
```

## Testing Scenarios

### Test 1: New Project Creation

**Steps**:
1. Navigate to `/guardrails/wizard`
2. Select domain
3. Choose templates
4. Enter project name
5. Review and confirm
6. Wait for creation

**Expected**:
- ✓ Project created
- ✓ `wizard_completed = true`
- ✓ Tracks created from templates
- ✓ Wizard button NOT shown on project card
- ✓ Redirect to dashboard

### Test 2: Existing Project Wizard

**Steps**:
1. Create project without wizard
2. Verify `wizard_completed = false`
3. See wizard button on project card
4. Click wizard button
5. Verify URL has `?project=<id>`
6. Verify project data pre-filled
7. Select templates
8. Complete wizard

**Expected**:
- ✓ Navigates to correct URL
- ✓ Project details pre-populated
- ✓ Tracks added to existing project
- ✓ `wizard_completed = true`
- ✓ Wizard button disappears
- ✓ Redirect to dashboard

### Test 3: Direct URL Access

**Steps**:
1. Get project ID from database
2. Navigate to `/guardrails/wizard?project=<id>`
3. Verify wizard loads project
4. Complete wizard

**Expected**:
- ✓ Project data loaded
- ✓ Wizard pre-populated
- ✓ Tracks added
- ✓ Completion successful

### Test 4: Invalid Project ID

**Steps**:
1. Navigate to `/guardrails/wizard?project=invalid-id`
2. Wait for loading

**Expected**:
- ✓ Error message shown
- ✓ Redirect to dashboard after delay
- ✓ No crash or hang

### Test 5: Wizard Button Visibility

**Steps**:
1. Create project with `wizard_completed = false`
2. View project card
3. Verify wizard button visible
4. Complete wizard
5. Return to dashboard
6. View same project card

**Expected**:
- ✓ Wizard button visible before completion
- ✓ Wizard button hidden after completion
- ✓ Other action buttons always visible

## Future Enhancements

### Enhancement 1: Wizard Progress Persistence

**Problem**: User loses progress if they navigate away

**Solution**: Store wizard state in localStorage

**Implementation**:
```typescript
useEffect(() => {
  const savedState = localStorage.getItem('wizard_state');
  if (savedState) {
    setState(JSON.parse(savedState));
  }
}, []);

useEffect(() => {
  localStorage.setItem('wizard_state', JSON.stringify(state));
}, [state]);
```

**Cleanup**: Clear localStorage after completion

### Enhancement 2: Wizard Re-Run Option

**Problem**: User wants to add more tracks via wizard after completion

**Solution**: Add "Add More Tracks" button that re-enables wizard

**Implementation**:
- Don't check `wizard_completed` flag
- Allow wizard access anytime
- Change button text to "Add More Tracks"
- Don't reset `wizard_completed` flag
- Simply add new tracks without changing flag

### Enhancement 3: Template Deduplication

**Problem**: User might select templates already applied

**Solution**: Filter out already-applied templates

**Implementation**:
```typescript
const existingTracks = await getTracksByProjectId(project_id);
const existingTemplateIds = existingTracks.map(t => t.template_id);

const availableTemplates = allTemplates.filter(
  t => !existingTemplateIds.includes(t.id)
);
```

### Enhancement 4: Wizard Skip Confirmation

**Problem**: User accidentally skips wizard during initial creation

**Solution**: Show confirmation dialog

**Implementation**:
```tsx
<ConfirmDialog
  title="Skip Wizard?"
  message="You can complete the setup wizard later from the project card."
  confirmText="Skip for Now"
  cancelText="Continue Wizard"
  onConfirm={handleSkip}
/>
```

## Related Documentation

- [GUARDRAILS_PROJECT_WIZARD.md](./GUARDRAILS_PROJECT_WIZARD.md) - Overall wizard system
- [GUARDRAILS_WIZARD_FRONTEND.md](./GUARDRAILS_WIZARD_FRONTEND.md) - Wizard UI components
- [GUARDRAILS_TRACK_TEMPLATES.md](./GUARDRAILS_TRACK_TEMPLATES.md) - Template system
- [USER_TEMPLATES.md](./USER_TEMPLATES.md) - User-created templates

## Migration Instructions

### For Existing Projects

If you're adding this feature to an existing system with projects:

**Step 1: Apply Migration**
```sql
ALTER TABLE guardrails_master_projects
ADD COLUMN wizard_completed boolean NOT NULL DEFAULT false;

CREATE INDEX idx_master_projects_wizard_completed
ON guardrails_master_projects(wizard_completed);
```

**Step 2: Mark Existing Projects**

Option A: Mark all existing projects as wizard-completed
```sql
UPDATE guardrails_master_projects
SET wizard_completed = true
WHERE created_at < NOW();
```

Option B: Mark only projects with tracks as wizard-completed
```sql
UPDATE guardrails_master_projects mp
SET wizard_completed = true
WHERE EXISTS (
  SELECT 1 FROM guardrails_tracks t
  WHERE t.master_project_id = mp.id
);
```

**Step 3: Deploy Frontend Changes**

Deploy all frontend changes together to prevent UI inconsistencies.

## Support & Troubleshooting

### Problem: Wizard Button Not Appearing

**Diagnosis**:
- Check `wizard_completed` value in database
- Verify project status is 'active'
- Check ProjectCard component rendering

**Solution**:
```sql
SELECT id, name, status, wizard_completed
FROM guardrails_master_projects
WHERE user_id = '<user_id>';
```

If `wizard_completed` is true but should be false:
```sql
UPDATE guardrails_master_projects
SET wizard_completed = false
WHERE id = '<project_id>';
```

### Problem: Wizard Loads But Shows Error

**Diagnosis**:
- Check browser console for errors
- Verify project exists and user has access
- Check database connection

**Common Errors**:
- "Project not found" → Project ID invalid or deleted
- "Domain information missing" → Database schema issue
- "Failed to load templates" → Template system error

### Problem: Tracks Created But wizard_completed Still False

**Diagnosis**:
- Database update failed
- Transaction rollback occurred
- Application error during update

**Solution**:
```sql
-- Manually mark as completed
UPDATE guardrails_master_projects
SET wizard_completed = true
WHERE id = '<project_id>';
```

**Prevention**: Wrap wizard completion in transaction

### Problem: Multiple Wizard Completions Created Duplicate Tracks

**Diagnosis**:
- Race condition (multiple users)
- Template deduplication not working
- Wizard accessed multiple times before completion

**Solution**:
```sql
-- Find duplicate tracks
SELECT master_project_id, name, COUNT(*)
FROM guardrails_tracks
GROUP BY master_project_id, name
HAVING COUNT(*) > 1;

-- Remove duplicates (keep oldest)
DELETE FROM guardrails_tracks
WHERE id NOT IN (
  SELECT MIN(id)
  FROM guardrails_tracks
  GROUP BY master_project_id, name
);
```

**Prevention**: Add unique constraint or implement deduplication check
