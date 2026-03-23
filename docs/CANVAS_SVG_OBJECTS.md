# Canvas SVG Objects

Free-floating SVG graphics that users can place directly onto Space canvases as visual elements.

## Overview

Canvas SVG objects are lightweight visual thinking objects that allow users to place SVG graphics anywhere on their canvas. They are separate from files and remain editable independently.

## Key Features

### SVG Storage and Instances
- SVG files are uploaded to the Files widget
- Users can create canvas SVG instances from any SVG file
- Deleting a canvas SVG instance never deletes the source file
- Multiple canvas instances can reference the same SVG file

### Visual Appearance
- SVGs render without frames or boxes
- Controls only appear on hover
- Clean, unobtrusive design

### Interactions
- **Default State**: SVG is visible with no borders or UI controls
- **Hover State**: Subtle outline appears with resize handles and delete icon
- **Click + Drag**: Move the SVG anywhere on canvas
- **Drag Handles**: Resize the SVG (scales uniformly)
- **Right-Click Context Menu**:
  - Bring Forward
  - Send Backward
  - Delete

## How to Use

1. Upload an SVG file to the Files widget
2. Hover over the SVG file to reveal action buttons
3. Click the green "Image" icon (Add to canvas as graphic)
4. The SVG will appear on your canvas at position (200, 200)
5. Drag to reposition, use handles to resize
6. Right-click for layering options

## Database Schema

### `canvas_svg_objects` Table
- `id`: UUID primary key
- `space_id`: References the space this SVG belongs to
- `source_file_id`: References the SVG file in the files table
- `x_position`: X coordinate on canvas
- `y_position`: Y coordinate on canvas
- `scale`: Scale factor (default 1.0)
- `rotation`: Rotation in degrees (default 0)
- `z_index`: Stacking order for layering
- `created_by`: User who created this instance
- `created_at`: Timestamp

## Component Architecture

### CanvasSVGObject Component
Located: `src/components/fridge-canvas/CanvasSVGObject.tsx`

Renders individual SVG objects with:
- Hover detection and controls
- Drag-to-move functionality
- Resize handles
- Context menu for layering
- Delete functionality

### Service Layer
Located: `src/lib/canvasSVGService.ts`

Functions:
- `getCanvasSVGsForSpace()`: Load all SVG objects for a space
- `createCanvasSVG()`: Create new canvas SVG instance
- `updateCanvasSVG()`: Update position, scale, or rotation
- `deleteCanvasSVG()`: Remove canvas instance (file remains)
- `bringCanvasSVGForward()`: Move up one layer
- `sendCanvasSVGBackward()`: Move down one layer

### Types
Located: `src/lib/canvasSVGTypes.ts`

Key types:
- `CanvasSVGObject`: Database record
- `CreateCanvasSVGData`: Data for creating new instance
- `UpdateCanvasSVGData`: Updates for existing instance
- `CanvasSVGWithFile`: SVG object with file URL and name

## Integration Points

### FridgeCanvas Component
- Loads canvas SVG objects on mount
- Renders SVG objects below groups and widgets
- Handles SVG updates, deletions, and layering
- Reloads SVGs when new ones are added

### FilesWidget Component
- Shows "Add to canvas" button (green image icon) for SVG files only
- Creates canvas SVG instance when clicked
- Notifies canvas to reload SVGs

## Security

Row Level Security (RLS) policies ensure:
- Users can only view SVGs in spaces they have access to
- Users can only create SVGs in spaces they can edit
- Users can update/delete SVGs in spaces they can edit
- Personal spaces: User must own the space
- Shared spaces: User must be an active member

## Permissions

- Users can add SVGs to Spaces they can edit
- Shared Spaces respect existing space member permissions
- No public sharing of canvas SVGs

## Future Enhancements (Out of Scope)

The following features are explicitly NOT included in v1:
- Raster image support (PNG, JPG, etc.)
- Grouping multiple objects together
- Snapping to grid or other objects
- Locking objects in place
- Animation or transitions
- AI-powered placement
- Real-time collaborative editing
