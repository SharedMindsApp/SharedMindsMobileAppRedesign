# Guardrails Track Templates (Archetype System)

## Overview

The Track Templates system provides reusable archetypes for organizing projects across all four domain types (work, personal, passion, startup). Each domain has predefined track templates with nested sub-track templates that reflect common workflows and organizational patterns.

This system enables:
- Rapid project initialization with intelligent defaults
- Consistent structure across similar project types
- Domain-specific best practices baked into templates
- Flexibility to customize while maintaining structure

## Architecture

### Three-Tier Hierarchy

```
Domain Type (work, personal, passion, startup)
  └─ Track Templates (e.g., "MVP Build", "Marketing")
      └─ Sub-Track Templates (e.g., "Research", "Design", "Development")
```

### Database Schema

#### Table: `guardrails_track_templates`

Defines track archetypes for each domain type.

```sql
CREATE TABLE guardrails_track_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_type text NOT NULL CHECK (domain_type IN ('work', 'personal', 'passion', 'startup')),
  name text NOT NULL,
  description text,
  ordering_index integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_track_template_order_per_domain UNIQUE(domain_type, ordering_index)
);
```

**Column Descriptions:**

- `id` - Unique identifier for the template
- `domain_type` - Domain category (work, personal, passion, startup)
- `name` - Display name for the track template
- `description` - Optional detailed description of the track's purpose
- `ordering_index` - Display order within the domain (unique per domain)
- `is_default` - Flag indicating auto-selected templates for new projects
- `created_at` / `updated_at` - Timestamps

**Indexes:**

- `idx_track_templates_domain` - Fast lookups by domain type
- `idx_track_templates_ordering` - Fast ordered queries within domains

#### Table: `guardrails_subtrack_templates`

Defines sub-track archetypes within each track template.

```sql
CREATE TABLE guardrails_subtrack_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_template_id uuid NOT NULL REFERENCES guardrails_track_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  ordering_index integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_subtrack_template_order_per_track UNIQUE(track_template_id, ordering_index)
);
```

**Column Descriptions:**

- `id` - Unique identifier for the sub-track template
- `track_template_id` - Parent track template reference (CASCADE on delete)
- `name` - Display name for the sub-track template
- `description` - Optional detailed description
- `ordering_index` - Display order within the track (unique per track)
- `is_default` - Flag for auto-selected sub-tracks
- `created_at` / `updated_at` - Timestamps

**Indexes:**

- `idx_subtrack_templates_track` - Fast lookups by track template
- `idx_subtrack_templates_ordering` - Fast ordered queries within tracks

## Strict Domain Template Visibility Rules

### Overview

The template system enforces strict visibility rules to ensure only domain-appropriate templates are accessible when creating or managing projects. These rules are enforced at the service layer to prevent cross-domain template contamination.

### Allowed Templates by Domain

The following table defines the explicit mapping between domains and their allowed track templates:

| Domain | Allowed Templates | Default Template |
|--------|------------------|------------------|
| **Startup** | MVP Build, Marketing, Operations, Product Roadmap, Market Research, Customer Development, Growth Engine, Funding & Finance, Legal & Compliance, Team & Hiring | MVP Build |
| **Work** | Strategic Work, Project Delivery, Skill Growth, Agile / Scrum Workflow, Product Management, Stakeholder Management, Research & Analysis, Implementation, Career Development, Leadership & Management | Strategic Work |
| **Personal** | Life Admin, Health, Learning, Home Management, Financial Planning, Wellness, Relationships, Mental Health Care, Home Cooking & Meal Planning, Life Transformation Plans | Life Admin |
| **Passion** | Creative Project, Craft / Hobby, Writing, Video Production, Photography, Music Production, Art & Illustration, Game Design, Content Creation, Makerspace Builds | Creative Project |

### Enforcement Rules

1. **Query Filtering**: All template query functions filter results based on the domain's allowed list
2. **Validation on Creation**: Track creation validates that the template belongs to the project's domain
3. **Default Selection**: Only default templates from the project's domain are auto-created
4. **No Cross-Domain Access**: Templates from other domains are completely invisible to projects

### Service Layer Implementation

The service layer maintains a constant mapping that defines allowed templates:

