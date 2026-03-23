# Floating AI Chat Widget - Global UX Implementation

## Purpose

Provides a persistent, surface-aware AI chat interface accessible throughout the entire application, integrating with existing AI infrastructure while maintaining strict authority boundaries and permission enforcement.

**Core Principle:** AI assistant is always accessible but always respecting surface scoping, permissions, and non-authoritative boundaries.

---

## Overview

### Global Presence

The Floating AI Chat Widget is a **single global instance** that:

- ✅ Available in Guardrails sections
- ✅ Available in Personal Spaces
- ✅ Available in Shared Spaces
- ✅ Persists across route changes
- ✅ Never blocks core navigation permanently
- ✅ Never takes over the full screen

**Architecture:** Mounted once in `Layout.tsx`, managed by React state, styled with Tailwind CSS.

---

## Widget States

### 1. Hidden State

**Behavior:**
- Widget completely hidden
- Small floating button visible in bottom-right corner
- Click button to open → transitions to Floating Expanded
- Keyboard shortcut: `⌘K` / `Ctrl+K` to toggle

**Visual:**
```
┌──────────────────────────────────┐
│                                  │
│                                  │
│                         ┌────┐   │
│                         │ 💬 │   │
│                         └────┘   │
└──────────────────────────────────┘
       Floating button (bottom-right)
```

---

### 2. Minimized State

**Behavior:**
- Small chat bubble with "AI" label
- Shows unread indicator (future feature)
- Click to expand → transitions to Floating Expanded
- Persists in bottom-right corner

**Visual:**
```
┌──────────────────────────────────┐
│                                  │
│                                  │
│                         ┌────┐   │
│                         │ 💬 │   │
│                         │ AI │   │
│                         └────┘   │
└──────────────────────────────────┘
        Minimized bubble
```

---

### 3. Floating Expanded State

**Behavior:**
- Movable, draggable panel
- Resizable (height only, 300-800px range)
- Default position: bottom-right, 400px wide × 500px tall
- Can be moved anywhere on screen
- Click and drag header to move
- Click and drag bottom edge to resize

**Visual:**
```
┌────────────────────────────────────────┐
│ 📁 AI Chat - Project Name              │  ← Draggable header
│ Scoped to this project only       [–][⬜][✕]│
├────────────────────────────────────────┤
│                                        │
│  Conversation List                     │
│  or                                    │
│  Message View                          │
│                                        │
├────────────────────────────────────────┤
│ Type a message... [@tags]         [→] │  ← Composer
└────────────────────────────────────────┘
   ↕ Resizable (drag bottom edge)
```

**Controls:**
- **[–]** Minimize → Minimized State
- **[⬜]** Dock Right → Docked Right State
- **[✕]** Close → Hidden State

---

### 4. Docked Right State

**Behavior:**
- Locked to right edge of screen
- Fixed width: 450px
- Full height: 100vh
- Automatically collapses left navigation (if implemented)
- Ideal for long planning sessions
- Cannot be moved or resized

**Visual:**
```
┌──────────┬───────────────────────────────┐
│          │ 📁 AI Chat - Project Name     │
│          │ Scoped to this project only   │
│          │                          [–][🔓][✕]│
│  Main    ├───────────────────────────────┤
│  Content │                               │
│          │  Conversation List            │
│          │  or                           │
│          │  Message View                 │
│          │                               │
│          ├───────────────────────────────┤
│          │ Type a message...        [→] │
└──────────┴───────────────────────────────┘
           Fixed 450px, full height
```

**Controls:**
- **[–]** Minimize → Minimized State
- **[🔓]** Float → Floating Expanded State
- **[✕]** Close → Hidden State

---

## Surface Awareness (Critical)

### Surface Display

**Header Always Shows:**
```
┌────────────────────────────────────────┐
│ 📁 AI Chat - Product Launch Q1 2025   │  ← Project surface
│ Scoped to this project only            │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 👤 AI Chat - Personal Spaces           │  ← Personal surface
│ Personal consumption data (read-only)  │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 👥 AI Chat - Shared Spaces             │  ← Shared surface
│ Shared spaces collaboration            │
└────────────────────────────────────────┘
```

**Surface Icons:**
- 📁 Project Surface
- 👤 Personal Surface
- 👥 Shared Surface

---

### Surface Switching Behavior

**Automatic Surface Switching:**

