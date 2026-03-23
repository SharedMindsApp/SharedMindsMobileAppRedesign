# Mind Mesh V2 Node Visibility & Inspection

This document describes the read-only node (relationship) visibility and inspection features added to Mind Mesh V2.

## Overview

Users can now understand and inspect relationships between containers through:
1. **Visual Differentiation** - Different colors and styles for relationship types
2. **Hover Previews** - Quick information on hover
3. **Node Inspector** - Detailed read-only inspection panel

## Relationship Types

### Hierarchy (Blue)
- **Color**: Blue (#3b82f6 manual, #9ca3af auto)
- **Description**: Parent-child relationship defining ownership or containment
- **Example**: Track → Roadmap Item

### Composition (Blue)
- **Color**: Dark Blue (#2563eb manual, #60a5fa auto)
- **Description**: Items combine to form a larger whole
- **Example**: Roadmap Item → Roadmap Item (parent-child)

### Dependency (Amber)
- **Color**: Amber (#f59e0b manual, #fbbf24 auto)
- **Description**: One item relies on or blocks another
- **Example**: Roadmap Item → Roadmap Item (sequential)

### Reference (Purple)
- **Color**: Purple (#8b5cf6 manual, #a78bfa auto)
- **Description**: Cross-reference or association between items
- **Example**: General connections

### Ideation (Green)
- **Color**: Green (#10b981 manual, #34d399 auto)
- **Description**: Exploratory connections for offshoot ideas
- **Example**: Any connection involving offshoot ideas

## Visual Indicators

### Auto-Generated vs Manual
- **Auto-Generated**: Dashed lines (5,5 dash pattern)
  - "This relationship is derived from Guardrails structure"
- **Manual**: Solid lines
  - "This relationship was created manually in Mind Mesh"

### Interaction States
- **Default**: Relationship type color, standard width
- **Hovered**: Light blue (#60a5fa), slightly thicker
- **Selected**: Red (#ef4444), thicker line

### Line Width
- **Auto-Generated**: 1px base width
- **Manual**: 2px base width
- **Hovered/Selected**: +1px

## User Interactions

### Hover Preview
When hovering over any node:
- Shows relationship type (e.g., "Parent-Child")
- Shows direction (e.g., "Track A → Item B")
- Shows auto/manual status badge
- Brief source description

### Click Inspector
When clicking on a node:
- Opens side panel with detailed information
- Shows relationship type and description
- Displays both connected containers with titles
- Shows direction with arrow indicator
- Displays technical details (created timestamp, type, source)
- Explicit close button

### Key Features
- **No backend calls** during hover (metadata derived from graph state)
- **No editing** - purely read-only inspection
- **No node creation** - inspection only
- **Smooth interaction** - doesn't interfere with container dragging or canvas panning
- **Proper cleanup** - hover states clear on mouse leave

## Technical Implementation

### Files Created
1. `src/lib/mindmesh-v2/nodeMetadata.ts` - Relationship type derivation and metadata
2. `src/components/guardrails/mindmesh/NodeHoverPreview.tsx` - Hover tooltip
3. `src/components/guardrails/mindmesh/NodeInspector.tsx` - Detailed inspector panel

### Integration
- Updated `MindMeshCanvasV2.tsx` with:
  - Node hover and click handlers
  - Enhanced SVG rendering with visual styling
  - State management for hovered/selected nodes
  - Metadata fetching with proper cleanup

### Visual Styling
Relationship types are derived from:
- Port directions (parent/child)
- Entity types (track, roadmap_item, side_project, offshoot)
- Auto-generated flag

## Usage

1. **Hover** over any relationship line to see basic information
2. **Click** on a relationship line to open the inspector
3. **Close** inspector by clicking the X button or clicking another node/container
4. Visual colors help identify relationship types at a glance

## Authority Boundaries

This implementation:
- ✅ Reads existing graph state
- ✅ Displays derived metadata
- ✅ Provides read-only inspection
- ❌ Does NOT create nodes
- ❌ Does NOT delete nodes
- ❌ Does NOT emit intents
- ❌ Does NOT modify relationships
