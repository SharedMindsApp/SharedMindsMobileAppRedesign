# Screen Time Tracker - Native Mobile Integration Requirements

## Overview

The Screen Time Tracker in Tracker Studio is designed to work similarly to ScreenZen, providing:
- App usage tracking
- Soft lockout sessions
- App blocking capabilities
- Screen time analytics

**Note:** Full functionality requires native mobile app integration. The web interface provides tracking and analytics, but app blocking and lockout sessions require native capabilities.

## Web App Limitations

The web version of Shared Minds **cannot**:
- Block apps on iOS/Android
- Prevent app usage directly
- Monitor app usage in real-time
- Lock the device

The web version **can**:
- Track manually entered screen time data
- Display analytics and insights
- Manage lockout session records
- Set goals and limits (as reminders)
- Provide soft lockout timers (user-initiated)

## Native Mobile Integration Required

To fully implement Screen Time features similar to ScreenZen, you'll need:

### 1. iOS Integration

#### Required Capabilities:
- **Screen Time API** (iOS 12+)
  - Access to app usage data
  - Screen time categories
  - App limits configuration
  
- **App Restrictions API**
  - Block apps programmatically
  - Set time limits per app
  - Schedule downtime

#### Implementation Notes:
```swift
// Example iOS code structure needed
import FamilyControls
import ManagedSettings

// Request authorization
let authorizationCenter = AuthorizationCenter.shared

// Block apps
let store = ManagedSettingsStore()
store.application.blockedApplications = [appBundleId1, appBundleId2]

// Monitor usage
ScreenTime.shared.fetchScreenTimeUsage(...)
```

### 2. Android Integration

#### Required Capabilities:
- **Usage Stats API**
  - Monitor app usage
  - Track screen time per app
  - Get device usage statistics

- **Device Policy Manager** (Enterprise/DMD Mode)
  - Block apps
  - Set usage restrictions
  - Manage device policies

#### Implementation Notes:
```kotlin
// Example Android code structure needed
import android.app.usage.UsageStatsManager
import android.app.admin.DevicePolicyManager

// Get usage stats
val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

// Block apps (requires Device Admin)
val devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
devicePolicyManager.setApplicationHidden(adminComponentName, packageName, true)
```

### 3. React Native / Capacitor Bridge

To integrate with the Shared Minds React web app:

#### React Native:
```javascript
// Native module bridge
import { NativeModules } from 'react-native';

const { ScreenTimeModule } = NativeModules;

// Block apps
ScreenTimeModule.blockApps(['com.example.app1', 'com.example.app2']);

// Start lockout
ScreenTimeModule.startLockout(durationInMinutes);

// Get usage stats
const stats = await ScreenTimeModule.getUsageStats(startDate, endDate);
```

#### Capacitor (Recommended for Shared Minds):
```typescript
// Capacitor plugin
import { ScreenTime } from '@capacitor/screen-time';

// Block apps
await ScreenTime.blockApps({
  apps: ['com.example.app1', 'com.example.app2'],
  duration: 15 // minutes
});

// Get usage
const usage = await ScreenTime.getUsage({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

### 4. Required Permissions

#### iOS:
- `FamilyControls` framework authorization
- Screen Time API access
- App blocking permissions

#### Android:
- `USAGE_STATS` permission
- Device Admin (for app blocking)
- Accessibility Service (for advanced features)

## Recommended Architecture

### Phase 1: Web Tracking (Current)
- Manual entry of screen time
- Lockout session tracking (user-initiated)
- Analytics and insights
- Goal setting

### Phase 2: Native Bridge (Recommended Next Step)
- Capacitor plugin for mobile
- Real-time usage tracking
- Push notifications for lockouts
- Background monitoring

### Phase 3: Full Native Features
- App blocking
- Automatic lockout triggers
- Device-level restrictions
- Parental controls (for family accounts)

## Data Flow

### Current (Web Only):
```
User → Manual Entry → Tracker Studio → Database → Analytics
```

### With Native Integration:
```
Device Usage → Native Module → Capacitor Bridge → Tracker Studio → Database → Analytics
                                      ↓
                            Real-time Lockout Triggers
```

## Security & Privacy Considerations

1. **Permission Requests:**
   - Clearly explain why permissions are needed
   - Provide granular control over what's tracked
   - Allow users to opt-out of blocking features

2. **Data Storage:**
   - Store usage data securely
   - Encrypt sensitive app usage information
   - Comply with privacy regulations (GDPR, CCPA)

3. **User Control:**
   - Emergency override options
   - Adjustable lockout durations
   - Whitelist certain apps (calls, emergency)

## Implementation Priority

1. ✅ **Web Interface** - Complete (tracking, analytics, UI)
2. ⏳ **Native Bridge** - Needs Capacitor plugin development
3. ⏳ **App Blocking** - Requires platform-specific APIs
4. ⏳ **Background Monitoring** - Requires native services

## Testing Requirements

- Test on both iOS and Android devices
- Verify permission flows
- Test lockout override mechanisms
- Ensure battery efficiency
- Validate privacy compliance

## References

- [iOS Family Controls Framework](https://developer.apple.com/documentation/familycontrols)
- [Android Usage Stats API](https://developer.android.com/reference/android/app/usage/UsageStatsManager)
- [Capacitor Native Bridges](https://capacitorjs.com/docs/plugins)
- [ScreenZen Architecture](https://screenzen.app) - Reference implementation