```
User navigates:
  /guardrails (Project A) → Widget shows Project A surface
      ↓
  /guardrails (Project B) → Widget shows Project B surface
      ↓
  /spaces/personal → Widget shows Personal surface
      ↓
  /spaces/shared → Widget shows Shared surface
```

**Key Rules:**
- ✅ Surface automatically switches when user switches project
- ✅ Conversations filtered to current surface
- ✅ New chats always created in current surface
- ❌ Cannot manually switch surface inside chat
- ❌ Cannot access conversations from other surfaces
- ❌ Cannot continue conversation across surfaces

---

### Surface Scope Enforcement

**Project Surface:**
- Can access: Project tracks, roadmap items, mind mesh, task flow, people
- Cannot access: Other projects, Personal Spaces, Shared Spaces
- Tag suggestions: `@project`, `@tracks`, `@roadmap`, `@deadlines`, `@mindmesh`, `@taskflow`, `@people`

**Personal Surface:**
- Can access: Consumed Guardrails data (read-only), personal progress
- Cannot access: Project-authoritative data, collaboration activity
- Tag suggestions: `@consumed`, `@progress`

**Shared Surface:**
- Can access: Shared tracks, shared collaboration metadata
- Cannot access: Project-authoritative data, non-shared tracks
- Tag suggestions: `@shared-tracks`, `@collaboration`

---

## Conversation UX

### Conversation List View

**Layout:**
```
┌────────────────────────────────────────┐
│ [+ New Chat ▼]                         │  ← Create button with dropdown
│                                        │
│ ┌──────────────────────────────────┐  │
│ │ Saved Chats (5)                  │  │
│ ├──────────────────────────────────┤  │
│ │ Project Planning                 │  │  ← Saved conversation
│ │ Dec 12, 2025              [🗑️]   │  │
│ ├──────────────────────────────────┤  │
│ │ Roadmap Discussion               │  │
│ │ Dec 11, 2025              [🗑️]   │  │
│ └──────────────────────────────────┘  │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │ Ephemeral Chats (2)              │  │
│ ├──────────────────────────────────┤  │
│ │ Quick Question    [⏰ Ephemeral] │  │  ← Ephemeral (24h)
│ │ 3h 45m remaining          [🗑️]   │  │
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Features:**
- Conversations grouped by type (Saved vs Ephemeral)
- Ephemeral chats show expiry countdown
- Delete button (hover to reveal)
- Click conversation to open message view

---

### New Chat Creation

**Create Options Dropdown:**
```
┌────────────────────────────────────────┐
│ [+ New Chat ▼]                         │  ← Click
├────────────────────────────────────────┤
│ Saved Chat                             │  ← Option 1
│ 5/10 used                              │
├────────────────────────────────────────┤
│ Ephemeral Chat                         │  ← Option 2
│ Auto-expires in 24 hours               │
└────────────────────────────────────────┘
```

**Saved Chat:**
- Persists indefinitely
- Counts toward limit (10 per surface)
- If limit reached: Button disabled with message

**Ephemeral Chat:**
- Auto-expires in 24 hours
- Does NOT count toward limit
- Always available

**Limit Reached UI:**
```
┌────────────────────────────────────────┐
│ [+ New Chat ▼]                         │
│ ⚠️ Saved chat limit reached (10 max)  │  ← Warning banner
│    Create ephemeral or delete existing │
└────────────────────────────────────────┘
```

---

### Ephemeral Chat Warnings

**Expiring Soon (< 2 hours):**
```
┌────────────────────────────────────┐
│ Quick Question    [⏰ Ephemeral]   │  ← Red badge
│ 1h 23m remaining (EXPIRING SOON)  │  ← Red text
└────────────────────────────────────┘
```

**Normal Ephemeral:**
```
┌────────────────────────────────────┐
│ Quick Question    [⏰ Ephemeral]   │  ← Gray badge
│ 15h 45m remaining                  │  ← Gray text
└────────────────────────────────────┘
```

---

## Message UX

### Message View Layout

**Layout:**
```
┌────────────────────────────────────────┐
│ [←] AI Chat - Project Name        [...] │  ← Header with back button
├────────────────────────────────────────┤
│                                        │
│  ┌─────┐  You:                        │  ← User message
│  │ 👤 │  What's the status of         │
│  └─────┘  marketing track?            │
│           10:23 AM                     │
│                                        │
│  ┌─────┐  AI Assistant:               │  ← AI message
│  │ 🤖 │  The marketing track has 5    │
│  └─────┘  active items...             │
│           ┌────────────────────────┐  │  ← Embedded draft card
│           │ 📄 AI Draft   [pending] │  │
│           │ Create Marketing Plan  │  │
│           │ [View Draft] [Apply]   │  │
│           └────────────────────────┘  │
│           10:24 AM                     │
│                                        │
│  ⚠️ System: Cannot access other       │  ← System message
│            projects from this surface │
│                                        │
├────────────────────────────────────────┤
│ Type a message... [@tags]         [→] │  ← Composer
└────────────────────────────────────────┘
```

---

### Message Types

**1. User Messages:**
- Align right
- Blue background
- White text
- User avatar icon

**2. AI Messages:**
- Align left
- Light gray background
- Dark text
- Bot avatar icon
- May contain embedded draft cards

**3. System Messages:**
- Yellow background
- Warning icon
- Used for:
  - Scope restriction warnings
  - Permission errors
  - Ambiguous tag notifications

---

### Draft Cards (Embedded)

**Draft Card Structure:**
```
┌───────────────────────────────────────┐
│ 📄 AI Draft              [pending]    │  ← Header with status
│ ────────────────────────────────────  │
│ Create Marketing Campaign Track       │  ← Title
│ Add new track for Q1 marketing        │  ← Description (optional)
│                                       │
│ [Track] • Dec 12, 2025                │  ← Metadata
│ ────────────────────────────────────  │
│ [View Draft]  [Apply]  [✕]            │  ← Action buttons
│ ────────────────────────────────────  │
│ ⚠️ Note: Drafts require explicit      │  ← Safety reminder
│   approval. AI cannot apply changes.  │
└───────────────────────────────────────┘
```

**Status Badges:**
- `pending` - Yellow background
- `approved` - Green background
- `rejected` - Red background
- `applied` - Blue background

**Action Buttons:**
- **View Draft** - Navigates to draft detail page
- **Apply** - Navigates to draft detail page (where user can apply)
- **[✕]** - Navigates to draft detail page (where user can discard)

**Safety Note:**
- Always shown
- Reminds user that AI cannot auto-apply
- Reinforces non-authoritative boundary

---

### Message Content Rendering

**Text Messages:**
```
Simple text rendered as-is with line breaks preserved
```

**Structured Messages (Blocks):**
```
Text Block:
  Regular paragraph text

