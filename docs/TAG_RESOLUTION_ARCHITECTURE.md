# AI Tag Resolution Architecture

## Overview

The AI Tag Resolution system enables users to reference project entities naturally in AI chat prompts using `@`-tags. Users can type entity names without spaces or IDs, and the system deterministically resolves them to authoritative entities while respecting permissions.

**Core Principle: Effortless for users, deterministic for the system, safe by design.**

---

## User Experience

### How Users Use Tags

From the user's perspective, tags are simple and intuitive:

1. **Type @ followed by entity name (no spaces)**
2. **Case doesn't matter**
3. **No IDs required**
4. **Autocomplete helps (optional)**

### Tag Examples

| Entity Name | User Tag | Notes |
|-------------|----------|-------|
| Marketing Plan | `@marketingplan` | Remove spaces |
| Rachel's Wedding Day | `@rachelsweddingday` | Remove punctuation |
| John Doe | `@johndoe` | Names work too |
| Calendar | `@calendar` | System entities |

### What Users Never See

Users **never** need to know:
- Entity IDs
- Entity types
- Database schemas
- Project boundaries
- Permission logic

The system handles all complexity transparently.

---

## Architecture Layers

### 1. Tag Parsing Layer

**File:** `aiTagParser.ts`

**Responsibility:** Extract and normalize `@`-prefixed tokens from user input.

**Process:**
1. Scan text for `@[alphanumeric]+` patterns
2. Extract raw tag strings
3. Normalize by removing spaces, punctuation, and lowercasing
4. Enforce max tags per prompt (default: 5)
5. Preserve original text (no mutation)

**Example:**
```typescript
const input = "I'm planning my @marketingplan but my @calendar is full";
const result = parseTagsFromText(input);
// result.parsedTags = [
//   { rawTag: 'marketingplan', normalizedTag: 'marketingplan', ... },
//   { rawTag: 'calendar', normalizedTag: 'calendar', ... }
// ]
```

**Key Functions:**
- `parseTagsFromText(text)` - Parse all tags from text
- `normalizeTagName(tagName)` - Normalize user input
- `normalizeEntityName(entityName)` - Normalize entity names for matching
- `validateTagLimits(text)` - Check tag count limits

**Hard Limits:**
- Maximum 5 tags per prompt
- Alphanumeric characters only
- No spaces or symbols in tags

---

### 2. Entity Resolution Layer

**File:** `aiTagResolver.ts`

**Responsibility:** Resolve normalized tags to authoritative entities with permission checking.

**Resolution Priority Order:**
1. **System Entities** (calendar, tasks, habits, goals, etc.) - Highest priority
2. **Tracks & Subtracks** - Project-scoped
3. **Roadmap Items** - Including events, milestones, tasks
4. **People** - Project-scoped, then global
5. **Shared Tracks** - Cross-project with permission check

**Resolution Algorithm:**
1. Check if tag matches system entity (exact match)
2. Query tracks in project (normalized name match)
3. Query roadmap items in project (normalized title match)
4. Query people (project people + project users)
5. Query shared tracks (with permission validation)
6. If no matches: mark as `unresolved`
7. If one match: mark as `resolved`
8. If multiple matches at same priority: mark as `ambiguous`
9. If multiple matches at different priorities: pick highest priority

**Example:**
```typescript
const context = {
  userId: 'user-123',
  projectId: 'project-456',
  allowSystemEntities: true,
  allowSharedTracks: true,
};

const resolved = await resolveTag('marketingplan', context);
// {
//   rawTag: 'marketingplan',
//   normalizedTag: 'marketingplan',
//   entityType: 'track',
//   entityId: 'track-789',
//   displayName: 'Marketing Plan',
//   resolutionStatus: 'resolved'
// }
```

**Resolution Statuses:**
- `resolved` - Single match found
- `ambiguous` - Multiple matches at same priority
- `unresolved` - No matches found

**Key Functions:**
- `resolveTag(normalizedTag, context)` - Resolve single tag
- `resolveTags(normalizedTags, context)` - Resolve multiple tags
- `getResolvedTags(results)` - Filter to resolved only
- `getUnresolvedTags(results)` - Filter to unresolved
- `getAmbiguousTags(results)` - Filter to ambiguous
- `groupResolvedTagsByType(results)` - Group by entity type

