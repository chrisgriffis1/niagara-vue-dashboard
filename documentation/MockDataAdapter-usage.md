# MockDataAdapter - Usage Guide

## Overview

The `MockDataAdapter` provides a universal interface for accessing building automation data. It loads the `demo-site-profile.json.json` file and presents it through a clean, promise-based API.

## Features

✅ **Universal Interface** - Matches the `BuildingDataAdapter` interface from master-plan.md  
✅ **Automatic Initialization** - Lazy-loads data on first use  
✅ **Smart Point Association** - Distributes points across equipment  
✅ **Mock Historical Data** - Generates realistic trends for Chart.js  
✅ **Alarm Simulation** - Mock alarms with priority levels  
✅ **Fast Lookups** - Uses Maps for O(1) data access  

## Data Structure

```javascript
// Equipment Object
{
  id: "equip_1",
  name: "VAV-001",
  type: "VAV",
  location: "Floor 1",
  ord: "/Services/FieldBus/Equipment/VAV_1",
  pointCount: 5,
  status: "ok" // or "warning", "error"
}

// Point Object
{
  id: "point_1",
  name: "Pressure_001",
  type: "Pressure",
  unit: "PSI",
  value: 60.04,
  ord: "/Points/Pressure_1",
  displayValue: "60.04 PSI"
}

// Historical Data Point
{
  timestamp: "2025-12-10T12:00:00.000Z",
  value: 60.04,
  pointId: "point_1"
}
```

## API Methods

### `initialize()`
Loads the JSON data and builds lookup maps.

```javascript
const adapter = new MockDataAdapter()
await adapter.initialize()
```

**Note:** All methods auto-initialize, so you don't need to call this explicitly.

---

### `discoverDevices()`
Returns all equipment in the building.

```javascript
const equipment = await adapter.discoverDevices()
// Returns: Array of equipment objects with status and point counts
```

**Use Case:** Display equipment grid, building overview

---

### `getPointsByEquipment(equipmentId)`
Returns all points for a specific equipment.

```javascript
const points = await adapter.getPointsByEquipment('equip_1')
// Returns: Array of point objects for that equipment
```

**Use Case:** Show points in EquipmentCard, point selection

---

### `getPointValue(pointId)`
Gets the current value of a specific point.

```javascript
const point = await adapter.getPointValue('point_1')
// Returns: Point object with current value and metadata
```

**Use Case:** Real-time value display, point details

---

### `getHistoricalData(pointId, timeRange)`
Generates mock historical data for trending (24 hours, 30-min intervals).

```javascript
const history = await adapter.getHistoricalData('point_1')
// Returns: Array of {timestamp, value, pointId} objects
```

**Use Case:** Chart.js trending, historical analysis

---

### `getEquipmentByType(type)`
Filters equipment by type.

```javascript
const vavs = await adapter.getEquipmentByType('VAV')
// Returns: Array of VAV equipment
```

**Use Case:** Filter by equipment type

---

### `getEquipmentTypes()`
Gets list of all unique equipment types.

```javascript
const types = await adapter.getEquipmentTypes()
// Returns: ["AHU", "Boiler", "Chiller", "Fan", "Pump", "VAV"]
```

**Use Case:** Type filter dropdowns

---

### `getBuildingStats()`
Gets building summary statistics.

```javascript
const stats = await adapter.getBuildingStats()
// Returns: { equipmentCount, pointCount, equipmentTypes, locations }
```

**Use Case:** Dashboard summary, header statistics

---

### `subscribeToAlarms(callback)`
Subscribe to alarm updates.

```javascript
const unsubscribe = adapter.subscribeToAlarms((alarms) => {
  console.log('New alarms:', alarms)
})

// Later, cleanup:
unsubscribe()
```

**Use Case:** Real-time alarm notifications

---

## Usage in Vue Components

### Example 1: Load Equipment List

```vue
<script setup>
import { ref, onMounted } from 'vue'
import MockDataAdapter from '@/adapters/MockDataAdapter'

const adapter = new MockDataAdapter()
const equipment = ref([])

onMounted(async () => {
  equipment.value = await adapter.discoverDevices()
})
</script>
```

### Example 2: Load Points for Equipment

```vue
<script setup>
import { ref } from 'vue'
import MockDataAdapter from '@/adapters/MockDataAdapter'

const adapter = new MockDataAdapter()
const points = ref([])

const loadPoints = async (equipmentId) => {
  points.value = await adapter.getPointsByEquipment(equipmentId)
}
</script>
```

### Example 3: Load Historical Data for Chart

```vue
<script setup>
import { ref } from 'vue'
import MockDataAdapter from '@/adapters/MockDataAdapter'

const adapter = new MockDataAdapter()
const chartData = ref([])

const loadHistory = async (pointId) => {
  const history = await adapter.getHistoricalData(pointId)
  chartData.value = history
  // Now ready for Chart.js
}
</script>
```

---

## Usage with Pinia Stores

The recommended pattern is to use the adapter through Pinia stores:

```javascript
// In your component
import { useDeviceStore } from '@/stores/deviceStore'

const deviceStore = useDeviceStore()

// Load equipment
await deviceStore.loadDevices()

// Access equipment
const equipment = deviceStore.allDevices

// Load points for specific equipment
await deviceStore.loadDevicePoints('equip_1')

// Get historical data
const history = await deviceStore.getPointHistory('point_1')
```

---

## Data Distribution

The adapter intelligently distributes points across equipment:
- **45 equipment** in the demo data
- **234 points** in the demo data
- **~5 points per equipment** (automatically calculated)

---

## Mock Historical Data

Historical data is generated with:
- **48 data points** (24 hours)
- **30-minute intervals**
- **Realistic variation** (10% of base value)
- **Sine wave pattern** for natural trends

---

## Status Calculation

Equipment status is determined by checking point values:
- **OK**: All points within normal range
- **Warning**: Any point value > 95 or < 5

---

## Performance

- **Lazy loading**: Data loads only when first accessed
- **Map-based lookups**: O(1) access time for points
- **Cached in memory**: No repeated file reads
- **Async/await**: Non-blocking operations

---

## Future: Niagara Integration

When ready to connect to real JACE systems:

1. Create `NiagaraBQLAdapter.js` with same interface
2. Swap adapter in stores:
   ```javascript
   // Change from:
   import MockDataAdapter from '../adapters/MockDataAdapter'
   // To:
   import NiagaraBQLAdapter from '../adapters/NiagaraBQLAdapter'
   ```
3. Components require **zero changes** ✅

---

## Testing

Open browser console to see adapter logs:
```
✓ MockDataAdapter initialized: 45 equipment, 234 points
```

All methods include error handling and helpful console messages.

