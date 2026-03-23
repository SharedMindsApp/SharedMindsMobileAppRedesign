# AI Chat Message Model & Conversation Storage

## Purpose

Provides a **minimal, safe, lightweight** way to:

- Store AI chat messages
- Group them into conversations
- Reference AI drafts
- Support the floating AI widget UX

**Without introducing:**

- Long-term AI memory
- Cross-project leakage
- Hidden state
- Autonomous behavior

---

## What This Model IS and IS NOT

### ✅ IS:

- **A conversation log** - Stores user-AI exchanges
- **User-owned** - Each conversation belongs to one user
- **Project-scoped** - Optionally tied to a specific project
- **Read-only history** - Append-only, immutable messages
- **Draft-referencing** - Links to AI drafts, not authoritative data

### ❌ IS NOT:

- **AI memory** - No persistent knowledge across conversations
- **A knowledge base** - No semantic indexing or retrieval
- **A reasoning engine** - No inference or decision-making
- **A planning system** - No autonomous goal tracking
- **A source of truth** - References drafts, doesn't create authority

---

## Core Concepts

### 1. Conversation

A container for a single chat thread between user and AI assistant.

**Examples:**
- "Marketing Planning"
- "Rachel's Wedding Prep"
- "Weekly Review"

**Properties:**
- User-owned
- Optionally project-scoped
- Has a title (optional, user-defined)
- Can be archived (soft delete)

### 2. Message

An individual utterance within a conversation.

**Types:**
- **User message** - User prompt or question
- **AI message** - AI response or suggestion
- **System message** - System notice (e.g., "Draft created")

**Properties:**
- Immutable after creation
- Append-only (no updates, no deletes)
- Can reference an AI draft
- Tracks token count

---

## Database Schema

### `ai_conversations`

Container for chat threads.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner (references auth.users) |
| `master_project_id` | uuid (nullable) | Optional project scope |
| `title` | text (nullable) | User-defined title |
| `intent_context` | text (nullable) | Saved intent context |
| `created_at` | timestamptz | Creation timestamp |
| `archived_at` | timestamptz (nullable) | Soft delete timestamp |

**Rules:**
- Belongs to one user
- Optionally scoped to a project
- Archivable, not deletable by default
- User can only access their own conversations
- Project-scoped conversations require project membership

### `ai_chat_messages`

Individual messages within conversations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `conversation_id` | uuid | Parent conversation |
| `sender_type` | text | 'user', 'ai', or 'system' |
| `content` | jsonb | Message content (text or structured) |
| `intent` | text (nullable) | AI intent if applicable |
| `response_type` | text (nullable) | Type of AI response |
| `linked_draft_id` | uuid (nullable) | Reference to ai_drafts |
| `token_count` | integer | Tokens used for this message |
| `created_at` | timestamptz | Creation timestamp |

**Rules:**
- **Append-only** - No UPDATE policy
- **Immutable** - No DELETE policy
- Messages never mutate other systems
- Draft references are read-only pointers

---

## Message Content Format

Messages support two content formats:

### Text Content

Simple text message:

```json
{
  "text": "Can you help me plan the marketing campaign?"
}
```

### Structured Content

Messages with formatted blocks:

```json
{
  "blocks": [
    {
      "type": "heading",
      "content": "Campaign Plan",
      "level": 2
    },
    {
      "type": "text",
      "content": "Here's a suggested approach..."
    },
    {
      "type": "code",
      "content": "const campaign = { ... }",
      "language": "javascript"
    },
    {
      "type": "list",
      "content": "- Task 1\n- Task 2\n- Task 3"
    }
  ]
}
```

---

## Message Lifecycle

```
┌─────────────────┐
│ User types      │
│ prompt in       │
│ floating widget │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Create user message     │
│ sender_type: 'user'     │
│ content: { text: '...' }│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ AI processes request    │
│ (via AI assistant)      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Create AI message       │
│ sender_type: 'ai'       │
│ linked_draft_id: uuid   │◄─── References draft (if created)
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ User views response     │
│ in chat history         │
└─────────────────────────┘
```