```typescript
const ALLOWED_TEMPLATES_BY_DOMAIN: Record<DomainType, string[]> = {
  startup: [
    'MVP Build', 'Marketing', 'Operations', 'Product Roadmap',
    'Market Research', 'Customer Development', 'Growth Engine',
    'Funding & Finance', 'Legal & Compliance', 'Team & Hiring',
  ],
  work: [
    'Strategic Work', 'Project Delivery', 'Skill Growth', 'Agile / Scrum Workflow',
    'Product Management', 'Stakeholder Management', 'Research & Analysis',
    'Implementation', 'Career Development', 'Leadership & Management',
  ],
  personal: [
    'Life Admin', 'Health', 'Learning', 'Home Management',
    'Financial Planning', 'Wellness', 'Relationships', 'Mental Health Care',
    'Home Cooking & Meal Planning', 'Life Transformation Plans',
  ],
  passion: [
    'Creative Project', 'Craft / Hobby', 'Writing', 'Video Production',
    'Photography', 'Music Production', 'Art & Illustration', 'Game Design',
    'Content Creation', 'Makerspace Builds',
  ],
};
```

All template-fetching functions use this mapping to filter results, ensuring consistency across the application. The expanded library provides 10 templates per domain (40 total), significantly increasing project structure flexibility.

### Validation Function

The `validateTemplateForDomain()` function provides server-side validation:

```typescript
await validateTemplateForDomain(domainType, trackTemplateId);
```

This function:
- Verifies the template exists
- Checks the template's domain matches the project's domain
- Validates the template is in the allowed list for that domain
- Throws descriptive errors for invalid combinations

**Error Examples:**
- `"This template does not belong to the selected domain. Template is for 'work' but project is 'personal'."`
- `"This template ('Strategic Work') is not allowed for the 'personal' domain."`

### Flow Diagram

```
User Creates Project (Domain: Startup)
        ↓
getTemplatesForDomain('startup')
        ↓
Filter by ALLOWED_TEMPLATES_BY_DOMAIN['startup']
        ↓
Return Only: ['MVP Build', 'Marketing', 'Operations']
        ↓
User Selects Template
        ↓
validateTemplateForDomain('startup', templateId)
        ↓
Create Track with Sub-Tracks
```

### Benefits

1. **Data Integrity**: Prevents accidental cross-domain template application
2. **User Experience**: Users only see relevant templates for their project type
3. **Consistency**: Enforces domain-specific best practices
4. **Security**: Server-side validation prevents client-side bypasses

### Testing

The system includes comprehensive test stubs to verify:
- No cross-domain template leak
- Default templates are applied correctly
- Sub-track templates remain correctly linked
- Validation functions prevent invalid combinations

See `src/lib/guardrails/__tests__/templates.test.stub.ts` for detailed test cases.

## Domain Templates

### Startup Domain

Optimized for building and launching new ventures.

#### 1. MVP Build (Default)

Core product development from concept to launch.

**Sub-Tracks:**
- **Research** - Market research and user discovery
- **UX/UI Design** - User experience and interface design
- **Development** - Core feature implementation
- **Testing** - QA and user testing
- **Launch** - Deployment and go-to-market

#### 2. Marketing

Brand development and customer acquisition.

**Sub-Tracks:**
- **Branding** - Brand identity and positioning
- **Market Analysis** - Competitor and market research
- **Acquisition** - Customer acquisition channels
- **Content** - Content creation and distribution
- **Analytics** - Marketing metrics and optimization

#### 3. Operations

Business operations and infrastructure.

**Sub-Tracks:**
- **Finance** - Financial planning and management
- **Legal** - Legal compliance and contracts
- **Infrastructure** - Technical and operational infrastructure
- **Partnerships** - Strategic partnerships and relationships

#### 4. Product Roadmap

Strategic product planning and feature prioritization.

**Sub-Tracks:**
- **Vision & Strategy** - Product vision and strategic direction
- **Feature Scoping** - Feature definition and scoping
- **Prioritisation (RICE / MoSCoW)** - Feature prioritization frameworks
- **Release Planning** - Release scheduling and coordination
- **Product Metrics & KPIs** - Success metrics and tracking

#### 5. Market Research

Comprehensive market and competitor analysis.

**Sub-Tracks:**
- **Competitor Research** - Competitive landscape analysis
- **User Interviews** - Customer discovery interviews
- **Surveys & Data** - Quantitative research and data collection
- **Persona Creation** - User persona development
- **Insights Synthesis** - Research insights and recommendations

