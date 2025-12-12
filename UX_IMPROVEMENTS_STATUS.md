# 🎯 User Experience Improvements - Status Report

## Based on Real User Feedback

After watching your customer and coworker use the dashboard, here are the identified issues and their solutions:

---

## ✅ COMPLETED

### 1. **Fixed Confusing Card Details Modal** ✅
**Problem:** The "📋 Details" button on cards showed a confusing list of 190+ duplicate history points that made no sense to users.

**Solution Implemented:**
- **Removed** the overwhelming list of individual history buttons
- **Added** clean, organized sections:
  - Summary section with status counts (OK, Alarms, Faults, etc.)
  - Quick Actions (Add All to History, Export Data)
  - PX Views organized by device (collapsible, clean layout)
  - Device list table with quick view buttons
  - All in scrollable, well-organized panels

**New Features:**
- 📊 "Add All to History" button - adds up to 10 devices at once
- 📥 "Export Data" button - downloads CSV of all devices
- 👁️ View button for each device - shows properties and PX views
- Clean status icons (✓, 🔔, ⚠️, ⚫, ⏱️)
- Sticky table headers for easy scrolling

**User Benefit:** Clear, actionable information instead of confusion

---

## 🚧 IN PROGRESS / PLANNED

### 2. **Load Default Dashboard on Startup**
**Problem:** User has to manually select their dashboard each time

**Solution Plan:**
- Add "Set as Default" button to dashboard selector
- Save preference in `localStorage`
- Auto-load on page init
- Show notification "Loading your default dashboard..."

**Implementation:** ~20 lines of code

---

### 3. **Fix Undo for PX Page Resizing**
**Problem:** When resizing PX view from big to small, undo doesn't restore it

**Solution Plan:**
- Track PX modal size changes in undo stack
- Store: `{type: 'pxResize', cardId, oldSize, newSize}`
- Undo restores previous size
- Works with Ctrl+Z

**Implementation:** Modify undo tracking in PX modal resize handler

---

### 4. **Fix PX Page Refresh Bug**
**Problem:** When refreshing page with PX view open, it becomes a property sheet

**Solution Plan:**
- Save PX modal state to `sessionStorage` (not localStorage - only for current session)
- On page load, check if PX was open
- Restore proper PX view (not property sheet)
- Or: Clear PX state on unload (simpler)

**Implementation:** Add beforeunload handler to clear transient state

---

### 5 & 6. **Fix PX Buttons on Cards**
**Problem:** PX buttons don't work on Heat Pumps, AHUs, and other device/zone cards

**Root Cause:** Likely:
- Wrong ORD format being passed
- View name not matching
- Missing error handling

**Solution Plan:**
- Add console logging to PX button clicks
- Verify ORD format (`station:|slot:/...`)
- Check if device actually has views
- Add fallback: if no views, show property sheet
- Add error messages to user

**Implementation:** Debug PX button onclick handlers, add error handling

---

### 7. **Global Keyboard Shortcuts**
**Problem:** Shortcuts only work after clicking FAB button first

**Solution Plan:**
- Move keyboard listener to `document` level (not FAB)
- Always listen for shortcuts
- Shortcuts work anywhere on page
- Don't interfere with input fields (check `event.target.tagName`)

**Implementation:** ~10 lines - move listener registration

---

### 8. **Customizable Keyboard Shortcuts**
**Problem:** Users can't change shortcuts to their preference

**Solution Plan:**
- Add "⌨️ Keyboard Shortcuts" button in settings
- Modal showing all shortcuts with edit buttons
- Click to record new key combination
- Save to localStorage
- Apply on next action

**UI Mock:**
```
Current Shortcuts:
D - Discovery      [Change] [Reset]
H - History        [Change] [Reset]
A - Alarms         [Change] [Reset]
...
```

**Implementation:** ~100 lines - settings UI + key capture logic

---

### 9. **Preload Alarms with Auto-Refresh**
**Problem:** Alarm page loads slow when clicking, even though they work fine

**Solution Plan:**
- On idle (after discovery complete), preload alarm data
- Use `requestIdleCallback()` or `setTimeout()` with low priority
- Cache alarm data
- Auto-refresh every 30s (configurable)
- Show "Last updated: X seconds ago"
- Instant display when user clicks Alarms tab

**Implementation:**
```javascript
// After discovery, wait 5s then preload
setTimeout(function() {
  if (window.requestIdleCallback) {
    requestIdleCallback(preloadAlarms);
  } else {
    setTimeout(preloadAlarms, 1000);
  }
}, 5000);

function preloadAlarms() {
  // Load alarm data
  // Cache it
  // Set up auto-refresh interval
}
```

---