**Key Points:**
1. User message created first
2. AI assistant processes request
3. AI response stored as separate message
4. Draft created if needed (via AI assistant service)
5. Message links to draft (read-only reference)
6. User confirms draft separately (if applicable)

---

## Integration Rules

### With AI Assistant Foundation

- **Messages reference draft IDs**, not roadmap data IDs
- **Draft lifecycle remains unchanged** - Confirmation still required
- **Chat is a view** over drafts + AI reasoning
- **No direct mutations** - AI messages don't create authority

**Example Flow:**

```typescript
// 1. User sends message
await conversationService.createMessage({
  conversation_id: 'conv-123',
  sender_type: 'user',
  content: { text: 'Create 3 marketing tasks' }
}, userId);

// 2. AI assistant processes and creates draft
const draft = await aiAssistantService.generateContent({
  intent: 'draft_roadmap',
  // ... context
});

// 3. AI response message links to draft
await conversationService.createMessage({
  conversation_id: 'conv-123',
  sender_type: 'ai',
  content: { text: 'I created a draft with 3 tasks...' },
  linked_draft_id: draft.id
}, userId);

// 4. User confirms draft separately (unchanged)
await applyDraft(draft.id, userId);
```

### With Tag System

- **Tags resolved per-message** - Each message resolves tags independently
- **Resolution metadata stored** alongside message
- **No persistent tag bindings** - Tags re-resolved on context assembly
- **Budget-bounded** - Max 5 tags per prompt

**Example:**

```typescript
// User mentions tags in message
const userMessage = await conversationService.createMessage({
  conversation_id: 'conv-123',
  sender_type: 'user',
  content: { text: 'Show tasks from @marketing and @launch' }
}, userId);

// AI resolves tags and responds
const tags = parseTagsFromText(userMessage.content.text);
const resolved = await resolveTagsForUser(userId, tags);

// AI response includes resolved context
const aiMessage = await conversationService.createMessage({
  conversation_id: 'conv-123',
  sender_type: 'ai',
  content: { text: 'Here are the tasks from Marketing and Launch tracks...' },
  intent: 'query_roadmap',
  response_type: 'context_aware'
}, userId);
```

### With Permissions

**User Visibility:**

Users can only see:
- Their own conversations
- Conversations tied to projects they have access to

**Cross-User Isolation:**

- No cross-user visibility (yet)
- No shared conversations (future feature)
- No collaboration chat (separate system)

**Project Scope Enforcement:**

```typescript
// Creating project-scoped conversation
const conversation = await conversationService.createConversation({
  user_id: 'user-123',
  master_project_id: 'project-456', // ← Requires project membership
  title: 'Marketing Planning'
}, userId);

// RLS automatically enforces access
// User must be member of project-456
```

---

## Safety Guarantees

### Explicitly Enforced:

**❌ No AI writes from messages**
- Messages reference drafts
- Drafts require user confirmation
- No silent mutations

**❌ No conversation-based automation**
- No triggered actions
- No autonomous follow-ups
- User initiates all actions

**❌ No implicit memory carry-over**
- Each AI response is stateless
- Context assembled per-request
- Budget-bounded context

**❌ No cross-project context bleed**
- Project scope enforced via RLS
- No leakage across project boundaries
- Permission-checked reads

**❌ No background summarization**
- No automatic title generation
- No conversation analysis
- No sentiment tracking

### Each AI Response Is:

- **Stateless** - No persistent memory
- **Context-assembled** - Built from recent messages + current state
- **Budget-bounded** - Max token limits enforced
- **Permission-checked** - User's project access validated
- **Draft-producing** - Creates drafts, not authority

---

## UX Alignment (Floating Widget)

This model supports:

### Floating Chat Widget

- **Docked mode** - Widget attached to side of screen
- **Minimized history** - Show recent messages only
- **Expandable** - View full conversation history
- **"New conversation" button** - Start fresh thread
- **"Clear context" action** - Archive current conversation
- **Conversation switcher** - Switch between active conversations

### Without:

- Reloading project state
- Rebuilding context unless user asks
- Automatic context switching
- Cross-conversation reasoning

### Example UX Flow:

```
┌─────────────────────────────────┐
│  Marketing Planning        [x]  │ ← Conversation title
├─────────────────────────────────┤
│                                 │
│ User: Create 3 tasks            │
│                                 │
│ AI: I created a draft with 3    │
│     marketing tasks. [View]     │ ← Link to draft
│                                 │
│ User: Add deadlines             │
│                                 │
│ AI: I updated the draft with    │
│     deadlines. [View]           │
│                                 │
├─────────────────────────────────┤
│ [Type a message...]        [→]  │
├─────────────────────────────────┤
│ [New] [Archive] [⚙️]            │
└─────────────────────────────────┘
```

---

## Analytics (Optional, Lightweight)

Track only:

### Per-User Metrics

- **Message count** - Total messages sent
- **Token usage** - Total tokens consumed
- **Draft acceptance rate** - % of drafts confirmed
- **Intent frequency** - Most common intents

### Per-Conversation Metrics

- **Message count** - Messages in conversation
- **Total tokens** - Tokens used in conversation
- **Last activity** - Last message timestamp
- **Linked drafts** - Number of drafts created

### What We DON'T Track:

- ❌ Sentiment analysis
- ❌ User profiling
- ❌ Topic modeling
- ❌ Behavior patterns
- ❌ Cross-conversation insights

---

## Conversation Lifecycle

```
┌──────────────┐
│ Created      │
│ (new conv)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Active       │
│ (messages    │
│  flowing)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Archived     │
│ (soft delete)│
└──────────────┘
```

**State Transitions:**

- **Created → Active** - Automatic on first message
- **Active → Archived** - User archives conversation
- **Archived → Active** - User restores conversation
- **No hard deletes** - Conversations never permanently deleted

---

## Constraints & Limits

### Conversation Constraints

| Constraint | Value |
|------------|-------|
| Max title length | 200 characters |
| Max active conversations per user | 50 |
| Max message history for context | 10 messages |
| Message preview length | 100 characters |

### Message Constraints

| Constraint | Value |
|------------|-------|
| Sender types | 'user', 'ai', 'system' only |
| Content format | Text or structured blocks |
| Min content length | 1 character |
| Max tags per message | 5 (inherited from AI) |

### Safety Rules

```typescript
const CHAT_SAFETY_RULES = {
  MESSAGES_APPEND_ONLY: true,
  MESSAGES_IMMUTABLE: true,
  NO_CROSS_USER_VISIBILITY: true,
  NO_AI_MEMORY_PERSISTENCE: true,
  NO_AUTONOMOUS_BEHAVIOR: true,
  DRAFT_REFERENCES_READ_ONLY: true,
  PROJECT_SCOPE_ENFORCED: true,
};
```

---

## API Usage Examples

### Create Conversation

```typescript
const conversation = await conversationService.createConversation({
  user_id: userId,
  master_project_id: projectId, // Optional
  title: 'Marketing Planning',
}, userId);
```

### Send User Message

```typescript
const message = await conversationService.createMessage({
  conversation_id: conversationId,
  sender_type: 'user',
  content: { text: 'Create 3 marketing tasks' },
}, userId);
```

### Send AI Response

```typescript
const aiMessage = await conversationService.createMessage({
  conversation_id: conversationId,
  sender_type: 'ai',
  content: { text: 'I created a draft with 3 tasks...' },
  intent: 'draft_roadmap',
  linked_draft_id: draftId,
  token_count: 150,
}, userId);
```

### List Conversations

```typescript
const conversations = await conversationService.listConversations({
  user_id: userId,
  master_project_id: projectId, // Optional filter
  include_archived: false,
  limit: 20,
});
```

### Get Conversation Context

```typescript
const context = await conversationService.getConversationContext(
  conversationId,
  userId
);
// Returns: { conversation, recent_messages, message_count, total_tokens }
```

### Archive Conversation

```typescript
await conversationService.archiveConversation(conversationId, userId);
```

---

## What This Does NOT Do

### ❌ AI Memory

**Does NOT:**
- Remember facts across conversations
- Build knowledge graph
- Learn from past interactions
- Persist user preferences

**Why:** Prevents creepy behavior and ensures transparency

---

### ❌ Conversation Summarization

**Does NOT:**
- Auto-generate conversation titles
- Summarize message history
- Extract key points
- Create digests