#### 6. Customer Development

Continuous customer feedback and validation.

**Sub-Tracks:**
- **Hypothesis Mapping** - Problem and solution hypotheses
- **User Testing** - Product testing with real users
- **Feedback Loops** - Continuous feedback collection
- **Adoption Tracking** - User adoption and engagement metrics

#### 7. Growth Engine

Scalable growth strategies and optimization.

**Sub-Tracks:**
- **SEO** - Search engine optimization
- **Viral Loops** - Viral growth mechanics
- **Retention Strategy** - Customer retention optimization
- **Referrals** - Referral program development
- **A/B Testing** - Growth experiment testing

#### 8. Funding & Finance

Fundraising and financial management.

**Sub-Tracks:**
- **Pitch Deck Creation** - Investment pitch development
- **Investor Outreach** - Investor networking and meetings
- **Budgeting & Burn Rate** - Financial planning and cash management
- **Financial Forecasting** - Revenue and growth projections

#### 9. Legal & Compliance

Legal setup and regulatory compliance.

**Sub-Tracks:**
- **Company Formation** - Business entity setup
- **IP & Trademark** - Intellectual property protection
- **Terms & Privacy** - Legal agreements and policies
- **Regulatory Checks** - Compliance verification

#### 10. Team & Hiring

Team building and talent acquisition.

**Sub-Tracks:**
- **Role Definitions** - Position requirements and descriptions
- **Recruiting** - Candidate sourcing and outreach
- **Interviewing** - Interview process and evaluation
- **Onboarding** - New team member integration

### Work Domain

Structured for professional projects and career development.

#### 1. Strategic Work (Default)

High-level planning and strategic initiatives.

**Sub-Tracks:**
- **Planning** - Strategic planning and goal setting
- **Execution** - Implementation of strategic initiatives
- **Review** - Progress review and adjustment

#### 2. Project Delivery

End-to-end project execution.

**Sub-Tracks:**
- **Requirements** - Requirement gathering and analysis
- **Build** - Development and implementation
- **QA** - Quality assurance and testing
- **Delivery** - Deployment and handoff

#### 3. Skill Growth

Professional development and learning.

**Sub-Tracks:**
- **Learning** - Acquiring new knowledge and skills
- **Practice** - Hands-on practice and application
- **Review** - Assessment and feedback

#### 4. Agile / Scrum Workflow

Agile project management methodology.

**Sub-Tracks:**
- **Backlog Creation** - User story and task backlog
- **Sprint Planning** - Sprint goal and task selection
- **Stand-ups** - Daily synchronization meetings
- **Retrospectives** - Sprint reflection and improvement
- **Review & Documentation** - Sprint review and documentation

#### 5. Product Management

Product strategy and feature management.

**Sub-Tracks:**
- **Roadmapping** - Product roadmap creation
- **Requirements Gathering** - Feature requirements documentation
- **Prioritisation** - Feature prioritization
- **UX Alignment** - User experience collaboration

#### 6. Stakeholder Management

Communication and stakeholder engagement.

**Sub-Tracks:**
- **Communication Plan** - Stakeholder communication strategy
- **Reporting** - Progress reports and updates
- **Approval Gateways** - Decision checkpoints
- **Feedback Tracking** - Stakeholder feedback management

#### 7. Research & Analysis

Data-driven research and analysis.

**Sub-Tracks:**
- **Data Collection** - Research data gathering
- **Modelling** - Data analysis and modeling
- **Insights Generation** - Actionable insights development
- **Documentation** - Research documentation

#### 8. Implementation

Technical implementation and deployment.

**Sub-Tracks:**
- **Build** - Core development work
- **Integrations** - System integrations
- **Testing** - Quality assurance testing
- **Deployment** - Production deployment

#### 9. Career Development

Professional growth and advancement.

**Sub-Tracks:**
- **Strength Assessment** - Skills and strengths evaluation
- **Goal Setting** - Career goals and objectives
- **Skill Plan** - Professional development planning
- **Quarterly Review** - Progress assessment

#### 10. Leadership & Management

Team leadership and management practices.

**Sub-Tracks:**
- **Delegation** - Task and responsibility delegation
- **Feedback Cycles** - Regular feedback and coaching
- **Meeting Systems** - Effective meeting management
- **Team Culture** - Culture building and maintenance

