# Intelligent Track Category Ordering System

## Overview

Design a smart ordering system for track categories that presents the most relevant categories first, based on the track template being set up. This replaces alphabetical ordering with relevance-based ordering that improves user experience and reduces cognitive load.

## Goals

1. **Relevance-based ordering**: Categories appear in order of relevance to the current track template
2. **Template-aware**: Ordering adapts based on the track template being configured
3. **Custom category integration**: Custom categories are intelligently positioned in the ordering
4. **Search functionality**: Users can search across all categories while maintaining relevance context
5. **Performance**: Ordering calculation should be fast and not impact UX

## Current State

- Categories are loaded from `project_track_categories` (system + custom)
- Currently displayed in alphabetical order (system first, then custom)
- Categories are selected per track during Quick Setup Step 3
- Track templates have names and descriptions that could inform relevance

## Proposed System

### 1. Relevance Scoring

Each category receives a relevance score (0-1) based on multiple factors:

#### A. Template-Category Semantic Matching

**Primary Factor**: Match track template name/description with category name/description

**Scoring Method**:
- Extract keywords from template name (e.g., "Market Research" → ["market", "research"])
- Extract keywords from template description
- Compare with category keywords (name + description)
- Use simple keyword matching with weighted scoring:
  - Exact keyword match: 1.0
  - Partial keyword match: 0.5
  - Category name matches template name: 1.0
  - Category description contains template keywords: 0.7

**Example**:
- Template: "Market Research" (description: "Gathering market data and customer insights")
- Category "Research" → high score (keyword match: "research")
- Category "Discovery" → medium score (semantic similarity: "gathering" ↔ "exploring")
- Category "Design" → low score (no relevant keywords)

#### B. Category Type Weighting

**System Categories**:
- System categories get a slight boost (+0.1) as they're verified defaults
- Prevents edge cases where custom categories dominate

**Custom Categories**:
- Recent custom categories (created in last 7 days): +0.15
- Frequently used custom categories: +0.1
- This prioritizes project-specific categories that users have invested in

#### C. Domain/Project Context

**Optional Enhancement**:
- Weight categories based on project domain type (work, personal, startup, etc.)
- Certain categories more common in certain domains
- Could use historical usage data if available

### 2. Ordering Algorithm

```
For each category:
  1. Calculate semantic relevance score (0-1)
  2. Add type weighting bonus
  3. Add context weighting bonus
  4. Final score = base_score + bonuses (capped at 1.0)

Sort categories by:
  - Primary: Final relevance score (descending)
  - Secondary: Category name (alphabetical) - for ties
```

**Example Output Order** (for "Market Research" template):
1. Research (score: 0.95) - direct keyword match
2. Discovery (score: 0.75) - semantic similarity
3. Insights (score: 0.70) - related concept
4. Analysis (score: 0.65) - related concept
5. Planning (score: 0.40) - less relevant
6. ... (other categories by descending score)

### 3. Custom Category Positioning

**Strategy**: Integrate custom categories into the relevance-ordered list

**Approach**:
1. Calculate relevance scores for custom categories using the same algorithm
2. Insert custom categories into the sorted list based on their scores
3. Do NOT separate system vs custom in the UI
4. Optionally: Add a subtle indicator (badge/icon) to show which are custom

**Rationale**: 
- Users don't care about system vs custom distinction when selecting
- Relevance is more important than category type
- Reduces cognitive load (one list instead of two sections)

**Edge Case**: If custom category has very low relevance (< 0.2), still show it but near the bottom, or consider showing it in a separate "Other" section

### 4. Search Functionality

**UI Addition**:
- Add search input field at the top of the category selector
- Include search icon (magnifying glass) in the input
- Filter categories based on search query

**Search Behavior**:
1. **No Search Query**: Show all categories in relevance order
2. **With Search Query**: 
   - Filter categories where name or description contains query (case-insensitive)
   - Maintain relevance order within filtered results
   - Highlight matching text in results
   - Show "No results" if no matches

**Search Matching**:
- Match against category name (primary)
- Match against category description (secondary)
- Simple substring matching initially (can enhance to fuzzy matching later)

**UX Details**:
- Search input should be prominent and easy to access
- Clear button (X) when search has text
- Show result count: "X categories" or "No categories found"
- Search should be fast (client-side filtering)

### 5. Implementation Plan