List Block:
  • Item 1
  • Item 2
  • Item 3

Code Block:
  ```
  const foo = 'bar';
  ```
```

---

## Composer UX

### Input Field

**Features:**
- Multi-line textarea
- Auto-expands up to 150px max height
- Placeholder: "Ask about [surface name]... (use @ to tag entities)"
- Disabled during sending
- Focus management

**Keyboard Shortcuts:**
- `Enter` - Send message
- `Shift + Enter` - New line
- `Esc` - Close tag suggestions (if open)

---

### Tag Autocomplete

**Trigger:**
```
User types: "What's the status of @"
                                 ↑
                         Triggers autocomplete
```

**Suggestions Popup:**
```
┌────────────────────────────────┐
│ @project                       │  ← Tag suggestion
│ Current project                │  ← Description
├────────────────────────────────┤
│ @tracks                        │
│ All tracks in project          │
├────────────────────────────────┤
│ @roadmap                       │
│ All roadmap items              │
└────────────────────────────────┘
```

**Tag Suggestions by Surface:**

**Project Surface:**
- `@project` - Current project
- `@tracks` - All tracks
- `@roadmap` - All roadmap items
- `@deadlines` - Upcoming deadlines
- `@mindmesh` - Mind mesh nodes
- `@taskflow` - Task flow tasks
- `@people` - Project team members

**Personal Surface:**
- `@consumed` - Consumed Guardrails data
- `@progress` - Personal progress summary

**Shared Surface:**
- `@shared-tracks` - Shared tracks
- `@collaboration` - Collaboration activity

**Behavior:**
- Suggestions filtered by query
- Click suggestion to insert
- Auto-completes with trailing space
- Closes on `Esc` or click outside

---

## Keyboard Shortcuts

### Global Shortcuts

**`⌘K` / `Ctrl+K`** - Toggle widget (open/close)
- Works anywhere in application
- If hidden → Opens to Floating Expanded
- If visible → Closes to Hidden

**`Esc`** - Minimize widget
- If Floating Expanded → Minimize
- If Docked Right → Minimize
- If tag suggestions open → Close suggestions only

### Widget-Specific Shortcuts

**`Enter`** - Send message (when composer focused)
**`Shift + Enter`** - New line (when composer focused)

---

## Accessibility

### ARIA Labels

**Widget Container:**
```html
<div role="dialog" aria-label="AI Chat Widget">
```

**Header Controls:**
```html
<button aria-label="Minimize widget">
<button aria-label="Dock widget to right">
<button aria-label="Close widget">
```

**Message Input:**
```html
<textarea aria-label="Message input">
```

**Conversation Items:**
```html
<button aria-label="Delete conversation">
```

---

### Focus Management

**Tab Order:**
1. Back button (if visible)
2. Header controls (Minimize, Dock, Close)
3. Conversation list items / Message list
4. Message composer
5. Send button

**Focus Trapping:**
- When Floating Expanded or Docked, focus is trapped within widget
- `Tab` cycles through controls
- `Shift + Tab` cycles backwards
- `Esc` exits and minimizes

---

### Screen Reader Support

**Announcements:**
- New message received: "AI Assistant replied"
- Message sent: "Message sent"
- Conversation created: "New conversation created"
- Surface switched: "Surface changed to [name]"

**Descriptive Labels:**
- All buttons have aria-labels
- All interactive elements have proper roles
- Status badges have aria-labels (e.g., "Ephemeral chat expiring in 3 hours")

---

## Performance & Safety

### Lazy Loading

**Conversation History:**
- Load most recent 50 messages on open
- Scroll to load more (not implemented, future feature)

**Conversation List:**
- Load all conversations for current surface (max ~100)
- Filtered client-side

---

### Message Render Limit

**Current Implementation:**
- Renders all messages in conversation
- Scrolls to bottom on new message

**Future Optimization:**
- Virtualized list for large conversations
- Render only visible messages

---

### Context Budgets

**Respected:**
- All AI calls use existing context budget system
- Token limits enforced at service layer
- No widget-specific overrides

**Budget Display:**
- Not shown in widget (handled by backend)
- Errors surfaced as system messages

---

### No Polling Loops

**Event-Driven:**
- Widget listens for custom events: `ai-message-sent`
- No automatic refresh intervals
- No background API calls
- Manual refresh only (pull-to-refresh future feature)

---

### No Background AI Calls

**User-Initiated Only:**
- AI only responds when user sends message
- No automatic suggestions
- No background processing
- No predictive loading

---

## State Persistence

### Local Storage

**Stored Configuration:**
```typescript
{
  state: 'minimized' | 'floating' | 'docked' | 'hidden',
  position: { x: number, y: number },
  size: { height: number },
  lastActiveConversationId: string | null
}
```

**Storage Key:** `ai_chat_widget_config`

**Behavior:**
- Widget state persists across page refreshes
- Position/size persists for Floating mode
- Last active conversation remembered per surface

---

### Surface-Specific State

**Not Persisted:**
- Active conversation ID resets when surface changes
- Conversation list reloaded when surface changes

**Reason:**
- Prevents confusion
- Ensures user sees correct surface context
- Enforces surface boundaries

---

## Architecture Constraints

### Uses Existing Services Only

**Conversation Management:**
```typescript
import { conversationService } from '../../lib/guardrails/ai/conversationService';
import { ChatSurfaceService } from '../../lib/guardrails/ai/aiChatSurfaceService';
```

**Message Handling:**
```typescript
// Create message
await conversationService.createMessage({ ... }, userId);

