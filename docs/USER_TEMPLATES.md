# User Templates System

## Overview

The User Templates System extends the Guardrails template library by allowing users to create, manage, and reuse their own custom track and sub-track templates. User templates work exactly like system templates but are private to each user and can be customized to fit specific workflows.

## Key Features

- **Private Templates**: Each user can create their own templates that are visible only to them
- **Domain-Specific**: User templates are tied to one of the four domains (work, personal, passion, startup)
- **Reusable**: Templates can be instantiated multiple times across different projects
- **Complete Structure**: Each template can include multiple sub-tracks for detailed workflow organization
- **Seamless Integration**: User templates appear alongside system templates in all template selection UIs
- **CRUD Operations**: Full create, read, update, and delete support

## Database Schema

### guardrails_user_track_templates

Main table for user-created track templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Foreign key to auth.users (owner) |
| `domain_type` | text | One of: work, personal, passion, startup |
| `name` | text | Template name |
| `description` | text | Optional description |
| `ordering_index` | integer | Display order (default: 0) |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

**Constraints:**
- Templates are owned by a single user
- Domain type is validated
- Automatic cascading deletion when user is deleted

### guardrails_user_subtrack_templates

Sub-track templates belonging to user track templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_track_template_id` | uuid | Foreign key to user track template |
| `name` | text | Sub-track name |
| `description` | text | Optional description |
| `ordering_index` | integer | Display order within track |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

**Constraints:**
- Must belong to a user track template
- Automatically deleted when parent template is deleted (CASCADE)
- Ordering preserved within template

## Row Level Security (RLS)

All user template tables are secured with RLS policies ensuring users can only access their own templates.

### User Track Templates Policies

```sql
-- Users can view their own templates
SELECT: WHERE auth.uid() = user_id

-- Users can create templates
INSERT: WITH CHECK auth.uid() = user_id

-- Users can update their own templates
UPDATE: WHERE auth.uid() = user_id

-- Users can delete their own templates
DELETE: WHERE auth.uid() = user_id
```

### User Subtrack Templates Policies

Sub-track templates inherit permissions from their parent track template:

```sql
-- Users can view subtracks of their templates
SELECT: WHERE EXISTS (
  SELECT 1 FROM guardrails_user_track_templates
  WHERE id = user_track_template_id
  AND user_id = auth.uid()
)

-- Similar for INSERT, UPDATE, DELETE
```

## TypeScript Types

### Core Types

```typescript
interface UserTrackTemplate {
  id: string;
  user_id: string;
  domain_type: DomainType;
  name: string;
  description?: string;
  ordering_index: number;
  created_at: string;
  updated_at: string;
}

interface UserSubTrackTemplate {
  id: string;
  user_track_template_id: string;
  name: string;
  description?: string;
  ordering_index: number;
  created_at: string;
  updated_at: string;
}

interface UserTrackTemplateWithSubTracks extends UserTrackTemplate {
  subtracks: UserSubTrackTemplate[];
}
```

### Input Types

```typescript
interface CreateUserTrackTemplateInput {
  domain_type: DomainType;
  name: string;
  description?: string;
  ordering_index?: number;
}

interface UpdateUserTrackTemplateInput {
  name?: string;
  description?: string;
  ordering_index?: number;
}

interface CreateUserSubTrackTemplateInput {
  user_track_template_id: string;
  name: string;
  description?: string;
  ordering_index?: number;
}