**Why:** Keeps system simple and predictable

---

### ❌ Auto-Renaming Conversations

**Does NOT:**
- Infer conversation topic
- Update title automatically
- Suggest better names

**Why:** User controls all metadata

---

### ❌ Cross-Conversation Reasoning

**Does NOT:**
- Reference other conversations
- Build context across threads
- Link related conversations

**Why:** Each conversation is isolated and stateless

---

### ❌ AI Follow-ups or Reminders

**Does NOT:**
- Proactively message user
- Send reminders
- Suggest next actions
- Trigger notifications

**Why:** AI never acts autonomously

---

### ❌ Notifications

**Does NOT:**
- Notify on new AI responses
- Alert on draft creation
- Push conversation updates

**Why:** Notification system is separate (future)

---

### ❌ Collaboration Chat

**Does NOT:**
- Share conversations between users
- Support multi-user chat
- Show presence indicators
- Enable real-time collaboration

**Why:** Separate collaboration system exists for team chat

---

## Future Extensions (Out of Scope for Now)

The following features are **intentionally omitted** and may be added later:

### Conversation Sharing (Future)

Allow users to share conversations with team members.

**Requirements:**
- Explicit sharing action
- Permission-based access
- Read-only for shared users
- Audit trail

### Conversation Templates (Future)

Pre-defined conversation starters for common tasks.

**Examples:**
- "Weekly Review"
- "Project Kickoff"
- "Bug Triage"

### Voice Input (Future)

Speech-to-text for message input.

**Requirements:**
- User opt-in
- Client-side processing preferred
- Privacy-preserving

### Conversation Export (Future)

Export conversation history to Markdown or JSON.

**Requirements:**
- User-initiated only
- Includes all messages
- Sanitizes sensitive data

---

## Implementation Checklist

### Database

- ✅ `ai_conversations` table created
- ✅ `ai_chat_messages` table created
- ✅ RLS policies enforced
- ✅ Indexes for performance
- ✅ Helper functions for metrics

### TypeScript Types

- ✅ `AIConversation` type
- ✅ `AIChatMessage` type
- ✅ Message content types (text, structured)
- ✅ Service parameter types
- ✅ Validation functions

### Service Layer

- ✅ `conversationService.ts` created
- ✅ CRUD operations for conversations
- ✅ CRUD operations for messages (append-only)
- ✅ Permission checks
- ✅ Safety validations

### Safety Enforcement

- ✅ Messages append-only (no UPDATE policy)
- ✅ Messages immutable (no DELETE policy)
- ✅ User ownership enforced
- ✅ Project scope validated
- ✅ Cross-user isolation guaranteed

### Documentation

- ✅ `AI_CHAT_MODEL.md` created
- ✅ Message lifecycle diagram
- ✅ "What this does NOT do" section
- ✅ UX interaction notes
- ✅ Integration rules

---

## Why This Design Is Right

### You Now Have:

| Layer | Status |
|-------|--------|
| Authority systems | ✅ Complete |
| AI foundation | ✅ Safe |
| AI UX | ✅ Present |
| Tag intelligence | ✅ Integrated |
| Conversation persistence | ✅ **This Prompt** |
| AI memory | ❌ Intentionally avoided |

### This Keeps Your AI:

1. **Useful** - Provides chat history for context
2. **Transparent** - All messages visible to user
3. **Non-creepy** - No hidden memory or learning
4. **Non-authoritative** - References drafts, doesn't create authority
5. **Scalable** - Lightweight, simple schema

---

## Conclusion

The AI Chat Model provides **just enough** conversation persistence to support the floating AI widget UX, while maintaining strict safety boundaries:

- **Append-only messages** - No silent edits
- **User-owned conversations** - No cross-user leakage
- **Project-scoped access** - Permission-enforced
- **Draft references** - Read-only pointers
- **No AI memory** - Stateless responses
- **No automation** - User-initiated actions only

**This is conversation storage, not AI memory. That's intentional.**

Future features like summarization, sharing, and templates can be added later without compromising these core safety principles.

**Status: ✅ Production-Ready**

The AI assistant can now maintain lightweight conversation history without becoming creepy, authoritative, or autonomous.
