# Critical Issues to Fix

## Status: IN PROGRESS

### 1. Point-Devices Display ✅ PARTIALLY FIXED
**Issue**: Point-devices (ExhFan, Freezer, etc.) should:
- Show their `out.value` directly on card
- NOT show a points dropdown (they ARE the point, not a container)
- Only show error status if `{status}` is NOT `{ok}`

**Fix Applied**:
- Added `pointCount: 0` to point-devices
- Added `isPointDevice: true` flag
- Status only set to 'error' if status string contains fault/alarm

**Remaining**:
- Need to update EquipmentCard to detect `isPointDevice` and show value directly
- Hide "Tap to load points" button for point-devices

---

### 2. Alarms Not Showing 🔧 IN PROGRESS
**Issue**: No alarms appearing in dashboard

**Root Cause**: BQL query using `select *` which doesn't work with `alarm:AlarmRecord` schema

**Fix Applied**:
- Changed to explicit field selection: `uuid, sourceState, ackState, alarmClass, timestamp, sourceName, alarmData`
- Added multiple query attempts (AlarmService path and station root)
- Better error handling and logging

**To Test**:
- Look for console message: `🔔 Using alarm query: ...`
- Check if alarms appear in AlarmList component

---

### 3. Sparklines Not Working ⏳ PENDING
**Issue**: Sparklines not loading on most cards

**Root Causes**:
1. History queries take too long (waiting for user interaction)
2. COV histories sparse - some equipment unchanged for weeks/months
3. No caching of history data
4. Loading happens after card renders (lazy)

**Proposed Fix** (LARGE CHANGE):
```javascript
// 1. Pre-load last week of history for ALL equipment at startup
_backgroundLoadHistoryForSparklines() {
  - Query all history configs
  - Get last 7 days of data for each
  - Store in cache: historyCache[equipmentId] = { timestamp, data }
  - Save to localStorage
}

// 2. Cache history data
_saveHistoryCache() {
  const cacheData = {
    timestamp: Date.now(),
    histories: this.historyCache
  };
  localStorage.setItem('niagara-history-cache', JSON.stringify(cacheData));
}

// 3. On card mount, check cache first
if (historyCache[equipmentId] && cacheAge < 1hour) {
  // Use cached data immediately
  showSparkline(cachedData)
} else {
  // Load in background
  loadHistory()
}
```

---

### 4. No Live Data Subscriptions ⏳ PENDING
**Issue**: Cards show snapshot data, not live updates

**What's Needed**:
1. **When card expands**: Subscribe to key points
2. **Update in real-time**: As values change on station
3. **Show timestamp**: "Last updated: 2 min ago"
4. **Efficient**: Use single subscriber for multiple points (batch pattern from 03-batch-resolve)

**Implementation Pattern** (from working-patterns/02-single-point-subscription.html):
```javascript
// In EquipmentCard.vue
onMounted(() => {
  if (props.equipment.pointCount > 0) {
    subscribeToLiveData()
  }
})

const subscribeToLiveData = async () => {
  const subscriber = new baja.Subscriber()
  
  subscriber.attach('changed', function(prop) {
    if (prop.getName() === 'out') {
      // Update point value
      updatePointValue(this, new Date())
    }
  })
  
  // Subscribe to top 5 points
  for (const point of points.value.slice(0, 5)) {
    const ord = `station:|slot:${point.slotPath}`
    baja.Ord.make(ord).get({ subscriber: subscriber })
  }
}
```

---

### 5. History Caching Strategy

**Current Problem**:
- History queries take 5-30 seconds
- User waits for every card
- No caching between sessions

**Proposed 3-Level Cache**:

#### Level 1: In-Memory (Runtime)
```javascript
this.historyCache = new Map() // equipmentId -> { timestamp, data }
```

#### Level 2: LocalStorage (4 hour TTL)
```javascript
{
  timestamp: Date.now(),
  histories: {
    'HP1': { timestamp: ..., data: [...] },
    'HP2': { timestamp: ..., data: [...] }
  }
}
```

#### Level 3: Niagara JsonHelper (Persistent)
```javascript
// Save to station for cross-device sync
persistenceService.save('historyCache', historyData)
```

**Loading Strategy**:
1. **On startup**: Load from cache if < 4 hours old
2. **Background**: Refresh data for equipment with history
3. **Priority**: Load history for equipment with alarms first
4. **Lazy**: Only query if not in cache and user requests

---

### 6. Point-Device Card Template

**Need special template for point-devices**:

```vue
<template>
  <div v-if="equipment.isPointDevice" class="point-device-card">
    <!-- No points dropdown -->
    <!-- Show current value prominently -->
    <div class="device-value">
      <span class="value">{{ equipment.currentValue }}</span>
      <span class="unit">{{ equipment.unit }}</span>
    </div>
    
    <!-- Show last update time -->
    <div class="last-update">
      Updated: {{ lastUpdateTime }}
    </div>
    
    <!-- Optional: Show sparkline if has history -->
    <MiniChart v-if="miniChartData.length > 0" ... />
  </div>
</template>
```

---

## Implementation Order (Recommended)

### Phase 1: Quick Wins (30 min)
1. ✅ Fix point-device display (hide points button, show value)
2. ✅ Fix alarm query (explicit fields)
3. Test alarms are working

### Phase 2: Caching (1-2 hours)
1. Add history cache to localStorage
2. Pre-load last 7 days for all equipment at startup
3. Use cached data for sparklines
4. Show loading indicator during pre-load

### Phase 3: Live Data (1-2 hours)
1. Add live subscriptions to EquipmentCard
2. Show "Last updated" timestamp
3. Batch subscribe to multiple points efficiently
4. Update values in real-time

### Phase 4: Polish (30 min)
1. Show cache age in UI
2. Add "Force Refresh" button
3. Improve loading states
4. Test with real station

---

## Testing Checklist

- [ ] Point-devices show value, not points dropdown
- [ ] Alarms appear in AlarmList
- [ ] Sparklines load within 2 seconds (from cache)
- [ ] Live data updates when values change
- [ ] "Last updated" timestamp shows on cards
- [ ] Reload page is instant (< 1 second)
- [ ] History cache persists between sessions

---

## Console Messages to Look For

### Success:
```
💾 Saved equipment and alarms to cache
💾 Saved history cache (X equipment)
🔔 Using alarm query: ...
🔔 Found X alarms
📊 Pre-loaded history for X equipment
⚡ Using cached data - INSTANT LOAD!
```

### Warnings:
```
⚠️ No history found for point: ...
⚠️ Alarm monitoring not available
⚠️ Cache expired (>4 hours), refreshing...
```

### Errors:
```
❌ Error querying history for ...
❌ BQL query returned no table
```

