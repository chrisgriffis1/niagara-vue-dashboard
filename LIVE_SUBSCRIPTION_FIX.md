# Live Subscription Fix - December 11, 2025

## Issues Fixed

### 1. "Started live subscriptions for 0 equipment"
**Problem:** The log was being printed immediately after starting async subscriptions, before any completed.

**Solution:** 
- Changed from fire-and-forget `.then()` callbacks to `await Promise.all()`
- Created array of subscription promises and waited for all to complete
- Now logs actual count of successful subscriptions

### 2. TypeError: Cannot read properties of undefined (reading 'set')
**Problem:** Multiple issues causing this error:
1. `this.subscribedPoints` Map was never initialized in constructor
2. Equipment status updates were trying to modify `equip` object which wasn't the same reference as the one in `this.equipment` array
3. Subscriber callback `this` context was incorrect

**Solution:**
- Added `this.subscribedPoints = new Map()` to constructor
- Used `findIndex` to get the actual equipment reference from `this.equipment` array
- Updated that reference directly: `equipRef.status = 'error'`
- Fixed subscriber callback to use regular function and check NavOrd

### 3. Equipment Status Always "ok"
**Problem:** Live subscriptions weren't actually updating equipment status due to issues above.

**Solution:**
- Fixed all subscription logic to properly update equipment objects
- Added initial status check when subscription is established
- Attached change listener to update status when point values change
- Status now correctly reflects: 'ok', 'warning', or 'error'

### 4. History Query Using 'done' Instead of 'after'
**Problem:** Inconsistent with working patterns in `working-patterns/` directory.

**Solution:**
- Changed `_queryHistory` cursor to use `after` callback instead of `done`
- Changed arrow function to regular function for proper `this` context
- Matches pattern used in `01-bql-query.html` and other working examples

## Key Changes to NiagaraBQLAdapter.js

### Constructor (Lines 10-19)
```javascript
constructor() {
  // ... existing code ...
  this.subscribedPoints = new Map(); // NEW: Track subscribed components
  this.subscriber = null; // NEW: Main subscriber instance
}
```

### _startLiveSubscriptions (Lines 585-715)
**Major rewrite:**
1. Added detailed logging for debugging
2. Changed from fire-and-forget to await async operations
3. Fixed equipment reference using `findIndex`
4. Fixed subscriber.attach callback context
5. Added proper error handling for each subscription
6. Returns promise that resolves after all subscriptions complete

### _queryHistory (Lines 719-753)
**Changed:**
- `done:` callback → `after:` callback
- Arrow functions → regular functions
- Consistent with working patterns

## Testing

Deploy the updated `niagara-dashboard-deploy.zip` to your Niagara station and refresh the page. You should now see:

1. **Console logs:**
   ```
   🔔 Starting live subscriptions for 92 equipment...
     📊 Will monitor 20 equipment
     🔌 Subscribing to [point] for [equipment]...
     ✓ Subscribed to [equipment]
     ✓ Status for [equipment]: ok/warning/error (value: ...)
   ✓ Started live subscriptions for 20 equipment
   ```

2. **Equipment cards:** Status badges should show actual status (not all "ok")

3. **Live updates:** When a point value changes on the station, the equipment status should update in real-time (check console for "🔄 Live update for..." messages)

## What Gets Monitored

- First 20 equipment items (to avoid overwhelming the system)
- For each equipment, subscribes to:
  1. First point with "online", "fault", "alarm", or "status" in the name
  2. Or first point if no status-related points found
- Status determination:
  - **error**: value contains "offline", "fault", "alarm", or equals "false"/"0"
  - **warning**: value contains "warning"
  - **ok**: all other cases

## Next Steps

If you want to monitor more equipment or change the status logic:
1. Edit `_startLiveSubscriptions` in `src/adapters/NiagaraBQLAdapter.js`
2. Change `this.equipment.slice(0, 20)` to monitor more/fewer equipment
3. Modify status logic in `updateStatus()` function (lines 635-645)
4. Rebuild with `npm run build:niagara`

