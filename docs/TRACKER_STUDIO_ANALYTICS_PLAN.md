# Tracker Studio Analytics & Visualization Plan

## Overview

This document outlines the analytics and visualization strategy for Tracker Studio. The goal is to make trackers feel alive, useful, and engaging while maintaining the core principles of non-judgmental, user-controlled tracking.

## Core Principles

1. **Non-Judgmental**: No red/green indicators, no "good/bad" labels, no performance scoring
2. **Descriptive, Not Prescriptive**: Show patterns, not goals or targets
3. **User-Controlled**: Analytics are optional, user can hide/show as desired
4. **Context-Aware**: Incorporate Context Events to explain patterns
5. **Calm & Respectful**: Avoid gamification, streaks, or optimization language
6. **Schema-Driven**: Visualizations adapt to any tracker type automatically

## Visualization Types

### 1. Time Series Line Chart
**Purpose**: Show how values change over time

**Use Cases**:
- Single numeric field over time (e.g., sleep duration, mood rating, energy level)
- Multiple numeric fields on same chart (e.g., morning/afternoon/evening energy)
- Rating fields (1-5 scale)

**Visual Design**:
- Smooth line with subtle gradient fill
- Soft colors (blues, purples, greens)
- No grid lines (or very subtle)
- Date range selector at bottom
- Hover tooltip shows exact date and value
- Context events shown as background bands

**Data Requirements**:
- Date range (default: last 30 days)
- Field ID(s) to display
- Aggregation: daily average, or raw values

**Example Trackers**:
- Sleep Tracker (duration, quality)
- Mood Tracker (mood rating)
- Energy Level Tracker (morning/afternoon/evening)
- Growth Tracking (confidence, resilience, focus, self-trust)

---

### 2. Calendar Heatmap
**Purpose**: Visual pattern recognition over time

**Use Cases**:
- Daily entries (presence/absence)
- Boolean fields (completed/not completed)
- Rating fields (color intensity by value)
- Frequency patterns

**Visual Design**:
- Traditional GitHub-style contribution graph
- Color intensity based on value (or presence)
- Subtle color scale (avoid red/green)
- Hover shows date and value
- Context events shown as border highlights

**Data Requirements**:
- Date range (default: last 3-6 months)
- Field ID (or entry presence)
- Color mapping strategy

**Example Trackers**:
- Habit Check-in Tracker (completed/not)
- Exercise Tracker (activity presence)
- Gratitude Journal (entry presence)
- Any daily tracker (frequency visualization)

---

### 3. Bar Chart (Time Period Comparison)
**Purpose**: Compare values across time periods

**Use Cases**:
- Weekly averages (this week vs last week)
- Monthly summaries
- Before/during/after context events
- Day of week patterns

**Visual Design**:
- Horizontal or vertical bars
- Soft, muted colors
- No "better/worse" indicators
- Side-by-side comparison
- Subtle labels

**Data Requirements**:
- Time period selection
- Aggregation method (average, sum, count)
- Comparison periods

**Example Trackers**:
- Sleep Tracker (weekly average duration)
- Exercise Tracker (weekly activity count)
- Productivity Tracker (weekly focus levels)

---

### 4. Distribution Histogram
**Purpose**: Show value distribution patterns

**Use Cases**:
- Value frequency (how often each rating appears)
- Range analysis (most common values)
- Outlier identification (without judgment)

**Visual Design**:
- Vertical bars showing frequency
- Soft gradient colors
- No axis labels that imply judgment
- Optional: show mean/median as subtle line

**Data Requirements**:
- Numeric or rating field
- Date range
- Bin size (for numeric fields)

**Example Trackers**:
- Sleep Quality (distribution of 1-5 ratings)
- Mood Tracker (mood distribution)
- Energy Level (energy distribution)

---

### 5. Multi-Field Comparison Chart
**Purpose**: Compare multiple fields from same tracker

