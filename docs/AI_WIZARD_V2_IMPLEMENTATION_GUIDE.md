# AI-Powered Project Wizard V2 - Implementation Guide

## Overview

This guide outlines the complete implementation of the Universal AI-Powered Project Wizard. The wizard transforms project creation from a manual template selection process into an intelligent, conversational experience while maintaining full control and safety.

## ✅ Completed

1. **Database Schema** - All AI wizard fields added to `master_projects` table
2. **Wizard Sessions Table** - Resumable wizard state tracking
3. **Type Definitions** - Complete TypeScript types for all wizard steps and AI structures
4. **Template Enhancements** - Added AI metadata fields to track templates

## 🔨 Implementation Roadmap

### Phase 1: AI Services Foundation

**File:** `src/lib/guardrails/ai/wizardAIService.ts`

Create the core AI service that powers all wizard AI features:

```typescript
import type {
  AIProjectIntake,
  AIClarificationQuestion,
  AIStructureDraft,
  EnhancedTrackTemplate,
} from '../wizardTypes';

export class WizardAIService {
  // Step 3: Improve project description
  async improveDescription(
    description: string,
    domain: string,
    template?: EnhancedTrackTemplate
  ): Promise<string> {
    // Use AI to rewrite/enhance description
    // Return improved version for user approval
  }

  // Step 4: Extract concepts from raw idea
  async analyzeProjectIdea(
    rawIdea: string,
    domain: string,
    template?: EnhancedTrackTemplate
  ): Promise<AIProjectIntake> {
    // Parse user's freeform project idea
    // Extract: goals, concepts, intended output type
  }

  // Step 5: Generate clarification questions
  async generateClarificationQuestions(
    intake: AIProjectIntake,
    template?: EnhancedTrackTemplate
  ): Promise<AIClarificationQuestion[]> {
    // Generate 2-5 targeted questions
    // Use template's ai_prompt_presets if available
  }

  // Step 6: Generate project structure
  async generateProjectStructure(
    intake: AIProjectIntake,
    answers: any,
    version: 'lean' | 'standard' | 'detailed'
  ): Promise<AIStructureDraft> {
    // Generate tracks, subtracks, roadmap items, nodes
    // Scale complexity based on version
  }

  // Step 8: Regenerate with different style
  async regenerateStructure(
    existingDraft: AIStructureDraft,
    style: 'creative' | 'structured' | 'minimalist'
  ): Promise<AIStructureDraft> {
    // Rebuild structure with different approach
  }
}
```

### Phase 2: Wizard Components

#### Step 3 Enhancement: `src/components/guardrails/wizard/WizardStepProjectIdentity.tsx`

Add AI description improvement:

```typescript
- Keep existing name + description fields
- Add "Improve my description with AI" button
- Show loading state during AI processing
- Display AI suggestion in preview card
- User explicitly accepts/rejects
- Store result in wizard state
```

#### Step 4: `src/components/guardrails/wizard/WizardStepIdeaIntake.tsx`

```typescript
- Large freeform textarea (8-10 rows)
- Dynamic prompt based on template
- Examples/placeholder text to guide user
- Character counter (optional)
- "Analyze my idea" button
- Loading state with progress indicator
```

#### Step 5: `src/components/guardrails/wizard/WizardStepClarification.tsx`

```typescript
- Conversational UI (one question at a time OR all questions on one screen)
- Support text input, single choice, multiple choice
- Progress indicator (Question 1 of 5)
- "Skip" option for optional questions
- Store answers in wizard state
```

#### Step 6: (Automatic - No UI)

This step runs automatically between Step 5 and Step 7.

#### Step 7: `src/components/guardrails/wizard/WizardStepVersionChoice.tsx`

```typescript
- Three version cards: Lean, Standard, Detailed
- Preview for each version:
  - X tracks
  - Y roadmap items
  - Z milestones
- Expandable detail view
- Select one version
```

#### Step 8: `src/components/guardrails/wizard/WizardStepReviewAndControls.tsx`

```typescript
- Replace old review screen
- Sections:
  - Tracks list (collapsible)
  - Subtracks list (nested under tracks)
  - Mini Mind Mesh preview (canvas thumbnail)
  - First 5 roadmap items
  - Milestones
- Toggles:
  - ✓ Include nodes
  - ✓ Include roadmap items
  - ✓ Include milestones
- "Regenerate" button with style selector
```

#### Step 10: `src/components/guardrails/ProjectWelcomePage.tsx`

```typescript
- Redirect here after project creation
- Hero section: "Welcome to [Project Name]"
- Quick stats: X tracks, Y tasks, Z milestones
- Tracks overview (cards)
- First suggested task (highlighted)
- Mini Mind Mesh preview
- Quick actions:
  - Open Roadmap
  - Open Mind Mesh
  - Open Task Flow
  - Start Focus Session
```

