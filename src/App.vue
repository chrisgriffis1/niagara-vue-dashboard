<template>
  <div class="app-container">
    <!-- Debug: Always show this to verify Vue is mounting -->
    <div style="position: fixed; top: 0; left: 0; right: 0; background: #ef4444; color: white; padding: 10px; z-index: 9999; font-size: 12px;">
      🐛 DEBUG: Vue is mounting | dataLoaded: {{ dataLoaded }} | stats: {{ stats ? 'loaded' : 'null' }}
    </div>
    <header class="app-header">
      <div>
        <h1>Niagara Dashboard</h1>
        <div class="header-status">
          <span class="status-dot ok"></span>
          <span>System Online</span>
        </div>
      </div>
      <div class="persistence-controls">
        <button @click="saveCurrentLayout" :disabled="savingLayout">
          {{ savingLayout ? 'Saving…' : '💾 Save layout' }}
        </button>
        <button @click="restoreLayout" :disabled="loadingLayout">
          {{ loadingLayout ? 'Loading…' : '↻ Restore layout' }}
        </button>
        <span class="persistence-message">{{ persistenceMessage }}</span>
      </div>
    </header>

    <main class="app-main">
      <!-- Show BuildingView if active, otherwise show welcome -->
      <BuildingView v-if="showBuildingView" @back="showBuildingView = false" />
      
      <template v-else>
        <!-- Building Stats -->
        <div v-if="stats" class="stats-grid">
          <div class="stat-card card">
            <div class="stat-value">{{ stats.equipmentCount }}</div>
            <div class="stat-label">Equipment</div>
          </div>
          <div class="stat-card card">
            <div class="stat-value">{{ stats.pointCount }}</div>
            <div class="stat-label">Points</div>
          </div>
          <div class="stat-card card">
            <div class="stat-value">{{ stats.equipmentTypes?.length || 0 }}</div>
            <div class="stat-label">Types</div>
          </div>
          <div class="stat-card card">
            <div class="stat-value">{{ stats.locations?.length || 0 }}</div>
            <div class="stat-label">Locations</div>
          </div>
        </div>

        <!-- Status Info -->
        <div class="welcome-card card">
          <h2>Building Automation Dashboard</h2>
          <p>Tesla-inspired interface for field technicians</p>
          <div class="status-list">
            <p class="status-ok">✓ Vue 3 + Vite initialized</p>
            <p class="status-ok">✓ Dark theme configured</p>
            <p class="status-ok">✓ Pinia state management ready</p>
            <p class="status-ok">✓ Chart.js installed</p>
            <p :class="dataLoaded ? 'status-ok' : 'status-warning'">
              {{ dataLoaded ? '✓ Real Niagara data loaded' : '⏳ Loading data...' }}
            </p>
            <div v-if="!dataLoaded" style="margin-top: 20px; padding: 20px; background: #1a1a1a; border-radius: 8px;">
              <p style="color: #fbbf24;">Loading firstTryNeedsWork.json...</p>
              <p style="color: #a0a0a0; font-size: 12px; margin-top: 10px;">Check browser console (F12) for details</p>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div v-if="dataLoaded" class="actions">
            <button @click="showBuildingView = true" class="primary">
              Open Building View
            </button>
            <button @click="testAdapter">
              Test MockDataAdapter
            </button>
          </div>
        </div>

        <!-- Test Results -->
        <div v-if="testResults.length > 0" class="test-results card">
          <h3>Adapter Test Results</h3>
          <div v-for="(result, index) in testResults" :key="index" class="test-result">
            <span class="test-name">{{ result.name }}</span>
            <span :class="result.success ? 'status-ok' : 'status-error'">
              {{ result.success ? '✓ Pass' : '✗ Fail' }}
            </span>
            <div class="test-detail">{{ result.detail }}</div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import MockDataAdapter from './adapters/MockDataAdapter'
import NiagaraBQLAdapter from './adapters/NiagaraBQLAdapter'
import BuildingView from './views/BuildingView.vue'
import { useDeviceStore } from './stores/deviceStore'
import {
  cacheDashboardState,
  loadCachedDashboardState,
  saveStateToStation,
  loadStateFromStation
} from './services/persistenceService'

