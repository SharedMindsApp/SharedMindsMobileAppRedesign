# Household Insight Match Feature

## Overview

The Household Insight Match is a warm, supportive feature that activates when two or more household members complete their individual profile questionnaires. It provides compassionate, strength-based insights about how household members' minds work together and offers practical suggestions for supporting each other.

## Trigger Conditions

The feature automatically activates when:
- 2 or more household members have completed their individual profiles
- The system detects this during dashboard load
- An unlock celebration plays (first time only)
- A trigger card appears on the dashboard

## Components

### 1. Database Schema

**Table**: `household_insight_matches`

Stores matched insight data for households.

**Columns**:
- `id` - Primary key
- `household_id` - Foreign key to households
- `member_ids` - Array of member IDs being compared
- `insight_cards` - JSONB array of insight card objects
- `saved_to_profile` - Boolean tracking if saved
- `viewed` - Boolean tracking if match has been seen
- `created_at`, `updated_at` - Timestamps

**Security**:
- Row Level Security enabled
- Users can read/update/insert matches for their household only

### 2. HouseholdMatchUnlockCelebration Component

**Location**: `src/components/household/HouseholdMatchUnlockCelebration.tsx`

A gentle 3-second celebration animation that appears when the match first becomes available.

**Features**:
- Soft pulsing glow with warm amber/orange/rose gradients
- Users icon with sparkle badge
- Small floating hearts
- "Household Match Unlocked!" message
- Auto-dismisses after 3 seconds
- Respects reduced motion preferences

### 3. HouseholdMatchTriggerCard Component

**Location**: `src/components/household/HouseholdMatchTriggerCard.tsx`

Dashboard banner card that invites users to view their match.

**Content**:
- "Your Household Insight Match is Ready!" headline
- Description of what's included
- "View Your Match" primary button
- Visual indicator showing number of profiles matched
- Warm gradient background (amber/orange/rose)

### 4. HouseholdInsightMatchViewer Component

**Location**: `src/components/household/HouseholdInsightMatchViewer.tsx`

Interactive swipeable card viewer for exploring insights.

**Features**:
- 7 insight cards organized by category
- Swipe left/right navigation (touch and keyboard)
- Category-specific color gradients
- Strength-based badge for positive matches
- Progress dots showing position
- Feature teaser badges for locked features

**Insight Categories**:

1. **Communication Compatibility**
   - Compares communication paces and styles
   - Icon: MessageCircle
   - Color: Blue to cyan gradient

2. **Routine & Daily Rhythm**
   - Compares structure vs. flexibility preferences
   - Icon: Calendar
   - Color: Amber to orange gradient

3. **Sensory Environment Compatibility**
   - Compares sensory comfort zones
   - Icon: Volume2
   - Color: Purple to pink gradient

4. **Emotional & Stress Pattern Differences**
   - Compares stress reset patterns
   - Icon: HeartPulse
   - Color: Rose to red gradient

5. **Task Style & Executive Function Match**
   - Compares task initiation speeds
   - Icon: CheckSquare
   - Color: Emerald to teal gradient

6. **What You Both Need Summary**
   - Universal needs for thriving together
   - Icon: Users
   - Color: Indigo to blue gradient

7. **Actionable Suggestions Checklist**
   - Practical starting points
   - Icon: ListChecks
   - Color: Green to emerald gradient

### 5. Helper Functions

**Location**: `src/lib/householdInsightMatch.ts`

**Functions**:

- `checkHouseholdMatchReady()` - Checks if household has 2+ completed profiles
- `getHouseholdMatch()` - Fetches existing match from database
- `generateHouseholdMatch()` - Creates new match with insight cards
- `markMatchAsViewed()` - Marks match as viewed (prevents celebration replay)
- `saveMatchToProfile()` - Saves match to household profile
- `generateInsightCards()` - Generates 7 insight cards based on profile comparison

**Insight Generation Logic**:

The system compares individual profile responses and generates insights based on:
- **Alignment**: When preferences match (strength-based, positive framing)
- **Difference**: When preferences differ (supportive, solution-oriented framing)

Each card includes:
- **Title**: Clear, non-judgmental statement
- **Summary**: One-sentence insight
- **Explanation**: 2-3 lines of supportive context
- **Try This**: Single actionable suggestion

## Card Structure

Each insight card contains:

```typescript
{
  category: 'communication' | 'routine' | 'sensory' | 'stress' | 'task' | 'needs' | 'actions',
  title: string,              // Short, non-judgmental
  summary: string,            // One sentence
  explanation: string,        // 2-3 supportive lines
  tryThis: string,           // Single actionable tip
  icon: string,              // Lucide icon name
  strengthBased: boolean,    // Shows strength badge
  featureTeaser?: string     // Optional locked feature hint
}
```

