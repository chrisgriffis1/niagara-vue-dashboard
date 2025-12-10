# Niagara Vue Dashboard - Master Plan (READ-ONLY)

**IMPORTANT:** This document is the master reference. AI should read for context but NEVER modify it.

## Project Vision

Tesla-inspired building automation dashboard for Niagara systems. Mobile-first interface for 20-30 field technicians. Professional, clean, dark theme with ambient intelligence.

## Core Architecture

### Technology Stack
- **Vue.js 3** with Composition API
- **Vite** for development and building
- **Chart.js** for trending/analytics
- **Pinia** for state management
- **CSS Variables** for theming (no UI library initially - build custom)

### Data Abstraction Layer

**Universal adapter interface** - write once, deploy anywhere:
```javascript
interface BuildingDataAdapter {
  discoverDevices(): Promise
  getPointValue(pointId: string): Promise
  getHistoricalData(pointId: string, timeRange: TimeRange): Promise
  subscribeToAlarms(callback: Function): UnsubscribeFunction
}
```

**Implementations:**
- `MockDataAdapter` - uses exported JSON for local development
- `NiagaraBQLAdapter` - for actual JACE deployment (later)

### Component Architecture

**Strict isolation rules:**
- Maximum 300 lines per component
- Components communicate via events, not direct calls
- Each component is self-contained
- Layout templates are separate from data logic

**Key Components:**
1. `EquipmentCard.vue` - displays equipment with clickable points
2. `PointChart.vue` - instant Chart.js trending
3. `AlarmList.vue` - active alarms with priority
4. `BuildingView.vue` - main dashboard layout

## UX Design Principles (Tesla-Inspired)

### Visual Hierarchy
- **Dark theme** - sophisticated, easy on eyes in field
- **Essential info always visible** - building health, active alarms
- **Progressive disclosure** - tap for details
- **Clean typography** - clear font sizes, high contrast

### Mobile-First Design
- **44px minimum touch targets** - works with gloves
- **Thumb-friendly navigation** - important controls within reach
- **Sub-2-second loads** on 4G
- **Swipe gestures** for navigation

### Equipment Visualization
- **Interactive equipment graphics** (future)
- **Clickable point lists** below equipment name
- **Instant Chart.js trending** - click any point, chart appears
- **Multi-point comparison** - add multiple trends to same chart
- **Visual status indicators** - green/red dots

## Development Workflow

### Phase 1: Local Development (Current)
1. Set up Vue.js + Vite
2. Create MockDataAdapter using demo-site-profile.json
3. Build basic EquipmentCard component
4. Implement Chart.js trending
5. Add dark theme styling
6. Make responsive for mobile

### Phase 2: Niagara Integration (Later)
1. Create NiagaraBQLAdapter
2. Test on actual JACE
3. Package as Niagara module
4. Deploy to test sites

### AI Development Rules (CRITICAL)

**One Feature Per Session:**
- Never ask AI for multiple features at once
- Test completely before moving to next feature
- Commit after each working feature

**File Size Limits:**
- Maximum 300 lines per Vue component
- Break into smaller components if needed

**Version Control:**
- Commit after every working feature
- Never accumulate technical debt

**AI Context Management:**
- Give AI only the specific files it needs
- No mass refactoring - build clean from start
- If AI suggests cleanup, decline and build properly instead

## File Structure
```
src/
  adapters/
    MockDataAdapter.js        - Loads JSON, provides data interface
    NiagaraBQLAdapter.js      - Future: real JACE integration
  components/
    equipment/
      EquipmentCard.vue       - Single equipment display
      EquipmentGrid.vue       - Grid of equipment cards
    charts/
      PointChart.vue          - Chart.js trending component
    alarms/
      AlarmList.vue           - Active alarms display
  views/
    BuildingView.vue          - Main dashboard view
  stores/
    deviceStore.js            - Pinia store for devices
    alarmStore.js             - Pinia store for alarms
  styles/
    variables.css             - CSS custom properties (colors, spacing)
    theme-dark.css            - Dark theme styles
  App.vue
  main.js
mock-data/
  demo-site-profile.json      - Exported from extraction tool
documentation/
  master-plan.md              - This file (READ-ONLY)
  implementation-progress.md  - What's been built (AI updates this)
```

## Success Criteria

**Phase 1 Complete When:**
- ✅ Equipment cards display with real mock data
- ✅ Clicking points shows instant Chart.js trends
- ✅ Dark theme looks professional
- ✅ Fully responsive on mobile (tested on phone)
- ✅ Sub-2-second load times
- ✅ All components under 300 lines

## Key Technical Decisions

**Vue.js over plain HTML:**
- Component isolation prevents cascade failures
- Enforces separation of concerns
- Better for AI development
- Template protection

**Mock Data First:**
- Prove architecture before Niagara complexity
- Faster iteration
- Better debugging

**No UI Library Initially:**
- Full control over design
- Lighter weight
- Learn Vue fundamentals
- Can add later if needed

**Chart.js over Recharts:**
- More lightweight
- Better for real-time updates
- Familiar from past projects