#### Phase 1: Basic Relevance Scoring

**Files to Modify**:
- `src/components/guardrails/wizard/WizardStepQuickTrackSetup.tsx`
- New file: `src/lib/guardrails/categoryOrdering.ts`

**Steps**:
1. Create `calculateCategoryRelevance()` function
   - Input: category, trackTemplate
   - Output: relevance score (0-1)
   - Use simple keyword matching initially
2. Create `sortCategoriesByRelevance()` function
   - Input: categories array, trackTemplate
   - Output: sorted categories array
3. Update category selector to use sorted order
4. Test with various template-category combinations

#### Phase 2: Search Integration

**Files to Modify**:
- `src/components/guardrails/wizard/WizardStepQuickTrackSetup.tsx`

**Steps**:
1. Add search state (`searchQuery: string`)
2. Add search input UI to BottomSheet
3. Implement filtering logic
4. Update category list to show filtered + sorted results
5. Add search icon and clear button
6. Handle empty states

#### Phase 3: Custom Category Integration

**Files to Modify**:
- `src/components/guardrails/wizard/WizardStepQuickTrackSetup.tsx`
- `src/lib/guardrails/categoryOrdering.ts`

**Steps**:
1. Remove separate "System Categories" and "Custom Categories" sections
2. Merge all categories into single list with relevance ordering
3. Add optional visual indicator for custom categories (if desired)
4. Ensure custom categories are scored appropriately

#### Phase 4: Enhancements (Optional)

**Possible Improvements**:
- Fuzzy matching for search (handle typos)
- Historical usage weighting (learn from user patterns)
- Domain-specific category preferences
- Category aliases/synonyms
- Multi-keyword search with boolean logic

### 6. Algorithm Pseudocode

```typescript
interface CategoryRelevanceScore {
  category: ProjectTrackCategory;
  score: number;
  reason?: string; // For debugging
}

function calculateCategoryRelevance(
  category: ProjectTrackCategory,
  trackTemplate: AnyTrackTemplateWithSubTracks
): number {
  let score = 0;
  const templateKeywords = extractKeywords(trackTemplate.name + ' ' + trackTemplate.description);
  const categoryKeywords = extractKeywords(category.name + ' ' + (category.description || ''));
  
  // Exact keyword matches
  for (const templateKeyword of templateKeywords) {
    for (const categoryKeyword of categoryKeywords) {
      if (templateKeyword === categoryKeyword) {
        score += 0.3; // Strong match
      } else if (categoryKeyword.includes(templateKeyword) || templateKeyword.includes(categoryKeyword)) {
        score += 0.15; // Partial match
      }
    }
  }
  
  // Category name matches template name
  if (category.name.toLowerCase() === trackTemplate.name.toLowerCase()) {
    score = Math.max(score, 0.9);
  }
  
  // Bonus for system categories
  if (category.is_system) {
    score += 0.05;
  }
  
  // Bonus for recent custom categories
  if (!category.is_system) {
    const daysSinceCreation = getDaysSince(category.created_at);
    if (daysSinceCreation <= 7) {
      score += 0.1;
    }
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

function sortCategoriesByRelevance(
  categories: ProjectTrackCategory[],
  trackTemplate: AnyTrackTemplateWithSubTracks
): ProjectTrackCategory[] {
  const scored = categories.map(cat => ({
    category: cat,
    score: calculateCategoryRelevance(cat, trackTemplate)
  }));
  
  return scored
    .sort((a, b) => {
      // Primary sort: by score (descending)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Secondary sort: by name (alphabetical)
      return a.category.name.localeCompare(b.category.name);
    })
    .map(item => item.category);
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2) // Filter out short words
    .filter(word => !STOP_WORDS.includes(word)); // Filter common words
}

const STOP_WORDS = ['the', 'and', 'for', 'are', 'with', 'this', 'that', 'from', 'into'];
```

### 7. UI/UX Design

#### Category Selector with Search

```
┌─────────────────────────────────────────┐
│ Select Track Category            [X]    │
├─────────────────────────────────────────┤
│ 🔍 [Search categories...]          [X]  │
├─────────────────────────────────────────┤
│                                         │
│ Research                               │
│ Gathering information, data, and...    │
│                                         │
│ Discovery                              │
│ Exploring possibilities and...         │
│                                         │
│ Insights                               │
│ Synthesizing learnings and...          │
│                                         │
│ Analysis                               │
│ Examining and interpreting...          │
│                                         │
│ ...                                    │
│                                         │
│ ────────────────────────────────────   │
│ + Add custom category                  │
└─────────────────────────────────────────┘
```

