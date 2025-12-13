# ⚡ History Cache System

## Overview

The Niagara Navigator uses a **Two-Tier Caching System** to provide **instant chart loading** instead of waiting 30 seconds to 10 minutes for history queries.

---

## 🎯 How It Works

### Without Cache (OLD):
```
User clicks chart → Query Niagara station → Wait 30s-10min → Show chart
```

### With Two-Tier Cache (NEW):
```
TIER 1: Pre-generate station cache (runs once, overnight)
TIER 2: Browser downloads cache → Store in IndexedDB → INSTANT charts!
```

---

## 🏭 TIER 1: Station-Side Pre-Cache

### Purpose:
Pre-fetch all point histories **once** on the station, eliminating hundreds of slow BQL queries.

### How to Generate:

1. **Open Settings** (⚙️ button in header)
2. **Navigate to "History Cache" tab**
3. **Click "Generate Station Cache"**
4. **Wait for completion** (progress bar shows % complete)
5. **Download the cache file**
6. **Deploy to station:**
   - Save as: `station:|slot:/HistoryCache/histories.json`
   - Or use FileHelper to write programmatically

### Cache Configuration:

```javascript
{
  maxHistoryDays: 7,      // Last 7 days of data
  batchSize: 5,           // Query 5 points at a time
  onProgress: callback    // Track progress
}
```

### Generated Cache Format:

```json
{
  "version": "1.0",
  "generated": "2025-12-13T10:30:00Z",
  "historyDays": 7,
  "points": {
    "station:|slot:/Drivers/HeatPump1/SupplyAirTemp": {
      "pointId": "station:|slot:/Drivers/HeatPump1/SupplyAirTemp",
      "pointName": "Supply Air Temp",
      "equipmentId": "hp1",
      "equipmentName": "Heat Pump 1",
      "equipmentType": "HeatPump",
      "unit": "°F",
      "data": [
        { "timestamp": "2025-12-06T...", "value": 72.5 },
        { "timestamp": "2025-12-06T...", "value": 72.8 },
        ...
      ],
      "dataPoints": 2016,
      "cachedAt": "2025-12-13T10:30:15Z"
    },
    ...
  },
  "metadata": {
    "totalPoints": 267,
    "successCount": 267,
    "errorCount": 0,
    "errors": [],
    "generationTimeMs": 45000
  }
}
```

---

## 💻 TIER 2: Browser Cache (IndexedDB)

### Automatic Process:

1. **On App Load:**
   - Check for station cache → Download if exists
   - Fall back to individual queries if no station cache
   - Store in IndexedDB

2. **User Clicks Chart:**
   - Instant load from IndexedDB (< 100ms)
   - No network delay!

3. **Auto-Refresh:**
   - Every 10 minutes (configurable)
   - After 5 minutes of user inactivity
   - Runs in background, non-blocking

### IndexedDB Structure:

```javascript
Database: 'NiagaraHistoryCache'
Store: 'histories'
Key: pointId

Record: {
  pointId: string,
  equipmentId: string,
  data: HistoryPoint[],
  lastUpdate: timestamp
}
```

---

## 📊 Performance Comparison

| Scenario | Before Cache | With Station Cache | Improvement |
|----------|-------------|-------------------|-------------|
| **Initial Load** | 30s - 10min | 5-10s | **10-100x faster** |
| **Chart Open** | 5-30s per point | < 100ms | **50-300x faster** |
| **Subsequent Opens** | 5-30s | < 10ms | **500-3000x faster** |
| **Station Load** | High (every chart) | Low (once daily) | **Dramatic reduction** |

---

## 🔄 Cache Lifecycle

### Generation (Admin Only):
```
1. Admin opens Settings → History Cache
2. Clicks "Generate Station Cache"
3. System queries all points (takes time, but only once!)
4. Downloads JSON file
5. Admin deploys to station
```

### Consumption (All Users):
```
1. User opens app
2. Browser checks for station cache
3. If found: Downloads (fast!) → Stores in IndexedDB
4. If not found: Queries individually → Stores in IndexedDB
5. User clicks chart → Instant load!
```

### Refresh (Automatic):
```
- Every 10 minutes: Reloads cache in background
- After 5 minutes idle: Refreshes cache
- User never waits!
```

