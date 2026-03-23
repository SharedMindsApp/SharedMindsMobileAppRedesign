# Personal Growth Features (Linked, Non-Duplicative)

## Overview

This system implements four core personal growth features as part of the Planner:
1. **Hobbies & Interests** - Joy, curiosity, identity beyond productivity
2. **Values & Principles** - Anchor for decisions, goals, and behaviour
3. **Ideas & Inspiration** - Capture sparks without obligation
4. **Personal Habits** - Consistency support without obsession

## Core Principles

**Single Source of Truth**: All data lives in Personal Spaces/Shared Spaces. Planner features are views + light interaction layers.

**Opt-In Sharing**: Nothing shared by default. Users explicitly choose what to share, with whom, and at what level.

**No Gamification**: No streaks, scores, XP, or rankings. Human, reflective language only.

**Integration First**: Links to Skills, Goals, Journal, Vision, and Planning systems. Reference-based, never duplicated.

## Database Schema

### hobbies_interests
Supports joy and identity exploration beyond productivity.

**Core Fields**:
- `name` - Hobby name
- `description` - Optional details
- `category` - creative, physical, social, intellectual, relaxation
- `why_i_enjoy` - Personal reflection
- `how_it_makes_me_feel` - Emotional connection
- `engagement_level` - occasional, regular, frequent, deep_focus (qualitative)

**Linking**:
- `linked_skills[]` - References to user_skills
- `linked_self_care[]` - References to self-care routines
- `linked_social_activities[]` - References to social events

**Sharing**:
- `is_private` - Default true
- `shared_space_id` - Opt-in space sharing

### values_principles
Anchors decisions, goals, and behaviour to identity.

**Core Fields**:
- `name` - Value name (e.g., Honesty, Curiosity)
- `personal_definition` - "What this means to me"
- `how_it_shows_up` - How it manifests daily
- `example_moments[]` - JSONB array of { date, description, linked_journal_id }
- `importance_level` - foundational, important, emerging, exploring (soft, not ranked)

**Linking**:
- `linked_goals[]` - References to goals
- `linked_skills[]` - References to user_skills
- `linked_decisions[]` - Free-text decision references
- `linked_vision_themes[]` - References to vision themes

**Sharing**:
- `is_private` - Default true
- `shared_space_id` - Opt-in space sharing
- `share_level` - name_only or full

### ideas_inspiration
Captures sparks without obligation or pressure.

**Core Fields**:
- `title` - Idea name
- `description` - Optional details
- `content_type` - text, link, image
- `content_data` - JSONB with content details
- `tags[]` - personal, work, creative, learning, etc.
- `status` - just_a_thought, exploring, ready_to_act
- `captured_because` - Why this sparked interest
- `energy_level` - curious, excited, inspired, urgent

**Linking**:
- `linked_goals[]`
- `linked_projects[]` - Guardrails projects
- `linked_skills[]`
- `linked_journal_entries[]`

**Promotion Tracking**:
- `promoted_to` - 'project', 'learning_plan', null
- `promoted_at` - Timestamp
- `promoted_reference_id` - Reference to created entity

**Sharing**:
- `is_private` - Default true
- `shared_space_id` - Opt-in space sharing

### personal_habits
Personal habit tracking with reflection, no streaks.

**Core Fields**:
- `name` - Habit name
- `description` - Optional details
- `category` - health, mental, home, learning, relationships, creative
- `frequency_type` - daily, weekly, flexible, rhythm
- `frequency_description` - "Most mornings" or "When I feel like it"
- `reflection_notes` - Overall reflections
- `what_helps` - "What helps me do this?"
- `what_gets_in_way` - "What makes this harder?"

**Linking**:
- `linked_goals[]`
- `linked_skills[]`
- `linked_self_care[]`
- `linked_values[]` - Link to values_principles

**Sharing**:
- `is_private` - Default true
- `shared_space_id` - Opt-in space sharing (useful for couples/family habits)
- `is_active` - Can pause without deleting

### habit_completions
Non-streak completion tracking with qualitative reflection.

**Core Fields**:
- `habit_id` - Reference to personal_habits
- `completion_date` - Date (unique per habit per day)
- `felt_like` - "How did it feel?"
- `context_notes` - "What was happening?"
- `energy_level` - depleted, low, moderate, high

**View**: `habit_consistency_view` provides trend data (completed days in last 7/30, not streaks).

## Service Layer API

Located in `/src/lib/personalGrowthService.ts`

### Hobbies Service

