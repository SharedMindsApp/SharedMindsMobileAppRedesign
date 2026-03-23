# Guardrails Project Creation Wizard

## Overview

The Guardrails Project Creation Wizard is a backend orchestration system that automates the creation of Master Projects with their complete structure including tracks, subtracks, and optional roadmap scaffolding. It supports both system-provided templates and user-created templates, making project initialization fast, consistent, and flexible.

## Key Features

- **Automated Project Setup**: Creates Master Project with complete track structure in one API call
- **Template-Based**: Applies system and user templates automatically
- **Smart Template Resolution**: Merges default templates with user selections intelligently
- **Optional Roadmap Scaffolding**: Generates initial roadmap preview structure
- **Validation**: Ensures all templates belong to the correct domain
- **Flexible Configuration**: Full control over which templates to apply

## Architecture

### Workflow Sequence

```
User Input
    ↓
[1] Validate Domain Type
    ↓
[2] Create Master Project
    ↓
[3] Resolve Templates
    ├─→ Default System Templates (if enabled)
    ├─→ Selected System Templates
    └─→ Selected User Templates
    ↓
[4] Create Tracks from Templates
    ├─→ For each template
    │   ├─→ Create Track
    │   └─→ Create Subtracks
    ↓
[5] Generate Roadmap Preview (optional)
    ↓
[6] Return Complete Project Structure
```

### Component Architecture

```
┌─────────────────────────────────────────┐
│        createProjectWithWizard          │
│      (Main Orchestration Function)      │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────────────┐  ┌────▼────────────────┐
│ Domain         │  │ Template            │
│ Validation     │  │ Resolution          │
└───┬────────────┘  └────┬────────────────┘
    │                    │
┌───▼────────────┐  ┌────▼────────────────┐
│ Create Master  │  │ Merge & Sort        │
│ Project        │  │ Templates           │
└───┬────────────┘  └────┬────────────────┘
    │                    │
    └──────────┬─────────┘
               │
    ┌──────────▼──────────┐
    │  Track Creation      │
    │  Loop                │
    └──────────┬───────────┘
               │
    ┌──────────▼──────────┐
    │  Roadmap Preview     │
    │  Generation          │
    └──────────┬───────────┘
               │
    ┌──────────▼──────────┐
    │  Return Result       │
    └──────────────────────┘
```

## API Reference

### Main Function: createProjectWithWizard

Creates a complete Master Project with tracks, subtracks, and optional roadmap structure.

```typescript
async function createProjectWithWizard(
  input: CreateProjectWizardInput
): Promise<ProjectWizardResult>
```

#### Input Parameters

```typescript
interface CreateProjectWizardInput {
  domain_id: string;
  domain_type: DomainType;
  name: string;
  description?: string;
  use_default_templates?: boolean;
  selected_system_template_ids?: string[];
  selected_user_template_ids?: string[];
  generate_initial_roadmap?: boolean;
}
```

**Field Descriptions:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `domain_id` | string | Yes | - | The domain ID this project belongs to |
| `domain_type` | DomainType | Yes | - | One of: 'work', 'personal', 'passion', 'startup' |
| `name` | string | Yes | - | Project name |
| `description` | string | No | undefined | Project description |
| `use_default_templates` | boolean | No | true | Whether to apply domain's default templates |
| `selected_system_template_ids` | string[] | No | [] | Additional system template IDs to apply |
| `selected_user_template_ids` | string[] | No | [] | User template IDs to apply |
| `generate_initial_roadmap` | boolean | No | false | Whether to generate roadmap preview items |

#### Return Value

```typescript
interface ProjectWizardResult {
  project: MasterProject;
  tracks: Track[];
  subtracks: SubTrack[];
  roadmap_preview: RoadmapItemPreview[];
  applied_templates: AnyTrackTemplate[];
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `project` | MasterProject | The created Master Project |
| `tracks` | Track[] | All tracks created from templates |
| `subtracks` | SubTrack[] | All subtracks created from templates |
| `roadmap_preview` | RoadmapItemPreview[] | Preview roadmap items (empty if not requested) |
| `applied_templates` | AnyTrackTemplate[] | List of templates that were applied |

### Helper Function: getWizardTemplatePreview

Preview what templates will be applied for a given domain.

```typescript
async function getWizardTemplatePreview(
  domain_type: string
): Promise<{
  domain_type: string;
  templates: Array<{
    id: string;
    name: string;
    description?: string;
    is_default: boolean;
    is_user_template: boolean;
    subtrack_count: number;
  }>;
}>
```

## Template Resolution Logic

### Resolution Order

1. **Default Templates** (if `use_default_templates === true`)
   - Fetches all system templates marked as `is_default: true` for the domain
   - These provide the baseline project structure

2. **Selected System Templates**
   - Additional system templates chosen by user
   - Validated to ensure they belong to the correct domain
   - Duplicates are automatically filtered out

3. **Selected User Templates**
   - User-created templates chosen for this project
   - Validated to ensure they belong to the correct domain
   - Duplicates are automatically filtered out

### Deduplication

Templates are deduplicated by ID to ensure no template is applied twice, even if it appears in multiple lists.

### Sorting

Resolved templates are sorted by:
1. **Default status** (system defaults first)
2. **Ordering index** (ascending)

This ensures a consistent, predictable project structure.

### Validation

Each template goes through validation:
- Must belong to the specified domain type
- Must exist and be accessible (user templates must belong to current user)
- System templates must be in the allowed list for that domain

## Example Usage

### Example 1: Basic Project with Defaults

Create a work project with only default templates:

```typescript
const result = await createProjectWithWizard({
  domain_id: 'uuid-of-work-domain',
  domain_type: 'work',
  name: 'Q1 2024 Strategic Initiatives',
  description: 'Major strategic projects for Q1',
  use_default_templates: true,
});

