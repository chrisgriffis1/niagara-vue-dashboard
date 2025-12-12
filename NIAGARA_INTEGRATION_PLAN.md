# Niagara Tridium Station Integration Plan

## Goal
Get the Vue dashboard working on your Niagara Tridium station with live data.

## Approach

### Phase 1: Implement NiagaraBQLAdapter
Replace MockDataAdapter with NiagaraBQLAdapter that uses:
- **BQL queries** for discovering equipment and points
- **BajaScript** (`baja.Ord.make()`) for accessing components
- **History queries** for trending data
- **WebSocket subscriptions** for real-time updates

### Phase 2: Build Vue App for Niagara
- Build Vue app as static files (`npm run build`)
- Deploy to Niagara station's `/file/web1/` directory
- Update adapter to detect if running in Niagara (check for `baja` global)

### Phase 3: Test & Deploy
- Test adapter with real station
- Handle authentication
- Test all features (equipment, points, trending, alarms)

## Key Methods to Implement

Based on MockDataAdapter, NiagaraBQLAdapter needs:

1. **`initialize()`** - Check for `baja` global, authenticate
2. **`discoverDevices()`** - BQL query: `station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name from bacnet:BacnetDevice`
3. **`getPointsByEquipment(equipmentId)`** - BQL query for points under equipment
4. **`getPointValue(pointId)`** - Get current value via `baja.Ord.make(pointOrd).get()`
5. **`getHistoricalData(pointId, timeRange)`** - Query history service
6. **`getBuildingStats()`** - Aggregate from discovered devices
7. **`subscribeToAlarms(callback)`** - WebSocket subscription

## BQL Query Examples (from LivePoints.html)

```javascript
// Discover all control points
const bql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name, out, status from control:ControlPoint"

// Get equipment
const equipBql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name from bacnet:BacnetDevice"

// Access component directly
const component = await baja.Ord.make("station:|slot:/Drivers/BacnetNetwork/AHU1").get()
```

## Deployment Strategy

### Option 1: Static Files in Niagara
1. Build Vue: `npm run build`
2. Copy `dist/*` to Niagara station's `/file/web1/` folder
3. Access via: `http://station-ip:port/file/web1/index.html`

### Option 2: Niagara Module (Advanced)
- Create Niagara module with Vue app embedded
- Requires Java module development

## Detection Pattern

```javascript
// Check if running in Niagara
const isNiagara = typeof baja !== 'undefined' && baja.Ord

if (isNiagara) {
  adapter = new NiagaraBQLAdapter()
} else {
  adapter = new MockDataAdapter()
}
```

## Next Steps

1. ✅ Create implementation plan
2. ⏳ Implement NiagaraBQLAdapter with BQL queries
3. ⏳ Add Niagara detection in App.vue
4. ⏳ Test adapter methods
5. ⏳ Build and deploy to station
6. ⏳ Test with real data

