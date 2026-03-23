# Stage 2.1 Contract: Reflection Layer (User Meaning, Zero Interpretation)

**Layer**: C.1 - User Meaning Layer
**Purpose**: User-owned meaning-making space with ZERO system interpretation
**Status**: Mandatory architectural constraints

---

## Overview

Stage 2.1 (Reflection Layer) provides a private space for users to attach their own meaning to behavioral signals. This layer is fundamentally different from all others:

- **User-owned**: Users have complete control (write, read, edit, delete)
- **Zero interpretation**: System NEVER analyzes, extracts, or interprets content
- **Optional**: Never required, never prompted beyond gentle invitation
- **Mutable**: Unlike Stage 0 or Stage 1, reflections can be edited and deleted
- **Safe Mode independent**: Available even when Safe Mode is ON

**CRITICAL**: This is a mirror, not a microscope. The system reflects back what the user writes but never looks into it.

---

## Mandatory Constraints

### 1. ZERO System Interpretation

The system SHALL NOT perform any of the following operations on reflection content:

**FORBIDDEN**:
- ❌ Sentiment analysis or emotion detection
- ❌ Natural Language Processing (NLP)
- ❌ Theme extraction or pattern detection
- ❌ Keyword extraction or summarization
- ❌ Clustering or similarity analysis
- ❌ Machine learning or AI inference
- ❌ Text classification or categorization
- ❌ Readability scoring or word counting
- ❌ Language detection or translation suggestions
- ❌ Spell check or grammar suggestions (beyond browser defaults)
- ❌ Auto-tagging or tag suggestions
- ❌ Search ranking by relevance
- ❌ "Related reflections" recommendations

**ALLOWED**:
- ✅ Simple string matching (exact, case-insensitive)
- ✅ User-defined tag filtering (no system suggestions)
- ✅ Chronological sorting only
- ✅ Display character count if explicitly requested by user
- ✅ Basic CRUD operations (Create, Read, Update, Delete)

**Violation Example**:
```typescript
// ❌ FORBIDDEN
async function analyzeReflectionSentiment(content: string) {
  const sentiment = await nlpService.analyze(content);
  return sentiment.score;
}

// ✅ ALLOWED
async function getReflection(userId: string, reflectionId: string) {
  return await db.reflection_entries
    .select('*')
    .eq('id', reflectionId)
    .eq('user_id', userId);
}
```

### 2. User Ownership and Control

Users SHALL have complete control over their reflections:

**REQUIRED**:
- ✅ Users can create reflections freely (no limits beyond storage)
- ✅ Users can read all their own reflections
- ✅ Users can edit reflection content and tags at any time
- ✅ Users can delete reflections (soft delete with recovery period optional)
- ✅ Reflections are private (never shared, even with professionals)
- ✅ Users can export reflections in plain text format
- ✅ Deletion is immediate and complete (after recovery period)

**FORBIDDEN**:
- ❌ System cannot modify reflection content
- ❌ System cannot delete reflections (except user-initiated or cascade)
- ❌ Other users cannot read reflections (even household members)
- ❌ Professionals cannot access reflections (even with consent)
- ❌ System cannot lock or archive reflections without user action

**Violation Example**:
```typescript
// ❌ FORBIDDEN - System modifying user content
async function fixTyposInReflection(reflectionId: string) {
  const reflection = await getReflection(reflectionId);
  const corrected = spellCheck(reflection.content);
  await updateReflection(reflectionId, { content: corrected });
}

// ✅ ALLOWED - User editing their own content
async function userUpdateReflection(
  userId: string,
  reflectionId: string,
  newContent: string
) {
  return await stage2_1Reflection.updateReflection(
    userId,
    reflectionId,
    { content: newContent }
  );
}
```

### 3. Optional and Non-Performative

Reflections SHALL be optional and non-performative:

**REQUIRED**:
- ✅ Never required to write a reflection
- ✅ No prompts beyond "Add reflection (optional)"
- ✅ No tracking of reflection frequency
- ✅ No "X days since last reflection" messaging
- ✅ No celebration or acknowledgment of reflection writing
- ✅ No gamification (no streaks, no badges, no rewards)
- ✅ Frame as "record, not report"

**FORBIDDEN**:
- ❌ "You haven't reflected in a while" notifications
- ❌ Reflection completion percentage
- ❌ "Write a reflection" nudges or prompts
- ❌ Visual indicators of unwritten reflections
- ❌ Comparison of reflection counts
- ❌ "Most reflective user" metrics

**Violation Example**:
```typescript
// ❌ FORBIDDEN - Performative pressure
function ReflectionStreak({ userId }) {
  const streak = calculateReflectionStreak(userId);
  return (
    <div>
      <span>🔥 {streak} day reflection streak!</span>
      <span>Keep it up!</span>
    </div>
  );
}

// ✅ ALLOWED - Neutral information
function ReflectionStats({ userId }) {
  const count = getReflectionCount(userId);
  return (
    <div>
      <span>{count} total reflections</span>
    </div>
  );
}
```

### 4. Safe Mode Independence

Reflections SHALL remain accessible when Safe Mode is active:

**REQUIRED**:
- ✅ Users can write reflections when Safe Mode is ON
- ✅ Users can read existing reflections when Safe Mode is ON
- ✅ Users can edit/delete reflections when Safe Mode is ON
- ✅ Reflection Vault remains accessible when insights are hidden
- ✅ Safe Mode does NOT affect reflection functionality

**RATIONALE**: Reflections are user-owned meaning, not system interpretations. Safe Mode protects against system analysis, not user expression.

### 5. Data Isolation

Reflection data SHALL be isolated from all system processes:

**FORBIDDEN**:
- ❌ Reflections cannot be used in signal computation
- ❌ Reflections cannot trigger automation or notifications
- ❌ Reflection presence cannot affect system behavior
- ❌ Reflection content cannot be indexed for search across system
- ❌ Reflections cannot be aggregated or summarized
- ❌ Reflection metadata cannot be used for insights

**ALLOWED**:
- ✅ Count of reflections (simple integer)
- ✅ Earliest and latest reflection dates
- ✅ Count of linked vs unlinked reflections
- ✅ List of user-defined tags (no frequency analysis)

**Violation Example**:
```typescript
// ❌ FORBIDDEN - Using reflections in signal computation
async function computeInsightEngagement(userId: string) {
  const reflections = await getReflections(userId);
  const insights = await getInsights(userId);

  // Analyzing reflection content to measure engagement
  const engagementScore = reflections.filter(r =>
    r.content.length > 100 && r.linked_signal_id
  ).length / insights.length;

  return engagementScore;
}

// ✅ ALLOWED - Basic counting for user display
async function getReflectionStats(userId: string) {
  const reflections = await getReflections(userId);
  return {
    total_count: reflections.length,
    has_linked: reflections.filter(r => r.linked_signal_id).length,
    has_unlinked: reflections.filter(r => !r.linked_signal_id).length,
  };
}
```

### 6. User-Defined Taxonomy

Tag systems SHALL be user-controlled:

**REQUIRED**:
- ✅ Users create their own tags
- ✅ No predefined tag categories
- ✅ No tag suggestions based on content
- ✅ Tags are case-sensitive as entered
- ✅ Tag list shows user's tags only (alphabetically sorted)

**FORBIDDEN**:
- ❌ System-suggested tags based on reflection content
- ❌ "Popular tags" or "frequently used tags" lists
- ❌ Auto-complete based on other users' tags
- ❌ Tag merging or normalization without explicit user action
- ❌ Tag frequency analysis or trending tags

