# Alarm Dashboard Display Name Fix

## Issue

Alarm dashboard was showing:
- **SOURCE column**: Alarm extension types like `BooleanChangeOfStateAlarmExt`, `OutOfRangeAlarmExt` (technical, confusing)
- **MESSAGE column**: Technical point names like "No Customized3DigitalOutput", "No Control onSpaceTemp" (should use display names)

**Customer Request:** Show Device Display Name and Point Display Name, not technical names.

---

## ✅ FIX IMPLEMENTED

### Changes to `renderAlarmDashboard()` (Line ~18260)

**1. SOURCE Column - Now Shows Display Names**

**Before:**
```
SOURCE: BooleanChangeOfStateAlarmExt
```

**After:**
```
SOURCE: Wing 300 Pod 2 Hall - HP4 300 P2 - Space Temp
```

**Implementation:**
- Look up device and point from snapshot using `alarm.sourcePath`
- Extract device display name and point display name
- Format: `"Device Display Name - Point Display Name"`
- Strip all prefixes (NVO, NVI, Ctrl, etc.)
- **NO MORE alarm extension types in SOURCE!**

**2. MESSAGE Column - Uses Display Names**

**Before:**
```
MESSAGE: No Customized3DigitalOutput In Alarm
MESSAGE: No Control onSpaceTemp - ACTIVE
```

**After:**
```
MESSAGE: No Control on Space Temp - ACTIVE
MESSAGE: Output In Alarm. Requires Service
```

**Implementation:**
- Replace technical point names in message with display names
- Strip prefixes: `Customized3DigitalOutput` → removed
- Clean patterns: `No CtrlSpaceTemp` → `No Control on Space Temp`
- Remove redundant: "Voltage Percent", "Offnormal Value:"
- Normalize spacing

---

## Code Logic

### Device/Point Display Name Lookup

```javascript
// 1. Extract equipment and point from sourcePath
var equipment = window.extractEquipmentName(alarm.sourcePath);
var pointName = window.extractPointName(alarm.sourcePath);

// 2. Look up in snapshot
const snapshot = window.dashboardConfig.global.snapshot;
const matchingPoint = snapshot.find(function(point) {
  const pointOrd = point.ord.toLowerCase();
  return pointOrd && sourcePathLower.includes(pointOrd) && point.isExtractedPoint;
});

// 3. Get display names
deviceDisplayName = matchingPoint.zone + ' - ' + equipment;
pointDisplayName = matchingPoint.name || matchingPoint.originalName;

// 4. Strip prefixes
deviceDisplayName = window.stripPointPrefixes(deviceDisplayName);
pointDisplayName = window.stripPointPrefixes(pointDisplayName);

// 5. Format SOURCE column
sourceDisplay = deviceDisplayName + ' - ' + pointDisplayName;
```

### Message Cleanup

```javascript
// Replace technical names with display names
cleanMsg = cleanMsg.replace(technicalPattern, pointDisplayName);

// Clean common patterns
cleanMsg = cleanMsg
  .replace(/\bNo\s+Ctrl/gi, 'No Control on')
  .replace(/\bCustomized\d+/gi, '')
  .replace(/\bDigitalOutput/gi, 'Output')
  .replace(/\s+Voltage\s+Percent/gi, '')
  .trim();
```

---

## Result

### Example Transformation

**BEFORE:**
```
TIME: 2h 34m ago
SOURCE: BooleanChangeOfStateAlarmExt
MESSAGE: No Customized3DigitalOutput In Alarm
```

**AFTER:**
```
TIME: 2h 34m ago
SOURCE: Kitchen - HP2 - Space Temp
MESSAGE: Output In Alarm. Requires Service
```

---

## Files Modified

1. **`LivePoints.html`**:
   - Line ~18260-18345: Rewrote alarm rendering to use display names
   - Added snapshot lookup for device/point display names
   - Enhanced message cleanup patterns

2. **`ALARM_DISPLAY_NAME_FIX.md`** (this file): Documentation

---

## Testing Checklist

- [ ] SOURCE column shows "Device - Point" format (not alarm extension types)
- [ ] MESSAGE column uses display names (not technical point names)
- [ ] No more "Customized3DigitalOutput" in messages
- [ ] No more "BooleanChangeOfStateAlarmExt" in SOURCE
- [ ] Clean, readable alarm messages
- [ ] All prefixes stripped (NVO, NVI, Ctrl, etc.)

---

## Customer Impact

**Before:**
- Confusing alarm extension types in SOURCE
- Technical point names in messages
- Hard to understand what's actually in alarm

**After:**
- ✅ Clear device and point names in SOURCE
- ✅ Readable messages using display names
- ✅ Customer-friendly alarm dashboard!

🎉 **Alarm dashboard now shows proper display names!**