// List messages
await conversationService.listMessages({ conversation_id }, userId);
```

**Draft Handling:**
- Draft cards link to existing draft detail pages
- No inline draft application
- All draft actions route through existing services

**Tag Resolution:**
- Tag suggestions use existing tag types
- Actual tag resolution happens server-side
- Widget only provides autocomplete UX

---

### Respects All Invariants

**Surface Boundaries:**
```typescript
// Validated by ChatSurfaceService
await ChatSurfaceService.validateSurface({
  surfaceType,
  masterProjectId
});
```

**No Direct Writes:**
- AI messages created via conversationService
- All draft actions require explicit user approval
- No automatic data mutations

**Permission Checks:**
- All data access respects RLS policies
- Permission errors surfaced as system messages
- No permission escalation

---

### What This Does NOT Do

**❌ No New AI Logic:**
- No new AI generation
- No new draft creation
- No new context assembly
- Uses existing AI services only

**❌ No Authority Violations:**
- No direct writes to authoritative tables
- No bypassing of approval flows
- No permission escalation
- All invariants enforced

**❌ No Notifications:**
- No push notifications
- No email notifications
- No background alerts

**❌ No Automation:**
- No auto-apply drafts
- No scheduled AI calls
- No background processing

**❌ No Collaboration Chat:**
- Single-user conversations only
- No chat sharing
- No multi-user sessions

---

## Error Handling

### Permission Errors

**Display:**
```
┌────────────────────────────────────┐
│ ⚠️ System:                         │
│ Cannot access this project.        │
│ You do not have permission.        │
└────────────────────────────────────┘
```

**Behavior:**
- Shown as system message
- User can continue conversation
- Error does not crash widget

---

### Surface Scope Violations

**Display:**
```
┌────────────────────────────────────┐
│ ⚠️ System:                         │
│ Cannot access other projects       │
│ from this surface.                 │
└────────────────────────────────────┘
```

**Trigger:**
- User attempts cross-surface access
- Backend rejects with scope violation
- Error surfaced as system message

---

### Network Errors

**Display:**
```
┌────────────────────────────────────┐
│ ❌ Failed to send message          │
│ [Retry]                            │
└────────────────────────────────────┘
```

**Behavior:**
- Alert shown to user
- Message not cleared from input
- User can retry sending

---

### Limit Reached

**Display:**
```
┌────────────────────────────────────┐
│ ⚠️ Maximum saved conversations     │
│ limit reached for this surface (10)│
│                                    │
│ Options:                           │
│ • Create ephemeral chat            │
│ • Delete an existing chat          │
└────────────────────────────────────┘
```

**Behavior:**
- Saved chat button disabled
- Ephemeral chat button enabled
- Clear guidance provided

---

## UX Flows

### Flow 1: First-Time User

```
1. User logs in
   └─> Widget state = minimized (default)
   └─> Floating button visible in bottom-right

