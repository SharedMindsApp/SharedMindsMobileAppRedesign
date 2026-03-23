# Skills UI Enhancement Guide

## Overview

This guide explains how to enhance the existing skills UI components to utilize the full intelligence layer.

## Current State

**Implemented**:
- Basic unified architecture (user_skills + personal_skills_context)
- Simple Personal Development Skills view
- Status toggling (active/inactive)
- Basic context editing

**Available but Not Yet Utilized**:
- Momentum indicators
- Smart insights
- Evidence tracking
- Practice logs
- Life area linkage
- Capacity context
- Sub-skills
- Prerequisites

## Enhancement Roadmap

### Phase 1: Status Management Enhancement

**Location**: `SkillsDevelopmentView.tsx`

**Current**: Binary active/inactive toggle

**Enhance To**:
```typescript
// Add status selector
<select value={context?.status || 'active'} onChange={(e) => handleStatusChange(e.target.value)}>
  <option value="active">Active - Currently Developing</option>
  <option value="background">Background - Maintaining</option>
  <option value="paused">Paused - Not Priority Right Now</option>
</select>
```

**UI Treatment**:
- Active: Violet border, prominent
- Background: Neutral border, subtle
- Paused: Gray border, faded

### Phase 2: Momentum Indicators

**Add to SkillCard Component**:
```typescript
import { MOMENTUM_LABELS } from '../../lib/skillsService';
import { momentumCalculator } from '../../lib/skillsIntelligence';

// Calculate momentum on mount or refresh
useEffect(() => {
  if (user && skill.id) {
    momentumCalculator.calculateMomentum(user.id, skill.id).then(setMomentum);
  }
}, [user, skill.id]);

// Display momentum badge
{momentum && (
  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getMomentumColor(momentum)}`}>
    {MOMENTUM_LABELS[momentum]}
  </span>
)}

function getMomentumColor(momentum: SkillMomentum): string {
  switch (momentum) {
    case 'dormant': return 'bg-gray-100 text-gray-600';
    case 'emerging': return 'bg-blue-100 text-blue-700';
    case 'stabilising': return 'bg-green-100 text-green-700';
    case 'integrated': return 'bg-emerald-100 text-emerald-700';
  }
}
```

### Phase 3: Smart Insights Panel

**Create new component**: `SkillInsightsPanel.tsx`

```typescript
import { insightsGenerator } from '../../lib/skillsIntelligence';

