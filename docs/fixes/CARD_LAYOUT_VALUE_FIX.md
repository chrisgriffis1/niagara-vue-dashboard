# Card Layout & Value Display Fix

## Critical Bugs Fixed

### Issue 1: Card Details Showing "—" Instead of Actual Values

**Problem:** Heat Pump card details showed "—" for all devices when they should show Space Temp values like "72.5°F"

**Root Cause:** The `devices` array contains **EQUIPMENT objects** (Heat Pumps), not individual **POINTS** (Space Temp, Supply Temp, etc.). Equipment don't have `outValue` - their child points do.

**Solution (Line ~19331):**

Changed the table rendering to:
1. For each device in the card, find its child points from the snapshot
2. Filter points where `point.ord.startsWith(device.ord)` and `isExtractedPoint === true`
3. Display each point with format: `"Device Name - Point Name"` (e.g., "HP47 - Space Temp")
4. Show the point's actual `outValue` (e.g., "72.5°F")

**Code Logic:**
```javascript
// For each device, show its important points from the snapshot
devices.forEach(function(dev) {
  const deviceOrd = dev.ord || dev.slotPath || '';
  const deviceName = dev.name || dev.originalName || 'Unknown';
  
  // Find all points in snapshot that belong to this device
  const devicePoints = snapshot.filter(function(point) {
    const pointOrd = (point.ord || point.slotPath || '').toString();
    const isExtracted = point.isExtractedPoint === true;
    // Point belongs to device if its ord starts with device ord
    return isExtracted && deviceOrd && pointOrd.startsWith(deviceOrd);
  });
  
  // Show each point with its value
  devicePoints.forEach(function(point) {
    const pointName = stripPointPrefixes(point.name);
    const fullName = deviceName + ' - ' + pointName;
    const value = point.outValue; // NOW SHOWS ACTUAL VALUE!
    // ... render row with value
  });
});
```

**Result:**
- ✅ Heat Pump cards now show: "A.DayCare North Wall - HP47 - Space Temp: 72.5°F"
- ✅ Each device expands to show ALL its points with live values
- ✅ No more "—" for everything

---

### Issue 2: Cards Shrunk and Left-Aligned

**Problem:** Cards were shrinking down and stacking on the left side instead of filling the screen in a 2-column grid.

**Root Cause:** **DOUBLE DIV CLOSING BUG** - Line 4593 had:
```javascript
html += '</div></div>';  // ❌ CLOSES TWO DIVS!
```

This closed:
1. The `typeCardsContainer` div
2. An **extra div that didn't exist**, causing HTML structure corruption

The corrupted HTML broke GridStack's layout engine, causing cards to collapse to minimum width and left-align.

**Solution (Line ~4593):**
```javascript
// BEFORE (broken):
html += '</div></div>';

// AFTER (fixed):
html += '</div>'; // Close typeCardsContainer
```

**Why This Broke Everything:**
- GridStack relies on proper div nesting for positioning
- The extra `</div>` closed a parent container prematurely
- Subsequent cards rendered outside their intended container
- CSS min-width constraints weren't applied to orphaned elements
- GridStack's 12-column grid system collapsed

**Result:**
- ✅ Cards now fill 50% width each (6 of 12 columns)
- ✅ Perfect 2-column grid layout
- ✅ No more left-side stacking
- ✅ GridStack positioning works correctly

---

## Testing Results

### Card Details Modal:
- ✅ Heat Pump cards show Space Temp, Supply Temp, etc. with actual values
- ✅ Cooling Tower cards show all sensor points with live data
- ✅ Zone cards show all devices and their points with values
- ✅ No more "—" spam

### Card Layout:
- ✅ Type cards (Heat Pumps, Boilers, etc.) in clean 2-column grid
- ✅ Zone cards in clean 2-column grid
- ✅ Cards fill screen width properly (50% each)
- ✅ No shrinking or left-alignment
- ✅ Drag and drop still works

---

## Files Modified

1. **`LivePoints.html`**:
   - Line ~19331: Rewrote device list rendering to show child points with values
   - Line ~4593: Fixed double div closing bug

2. **`CARD_LAYOUT_VALUE_FIX.md`** (this file): Documentation

---

## Summary

| Bug | Cause | Fix | Status |
|-----|-------|-----|--------|
| **Values showing "—"** | Showing equipment instead of points | Render child points from snapshot | ✅ FIXED |
| **Cards shrunk/left-aligned** | Double `</div>` closing | Remove extra `</div>` | ✅ FIXED |

**Customer Impact:**
- Card details are NOW USEFUL - shows actual point values!
- Dashboard layout is CLEAN - professional 2-column grid!
- No more confusion about what temperature each heat pump is reading!

🎉 **Both critical bugs resolved!**

