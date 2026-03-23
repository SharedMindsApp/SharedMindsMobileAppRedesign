# Guardrails Project Wizard - Frontend Documentation

## Overview

The Guardrails Project Wizard is a multi-step, guided UI that helps users create their first Master Project with a complete track structure. It provides an intuitive, opinionated flow that reduces complexity while maintaining flexibility through template selection.

## Key Features

- **4-Step Guided Flow**: Domain selection → Template selection → Project details → Review
- **Run Once Logic**: Automatically shows for first-time users, can be skipped
- **Skip Recovery**: Users who skip can access wizard later via dashboard prompt
- **Visual Progress**: Step indicator shows current position and completed steps
- **Template Preview**: Users can see and customize track structure before creation
- **Validation**: Each step validates before allowing progression
- **Error Handling**: Clear error messages for API failures
- **Responsive Design**: Works on all screen sizes

## Architecture

### Component Hierarchy

```
ProjectWizard (Container)
├── ProjectWizardProvider (Context)
│   └── ProjectWizardContent
│       ├── WizardProgress (Step indicator)
│       ├── Step Components (conditional render)
│       │   ├── WizardStepDomainSelect
│       │   ├── WizardStepTemplateSelect
│       │   ├── WizardStepProjectDetails
│       │   └── WizardStepReview
│       └── WizardFooter (Navigation)
```

### State Management

The wizard uses React Context (`ProjectWizardContext`) to manage state across all steps:

```typescript
interface WizardState {
  currentStep: number;
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

## Step-by-Step Flow

### Step 1: Domain Selection

**Component**: `WizardStepDomainSelect.tsx`

**Purpose**: User chooses which domain (Work, Personal, Passion, Startup) the project belongs to.

**UI Elements**:
- Four large, colorful cards representing each domain
- Each card shows:
  - Domain icon
  - Name and description
  - Example use cases
- Selected card is highlighted with checkmark
- Info banner explains one-project-per-domain rule

**Validation**:
- User must select exactly one domain
- Next button disabled until selection made

**API Calls**:
- `ensureDomainsExist()` - Creates domains if they don't exist
- `getDomains()` - Fetches user's domains

**State Updates**:
- `setDomain(domainId, domainType)` - Stores selected domain
- Clears any previously selected templates

### Step 2: Template Selection

**Component**: `WizardStepTemplateSelect.tsx`

**Purpose**: User chooses which track templates to apply to the project.

**UI Elements**:
- Toggle for "Use Default Templates" (enabled by default)
- Three sections:
  1. **Default Templates** (if toggle is on) - Green badges, auto-included
  2. **Additional System Templates** - Checkboxes for optional templates
  3. **Your Custom Templates** - User-created templates with purple badges
- Each template shows:
  - Name and description
  - Number of subtracks
  - Selection state
- Summary footer shows total tracks and subtracks selected

**Validation**:
- Must have at least one template selected (defaults enabled OR custom selection)
- Next button disabled if no templates selected

**API Calls**:
- `getTemplatesForDomain(domainType)` - Fetches all available templates

**State Updates**:
- `setUseDefaultTemplates(boolean)` - Toggles defaults
- `setSelectedSystemTemplateIds(ids[])` - Stores system template selections
- `setSelectedUserTemplateIds(ids[])` - Stores user template selections
- `setAvailableTemplates(templates[])` - Caches templates for review

**Template Organization**:
- Templates are filtered by domain type
- Default templates appear first
- System templates are alphabetically sorted
- User templates show with purple badge

### Step 3: Project Details

**Component**: `WizardStepProjectDetails.tsx`

**Purpose**: User enters project name, description, and roadmap preferences.

**UI Elements**:
- Text input for project name (required, autofocus)
- Textarea for description (optional)
- Checkbox for "Generate Initial Roadmap Preview"
- Pro tips card with naming suggestions
- Visual feedback for required fields

**Validation**:
- Project name must not be empty
- Description is optional
- Next button disabled if name is blank

**State Updates**:
- `setProjectName(string)` - Stores project name
- `setProjectDescription(string)` - Stores description
- `setGenerateInitialRoadmap(boolean)` - Stores roadmap preference

**Best Practices Shown**:
- Include timeframes in name
- Be specific about outcomes
- Keep under 50 characters

### Step 4: Review & Create

**Component**: `WizardStepReview.tsx`

**Purpose**: User reviews all selections before creating project.

**UI Elements**:
- **Project Information Card**:
  - Domain with icon
  - Project name (bold)
  - Description (if provided)
- **Project Structure Card**:
  - All selected tracks (expandable)
  - Subtrack count per track
  - Badges for default/custom templates
  - Click to expand and see all subtracks
- **Roadmap Preview Card** (conditional):
  - Shows if roadmap generation is enabled
  - Explains what will be created
- **What Happens Next Card**:
  - Step-by-step explanation of creation process
  - Sets expectations for redirect

**Actions**:
- Back button: Return to previous step
- Create Project button: Triggers API call and project creation

**API Call**:
```typescript
await createProjectWithWizard({
  domain_id,
  domain_type,
  name,
  description,
  use_default_templates,
  selected_system_template_ids,
  selected_user_template_ids,
  generate_initial_roadmap,
});
```

**On Success**:
1. Calls `markWizardCompleted()` to set flag
2. Resets wizard state
3. Redirects to `/guardrails/dashboard`

**On Error**:
- Displays error banner at top
- Keeps user on review step
- Shows specific error message
- Allows retry

## Navigation Components

### WizardProgress

**File**: `WizardProgress.tsx`

Visual step indicator at top of wizard.

**Features**:
- Shows all 4 steps horizontally
- Current step highlighted in blue
- Completed steps show green with checkmark
- Future steps grayed out
- Connecting lines show progress
- Step labels below circles

**States**:
- Completed: Green background, white checkmark
- Current: Blue background, step number
- Future: Gray background, step number

### WizardFooter

**File**: `WizardFooter.tsx`

Fixed navigation bar at bottom of screen.

**Features**:
- Back button (left): Returns to previous step
- Skip button (center): Allows skipping wizard (marks as skipped)
- Next/Create button (right): Advances or creates project

**Button States**:
- Back: Hidden on step 1, enabled on steps 2-4
- Skip: Hidden on final step
- Next: Disabled when step is invalid
- Create: Shows on final step, disabled during creation

**Loading State**:
- Shows spinner during project creation
- Disables all buttons
- Changes text to "Creating..."

## Run Once / Skip Logic

### Database Tracking

The wizard uses three profile fields:

```sql
has_completed_guardrails_wizard boolean DEFAULT false
guardrails_wizard_skipped boolean DEFAULT false
guardrails_wizard_completed_at timestamptz
```

### Flow Logic

**First Visit to `/guardrails`**:
1. Check if user has any projects
2. If no projects:
   - Check `checkWizardStatus()`
   - If `!hasCompleted && !hasSkipped`: Redirect to `/guardrails/wizard`
   - If `hasSkipped`: Show wizard prompt banner

**On Wizard Completion**:
1. Call `markWizardCompleted()`
2. Sets `has_completed_guardrails_wizard = true`
3. Sets `guardrails_wizard_completed_at = now()`
4. Prevents wizard from showing automatically again

**On Wizard Skip**:
1. Call `markWizardSkipped()`
2. Sets `has_completed_guardrails_wizard = true`
3. Sets `guardrails_wizard_skipped = true`
4. Shows recovery prompt in dashboard

### Recovery for Skipped Users

When user has skipped but has no projects, dashboard shows:

```tsx
<div className="wizard-prompt-banner">
  <h3>Ready to Create Your First Project?</h3>
  <p>Use our guided wizard...</p>
  <button onClick={navigateToWizard}>
    Start Project Wizard
  </button>
