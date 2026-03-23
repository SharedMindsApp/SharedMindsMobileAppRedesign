# Guardrails ↔ Spaces Sync Integration Guide

This document explains how Guardrails integrates with Spaces (Personal and Shared) for seamless data synchronization.

## Overview

The Spaces sync system connects Guardrails productivity data with the Spaces architecture:
- **Personal Space**: Automatically syncs ALL Guardrails data (bidirectional)
- **Shared Spaces**: Manual publishing only (user-controlled)

## Architecture

### Database Tables

#### `shared_space_links`
Tracks items published from Guardrails to Shared Spaces:
- `id`: Unique identifier
- `shared_space_id`: Reference to shared space
- `item_type`: Type of item (calendar_event, task, roadmap_item, etc.)
- `item_id`: ID of the original item
- `link_type`: How the item is shared (send, duplicate, linked)
- `allow_edit`: Whether Shared Space members can edit
- `created_by`: User who shared the item

#### `fridge_widgets` (existing)
Already supports Guardrails linking via:
- `linked_guardrail_target_id`: FK to Guardrails entity
- `linked_guardrail_type`: Type of linked entity
- `visibility_scope`: Who can see the widget

## Personal Space Sync

### Automatic Bidirectional Sync

Personal Space automatically reflects ALL Guardrails activity. No user action needed.

#### Sync Functions

```typescript
import { syncToPersonalSpace, removeFromPersonalSpace } from './lib/spacesSync';

// When creating/updating a Guardrails item
await syncToPersonalSpace('roadmap_item', itemId, itemData);

// When deleting a Guardrails item
await removeFromPersonalSpace('roadmap_item', itemId);
```

### Supported Item Types
- `calendar_event`: Calendar events
- `task`: Tasks/Roadmap items
- `note`: Notes
- `roadmap_item`: Roadmap items
- `goal`: Goals
- `habit`: Habits
- `reminder`: Reminders
- `offshoot_idea`: Offshoot ideas
- `side_project`: Side projects
- `focus_session`: Focus mode sessions
- `mind_mesh_node`: Mind Mesh nodes
- `fridge_widget`: Fridge widgets

## Shared Space Publishing

### Manual Publishing Only

Items must be manually published to Shared Spaces. Three modes available:

#### 1. Send Once
Creates a one-way copy. No syncing after creation.

```typescript
await publishToSharedSpace(
  sharedSpaceId,
  'roadmap_item',
  itemId,
  'send',
  false // no editing allowed
);
```

#### 2. Duplicate
Creates a copy marked as duplicate. No further syncing.

```typescript
await publishToSharedSpace(
  sharedSpaceId,
  'roadmap_item',
  itemId,
  'duplicate',
  false
);
```

#### 3. Link (Live Sync)
Shared Space displays a live version of the original.

```typescript
await publishToSharedSpace(
  sharedSpaceId,
  'roadmap_item',
  itemId,
  'linked',
  true // allow editing from Shared Space
);
```

### Unpublish

```typescript
import { unpublishFromSharedSpace } from './lib/spacesSync';

await unpublishFromSharedSpace(linkId);
```

## UI Integration

### Share Button Component

Use the `ShareToSpaceModal` component to add sharing functionality:

```tsx
import { ShareToSpaceModal } from './components/shared/ShareToSpaceModal';

function MyComponent() {
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowShareModal(true)}>
        <Share2 size={16} />
        Share
      </button>

      <ShareToSpaceModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        itemType="roadmap_item"
        itemId={item.id}
        itemTitle={item.title}
      />
    </>
  );
}
```

### Where to Add Share Buttons

Add Share buttons to:
- ✅ Roadmap items (in item drawer/modal)
- ✅ Calendar events (in event modal)
- ✅ Tasks (in task card menu)
- ✅ Goals (in goal card)
- ✅ Habits (in habit settings)
- ✅ Notes (in note menu)
- ✅ Mind Mesh nodes (in node toolbar)
- ✅ Offshoot ideas (in idea detail)
- ✅ Side projects (in project detail)
- ✅ Focus sessions (in session summary)

## Widget Behavior Rules

