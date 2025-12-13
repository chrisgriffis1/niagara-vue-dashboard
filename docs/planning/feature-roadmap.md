# Feature Roadmap - Future Enhancements

**Status:** Trending Complete! ✅ Advanced features ready.  
**Last Updated:** Dec 10, 2025

---

## ✅ COMPLETED FEATURES

### ✨ Advanced Trending System (DONE)
**Implementation:** TrendingPanel, TimeRangeSelector, PointSelector, SmartSuggestions, TableView  
**Components:** 5 new components, PointChart enhanced, BuildingView integrated  
**Total Lines:** ~1,500 lines (all under 300 per file)

**Features:**
- ✅ 14 time ranges (15sec, 1min, 5min, 15min, 1h, 4h, 12h, 24h, Today, Yesterday, Week, LastWeek, Month, YTD)
- ✅ Custom date/time picker
- ✅ Alarm context ranges (±15sec to ±4hr)
- ✅ Multi-point selection with color coding (10 colors)
- ✅ Add all points from equipment
- ✅ Add all points by type across all equipment
- ✅ Smart suggestions for 6 equipment types (VAV, AHU, Chiller, Boiler, Pump, Fan)
- ✅ Chart view (single and multi-point)
- ✅ Table view with CSV export
- ✅ Search within points
- ✅ Expandable equipment groups
- ✅ Keyboard shortcuts (Esc to close)
- ✅ Loading and empty states
- ✅ Refresh and clear all actions

---

## 🎯 High Priority Features

### 1. History Chart in Equipment Card
**Description:** Mini chart preview directly in equipment card  
**Use Case:** Quick glance at trends without opening full chart  
**Implementation:**
- Sparkline or mini line chart (100px height)
- Last 1 hour of data by default
- Click to expand to full TrendingPanel
- Show in collapsed/expanded state toggle

**Component:** `EquipmentCard.vue` (add MiniChart.vue)  
**Estimated:** 2-3 hours

---

### 2. Save/Load Trending Configurations
**Description:** Save chart setups, point selections, time ranges  
**Use Case:** Common troubleshooting scenarios (VAV startup, chiller lockout)  
**Features:**
- Named configurations ("VAV Startup Check", "Chiller Troubleshoot")
- Per-user or shared templates
- Quick load from dropdown in TrendingPanel
- Default view per equipment type
- Remember last-used settings

**Component:** Extend TrendingPanel with HistoryTemplates service  
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
- 📊 Summon TrendingPanel (from any point, any context)
- ↩️ Undo/Redo (for filter/view changes)
- 🔼 Jump to Last Section (equipment/alarm/chart)
- 🔖 Quick Save (current view/trending config)
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
- Click to open TrendingPanel for equipment
- Hot spots for quick access
- Edit mode (admin only)

**Component:** New `GraphicsEditor.vue`  
**Technology:** Canvas or SVG-based  
**Estimated:** 12-20 hours (complex feature)

---

## 🔧 Medium Priority Features

### 6. Enhanced Chart Features
**Description:** Additional charting capabilities  
**Features:**
- ✅ Multi-point (DONE)
- ✅ Table view (DONE)
- ✅ CSV export (DONE)
- ⏳ Bar chart option
- ⏳ Combined bar+line chart
- ⏳ Time slider/scrubber (interactive time window)
- ⏳ Annotations for maintenance events
- ⏳ Automatic anomaly detection
- ⏳ Scheduled reports
- ⏳ Statistical overlays (min/max/avg)

**Component:** Extend TrendingPanel, PointChart  
**Estimated:** 6-10 hours

---

### 7. Undo/Redo System
**Description:** Track filter/view changes  
**Stack:**
- Filter history
- Chart configuration changes
- Navigation history
- Time range changes

**Implementation:** State history stack  
**Estimated:** 2-3 hours

---

### 8. Quick Jump Navigation
**Description:** Remember last viewed sections  
**Features:**
- Jump to last equipment viewed
- Jump to last alarm clicked
- Jump to last chart
- Breadcrumb trail

