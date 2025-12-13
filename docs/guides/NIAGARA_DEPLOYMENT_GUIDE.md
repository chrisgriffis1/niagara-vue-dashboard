# Niagara Station Deployment Guide

## Overview

The Vue dashboard can now automatically detect if it's running in a Niagara station and use live BQL data, or fall back to mock data for development.

## How It Works

### Auto-Detection

The app automatically detects the environment:

```javascript
// In App.vue
const isNiagara = typeof baja !== 'undefined' && baja && baja.Ord
const adapter = isNiagara ? new NiagaraBQLAdapter() : new MockDataAdapter()
```

- **Niagara Station**: Uses `NiagaraBQLAdapter` with live BQL queries
- **Development**: Uses `MockDataAdapter` with JSON data

### Adapter Interface

Both adapters implement the same interface:
- `initialize()` - Initialize and discover equipment/points
- `discoverDevices()` - Get all equipment
- `getPointsByEquipment(equipmentId)` - Get points for equipment
- `getPointValue(pointId)` - Get current point value
- `getHistoricalData(pointId, timeRange)` - Get history data
- `getBuildingStats()` - Get summary statistics
- `getEquipmentTypes()` - Get unique equipment types

## Deployment Steps

### Option 1: Static Files in Niagara File Service

1. **Build the Vue app:**
   ```bash
   npm run build
   ```
   This creates a `dist/` folder with static files.

2. **Copy to Niagara station:**
   - Copy all files from `dist/` to your Niagara station's file service
   - Typical path: `/file/web1/` or `/file/dashboard/`
   - You can use Workbench's File Service or FTP

3. **Access the dashboard:**
   - Open: `http://your-station-ip:port/file/web1/index.html`
   - The app will automatically detect it's in Niagara and use BQL adapter

### Option 2: Embedded in Existing HTML Page

If you want to embed it in an existing Niagara HTML page:

1. Build the Vue app
2. Copy `dist/assets/*` to `/file/web1/assets/`
3. Copy `dist/index.html` and modify it to include BajaScript:

```html
<!-- Add before Vue app loads -->
<script type='text/javascript' src='/requirejs/config.js'></script>
<script type='text/javascript' src='/module/js/com/tridium/js/ext/require/require.min.js'></script>

<!-- Then load Vue app -->
<script type="module" src="/file/web1/src/main.js"></script>
```

## Testing

### Development (Mock Data)
```bash
npm run dev
# Opens http://localhost:5173
# Uses MockDataAdapter with firstTryNeedsWork.json
```

### Niagara Station (Live Data)
1. Deploy to station
2. Open in browser
3. Check console for:
   - `📍 Environment: Niagara Station`
   - `✓ Niagara BQL Adapter initialized`
   - Equipment and point counts

## BQL Queries Used

### Discover Equipment
```bql
station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name from bacnet:BacnetDevice
```

### Discover Points
```bql
station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name, out, status from control:ControlPoint
```

### Query History
```javascript
// History ID format: "history:/path/to/point"
const history = await baja.Ord.make("history:" + historyId).get()
history.cursor({ each: (record) => { ... } })
```

## Features

✅ **Auto-detection** - Automatically uses correct adapter  
✅ **Live data** - Real-time equipment and points from station  
✅ **History queries** - Trending data from history service  
✅ **Equipment discovery** - Finds all BACnet devices  
✅ **Point discovery** - Finds all control points  
✅ **Type inference** - Automatically categorizes equipment and points  

## Troubleshooting

### "baja global not found"
- Make sure you're running in Niagara station environment
- Check that BajaScript is loaded before Vue app

### "Equipment discovery timeout"
- Station may be slow or have many devices
- Check network connectivity
- Verify BQL queries work in Workbench

### "No history found for point"
- Point may not have history configured
- Check history service in Workbench
- Verify history ID format

### Blank page
- Check browser console for errors
- Verify all files copied correctly
- Check file permissions in Niagara

## Next Steps

1. ✅ Implemented NiagaraBQLAdapter
2. ✅ Auto-detection in App.vue
3. ⏳ Test on actual station
4. ⏳ Add alarm subscriptions
5. ⏳ Add schedule discovery
6. ⏳ Optimize BQL queries for performance

## Notes

- The adapter uses the same patterns as `LivePoints.html`
- BQL queries may take time on large stations
- History queries are filtered by date range
- Point values are fetched live on demand