### Personal Space Widgets
- **Always show** all Guardrails activity
- **Sync is automatic** (bidirectional)
- User **cannot disable** sync
- Widgets update in real-time when Guardrails data changes

### Shared Space Widgets
- **Only show**:
  - Items created inside Shared Space
  - Items published via `shared_space_links`
  - Linked items (respecting editing rules)
- **Never auto-populate** from Guardrails
- User **must explicitly publish** each item

## Sync Rules Summary

| Direction | Personal Space | Shared Space |
|-----------|---------------|--------------|
| **Guardrails → Space** | ✅ Automatic | ❌ Manual only |
| **Space → Guardrails** | ✅ Automatic | ⚠️ Only if `link_type='linked'` AND `allow_edit=true` |

## Implementation Checklist

When implementing sync for a new Guardrails feature:

1. ✅ Add item type to `SyncableItemType` in `spacesSync.ts`
2. ✅ Add table mapping in `fetchItemData()`
3. ✅ Add widget type mapping in `getWidgetTypeForItem()`
4. ✅ Call `syncToPersonalSpace()` on create/update
5. ✅ Call `removeFromPersonalSpace()` on delete
6. ✅ Add Share button to UI
7. ✅ Test bidirectional sync
8. ✅ Test manual publishing

## Security

### RLS Policies
- Users can only view links for spaces they're members of
- Users can only create links to spaces they're members of
- Users can only update/delete their own links
- Linked items respect original item permissions

### Editing Permissions
- `link_type='send'` or `'duplicate'`: No sync, standalone copy
- `link_type='linked'` with `allow_edit=false`: View only in Shared Space
- `link_type='linked'` with `allow_edit=true`: Editable in Shared Space, syncs back to Guardrails

## Example Usage

### Adding Sync to a New Feature

```typescript
// In your Guardrails feature component
import { syncToPersonalSpace, removeFromPersonalSpace } from '../lib/spacesSync';
import { ShareToSpaceModal } from '../components/shared/ShareToSpaceModal';

async function handleCreateItem(itemData) {
  // Create the item in Guardrails
  const { data: item } = await supabase
    .from('roadmap_items')
    .insert(itemData)
    .select()
    .single();

  // Auto-sync to Personal Space
  await syncToPersonalSpace('roadmap_item', item.id, item);
}

async function handleUpdateItem(itemId, updates) {
  // Update the item in Guardrails
  const { data: item } = await supabase
    .from('roadmap_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  // Auto-sync to Personal Space
  await syncToPersonalSpace('roadmap_item', item.id, item);
}

async function handleDeleteItem(itemId) {
  // Delete from Guardrails
  await supabase
    .from('roadmap_items')
    .delete()
    .eq('id', itemId);

  // Remove from Personal Space
  await removeFromPersonalSpace('roadmap_item', itemId);
}

// UI component with Share button
function ItemCard({ item }) {
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="item-card">
      <h3>{item.title}</h3>
      <button onClick={() => setShowShare(true)}>
        Share to Shared Space
      </button>

      <ShareToSpaceModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        itemType="roadmap_item"
        itemId={item.id}
        itemTitle={item.title}
      />
    </div>
  );
}
```

## Testing

Test these scenarios:

1. **Personal Space Automatic Sync**
   - Create item in Guardrails → Check Personal Space widget appears
   - Update item in Guardrails → Check Personal Space widget updates
   - Delete item in Guardrails → Check Personal Space widget removed

2. **Shared Space Manual Publishing**
   - Publish item with "Send once" → Check copy appears, no sync
   - Publish item with "Duplicate" → Check duplicate appears
   - Publish item with "Link" (view only) → Check item appears, editing disabled
   - Publish item with "Link" (editable) → Check item appears, editing enabled
   - Unpublish item → Check item removed from Shared Space

3. **Widget Visibility**
   - Personal Space shows all Guardrails items
   - Shared Space only shows explicitly published items

## Notes

- Personal Space is always type `'personal'` in the `spaces` table
- Shared Spaces are always type `'shared'`
- The system uses `owner_id` field to identify Personal Spaces
- Auto-sync is non-blocking (fire and forget)
- Failed syncs log errors but don't block Guardrails operations