### 10. **Fix Dual Grab Handles on PX Modal**
**Problem:** Two different grab handles, one creates black solid area

**Solution Plan:**
- Find both drag handles in PX modal code
- Remove the broken one (creates black area)
- Keep the working one
- Style consistently
- Test drag behavior

**Likely Cause:** Conflicting drag libraries or duplicate titlebar

**Implementation:** CSS fix + remove duplicate element

---

### 11. **Better Alarm Color Differentiation**
**Problem:** Acknowledged vs unacknowledged alarms hard to distinguish

**Current:** Probably all same red color

**Solution:**
```
Unacknowledged: Bright Red (#F44336) + Pulsing animation
Acknowledged:   Dim Orange (#FF9800) + No animation
Returned:       Gray (#9E9E9E) + Strikethrough
```

**Visual Indicators:**
- 🔴 Unacked (pulsing red)
- 🟠 Acked (orange, static)
- ⚫ Returned (gray, strikethrough)

**Implementation:** CSS classes + status check

---

### 12. **Add Acknowledge Buttons**
**Problem:** No way to acknowledge alarms from dashboard

**Solution Plan:**
- Add "✓ Ack" button on each alarm row
- Add "✓ Ack All Visible" button at top
- Confirm before acking multiple
- Use baja API: `alarm.acknowledge()`
- Refresh alarm list after ack
- Show success message

**API Usage:**
```javascript
const alarm = await baja.Ord.make(alarmOrd).get();
await alarm.acknowledge();
```

**Implementation:** ~50 lines - button handlers + API calls

---

### 13. **Fullscreen Toggle for PX Graphics**
**Problem:** PX graphics stuck in modal, can't go fullscreen

**Solution Plan:**
- Add "⛶ Fullscreen" button to PX modal header
- Click to expand to fullscreen mode
- ESC or click "Exit Fullscreen" to return
- Use CSS fullscreen classes (not browser fullscreen API)
- Remember size preference

**UI:**
```
[PX View Header]  [⛶ Fullscreen] [✕ Close]
```

**Implementation:**
```javascript
function togglePxFullscreen(cardId) {
  const modal = document.getElementById('pxModal_' + cardId);
  if (modal.classList.contains('fullscreen')) {
    modal.classList.remove('fullscreen');
  } else {
    modal.classList.add('fullscreen');
  }
}
```

**CSS:**
```css
.fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 99999 !important;
}
```

---

## Priority Ranking (Based on User Impact)

### High Priority (Do First)
1. ✅ **Card Details Modal** - DONE!
2. **Fix PX Buttons (5&6)** - Most confusing for users
3. **Global Keyboard Shortcuts (7)** - Quick fix, big impact
4. **Alarm Colors & Ack Buttons (11&12)** - Critical for operators

### Medium Priority
5. **Load Default Dashboard (2)** - Nice quality of life
6. **Fullscreen PX (13)** - Improves workflow
7. **Preload Alarms (9)** - Performance improvement

### Low Priority (Nice to Have)
8. **Customizable Shortcuts (8)** - Power user feature
9. **Fix Undo for PX Resize (3)** - Edge case
10. **Fix PX Refresh Bug (4)** - Rare occurrence
11. **Fix Dual Handles (10)** - Visual polish

---

## Estimated Time to Complete

- **High Priority (2,5,6,7,11,12):** 4-6 hours
- **Medium Priority (2,9,13):** 2-3 hours  
- **Low Priority (3,4,8,10):** 2-3 hours

**Total:** ~10 hours of focused development

---

## Next Steps

1. Test the new Card Details modal with your customer
2. Prioritize which features to implement next
3. I can continue with the high-priority items
4. Each can be done incrementally

---

## What Changed in Card Details Modal

### Before:
```
Card Details: Ahu
Total Devices/Points: 7
Points with History (190):
[Airflow Switch] [ChargeLossPrb] [ClgCapacity] [ClgStatus] 
[ControlTemp] [DAClgSetpt] [DACMWUSpt] [DAHtgSetpt] ...
(190 confusing buttons in a huge unorganized list)
```

### After:
```
Card Details: Ahu

[Summary Section]
Total Devices: 7
✓ OK: 6  🔔 Alarms: 1

[Quick Actions]
📊 Add All to History  📥 Export Data

[Available PX Views]
▼ AHU3 (3 views)
  🖼️ Default  🖼️ Schematic  🖼️ Trends
▼ AHU1 (2 views)
  🖼️ Default  🖼️ Schematic

[Device/Point List]
Device/Point     | Value  | Status | Actions
AHU3            | N/A    | ✓      | 👁️ View
AHU1            | N/A    | ✓      | 👁️ View
...
```

Much cleaner and actionable!

---

*Let me know which items you'd like me to tackle next!*