**Permission Safety:**
- Only entities user can access are considered
- Project-scoped queries enforce project membership
- Shared tracks validate cross-project permission
- Global people limited to user's own people

---

### 3. Context Injection Layer

**File:** `aiTagContext.ts`

**Responsibility:** Augment AI context with minimal snapshots of resolved entities.

**Process:**
1. Take resolved tags
2. Build minimal snapshot for each entity
3. Respect token budget constraints
4. Truncate text fields to maxLength
5. Provide summary of resolved/unresolved/ambiguous tags
6. Augment base AI scope with tag entities

**Entity Snapshots:**

Each entity type has a specific snapshot structure:

**Track Snapshot:**
```typescript
{
  id, name, description, color, isShared, parentTrackId, itemCount
}
```

**Roadmap Item Snapshot:**
```typescript
{
  id, title, description, itemType, status, deadline, trackId, estimatedDuration
}
```

**Person Snapshot:**
```typescript
{
  id, name, role, isProjectUser, assignmentCount
}
```

**System Snapshot:**
```typescript
{
  type: 'system', name, description
}
```

**Key Functions:**
- `enrichContextWithTags(prompt, baseScope, userId, intent, budget)` - Main entry point
- `buildTagSnapshots(resolvedTags, budget)` - Build all snapshots
- `augmentScopeWithTags(baseScope, enrichedContext)` - Merge tags into scope
- `formatTagContextForAI(enrichedContext)` - Format for AI prompt

**Token Budgets:**
- Max 5 tags per prompt
- Each snapshot limited to maxTextLengthPerEntity (default: 1000 chars)
- Text fields truncated
- Snapshots summarized, not full dumps

**Scope Augmentation:**
- Track tags → add to `scope.trackIds`
- Item tags → add to `scope.roadmapItemIds`
- Person tags → set `scope.includePeople = true`
- System tags → set appropriate flags (e.g., `@calendar` → `includeDeadlines = true`)

---

### 4. Autocomplete Suggestion Layer

**File:** `aiTagSuggestions.ts`

**Responsibility:** Provide real-time tag suggestions as user types.

**Process:**
1. User types `@`
2. Filter suggestions by query string
3. Sort by relevance score
4. Return top N suggestions (default: 10)
5. Each suggestion includes icon, display name, entity type

**Relevance Scoring:**
- Exact normalized match: +100
- Starts with query: +50
- Contains query: +25
- Display name exact match: +90
- Display name starts with: +40
- Display name contains: +20
- System entity bonus: +10

**Suggestion Structure:**
```typescript
{
  normalizedTag: 'marketingplan',
  displayName: 'Marketing Plan',
  entityType: 'track',
  entityId: 'track-789',
  icon: 'Folder',
  subtitle: 'Track',
  metadata: { color: 'blue', isShared: false }
}
```

**Key Functions:**
- `getTagSuggestions(query, context)` - Get filtered suggestions
- `getRecentlyUsedTags(userId, projectId)` - Get frequently used tags
- Icon/label helpers for entity types

**UX Flow:**
1. User types `@` → show default suggestions (system + recent)
2. User types `@mar` → filter to "Marketing Plan", "Market Research", etc.
3. User clicks "Marketing Plan" → insert `@marketingplan` into input
4. User continues typing prompt

---

## Integration with AI Assistant Foundation

### How Tags Enhance AI Context

Tags integrate cleanly with the existing AI context assembly:

1. **Before Context Assembly:**
   - Parse tags from prompt
   - Resolve tags to entities
   - Build minimal snapshots

2. **During Context Assembly:**
   - Augment base scope with tag entities
   - Respect intent-context matrix rules
   - Apply budget constraints
   - Validate permissions

3. **After Context Assembly:**
   - Include tag resolution summary in AI prompt
   - AI knows which tags resolved/unresolved/ambiguous
   - AI has minimal snapshots to reference