**Violation Example**:
```typescript
// ❌ FORBIDDEN - AI tag suggestions
async function suggestTags(content: string) {
  const tags = await aiService.extractKeywords(content);
  return tags;
}

// ✅ ALLOWED - User's own tag history
async function getUserTags(userId: string) {
  const reflections = await getReflections(userId);
  const allTags = new Set<string>();
  for (const r of reflections) {
    for (const tag of r.user_tags ?? []) {
      allTags.add(tag);
    }
  }
  return Array.from(allTags).sort();
}
```

### 7. Minimal Linking

Linking reflections to system entities SHALL be optional and minimal:

**ALLOWED LINKS**:
- ✅ linked_signal_id (optional - to behavioral signal)
- ✅ linked_project_id (optional - to Guardrails project)
- ✅ linked_space_id (optional - to shared space)

**FORBIDDEN**:
- ❌ Automatic linking based on content analysis
- ❌ "Related to" suggestions
- ❌ Bi-directional relationship visualization
- ❌ Link strength or relevance scoring
- ❌ Cascade actions (deleting signal affects reflection)

**REQUIRED**:
- ✅ Links are user-created only
- ✅ Links are optional (unlinking is allowed)
- ✅ Linked entity deletion does NOT delete reflection (orphan is OK)
- ✅ Links are for user navigation only (no system logic)

### 8. Neutral Language in UI

UI SHALL use neutral, non-performative language:

**REQUIRED FRAMING**:
- ✅ "If you want, you can note what this brings up for you"
- ✅ "This is for you. The system does not analyze this."
- ✅ "This is a record, not a report"
- ✅ "Reflections are optional"
- ✅ "Add reflection (optional)"

**FORBIDDEN FRAMING**:
- ❌ "Reflect on your progress"
- ❌ "Write your thoughts"
- ❌ "Journaling helps you grow"
- ❌ "Track your emotional journey"
- ❌ "Document your insights"
- ❌ "Daily reflection practice"

### 9. No Export to Third Parties

Reflections SHALL NOT be exported to external systems:

**FORBIDDEN**:
- ❌ Export to AI services (GPT, Claude, etc.)
- ❌ Export to analytics platforms
- ❌ Export to recommendation engines
- ❌ Export to research datasets
- ❌ Export to backup services that analyze content
- ❌ Integration with journaling apps that provide insights

**ALLOWED**:
- ✅ Plain text export for user's local storage
- ✅ JSON export with no external transmission
- ✅ Encrypted backup where user holds the only key

### 10. Audit Trail Prohibition

System SHALL NOT create detailed audit trails of reflection activity:

**FORBIDDEN**:
- ❌ Logging when user views specific reflections
- ❌ Tracking time spent reading reflections
- ❌ Recording edit history beyond updated_at timestamp
- ❌ Logging reflection word count over time
- ❌ Tracking reflection writing patterns

**ALLOWED**:
- ✅ created_at timestamp (immutable)
- ✅ updated_at timestamp (updates on edit)
- ✅ deleted_at timestamp (for soft delete recovery)
- ✅ Basic error logging (system health, not user behavior)

---

## Database Schema Requirements

### Table: `reflection_entries`

**REQUIRED FIELDS**:
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `content` (text, user-authored)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `deleted_at` (timestamptz, nullable - soft delete)
- `user_tags` (text[], nullable, default '{}')
- `linked_signal_id` (uuid, nullable)
- `linked_project_id` (uuid, nullable)
- `linked_space_id` (uuid, nullable)
- `self_reported_context` (jsonb, nullable, user-controlled)

**FORBIDDEN FIELDS**:
- ❌ sentiment_score
- ❌ keyword_vector
- ❌ theme_category
- ❌ word_count
- ❌ language_detected
- ❌ reading_level
- ❌ engagement_score
- ❌ ai_generated_summary
- ❌ system_tags
- ❌ recommended_actions