**Use Cases**:
- Growth Tracking (confidence, resilience, focus, self-trust)
- Energy Level (morning, afternoon, evening)
- Multiple rating fields

**Visual Design**:
- Grouped bar chart or multi-line chart
- Different colors per field
- Legend for field identification
- Time-based (shows trends) or aggregated (shows averages)

**Data Requirements**:
- Multiple field IDs from same tracker
- Date range
- Aggregation method

**Example Trackers**:
- Growth Tracking (all 4 dimensions)
- Energy Level Tracker (3 time periods)

---

### 6. Entry Frequency Chart
**Purpose**: Show how often entries are logged

**Use Cases**:
- Entry consistency (without judgment)
- Pattern recognition (which days have entries)
- Missing data visualization

**Visual Design**:
- Simple bar chart or line chart
- Shows count of entries per day/week/month
- Subtle "no entry" indication (not "missed")
- Optional: show as percentage of possible entries

**Data Requirements**:
- Entry dates
- Granularity (daily/weekly/monthly)
- Date range

**Example Trackers**:
- Any tracker (universal visualization)

---

### 7. Context Event Overlay
**Purpose**: Show how context events relate to tracker patterns

**Use Cases**:
- Visualize tracker changes during context events
- Before/during/after comparisons
- Pattern explanation

**Visual Design**:
- Background bands on time series charts
- Subtle color coding per context type
- Tooltip shows context event details
- Optional: segmented view (before/during/after)

**Data Requirements**:
- Context events for date range
- Tracker entries for same range
- Context event metadata (type, label, dates)

**Example Trackers**:
- All trackers (when context events exist)

---

### 8. Simple Summary Statistics
**Purpose**: Quick numeric overview

**Use Cases**:
- Average values
- Total counts
- Date ranges
- Simple metrics

**Visual Design**:
- Large, readable numbers
- Subtle labels
- No comparison indicators
- Optional: sparkline mini-chart

**Data Requirements**:
- Field ID
- Date range
- Aggregation method

**Example Trackers**:
- All numeric/rating trackers

---

## Implementation Architecture

### 1. Charting Library Selection

**Recommended**: Recharts (React-based, flexible, accessible)
- **Pros**: 
  - React-native, works well with TypeScript
  - Highly customizable
  - Good mobile support
  - Active maintenance
  - Free and open source
- **Alternatives Considered**:
  - Chart.js (more features, but heavier)
  - Victory (good, but less flexible)
  - D3.js (too low-level for our needs)

### 2. Data Aggregation Layer

**Service**: `trackerAnalyticsService.ts`

**Functions**:
```typescript
// Get time series data
getTimeSeriesData(trackerId: string, fieldId: string, dateRange: { start: string, end: string }): Promise<TimeSeriesDataPoint[]>

// Get aggregated statistics
getAggregatedStats(trackerId: string, fieldId: string, dateRange: { start: string, end: string }): Promise<AggregatedStats>

// Get calendar heatmap data
getCalendarHeatmapData(trackerId: string, fieldId: string, months: number): Promise<CalendarHeatmapDataPoint[]>

// Get distribution data
getDistributionData(trackerId: string, fieldId: string, dateRange: { start: string, end: string }): Promise<DistributionDataPoint[]>

// Get context-aware comparison
getContextComparison(trackerId: string, fieldId: string, contextEventId: string): Promise<BeforeDuringAfterData>
```

**Data Processing**:
- All aggregation happens client-side (from raw entries)
- No server-side analytics computation (keeps it simple)
- Caching strategy for performance
- Date range filtering
- Field type detection (numeric, rating, boolean, text)

### 3. Component Structure

```
src/components/tracker-studio/analytics/
├── TrackerAnalyticsPanel.tsx       # Main analytics container
├── TimeSeriesChart.tsx              # Line chart component
├── CalendarHeatmap.tsx              # Heatmap component
├── BarChart.tsx                     # Bar chart component
├── Histogram.tsx                    # Distribution chart
├── SummaryStats.tsx                  # Summary statistics
├── MultiFieldChart.tsx              # Multi-field comparison
├── EntryFrequencyChart.tsx          # Entry frequency
├── ContextEventOverlay.tsx          # Context event visualization
└── ChartControls.tsx                 # Date range, field selection
```