### Personal Domain

Designed for life management and personal development.

#### 1. Life Admin (Default)

Personal administration and errands.

**Sub-Tracks:**
- **Home** - Home maintenance and organization
- **Finance** - Personal finance management
- **Errands** - Daily tasks and errands

#### 2. Health

Physical and mental wellness.

**Sub-Tracks:**
- **Exercise** - Physical activity and fitness
- **Nutrition** - Diet and nutrition planning
- **Sleep** - Sleep quality and routine

#### 3. Learning

Personal education and skill development.

**Sub-Tracks:**
- **Courses** - Structured learning and courses
- **Practice** - Hands-on practice and experimentation
- **Assessment** - Testing knowledge and progress

#### 4. Home Management

Household organization and maintenance.

**Sub-Tracks:**
- **Cleaning System** - Regular cleaning routines
- **Organisation** - Home organization systems
- **Maintenance** - Preventive home maintenance
- **Renovation Projects** - Home improvement projects

#### 5. Financial Planning

Personal financial management and planning.

**Sub-Tracks:**
- **Budgeting** - Monthly budget planning
- **Savings** - Savings goals and tracking
- **Investments** - Investment portfolio management
- **Bills & Subscriptions** - Bill payments and subscriptions

#### 6. Wellness

Emotional and spiritual wellness.

**Sub-Tracks:**
- **Meditation** - Meditation and mindfulness practice
- **Emotional Check-in** - Regular emotional awareness
- **Stress Management** - Stress reduction techniques
- **Gratitude Logging** - Daily gratitude practice

#### 7. Relationships

Personal relationships and connections.

**Sub-Tracks:**
- **Family Time** - Quality time with family
- **Quality Time** - Meaningful connection activities
- **Communication** - Relationship communication
- **Planning Shared Events** - Event planning together

#### 8. Mental Health Care

Mental health maintenance and support.

**Sub-Tracks:**
- **Triggers Journal** - Mental health trigger tracking
- **Coping Strategies** - Coping mechanism development
- **Appointments** - Therapy and professional support
- **Daily Mood Log** - Daily mood tracking

#### 9. Home Cooking & Meal Planning

Meal planning and home cooking.

**Sub-Tracks:**
- **Weekly Meal Plan** - Weekly meal planning
- **Prep & Batch Cook** - Meal preparation and batch cooking
- **Nutrition Tracking** - Nutritional monitoring
- **Recipe Management** - Recipe collection and organization

#### 10. Life Transformation Plans

Major life changes and transformations.

**Sub-Tracks:**
- **Vision Planning** - Life vision and goal setting
- **Habit Stacks** - Habit building and stacking
- **Progress Review** - Regular transformation progress review

### Passion Domain

Tailored for creative and personal passion projects.

#### 1. Creative Project (Default)

End-to-end creative work.

**Sub-Tracks:**
- **Inspiration** - Idea generation and research
- **Drafting** - Initial creation and prototyping
- **Iteration** - Refinement and improvement
- **Completion** - Finalization and sharing

#### 2. Craft / Hobby

Skill-based hobby development.

**Sub-Tracks:**
- **Research** - Learning techniques and methods
- **Practice** - Regular practice and skill building
- **Build** - Creating finished pieces

#### 3. Writing

Writing projects and publications.

**Sub-Tracks:**
- **Outline** - Structure and planning
- **Write** - First draft creation
- **Edit** - Revision and editing
- **Publish** - Publishing and sharing

#### 4. Video Production

End-to-end video creation.

**Sub-Tracks:**
- **Concepting** - Video concept development
- **Scripting** - Script writing
- **Storyboard** - Visual storyboarding
- **Shooting** - Video filming
- **Editing** - Post-production editing

#### 5. Photography

Photography projects and portfolios.

**Sub-Tracks:**
- **Location Planning** - Shoot location scouting
- **Shot List** - Photography shot planning
- **Shooting** - Photo capture sessions
- **Selection & Editing** - Photo curation and editing

#### 6. Music Production

Music creation and production.

**Sub-Tracks:**
- **Composition** - Musical composition
- **Recording** - Audio recording
- **Mixing** - Audio mixing
- **Mastering** - Final mastering

#### 7. Art & Illustration

Visual art and illustration projects.

