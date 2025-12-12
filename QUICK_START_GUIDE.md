# 🚀 NiagaraNavigator - Quick Start Guide

## For Site Technicians

### First Time Using This Dashboard

1. **Load the page** - LivePoints.html in your Niagara station
2. **Click "🔄 Refresh Discovery"** - Let it auto-detect your setup
3. **Wait 15-30 seconds** - It's scanning your entire station
4. **Done!** - All devices should now be organized

---

## If Devices Are Missing

### Step 1: Check Base Path
```
1. Click "🔧 Site Config" button (top of page)
2. Look at "Auto-Detected Info" section
3. Is the detected path correct?
   - Should be where your equipment lives
   - Common: "Drivers/BacnetNetwork" or "Drivers" or "Equipment"
4. If wrong, add correct path and save
```

### Step 2: Adjust Scan Depth
```
1. In Site Config, find "Max Scan Depth"
2. If equipment is nested deep, increase to 6 or 8
3. Save and run discovery again
```

### Step 3: Add Custom Device Types
```
1. In Site Config, scroll to "Device Type Patterns"
2. Click "+ Add Device Type"
3. Enter:
   - Type name (e.g., "RTU")
   - Patterns (e.g., /rtu/i, /rooftop/i)
   - Icon emoji
4. Save and discover again
```

---

## Common Site Structures

### Standard BACnet Layout
```
Drivers/BacnetNetwork/
  ├── HP1/
  ├── HP2/
  ├── AHU1/
  └── ...
```
**Action:** Works automatically, no config needed

### Floor-Based Layout
```
Equipment/
  ├── Floor1/
  │   ├── HP1/
  │   └── AHU1/
  ├── Floor2/
  │   ├── HP2/
  │   └── AHU2/
  └── ...
```
**Action:** 
1. Add "Equipment" to base paths
2. System automatically recognizes Floor folders

### Zone-Based Layout
```
Drivers/
  ├── ZoneA/
  │   └── Devices...
  ├── ZoneB/
  │   └── Devices...
  └── ...
```
**Action:**
1. Add "Drivers" to base paths
2. Zone folders auto-detected

---

## Troubleshooting

### Problem: "No devices found"
**Solution:**
1. Open browser console (F12)
2. Look for error messages
3. Check if base path exists in your station
4. Try adding different base paths in Site Config

### Problem: "Devices found but no zones"
**Solution:**
1. Check if devices have Location points
2. Try increasing scan depth
3. Devices might use folder-based zones (auto-detected)

### Problem: "Missing specific device types"
**Solution:**
1. Open console and search for device names
2. See if they're being discovered but not categorized
3. Add custom pattern in Site Config
4. Example: If you have "RTU" devices, add pattern: `/rtu/i`

### Problem: "Some ExFans or Heaters missing"
**Solution:**
1. They should be auto-detected now with new BQL query
2. If still missing, check if displayName contains "ExF" or "Heater"
3. Add custom pattern if naming is different

---

## Console Commands (For Advanced Users)

### Check What Was Detected
```javascript
console.log(CONFIG);  // Current configuration
console.log(dashboardConfig.siteConfig);  // Detected settings
```

### Force Re-Detection
```javascript
delete dashboardConfig.siteConfig;
localStorage.removeItem('dashboard_config');
// Then click Refresh Discovery
```

### View All Discovered Devices
```javascript
console.log(dashboardConfig.global.snapshot);
```

### Check Device Type Patterns
```javascript
console.log(CONFIG.deviceTypePatterns);
```

---

## Best Practices

### ✅ DO:
- Run discovery after any changes
- Check console for diagnostic info
- Save configuration after customizing
- Use Site Config UI (don't edit code)

### ❌ DON'T:
- Don't edit LivePoints.html directly
- Don't skip the discovery step
- Don't use excessive scan depth (slows down)
- Don't add duplicate patterns

---

## Quick Reference

### Buttons
- **🔧 Site Config** - Configure site-specific settings
- **✏️ Edit Rules** - Edit device type rules
- **⚙️ Sync Options** - Sync settings
- **🔄 Refresh Discovery** - Scan station for devices
- **🎓 Tutorial** - Feature walkthrough

### Icons
- 🌀 Exhaust Fans
- 🔥 Heaters
- 💧 Water Sensors
- ❄️ Chilled Water
- ⚡ Generators
- 🔋 Chargers/Batteries
- 🏢 Cooling Towers
- 🔄 Pumps/Heat Pumps
- 🌬️ AHUs
- 💨 MAUs
- 📦 VAVs
- 🎐 FCUs

### Status Colors
- 🟢 Green - OK/Normal
- 🔴 Red - Alarm
- 🟡 Yellow - Fault
- ⚫ Gray - Offline/Stale

---

## Support

### Getting Help
1. Check console logs (F12)
2. Review "Auto-Detected Info" in Site Config
3. Verify base path is correct
4. Try default configuration (Reset button)
5. Document:
   - Your folder structure
   - Device naming convention
   - What's missing
   - Console errors

### Reporting Issues
Include:
- Station structure screenshot
- Console log output
- Site Config settings
- What you expected vs. what happened

---

## Tips for Success

1. **Start Simple**
   - Use auto-detection first
   - Only customize if needed

2. **Be Patient**
   - Initial discovery takes time
   - Let it complete fully

3. **Use Patterns Wisely**
   - Start with broad patterns
   - Refine if needed
   - Test after each change

4. **Save Your Work**
   - Click Save after configuration changes
   - Configurations persist

5. **Check Console**
   - Best source of diagnostic info
   - Shows exactly what's happening
   - Helps troubleshoot issues

---

*This dashboard adapts to YOUR site structure automatically!*