```typescript
import { hobbiesService, HobbyInterest, HobbyCategory, EngagementLevel } from '../lib/personalGrowthService';

// Get all hobbies
const hobbies = await hobbiesService.getAll(userId);

// Get by category
const creative = await hobbiesService.getByCategory(userId, 'creative');

// Create
const hobby = await hobbiesService.create({
  user_id: userId,
  name: 'Watercolor Painting',
  category: 'creative',
  why_i_enjoy: 'Helps me relax and express myself',
  how_it_makes_me_feel: 'Calm and present',
  engagement_level: 'regular',
  is_private: true
});

// Update
await hobbiesService.update(hobbyId, {
  engagement_level: 'frequent',
  linked_skills: [skillId1, skillId2]
});

// Share to space
await hobbiesService.shareToSpace(hobbyId, spaceId);
```

### Values Service

```typescript
import { valuesService, ValuePrinciple, ImportanceLevel } from '../lib/personalGrowthService';

// Get all values
const values = await valuesService.getAll(userId);

// Create
const value = await valuesService.create({
  user_id: userId,
  name: 'Curiosity',
  personal_definition: 'Always learning and asking questions',
  how_it_shows_up: 'I read daily and explore new topics',
  importance_level: 'foundational',
  is_private: true,
  share_level: 'full'
});

// Add example moment
await valuesService.addExampleMoment(valueId, {
  date: new Date().toISOString(),
  description: 'Asked thoughtful questions in team meeting',
  linked_journal_id: journalEntryId
});

// Share with name only (privacy-focused)
await valuesService.shareToSpace(valueId, spaceId, 'name_only');
```

### Ideas Service

```typescript
import { ideasService, IdeaInspiration, IdeaStatus } from '../lib/personalGrowthService';

// Quick capture
const idea = await ideasService.quickCapture(
  userId,
  'Build a community garden',
  'Could bring neighbors together and provide fresh produce',
  ['personal', 'social']
);

// Get by status
const exploring = await ideasService.getByStatus(userId, 'exploring');

// Update status
await ideasService.update(ideaId, {
  status: 'ready_to_act',
  energy_level: 'excited'
});

// Promote to project
await ideasService.promoteToProject(ideaId, projectId);

// Promote to learning plan
await ideasService.promoteToLearning(ideaId, learningPlanId);
```

### Personal Habits Service

```typescript
import { personalHabitsService, PersonalHabit, HabitCategory } from '../lib/personalGrowthService';

// Create habit
const habit = await personalHabitsService.create({
  user_id: userId,
  name: 'Morning Journaling',
  category: 'mental',
  frequency_type: 'flexible',
  frequency_description: 'Most mornings, when I feel ready',
  what_helps: 'Having my journal by my bed',
  linked_values: [valueId],
  is_private: true,
  is_active: true
});

// Record completion (no streak pressure)
await personalHabitsService.recordCompletion(userId, habitId, {
  felt_like: 'Peaceful and clarifying',
  context_notes: 'Reflected on yesterday\'s challenges',
  energy_level: 'moderate'
});

// Get consistency (trend, not streak)
const consistency = await personalHabitsService.getHabitConsistency(habitId);
// Returns: { completed_days_last_7, completed_days_last_30, last_completed }

// Get recent completions
const completions = await personalHabitsService.getCompletions(habitId, 30);
```

## UI Integration Examples

### Hobbies Card Component

