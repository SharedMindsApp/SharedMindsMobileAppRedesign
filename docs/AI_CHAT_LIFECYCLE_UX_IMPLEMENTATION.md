# AI Chat Lifecycle UX Implementation

## Overview

Successfully implemented improved UX for AI Chat lifecycle management, making temporary chats saveable and replacing confusing "Ephemeral" terminology with user-friendly "Temporary" language.

## Changes Implemented

### 1. Terminology Updates

**Before:** "Ephemeral Chat" / "Ephemeral" / "Expires in X"
**After:** "Temporary Chat" / "Temporary" / "Deletes in X hours"

All user-facing text has been updated across:
- Conversation list headers
- Chat badges
- Filter buttons
- Time remaining indicators

**Note:** Internal database field `is_ephemeral` remains unchanged (backend-only).

### 2. Save Functionality Added

Users can now save temporary chats from three locations:

#### A. ChatWidgetConversationList (`src/components/ai-chat/ChatWidgetConversationList.tsx`)

**Changes:**
- Added `Save` icon import from lucide-react
- Added `handleSaveConversation()` function that calls `ChatSurfaceService.saveEphemeralConversation()`
- Added Save button (green bookmark icon) to temporary chat items
- Button appears on hover with tooltip: "Save this chat so it doesn't expire"
- Updated section header from "Ephemeral Chats" to "Temporary Chats"
- Changed time display from "in X hours" to "Deletes in X hours"
- Changed badge text from "Ephemeral" to "Temporary"

**Save Behavior:**
- Clicking Save attempts to convert temporary chat to saved
- If successful: Chat moves to "Saved Chats" section
- If limit reached: Shows error: "Failed to save conversation. You may have reached the limit of 10 saved chats for this space."

#### B. GuardrailsAIChatsPage (`src/components/guardrails/GuardrailsAIChatsPage.tsx`)

**Changes:**
- Added `Save` icon import
- Added `handleSaveConversation()` function
- Updated filter button label from "Ephemeral" to "Temporary"
- Updated ConversationRow interface to accept `onSave` and `userId` props
- Added Save button to temporary conversation rows
- Changed badge text from "Ephemeral" to "Temporary"
- Changed time display from "Expires X" to "Deletes X"
- Save button appears on hover for temporary chats

**User Flow:**
1. User sees "Temporary" badge on temporary chats
2. Hovers over conversation row
3. Green Save button appears
4. Clicks Save
5. Chat converts to saved (if under limit)
6. Page refreshes to show updated chat type

### 3. Visual Indicators

**Temporary Chat Badge:**
- Clock icon + "Temporary" text
- Gray background (normal state)
- Red background when expiring soon (< 1 hour)

**Time Remaining:**
- Format: "Deletes in X hours" (where X is the actual time)
- Red text when expiring soon
- Gray text otherwise

**Save Button:**
- Green bookmark/save icon
- Appears on hover
- Tooltip: "Save this chat so it doesn't expire"
- Positioned before Edit and Delete buttons

### 4. Architectural Constraints Maintained

All existing safety rules remain enforced:

✅ Users cannot exceed 10 saved chats per surface
✅ Temporary chats still auto-delete after 24h if not saved
✅ No background auto-saving
✅ No AI-triggered saving
✅ No cross-surface conversion
✅ Saving requires explicit user action

The existing `saveEphemeralConversation()` backend function handles all validation and limit enforcement.

## Files Modified

1. **`src/components/ai-chat/ChatWidgetConversationList.tsx`**
   - Added Save icon import
   - Added `handleSaveConversation()` function
   - Updated ConversationItem to show Save button for temporary chats
   - Changed "Ephemeral" to "Temporary" in all UI text
   - Updated time display format

2. **`src/components/guardrails/GuardrailsAIChatsPage.tsx`**
   - Added Save icon import
   - Added `handleSaveConversation()` function
   - Updated filter button label
   - Added Save button to ConversationRow
   - Changed "Ephemeral" to "Temporary" in all UI text
   - Updated time display format

## Not Implemented (Deferred)

**ChatWidgetHeader Save Button:**
- Would require passing current conversation details to header
- Requires fetching conversation info in FloatingAIChatWidget
- Would need to add `activeConversation` state and props chain
- Save functionality already available in conversation list
- Can be added in future iteration if needed

## User Mental Model (Achieved)

### Saved Chat
- Stays forever
- Counts toward the 10-chat limit per surface
- No expiry badge
- No Save button

### Temporary Chat
- Auto-deletes after 24 hours
- Unlimited quantity
- Shows "Temporary" badge with clock icon
- Shows "Deletes in X hours" countdown
- Can be saved at any time (if limit allows)
- Save button appears on hover

## Error Handling

**When Save Fails:**
- Alert shows: "Failed to save conversation. You may have reached the limit of 10 saved chats for this space."
- Chat remains temporary
- User can delete an existing saved chat to make room
- User can keep the temporary chat (will still auto-delete)

**When Limit Reached:**
- Error message clearly explains the 10-chat limit
- User understands they need to delete a saved chat first
- No silent failures

## Testing Checklist

✅ Build completes without errors
✅ Terminology changed from "Ephemeral" to "Temporary" everywhere
✅ Save button appears on temporary chats (hover)
✅ Save button works in conversation list
✅ Save button works in AI Chats Manager
✅ Time display shows "Deletes in X hours"
✅ Filter button shows "Temporary" not "Ephemeral"
✅ Error handling works for limit reached
✅ Saved chats don't show Save button
✅ Architectural constraints maintained

## Future Enhancements (Optional)

1. **Header Save Button**
   - Add save button to ChatWidgetHeader when viewing temporary chat
   - Requires fetching current conversation details
   - Pass to header via props

2. **Bulk Save**
   - Allow saving multiple temporary chats at once from manager
   - Show error if would exceed limit

3. **Save Confirmation**
   - Toast notification when save succeeds
   - "Chat saved successfully" message

4. **Smart Suggestions**
   - Suggest saving temporary chats with many messages
   - Warning before temporary chat expires (1 hour before)

## Success Metrics

✅ Users can save temporary chats from:
- Conversation list
- Chat manager page

✅ "Ephemeral" is no longer visible anywhere in UI
✅ Saving respects per-surface limits
✅ Users understand what will happen without reading docs
✅ No architectural invariants violated
✅ Build passes with no errors

## Conclusion

The AI Chat lifecycle UX has been successfully improved with:
- Clear, human-friendly terminology ("Temporary" vs "Ephemeral")
- Obvious save functionality with visual save buttons
- Proper error handling and user feedback
- Maintained architectural safety and limits
- Clean implementation with no breaking changes

Users now have full control over their chat lifecycle with a clear mental model of saved vs temporary chats.