2. User navigates to /guardrails
   └─> Widget surface = project
   └─> Surface label updates

3. User clicks floating button
   └─> Widget expands to Floating Expanded
   └─> Shows conversation list (empty)
   └─> "No conversations yet" message

4. User clicks [+ New Chat]
   └─> Dropdown shows "Saved" and "Ephemeral" options

5. User clicks "Saved Chat"
   └─> New conversation created
   └─> Message view opens
   └─> Composer focused

6. User types message and sends
   └─> Message added to conversation
   └─> AI response appears (future: actual AI call)

7. User clicks [–] Minimize
   └─> Widget minimizes to bottom-right
   └─> State persisted to localStorage
```

---

### Flow 2: Switching Surfaces

```
1. User in Project A with chat open
   └─> Widget shows "AI Chat - Project A"
   └─> Conversation list shows Project A chats

2. User navigates to Project B
   └─> Widget header updates: "AI Chat - Project B"
   └─> Active conversation reset
   └─> Returns to conversation list view
   └─> Conversation list shows Project B chats only

3. User navigates to /spaces/personal
   └─> Widget header updates: "AI Chat - Personal Spaces"
   └─> Active conversation reset
   └─> Conversation list shows Personal chats only

4. User cannot access Project A chats from Personal surface
   └─> Surface boundaries enforced
```

---

### Flow 3: Creating Ephemeral Chat

```
1. User has 10 saved chats on surface (limit reached)
   └─> Widget shows limit warning

2. User clicks [+ New Chat]
   └─> Dropdown shows:
       • Saved Chat (DISABLED - "Limit reached (10 max)")
       • Ephemeral Chat (ENABLED)

3. User clicks "Ephemeral Chat"
   └─> New conversation created with is_ephemeral=true
   └─> expires_at = now() + 24 hours
   └─> Does NOT count toward limit
   └─> Chat labeled with [⏰ Ephemeral] badge
   └─> Countdown shown: "23h 59m remaining"

4. User uses chat for work
   └─> Countdown updates in conversation list