export function SkillInsightsPanel({ userId, skillId }: Props) {
  const [insights, setInsights] = useState<SkillInsight[]>([]);

  useEffect(() => {
    loadInsights();
  }, [userId, skillId]);

  const loadInsights = async () => {
    const data = await insightsGenerator.getSkillInsights(userId, skillId);
    setInsights(data);
  };

  const handleDismiss = async (insightId: string) => {
    await insightsGenerator.dismissInsight(insightId);
    loadInsights();
  };

  return (
    <div className="space-y-3">
      {insights.map(insight => (
        <div key={insight.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">{insight.message}</p>
              <details className="mt-2">
                <summary className="text-xs text-blue-700 cursor-pointer">
                  Why am I seeing this?
                </summary>
                <p className="text-xs text-blue-600 mt-2">{insight.explanation}</p>
              </details>
            </div>
            <button
              onClick={() => handleDismiss(insight.id)}
              className="text-blue-400 hover:text-blue-600"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Phase 4: Evidence Tracking

**Add "Record Practice" button to SkillCard**:
```typescript
const [showPracticeModal, setShowPracticeModal] = useState(false);

<button
  onClick={() => setShowPracticeModal(true)}
  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
>
  Record Practice
</button>

{showPracticeModal && (
  <RecordPracticeModal
    skill={skill}
    onClose={() => setShowPracticeModal(false)}
    onSuccess={() => {
      setShowPracticeModal(false);
      refreshSkill();
    }}
  />
)}
```

**Create**: `RecordPracticeModal.tsx`
```typescript
import { skillEvidenceService, personalSkillsContextService } from '../../lib/skillsService';

export function RecordPracticeModal({ skill, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('reflection');
  const [contextNotes, setContextNotes] = useState('');
  const [difficultyFelt, setDifficultyFelt] = useState<DifficultyFelt>('about_the_same');

  const handleSubmit = async () => {
    if (!user) return;

    // Record evidence
    await skillEvidenceService.recordEvidence({
      user_id: user.id,
      skill_id: skill.id,
      evidence_type: evidenceType,
      context_notes: contextNotes,
      difficulty_felt: difficultyFelt,
      occurred_at: new Date().toISOString()
    });

    // Add practice log
    await personalSkillsContextService.addPracticeLog(user.id, skill.id, {
      context: contextNotes,
      felt: difficultyFelt.replace(/_/g, ' ')
    });

    onSuccess();
  };

  return (
    // Modal UI with form fields
  );
}
```

### Phase 5: Confidence vs Proficiency

**Enhance EditSkillModal**:
```typescript
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>Proficiency (Capability)</label>
    <select value={proficiency} onChange={(e) => setProficiency(Number(e.target.value))}>
      {[1,2,3,4,5].map(level => (
        <option key={level} value={level}>{PROFICIENCY_LABELS[level]}</option>
      ))}
    </select>
  </div>
  <div>
    <label>Confidence (How You Feel)</label>
    <select value={confidenceLevel} onChange={(e) => setConfidenceLevel(Number(e.target.value))}>
      {[1,2,3,4,5].map(level => (
        <option key={level} value={level}>{CONFIDENCE_LABELS[level]}</option>
      ))}
    </select>
  </div>
</div>

<p className="text-sm text-slate-600 mt-2">
  Proficiency is what you can do. Confidence is how you feel about it.
  These can be different!
</p>
```

### Phase 6: Life Area Integration

**Add to EditContextModal**:
```typescript
import { LIFE_AREAS } from '../../lib/skillsService';

<div>
  <label>Life Area</label>
  <select value={lifeArea} onChange={(e) => setLifeArea(e.target.value)}>
    <option value="">No specific area</option>
    {LIFE_AREAS.map(area => (
      <option key={area} value={area}>{area}</option>
    ))}
  </select>
  <p className="text-xs text-slate-500 mt-1">
    Where does this skill matter most in your life?
  </p>
</div>
```

### Phase 7: Practice Logs Display

**Add to SkillCard expansion**:
```typescript
{context?.practice_logs && context.practice_logs.length > 0 && (
  <div className="mt-4 pt-4 border-t border-slate-200">
    <h5 className="text-sm font-semibold text-slate-700 mb-2">Recent Practice</h5>
    <div className="space-y-2">
      {context.practice_logs.slice(0, 3).map((log, i) => (
        <div key={i} className="text-sm bg-slate-50 rounded p-2">
          <span className="text-slate-500">
            {new Date(log.date).toLocaleDateString()}:
          </span>
          <span className="text-slate-700 ml-2">{log.context}</span>
          {log.felt && (
            <span className="text-slate-600 ml-2 italic">• {log.felt}</span>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

### Phase 8: Capacity Context

**Add to EditSkillModal** (advanced users only):
```typescript
<details className="mt-4">
  <summary className="text-sm font-medium text-slate-700 cursor-pointer">
    Capacity Context (Optional)
  </summary>
  <div className="mt-3 space-y-3 p-4 bg-slate-50 rounded-lg">
    <p className="text-xs text-slate-600">
      How external factors affect your ability to use this skill
    </p>

    <div>
      <label className="text-xs">Health</label>
      <select value={capacityContext.health} onChange={...}>
        <option value="">Not tracking</option>
        <option value="low">Low</option>
        <option value="moderate">Moderate</option>
        <option value="good">Good</option>
        <option value="excellent">Excellent</option>
      </select>
    </div>

    {/* Similar for stress, workload, energy */}
  </div>
</details>
```

### Phase 9: Sub-Skills

**Add to SkillCard**:
```typescript
const [subSkills, setSubSkills] = useState<UserSkill[]>([]);

useEffect(() => {
  skillsService.getSubSkills(skill.id).then(setSubSkills);
}, [skill.id]);

{subSkills.length > 0 && (
  <div className="mt-4 pt-4 border-t border-slate-200">
    <h5 className="text-sm font-semibold text-slate-700 mb-2">Sub-Skills</h5>
    <div className="flex flex-wrap gap-2">
      {subSkills.map(subSkill => (
        <span key={subSkill.id} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">
          {subSkill.name}
        </span>
      ))}
    </div>
  </div>
)}
```

### Phase 10: Guardrails Integration

**Create**: `GuardrailsSkillsMatrix.tsx` in `src/components/guardrails/reality/`

**Features**:
- Matrix view (skills vs proficiency)
- List view toggle
- Category filters
- Dependency visualization (D3.js or React Flow)
- Long-term trend charts
- Export to project requirements

**UI Principles**:
- Neutral, professional tone
- No emotional language
- Focus on capability assessment
- Link to project requirements
- Show skill gaps for project feasibility

## UI Patterns

### Momentum Color Coding
- **Dormant**: Gray (bg-gray-100 text-gray-600)
- **Emerging**: Blue (bg-blue-100 text-blue-700)
- **Stabilising**: Green (bg-green-100 text-green-700)
- **Integrated**: Emerald (bg-emerald-100 text-emerald-700)

### Status Styling
- **Active**: Violet border, shadow, prominent
- **Background**: Neutral border, no shadow
- **Paused**: Gray border, opacity-75

### Insight Styling
- Light background (blue-50, amber-50)
- Soft border
- Collapsible explanation
- Dismiss button (X icon)
- No red/warning colors (calm tone)

### Evidence Icons
- Journal: BookOpen
- Project: Briefcase
- Habit: Repeat
- Task: CheckSquare
- Learning: GraduationCap
- Reflection: MessageSquare
- Feedback: Users

## Accessibility

- All interactive elements keyboard-navigable
- ARIA labels on icon buttons
- Focus indicators visible
- Color not sole indicator (use icons + text)
- Screen reader announcements for insights

## Performance Optimization

- Lazy load insights (only when expanded)
- Cache momentum calculations (5-minute TTL)
- Paginate evidence lists
- Debounce practice log saves
- Use optimistic UI updates

## Mobile Considerations

- Collapse verbose explanations
- Stack proficiency/confidence vertically
- Touch-friendly hit targets (44x44px minimum)
- Swipe to dismiss insights
- Bottom sheet for evidence recording

## Testing Considerations

- Mock intelligence service in tests
- Test empty states (no evidence, no insights)
- Test privacy controls
- Test evidence linking
- Test momentum calculation edge cases

## Migration Path

For existing users with old schema:
1. Run migration to add new columns
2. Default status = 'active' for existing context
3. Calculate initial momentum (async job)
4. No insights until evidence accumulates
5. Gradually roll out intelligence features

## Feature Flags

Consider feature flags for:
- Smart insights (can be overwhelming for new users)
- Capacity context (advanced users only)
- Sub-skills (for complex domains)
- Evidence tracking (opt-in initially)

## Documentation for Users

Include in-app help:
- "What's momentum?" tooltip
- "Why these insights?" modal
- "How does evidence work?" guide
- "Proficiency vs Confidence" explainer

## Next Steps

1. Choose one phase to implement
2. Build and test thoroughly
3. Gather user feedback
4. Iterate based on usage patterns
5. Roll out next phase

Start with **Phase 2 (Momentum)** - it's visual, non-intrusive, and adds immediate value.