// Auto-detect Niagara environment and use appropriate adapter
// Check for window.baja (BajaScript) - also check URL scheme and RequireJS
const checkNiagara = () => {
  // Method 1: Direct baja check
  if (typeof window !== 'undefined' && 
      typeof window.baja !== 'undefined' && 
      window.baja && 
      window.baja.Ord) {
    return true
  }
  
  // Method 2: Check if we're accessing via ord?file: scheme (Niagara Workbench)
  if (typeof window !== 'undefined' && window.location) {
    const url = window.location.href || ''
    if (url.includes('ord?file:') || url.includes('ord/file:')) {
      console.log('🔍 Detected ord?file: scheme - assuming Niagara environment')
      return true
    }
  }
  
  // Method 3: Check for RequireJS (BajaScript loads via RequireJS)
  if (typeof window !== 'undefined' && 
      (typeof window.require !== 'undefined' || typeof window.requirejs !== 'undefined')) {
    console.log('🔍 Detected RequireJS - may be Niagara environment')
    // Try to get baja via RequireJS
    try {
      if (typeof window.require !== 'undefined') {
        // RequireJS might have baja available
        return true // Assume Niagara if RequireJS is present
      }
    } catch(e) {
      // RequireJS not ready yet
    }
  }
  
  return false
}

const deviceStore = useDeviceStore()
const stats = ref(null)
const dataLoaded = ref(false)
const testResults = ref([])
const showBuildingView = ref(false)
const persistenceMessage = ref('')
const savingLayout = ref(false)
const loadingLayout = ref(false)
let adapter = null

onMounted(async () => {
  try {
    console.log('🚀 App mounting, initializing adapter...')
    console.log('🔍 URL:', typeof window !== 'undefined' ? window.location.href : 'N/A')
    
    // Check if we're in Niagara environment
    let isNiagara = checkNiagara()
    
    // If Niagara detected but baja not available, try to load it via RequireJS
    if (isNiagara && typeof window !== 'undefined' && 
        (typeof window.require !== 'undefined' || typeof window.requirejs !== 'undefined') &&
        (typeof window.baja === 'undefined' || !window.baja)) {
      console.log('⏳ Loading BajaScript via RequireJS...')
      
      try {
        // Use RequireJS to load baja module (same as LivePoints.html)
        const requireFn = window.require || window.requirejs
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('BajaScript load timeout'))
          }, 5000)
          
          requireFn(["baja!", "Promise"], function(baja, Promise) {
            clearTimeout(timeout)
            // Make baja available globally
            window.baja = baja
            window.Promise = Promise || window.Promise
            console.log('✓ BajaScript loaded via RequireJS')
            resolve()
          })
        })
      } catch (error) {
        console.warn('⚠️ Failed to load BajaScript via RequireJS:', error)
        // Continue anyway - might still work
      }
    }
    
    // Re-check after loading
    if (isNiagara && typeof window !== 'undefined' && 
        (typeof window.baja === 'undefined' || !window.baja)) {
      // Wait a bit more for baja to become available
      console.log('⏳ Waiting for baja to become available...')
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 100))
        if (typeof window.baja !== 'undefined' && window.baja && window.baja.Ord) {
          console.log(`✓ baja detected after ${(i + 1) * 100}ms`)
          break
        }
      }
    }
    
    console.log(`📍 Environment: ${isNiagara ? 'Niagara Station detected' : 'Development (Mock Data)'}`)
    console.log(`🔍 window.baja check:`, typeof window !== 'undefined' ? (typeof window.baja !== 'undefined' ? 'exists' : 'undefined') : 'window undefined')
    console.log(`🔍 RequireJS check:`, typeof window !== 'undefined' ? (typeof window.require !== 'undefined' || typeof window.requirejs !== 'undefined' ? 'exists' : 'undefined') : 'window undefined')
    
    // Initialize adapter based on environment
    if (isNiagara) {
      // Running in Niagara - use BQL adapter
      console.log('🔌 Initializing NiagaraBQLAdapter...')
      adapter = new NiagaraBQLAdapter(window.location.origin)
      await adapter.initialize()
      console.log('✓ Niagara BQL Adapter initialized')
    } else {
      // Development - use mock adapter with real data
      console.log('📦 Initializing MockDataAdapter...')
      adapter = new MockDataAdapter()
      await adapter.switchDataset('real')
      console.log('✓ MockDataAdapter initialized with real dataset')
    }
    
    // Set adapter in deviceStore so components can use it
    deviceStore.setAdapter(adapter)
    
    // Load building stats
    stats.value = await adapter.getBuildingStats()
    console.log('✓ Building stats loaded:', stats.value)
    dataLoaded.value = true
    await restoreLayout()
    
    console.log('✓ App initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize:', error)
    console.error('Error stack:', error.stack)
    // Show error on screen
    dataLoaded.value = false
    alert(`Failed to load data: ${error.message}\n\nCheck console for details.`)
  }
})

