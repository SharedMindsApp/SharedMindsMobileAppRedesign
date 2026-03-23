# Notification Architecture

## Core Philosophy

**Notifications are assistive prompts, not guaranteed outputs of feature usage.**

### Key Principles

1. **Opt-In Model**: Notifications are always opt-in per user
2. **User Control**: Users decide what they receive and how (in-app, push, or neither)
3. **Feature Independence**: Features do not "own" notification delivery
4. **Silent Suppression**: Notification suppression is a valid, expected outcome
5. **Per-User Resolution**: All notifications are resolved per user, even for shared features

## Two-Layer Model

### Layer 1: Feature-Level Capabilities

Features declare what they **can** notify about, not what they **will** notify about.

```typescript
// Features declare capabilities in notificationCapabilities.ts
{
  feature: 'tracker',
  signalType: 'reminder',
  description: 'Reminders to log tracker entries',
  supportsInApp: true,
  supportsPush: true,
}
```

**No notifications are sent at this layer.**

### Layer 2: User Preferences (Source of Truth)

Users explicitly decide:
- Which capabilities are enabled
- Per delivery channel (in-app, push)
- Per feature category

**This layer determines whether a notification is ever created or delivered.**

## Notification Creation Pipeline

```
Feature emits intent → Resolver checks preferences → Create & deliver (if allowed)
```

### Step-by-Step Flow

1. **Feature emits notification intent**
   ```typescript
   await emitNotificationIntent({
     userId: user.id,
     feature: 'tracker',
     signalType: 'reminder',
     title: 'Time to log your tracker',
     body: 'Don't forget to log your daily entry',
     sourceType: 'tracker',
     sourceId: tracker.id,
     actionUrl: `/trackers/${tracker.id}`,
   });
   ```

2. **Resolver checks user preferences**
   - Global master switch
   - Do Not Disturb mode
   - Feature category permission
   - Channel permissions (in-app, push)

3. **If allowed**: Notification created and delivered
4. **If not allowed**: Intent silently ignored (expected behavior)

## For Feature Developers

### ✅ DO

- Use `emitNotificationIntent()` to request notifications
- Check `isNotificationCapabilityEnabled()` to show contextual messaging
- Use `getNotificationCapabilityMessage()` for user-facing explanations
- Assume notifications may be disabled (don't fail features)

### ❌ DON'T

- Call `createNotification()` directly
- Auto-enable notifications when creating features
- Assume notifications will be delivered
- Fail features if notifications are disabled
- Hard-code notification delivery

### Example: Tracker Feature

```typescript
// When creating a tracker
async function createTracker(userId: string, trackerData: TrackerData) {
  const tracker = await saveTracker(trackerData);
  
  // ✅ Show contextual message (optional)
  const notificationsEnabled = await isNotificationCapabilityEnabled(
    userId,
    'tracker',
    'reminder'
  );
  
  if (notificationsEnabled === false) {
    // Show: "You can receive reminders for this tracker — 
    //        notification delivery is controlled in Settings."
  }
  
  return tracker;
}

// When it's time to send a reminder
async function sendTrackerReminder(tracker: Tracker, userId: string) {
  // ✅ Emit intent (resolver handles the rest)
  await emitNotificationIntent({
    userId,
    feature: 'tracker',
    signalType: 'reminder',
    title: `Time to log ${tracker.name}`,
    body: 'Don't forget to log your daily entry',
    sourceType: 'tracker',
    sourceId: tracker.id,
    actionUrl: `/trackers/${tracker.id}`,
  });
  
  // ✅ Don't check if notification was created
  // ✅ Don't fail if user disabled notifications
  // ✅ This is expected behavior
}
```

## Per-User Resolution

Even for shared features (household calendar, shared trackers), notifications are resolved per user:

```typescript
// Shared calendar event
const event = await getEvent(eventId);
const householdMembers = await getHouseholdMembers(event.household_id);

for (const member of householdMembers) {
  // Each user's preferences are checked individually
  await emitNotificationIntent({
    userId: member.user_id, // Per-user resolution
    feature: 'calendar',
    signalType: 'reminder',
    title: event.title,
    body: `Starts in 15 minutes`,
    sourceType: 'event',
    sourceId: event.id,
    actionUrl: `/calendar/event/${event.id}`,
  });
}
```

## Settings UX

### Feature-Level Settings

Features can show contextual messaging:

```typescript
import { getNotificationCapabilityMessage } from '@/lib/notificationHelpers';

// In tracker settings UI
<div className="text-sm text-gray-600">
  {getNotificationCapabilityMessage('tracker', 'reminder')}
</div>
```

**Key message**: "This does not enable notifications unless you allow it"

### Global Notification Settings

Located at: **Settings → Notifications**

- Global toggles (master switch, push, DND)
- Feature category controls
- Per-category push toggles
- Clear explanations

## Notification Categories

Current categories:
- **Calendar Reminders**: Events and schedule changes
- **Guardrails Updates**: Project progress and tasks
- **Planner Alerts**: Tasks and planning activities
- **System Messages**: Important updates and announcements
- **Tracker Reminders**: Tracker entries and missed actions
- **Habit Reminders**: Habit completion and streaks
- **Sleep Reminders**: Bedtime and wake-up reminders
- **Routine Reminders**: Routine start and completion

## Push Notifications

- **Optional, not primary**: In-app notifications always work without push
- **Explicit permission**: Never requested prematurely
- **Reversible**: Users can disable at any time
- **Provider-agnostic**: Architecture supports Firebase, APNs, Web Push

## Anti-Patterns to Avoid

❌ Auto-enable notifications when creating features  
❌ Feature-owned notification delivery  
❌ "You created X, so we notified you" logic  
❌ Hard-coded push notifications  
❌ Global notifications without per-user resolution  
❌ Forcing users to manage notifications in multiple places  

## Mental Model Summary

- **Features emit signals** (intents)
- **Users allow notifications** (preferences)
- **Resolvers decide delivery** (check preferences)
- **Channels are optional** (in-app, push, or neither)
- **Silence is a valid outcome** (expected when disabled)

## API Reference

### `emitNotificationIntent(intent)`

Public API for features to request notifications.

```typescript
await emitNotificationIntent({
  userId: string,
  feature: NotificationFeature,
  signalType: NotificationSignalType,
  title: string,
  body: string,
  sourceType?: string,
  sourceId?: string,
  actionUrl?: string,
});
```

### `isNotificationCapabilityEnabled(userId, feature, signalType?)`

Check if a notification capability is enabled for a user.

```typescript
const enabled = await isNotificationCapabilityEnabled(userId, 'tracker', 'reminder');
// Returns: true | false | null (null = no preferences, opt-in not completed)
```

### `getNotificationCapabilityMessage(feature, signalType)`

Get user-friendly message about notification capabilities.

```typescript
const message = getNotificationCapabilityMessage('tracker', 'reminder');
// Returns: "You can receive reminders to log tracker entries. 
//          Notification delivery is controlled in Settings → Notifications."
```

## Future Extensibility

The architecture supports adding new features without:
- New notification systems
- New settings pages
- New permission models

Simply:
1. Add capability to `notificationCapabilities.ts`
2. Add preference columns to database (if needed)
3. Update resolver mapping
4. Features can immediately use `emitNotificationIntent()`
