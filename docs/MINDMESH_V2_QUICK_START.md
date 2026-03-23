# Mind Mesh V2 - Quick Start Guide

## Overview

Mind Mesh V2 is a visual canvas that displays your Guardrails project structure as interconnected containers. It provides a spatial representation of tracks, roadmap items, side projects, and offshoots.

---

## Accessing Mind Mesh

1. **Navigate to Mind Mesh**
   - Go to `/guardrails/mindmesh` in your browser
   - Or click "Mind Mesh" in the Guardrails navigation

2. **Select a Project**
   - Ensure you have an active project selected
   - If no project is selected, you'll be redirected to the dashboard

3. **Workspace Creation**
   - A workspace is automatically created for your project (first visit only)
   - This happens transparently in the background

---

## Understanding the Canvas

### Containers

**Active Containers** (Solid border, white background):
- Represent entities that are active in Mind Mesh
- Can be dragged to new positions
- Show entity type and ID

**Ghost Containers** (Dashed border, translucent):
- Represent entities that exist in Guardrails but aren't yet active in Mind Mesh
- Click to activate (make them real)
- Cannot be dragged until activated

### Nodes (Lines)

**Solid Blue Lines**:
- User-created connections
- Explicit relationships

**Dashed Gray Lines**:
- Auto-generated connections
- Inferred from Guardrails hierarchy

### Visual Elements