**Example Flow:**
```typescript
// User prompt with tags
const prompt = "Help me plan @marketingplan considering @calendar";

// Parse tags
const parseResult = parseTagsFromText(prompt);

// Resolve tags
const resolved = await resolveTags(
  parseResult.parsedTags.map(t => t.normalizedTag),
  { userId, projectId }
);

// Enrich context
const enriched = await enrichContextWithTags(
  prompt,
  baseScope,
  userId,
  intent,
  budget
);

// Augment scope
const augmentedScope = augmentScopeWithTags(baseScope, enriched);

// Build context (existing function)
const context = await buildContext(augmentedScope, userId, intent);

// AI receives:
// - Original prompt
// - Tag resolution summary
// - Minimal entity snapshots
// - Full context per intent
```

---

## Safety Guarantees

### Token & Cost Controls

✅ **Hard Limit on Tags:** Maximum 5 tags per prompt
✅ **Snapshot Size Limit:** Each snapshot ≤ maxTextLengthPerEntity
✅ **Text Truncation:** All text fields truncated to budget
✅ **Summary-First:** Snapshots are minimal, not full dumps
✅ **Budget Respected:** Tags respect existing budget constraints

### Permission Safety

✅ **User Access Validated:** Only entities user can access are resolved
✅ **Project-Scoped:** Queries enforce project boundaries
✅ **Shared Track Permission:** Cross-project access validated
✅ **Personal Spaces Isolated:** Tags cannot reference Personal Spaces
✅ **No Data Inference:** Unresolved tags don't expose hidden data

### AI Safety

✅ **Read-Only:** Tags only affect what AI can read, not write
✅ **No Auto-Actions:** Tags don't trigger writes or automation
✅ **Draft Only:** All AI outputs remain drafts
✅ **Provenance:** Tag context included in AI interaction log
✅ **Auditable:** Tag resolution tracked and logged

---

## Edge Cases & Handling

### Ambiguous Tags

**Scenario:** Multiple entities match at same priority

**Example:**
```typescript
// Both a track and roadmap item named "Launch"
const resolved = await resolveTag('launch', context);
// {
//   resolutionStatus: 'ambiguous',
//   ambiguousMatches: [
//     { entityType: 'track', entityId: 'track-1', displayName: 'Launch' },
//     { entityType: 'roadmap_item', entityId: 'item-1', displayName: 'Launch' }
//   ]
// }
```

**Handling:**
- AI is informed tag is ambiguous
- AI can ask user to clarify
- No silent guessing

### Unresolved Tags

**Scenario:** No entity matches normalized tag

**Example:**
```typescript
const resolved = await resolveTag('doesnotexist', context);
// { resolutionStatus: 'unresolved', normalizedTag: 'doesnotexist' }
```

**Handling:**
- AI is informed tag was not found
- AI proceeds with available context
- AI can suggest alternatives
- No error thrown, AI still responds

### Exceeding Tag Limit

**Scenario:** User includes more than 5 tags

**Example:**
```typescript
const input = "@one @two @three @four @five @six";
const result = parseTagsFromText(input);
// Parses only first 5, ignores @six
// Warning logged: "Maximum tag limit (5) reached"
```

**Handling:**
- First 5 tags processed
- Additional tags ignored
- User not blocked
- Warning logged for audit

### Permission Denied

**Scenario:** Tag matches entity user cannot access

**Example:**
- User references `@confidentialproject`
- Entity exists but user not a member
- Entity filtered out during resolution
- Tag marked as `unresolved`

**Handling:**
- Entity not exposed
- Tag appears unresolved
- No permission leak
- Silent filtering

### System Entity vs Project Entity

**Scenario:** Both system and project entity have same normalized name

**Example:**
- `@calendar` matches system entity "Calendar"
- `@calendar` also matches track "Calendar Planning"

**Handling:**
- System entities prioritized
- `@calendar` → system entity
- Track not matched
- Deterministic behavior

---

## Usage Examples

### Simple Tag Usage

```typescript
// User prompt
"What's the status of @marketingplan?"

// Resolution
- @marketingplan → Track "Marketing Plan"

// AI receives
- Track snapshot: { name, description, itemCount: 15 }
- Context: project + track + roadmap items
- AI can answer: "Marketing Plan has 15 items, 8 completed..."
```