**Sub-Tracks:**
- **Inspiration** - Inspiration and reference gathering
- **Sketch Concepts** - Initial concept sketches
- **Final Rendering** - Final artwork creation
- **Publishing & Sharing** - Artwork sharing and publishing

#### 8. Game Design

Game concept to playable prototype.

**Sub-Tracks:**
- **Concept** - Game concept and design doc
- **Mechanics** - Core mechanics design
- **Prototyping** - Playable prototype creation
- **Playtesting** - Testing with players
- **Balancing** - Game balance tuning

#### 9. Content Creation

Digital content creation and publishing.

**Sub-Tracks:**
- **Topic Ideation** - Content topic brainstorming
- **Research** - Content research
- **Writing/Scripting** - Content creation
- **Publishing** - Content publication
- **Analytics Review** - Performance analytics

#### 10. Makerspace Builds

Physical making and building projects.

**Sub-Tracks:**
- **Blueprint** - Design and planning
- **Material Prep** - Material sourcing and preparation
- **Build** - Construction and assembly
- **Sanding/Finish** - Finishing touches
- **Showcase** - Project documentation and sharing

## Template Library Summary

The expanded template library now includes **40 track templates** across 4 domains:

| Domain | Total Templates | Default Template |
|--------|----------------|------------------|
| **Startup** | 10 | MVP Build |
| **Work** | 10 | Strategic Work |
| **Personal** | 10 | Life Admin |
| **Passion** | 10 | Creative Project |
| **Total** | **40** | 4 defaults |

Each template includes 3-5 sub-track templates for detailed workflow organization, totaling over 150 sub-track templates across the entire system.

## Row Level Security (RLS)

Templates are read-only for all authenticated users.

### Policy: View Templates

```sql
All authenticated users can view track and sub-track templates
```

Templates are system-managed and cannot be created, updated, or deleted by regular users. This ensures consistency and prevents accidental template corruption.

## TypeScript Types

### Core Types

```typescript
type DomainType = 'work' | 'personal' | 'passion' | 'startup';

interface TrackTemplate {
  id: string;
  domain_type: DomainType;
  name: string;
  description?: string;
  ordering_index: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface SubTrackTemplate {
  id: string;
  track_template_id: string;
  name: string;
  description?: string;
  ordering_index: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface TrackTemplateWithSubTracks extends TrackTemplate {
  subtracks: SubTrackTemplate[];
}

interface DomainTrackTemplateSet {
  domain_type: DomainType;
  tracks: TrackTemplateWithSubTracks[];
}
```

## Service Layer API

Location: `src/lib/guardrails/templates.ts`

### Querying Functions

#### Get Allowed Templates

```typescript
async function getAllowedTemplates(
  domainType: DomainType
): Promise<TrackTemplateWithSubTracks[]>
```

**Core filtering function** that returns only templates explicitly allowed for the specified domain. This function enforces strict domain visibility rules by filtering against the `ALLOWED_TEMPLATES_BY_DOMAIN` mapping.

**Filtering Logic:**
1. Queries database for templates matching the domain type
2. Filters results against the allowed template names list
3. Fetches associated sub-track templates
4. Returns only domain-appropriate templates

**Example:**
```typescript
const startupTemplates = await getAllowedTemplates('startup');
// Returns ONLY: [{ name: 'MVP Build', ... }, { name: 'Marketing', ... }, { name: 'Operations', ... }]
// Will NOT return templates from other domains, even if they exist in the database
```

#### Get Templates for Domain

```typescript
async function getTemplatesForDomain(
  domainType: DomainType
): Promise<TrackTemplateWithSubTracks[]>
```

Returns all track templates (with nested sub-tracks) for a specific domain, ordered by `ordering_index`. This function internally uses `getAllowedTemplates()` to enforce domain visibility rules.

**Example:**
```typescript
const startupTemplates = await getTemplatesForDomain('startup');
// Returns: [{ name: 'MVP Build', subtracks: [...] }, { name: 'Marketing', subtracks: [...] }, ...]
```

#### Get Track Templates

```typescript
async function getTrackTemplates(
  domainType?: DomainType
): Promise<TrackTemplate[]>
```

Returns track templates without sub-tracks. Optional domain filter.

#### Get Sub-Track Templates

```typescript
async function getSubTrackTemplates(
  trackTemplateId: string
): Promise<SubTrackTemplate[]>
```