interface UpdateUserSubTrackTemplateInput {
  name?: string;
  description?: string;
  ordering_index?: number;
}
```

### Union Types

For functions that work with both system and user templates:

```typescript
type AnyTrackTemplate = TrackTemplate | UserTrackTemplate;
type AnySubTrackTemplate = SubTrackTemplate | UserSubTrackTemplate;
type AnyTrackTemplateWithSubTracks = TrackTemplateWithSubTracks | UserTrackTemplateWithSubTracks;
```

## API Functions

All functions are available in `src/lib/guardrails/userTemplates.ts`

### Track Template CRUD

#### createUserTrackTemplate

Create a new user track template.

```typescript
async function createUserTrackTemplate(
  input: CreateUserTrackTemplateInput
): Promise<UserTrackTemplate>
```

**Example:**

```typescript
const template = await createUserTrackTemplate({
  domain_type: 'work',
  name: 'My Custom Sprint',
  description: 'A 2-week sprint workflow',
  ordering_index: 0,
});
```

#### updateUserTrackTemplate

Update an existing user track template.

```typescript
async function updateUserTrackTemplate(
  id: string,
  input: UpdateUserTrackTemplateInput
): Promise<UserTrackTemplate>
```

**Example:**

```typescript
const updated = await updateUserTrackTemplate(templateId, {
  name: 'Updated Sprint Name',
  description: 'New description',
});
```

#### deleteUserTrackTemplate

Delete a user track template (cascades to subtracks).

```typescript
async function deleteUserTrackTemplate(id: string): Promise<void>
```

#### getUserTrackTemplates

Get all user templates for a domain.

```typescript
async function getUserTrackTemplates(
  domainType?: DomainType
): Promise<UserTrackTemplate[]>
```

#### getUserTrackTemplatesWithSubTracks

Get user templates with their sub-tracks included.

```typescript
async function getUserTrackTemplatesWithSubTracks(
  domainType?: DomainType
): Promise<UserTrackTemplateWithSubTracks[]>
```

### Sub-Track Template CRUD

#### createUserSubTrackTemplate

Add a sub-track to a user template.

```typescript
async function createUserSubTrackTemplate(
  input: CreateUserSubTrackTemplateInput
): Promise<UserSubTrackTemplate>
```

**Example:**

```typescript
const subtrack = await createUserSubTrackTemplate({
  user_track_template_id: trackTemplateId,
  name: 'Planning',
  description: 'Sprint planning phase',
  ordering_index: 0,
});
```

#### updateUserSubTrackTemplate

Update a user sub-track template.

```typescript
async function updateUserSubTrackTemplate(
  id: string,
  input: UpdateUserSubTrackTemplateInput
): Promise<UserSubTrackTemplate>
```

#### deleteUserSubTrackTemplate

Delete a user sub-track template.

```typescript
async function deleteUserSubTrackTemplate(id: string): Promise<void>
```

#### getUserSubTrackTemplates

Get all sub-tracks for a user template.

```typescript
async function getUserSubTrackTemplates(
  trackTemplateId: string
): Promise<UserSubTrackTemplate[]>
```

### Track Instantiation

#### createTrackFromUserTemplate

Create actual tracks and sub-tracks from a user template.

```typescript
async function createTrackFromUserTemplate(
  input: CreateTrackFromUserTemplateInput
): Promise<Track>
```

**Example:**

```typescript
const track = await createTrackFromUserTemplate({
  master_project_id: projectId,
  user_track_template_id: templateId,
  custom_name: 'Sprint 1',
  custom_color: '#3b82f6',
  include_subtracks: true,
});
```

### Utility Functions

#### duplicateUserTrackTemplate

Duplicate an existing template with all its sub-tracks.

```typescript
async function duplicateUserTrackTemplate(
  templateId: string,
  newName?: string
): Promise<UserTrackTemplate>
```

#### isUserTrackTemplate

Check if a template ID belongs to a user template.

```typescript
async function isUserTrackTemplate(templateId: string): Promise<boolean>
```

## Template Merging

The system automatically merges system and user templates when fetching templates for a domain:

### Merged Template Functions

The following functions in `src/lib/guardrails/templates.ts` return merged results:

- `getAllowedTemplates(domainType)` - Returns system + user templates
- `getTemplatesForDomain(domainType)` - Returns system + user templates
- `validateTemplateForDomain(domainType, templateId)` - Validates both types
- `createTrackFromTemplate(input)` - Works with both types

### Sorting Behavior

When templates are merged, they are sorted by:

1. **Default status** (system templates with `is_default: true` first)
2. **Ordering index** (ascending)

This ensures system defaults appear first, followed by user templates in their specified order.

## Validation Rules

### Domain Validation

- User templates must be associated with a valid domain (work, personal, passion, startup)
- When instantiating a template, the domain must match the project's domain
- Cross-domain template usage is not allowed

### Ownership Validation

- Users can only access, modify, or delete their own templates
- Template IDs from other users will return "not found" errors due to RLS
- System templates remain read-only for all users

### Name Validation

- Template names are required
- No uniqueness constraint (users can have multiple templates with same name)
- Names can be customized when instantiating tracks

## Example Workflows

### Workflow 1: Create Custom Template

```typescript
// Step 1: Create track template
const template = await createUserTrackTemplate({
  domain_type: 'work',
  name: 'My Agile Workflow',
  description: 'Custom 2-week sprint structure',
});