**ARCHITECTURAL CONSTRAINTS** (in migration comments):
```sql
/*
  CRITICAL: The following operations are FORBIDDEN on reflection_entries:
  ❌ NO sentiment analysis or NLP
  ❌ NO theme extraction or pattern detection
  ❌ NO summarization or clustering
  ❌ NO AI/ML inference of any kind
  ❌ NO feeding reflection content into other system processes
  ❌ NO aggregation beyond simple counting
  ❌ NO search ranking or relevance scoring

  Reflections are user-owned meaning. The system is WRITE-ONLY.
*/
```

---

## Service Layer Requirements

### Public API

**REQUIRED FUNCTIONS**:
```typescript
// Stage 2.1 Public API
export async function createReflection(
  userId: string,
  options: CreateReflectionOptions
): Promise<ReflectionEntry>;

export async function getReflections(
  userId: string,
  options?: GetReflectionsOptions
): Promise<ReflectionEntry[]>;

export async function getReflection(
  userId: string,
  reflectionId: string
): Promise<ReflectionEntry | null>;

export async function updateReflection(
  userId: string,
  reflectionId: string,
  options: UpdateReflectionOptions
): Promise<ReflectionEntry>;

export async function deleteReflection(
  userId: string,
  reflectionId: string
): Promise<void>;

export async function getReflectionStats(
  userId: string
): Promise<ReflectionStats>;

export async function getUserTags(
  userId: string
): Promise<string[]>;
```

**FORBIDDEN FUNCTIONS**:
```typescript
// ❌ FORBIDDEN - These functions SHALL NOT exist
async function analyzeReflectionThemes(userId: string);
async function getReflectionSentiment(reflectionId: string);
async function extractReflectionKeywords(content: string);
async function suggestReflectionTags(content: string);
async function summarizeReflection(reflectionId: string);
async function findSimilarReflections(reflectionId: string);
async function getReflectionReadingTime(reflectionId: string);
async function detectReflectionLanguage(content: string);
async function recommendActionsFromReflection(reflectionId: string);
```

---

## UI Component Requirements

### ReflectionPanel (Entry Form)

**REQUIRED**:
- ✅ Gentle framing: "If you want, you can note..."
- ✅ Explicit statement: "The system does not analyze this"
- ✅ Optional tag entry (user types tags, no suggestions)
- ✅ No word count display (unless explicitly toggled by user)
- ✅ No save prompts or timers
- ✅ Cancel button (no "Are you sure?" for unsaved changes)
- ✅ Edit capability for existing reflections
- ✅ Delete capability with confirmation

**FORBIDDEN**:
- ❌ "Reflect on your progress" prompts
- ❌ Auto-save with notification
- ❌ Tag suggestions based on content
- ❌ Sentiment emoji picker
- ❌ Template suggestions ("Try starting with...")
- ❌ Character limits with shaming messages

### ReflectionVault (Archive)