---

## ⚙️ Configuration

### Station Cache Service:
```javascript
// src/services/StationHistoryCacheService.js
{
  cacheFilePath: 'station:|slot:/HistoryCache/histories.json',
  maxHistoryDays: 7,    // Adjustable
  batchSize: 5          // Adjust for station load
}
```

### Browser Cache Service:
```javascript
// src/services/HistoryCacheService.js
{
  refreshIntervalMinutes: 10,            // Auto-refresh frequency
  idleTimeBeforeRefreshSeconds: 300,     // Refresh after idle time
  maxHistoryDays: 7,                     // Match station cache
  batchSize: 10                          // Faster, less critical
}
```

---

## 🚀 Deployment Workflow

### For Live Sites:

1. **Generate Cache Nightly:**
   - Schedule a Niagara job to run `generateStationCache()`
   - Or manually generate weekly
   
2. **Deploy Cache File:**
   - Write to `station:|slot:/HistoryCache/histories.json`
   - Set permissions (read-only for users)

3. **Users Benefit:**
   - Instant charts on first load
   - No waiting!

### For Development:

- No station cache? No problem!
- Falls back to individual queries automatically
- Still caches in browser for subsequent loads

---

## 🛠️ API Reference

### Generate Station Cache:

```javascript
import stationHistoryCacheService from './services/StationHistoryCacheService'

const cacheData = await stationHistoryCacheService.generateStationCache(
  adapter,
  {
    maxHistoryDays: 7,
    batchSize: 5,
    onProgress: (current, total, percent) => {
      console.log(`Progress: ${percent}%`)
    }
  }
)
```

### Load Station Cache:

```javascript
const stationCache = await stationHistoryCacheService.loadCacheFromStation()
if (stationCache) {
  // Use pre-cached data
}
```

### Export/Import Cache:

```javascript
// Export to download
stationHistoryCacheService.exportToFile(cacheData)

// Import from file
const file = ... // File input
const imported = await stationHistoryCacheService.importFromFile(file)
```

### Browser Cache:

```javascript
import historyCacheService from './services/HistoryCacheService'

// Start caching (automatic on app load)
await historyCacheService.startCaching(adapter, deviceStore)

// Get cached history
const history = await historyCacheService.getHistoryRange(
  pointId,
  startDate,
  endDate
)

// Get cache status
const stats = historyCacheService.getStats()
console.log(`Cached ${stats.cachedPoints}/${stats.totalPoints} points`)
```

---

## 📈 Monitoring

### Check Cache Status:

**In Header:**
```
📊 Caching histories... 73%  → In progress
⚡ 267 histories cached      → Complete
```

**In Settings:**
- Total points cached
- Success/error counts
- Generation time
- Cache size

**In Console:**
```javascript
historyCacheService.getStats()
// {
//   totalPoints: 267,
//   cachedPoints: 267,
//   lastUpdate: Date,
//   errors: []
// }
```

---

## 🐛 Troubleshooting

### "No station cache found"
- **Cause:** Cache file not deployed to station
- **Fix:** Generate and deploy cache file

### "Cache generation failed"
- **Cause:** BQL query errors, permission issues
- **Fix:** Check console for errors, verify station access

### "Charts still slow"
- **Cause:** Browser cache not initialized
- **Fix:** Check IndexedDB in DevTools, clear and refresh

### "Cache is stale"
- **Cause:** Station cache is old
- **Fix:** Regenerate cache (or wait for auto-refresh)

---

## 🎉 Benefits Summary

✅ **10-300x faster** chart loading  
✅ **Dramatically reduced** station load  
✅ **Instant** user experience  
✅ **Automatic** updates and refresh  
✅ **Graceful fallback** if no station cache  
✅ **Works offline** (after initial load)  

---

## 🔮 Future Enhancements

- [ ] Incremental cache updates (delta sync)
- [ ] Compression (gzip station cache)
- [ ] Multiple cache files per equipment type
- [ ] Cache health monitoring dashboard
- [ ] Automatic cleanup of old data
- [ ] Service worker for background sync

---

**Result:** From **30 seconds - 10 minutes** to **< 100ms** chart loading! 🚀