### 4. Integration Points

**Tracker Detail Page**:
- New "Analytics" tab/section
- Shows relevant charts based on tracker schema
- User can toggle charts on/off
- Date range selector

**Cross-Tracker Insights Page**:
- Already has interpretation layer
- Add visualizations for cross-tracker comparisons
- Context-aware overlays

**Tracker List View**:
- Optional: mini sparkline charts
- Quick stats preview

---

## Chart Selection Logic

### Automatic Chart Selection Based on Field Types

**Single Numeric/Rating Field**:
- Primary: Time Series Line Chart
- Secondary: Calendar Heatmap, Distribution Histogram
- Summary: Summary Statistics

**Multiple Numeric/Rating Fields**:
- Primary: Multi-Field Comparison Chart
- Secondary: Individual Time Series (toggleable)
- Summary: Summary Statistics per field

**Boolean Field**:
- Primary: Calendar Heatmap
- Secondary: Entry Frequency Chart
- Summary: Completion percentage (not "success rate")

**Text Field**:
- Primary: Entry Frequency Chart
- Secondary: Word cloud? (optional, low priority)
- Summary: Entry count

**Date Field**:
- Primary: Entry Frequency Chart
- Summary: Date range, entry count

**Mixed Fields**:
- Show charts for each field type
- User can toggle which fields to visualize

---

## UI/UX Design

### Analytics Panel Layout

**Default View**:
1. Summary Statistics (top, always visible)
2. Primary Chart (time series or heatmap)
3. Secondary Charts (toggleable, collapsed by default)
4. Context Event Timeline (if events exist)

**User Controls**:
- Date range picker (presets: 7d, 30d, 90d, 1y, all)
- Field selector (if multiple fields)
- Chart type toggle (if multiple types available)
- Show/hide context events
- Export data (CSV, JSON)

### Mobile Considerations

- Simplified charts (fewer data points)
- Touch-friendly controls
- Swipeable chart carousel
- Collapsible sections
- Horizontal scroll for wide charts

### Accessibility

- Screen reader descriptions
- Keyboard navigation
- High contrast mode support
- Color-blind friendly palettes
- Alt text for all charts

---

## Data Flow

```
User opens Tracker Detail Page
  ↓
TrackerAnalyticsPanel loads
  ↓
Fetches tracker entries (via trackerEntryService)
  ↓
Fetches context events (if enabled)
  ↓
Analytics service processes data:
  - Aggregates by date
  - Filters by date range
  - Groups by field
  - Calculates statistics
  ↓
Charts render with processed data
  ↓
User interacts (date range, field selection)
  ↓
Re-processes and re-renders
```

---

## Technical Considerations

### Performance

**Optimization Strategies**:
- Client-side data processing (no server load)
- Memoization of processed data
- Lazy loading of charts
- Virtual scrolling for large datasets
- Debounced date range changes

**Data Limits**:
- Max date range: 2 years (configurable)
- Max entries per chart: 1000 (with sampling for larger)
- Progressive loading for large ranges

### Caching

- Cache processed data in component state
- Invalidate on new entry creation
- Cache key: `trackerId-fieldId-dateRange`

### Error Handling

- Graceful degradation (show message if no data)
- Loading states for all charts
- Error boundaries for chart failures
- Fallback to simple statistics if chart fails

---

## Implementation Phases

### Phase 1: Foundation (MVP)
- Summary Statistics component
- Time Series Line Chart (single field)
- Basic date range selector
- Integration into Tracker Detail Page

### Phase 2: Core Visualizations
- Calendar Heatmap
- Bar Chart (time period comparison)
- Distribution Histogram
- Multi-field support