**REQUIRED**:
- ✅ Chronological list (newest first)
- ✅ Manual string search only (exact match)
- ✅ Tag filter (user's tags only)
- ✅ Edit button for each reflection
- ✅ Simple stats: total count, linked vs unlinked
- ✅ Frame as "This is a record, not a report"

**FORBIDDEN**:
- ❌ "Most common themes" analysis
- ❌ Sentiment timeline graph
- ❌ Word cloud visualization
- ❌ "Popular tags" section
- ❌ "Reflections on this date in previous years"
- ❌ AI-generated summaries
- ❌ Search suggestions or autocomplete
- ❌ "Related reflections" section

---

## Integration Requirements

### With InsightCard (Stage 2)

**ALLOWED**:
- ✅ "Add reflection (optional)" button on insight cards
- ✅ Display count of linked reflections (integer only)
- ✅ Show reflection content inline (user's own words)
- ✅ Link reflection to insight via `linked_signal_id`

**FORBIDDEN**:
- ❌ "Write a reflection to unlock..." mechanics
- ❌ Insight display affected by reflection presence
- ❌ Analysis of reflection content to improve insights
- ❌ Notification if user hasn't reflected on insight

### With Safe Mode (Stage 2)

**REQUIRED**:
- ✅ Reflections remain accessible when Safe Mode is ON
- ✅ Can write reflections when insights are hidden
- ✅ Can link reflections to hidden insights (link persists)
- ✅ Reflection Vault always accessible

**RATIONALE**: Safe Mode hides system interpretations, not user meaning.

### With Guardrails (Personal Projects)

**ALLOWED**:
- ✅ Link reflections to projects via `linked_project_id`
- ✅ View reflection count on project cards (integer only)
- ✅ Filter Reflection Vault by project

**FORBIDDEN**:
- ❌ Project insights derived from reflection content
- ❌ Project recommendations based on reflections
- ❌ Reflection-based project scoring
- ❌ "Most reflected-on project" metrics

---

## Testing and Compliance

### Automated Checks

Create tests that verify:

1. **No Analysis Functions**: `grep -r "analyzeReflection\|sentimentScore\|extractKeywords" src/` returns empty
2. **No AI/ML Imports**: Reflection service files do not import NLP or ML libraries
3. **Database Schema**: `reflection_entries` table has no forbidden fields
4. **Public API Only**: No additional functions exported beyond approved list
5. **String Search Only**: Search implementation uses exact string matching

### Manual Verification

Developers SHALL verify:

1. **Language Audit**: All UI text uses approved neutral framing
2. **Privacy Audit**: Reflections are never transmitted to external services
3. **Accessibility Audit**: Reflection Vault works with Safe Mode ON
4. **User Control Audit**: Users can edit and delete any reflection
5. **Isolation Audit**: Reflections do not affect any system behavior

### Compliance Checklist

Before deploying Stage 2.1, verify:

- [ ] Database migration includes architectural constraints in comments
- [ ] Service layer contains ONLY approved CRUD functions
- [ ] No analysis, NLP, or AI functions exist in codebase
- [ ] ReflectionPanel uses approved gentle framing
- [ ] ReflectionVault shows chronological list with manual search only
- [ ] Reflections accessible when Safe Mode is ON
- [ ] No gamification elements (streaks, badges, completion %)
- [ ] No tag suggestions or auto-complete based on content
- [ ] User can edit and delete any reflection
- [ ] No export to external AI or analytics services
- [ ] Tests verify absence of forbidden functions
- [ ] Documentation emphasizes "record, not report" framing

---

## Success Criteria

Stage 2.1 is compliant if:

1. ✅ Users can write, read, edit, and delete reflections
2. ✅ System performs ZERO analysis on reflection content
3. ✅ Reflections remain accessible during Safe Mode
4. ✅ No AI/ML libraries are used in reflection code
5. ✅ UI uses only approved neutral language
6. ✅ Reflections do not affect any system behavior
7. ✅ Users create their own tags (no suggestions)
8. ✅ Search is manual string matching only
9. ✅ No gamification or performance tracking
10. ✅ Privacy audit confirms no external transmission

---

## Violation Remediation

If a violation is discovered:

1. **Immediate**: Remove the violating code/feature
2. **Audit**: Search codebase for similar violations
3. **User Notice**: If user data was analyzed, notify affected users
4. **Data Deletion**: Delete any derived analysis data
5. **Documentation**: Update this contract with the violation as an example
6. **Testing**: Add automated test to prevent recurrence

---

## Architectural Principles

**Stage 2.1 is fundamentally different because:**

- Stage 0 (Raw Events): System records user actions
- Stage 1 (Signals): System interprets patterns from events
- Stage 2 (Display): System shows interpretations with consent
- **Stage 2.1 (Reflections): System holds user's meaning without interpretation**

The data flow is:

```
User → Reflection Entry → Database → User
                ↓
         (System is BLIND to content meaning)
```

**The system is a mirror, not a microscope.**

---

## Version

- **Version**: 1.0
- **Date**: 2024-12-15
- **Status**: Active
- **Related**: STAGE_1_CONTRACT.md, STAGE_2_CONTRACT.md
