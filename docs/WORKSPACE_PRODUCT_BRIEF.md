# Workspace — Product Brief & Implementation Plan

## Executive Summary

**Workspace** is a structured thinking and reference surface within Spaces that enables users to organize ideas, information, plans, and context using modular, collapsible content units. Unlike traditional documents or notes, Workspace supports progressive structure, non-linear thinking, and long-lived content that evolves over time.

**Key Differentiator:** Workspace is thinking-first, not publishing-first. It prioritizes understanding over presentation, compression over sprawl, and semantic structure over cosmetic formatting.

---

## Product Definition

### What is a Workspace?

A Workspace is a structured thinking and reference surface inside Spaces. It allows users to organize ideas, information, plans, and context using modular, collapsible content units, without committing to rigid document formats or databases.

**Core Identity:**
- More flexible than documents
- More intentional than notes
- Less rigid than databases
- Living structure for thought, planning, and reference

### One-Line Definition

**Workspace is where understanding lives — before, during, and after execution.**

---

## Core Capabilities

### 1. Build Modular Content

Users can create content using small, structured units:

**Content Unit Types:**
- **Text Sections** - Rich text blocks with formatting (bold, italic, links)
- **Bullet Points** - Ordered and unordered lists
- **Checklists** - Task-like items with completion state
- **Collapsible Groups** - Nested sections that can be expanded/collapsed
- **Highlighted Callouts** - Important notes, warnings, or insights
- **References** - Links to Planner events, Guardrails tasks, goals, roadmap items
- **Code Blocks** - For technical documentation (optional)
- **Divider** - Visual separation between sections

**Content Unit Properties:**
- Reorderable (drag and drop)
- Nestable (hierarchical structure)
- Collapsible/expandable
- Convertible between types (e.g., bullet → checklist)
- Deletable
- Editable inline

### 2. Organize Thinking, Not Just Writing

**Use Cases:**
- **Brain-dumping → Refining**: Start messy, structure later
- **Rough Ideas → Structured Plans**: Progressive organization
- **Ongoing Reference → Evolving Context**: Long-lived content that adapts

**Design Philosophy:**
- Non-linear thinking support
- No upfront structure requirements
- Structure emerges gradually
- Formatting never becomes the primary task

### 3. Act as Connective Layer

**Reference Capabilities:**
- Link to Planner events (calendar items)
- Link to Guardrails tasks and roadmap items
- Link to Goals
- Link to other Workspaces
- Link to Spaces widgets
- Link to external URLs

**Reference Properties:**
- **Non-destructive**: References don't modify source items
- **No forced syncing**: Workspace holds meaning, not state
- **No duplication of authority**: Source systems remain authoritative
- **Visual previews**: Show context of referenced items

### 4. Encourage Compression, Not Sprawl

**Compression Features:**
- Collapse sections by default
- Summary views for long content
- Hierarchies of importance
- "Show more/less" for deep nesting
- Archive old sections

**Benefits:**
- Keeps content readable over time
- Cognitively manageable for long-lived projects
- Prevents information overload
- Maintains focus on what matters

---

## User Personas

### Primary Users

1. **Outline Thinkers**
   - People who think in layers and fragments
   - Prefer hierarchical organization
   - Need flexibility in structure

2. **Constraint-Averse Users**
   - Feel limited by rigid documents
   - Want progressive structure
   - Need non-linear thinking support

3. **Neurodivergent Users**
   - Prefer flexible structure
   - Need visual organization
   - Benefit from collapsible sections

4. **Planners and Builders**
   - Want context alongside execution
   - Need reference materials
   - Require long-lived documentation

### Shared Contexts

1. **Households**
   - Organizing information (plans, references, shared thinking)
   - Family planning and coordination
   - Shared knowledge bases

2. **Teams**
   - Capturing rationale and decisions
   - Background context for projects
   - Living documentation

---

## Differentiation

### Workspace vs. Notes

| Aspect | Notes | Workspace |
|--------|-------|-----------|
| **Structure** | Atomic, flat | Multi-layered, hierarchical |
| **Lifespan** | Disposable | Long-lived |
| **Purpose** | Quick capture | Growth and revision |
| **Use When** | Quick capture, won't evolve | Content will grow, structure matters |

### Workspace vs. Documents

| Aspect | Documents | Workspace |
|--------|-----------|-----------|
| **Structure** | Linear, fixed | Progressive, flexible |
| **Assumption** | Finished outcome | Incomplete thoughts |
| **Goal** | Presentation | Understanding |
| **Formatting** | Primary task | Never primary |