## Interaction Flow

1. **Dashboard Load**
   - System checks if 2+ members completed profiles
   - If yes and first view: Shows unlock celebration (3 seconds)
   - Trigger card appears on dashboard

2. **User Clicks "View Your Match"**
   - Opens full-screen card viewer
   - Shows first insight card (Communication)

3. **User Navigates Cards**
   - Swipe left/right on mobile
   - Click arrow buttons
   - Press left/right arrow keys
   - Click progress dots to jump

4. **Final Card Actions**
   - "Save to Household Profile" button
   - "Show Me More Tips" button (closes viewer)

## Emotional Tone Guidelines

All content follows these principles:

**Non-Judgmental**:
- No "good" or "bad" framing
- Differences are neutral, not problems
- Both alignment and difference are valuable

**Strength-Based**:
- Focus on what works
- Highlight natural balances
- Emphasize complementary qualities

**Solution-Oriented**:
- Every insight includes actionable tip
- Suggestions are practical and specific
- Focus on experiments, not rules

**Compassionate**:
- Validates both people's needs
- Acknowledges challenges without blame
- Emphasizes understanding over fixing

## Design Principles

### Neurodiversity-Accessible

- **Short text**: No walls of text, chunked information
- **Clear hierarchy**: Icons, headings, visual separation
- **High contrast**: WCAG compliant text/background ratios
- **Dyslexia-friendly**: Generous line spacing, clear fonts
- **Large touch targets**: Easy tap/click areas
- **Reduced motion**: Respects user preferences

### Warm & Rewarding

- **Soft colors**: Warm gradients, no harsh brights
- **Gentle animations**: Smooth transitions, no jarring effects
- **Positive language**: Supportive, validating tone
- **Celebration moments**: Recognition without overwhelm

### Clean Aesthetic

- **Rounded corners**: Soft, approachable feel
- **Gradient backgrounds**: Visual interest without clutter
- **Category colors**: Helps distinguish topics
- **Icon anchors**: Visual cues for quick scanning
- **Consistent spacing**: Professional, organized layout

## Example Insights

### Aligned Example (Strength-Based)

**Communication Compatibility**
- **Title**: "You share similar communication styles"
- **Summary**: "You naturally understand each other's pace."
- **Explanation**: "You both process and respond in similar ways. This creates natural flow in conversations. You get each other without much translation needed."
- **Try This**: "Use your natural sync to tackle complex topics together without time pressure."
- **Strength Badge**: Yes

### Different Example (Supportive)

**Routine & Daily Rhythm**
- **Title**: "You balance structure with flexibility"
- **Summary**: "One loves plans, the other loves spontaneity."
- **Explanation**: "This can feel like friction, but it's actually protective. Structure prevents chaos. Flexibility prevents rigidity. You balance each other out."
- **Try This**: "Create a weekly anchor routine (meals, bedtime) but leave weekends open for spontaneity."
- **Strength Badge**: Yes (even differences are framed positively)

## Feature Teasers

When insights reveal potential challenges that locked features can help with:

**Example**: Sensory differences detected
**Teaser**: "The Sensory Environment Planner can help map your ideal shared spaces."

This encourages continued engagement and feature unlock progression.

## Integration Points

### Dashboard Integration

The feature integrates into `StandardDashboardLayout`:
1. Checks for match readiness on mount
2. Shows unlock celebration (first time)
3. Displays trigger card when match available
4. Opens viewer on trigger card click
5. Handles save to profile action

### Individual Profile Integration

The match generates automatically when:
- Any household member completes their individual profile
- System detects 2+ completed profiles exist
- No existing match has been generated yet

## Future Enhancements

1. **Dynamic Content**: Replace sample insights with LLM-generated personalized comparisons
2. **More Categories**: Add work styles, conflict patterns, love languages
3. **Progress Tracking**: Show which suggestions have been tried
4. **Household Notes**: Allow members to add their own observations
5. **Professional Sharing**: Allow selective sharing with therapists/counselors
6. **Revisit Alerts**: Suggest reviewing match every 6 months
7. **Growth Tracking**: Compare matches over time to show progress

## Technical Notes

- Built with React and TypeScript
- Uses Tailwind CSS for styling
- Supabase for data persistence
- Touch gesture support for mobile
- Keyboard navigation support
- Fully type-safe interfaces
- Respects UI preferences (reduced motion, themes, density)
- Lazy loading for performance
- Error handling for all async operations

## Accessibility Features

- **Keyboard navigation**: Full keyboard support
- **Screen reader friendly**: Semantic HTML, ARIA labels
- **Touch gestures**: Swipe support on mobile
- **Reduced motion**: Optional animation disabling
- **High contrast**: Multiple contrast level options
- **Large text**: Scales with user font preferences
- **Focus indicators**: Clear focus states