console.log(`Created project: ${result.project.name}`);
console.log(`Tracks created: ${result.tracks.length}`);
console.log(`Subtracks created: ${result.subtracks.length}`);
```

**Result:**
- Project created with name and description
- Default tracks for "work" domain applied (e.g., "Strategic Work", "Project Delivery", "Skill Growth")
- Each track includes its default subtracks
- Ready to use immediately

### Example 2: Custom Template Selection

Create a passion project with specific templates:

```typescript
const result = await createProjectWithWizard({
  domain_id: 'uuid-of-passion-domain',
  domain_type: 'passion',
  name: 'Indie Game Development',
  description: 'My first indie game project',
  use_default_templates: false,
  selected_system_template_ids: [
    'template-id-for-game-design',
    'template-id-for-art-illustration',
  ],
  selected_user_template_ids: [
    'my-custom-sound-design-template',
  ],
});
```

**Result:**
- Project created without default templates
- Only "Game Design" and "Art & Illustration" system templates applied
- User's custom "Sound Design" template applied
- Custom workflow structure tailored to game development

### Example 3: With Roadmap Scaffolding

Create a startup project with initial roadmap structure:

```typescript
const result = await createProjectWithWizard({
  domain_id: 'uuid-of-startup-domain',
  domain_type: 'startup',
  name: 'SaaS MVP Launch',
  description: 'Building and launching our MVP',
  use_default_templates: true,
  generate_initial_roadmap: true,
});