### Workspace vs. Databases

| Aspect | Databases | Workspace |
|--------|-----------|-----------|
| **Schema** | Required upfront | Emerges gradually |
| **Rigidity** | High | Low |
| **Use Case** | Structured data | Structured thinking |

---

## What Workspace is NOT

Workspace is intentionally not:
- ❌ A file system
- ❌ A wiki
- ❌ A database builder
- ❌ A task manager
- ❌ A replacement for Planner or Guardrails

**It complements** those systems by holding context, rationale, and structure that don't belong in execution tools.

---

## Design Principles (Non-Negotiable)

### 1. Content Before Schema
Users should never be forced to define structure upfront. Structure emerges from content, not the other way around.

### 2. Collapse is First-Class
Compression is as important as creation. Users must be able to hide complexity without losing information.

### 3. Semantic Units Over Cosmetic Formatting
Structure should reflect meaning, not just appearance. Content types have semantic meaning, not just visual differences.

### 4. Reference, Don't Duplicate
Workspace links to other systems without owning their state. References are non-destructive and non-authoritative.

### 5. Calm by Default
No visual clutter, no database anxiety, no feature overload. The interface should feel peaceful and focused.

---

## Technical Architecture

### Data Model

**Core Tables:**

1. **`workspaces`**
   - `id` (uuid, primary key)
   - `space_id` (uuid, foreign key to spaces)
   - `title` (text, optional)
   - `created_by` (uuid, foreign key to profiles)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)
   - `archived_at` (timestamptz, nullable)

2. **`workspace_units`**
   - `id` (uuid, primary key)
   - `workspace_id` (uuid, foreign key to workspaces)
   - `parent_id` (uuid, nullable, self-referential)
   - `type` (enum: text, bullet, checklist, group, callout, reference, code, divider)
   - `content` (jsonb) - Type-specific content
   - `order_index` (integer) - For ordering within parent
   - `is_collapsed` (boolean, default: false)
   - `is_completed` (boolean, default: false) - For checklist items
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)
   - `deleted_at` (timestamptz, nullable)

3. **`workspace_references`**
   - `id` (uuid, primary key)
   - `workspace_unit_id` (uuid, foreign key to workspace_units)
   - `reference_type` (enum: planner_event, guardrails_task, guardrails_roadmap, goal, workspace, widget, url)
   - `reference_id` (uuid, nullable) - For internal references
   - `reference_url` (text, nullable) - For external URLs
   - `display_text` (text) - Custom display text
   - `created_at` (timestamptz)

**Content JSONB Structure by Type:**

```typescript
// Text Section
{
  "text": "Rich text content with markdown support",
  "formatting": "markdown" // or "plain"
}

// Bullet Points
{
  "items": ["Item 1", "Item 2", "Item 3"],
  "ordered": false // true for numbered lists
}

// Checklist
{
  "items": [
    { "text": "Task 1", "completed": false },
    { "text": "Task 2", "completed": true }
  ]
}

// Collapsible Group
{
  "title": "Group Title",
  "summary": "Optional summary text"
}

// Callout
{
  "text": "Important note",
  "type": "info" // info, warning, success, error
}

// Reference
{
  "reference_type": "guardrails_task",
  "reference_id": "uuid",
  "display_text": "Custom display text",
  "preview": { /* cached preview data */ }
}

// Code Block
{
  "code": "code content",
  "language": "typescript" // optional
}

// Divider
{
  "style": "solid" // solid, dashed, dotted
}
```

### Widget Integration

Workspace will be a new widget type in Spaces:

- **Widget Type**: `workspace`
- **Widget Content**: `{ workspace_id: string }`
- **View Modes**: `icon`, `mini`, `large`, `xlarge`
- **Icon**: `FileText` or `Layers`
- **Color**: `slate` or `blue`

### Component Architecture

```
WorkspaceWidget (Main Container)
├── WorkspaceHeader (Title, actions)
├── WorkspaceToolbar (Add unit, collapse all, etc.)
└── WorkspaceContent
    └── WorkspaceUnit (Recursive component)
        ├── UnitRenderer (Type-specific rendering)
        ├── UnitEditor (Inline editing)
        └── WorkspaceUnit (Nested units)
```

### Reference System