</div>
```

User can:
- Click "Start Project Wizard" to access wizard
- Dismiss banner permanently
- Use regular project creation modal instead

Once user completes wizard or creates project another way, banner never shows again.

## Routing

### Routes

```typescript
/guardrails/wizard        // Wizard UI
/guardrails              // Dashboard (checks wizard status)
/guardrails/dashboard    // Dashboard (checks wizard status)
```

### Guard Logic

```typescript
// In GuardrailsDashboard component
if (projects.length === 0) {
  const status = await checkWizardStatus();
  if (!status.hasCompleted) {
    navigate('/guardrails/wizard');
    return;
  }
}
```

No explicit guard on `/guardrails/wizard` - users can access anytime if needed.

## Helper Functions

### `checkWizardStatus()`

**File**: `src/lib/guardrails/wizardHelpers.ts`

Returns wizard completion status:

```typescript
{
  hasCompleted: boolean;
  hasSkipped: boolean;
  completedAt: string | null;
}
```

### `markWizardCompleted()`

**File**: `src/lib/guardrails/wizardHelpers.ts`

Marks wizard as completed in database.

### `markWizardSkipped()`

**File**: `src/lib/guardrails/wizardHelpers.ts`

Marks wizard as skipped in database.

### `shouldShowWizard()`

**File**: `src/lib/guardrails/wizardHelpers.ts`

Helper to determine if wizard should auto-show:

```typescript
return !status.hasCompleted && !status.hasSkipped;
```

## Styling Guidelines

### Color Scheme

**Domain Colors**:
- Work: Blue (`blue-600`, `blue-100`)
- Personal: Green (`green-600`, `green-100`)
- Passion: Orange (`orange-600`, `orange-100`)
- Startup: Purple (`purple-600`, `purple-100`)

**UI States**:
- Selected: Border color matches domain
- Hover: Lighter background shade
- Disabled: Gray with reduced opacity
- Loading: Blue with spinner animation

### Layout

- Max width: `max-w-3xl` for content, `max-w-4xl` for wide content
- Spacing: Consistent `gap-4`, `gap-6`, `gap-8`
- Cards: `rounded-xl` with `border-2`
- Buttons: `rounded-lg` with hover states
- Fixed footer: `fixed bottom-0` with shadow

### Typography

- Headers: `text-3xl font-bold`
- Subheaders: `text-lg text-gray-600`
- Body: `text-base text-gray-900`
- Labels: `text-sm font-semibold`
- Help text: `text-sm text-gray-500`

## Error Handling

### Validation Errors

Shown inline at field level:
- Red text under invalid fields
- Disabled next button
- Clear messaging about requirements

### API Errors

Shown in banner at top:
- Red background with icon
- Error title and message
- Persists until dismissed or retry succeeds

### Network Errors

Loading states prevent confusion:
- Spinners during data fetching
- Disabled buttons during creation
- Timeout handling (inherited from API layer)

## Testing Scenarios

### Happy Path

1. New user visits `/guardrails`
2. Auto-redirected to `/guardrails/wizard`
3. Selects domain
4. Keeps default templates
5. Enters project name
6. Reviews and creates
7. Redirected to dashboard with new project

### Skip Flow

1. User clicks "Skip for now" on any step
2. `markWizardSkipped()` called
3. Redirected to `/guardrails/dashboard`
4. Banner shows "Ready to Create Your First Project?"
5. Can click to restart wizard or dismiss

### Error Recovery

1. User completes all steps
2. API error during creation
3. Error banner shows specific message
4. User remains on review step
5. Can go back and modify or retry
6. Wizard state preserved

### Multi-Domain Creation

1. User creates project in "Work" domain
2. Returns to dashboard
3. No wizard prompt (has completed)
4. Can manually create projects in other domains

## Performance Considerations

### Data Fetching

- Templates fetched once per domain selection
- Cached in wizard state
- Not refetched when returning to step

### Bundle Size

- Wizard code split from main app
- Only loaded when route accessed
- Context provider wraps only wizard pages

### Rendering Optimization

- Step components only render when active
- No unnecessary re-renders during navigation
- Form state managed efficiently

## Accessibility

### Keyboard Navigation

- Tab order flows logically through steps
- Enter key submits on final step
- Escape key dismisses skip/error dialogs
- Focus management between steps

### Screen Readers

- ARIA labels on all interactive elements
- Step progress announced
- Error messages associated with fields
- Button states clearly communicated

### Visual Indicators

- High contrast for selected states
- Not relying on color alone
- Clear focus indicators
- Loading states visible

## Future Enhancements

Potential improvements:

1. **Template Search**: Filter templates by keyword
2. **Template Preview**: Hover preview of subtrack structure
3. **Project Duplication**: Start from existing project
4. **Wizard Progress Save**: Resume if interrupted
5. **Wizard Customization**: Skip steps for advanced users
6. **Onboarding Tooltips**: Guide first-time users
7. **Analytics**: Track wizard completion rate
8. **A/B Testing**: Optimize conversion rate
9. **Mobile Optimization**: Dedicated mobile flow
10. **Wizard History**: Track all created projects

## Related Documentation

- [GUARDRAILS_PROJECT_WIZARD.md](./GUARDRAILS_PROJECT_WIZARD.md) - Backend API documentation
- [USER_TEMPLATES.md](./USER_TEMPLATES.md) - User template system
- [GUARDRAILS_TRACK_TEMPLATES.md](./GUARDRAILS_TRACK_TEMPLATES.md) - System templates

## Troubleshooting

### Wizard Not Showing

**Problem**: Dashboard shows but wizard doesn't redirect

**Solutions**:
- Check if user has existing projects (wizard only for first project)
- Verify `has_completed_guardrails_wizard` is false in database
- Check browser console for errors in `checkWizardStatus()`

### Templates Not Loading

**Problem**: Step 2 shows empty or spinning

**Solutions**:
- Verify domain type is set from step 1
- Check network tab for failed API calls
- Ensure `getTemplatesForDomain()` returns data
- Check domain type matches available templates

### Creation Fails Silently

**Problem**: Create button clicked but nothing happens

**Solutions**:
- Check browser console for errors
- Verify all required wizard state is populated
- Check API error response in network tab
- Ensure user is authenticated

### Wizard State Lost

**Problem**: Returning to step loses previous selections

**Solutions**:
- Verify context provider wraps all wizard components
- Check that state updates are synchronous
- Ensure no unmounting/remounting of provider

## Support

For issues with the wizard:

1. Check browser console for errors
2. Verify wizard status in database
3. Test each step's validation independently
4. Review API call responses in network tab
5. Check this documentation for expected behavior