```typescript
export function HobbiesView() {
  const { user } = useAuth();
  const [hobbies, setHobbies] = useState<HobbyInterest[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<HobbyCategory | 'all'>('all');

  useEffect(() => {
    if (user) loadHobbies();
  }, [user]);

  const loadHobbies = async () => {
    const data = selectedCategory === 'all'
      ? await hobbiesService.getAll(user!.id)
      : await hobbiesService.getByCategory(user!.id, selectedCategory);
    setHobbies(data);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-serif text-slate-800">Hobbies & Interests</h2>
      <p className="text-sm text-slate-600">What brings you joy beyond productivity?</p>

      {/* Category filter */}
      <div className="flex gap-2">
        {['all', 'creative', 'physical', 'social', 'intellectual', 'relaxation'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat as any)}
            className={`px-3 py-1 rounded-lg text-sm ${
              selectedCategory === cat
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Hobbies grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hobbies.map(hobby => (
          <div key={hobby.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="font-medium text-slate-900">{hobby.name}</h3>
            {hobby.why_i_enjoy && (
              <p className="text-sm text-slate-600 mt-2 italic">"{hobby.why_i_enjoy}"</p>
            )}
            {hobby.how_it_makes_me_feel && (
              <p className="text-xs text-slate-500 mt-1">
                Makes me feel: {hobby.how_it_makes_me_feel}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {hobby.is_private ? (
                <Lock className="w-4 h-4 text-slate-400" />
              ) : (
                <Users className="w-4 h-4 text-blue-500" />
              )}
              <span className="text-xs text-slate-500">
                {hobby.engagement_level || 'Occasional'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Values Editorial View

```typescript
export function ValuesView() {
  const { user } = useAuth();
  const [values, setValues] = useState<ValuePrinciple[]>([]);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-serif text-slate-900">My Values</h1>
        <p className="text-lg text-slate-600">What anchors my decisions and actions</p>
      </div>

      {values.map(value => (
        <div key={value.id} className="border-b border-slate-200 pb-8 last:border-0">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-serif text-slate-800">{value.name}</h2>
            <span className="text-xs text-slate-500 uppercase tracking-wide">
              {value.importance_level}
            </span>
          </div>

          {value.personal_definition && (
            <p className="text-lg text-slate-700 mt-4 leading-relaxed">
              {value.personal_definition}
            </p>
          )}

          {value.how_it_shows_up && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-1">How it shows up:</p>
              <p className="text-sm text-slate-600">{value.how_it_shows_up}</p>
            </div>
          )}

          {value.example_moments && value.example_moments.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                Recent examples
              </p>
              {value.example_moments.slice(0, 3).map((moment, i) => (
                <div key={i} className="text-sm text-slate-600 pl-4 border-l-2 border-slate-200">
                  <span className="text-slate-400">
                    {new Date(moment.date).toLocaleDateString()}:
                  </span>{' '}
                  {moment.description}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Ideas Inbox View

```typescript
export function IdeasInboxView() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<IdeaInspiration[]>([]);
  const [quickTitle, setQuickTitle] = useState('');

  const handleQuickCapture = async () => {
    if (!quickTitle.trim()) return;
    await ideasService.quickCapture(user!.id, quickTitle);
    setQuickTitle('');
    loadIdeas();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium text-slate-800">Ideas & Inspiration</h2>
        <p className="text-sm text-slate-600 mt-1">Capture sparks without pressure</p>
      </div>

      {/* Quick capture */}
      <div className="flex gap-2">
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickCapture()}
          placeholder="Quick idea..."
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
        />
        <button
          onClick={handleQuickCapture}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Capture
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        {(['just_a_thought', 'exploring', 'ready_to_act'] as IdeaStatus[]).map(status => (
          <button key={status} className="pb-2 px-4 text-sm border-b-2 border-transparent">
            {IDEA_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Ideas list */}
      <div className="space-y-3">
        {ideas.map(idea => (
          <div key={idea.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="font-medium text-slate-900">{idea.title}</h3>
            {idea.description && (
              <p className="text-sm text-slate-600 mt-1">{idea.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              {idea.energy_level && (
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">
                  {idea.energy_level}
                </span>
              )}
              {idea.tags?.map(tag => (
                <span key={tag} className="text-xs text-slate-500">#{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Zero-pressure empty state */}
      {ideas.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p>No ideas captured yet</p>
          <p className="text-sm mt-1">That's completely fine</p>
        </div>
      )}
    </div>
  );
}
```

### Habits Tracker View

```typescript
export function PersonalHabitsView() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<PersonalHabit[]>([]);
  const [consistency, setConsistency] = useState<Record<string, HabitConsistency>>({});

  const handleToggleCompletion = async (habitId: string) => {
    await personalHabitsService.recordCompletion(user!.id, habitId, {
      energy_level: 'moderate'
    });
    loadConsistency();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium text-slate-800">Personal Habits</h2>
        <p className="text-sm text-slate-600 mt-1">Support consistency, not perfection</p>
      </div>

      <div className="space-y-3">
        {habits.map(habit => {
          const cons = consistency[habit.id];
          return (
            <div key={habit.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{habit.name}</h3>
                  {habit.frequency_description && (
                    <p className="text-xs text-slate-500 mt-1">{habit.frequency_description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleToggleCompletion(habit.id)}
                  className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center hover:border-green-500"
                >
                  <Check className="w-4 h-4 text-green-600" />
                </button>
              </div>

              {/* Soft consistency view (not streak) */}
              {cons && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex gap-6 text-xs text-slate-600">
                    <span>{cons.completed_days_last_7} days this week</span>
                    <span>{cons.completed_days_last_30} days this month</span>
                  </div>
                </div>
              )}

              {/* Reflection prompts */}
              {habit.what_helps && (
                <details className="mt-3">
                  <summary className="text-xs text-slate-600 cursor-pointer">
                    What helps
                  </summary>
                  <p className="text-sm text-slate-600 mt-2 pl-4">{habit.what_helps}</p>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## Integration Points

### With Skills System

Hobbies and Habits can link to Skills:
```typescript
// Link hobby to creativity skill
await hobbiesService.update(hobbyId, {
  linked_skills: [creativitySkillId]
});

// Track skill usage through hobby
await skillEvidenceService.recordEvidence({
  user_id: userId,
  skill_id: creativitySkillId,
  evidence_type: 'hobby',
  reference_id: hobbyId,
  context_notes: 'Practiced watercolor painting',
  difficulty_felt: 'easier_than_before',
  occurred_at: new Date().toISOString()
});
```

### With Goals System

Values and Ideas can link to Goals:
```typescript
// Link value to goal
await valuesService.update(valueId, {
  linked_goals: [goalId]
});

// Link idea to goal
await ideasService.update(ideaId, {
  linked_goals: [goalId]
});
```

### With Journal System

Values and Ideas can link to Journal entries:
```typescript
// Add journal entry as example moment for value
await valuesService.addExampleMoment(valueId, {
  date: new Date().toISOString(),
  description: 'Wrote about my commitment to honesty',
  linked_journal_id: journalEntryId
});

// Link idea to journal entry
await ideasService.update(ideaId, {
  linked_journal_entries: [journalEntryId]
});
```

### With Shared Spaces

All features support opt-in sharing:
```typescript
// Share hobby to family space
await hobbiesService.shareToSpace(hobbyId, familySpaceId);

// Share value (name only for privacy)
await valuesService.shareToSpace(valueId, teamSpaceId, 'name_only');

// Share idea to creative space
await ideasService.shareToSpace(ideaId, creativeSpaceId);

// Share couple's habit
await personalHabitsService.shareToSpace(habitId, coupleSpaceId);
```

## Design Guidelines

### Visual Style

**Hobbies**: Card-based, soft colors, joy-focused
**Values**: Editorial typography, spacious, timeless
**Ideas**: Inbox-style, minimal friction, zero pressure
**Habits**: List-based, calm indicators, reflection-focused

### Color Palette

- **Private indicator**: Gray lock icon (Lock)
- **Shared indicator**: Blue users icon (Users)
- **Categories**: Soft pastels (not bright)
- **Energy levels**: Amber tones
- **Status**: Blue (thought), Green (exploring), Emerald (ready)

### Typography

- **Headings**: Font-serif for Values, font-medium for others
- **Body**: font-normal, leading-relaxed
- **Reflections**: Italic, slightly smaller
- **Metadata**: text-xs, uppercase tracking-wide

### Empty States

Always zero-pressure:
- "No hobbies yet" - That's okay
- "No values captured" - Take your time
- "No ideas right now" - They'll come
- "No habits tracked" - No pressure

### Mobile Considerations

- Stack cards vertically
- Larger touch targets
- Bottom sheet modals
- Swipe actions for completion
- Simplified reflection forms

## Privacy & Sharing

**Default State**: Everything private

**Sharing Levels**:
- `is_private: true` - Only you can see
- `shared_space_id: X` - Shared to specific space
- `share_level: 'name_only'` - For values (privacy-focused)

**Visual Indicators**:
- Lock icon (🔒) for private
- Users icon (👥) for shared
- Space name shown when shared

## What This System Does NOT Do

- No streak counting or "missed day" warnings
- No scoring or ranking
- No optimization pressure
- No forced frequency targets
- No "success/failure" language
- No automatic sharing or exposure
- No gamification mechanics

## Success Metrics

Users should feel:
- **Free to explore** hobbies without commitment pressure
- **Safe to reflect** on values without judgment
- **Unpressured to execute** on every idea
- **Supported, not surveilled** in habit building
- **Confident** nothing is duplicated or lost

## Future Enhancements

Ready for:
- AI-assisted reflection prompts (opt-in)
- Collaborative values workshops (shared spaces)
- Idea clustering and themes (pattern recognition)
- Habit rhythm analysis (capacity-aware)
- Cross-user inspiration (with permission)

## Integration Checklist

When building UI components:

- [ ] Use service layer, never direct database calls
- [ ] Show privacy indicators (🔒 / 👥)
- [ ] Support opt-in sharing dialogs
- [ ] Use soft, calm language (no pressure)
- [ ] Zero-pressure empty states
- [ ] Link to Skills/Goals/Journal where appropriate
- [ ] Mobile-first responsive design
- [ ] Keyboard navigation support
- [ ] No gamification visuals or language
- [ ] Editorial typography for Values
- [ ] Quick-capture for Ideas
- [ ] Reflection focus for Habits
- [ ] Celebration without pressure

## Documentation

For implementation details, see:
- `/src/lib/personalGrowthService.ts` - Service layer
- Database schema in migration: `create_personal_growth_features_corrected.sql`
- Integration examples in this document

The system is production-ready and builds successfully. UI components can be added incrementally following the patterns above.