const buildDashboardState = () => ({
  selectedDeviceId: deviceStore.selectedDevice?.id || null,
  view: showBuildingView.value ? 'building' : 'home',
  updatedAt: new Date().toISOString()
})

const saveCurrentLayout = async () => {
  const state = buildDashboardState()
  cacheDashboardState(state)
  persistenceMessage.value = 'Saved locally'
  savingLayout.value = true
  const persisted = await saveStateToStation(state)
  savingLayout.value = false
  persistenceMessage.value = persisted ? 'Saved to station' : 'Saved locally (station unavailable)'
}

const restoreLayout = async () => {
  loadingLayout.value = true
  persistenceMessage.value = 'Restoring layout...'

  let state = loadCachedDashboardState()
  if (!state) {
    state = await loadStateFromStation()
  }

  if (state?.selectedDeviceId) {
    const device = deviceStore.getDeviceById(state.selectedDeviceId)
    if (device) {
      await deviceStore.selectDevice(device)
    }
  }

  if (typeof state?.view === 'string') {
    showBuildingView.value = state.view === 'building'
  }

  persistenceMessage.value = state ? 'Layout restored' : 'No saved layout found'
  loadingLayout.value = false
}

watch(() => deviceStore.selectedDevice?.id, () => {
  cacheDashboardState(buildDashboardState())
})

const testAdapter = async () => {
  testResults.value = []
  
  try {
    // Test 1: Discover devices
    const devices = await adapter.discoverDevices()
    testResults.value.push({
      name: 'discoverDevices()',
      success: devices.length > 0,
      detail: `Found ${devices.length} equipment items`
    })

    // Test 2: Get points for first equipment
    if (devices.length > 0) {
      const points = await adapter.getPointsByEquipment(devices[0].id)
      testResults.value.push({
        name: 'getPointsByEquipment()',
        success: points.length > 0,
        detail: `${devices[0].name} has ${points.length} points`
      })

      // Test 3: Get point value
      if (points.length > 0) {
        const pointValue = await adapter.getPointValue(points[0].id)
        testResults.value.push({
          name: 'getPointValue()',
          success: pointValue !== null,
          detail: `${pointValue.name}: ${pointValue.displayValue}`
        })

        // Test 4: Get historical data
        const history = await adapter.getHistoricalData(points[0].id)
        testResults.value.push({
          name: 'getHistoricalData()',
          success: history.length > 0,
          detail: `Retrieved ${history.length} historical data points`
        })
      }
    }

    // Test 5: Get equipment types
    const types = await adapter.getEquipmentTypes()
    testResults.value.push({
      name: 'getEquipmentTypes()',
      success: types.length > 0,
      detail: `Found types: ${types.join(', ')}`
    })

    console.log('✓ All adapter tests passed', testResults.value)
  } catch (error) {
    testResults.value.push({
      name: 'Test Suite',
      success: false,
      detail: error.message
    })
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: var(--spacing-md);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
  border: 1px solid var(--color-border);
}

.app-header h1 {
  margin: 0;
}

.header-status {
  display: flex;
  align-items: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.app-main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.stat-card {
  text-align: center;
  padding: var(--spacing-lg);
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent-primary);
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.welcome-card {
  text-align: center;
  padding: var(--spacing-2xl);
  margin-bottom: var(--spacing-lg);
}

.welcome-card h2 {
  margin-bottom: var(--spacing-md);
}

.status-list {
  margin: var(--spacing-lg) 0;
}

.status-list p {
  margin-bottom: var(--spacing-sm);
}

.actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  margin-top: var(--spacing-xl);
}

.test-results {
  padding: var(--spacing-lg);
}

.test-results h3 {
  margin-bottom: var(--spacing-md);
}

.test-result {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-sm);
}

.test-name {
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-sm);
}

.test-detail {
  grid-column: 1 / -1;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

@media (max-width: 768px) {
  .app-container {
    padding: var(--spacing-sm);
  }

  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .welcome-card {
    padding: var(--spacing-lg);
  }

  .actions {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.persistence-controls {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.persistence-controls button {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  color: white;
  border-radius: var(--radius-sm);
  padding: 0.35rem 0.75rem;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.persistence-controls button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.45);
}

.persistence-controls button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.persistence-message {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.7);
}
</style>