**Key UI Elements**:
- Search bar at the top (prominent, easy to find)
- Search icon on the left side of input
- Clear button (X) on the right when text is present
- Categories displayed in single list (no separation)
- Optional: Small "Custom" badge on custom categories
- Result count below search (e.g., "12 categories" or "No categories found")

### 8. Edge Cases & Considerations

#### Edge Case 1: No Relevance Data
**Scenario**: Template has no name/description or very generic
**Solution**: Fall back to alphabetical ordering with system categories first

#### Edge Case 2: All Categories Have Same Score
**Scenario**: Multiple categories score equally (e.g., all 0.5)
**Solution**: Secondary sort by category name (alphabetical)

#### Edge Case 3: Custom Category With No Relevance
**Scenario**: Custom category completely unrelated to template
**Solution**: Still show it, but at the bottom of the list (sorted by name within low-scoring group)

#### Edge Case 4: Empty Search Results
**Scenario**: Search query matches no categories
**Solution**: Show "No categories found" message with suggestion to clear search

#### Edge Case 5: Very Long Category List
**Scenario**: Project has many custom categories (20+)
**Solution**: 
- Limit initial display to top 10-15 (with "Show more" if needed)
- Or: Use virtual scrolling for performance
- Search helps here - users can filter down

#### Edge Case 6: Performance
**Scenario**: Calculating relevance for 50+ categories on every render
**Solution**: 
- Memoize relevance scores (only recalculate when template changes)
- Use `useMemo` for sorted categories
- Consider caching if same template is seen multiple times

### 9. Testing Strategy

#### Unit Tests
- Test `calculateCategoryRelevance()` with various template-category pairs
- Test `sortCategoriesByRelevance()` with known inputs
- Test edge cases (empty names, special characters, etc.)

#### Integration Tests
- Test category selector with various track templates
- Test search filtering with various queries
- Test custom category integration
- Test performance with large category lists

#### User Testing
- Observe users selecting categories
- Measure time to find desired category
- Track which categories are selected most
- Validate that ordering feels intuitive

### 10. Future Enhancements

**Phase 2 Enhancements**:
1. **Machine Learning**: Learn from user selections to improve relevance
2. **Synonym Matching**: "research" matches "investigation", "study"
3. **Multi-language Support**: Extract keywords in user's language
4. **Context Awareness**: Consider project type, domain, other selected categories
5. **User Preferences**: Allow users to "favorite" categories
6. **Category Groups**: Group related categories visually (collapsible sections)

**Advanced Features**:
- Category recommendations based on similar projects
- A/B testing different ordering algorithms
- Analytics on category selection patterns
- Category usage statistics per project type

### 11. Success Metrics

**Primary Metrics**:
- Average time to select a category (should decrease)
- Categories selected from top 3 positions (should increase)
- User satisfaction with category selection

**Secondary Metrics**:
- Search usage rate
- Custom category creation rate (should remain stable or increase)
- Categories skipped/not selected (indicates poor ordering)

### 12. Open Questions

1. **Should we track user selections to improve ordering?**
   - Pro: Could learn from patterns
   - Con: Privacy concerns, complexity

2. **Should custom categories always appear in relevance order, or have a separate section?**
   - Recommendation: Integrated ordering (simpler UX)

3. **Should we show relevance scores or reasons to users?**
   - Recommendation: No (keep UI clean, trust the algorithm)

4. **How do we handle category name changes?**
   - Recalculate relevance on category update

5. **Should search be fuzzy or exact match?**
   - Start with exact match, add fuzzy later if needed

## Implementation Notes

- Start with simple keyword matching (Phase 1)
- Add search functionality (Phase 2)
- Refine algorithm based on user feedback
- Keep algorithm transparent and debuggable (console logs in dev)
- Consider performance impact (memoization, virtual scrolling)

## Conclusion

This intelligent ordering system will significantly improve the category selection experience by:
- Reducing cognitive load (most relevant first)
- Faster category selection (less scrolling)
- Better user experience (context-aware)
- Maintained flexibility (search for edge cases)

The system is designed to be incrementally improvable - start simple, add enhancements based on real-world usage.