**Component:** NavigationHistory service  
**Estimated:** 2 hours

---

### 9. Alarm-Triggered Trending
**Description:** One-click trending from alarms  
**Features:**
- Click alarm → open TrendingPanel
- Automatic time range = alarm context (±15min default)
- Auto-load all points from alarmed equipment
- Smart suggestions for related system points
- Show alarm timestamp on chart

**Component:** Extend AlarmList, integrate TrendingPanel  
**Estimated:** 2-3 hours

---

## 🏗️ Architecture & Data Flexibility

### Data Adapter Strategy (READY)
**Status:** ✅ Already implemented and working!

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
4. Tags: n:device, h:displayName, etc. (adapter translates) ✅
5. History formats: Adapter normalizes to standard format ✅

**Key:** All translation happens in **adapter layer only**

**Trending System Compatibility:**
- Works with ANY point structure ✅
- Works with ANY equipment type ✅
- Works with ANY location scheme ✅
- Smart Suggestions adaptable per deployment ✅

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
- Trending configs stored per user

### Phase 3 (Enterprise)
- Separate database
- Cloud sync
- Multi-site support
- Centralized trending templates

---

## 🎯 Implementation Priority

### ✅ Phase 1 - Core Dashboard (COMPLETE)
1. ✅ Equipment cards and grid
2. ✅ Alarm system
3. ✅ Equipment filtering
4. ✅ Dashboard summary
5. ✅ Search and keyboard shortcuts

### ✅ Phase 2 - Advanced Trending (COMPLETE)
1. ✅ Time range selector (14 presets + custom)
2. ✅ Multi-point selection
3. ✅ Smart suggestions (6 equipment types)
4. ✅ Table view with CSV export
5. ✅ Alarm context ranges
6. ✅ Full-screen trending panel

### 📋 Phase 3 - Power User Features (NEXT)
1. Alarm-triggered trending (easy win, 2-3 hrs)
2. Save/load trending configurations (4-6 hrs)
3. Mini-charts in equipment cards (2-3 hrs)
4. Context-aware FAB (3-4 hrs)
5. Enhanced chart features (bar, annotations) (6-10 hrs)

### 🔮 Phase 4 - Advanced Features (FUTURE)
1. Editable graphics (12-20 hrs)
2. User permissions & roles (8-12 hrs)
3. Undo/redo system (2-3 hrs)
4. Shared templates & collaboration (6-8 hrs)
5. Scheduled reports (8-10 hrs)

---

## 📊 Current Statistics

**Files Created:** 50+  
**Total Lines:** ~8,000  
**Components:** 18  
**Stores:** 2 (Pinia)  
**Adapters:** 1 (MockDataAdapter, ready for NiagaraBQLAdapter)  
**Documentation:** 7 files  

**Trending System:**
- Components: 5 (TrendingPanel, TimeRangeSelector, PointSelector, SmartSuggestions, TableView)
- Updated: 2 (PointChart, BuildingView)
- Lines: ~1,500
- Equipment Types Supported: 6 (VAV, AHU, Chiller, Boiler, Pump, Fan)
- Time Ranges: 14 presets + custom
- Chart Colors: 10

---

## 📝 Notes

### Maintainability ✅
- All components under 300 lines ✅
- Composition pattern (split complex features) ✅
- Each feature = separate component ✅
- Clean, focused responsibilities ✅

### Real-World Readiness ✅
- Adapter pattern handles ANY data source ✅
- Search works with any naming convention ✅
- Flexible filtering for any location scheme ✅
- Point types: unlimited support ✅
- Trending: Equipment-agnostic ✅

### Testing Recommendations
1. Test multi-point with 10+ points
2. Test custom time ranges spanning months
3. Test CSV export with large datasets
4. Test smart suggestions with different naming conventions
5. Test alarm context ranges
6. Test table view scrolling with 1000+ rows

---

**Next Up:** Alarm-triggered trending (quick win!) or Save/Load configurations (high value) 🚀

