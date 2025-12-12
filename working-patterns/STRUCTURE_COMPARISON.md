# Structure Comparison: firstTryNeedsWork.json vs demo-site-profile.json.json

## ✅ What We Have (Matches):

1. **metadata**: ✅ Complete
   - `exportDate`, `toolVersion`, `stationInfo`

2. **data.equipment**: ✅ Complete
   - `id`, `name`, `type`, `location`, `ord`
   - All equipment entries populated

3. **data.points**: ✅ Complete (with bonus)
   - `id`, `name`, `type`, `unit`, `value`, `ord`
   - **BONUS**: `historyId` field added (not in demo but useful)

4. **data.tags**: ✅ Complete
   - `siteName`, `siteReference`, `equipmentCount`, `pointCount`, `facets`

## ❌ What's Missing:

1. **data.schedules**: ❌ Empty array `[]`
   - **Required structure**: `[{ id, name, type, active }]`
   - **Need**: Query schedules from Niagara and populate

2. **data.histories**: ❌ Empty array `[]`
   - **Required structure**: `[{ id, name, interval, retention }]`
   - **Note**: We already collect history configs, but need to:
     - Extract `interval` and `retention` from `toString` field
     - Create separate history entries (not just historyId on points)
   - **From history config toString**: "Interval: irregular, Record Type: [type], Capacity: [number] records, Full Policy: Roll"
   - **Need**: Parse interval and retention from history configs

## Next Steps:

1. **Schedules**: Need to find BQL query for schedules (e.g., `schedule:Schedule` or similar)
2. **Histories**: Extract interval/retention from existing history configs and create history entries