```
┌─────────────────────┐
│ ● Active            │  ← Active container
│ track abc123        │
│                     │
│ vertical_stack      │
└─────────────────────┘

┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│ ○ Ghost             │  ← Ghost container
│ roadmap_item xyz    │     (click to activate)
│                     │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

## Interactions

### Move a Container

1. **Click and hold** on an active container
2. **Drag** to new position
3. **Release** mouse button
4. Wait for "Executing..." to complete
5. Container position saved to backend

**Note:** Ghost containers cannot be moved until activated.

### Activate a Ghost

1. **Click** on a ghost container (dashed border)
2. Wait for "Executing..." to complete
3. Ghost becomes active (solid border)
4. Can now be dragged

### Undo Last Action

1. **Click** the "Rollback" button (top left)
2. Wait for "Executing..." to complete
3. Last action is reversed
4. State restored to previous

---

## Canvas Lock

### What is a Canvas Lock?

A canvas lock ensures only one user can modify the graph at a time. Without a lock:
- ✅ You can view the graph
- ❌ You cannot move containers
- ❌ You cannot activate ghosts
- ❌ You cannot rollback

### Acquiring a Lock

**Currently:** Locks must be acquired programmatically (UI coming soon).

**Future:** Lock management UI will include:
- "Acquire Lock" button
- Lock status indicator
- "Release Lock" button
- Lock holder display

---

## Error Handling

### Common Errors

**"No active canvas lock"**
- **Cause:** Attempting write operation without lock
- **Solution:** Acquire canvas lock first

**"Container not found"**
- **Cause:** Container ID doesn't exist or was deleted
- **Solution:** Refresh page and try again

**"Workspace not found"**
- **Cause:** Workspace was deleted or doesn't exist
- **Solution:** Reload page (workspace will be recreated)

**"Unauthorized"**
- **Cause:** Not authenticated or session expired
- **Solution:** Log in again

### Error Display

Errors appear in a red banner at the top of the canvas:

```
┌─────────────────────────────────┐
│ ⚠ No active canvas lock. Cannot │
│   move container.               │
└─────────────────────────────────┘
```

**Error Persistence:**
- Errors remain visible until next successful action
- No automatic dismissal
- Check console for detailed error logs

---

## Best Practices

### 1. Save Your Work Frequently

Mind Mesh auto-saves after every action, but:
- ✅ Each drag is saved immediately
- ✅ Each activation is saved immediately
- ❌ No "Save" button needed

### 2. Use Rollback Carefully

Rollback undoes the **last action only**:
- ✅ Undo last drag
- ✅ Undo last ghost activation
- ❌ Cannot undo multiple actions at once
- ❌ Cannot redo after rollback

### 3. Refresh to See Updates

If another user modifies the graph:
- Their changes won't appear automatically
- Press **F5** to reload and see updates
- Real-time sync coming in future update

### 4. Check Execution Status

Always wait for "Executing..." to complete before:
- Performing another action
- Closing the browser
- Navigating away

---

## Keyboard Shortcuts

**Currently:** No keyboard shortcuts (mouse only).

**Future:**
- `Ctrl+Z` - Undo (rollback)
- `Space` - Pan mode
- `+` / `-` - Zoom in/out
- `Escape` - Cancel drag

---

## Troubleshooting

### Canvas is Empty

**Possible causes:**
1. No entities in Guardrails project yet
   - **Solution:** Create tracks/roadmap items in Guardrails first

2. All containers are ghosts and hidden
   - **Solution:** Check visibility settings (future feature)

3. Workspace error
   - **Solution:** Reload page

### Container Won't Move

**Possible causes:**
1. No canvas lock
   - **Solution:** Acquire lock first (programmatically for now)

2. Container is a ghost
   - **Solution:** Activate ghost first, then move

3. Network error
   - **Solution:** Check internet connection, try again

### Ghost Won't Activate

**Possible causes:**
1. No canvas lock
   - **Solution:** Acquire lock first

2. Entity was deleted from Guardrails
   - **Solution:** Refresh page (ghost will disappear)

3. Network error
   - **Solution:** Check internet connection, try again

### Rollback Doesn't Work

**Possible causes:**
1. No canvas lock
   - **Solution:** Acquire lock first

2. No action history
   - **Solution:** Perform an action first (drag, activate)

3. Already at oldest state
   - **Solution:** Cannot rollback further

---

## Data Flow

### What Happens When You Drag

```
1. You drag container to new position
2. Visual feedback (container follows mouse)
3. You release mouse
4. "Executing..." appears
5. Backend receives MoveContainer intent
6. Backend updates container position in database
7. Frontend re-fetches graph
8. Container rendered at new backend position
9. "Executing..." disappears
```

### What Happens When You Activate

```
1. You click ghost container
2. "Executing..." appears
3. Backend receives ActivateContainer intent
4. Backend creates active container in database
5. Frontend re-fetches graph
6. Container rendered as active (solid border)
7. "Executing..." disappears
```

### What Happens When You Rollback

```
1. You click rollback button
2. "Executing..." appears
3. Backend receives rollback request
4. Backend restores previous state from plan history
5. Frontend re-fetches graph
6. Canvas shows previous state
7. "Executing..." disappears
```

---

## FAQ

### Q: Why do containers jump after I drag them?

**A:** The backend may adjust positions based on layout rules. The final position always comes from the backend to maintain consistency.

### Q: Can multiple users edit at the same time?

**A:** No. Only one user can hold the canvas lock at a time. Other users can view but not edit.

### Q: How do I create new containers?

**A:** Containers are created automatically when you create entities in Guardrails (tracks, roadmap items, etc.). They appear as ghosts first, then you activate them.

### Q: Can I delete containers?

**A:** Not yet. Container deletion UI is planned for a future update. For now, delete the corresponding entity in Guardrails.

### Q: Where are my containers?

**A:** If the canvas appears empty:
1. Check that your project has tracks/roadmap items in Guardrails
2. Refresh the page (F5)
3. Ghost containers may need to be activated first

### Q: Why is everything grayed out?

**A:** You likely don't have a canvas lock. Lock management UI is coming soon.

### Q: Can I zoom or pan?

**A:** Not yet. Pan/zoom support is planned for a future update.

### Q: How do I create connections between containers?

**A:** Node creation UI is planned for a future update. Currently, only auto-generated nodes (from Guardrails hierarchy) are visible.

### Q: What happens if I close the browser during "Executing..."?

**A:** The operation may or may not complete. When you return:
1. Refresh the page (F5)
2. Check if the change was saved
3. If not saved, perform the action again

### Q: Can I select multiple containers?

**A:** Not yet. Multi-select is planned for a future update.

---

## Limitations

### Current Limitations

1. **No lock management UI** - Cannot acquire/release lock from UI
2. **No zoom/pan** - Fixed viewport
3. **No keyboard shortcuts** - Mouse only
4. **No multi-select** - One container at a time
5. **No node creation** - Only auto-generated nodes visible
6. **No container deletion** - Delete from Guardrails instead
7. **No real-time sync** - Manual refresh needed to see other users' changes
8. **Limited metadata** - Containers show entity type and ID only

### Planned Improvements

**Coming Soon:**
- Lock management UI
- Container metadata display (title, description)
- Zoom and pan controls
- Keyboard shortcuts

**Future:**
- Node creation UI
- Container deletion UI
- Real-time collaboration
- Undo/redo history
- Selection tools
- Grouping

---

## Support

### Getting Help

**For technical issues:**
1. Check console logs (F12 → Console)
2. Copy error messages
3. Contact support

**For feature requests:**
1. Document desired behavior
2. Provide use case
3. Submit feedback

### Reporting Bugs

**Include:**
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Error messages
5. Browser and version

---

## Summary

**What You Can Do:**
- ✅ View containers and nodes
- ✅ Drag containers to new positions
- ✅ Activate ghost containers
- ✅ Rollback last action
- ✅ See entity types and IDs

**What You Can't Do (Yet):**
- ❌ Acquire/release lock from UI
- ❌ Create new containers directly
- ❌ Create connections between containers
- ❌ Delete containers
- ❌ Zoom or pan
- ❌ Use keyboard shortcuts
- ❌ Select multiple containers

**Remember:**
- Backend is always the source of truth
- Every action saves immediately
- Refresh page to see other users' changes
- Wait for "Executing..." to complete before next action

---

**Version:** 2.0
**Last Updated:** December 2025
**Status:** Minimal UI (Functional)