// Step 2: Add sub-tracks
await createUserSubTrackTemplate({
  user_track_template_id: template.id,
  name: 'Planning',
  ordering_index: 0,
});

await createUserSubTrackTemplate({
  user_track_template_id: template.id,
  name: 'Execution',
  ordering_index: 1,
});

await createUserSubTrackTemplate({
  user_track_template_id: template.id,
  name: 'Review',
  ordering_index: 2,
});

// Step 3: Use template in project
const track = await createTrackFromTemplate({
  master_project_id: projectId,
  track_template_id: template.id,
  include_subtracks: true,
});
```

### Workflow 2: Duplicate and Modify

```typescript
// Duplicate existing template
const newTemplate = await duplicateUserTrackTemplate(
  existingTemplateId,
  'My Custom Workflow v2'
);

// Modify duplicated template
await updateUserTrackTemplate(newTemplate.id, {
  description: 'Updated workflow description',
});

// Add new sub-track to duplicate
await createUserSubTrackTemplate({
  user_track_template_id: newTemplate.id,
  name: 'Additional Phase',
  ordering_index: 3,
});
```

### Workflow 3: Template Library Management

```typescript
// Get all user templates for a domain
const workTemplates = await getUserTrackTemplatesWithSubTracks('work');

// Display in UI
workTemplates.forEach(template => {
  console.log(`${template.name} (${template.subtracks.length} subtracks)`);
  template.subtracks.forEach(subtrack => {
    console.log(`  - ${subtrack.name}`);
  });
});

// Delete unused template
await deleteUserTrackTemplate(unusedTemplateId);
```

## Integration with System Templates

User templates seamlessly integrate with the existing system template architecture:

### Unified Template Selection

When users select templates for a project, they see:

1. **System Templates** (marked with default badge if applicable)
2. **User Templates** (marked as custom/user-created)

Both types work identically for track instantiation.

### No Breaking Changes

- Existing functions continue to work with system templates
- New functions added for user-specific operations
- Merged functions return union types for compatibility

### Template ID Resolution

The system automatically detects whether a template ID refers to:

- System template (from `guardrails_track_templates`)
- User template (from `guardrails_user_track_templates`)

Functions like `validateTemplateForDomain` and `createTrackFromTemplate` handle both transparently.

## Best Practices

### Template Naming

- Use descriptive names that indicate the workflow purpose
- Include version numbers if you iterate on templates (e.g., "Sprint v2")
- Consider prefixing with domain (e.g., "Work: Development Sprint")

### Sub-Track Organization

- Keep sub-tracks focused and actionable
- Use logical ordering (0, 1, 2...) to reflect workflow sequence
- Limit to 3-7 sub-tracks per template for clarity

### Template Maintenance

- Regularly review and delete unused templates
- Use duplication rather than editing heavily-used templates
- Document custom workflows in template descriptions

### Performance Considerations

- Template fetching is optimized with proper indexing
- RLS policies are efficient for user-scoped queries
- Merged template queries perform well at scale

## Future Enhancements

Potential additions to the user templates system:

- **Template Sharing**: Share templates with team members or make public
- **Template Categories**: Organize templates into categories or tags
- **Template Import/Export**: Export templates as JSON for backup or sharing
- **Template Analytics**: Track template usage and effectiveness
- **Template Versioning**: Maintain version history for templates
- **Template Favorites**: Mark frequently-used templates for quick access

## Troubleshooting

### Template Not Found

If you get "Template not found" errors:

- Verify the template ID is correct
- Check that the template belongs to the current user
- Ensure the template hasn't been deleted

### Domain Mismatch

If you get domain validation errors:

- Verify the template's domain matches the project's domain
- Check that domain_type is one of: work, personal, passion, startup

### Permission Errors

If you can't access or modify templates:

- Verify you're authenticated
- Check that you're the owner of the template
- Ensure RLS policies are properly configured

## Related Documentation

- [GUARDRAILS_TRACK_TEMPLATES.md](./GUARDRAILS_TRACK_TEMPLATES.md) - System templates documentation
- [GUARDRAILS_SUBTRACKS.md](./GUARDRAILS_SUBTRACKS.md) - Sub-tracks system documentation