Returns all sub-track templates for a specific track template.

#### Get All Templates

```typescript
async function getAllTemplates(): Promise<DomainTrackTemplateSet[]>
```

Returns templates for all four domains, grouped by domain type.

#### Get Template Structure

```typescript
async function getTemplateStructureForDomain(domainType: DomainType): Promise<{
  tracks: Array<{
    templateId: string;
    name: string;
    description?: string;
    isDefault: boolean;
    subtracks: Array<{
      templateId: string;
      name: string;
      description?: string;
      ordering_index: number;
      isDefault: boolean;
    }>;
  }>;
}>
```

Returns a simplified, UI-friendly structure of templates for a domain.

### Seeding Functions

#### Seed Domain Track Templates

```typescript
async function seedDomainTrackTemplates(): Promise<TemplateSeedResult>
```

Executes the database seeding function to populate templates. **Idempotent** - safe to run multiple times.

**Returns:**
```typescript
{
  success: boolean;
  tracksSeeded: number;
  subtracksSeeded: number;
  errors?: string[];
}
```

#### Ensure Templates Exist

```typescript
async function ensureTemplatesExist(): Promise<boolean>
```

Checks if templates exist in the database. If not, automatically seeds them. Returns `true` if templates are available.

**Use Case:** Call on app initialization to ensure templates are present.

### Default Template Functions

#### Get Default Templates for Domain

```typescript
async function getDefaultTemplatesForDomain(
  domainType: DomainType
): Promise<TrackTemplateWithSubTracks[]>
```

Returns only templates marked as `is_default: true` for a domain. These are auto-selected when creating new projects.

### Template Application Functions

#### Get Track Template by ID

```typescript
async function getTrackTemplateById(
  templateId: string
): Promise<TrackTemplateWithSubTracks | null>
```

Retrieves a specific track template with all its sub-track templates.

#### Validate Template for Domain

```typescript
async function validateTemplateForDomain(
  domainType: DomainType,
  trackTemplateId: string
): Promise<boolean>
```

**Server-side validation** that ensures a template is allowed for a specific domain. This function prevents cross-domain template application by enforcing strict visibility rules.

**Validation Checks:**
1. Template exists in the database
2. Template's domain type matches the project's domain type
3. Template name is in the allowed list for that domain

**Throws Errors:**
- `"Track template not found"` - Template doesn't exist
- `"This template does not belong to the selected domain. Template is for 'work' but project is 'personal'."` - Domain mismatch
- `"This template ('Strategic Work') is not allowed for the 'personal' domain."` - Template not in allowed list

**Example:**
```typescript
try {
  await validateTemplateForDomain('startup', templateId);
  // Template is valid for startup domain
} catch (error) {
  console.error('Invalid template:', error.message);
  // Handle validation error
}
```

#### Create Track from Template

```typescript
async function createTrackFromTemplate(
  input: CreateTrackFromTemplateInput
): Promise<{ track: Track; subtracks: SubTrack[] }>
```

Creates a real track (and optionally sub-tracks) from a template. Optionally validates the template belongs to the specified domain.

**Input:**
```typescript
{
  master_project_id: string;
  track_template_id: string;
  domain_type?: DomainType; // Optional: enables validation
  custom_name?: string;
  custom_color?: string;
  include_subtracks?: boolean; // defaults to true
}
```

**Validation:**
If `domain_type` is provided, the function automatically calls `validateTemplateForDomain()` before creating the track. This prevents cross-domain template application.

**Examples:**

Basic usage (no validation):
```typescript
const result = await createTrackFromTemplate({
  master_project_id: projectId,
  track_template_id: mvpBuildTemplateId,
  custom_name: 'Build v1.0',
  include_subtracks: true,
});
// Creates track + all sub-tracks from template
```

With domain validation:
```typescript
const result = await createTrackFromTemplate({
  master_project_id: projectId,
  track_template_id: mvpBuildTemplateId,
  domain_type: 'startup', // Validates template is allowed for startup domain
  custom_name: 'Build v1.0',
  include_subtracks: true,
});
// Validates, then creates track + sub-tracks
```

#### Create Sub-Track from Template

```typescript
async function createSubTrackFromTemplate(
  input: CreateSubTrackFromTemplateInput
): Promise<SubTrack>
```

Creates a single sub-track from a template.