console.log('Roadmap Preview:');
result.roadmap_preview.forEach(item => {
  console.log(`- ${item.title} (Track: ${item.track_id})`);
});
```

**Result:**
- Project created with default startup templates
- All tracks and subtracks created
- Roadmap preview generated with one item per subtrack
- Can be used to quickly populate initial roadmap

### Example 4: Mixed Template Sources

Combine default, system, and user templates:

```typescript
const result = await createProjectWithWizard({
  domain_id: 'uuid-of-work-domain',
  domain_type: 'work',
  name: 'Enterprise Software Rollout',
  use_default_templates: true,
  selected_system_template_ids: [
    'stakeholder-management-template',
  ],
  selected_user_template_ids: [
    'my-compliance-checklist-template',
    'my-training-program-template',
  ],
});
```

**Result:**
- Default work templates applied (Strategic Work, Project Delivery, Skill Growth)
- Additional "Stakeholder Management" system template applied
- Custom "Compliance Checklist" and "Training Program" user templates applied
- Comprehensive project structure with both standard and custom workflows

## Roadmap Preview Generation

When `generate_initial_roadmap === true`, the wizard generates preview roadmap items:

### Structure

```typescript
interface RoadmapItemPreview {
  track_id: string;
  subtrack_id?: string;
  title: string;
  status: 'not_started';
}
```

### Generation Rules

1. **One preview item per subtrack** - Each subtrack gets a corresponding roadmap preview item
2. **Inherits subtrack name** - Preview title matches the subtrack name
3. **Default status** - All items start with `status: 'not_started'`
4. **Track association** - Each item is linked to its parent track
5. **Optional** - Only generated if explicitly requested

### Usage Intent

The roadmap preview is designed to:
- Show users what structure was created
- Provide a starting point for actual roadmap creation
- Help users understand the project scope
- **Not** create actual roadmap items (no sections or dates required)

Users can use this preview to:
- See all subtracks at a glance
- Decide which to convert to actual roadmap items
- Plan their project timeline
- Understand the workflow structure

## Error Handling

The wizard includes comprehensive error handling:

### Validation Errors

```typescript
try {
  const result = await createProjectWithWizard({
    domain_id: 'invalid-id',
    domain_type: 'invalid-domain',
    name: 'Test Project',
  });
} catch (error) {
  // Error: "Invalid domain type: invalid-domain"
}
```

### Template Validation Errors

```typescript
try {
  const result = await createProjectWithWizard({
    domain_id: domain_id,
    domain_type: 'work',
    name: 'Test Project',
    selected_system_template_ids: ['startup-mvp-build-template'],
  });
} catch (error) {
  // Error: "This template does not belong to the selected domain..."
}
```

### Project Creation Errors

If the domain already has an active project:

```typescript
// Error: "This domain already has a master project..."
```

### Template Not Found Errors

```typescript
// Error: "Track template not found: <template-id>"
```

## Type Definitions

### Domain Type

```typescript
type DomainType = 'work' | 'personal' | 'passion' | 'startup';
```

### Track

```typescript
interface Track {
  id: string;
  masterProjectId: string;
  name: string;
  description: string | null;
  color: string | null;
  orderingIndex: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### SubTrack

```typescript
interface SubTrack {
  id: string;
  track_id: string;
  name: string;
  description?: string;
  ordering_index: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```

### MasterProject

```typescript
interface MasterProject {
  id: string;
  user_id: string;
  domain_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'abandoned';
  is_archived: boolean;
  archived_at: string | null;
  completed_at: string | null;
  abandonment_reason: string | null;
  created_at: string;
  updated_at: string;
}
```

## Integration Guidelines

### For Frontend UI

When building a project creation wizard UI:

1. **Fetch available templates**
   ```typescript
   const preview = await getWizardTemplatePreview(selectedDomain);
   ```

2. **Display template options**
   - Show default templates with a badge
   - Show user templates separately
   - Allow multi-select for additional templates

3. **Submit project creation**
   ```typescript
   const result = await createProjectWithWizard({
     domain_id: selectedDomainId,
     domain_type: selectedDomainType,
     name: projectName,
     description: projectDescription,
     use_default_templates: includeDefaults,
     selected_system_template_ids: selectedSystemIds,
     selected_user_template_ids: selectedUserIds,
     generate_initial_roadmap: wantsRoadmapPreview,
   });
   ```

4. **Show success result**
   - Display created project
   - Show applied tracks and subtracks
   - Navigate to project dashboard

### For API Integration

When calling from an API endpoint:

```typescript
import { createProjectWithWizard } from './lib/guardrails';

export async function POST(request: Request) {
  const input = await request.json();

  try {
    const result = await createProjectWithWizard(input);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

## Performance Considerations

### Database Operations

The wizard performs multiple database operations:
1. One INSERT for Master Project
2. One INSERT per track (N tracks)
3. One INSERT per subtrack (M subtracks total)

**Total Operations:** 1 + N + M

For a typical project with 5 tracks and 3 subtracks each:
- 1 project + 5 tracks + 15 subtracks = 21 operations

### Optimization

All operations are executed sequentially to maintain consistency and handle dependencies properly. Future optimizations could include:

- Batch inserts for subtracks
- Parallel track creation where possible
- Caching of template data

### Transaction Safety

Each template application is independent. If one fails:
- Previous tracks/subtracks remain created
- Error is thrown with details
- Frontend can decide whether to retry or keep partial result

## Best Practices

### Template Selection

1. **Start with defaults** - Use default templates as a baseline
2. **Add selectively** - Only add templates you'll actually use
3. **Preview first** - Use `getWizardTemplatePreview()` to see what you're getting
4. **Test custom templates** - Verify user templates work before using in production projects

### Project Naming

1. **Be specific** - "Q1 Marketing Campaign" not "Project 1"
2. **Include timeframe** - "2024 Website Redesign"
3. **Indicate purpose** - "MVP Launch" vs "Feature Exploration"

### Roadmap Preview

1. **Use sparingly** - Only generate when you'll actually use it
2. **Review structure** - Use preview to validate template selection
3. **Don't rely on it** - It's a preview, not a full roadmap

### Error Recovery

1. **Validate inputs** - Check domain_id and domain_type before calling
2. **Handle duplicates** - Check if domain already has a project
3. **Catch errors gracefully** - Provide user-friendly error messages
4. **Log failures** - Track wizard failures for debugging

## Future Enhancements

Potential additions to the wizard system:

- **Template Recommendations** - AI-suggested templates based on project name/description
- **Batch Project Creation** - Create multiple projects at once
- **Project Templates** - Save entire project configurations as reusable templates
- **Undo Wizard** - Rollback a wizard-created project
- **Preview Mode** - Dry-run to see what would be created without committing
- **Custom Roadmap Generation** - More sophisticated initial roadmap with dates
- **Dependencies** - Track and subtrack dependencies defined in templates
- **Estimates** - Time/effort estimates included in templates
- **Checklists** - Initial checklist items for each subtrack

## Related Documentation

- [USER_TEMPLATES.md](./USER_TEMPLATES.md) - User template system documentation
- [GUARDRAILS_TRACK_TEMPLATES.md](./GUARDRAILS_TRACK_TEMPLATES.md) - System templates documentation
- [GUARDRAILS_SUBTRACKS.md](./GUARDRAILS_SUBTRACKS.md) - Sub-tracks documentation

## Support

For issues or questions about the project wizard:

1. Check error messages for specific validation failures
2. Verify template IDs are correct and accessible
3. Ensure domain has no existing active project
4. Review this documentation for correct usage patterns