### Phase 3: Wizard Navigation & State

**File:** `src/contexts/ProjectWizardContext.tsx`

Update the wizard context to support:
- Resume from saved sessions
- AI feature toggles
- Step validation
- Navigation between 10 steps

```typescript
export interface ProjectWizardContextValue {
  // Existing fields...

  // New AI fields
  sessionState: WizardSessionState;
  saveSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;

  // AI actions
  improveDescription: () => Promise<void>;
  analyzeIdea: (idea: string) => Promise<void>;
  generateQuestions: () => Promise<void>;
  generateStructure: (version: string) => Promise<void>;
  regenerateStructure: (style: string) => Promise<void>;

  // AI state
  aiLoading: boolean;
  aiError: string | null;
}
```

### Phase 4: Project Generation Logic

**File:** `src/lib/guardrails/wizard.ts`

Update the `createProject` function to:

1. Read AI generation settings from wizard state
2. Create tracks from `ai_structure_draft`
3. Create subtracks
4. Create roadmap items (if enabled)
5. Create Mind Mesh nodes (if enabled)
6. Create milestones (if enabled)
7. Store AI metadata in `master_projects` table
8. Return `ProjectWizardResult` with all created entities

### Phase 5: Graceful Fallback

Ensure wizard works without AI:

1. Hide AI buttons if AI is disabled
2. Skip Steps 4-7 if no AI
3. Fall back to manual template selection
4. Use existing wizard flow for non-AI path

### Phase 6: UI/UX Polish

- Loading states for all AI operations
- Error handling with retry
- Progress indicators
- Smooth transitions between steps
- Responsive design
- Accessibility (ARIA labels, keyboard nav)

## Testing Checklist

### AI-Powered Path
- [ ] Description improvement works
- [ ] Idea intake extracts concepts correctly
- [ ] Clarification questions are relevant
- [ ] Structure generation creates valid drafts
- [ ] Three versions (lean/standard/detailed) differ appropriately
- [ ] Review controls show all elements
- [ ] Regeneration with different styles works
- [ ] Toggles correctly enable/disable features
- [ ] Project creation applies AI draft correctly
- [ ] Welcome page displays all project data

### Non-AI Path
- [ ] Wizard works without AI enabled
- [ ] Manual template selection still functions
- [ ] Legacy project creation flow preserved

### Edge Cases
- [ ] Wizard session resumption after browser close
- [ ] Session expiration (7 days) cleanup
- [ ] AI service failure handling
- [ ] Network timeout handling
- [ ] Invalid AI responses

### Security
- [ ] AI never creates authoritative records directly
- [ ] User must explicitly confirm all AI suggestions
- [ ] RLS policies prevent unauthorized access
- [ ] AI output is sanitized before display

## Architecture Principles

1. **AI = Draft Only**: AI output is NEVER authoritative. Always stored separately from real data.
2. **User Confirmation Required**: Every AI suggestion requires explicit user acceptance.
3. **Graceful Degradation**: System works fully without AI.
4. **Resumable Sessions**: Users can leave and return to wizard.
5. **Audit Trail**: All AI interactions logged for debugging and trust.

## File Structure

```
src/
├── components/
│   └── guardrails/
│       └── wizard/
│           ├── WizardStepDomainSelect.tsx (UNCHANGED)
│           ├── WizardStepTemplateSelect.tsx (ENHANCED)
│           ├── WizardStepProjectIdentity.tsx (ENHANCED)
│           ├── WizardStepIdeaIntake.tsx (NEW)
│           ├── WizardStepClarification.tsx (NEW)
│           ├── WizardStepVersionChoice.tsx (NEW)
│           ├── WizardStepReviewAndControls.tsx (UPGRADED)
│           └── WizardStepGenerate.tsx (UPGRADED)
│       └── ProjectWelcomePage.tsx (NEW)
├── lib/
│   └── guardrails/
│       └── ai/
│           └── wizardAIService.ts (NEW)
└── contexts/
    └── ProjectWizardContext.tsx (ENHANCED)
```

## Implementation Priority

1. **High Priority**: Core AI services (intake, questions, structure generation)
2. **High Priority**: Step 4-7 UI components
3. **Medium Priority**: Welcome page
4. **Medium Priority**: Session management
5. **Low Priority**: Regeneration with styles
6. **Low Priority**: Advanced toggles

## Notes

- AI prompts should be stored in configuration, not hardcoded
- Consider rate limiting AI calls per user
- Monitor AI costs and usage
- Collect user feedback on AI quality
- A/B test AI vs non-AI project creation success rates
