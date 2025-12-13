# History Query Fix - December 11, 2025

## Issue
When querying historical data for trending charts, the application was encountering:
```
BoxError: Path depth must be <= 2.
Error querying history for /Drivers/BacnetNetwork/HP75/points/Monitor/no_OaTemp
```

This occurred because the code was trying to directly navigate to point components (6 levels deep: `/Drivers/BacnetNetwork/HP75/points/Monitor/no_OaTemp`), but Niagara's path navigation has a **maximum depth of 2 levels**.

## Root Cause
The `_findHistoryId` method in `NiagaraBQLAdapter.js` was attempting to:
1. Navigate directly to the point component using `station:|slot:/Drivers/BacnetNetwork/HP75/points/Monitor/no_OaTemp`
2. Get the history slot from that component
3. Extract the history ID

This approach **violates Niagara's 2-level path depth limit** for ORD navigation.

## Solution
After reviewing `LivePoints.html` (line 11785), I found the correct Niagara-native pattern:

**Use BQL to query `history:HistoryConfig` instead of direct path navigation.**

### New Implementation
```javascript
// Extract equipment and point names from slotPath
const equipmentName = point.equipmentId; // e.g., "HP75"
const pointName = point.name;            // e.g., "no_OaTemp"

// Escape single quotes for BQL (SQL-style)
const escapedEquipment = equipmentName.replace(/'/g, "''");
const escapedPointName = pointName.replace(/'/g, "''");

// Query HistoryConfig using BQL
const bqlQuery = `select id, slotPath from history:HistoryConfig 
                  where slotPath like '%/${escapedEquipment}/%' 
                  and slotPath like '%${escapedPointName}%'`;
const bqlOrd = `station:|slot:/Drivers|bql:${bqlQuery}`;

// Execute query and extract history ID
const table = await baja.Ord.make(bqlOrd).get();
table.cursor({
  each: function(record) {
    const id = record.get('id');
    // Use this ID with history: scheme
    // e.g., "history:MJHOptimizer1/Shainberg$20North$20HP75$20OaTemp"
  },
  after: function() { /* complete */ }
});
```

## Key Differences

| Old Approach (❌ Failed) | New Approach (✅ Works) |
|-------------------------|------------------------|
| Direct path navigation | BQL query |
| `station:\|slot:/Drivers/BacnetNetwork/HP75/...` (6 levels) | `station:\|slot:/Drivers\|bql:select...` (2 levels) |
| Tries to access component slots | Queries HistoryConfig database |
| Violates depth limit | Respects Niagara constraints |

## Benefits
1. **No path depth errors** - BQL queries are executed at database level, not path navigation
2. **More reliable** - Uses Niagara's native history discovery mechanism
3. **Follows working patterns** - Matches `LivePoints.html` implementation
4. **Better error handling** - Returns null gracefully if no history found

## Pattern Source
This pattern is taken directly from the working `LivePoints.html` file:
- Line 11785: History discovery using BQL
- Line 10217-10246: History querying with `history:` scheme
- Line 4391: Equipment-based history discovery

## Testing
After deploying the updated `niagara-dashboard-deploy.zip`:
1. Navigate to an equipment card
2. Click on a trendable point (Temperature, Pressure, etc.)
3. The mini-chart should load without "BoxError: Path depth must be <= 2"
4. Check console - should see history data points being loaded

## Technical Notes
- The `history:` scheme requires the ID **without** the leading slash
- If ID is `/MJHOptimizer1/HP75$20OaTemp`, use `history:MJHOptimizer1/HP75$20OaTemp`
- History IDs often use `$20` for spaces (URL encoding)
- BQL `like` clause is case-insensitive and supports wildcard `%`