**Input:**
```typescript
{
  track_id: string;
  subtrack_template_id: string;
  custom_name?: string;
}
```

#### Create Tracks from Default Templates

```typescript
async function createTracksFromDefaultTemplates(
  masterProjectId: string,
  domainType: DomainType
): Promise<{ tracks: Track[]; subtracks: SubTrack[] }>
```

**IMPORTANT:** This function will be used in Prompt 2B to auto-create initial tracks when a new project is created.

Creates all default-flagged tracks (with sub-tracks) for a domain. This function respects strict domain visibility rules and only creates tracks from templates allowed for the specified domain.

**Behavior by Domain:**
- **Startup**: Creates "MVP Build" track with 5 sub-tracks
- **Work**: Creates "Strategic Work" track with 3 sub-tracks
- **Personal**: Creates "Life Admin" track with 3 sub-tracks
- **Passion**: Creates "Creative Project" track with 4 sub-tracks

**Example:**
```typescript
const { tracks, subtracks } = await createTracksFromDefaultTemplates(
  projectId,
  'startup'
);
console.log(`Created ${tracks.length} tracks with ${subtracks.length} sub-tracks`);
// Output: Created 1 tracks with 5 sub-tracks
// (Only MVP Build is default for startup domain)
```

### Statistics Functions

#### Get Template Statistics

```typescript
async function getTemplateStatistics(): Promise<{
  totalTemplates: number;
  templatesByDomain: Record<DomainType, number>;
  totalSubtracks: number;
}>
```

Returns aggregate statistics about available templates.

## Seeder Execution

The migration automatically seeds templates using a Postgres function:

```sql
CREATE OR REPLACE FUNCTION seed_track_templates() RETURNS void
```

This function:
- Is **idempotent** - can be run multiple times safely
- Uses `ON CONFLICT DO UPDATE/NOTHING` to prevent duplicates
- Seeds all 12 track templates and their 42+ sub-track templates
- Can be manually invoked: `SELECT seed_track_templates();`

The seeder runs automatically during migration, so templates are available immediately after deployment.

## Integration Workflow

### Current State (Prompt 2A)

Templates are **defined and queryable** but not yet used to auto-create tracks.

**Available now:**
- Query templates for any domain
- Display templates in UI (future)
- Manually create tracks from templates

**Example Query:**
```typescript
const templates = await getTemplatesForDomain('startup');
console.log(templates);
// [
//   { name: 'MVP Build', is_default: true, subtracks: [...] },
//   { name: 'Marketing', is_default: false, subtracks: [...] },
//   { name: 'Operations', is_default: false, subtracks: [...] }
// ]
```

### Future State (Prompt 2B)

When creating a new Master Project, automatically invoke:

```typescript
const { tracks, subtracks } = await createTracksFromDefaultTemplates(
  masterProjectId,
  domainType
);
```

This will:
1. Fetch all `is_default: true` templates for the domain
2. Create real tracks and sub-tracks from those templates
3. Return the created entities for immediate use

**Example for Startup Domain:**

Creating a new startup project will automatically create:
- **MVP Build** track with 5 sub-tracks (Research, UX/UI Design, Development, Testing, Launch)

## Usage Examples

### Listing Available Templates

```typescript
// Get all startup templates
const startupTemplates = await getTemplatesForDomain('startup');

startupTemplates.forEach(track => {
  console.log(`Track: ${track.name}`);
  track.subtracks.forEach(sub => {
    console.log(`  - ${sub.name}`);
  });
});

// Output:
// Track: MVP Build
//   - Research
//   - UX/UI Design
//   - Development
//   - Testing
//   - Launch
// Track: Marketing
//   - Branding
//   - Market Analysis
//   - Acquisition
//   - Content
//   - Analytics
// ...
```

### Creating a Project with Templates

```typescript
// Step 1: Create master project
const project = await createMasterProject({
  user_id: userId,
  name: 'My Startup',
  domain_id: domainId,
  category: 'startup',
});

// Step 2: Create tracks from default templates
const { tracks, subtracks } = await createTracksFromDefaultTemplates(
  project.id,
  'startup'
);

console.log(`Created ${tracks.length} tracks with ${subtracks.length} sub-tracks`);
// Output: Created 1 tracks with 5 sub-tracks
// (Only MVP Build is default for startup domain)
```