### Phase 3: Advanced Features
- Context Event Overlay
- Multi-field comparison charts
- Entry frequency visualizations
- Cross-tracker analytics integration

### Phase 4: Polish & Optimization
- Performance optimization
- Mobile optimization
- Accessibility improvements
- Export functionality
- Custom chart configurations

---

## Example Visualizations

### Sleep Tracker Analytics

**Summary Stats**:
- Average sleep duration: 7.2 hours
- Average quality: 3.8/5
- Entries logged: 28 of 30 days

**Primary Chart**: Time Series
- Line 1: Sleep duration (hours) - blue
- Line 2: Sleep quality (1-5) - purple
- Context events: Illness period shown as background band

**Secondary Charts**:
- Calendar Heatmap: Quality ratings by day
- Distribution: Quality rating frequency
- Weekly Comparison: This week vs last week

### Mood Tracker Analytics

**Summary Stats**:
- Average mood: 3.5/5
- Most common mood: 4/5
- Entries: 45 of 60 days

**Primary Chart**: Time Series
- Single line: Mood rating over time
- Context events: Stress periods highlighted

**Secondary Charts**:
- Calendar Heatmap: Mood intensity by day
- Distribution: Mood rating histogram
- Day of Week Pattern: Average mood by weekday

### Exercise Tracker Analytics

**Summary Stats**:
- Total activities: 42
- Average duration: 35 minutes
- Most common activity: Running

**Primary Chart**: Entry Frequency
- Bar chart: Activities per week
- Shows consistency without judgment

**Secondary Charts**:
- Calendar Heatmap: Activity presence
- Activity Type Breakdown: Pie chart (optional)
- Duration Trends: Time series of average duration

---

## Design System Integration

### Color Palette

