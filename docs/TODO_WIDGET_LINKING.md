# To-Do Widget Linking System

**Document Purpose**: Documentation of the intelligent widget linking system that connects todos to relevant widgets in the app.

**Last Updated**: February 2025  
**Status**: Implementation Complete

---

## Overview

The To-Do widget is no longer an isolated component. It's now intelligently integrated with other widgets in the app, allowing users to seamlessly navigate from a todo to the relevant widget that helps them complete it.

**Example**: A todo "Write in journal" now has a link button that takes you directly to the Journal widget.

---

## Architecture

### Core Components

1. **Task Library** (`src/lib/taskLibrary.ts`)
   - Contains 50+ pre-populated tasks
   - Each task can have a `linkedWidgetType` and `linkedWidgetLabel`
   - Tasks are searchable and categorized

2. **Widget Linking Service** (`src/lib/widgetLinking.ts`)
   - `findWidgetByType()`: Finds a widget by type in a space
   - `getWidgetRoute()`: Generates navigation route to a widget
   - `getAvailableWidgets()`: Gets all widgets in a space, grouped by type
   - `isWidgetAvailable()`: Checks if a widget type exists in a space

3. **Todo Widget** (`src/components/fridge-canvas/widgets/TodoCanvasWidget.tsx`)
   - Detects widget links for todos
   - Shows link buttons on relevant todos
   - Handles navigation to widgets

---

## How It Works

### 1. Task-to-Widget Mapping

Tasks in the library can specify which widget they relate to:

```typescript
{
  id: 'journal',
  title: 'Write in journal',
  emoji: '📔',
  linkedWidgetType: 'journal',
  linkedWidgetLabel: 'Journal',
  // ... other fields
}
```

### 2. Automatic Link Detection

When a todo is created (manually or from library):

1. System checks if the todo title matches a task template
2. If match found and template has `linkedWidgetType`:
   - System searches for that widget type in the current space
   - If widget exists, creates a link
   - Link is stored in `widgetLinksByTodoId` state

### 3. Visual Indicators

**In Todo List**:
- Todos with widget links show an "Open [Widget]" button
- Button appears next to the todo title
- Only shown for active (non-completed) todos
- Uses emerald color to match todo theme

**In Search Results**:
- Tasks with widget links show a small link icon
- Widget label shown on hover (desktop) or inline (mobile)

**In Quick Suggestions**:
- Widget link icon shown next to task title
- Indicates the task will link to a widget

### 4. Navigation

Clicking a widget link button:
- Navigates to `/spaces/:spaceId/app/:widgetId`
- Opens the widget in full-screen app view
- Preserves context (user stays in their space)

---

## Current Widget Links

### Implemented Links

| Task | Widget | Use Case |
|------|--------|----------|
| Write in journal | Journal | Navigate to journal to write entry |
| Check today's plan | Calendar | View calendar/planner |
| Make a grocery list | Grocery List | Add items to grocery list |
| Eat a meal | Meal Planner | Plan or view meals |
| Schedule an appointment | Calendar | Add event to calendar |
| Write for 5 minutes | Workspace | Open workspace to write |
| Make a simple list | Notes | Create a note/list |

### Widget Types Available

- `journal` - Journal widget
- `calendar` - Calendar widget
- `grocery_list` - Grocery List widget
- `meal_planner` - Meal Planner widget
- `workspace` - Workspace widget
- `note` - Notes widget
- `todos` - To-Do List widget (self-reference)
- And more...

---

## User Experience Flow

### Scenario 1: Adding a Task from Library

1. User searches for "journal" in task library
2. Sees "📔 Write in journal" with link icon
3. Clicks to add task
4. Todo is created with title "Write in journal"
5. System detects journal widget in space
6. Link button appears: "Open Journal"
7. User clicks link → navigates to Journal widget

### Scenario 2: Manual Todo Creation

1. User types "Write in journal" manually
2. System matches to task template
3. Shows template prompt: "Want to make this easier?"
4. User accepts → steps added
5. System detects journal widget
6. Link button appears automatically