### Custom Track Creation

```typescript
// User wants to add the Marketing track later
const marketingTemplate = startupTemplates.find(t => t.name === 'Marketing');

if (marketingTemplate) {
  const result = await createTrackFromTemplate({
    master_project_id: projectId,
    track_template_id: marketingTemplate.id,
    custom_name: 'Growth Marketing', // Custom name
    custom_color: '#10B981', // Custom color
    include_subtracks: true,
  });

  console.log(`Created track: ${result.track.name}`);
  console.log(`With ${result.subtracks.length} sub-tracks`);
}
```

### Checking Template Availability

```typescript
// On app startup, ensure templates exist
await ensureTemplatesExist();

// Get statistics
const stats = await getTemplateStatistics();
console.log(`Total templates: ${stats.totalTemplates}`);
console.log(`Startup templates: ${stats.templatesByDomain.startup}`);
console.log(`Total sub-tracks: ${stats.totalSubtracks}`);
```

## Design Principles

### 1. Domain-Specific Best Practices

Each domain's templates reflect common patterns:
- **Startup**: Product development lifecycle
- **Work**: Professional project methodologies
- **Personal**: Life management categories
- **Passion**: Creative process stages

### 2. Flexibility

Templates provide structure without constraint:
- Users can customize track/sub-track names
- Templates are optional - users can create custom tracks
- Sub-tracks can be included or excluded

### 3. Sensible Defaults

The `is_default` flag identifies templates that:
- Are most commonly used in each domain
- Provide immediate value for new users
- Create a balanced starting structure

### 4. Extensibility

The system supports future enhancements:
- Additional templates can be added via seeding
- Templates can be versioned
- User-created custom templates (future feature)

## Testing Recommendations

When implementing UI features:

1. **Template Selection UI**
   - Display all templates for a domain
   - Highlight default templates
   - Allow multi-select for track creation

2. **Project Creation Wizard**
   - Auto-select default templates
   - Allow users to add/remove templates
   - Preview template structure before creation

3. **Manual Track Addition**
   - "Add from Template" button in track manager
   - Template browser/picker
   - Preview sub-tracks before applying

4. **Template Preview**
   - Show template structure in a tree view
   - Display descriptions for context
   - Indicate which templates will be auto-created

## Troubleshooting

### Templates Not Appearing

**Issue:** `getTemplatesForDomain()` returns empty array

**Solutions:**
1. Run `await ensureTemplatesExist()` to seed templates
2. Check database manually: `SELECT * FROM guardrails_track_templates;`
3. Verify RLS policies allow SELECT for authenticated user

### Duplicate Template Creation

**Issue:** Templates created multiple times

**Solution:** The seeder is idempotent. Use `ON CONFLICT` clauses ensure duplicates are handled gracefully. Re-running the seeder is safe.

### Custom Names Not Applied

**Issue:** Created tracks use template name instead of custom name

**Solution:** Ensure `custom_name` parameter is passed to `createTrackFromTemplate()`:
```typescript
await createTrackFromTemplate({
  master_project_id: projectId,
  track_template_id: templateId,
  custom_name: 'My Custom Name', // Include this
});
```

## Future Enhancements

Potential future features:

1. **Custom User Templates**
   - Users can save their own track structures as templates
   - Share templates across projects
   - Community template marketplace

2. **Template Versioning**
   - Track template evolution over time
   - Migrate projects to new template versions
   - Template changelog

3. **Smart Recommendations**
   - AI-suggested templates based on project goals
   - Adaptive templates that learn from user behavior
   - Context-aware template suggestions

4. **Template Analytics**
   - Track which templates are most popular
   - Measure completion rates by template
   - Identify underused templates

5. **Conditional Sub-Tracks**
   - Sub-tracks that appear based on project attributes
   - Dynamic template expansion
   - Rule-based template customization

## Summary

The Track Templates system provides:

- **12 Track Templates** across 4 domains
- **42+ Sub-Track Templates** for granular organization
- **Intelligent Defaults** for instant project setup
- **Full Customization** while maintaining structure
- **Idempotent Seeding** for reliable deployment
- **Read-Only Templates** for consistency
- **Domain-Specific Patterns** reflecting real-world workflows

Templates are ready for use but not yet integrated into the project creation flow. Prompt 2B will connect template creation to the Master Project wizard.
