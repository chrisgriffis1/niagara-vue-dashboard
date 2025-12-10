# Feature Roadmap - Future Enhancements

**Status:** Ideas & Planning  
**Priority:** Post Phase 1 Polish

---

## 🎯 High Priority Features

### 1. History Chart in Equipment Card
**Description:** Mini chart preview directly in equipment card  
**Use Case:** Quick glance at trends without opening full chart  
**Implementation:**
- Sparkline or mini line chart (100px height)
- Last 1 hour of data by default
- Click to expand to full chart
- Show in collapsed/expanded state toggle

**Component:** `EquipmentCard.vue` (add MiniChart.vue)  
**Estimated:** 2-3 hours

---

### 2. Save/Load History Configurations
**Description:** Save chart setups, point selections, time ranges  
**Use Case:** Common troubleshooting scenarios (VAV startup, chiller lockout)  
**Features:**
- Named configurations ("VAV Startup Check", "Chiller Troubleshoot")
- Per-user or shared templates
- Quick load from dropdown
- Default view per equipment type

**Component:** New `HistoryTemplates.vue`  
**Storage:** LocalStorage (Phase 1) → Database (Phase 2)  
**Estimated:** 4-6 hours

---

### 3. User Permissions & Views
**Description:** Role-based access and customization  
**Roles:**
- **Read-Only:** View only, no edits
- **Technician:** Personal saves, no sharing
- **Lead Tech:** Create shared templates
- **Admin:** Full access, user management

**Features:**
- Personal dashboards
- Shared templates
- Default views by role
- Permission checking

**Component:** New `UserSettings.vue`  
**Backend Required:** Yes (Phase 2)  
**Estimated:** 8-12 hours

---

### 4. Context-Aware Floating Action Button (FAB)
**Description:** Smart bottom-right button with contextual actions  
**Location:** Follows scroll, always visible  
**Actions (Context-Aware):**
- 📊 Summon History (from any point)
- ↩️ Undo/Redo (for filter/view changes)
- 🔼 Jump to Last Section (equipment/alarm/chart)
- 🔖 Quick Save (current view)
- 🎯 Smart Suggestions (based on context)

**Component:** New `FloatingActionMenu.vue`  
**Estimated:** 3-4 hours

---

### 5. Editable Graphics
**Description:** Visual building layouts, equipment diagrams  
**Features:**
- Upload floor plans
- Drag-drop equipment icons
- Click to navigate to equipment
- Hot spots for quick access
- Edit mode (admin only)

**Component:** New `GraphicsEditor.vue`  
**Technology:** Canvas or SVG-based  
**Estimated:** 12-20 hours (complex feature)

---

## 🔧 Medium Priority Features

### 6. Undo/Redo System
**Description:** Track filter/view changes  
**Stack:**
- Filter history
- Chart configuration changes
- Navigation history
- Time range changes

**Implementation:** State history stack  
**Estimated:** 2-3 hours

---

### 7. Quick Jump Navigation
**Description:** Remember last viewed sections  
**Features:**
- Jump to last equipment viewed
- Jump to last alarm clicked
- Jump to last chart
- Breadcrumb trail

**Component:** NavigationHistory service  
**Estimated:** 2 hours

---

### 8. Smart History Suggestions
**Description:** Context-based point recommendations  
**Examples:**
- VAV alarm → Suggest: Supply Temp, OA Temp, Damper Position
- Chiller alarm → Suggest: CHW Temp, Condenser, Flow
- AHU alarm → Suggest: Fan Speed, Static Pressure, Filter Status

**Logic:** Equipment-type based rules engine  
**Component:** `SmartSuggestions.vue`  
**Estimated:** 6-8 hours

---

## 📊 Chart Enhancements (Already Planned)

### Time Range Selector
- 15 seconds before/after
- 1 hour, 24 hours
- Today, Yesterday
- This week, Last week
- Custom date/time picker
- Slider for scrubbing

**Status:** Phase 2 (Next)  
**Estimated:** 3-4 hours

---

### Multi-Point Selection
- Select multiple points
- All points from device
- All points of type
- Color-coded lines
- Legend management

**Status:** Phase 2 (Next)  
**Estimated:** 4-5 hours

---

### View Options
- Line chart (current)
- Bar chart
- Combined bar+line
- Table view
- Export to CSV

**Status:** Phase 2 (Next)  
**Estimated:** 4-5 hours

---

## 🏗️ Architecture Considerations

### Data Flexibility (CRITICAL)
**Question:** Will this work with different Niagara data structures?  
**Answer:** YES - Adapter pattern handles this!

**Strategy:**
```javascript
// Different sources, same interface
MockDataAdapter → Universal Format
NiagaraBQLAdapter → Universal Format
OtherSystemAdapter → Universal Format
  ↓
Components see consistent structure
```

**Flexibility Points:**
1. Equipment names: VAV, MAU, Door, Sensor, etc. ✅
2. Locations: Floor, Wing, Zone, Room, etc. ✅
3. Point types: Any type works ✅
4. Tags: n:device, h:displayName, etc. (adapter translates)
5. History formats: Adapter normalizes to standard format

**Key:** All translation happens in **adapter layer only**

---

### Search Flexibility
**Current:** Exact match ("floor 1")  
**Needed:** Fuzzy match ("floor1", "flr1", "f1")  
**Fix:** Add string normalization  
**Status:** Fixing now! ✅

---

## 💾 Data Persistence Strategy

### Phase 1 (Current)
- LocalStorage for user preferences
- No backend required
- Single-user focused

### Phase 2 (Niagara Integration)
- Niagara station stores configurations
- User settings in station
- Multi-user support

### Phase 3 (Enterprise)
- Separate database
- Cloud sync
- Multi-site support

---

## 🎯 Implementation Priority

### Immediate (Bug Fixes)
1. ✅ Fix dashboard scroll issues
2. ✅ Fix fuzzy search ("floor1" should work)
3. ✅ Make dashboard collapsible

### Phase 2 (Chart Enhancements) - Next Up
1. Time range selector
2. Multi-point selection  
3. View options (table, bar)

### Phase 3 (Power User Features)
1. Context-aware FAB
2. Save/load configurations
3. Mini-charts in cards
4. Smart suggestions

### Phase 4 (Advanced)
1. Editable graphics
2. User permissions
3. Undo/redo system
4. Shared templates

---

## 📝 Notes

### Maintainability
- Keep components under 300 lines
- Use composition pattern (split complex features)
- Each feature = separate component
- Clean, focused responsibilities

### Real-World Readiness
- Adapter pattern handles ANY data source
- Search works with any naming convention
- Flexible filtering for any location scheme
- Point types: unlimited support

---

**Status:** Roadmap complete! Now fixing immediate bugs... 🔧