### Scenario 3: Widget Not Available

1. User creates "Write in journal" todo
2. System checks for journal widget
3. Widget not found in space
4. No link button shown (graceful degradation)
5. Todo still works normally

---

## Technical Implementation

### State Management

```typescript
// Widget linking state
const [availableWidgets, setAvailableWidgets] = useState<Map<string, WidgetWithLayout>>(new Map());
const [widgetLinksByTodoId, setWidgetLinksByTodoId] = useState<Record<string, {
  widgetId: string;
  widgetType: string;
  label: string;
}>>({});
```

### Link Detection Logic

```typescript
const updateWidgetLinks = async () => {
  for (const todo of todos) {
    const matchingTemplate = findMatchingTemplate(todo.title);
    if (matchingTemplate?.linkedWidgetType) {
      const widget = await findWidgetByType(personalSpaceId, matchingTemplate.linkedWidgetType);
      if (widget) {
        links[todo.id] = {
          widgetId: widget.id,
          widgetType: matchingTemplate.linkedWidgetType,
          label: matchingTemplate.linkedWidgetLabel || matchingTemplate.linkedWidgetType,
        };
      }
    }
  }
  setWidgetLinksByTodoId(links);
};
```

### Navigation Handler

```typescript
const handleNavigateToWidget = (todoId: string, e: React.MouseEvent) => {
  e.stopPropagation(); // Prevent todo toggle
  const link = widgetLinksByTodoId[todoId];
  if (link && personalSpaceId) {
    const route = getWidgetRoute(personalSpaceId, link.widgetId);
    if (route) {
      navigate(route);
    }
  }
};
```

---

## Benefits

### For Users

1. **Reduced Friction**: No need to manually find widgets
2. **Context Preservation**: Stay in the flow of completing tasks
3. **Discoverability**: Learn which widgets exist and what they do
4. **Integration**: Todos feel like part of a unified system

### For the App

1. **Cohesion**: Widgets work together, not in isolation
2. **Intelligence**: System understands relationships between features
3. **Helpfulness**: Proactively guides users to the right tools
4. **ADHD-Friendly**: Reduces executive function load (no need to remember where things are)

---

## Future Enhancements

### Potential Additions

1. **Bidirectional Links**: Widgets can create todos that link back
2. **Smart Suggestions**: Suggest relevant widgets when creating todos
3. **Widget Context**: Pass context from todo to widget (e.g., "Write about today")
4. **Completion Tracking**: Mark todo as done when widget action completes
5. **Widget-Specific Todos**: Todos created from widgets automatically link back

### Example: Journal Widget Integration

When user creates a todo "Write in journal":
- Todo links to Journal widget
- Clicking link opens Journal with pre-filled context
- After writing entry, option to mark todo as complete
- Creates a seamless workflow

---

## Design Principles

### 1. Optional, Not Required

- Widget links are helpful additions, not requirements
- Todos work perfectly fine without links
- No pressure or forced navigation

### 2. Progressive Disclosure

- Links only shown when relevant
- Not cluttered with unnecessary buttons
- Visual indicators are subtle but clear

### 3. Graceful Degradation

- If widget doesn't exist, no link shown
- No errors or broken states
- System continues to work normally

### 4. ADHD-Friendly

- Reduces need to remember where things are
- Provides clear visual cues
- Makes the system feel more helpful and intelligent

---

## Testing Checklist

- [ ] Todo with widget link shows button
- [ ] Clicking link navigates to correct widget
- [ ] Link only shown for active todos
- [ ] Link hidden if widget doesn't exist
- [ ] Search results show widget indicators
- [ ] Quick suggestions show widget indicators
- [ ] Links update when widgets are added/removed
- [ ] Navigation preserves space context

---

## Related Documentation

- **Todo Widget Architecture**: `docs/TODO_WIDGET_ARCHITECTURE.md`
- **Widget Registry**: `src/spacesOS/widgets/widgetRegistry.ts`
- **Task Library**: `src/lib/taskLibrary.ts`

---

**End of Document**