**Reference Types:**
1. **Planner Events**: Link to calendar events
2. **Guardrails Tasks**: Link to tasks in projects
3. **Guardrails Roadmap**: Link to roadmap items
4. **Goals**: Link to goals
5. **Workspaces**: Link to other workspaces
6. **Widgets**: Link to other Spaces widgets
7. **URLs**: External links

**Reference Resolution:**
- References are resolved on-demand
- Preview data is cached for performance
- Broken references are handled gracefully
- References show context (title, date, status) without modifying source

---

## User Experience Flow

### Creating a Workspace

1. User adds "Workspace" widget to a Space
2. Widget opens in app view
3. User sees empty workspace with "+" button
4. User clicks "+" to add first content unit
5. User selects unit type (text, bullet, etc.)
6. Unit appears and is immediately editable

### Adding Content Units

1. User clicks "+" button (at workspace level or unit level)
2. Unit type selector appears (or defaults to last used type)
3. New unit appears below/after current unit
4. User can immediately start typing
5. Unit auto-saves as user types

### Organizing Content

1. **Reordering**: Drag handle appears on hover, drag to reorder
2. **Nesting**: Drag unit onto another unit to nest
3. **Collapsing**: Click collapse icon to hide children
4. **Converting**: Right-click or menu to convert between types
5. **Deleting**: Delete button or keyboard shortcut

### Referencing Other Systems

1. User types "@" or clicks reference button
2. Reference picker appears
3. User selects reference type (Planner, Guardrails, etc.)
4. User searches/browses for item to reference
5. Reference appears as inline link with preview
6. Clicking reference opens source item (read-only)

---

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

**Database & Types**
- [ ] Create database migrations for `workspaces`, `workspace_units`, `workspace_references`
- [ ] Define TypeScript types for all content unit types
- [ ] Create RLS policies for workspace access
- [ ] Add `workspace` to widget_type enum

**Basic Widget**
- [ ] Create `WorkspaceWidget` component
- [ ] Add workspace widget to widget registry
- [ ] Integrate with WidgetAppView
- [ ] Basic empty state and "add unit" functionality

**Core Content Units**
- [ ] Text section unit (plain text only)
- [ ] Bullet points unit
- [ ] Basic rendering and editing

**Deliverable**: Users can create a workspace and add text/bullet units

---

### Phase 2: Structure & Organization (Weeks 3-4)

**Hierarchical Structure**
- [ ] Implement parent-child relationships
- [ ] Nesting UI (indentation, visual hierarchy)
- [ ] Drag and drop reordering
- [ ] Drag and drop nesting

**Collapsible Groups**
- [ ] Collapsible group unit type
- [ ] Collapse/expand functionality
- [ ] Collapse all/expand all actions
- [ ] Visual indicators for collapsed state

**Content Unit Management**
- [ ] Delete units (soft delete)
- [ ] Undo/redo functionality
- [ ] Unit conversion (basic types)

**Deliverable**: Users can organize content hierarchically and collapse sections

---

### Phase 3: Rich Content (Weeks 5-6)

**Enhanced Text**
- [ ] Markdown support in text sections
- [ ] Rich text formatting (bold, italic, links)
- [ ] Inline code formatting

**Checklists**
- [ ] Checklist unit type
- [ ] Check/uncheck functionality
- [ ] Completion state persistence

**Callouts**
- [ ] Callout unit type
- [ ] Different callout styles (info, warning, success, error)
- [ ] Visual styling

**Code Blocks**
- [ ] Code block unit type
- [ ] Syntax highlighting (optional)
- [ ] Language selection

**Deliverable**: Users can create rich, structured content with multiple unit types

---

### Phase 4: References (Weeks 7-8)

**Reference System**
- [ ] Reference unit type
- [ ] Reference picker component
- [ ] Reference resolution service
- [ ] Reference preview component

**Planner Integration**
- [ ] Link to Planner events
- [ ] Event preview in workspace
- [ ] Navigate to event from reference

**Guardrails Integration**
- [ ] Link to Guardrails tasks
- [ ] Link to Guardrails roadmap items
- [ ] Task/roadmap preview in workspace
- [ ] Navigate to source from reference

**Other References**
- [ ] Link to Goals
- [ ] Link to other Workspaces
- [ ] Link to Spaces widgets
- [ ] External URL links

**Deliverable**: Users can reference items from Planner, Guardrails, and other systems

---

### Phase 5: Polish & Performance (Weeks 9-10)