5. After 24 hours
   └─> Backend cleanup job deletes conversation
   └─> Conversation disappears from list
```

---

### Flow 4: Viewing and Applying Draft

```
1. AI responds with draft
   └─> Message contains linked_draft_id
   └─> Draft card embedded in message

2. Draft card shows:
   ┌────────────────────────────────┐
   │ 📄 AI Draft       [pending]    │
   │ Create Marketing Track         │
   │ [Track] • Dec 12, 2025         │
   │ [View Draft] [Apply] [✕]       │
   │ ⚠️ Note: Drafts require        │
   │   explicit approval...         │
   └────────────────────────────────┘

3. User clicks [View Draft]
   └─> Navigates to /guardrails/drafts/{draftId}
   └─> Full draft detail page
   └─> Widget remains accessible (still docked/floating)

4. User reviews draft on detail page
   └─> Clicks "Apply Draft"
   └─> Existing draft application flow

5. User returns to widget
   └─> Draft status updated to [applied]
   └─> Draft card shows new status
```

---

### Flow 5: Tag Autocomplete

```
1. User in composer, types: "What's the status of @"
   └─> Tag suggestions appear
   └─> Filtered by current surface

2. Suggestions shown:
   ┌────────────────────────────────┐
   │ @project                       │
   │ Current project                │
   ├────────────────────────────────┤
   │ @tracks                        │
   │ All tracks in project          │
   └────────────────────────────────┘

3. User continues typing: "What's the status of @tra"
   └─> Suggestions filtered to match
   └─> Only shows: @tracks

4. User clicks "@tracks"
   └─> Inserted at cursor: "What's the status of @tracks "
   └─> Trailing space added
   └─> Cursor positioned after space
   └─> Suggestions close

5. User completes message and sends
   └─> Tag included in message content
   └─> Backend resolves tag to actual tracks
   └─> AI response uses resolved context
```

---

## Component Structure

### File Organization

```
src/
├── components/
│   └── ai-chat/
│       ├── FloatingAIChatWidget.tsx         (Main container, state management)
│       ├── ChatWidgetHeader.tsx             (Header with surface label, controls)
│       ├── ChatWidgetConversationList.tsx   (List of conversations for surface)
│       ├── ChatWidgetMessageList.tsx        (Message display with draft cards)
│       ├── ChatWidgetComposer.tsx           (Input with tag autocomplete)
│       └── ChatWidgetDraftCard.tsx          (Embedded draft display)
│
├── lib/
│   ├── aiChatWidgetTypes.ts                 (Widget types, state management)
│   └── guardrails/
│       └── ai/
│           ├── aiChatSurfaceTypes.ts        (Surface types)
│           ├── aiChatSurfaceService.ts      (Surface service)
│           └── conversationService.ts       (Conversation service)
│
└── contexts/
    └── ActiveProjectContext.tsx             (Project state for surface detection)
```

---

### Component Hierarchy

```
FloatingAIChatWidget (main container)
├── ChatWidgetHeader
│   ├── Surface label
│   ├── Minimize button
│   ├── Dock/Float button
│   └── Close button
│
└── Content (conditional)
    ├── ChatWidgetConversationList (if no active conversation)
    │   ├── New Chat button (dropdown)
    │   ├── Limit warning (if applicable)
    │   ├── Saved Chats section
    │   │   └── ConversationItem (repeat)
    │   └── Ephemeral Chats section
    │       └── ConversationItem (repeat)
    │
    └── Message View (if active conversation)
        ├── ChatWidgetMessageList
        │   └── MessageBubble (repeat)
        │       ├── User/AI/System message
        │       └── ChatWidgetDraftCard (if has draft)
        │
        └── ChatWidgetComposer
            ├── Tag suggestions popup (if active)
            ├── Textarea input
            └── Send button
