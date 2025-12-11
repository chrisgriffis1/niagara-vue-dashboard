# 🏢 Niagara Vue Dashboard - Project Status & Usage Guide

**Last Updated:** December 11, 2025  
**Current Branch:** `real-data-integration`  
**Status:** ✅ Production Ready with Real Niagara Data

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Current Features](#current-features)
3. [Data Integration](#data-integration)
4. [How to Use](#how-to-use)
5. [Known Issues](#known-issues)
6. [Architecture](#architecture)
7. [Development Rules](#development-rules)
8. [Getting Started](#getting-started)

---

## 🎯 Project Overview

A modern, Tesla-inspired building automation dashboard built with Vue 3, Pinia, and Chart.js. Designed for field technicians to monitor and manage Niagara building automation systems.

### Tech Stack
- **Frontend:** Vue 3 (Composition API)
- **State Management:** Pinia
- **Charts:** Chart.js
- **Build Tool:** Vite
- **Styling:** CSS Variables (Dark Theme)

---

## ✨ Current Features

### 1. **Equipment Management**
- ✅ Display 83 real equipment devices
- ✅ Equipment cards with status indicators
- ✅ Point counts per equipment
- ✅ Equipment type filtering (AHU, MAU, Heat Pump, Controller, Plant)
- ✅ Location filtering (extracted from equipment names)
- ✅ Search functionality (by name, type, location)

### 2. **Data Points**
- ✅ 3,278 real Niagara data points
- ✅ Point values with units
- ✅ Point types (Numeric, Boolean, Enum, String)
- ✅ Point categories (status, control, etc.)
- ✅ Trendable flag detection

### 3. **Sparklines/Mini Charts**
- ✅ Mini trend charts in equipment cards
- ✅ Shows last hour of data
- ✅ Point selector tabs for switching between points
- ✅ "View Trend" button to open full trending panel
- ⚠️ **Issue:** Parameter mismatch between EquipmentCard and adapter (see Known Issues)

### 4. **Advanced Trending Panel**
- ✅ Full-screen trending modal
- ✅ Chart view and Table view modes
- ✅ Time range selector
- ✅ Point selector with search
- ✅ Smart suggestions for related points
- ✅ Multiple points on one chart
- ✅ Advanced Settings drawer (collapsible)
- ✅ Export functionality

### 5. **Alarms**
- ✅ Alarm list display
- ✅ Alarm filtering by priority (Critical, High, Medium, Low)
- ✅ Equipment-alarm association
- ✅ Alarm acknowledgment
- ✅ Real data shows "All Clear" (no fake alarms)

### 6. **Dashboard Summary**
- ✅ Building health score
- ✅ Active alarm counts
- ✅ Equipment statistics
- ✅ Quick action buttons

---

## 📊 Data Integration

### Real Niagara Data

**File:** `mock-data/site-profile-1765432578295.json`

**Structure:**
```json
{
  "metadata": {...},
  "data": {
    "equipment": [83 items],
    "points": [3,278 items]
  },
  "summary": {
    "equipmentCount": 83,
    "pointCount": 3278
  }
}
```

**Equipment Format:**
```json
{
  "name": "HP21 300 Link Hall",
  "slotPath": "slot:/Drivers/BacnetNetwork/HP21",
  "type": "honeywellTCThermostatWizard:TC300",
  "tags": "..."
}
```

**Point Format:**
```json
{
  "curVal": "72.5 {ok}",
  "trendable": "true",
  "equipmentPath": "slot:/Drivers/BacnetNetwork/MTIII_AHU_2284",
  "name": "SupplyTemp",
  "slotPath": "slot:/...",
  "type": "control:NumericPoint",
  "category": "status"
}
```

### MockDataAdapter

**Location:** `src/adapters/MockDataAdapter.js`

**Key Features:**
- ✅ Dual dataset support (demo + real)
- ✅ Smart equipment type inference (AHU, MAU, Heat Pump, etc.)
- ✅ Location extraction from equipment names
- ✅ Point value parsing (`curVal` format)
- ✅ Equipment-point mapping via `equipmentPath`
- ✅ Automatic fallback to demo data if real data fails

**Dataset Switching:**
```javascript
await adapter.switchDataset('real')  // Load real data
await adapter.switchDataset('demo')  // Load demo data
```

---

## 🚀 How to Use

### Starting the Dashboard

```bash
npm install
npm run dev
```

Open: `http://localhost:5173/`

### Using Equipment Cards

1. **View Equipment:** Click "Open Building View" from main page
2. **Expand Points:** Click the ▶ button on any equipment card
3. **View Mini Chart:** Mini sparkline appears when points are expanded
4. **Switch Points:** Click point type tabs above mini chart
5. **Open Full Trend:** Click "📊 View Trend" button

### Using Trending Panel

1. **Open:** Click any point in equipment card OR click "View Trend" in mini chart
2. **Add Points:** Use Advanced Settings → Point Selector
3. **Change Time Range:** Use Advanced Settings → Time Range Selector
4. **View Suggestions:** Smart Suggestions appear in Advanced Settings
5. **Switch Views:** Toggle between Chart View and Table View
6. **Full Screen:** Click fullscreen button (hides Advanced Settings)

### Filtering Equipment

1. **By Type:** Click filter chips (AHU, MAU, Heat Pump, etc.)
2. **By Location:** Click location filter chips
3. **By Alarm:** Click alarm status filters
4. **Search:** Type in search box (searches name, type, location)
5. **Clear:** Click "✕ Clear All Filters"

---

## ⚠️ Known Issues

### 1. **Mini Chart Data Loading Issue**

**Problem:** EquipmentCard calls `getHistoricalData()` with wrong parameters

**Location:** 
- `src/components/equipment/EquipmentCard.vue` line 260
- `src/adapters/MockDataAdapter.js` line 585

**Current Code:**
```javascript
// EquipmentCard.vue (WRONG)
miniChartData.value = await adapter.getHistoricalData(point.id, oneHourAgo, now)

// MockDataAdapter.js (EXPECTS)
async getHistoricalData(pointId, timeRange = {})
```

**Fix Needed:**
```javascript
// Should be:
miniChartData.value = await adapter.getHistoricalData(point.id, {
  start: oneHourAgo,
  end: now
})
```

**Impact:** Mini charts/sparklines may not load historical data correctly

**Status:** ⚠️ Needs Fix

---

### 2. **Point Type Filtering**

**Issue:** EquipmentCard filters trendable points by hardcoded types:
```javascript
['Temperature', 'Pressure', 'Flow', 'Speed', 'Power', 'Current', 'Voltage', 'Setpoint']
```

**Problem:** Real Niagara points use types like `control:NumericPoint`, not friendly names

**Impact:** May not find trendable points correctly

**Status:** ⚠️ May need adjustment

---

## 🏗️ Architecture

### Component Structure

```
src/
├── components/
│   ├── alarms/
│   │   └── AlarmList.vue          # Alarm display and filtering
│   ├── charts/
│   │   ├── MiniChart.vue          # Sparkline component
│   │   ├── PointChart.vue         # Full chart component
│   │   ├── TrendingPanel.vue     # Main trending modal
│   │   ├── TimeRangeSelector.vue  # Time range picker
│   │   ├── PointSelector.vue      # Point search/select
│   │   └── SmartSuggestions.vue   # AI-like point suggestions
│   ├── dashboard/
│   │   └── DashboardSummary.vue   # Building overview cards
│   └── equipment/
│       ├── EquipmentCard.vue      # Individual equipment card
│       └── EquipmentGrid.vue      # Grid layout with filters
├── stores/
│   ├── deviceStore.js             # Equipment/point state
│   └── alarmStore.js             # Alarm state
├── adapters/
│   ├── MockDataAdapter.js        # Data adapter (demo + real)
│   └── NiagaraBQLAdapter.js      # Future: Live BQL adapter
└── views/
    └── BuildingView.vue          # Main dashboard view
```

### Data Flow

```
MockDataAdapter
    ↓
deviceStore (Pinia)
    ↓
EquipmentGrid → EquipmentCard
    ↓
Points → MiniChart / TrendingPanel
```

---

## 📐 Development Rules

### 1. **Component Size Limit**
- Maximum 300 lines per component
- Split larger components into sub-components

### 2. **State Management**
- Use Pinia stores for shared state
- Local `ref()` for component-only state
- Don't mutate props directly

### 3. **Styling**
- Use CSS variables from `styles/variables.css`
- Dark theme only (Tesla-inspired)
- Responsive design required

### 4. **Data Access**
- Always use adapter through deviceStore
- Never access raw JSON files directly
- Handle loading/error states

### 5. **Naming Conventions**
- Components: PascalCase (`EquipmentCard.vue`)
- Files: camelCase (`deviceStore.js`)
- CSS classes: kebab-case (`.equipment-card`)

### 6. **Git Workflow**
- Create feature branches
- Commit frequently with clear messages
- Test before merging to main

---

## 🎯 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repo-url>
cd niagara-vue-dashboard

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Loading Real Data

The dashboard automatically loads real Niagara data on startup (configured in `src/stores/deviceStore.js` and `src/App.vue`).

To switch datasets manually:
```javascript
// In browser console
const deviceStore = useDeviceStore()
await deviceStore.adapter.switchDataset('real')
await deviceStore.loadDevices()
```

### File Locations

- **Real Data:** `mock-data/site-profile-1765432578295.json`
- **Demo Data:** `mock-data/demo-site-profile.json.json`
- **Adapter:** `src/adapters/MockDataAdapter.js`
- **Main View:** `src/views/BuildingView.vue`

---

## 🔄 Current Status

### ✅ Completed
- Real Niagara data integration
- Equipment type inference (customer-friendly names)
- Location extraction from equipment names
- Point value parsing (`curVal` format)
- Equipment-point mapping
- Filtering and search
- Dashboard summary
- Alarm system (ready for real alarms)
- Advanced trending panel UI
- Mini chart component

### ⚠️ Needs Fix
- Mini chart data loading (parameter mismatch)
- Point type filtering for trendable points

### 🚧 Future Enhancements
- Live BQL adapter integration
- Real alarm data from Niagara
- Historical data from actual Niagara histories
- User preferences/settings
- Export reports
- Mobile optimization

---

## 📝 Notes

### Equipment Type Mapping

The adapter intelligently maps Niagara technical types to customer-friendly names:

| Niagara Type | Customer-Friendly Name |
|-------------|----------------------|
| `honeywellTCThermostatWizard:TC300` (HP##) | Heat Pump |
| `bacnet:BacnetDevice` (AHU##) | AHU |
| `honIrmConfig:IrmBacnetDevice` (MAU##) | MAU |
| `honIrmConfig:IrmBacnetDevice` (TowerPlant) | Plant |
| System infrastructure | Hidden (System Infrastructure) |

### Location Extraction

Locations are extracted from equipment names:
- `HP21 300 Link Hall` → Location: "300 Link Hall"
- `HP14` → Location: "Unassigned"

---

## 🐛 Debugging

### Check Data Loading
```javascript
// Browser console
const deviceStore = useDeviceStore()
console.log('Equipment:', deviceStore.devices.length)
console.log('Stats:', deviceStore.buildingStats)
```

### Check Adapter State
```javascript
const adapter = deviceStore.getAdapter()
console.log('Current dataset:', adapter.getCurrentDataset())
console.log('Initialized:', adapter.initialized)
```

### View Points for Equipment
```javascript
const points = await deviceStore.loadDevicePoints('equipment-id')
console.table(points)
```

---

## 📞 Support

For issues or questions:
1. Check browser console (F12) for errors
2. Verify data file exists: `mock-data/site-profile-1765432578295.json`
3. Check Network tab for failed requests
4. Review this documentation

---

**Last Updated:** December 11, 2025  
**Version:** 1.0.0 (Real Data Integration)