**Chart Colors** (non-judgmental):
- Primary: Blue (#3B82F6)
- Secondary: Purple (#8B5CF6)
- Tertiary: Green (#10B981)
- Quaternary: Amber (#F59E0B)
- Neutral: Gray (#6B7280)

**Context Event Colors**:
- Illness: Soft red (#FEE2E2)
- Travel: Soft blue (#DBEAFE)
- Stress: Soft gray (#F3F4F6)
- Recovery: Soft green (#D1FAE5)
- Custom: Soft purple (#EDE9FE)

### Typography

- Chart titles: text-sm font-semibold
- Axis labels: text-xs text-gray-600
- Tooltips: text-sm
- Summary stats: text-2xl font-bold

### Spacing

- Chart padding: p-4 sm:p-6
- Chart height: min-h-[300px] sm:min-h-[400px]
- Gap between charts: gap-6

---

## Non-Goals (Explicitly Out of Scope)

❌ **Goal Setting**: No target lines, goal indicators, or "progress to goal"
❌ **Scoring**: No health scores, performance scores, or ratings
❌ **Comparisons**: No "better than average" or peer comparisons
❌ **Predictions**: No ML-based predictions or forecasting
❌ **Alerts**: No "you're declining" or "improvement needed" messages
❌ **Gamification**: No badges, achievements, or streaks
❌ **Automated Insights**: No AI-generated "you should..." messages
❌ **Social Sharing**: No sharing charts to social media
❌ **Competition**: No leaderboards or rankings

---

## Success Metrics

### User Engagement
- % of users who view analytics
- Average time spent viewing analytics
- Frequency of analytics views

### Technical Performance
- Chart load time < 500ms
- Smooth interactions (60fps)
- Mobile responsiveness

### User Feedback
- User satisfaction with visualizations
- Clarity of information
- Non-judgmental perception

---

## Future Enhancements (Post-MVP)

1. **Custom Chart Builder**: Users create custom visualizations
2. **Chart Templates**: Pre-configured chart sets per tracker type
3. **Export Options**: PNG, PDF, CSV exports
4. **Print-Friendly Views**: Optimized for printing
5. **Embeddable Charts**: Share charts in Planner/Spaces
6. **Comparison Mode**: Compare multiple trackers side-by-side
7. **Annotated Charts**: User can add notes to specific data points
8. **Trend Detection**: Subtle trend indicators (descriptive, not prescriptive)

---

## Technical Stack

### Dependencies

```json
{
  "recharts": "^2.10.0",  // Charting library
  "date-fns": "^2.30.0"   // Date utilities (already in use)
}
```

### Type Definitions

```typescript
interface TimeSeriesDataPoint {
  date: string;
  value: number | null;
  entryId?: string;
}

interface CalendarHeatmapDataPoint {
  date: string;
  value: number | boolean | null;
  count?: number;
}

interface AggregatedStats {
  average: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  count: number;
  totalEntries: number;
}

interface BeforeDuringAfterData {
  before: AggregatedStats;
  during: AggregatedStats;
  after: AggregatedStats;
  contextEvent: ContextEvent;
}
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Install recharts library
- [ ] Create `trackerAnalyticsService.ts`
- [ ] Create `TrackerAnalyticsPanel.tsx` component
- [ ] Create `SummaryStats.tsx` component
- [ ] Create `TimeSeriesChart.tsx` component
- [ ] Create `ChartControls.tsx` (date range selector)
- [ ] Integrate into `TrackerDetailPage.tsx`
- [ ] Add analytics tab/section toggle
- [ ] Test with various tracker types
- [ ] Mobile responsiveness

### Phase 2: Core Visualizations
- [ ] Create `CalendarHeatmap.tsx`
- [ ] Create `BarChart.tsx`
- [ ] Create `Histogram.tsx`
- [ ] Add multi-field support
- [ ] Field selector component
- [ ] Chart type selector
- [ ] Performance optimization

### Phase 3: Advanced Features
- [ ] Create `ContextEventOverlay.tsx`
- [ ] Integrate context events into charts
- [ ] Create `MultiFieldChart.tsx`
- [ ] Create `EntryFrequencyChart.tsx`
- [ ] Cross-tracker analytics integration
- [ ] Before/during/after context comparisons

### Phase 4: Polish
- [ ] Export functionality (CSV, JSON)
- [ ] Accessibility improvements
- [ ] Performance optimization
- [ ] Mobile-specific optimizations
- [ ] Error handling improvements
- [ ] Loading state improvements
- [ ] Tooltip enhancements

---

## Example Code Structure

### TrackerAnalyticsPanel.tsx (Pseudo-code)

```typescript
export function TrackerAnalyticsPanel({ tracker }: { tracker: Tracker }) {
  const [dateRange, setDateRange] = useState({ start: ..., end: ... });
  const [selectedFields, setSelectedFields] = useState([...]);
  const [entries, setEntries] = useState([]);
  const [contextEvents, setContextEvents] = useState([]);
  
  // Process data
  const timeSeriesData = useMemo(() => 
    processTimeSeries(entries, selectedFields, dateRange), 
    [entries, selectedFields, dateRange]
  );
  
  const stats = useMemo(() => 
    calculateStats(entries, selectedFields, dateRange),
    [entries, selectedFields, dateRange]
  );
  
  return (
    <div className="space-y-6">
      <SummaryStats stats={stats} />
      <ChartControls 
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        fields={tracker.field_schema_snapshot}
        selectedFields={selectedFields}
        onFieldsChange={setSelectedFields}
      />
      <TimeSeriesChart 
        data={timeSeriesData}
        fields={selectedFields}
        contextEvents={contextEvents}
      />
      {/* Additional charts based on field types */}
    </div>
  );
}
```

---

## Conclusion

This analytics system will make Tracker Studio feel alive and useful while maintaining the core principles of non-judgmental, user-controlled tracking. The visualizations are descriptive tools that help users understand their patterns without prescribing behavior or creating pressure.

The phased approach allows for iterative development and user feedback, ensuring the analytics enhance rather than complicate the tracking experience.