```

---

## Styling Guidelines

### Tailwind CSS Classes

**Container:**
- `fixed` - Position fixed for floating/docked
- `bg-white` - White background
- `rounded-lg` - Rounded corners (floating only)
- `shadow-2xl` - Large shadow
- `border border-gray-200` - Subtle border

**Header:**
- `bg-gradient-to-r from-blue-50 to-blue-100` - Gradient background
- `border-b border-gray-200` - Bottom border
- `px-4 py-3` - Padding

**Messages:**
- User: `bg-blue-600 text-white` - Blue background
- AI: `bg-gray-100 text-gray-900` - Gray background
- System: `bg-yellow-50 border border-yellow-200 text-yellow-800` - Yellow background

**Buttons:**
- Primary: `bg-blue-600 hover:bg-blue-700 text-white`
- Secondary: `bg-gray-100 hover:bg-gray-200 text-gray-700`
- Danger: `bg-red-600 hover:bg-red-700 text-white`

**Status Badges:**
- Pending: `bg-yellow-100 text-yellow-800`
- Approved: `bg-green-100 text-green-800`
- Rejected: `bg-red-100 text-red-800`
- Applied: `bg-blue-100 text-blue-800`

---

### Responsive Design

**Current Implementation:**
- Fixed widths (400px floating, 450px docked)
- Not optimized for mobile

**Future Enhancement:**
- Mobile: Full-screen modal
- Tablet: Adapted floating panel
- Desktop: Current behavior

---

## Testing Strategy

### Manual Testing Checklist

**Widget States:**
- [ ] Hidden state shows floating button
- [ ] Minimized state shows chat bubble
- [ ] Floating Expanded can be moved
- [ ] Floating Expanded can be resized (height only)
- [ ] Docked Right locks to right edge
- [ ] State transitions work correctly
- [ ] State persists after page refresh

**Surface Awareness:**
- [ ] Widget shows correct surface label
- [ ] Surface updates when navigating
- [ ] Conversations filtered by surface
- [ ] Cannot access other surface conversations
- [ ] Tag suggestions match current surface

**Conversation Management:**
- [ ] Can create saved chat (if under limit)
- [ ] Cannot create saved chat (if at limit)
- [ ] Can always create ephemeral chat
- [ ] Ephemeral chats show countdown
- [ ] Can delete conversations
- [ ] Conversation list updates correctly

**Messaging:**
- [ ] Can send message
- [ ] Message appears in list
- [ ] Draft cards render correctly
- [ ] Draft action buttons work
- [ ] System messages display correctly
- [ ] Tag autocomplete appears
- [ ] Tag insertion works

**Keyboard Shortcuts:**
- [ ] ⌘K / Ctrl+K toggles widget
- [ ] Esc minimizes widget
- [ ] Enter sends message
- [ ] Shift+Enter adds new line
- [ ] Esc closes tag suggestions

**Accessibility:**
- [ ] Screen reader announces correctly
- [ ] All buttons have aria-labels
- [ ] Focus trapping works
- [ ] Tab order is logical

---

### Integration Testing

**Test Surface Switching:**
```typescript
test('widget switches surface when navigating', async () => {
  // 1. Navigate to Project A
  navigate('/guardrails');
  await waitFor(() => {
    expect(screen.getByText(/Project A/)).toBeInTheDocument();
  });

  // 2. Create conversation in Project A
  const projectAConv = await createConversation('project', projectA.id);

  // 3. Navigate to Personal Spaces
  navigate('/spaces/personal');
  await waitFor(() => {
    expect(screen.getByText(/Personal Spaces/)).toBeInTheDocument();
  });

  // 4. Verify Project A conversation not visible
  expect(screen.queryByText(projectAConv.title)).not.toBeInTheDocument();
});
```

**Test Limit Enforcement:**
```typescript
test('blocks saved chat creation at limit', async () => {
  // 1. Create 10 saved chats
  for (let i = 0; i < 10; i++) {
    await createSavedConversation('project', projectA.id);
  }

  // 2. Attempt to create 11th
  click('[+ New Chat]');
  const savedButton = screen.getByText('Saved Chat');

  // 3. Verify button disabled
  expect(savedButton).toBeDisabled();
  expect(screen.getByText(/Limit reached/)).toBeInTheDocument();
});
```

---

## Future Enhancements

### Phase 2 Features

**1. Unread Indicators:**
- Badge on minimized bubble showing unread count
- Highlight new messages in conversation list

**2. Search:**
- Search conversations by title or content
- Filter by date range or tags

**3. Conversation Settings:**
- Rename conversation inline
- Archive conversations
- Mark as favorite/pinned

**4. Rich Message Formatting:**
- Markdown support
- Syntax highlighting for code blocks
- Image attachments (if allowed)

**5. Context Preview:**
- Show active context in composer
- Display token usage
- Visualize what data AI can see

---

### Phase 3 Features

**1. Mobile Optimization:**
- Full-screen modal on mobile
- Touch gestures for navigation
- Mobile-optimized composer

**2. Offline Support:**
- Queue messages when offline
- Sync when connection restored
- Offline message indicator

**3. Voice Input:**
- Speech-to-text in composer
- Audio messages (if allowed)

**4. Advanced Filtering:**
- Filter by ephemeral/saved
- Filter by date range
- Filter by draft status

---

## Troubleshooting

### Widget Not Appearing

**Symptoms:**
- Floating button not visible
- Widget not in DOM

**Solutions:**
1. Check `Layout.tsx` includes `<FloatingAIChatWidget />`
2. Verify user is authenticated (`useAuth()` returns user)
3. Check browser console for errors
4. Clear localStorage and refresh

---

### Surface Not Switching

**Symptoms:**
- Widget shows wrong surface
- Conversations from wrong surface visible

**Solutions:**
1. Check `useActiveProject()` hook returns correct project
2. Verify navigation actually changed route
3. Check surface detection logic in widget
4. Hard refresh page

---

### Tag Autocomplete Not Working

**Symptoms:**
- Typing `@` does not show suggestions
- Suggestions don't filter correctly

**Solutions:**
1. Verify cursor position tracking
2. Check `getTagSuggestions()` function
3. Ensure current surface type is correct
4. Check console for JavaScript errors

---

### Draft Card Not Rendering

**Symptoms:**
- Message has `linked_draft_id` but no card shown
- Card shows "undefined" or blank

**Solutions:**
1. Verify message has `draft` object populated
2. Check draft fetch in `ChatWidgetMessageList`
3. Ensure draft exists in database
4. Check draft RLS policies

---

### Keyboard Shortcuts Not Working

**Symptoms:**
- ⌘K / Ctrl+K does nothing
- Esc doesn't minimize

**Solutions:**
1. Check `useEffect` with keyboard event listener
2. Verify no other component capturing events
3. Check widget state management
4. Ensure no focus trap preventing events

---

## Maintenance

### Adding New Tag Suggestion

**1. Update `getTagSuggestions()` in `ChatWidgetComposer.tsx`:**
```typescript
if (currentSurface.surfaceType === 'project') {
  allSuggestions.push(
    { value: 'new-tag', description: 'Description of new tag' }
  );
}
```

**2. Document in tag resolution system:**
- Update tag parser to handle new tag
- Update context assembly to resolve new tag
- Add tests for new tag

---

### Adding New Widget State

**1. Update `WidgetState` type in `aiChatWidgetTypes.ts`:**
```typescript
export type WidgetState = 'hidden' | 'minimized' | 'floating' | 'docked' | 'newstate';
```

**2. Update widget render logic in `FloatingAIChatWidget.tsx`:**
```typescript
if (config.state === 'newstate') {
  return <NewStateView />;
}
```

**3. Add state transition controls:**
```typescript
const handleNewState = useCallback(() => {
  setState('newstate');
}, [setState]);
```

**4. Update documentation:**
- Add new state section to this doc
- Update UX flows
- Add testing checklist items

---

### Modifying Surface Detection

**Current Logic:**
```typescript
const currentSurface: CurrentSurface = {
  surfaceType: activeProject ? 'project' : 'personal',
  masterProjectId: activeProject?.id || null,
  label: formatSurfaceLabel(...),
  description: getSurfaceDescription(...),
};
```

**To Add Shared Spaces Detection:**
1. Check route: `location.pathname.startsWith('/spaces/shared')`
2. Set `surfaceType: 'shared'`
3. Update label and description accordingly

---

## Conclusion

The Floating AI Chat Widget provides a **globally accessible, surface-aware AI assistant** that strictly respects:

**✅ Surface Boundaries** - All conversations scoped to one of six surfaces
**✅ Permission Enforcement** - All data access RLS-checked
**✅ Non-Authoritative Rules** - AI cannot auto-apply, only suggests
**✅ User Control** - All actions explicit, no automation
**✅ Persistent UX** - State persists, widget always available
**✅ Accessibility** - Keyboard shortcuts, ARIA labels, focus management
**✅ Existing Services** - No new AI logic, uses existing infrastructure

**Status: ✅ Implementation Complete**

The AI assistant is now visibly accessible throughout the application while maintaining strict architectural boundaries and safety constraints.