**Performance**
- [ ] Virtual scrolling for large workspaces
- [ ] Lazy loading of nested content
- [ ] Optimistic updates
- [ ] Debounced auto-save

**UX Enhancements**
- [ ] Keyboard shortcuts (Enter, Tab, Shift+Tab, etc.)
- [ ] Better drag and drop feedback
- [ ] Loading states
- [ ] Error handling

**Visual Polish**
- [ ] Refined typography
- [ ] Better spacing and hierarchy
- [ ] Smooth animations
- [ ] Mobile responsiveness

**Deliverable**: Workspace is performant, polished, and ready for production

---

### Phase 6: Advanced Features (Future)

**Search & Navigation**
- [ ] Full-text search within workspace
- [ ] Table of contents for large workspaces
- [ ] Jump to section

**Collaboration**
- [ ] Real-time collaboration (if needed)
- [ ] Comments on units
- [ ] Version history

**Templates**
- [ ] Workspace templates
- [ ] Unit templates
- [ ] Quick insert patterns

**Export**
- [ ] Export to markdown
- [ ] Export to PDF
- [ ] Print view

---

## Technical Considerations

### Performance

- **Virtual Scrolling**: For workspaces with 100+ units
- **Lazy Loading**: Load nested content on expand
- **Debounced Saves**: Auto-save with 500ms debounce
- **Optimistic Updates**: Update UI immediately, sync in background

### Data Consistency

- **Soft Deletes**: Units are soft-deleted for undo capability
- **Order Management**: Use fractional indexing for efficient reordering
- **Reference Integrity**: Handle broken references gracefully

### Security

- **RLS Policies**: Users can only access workspaces in their spaces
- **Permission Checks**: Verify reference access before showing previews
- **Audit Trail**: Track who created/modified units (optional)

### Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG AA compliance

---

## Success Metrics

### Adoption
- % of Spaces users who create at least one workspace
- Average number of workspaces per active user
- Average units per workspace

### Engagement
- Workspace edit frequency
- Average workspace lifespan
- Reference usage rate

### Quality
- User satisfaction with workspace flexibility
- Reduction in "document sprawl"
- Increase in cross-system references

---

## Open Questions

1. **Real-time Collaboration**: Do we need real-time collaboration, or is async editing sufficient?
2. **Version History**: Should we track version history for workspaces?
3. **Templates**: What templates would be most valuable?
4. **Mobile Experience**: How should workspace work on mobile devices?
5. **Search**: Should workspace search be global or per-workspace?
6. **Sharing**: Can workspaces be shared between spaces, or are they space-specific?

---

## Next Steps

1. **Review & Approve**: Review this plan with stakeholders
2. **Design Mockups**: Create detailed UI mockups for key flows
3. **Technical Spike**: Prototype drag-and-drop and reference system
4. **Kickoff**: Begin Phase 1 implementation

---

## Appendix: Content Unit Type Specifications

### Text Section
- **Purpose**: Rich text content
- **Properties**: Text content, markdown support
- **Actions**: Edit, delete, convert to bullet/list
- **Nesting**: Can contain other units

### Bullet Points
- **Purpose**: Unordered or ordered lists
- **Properties**: Array of items, ordered flag
- **Actions**: Add/remove items, reorder items, convert to checklist
- **Nesting**: Can contain other units

### Checklist
- **Purpose**: Task-like items with completion state
- **Properties**: Array of items with completion state
- **Actions**: Check/uncheck, add/remove items, convert to bullet
- **Nesting**: Can contain other units

### Collapsible Group
- **Purpose**: Container for nested content
- **Properties**: Title, summary, collapsed state
- **Actions**: Collapse/expand, edit title, delete (with children)
- **Nesting**: Can contain other units

### Callout
- **Purpose**: Highlighted important information
- **Properties**: Text, type (info/warning/success/error)
- **Actions**: Edit, delete, change type
- **Nesting**: Cannot contain other units

### Reference
- **Purpose**: Link to other system items
- **Properties**: Reference type, reference ID, display text, preview
- **Actions**: Edit display text, navigate to source, remove reference
- **Nesting**: Cannot contain other units

### Code Block
- **Purpose**: Code snippets
- **Properties**: Code content, language
- **Actions**: Edit, copy, change language
- **Nesting**: Cannot contain other units

### Divider
- **Purpose**: Visual separation
- **Properties**: Style (solid/dashed/dotted)
- **Actions**: Change style, delete
- **Nesting**: Cannot contain other units
