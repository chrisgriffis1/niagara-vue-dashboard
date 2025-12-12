# BQL Limitations - Important Notes

## CRITICAL: BQL Cannot Query Tags or Generic Components

### The Problem
Attempting to query components or tags using BQL will fail with:
```
BoxError: component
```

### What Doesn't Work
```javascript
// ❌ This will FAIL - component:Component is not a valid BQL type
const bql = "station:|slot:/Drivers|bql:select slotPath from component:Component";

// ❌ BQL cannot query tags directly
// There is no BQL syntax to query by implied tags like n:device
```

### Valid BQL Types
BQL can only query specific types:
- `control:ControlPoint` - Control points
- `alarm:AlarmExt` - Alarm extensions
- `history:HistoryConfig` - History configurations
- Other specific component types (but NOT generic `component:Component`)

### Workaround: Query Points, Extract Devices, Check Tags Directly

**Pattern:**
1. Query control points using BQL (this works)
2. Extract unique device paths from point slotPaths
3. Resolve device components directly (not via BQL)
4. Check tags using `component.getTags().get('n:device')`

**Example:**
```javascript
// Step 1: Query points (this works)
const pointsBql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath from control:ControlPoint";
// Extract device paths from point slotPaths

// Step 2: Resolve devices directly (not via BQL)
const deviceOrd = 'station:|slot:' + devicePath;
const device = await baja.Ord.make(deviceOrd).get();

// Step 3: Check tags directly (not via BQL) - per bajadocs/component
// component.tags() returns Promise<ComponentTags>
const tags = await device.tags();
const allTags = tags.getAll();
const deviceTag = allTags.find(function(tag) {
  return tag.getId() === 'n:device';
});
if (deviceTag) {
  const value = deviceTag.getValue().toString().toLowerCase();
  if (value.includes('hp') || value.includes('heatpump')) {
    // Found HP device
  }
}
```

### Why This Matters
- **NEQL can query tags** - but we're avoiding NEQL for now
- **BQL is faster** - but limited to specific component types
- **Tags must be checked after resolving** - can't query them directly

### Future Solution
When ready to use NEQL, it can query tags directly. For now, use the workaround pattern above.

---

## Summary
- ✅ BQL works for: ControlPoint, AlarmExt, HistoryConfig
- ❌ BQL does NOT work for: generic Component, tags, implied properties
- ✅ Workaround: Query points → Extract device paths → Resolve devices → Check tags directly

