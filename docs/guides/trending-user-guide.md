# Advanced Trending System - User Guide

## Overview
The Advanced Trending System provides powerful multi-point charting, time-based analysis, and smart equipment-specific recommendations for troubleshooting building automation systems.

## Opening the Trending Panel

### From Equipment Card
1. Expand an equipment card
2. Click on any data point
3. The Trending Panel opens with that point pre-selected

### From Alarm (Future)
- Click an alarm to see context around the alarm event
- Automatic ±time range selection

## Time Range Selection

### Quick Ranges
**Short-term:**
- 15 seconds
- 1 minute, 5 min, 15 min
- 1 hour, 4 hours, 12 hours, 24 hours

**Calendar-based:**
- Today (midnight to now)
- Yesterday (full day)
- This Week
- Last Week
- This Month
- Year to Date (YTD)

### Custom Range
1. Click "🗓 Custom Range"
2. Select start date/time
3. Select end date/time
4. Click "Apply"

### Alarm Context (When opened from an alarm)
- ±15 seconds
- ±1 minute, ±5 min, ±15 min
- ±1 hour, ±4 hours

## Point Selection

### Single Point
- Opens automatically with the clicked point
- View name, unit, and current value

### Add Multiple Points
Click **"+ Add Points"** to open the point picker:
- Search by point name or type
- Expand equipment groups
- Click a point to add (✓ shows selected)
- Each point gets a unique color

### Quick Actions

#### Add All Points from Equipment
- Click **"+ All Points from [Equipment Name]"**
- Adds every point from the current equipment
- Useful for comprehensive equipment analysis

#### Add Points by Type
1. Click **"▶ Add by Point Type"**
2. Select a type (e.g., "Temperature", "Pressure")
3. All points of that type across **all equipment** are added
4. Perfect for zone-wide comparisons

### Remove Points
- Click the **✕** next to any selected point chip
- Or click **"✕ Clear All"** to start over

## Smart Suggestions 💡

When you have an equipment selected, the system provides intelligent point recommendations based on equipment type:

### VAV (Variable Air Volume)
- **Temperature Points:** Supply Temp, Room Temp, Discharge Temp, Setpoint
- **Airflow Points:** Damper Position, Airflow, Static Pressure
- **Related Systems:** OA Temp, Fan Speed, Filter Status

### AHU (Air Handler Unit)
- **Supply Air:** Supply Temp, Supply Fan Speed, Supply Static
- **Return Air:** Return Temp, Return Fan Speed, Return Static
- **Outside Air:** OA Temp, OA Damper, Mixed Air Temp
- **Status:** Fan Status, Filter Status, Cooling Valve, Heating Valve

### Chiller
- **Temperatures:** CHW Supply Temp, CHW Return Temp, Condenser Temp
- **Pressures & Flow:** CHW Flow, CHW Pressure, Refrigerant Pressure
- **Performance:** Capacity, Power, Efficiency, Runtime

### Boiler
- **Temperatures:** HW Supply Temp, HW Return Temp, Setpoint
- **Flow & Pressure:** HW Flow, HW Pressure, Gas Pressure
- **Status:** Firing Rate, Flame Status, Safety Status

### Pump
- **Performance:** Speed, Flow, Pressure, Power
- **Status:** Run Status, VFD Status, Hand Off Auto

### Fan
- **Performance:** Speed, Static Pressure, Power, Current
- **Status:** Run Status, VFD Status, Proof Of Flow

**Usage:**
1. Click individual **"+ [Point Name]"** buttons
2. Or click **"✨ Add All Suggested Points"** to add them all at once
3. Smart fuzzy matching finds points even if names vary

## View Modes

### Chart View 📊
- Default view
- Line chart with color-coded points
- Smooth interpolation
- Hover to see exact values
- Legend shows point names and units

**Multi-Point Charts:**
- Each point gets its own line with unique color
- All points share the same X-axis (time)
- Y-axis auto-scales to fit all data
- Perfect for correlation analysis

### Table View 📋
- Click **"📋 Table View"** to switch
- Rows = timestamps
- Columns = selected points
- Values formatted with 2 decimal places
- Missing data shows as "-"

**Export Data:**
- Click **"📥 Export CSV"**
- Downloads instant CSV file
- Opens in Excel, Google Sheets, etc.
- Filename: `trend-data-[timestamp].csv`

## Keyboard Shortcuts

- **Esc** - Close the Trending Panel

## Tips & Tricks

### Troubleshooting an Alarm
1. Open the equipment with the alarm
2. Click the alarmed point
3. Use **Smart Suggestions** to add related points
4. Look for correlation:
   - Did OA temp spike?
   - Did damper position fail?
   - Did setpoint change?

### Zone Temperature Comparison
1. Open any VAV in the zone
2. Click **"▶ Add by Point Type"**
3. Select **"+ All Temperature"**
4. Now you see ALL zone temps on one chart
5. Identify hot/cold spots instantly

### Chiller Performance Analysis
1. Open chiller equipment
2. Use **Smart Suggestions** → **"✨ Add All Suggested Points"**
3. Switch to **Table View**
4. Export CSV for detailed analysis

### Before/After Maintenance
1. Select **"Yesterday"** time range
2. Add all relevant points
3. Export CSV as baseline
4. After maintenance, repeat and compare

## Future Enhancements
- Time slider for scrubbing through history
- Bar chart and combined bar+line charts
- Annotations for maintenance events
- Automatic anomaly detection
- Save favorite point combinations
- Scheduled reports

---

**Questions?** Check the Smart Suggestions for equipment-specific guidance!

