# Niagara Vue Dashboard

Tesla-inspired building automation dashboard for Niagara systems. Mobile-first interface for field technicians.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
src/
├── adapters/           # Data abstraction layer
│   ├── MockDataAdapter.js       # Local development with JSON
│   └── NiagaraBQLAdapter.js     # Future: JACE integration
├── components/         # Vue components (max 300 lines each)
│   ├── equipment/      # Equipment display components
│   ├── charts/         # Chart.js trending components
│   └── alarms/         # Alarm notification components
├── views/              # Main view components
│   └── BuildingView.vue
├── stores/             # Pinia state management
│   ├── deviceStore.js
│   └── alarmStore.js
├── styles/             # Global styles and theme
│   ├── variables.css   # CSS custom properties
│   └── theme-dark.css  # Dark theme styling
├── App.vue             # Application entry point
└── main.js             # Vue app initialization
```

## 🎨 Technology Stack

- **Vue.js 3** - Composition API
- **Vite** - Build tool and dev server
- **Pinia** - State management
- **Chart.js** - Data visualization and trending
- **CSS Variables** - Custom dark theme

## 🏗️ Architecture

### Universal Data Adapter
All data access goes through adapter interface - swap between mock data and real Niagara systems without changing components.

### Component Isolation
- Maximum 300 lines per component
- Event-based communication
- Self-contained components
- Strict separation of concerns

## 📱 Mobile-First Design

- 44px minimum touch targets (works with gloves)
- Thumb-friendly navigation
- Sub-2-second loads on 4G
- Professional dark theme

## 📖 Documentation

- `documentation/master-plan.md` - Complete project vision and architecture (READ-ONLY)
- `mock-data/demo-site-profile.json.json` - Sample Niagara data for development

## 🔧 Development Workflow

1. Build features one at a time
2. Test completely before moving on
3. Keep components under 300 lines
4. Use mock data for fast iteration
5. Commit after each working feature

## 🎯 Current Phase

**Phase 1: Local Development**
- ✅ Vue.js + Vite setup
- ✅ Dark theme configured
- ✅ Pinia state management
- ✅ Chart.js installed
- ✅ Basic component structure
- 🔄 MockDataAdapter implementation (next)
- ⏳ Equipment cards with real data
- ⏳ Point trending functionality

**Phase 2: Niagara Integration** (Future)
- Connect to actual JACE systems
- BQL query implementation
- WebSocket alarm subscriptions

## 📝 License

Proprietary - Internal use only