### Multiple Tags

```typescript
// User prompt
"Coordinate @johndoe on @projectalpha for @calendar integration"

// Resolution
- @johndoe → Person "John Doe"
- @projectalpha → Track "Project Alpha"
- @calendar → System entity "Calendar"

// AI receives
- Person snapshot: { name, role, assignmentCount: 8 }
- Track snapshot: { name, description, itemCount: 22 }
- System flag: includeDeadlines = true
- AI can answer with full context
```

### Ambiguous Tag

```typescript
// User prompt
"Update @launch timeline"

// Resolution
- @launch → AMBIGUOUS
  - Track "Launch"
  - Roadmap Item "Launch Event"

// AI response
"I found multiple entities named 'Launch':
- Track: Launch
- Event: Launch Event
Which did you mean?"
```

### Unresolved Tag

```typescript
// User prompt
"What about @futureproject?"

// Resolution
- @futureproject → UNRESOLVED (not found)

// AI response
"I couldn't find an entity named 'futureproject' in your project.
Did you mean @currentproject or @projectalpha?"
```

---

## Autocomplete UX Patterns

### Empty Query (Just `@`)

**Shows:**
- System entities (calendar, tasks, habits, goals)
- Recently used tags
- Top 3-5 entities from current project

**Example:**
```
@
  📅 Calendar (System)
  ✅ Tasks (System)
  📊 Marketing Plan (Track)
  🎯 Q1 Goals (Track)
  👤 John Doe (Person)
```

### Partial Query

**Shows:**
- Filtered, sorted by relevance

**Example:**
```
@mar
  📊 Marketing Plan (Track)
  📈 Market Research (Roadmap Item)
  📝 March Review (Event)
```

### Selection

**User clicks "Marketing Plan"**
→ Input becomes: `Help me with @marketingplan`

**No ID shown, just normalized tag inserted**

---

## Implementation Files

| File | Responsibility |
|------|---------------|
| `aiTagParser.ts` | Parse @tags from text, normalize names |
| `aiTagResolver.ts` | Resolve tags to entities with permissions |
| `aiTagContext.ts` | Inject tag snapshots into AI context |
| `aiTagSuggestions.ts` | Autocomplete suggestions API |

**Total LOC:** ~900 lines of deterministic, well-tested code

---

## Testing Checklist

### Tag Parsing

- [x] Parse single tag
- [x] Parse multiple tags
- [x] Normalize with spaces
- [x] Normalize with punctuation
- [x] Case insensitivity
- [x] Max tag limit enforcement
- [x] Empty input handling

### Entity Resolution

- [x] Resolve track by normalized name
- [x] Resolve roadmap item
- [x] Resolve person
- [x] Resolve system entity
- [x] Ambiguous detection
- [x] Unresolved detection
- [x] Priority ordering
- [x] Permission filtering

### Context Injection

- [x] Build track snapshot
- [x] Build item snapshot
- [x] Build person snapshot
- [x] Build system snapshot
- [x] Respect token budget
- [x] Truncate text fields
- [x] Augment scope correctly

### Autocomplete

- [x] Filter by query
- [x] Sort by relevance
- [x] Limit results
- [x] Permission filtering
- [x] Icon selection
- [x] Recently used tags

---

## Future Enhancements (Out of Scope)

❌ **Not Included:**
- Fuzzy matching / typo correction
- Automatic entity creation
- Cross-project tag resolution
- AI-suggested tags
- Tag aliases or shortcuts
- Natural language tag parsing ("the marketing plan" → `@marketingplan`)

These are explicitly deferred for future consideration.

---

## Conclusion

The AI Tag Resolution system provides a natural, user-friendly way to reference project entities in AI prompts while maintaining:

- **Deterministic resolution** (same input = same output)
- **Permission safety** (only accessible entities)
- **Token efficiency** (minimal snapshots)
- **Integration cleanliness** (respects existing architecture)
- **Audit trail** (all resolutions logged)

**Status: ✅ Production-Ready**

Users can now type `@marketingplan` instead of remembering IDs or navigating complex menus. The AI understands context better, and the system remains safe, bounded, and explainable.
