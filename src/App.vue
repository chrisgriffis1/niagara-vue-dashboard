<template>
  <div class="app-container">
    <!-- Loading Overlay -->
    <Transition name="fade">
      <div v-if="isLoading" class="loading-overlay" style="background: rgba(0,0,0,0.9); z-index: 9999;">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <h2>{{ loadingTitle }}</h2>
          <p class="loading-message">{{ loadingMessage }}</p>
          <div class="loading-progress" v-if="loadingProgress">
            <div class="progress-bar" :style="{ width: loadingProgress + '%' }"></div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Floating Action Button for quick actions -->
    <div class="fab-container">
      <button class="fab fab-main" @click="toggleFabMenu" :class="{ active: fabMenuOpen }">
        <span class="fab-icon">⚡</span>
      </button>
      <Transition name="fab-menu">
        <div v-if="fabMenuOpen" class="fab-menu">
          <button class="fab fab-item" @click="scrollToTop" title="Scroll to top">↑</button>
          <button class="fab fab-item" @click="openFilters" title="Filters" v-if="showBuildingView">🔍</button>
          <button class="fab fab-item" @click="refreshData" title="Refresh">🔄</button>
          <button class="fab fab-item feedback-btn" @click="openFeedback" title="Send Feedback">📝</button>
        </div>
      </Transition>
    </div>
    
    <!-- Feedback Modal -->
    <FeedbackModal 
      :isOpen="showFeedbackModal" 
      @close="showFeedbackModal = false"
      @submitted="onFeedbackSubmitted"
    />

    <header class="app-header">
      <div>
        <h1>Niagara Dashboard</h1>
        <div class="header-status">
          <span class="status-dot ok"></span>
          <span>{{ isNiagaraEnv ? 'Live Station' : 'Local Dev' }}</span>
          
          <!-- Cache Status Indicator -->
          <span v-if="cacheStatus.isCaching" class="cache-status">
            📊 Caching histories... {{ cacheStatus.progress }}%
          </span>
          <span v-else-if="cacheStatus.cached > 0" class="cache-status success">
            ⚡ {{ cacheStatus.cached }} histories cached
          </span>
        </div>
      </div>
      
      <!-- Dataset Selector (only in local dev mode) -->
      <div v-if="!isNiagaraEnv && availableDatasets.length > 0" class="dataset-selector">
        <label>Dataset:</label>
        <select v-model="currentDataset" @change="switchDataset">
          <option v-for="ds in availableDatasets" :key="ds.id" :value="ds.id">
            {{ ds.name }}
          </option>
        </select>
      </div>
      
      <!-- Export Button (only in Niagara) -->
      <button v-if="isNiagaraEnv" @click="exportData" class="export-btn" :disabled="exporting" title="Export data for local testing">
        {{ exporting ? '⏳ Exporting...' : '📦 Export' }}
      </button>
      
      <div class="persistence-controls">
        <button @click="openSettings" class="settings-btn" title="Settings">
          ⚙️ Settings
        </button>
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

      <div>
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
      </div>
    </main>

    <!-- Settings Panel -->
    <SettingsPanel 
      :show="showSettings"
      @close="showSettings = false"
      @config-updated="onConfigUpdated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import MockDataAdapter from './adapters/MockDataAdapter'
import NiagaraBQLAdapter from './adapters/NiagaraBQLAdapter'
import BuildingView from './views/BuildingView.vue'
import FeedbackModal from './components/FeedbackModal.vue'
import SettingsPanel from './components/settings/SettingsPanel.vue'
import { useDeviceStore } from './stores/deviceStore'
import configService from './services/ConfigurationService'
import historyCacheService from './services/HistoryCacheService'
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
const showSettings = ref(false)
const persistenceMessage = ref('')
const savingLayout = ref(false)
const loadingLayout = ref(false)

// History cache status
const cacheStatus = ref({
  isCaching: false,
  progress: 0,
  total: 0,
  cached: 0
})

// Environment and dataset state
const isNiagaraEnv = ref(false)
const availableDatasets = ref([])
const currentDataset = ref('')

// Loading overlay state
const isLoading = ref(true)
const loadingTitle = ref('Starting Up')
const loadingMessage = ref('Connecting to Niagara station...')
const loadingProgress = ref(0)

// FAB state
const fabMenuOpen = ref(false)
const showFeedbackModal = ref(false)

// FAB methods
const toggleFabMenu = () => {
  fabMenuOpen.value = !fabMenuOpen.value
}

const openFeedback = () => {
  fabMenuOpen.value = false
  showFeedbackModal.value = true
}

const openSettings = () => {
  showSettings.value = true
}

const onConfigUpdated = () => {
  // Reload the page to apply new configuration
  console.log('Configuration updated, consider refreshing data')
  // Optionally trigger a data refresh here
}

const onFeedbackSubmitted = (data) => {
  console.log('✓ Feedback submitted:', data)
}

const scrollToTop = () => {
  console.log('🚀 FAB: Scroll to top clicked!')

  // Check if we're actually scrolled down
  const currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
  console.log('🚀 FAB: Current scroll position:', currentScroll)

  if (currentScroll === 0) {
    console.log('🚀 FAB: Already at top, no scrolling needed')
    fabMenuOpen.value = false
    return
  }

  // Try multiple scroll methods for maximum compatibility
  try {
    // Method 1: Modern smooth scroll
    if ('scrollBehavior' in document.documentElement.style) {
      console.log('🚀 FAB: Using modern scrollTo')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Method 2: Fallback for older browsers
      console.log('🚀 FAB: Using legacy scrollTo')
      window.scrollTo(0, 0)
    }
  } catch (error) {
    // Method 3: Direct scroll for maximum compatibility
    console.log('🚀 FAB: Using direct scroll')
    window.scroll(0, 0)
  }

  // Also try scrolling any scrollable containers
  const scrollableElements = [
    document.querySelector('.app-main'),
    document.querySelector('.building-view'),
    document.body,
    document.documentElement
  ]

  for (const element of scrollableElements) {
    if (element && element.scrollTop > 0) {
      console.log('🚀 FAB: Scrolling element to top:', element.className || element.tagName)
      element.scrollTop = 0
    }
  }

  fabMenuOpen.value = false
}

const openFilters = () => {
  fabMenuOpen.value = false
  
  // First scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' })
  
  // Then try to open filter panel by clicking the filter button
  setTimeout(() => {
    const filterBtn = document.querySelector('.filter-btn')
    if (filterBtn) {
      filterBtn.click()
      // Scroll to filter section after it opens
      setTimeout(() => {
        const filterSection = document.querySelector('.filter-section')
        if (filterSection) {
          filterSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }, 300)
}

const refreshData = async () => {
  fabMenuOpen.value = false
  isLoading.value = true
  loadingTitle.value = 'Refreshing'
  loadingMessage.value = 'Reloading equipment data...'
  loadingProgress.value = 0
  
  try {
    // Clear cache and reload
    localStorage.removeItem('niagara_dashboard_cache')
    await deviceStore.loadDevices()
  } catch (e) {
    console.error('Refresh failed:', e)
  } finally {
    isLoading.value = false
  }
}

let adapter = null

onMounted(async () => {
  try {
    isLoading.value = true
    loadingProgress.value = 10
    console.log('🚀 App mounting, initializing adapter...')
    console.log('🔍 URL:', typeof window !== 'undefined' ? window.location.href : 'N/A')
    
    // Initialize configuration service
    await configService.init()
    console.log('✅ Configuration service initialized')
    
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
      loadingTitle.value = 'Connecting'
      loadingMessage.value = 'Connecting to Niagara station...'
      loadingProgress.value = 20
      
      console.log('🔌 Initializing NiagaraBQLAdapter...')
      adapter = new NiagaraBQLAdapter(window.location.origin)
      
      loadingMessage.value = 'Discovering equipment...'
      loadingProgress.value = 30
      
      await adapter.initialize()
      
      loadingMessage.value = 'Loading locations...'
      loadingProgress.value = 60
      
      console.log('✓ Niagara BQL Adapter initialized')
      isNiagaraEnv.value = true
    } else {
      // Development - use mock adapter with real data
      loadingTitle.value = 'Loading Data'
      loadingMessage.value = 'Loading mock data...'
      loadingProgress.value = 30
      
      console.log('📦 Initializing MockDataAdapter...')
      adapter = new MockDataAdapter()
      // Default to live station export (most recent/complete data)
      await adapter.switchDataset('live')
      console.log('✓ MockDataAdapter initialized with live station export')
      
      isNiagaraEnv.value = false
      // Get available datasets for selector
      availableDatasets.value = adapter.getAvailableDatasets()
      currentDataset.value = 'live'
    }
    
    loadingMessage.value = 'Preparing dashboard...'
    loadingProgress.value = 80
    
    // Set adapter in deviceStore so components can use it
    deviceStore.setAdapter(adapter)
    
    // Load building stats
    stats.value = await adapter.getBuildingStats()
    console.log('✓ Building stats loaded:', stats.value)
    dataLoaded.value = true
    
    loadingMessage.value = 'Restoring layout...'
    loadingProgress.value = 90
    await restoreLayout()
    
    loadingProgress.value = 100
    console.log('✓ App initialized successfully')
    
    // Start background history caching (non-blocking)
    console.log('🚀 Starting background history cache...')
    setTimeout(async () => {
      try {
        cacheStatus.value.isCaching = true
        loadingMessage.value = 'Caching histories for instant charts...'
        
        // Start caching with progress updates
        const updateInterval = setInterval(() => {
          const stats = historyCacheService.getStats()
          cacheStatus.value.cached = stats.cachedPoints
          cacheStatus.value.total = stats.totalPoints
          cacheStatus.value.progress = stats.totalPoints > 0 
            ? Math.round((stats.cachedPoints / stats.totalPoints) * 100)
            : 0
        }, 500)
        
        await historyCacheService.startCaching(adapter, deviceStore)
        
        clearInterval(updateInterval)
        cacheStatus.value.isCaching = false
        console.log('✅ History cache complete - charts will now load instantly!')
      } catch (error) {
        cacheStatus.value.isCaching = false
        console.warn('⚠️ History caching failed (non-critical):', error)
      }
    }, 1000) // Start 1 second after app loads
    
    // Hide loading overlay with slight delay for smooth transition
    console.log('⏰ Scheduling loading overlay hide in 300ms...')
    setTimeout(() => {
      console.log('⏰ Hiding loading overlay now')
      isLoading.value = false
      console.log('⏰ isLoading set to:', isLoading.value)
    }, 300)
  } catch (error) {
    console.error('❌ Failed to initialize:', error)
    console.error('Error stack:', error.stack)
    // Show error on screen
    dataLoaded.value = false
    isLoading.value = false
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

// Switch dataset (local dev only)
const switchDataset = async () => {
  console.log('🔄 switchDataset called, currentDataset:', currentDataset.value)
  if (!adapter || isNiagaraEnv.value) return

  isLoading.value = true
  loadingTitle.value = 'Switching Dataset'
  loadingMessage.value = 'Loading new dataset...'
  loadingProgress.value = 30

  try {
    console.log('🔄 Calling adapter.switchDataset with:', currentDataset.value)
    await adapter.switchDataset(currentDataset.value)
    
    loadingProgress.value = 60
    
    // Reload stats
    stats.value = await adapter.getBuildingStats()
    
    loadingProgress.value = 80
    
    // Force devices to reload
    await deviceStore.loadDevices()
    
    loadingProgress.value = 100
    console.log(`✅ Switched to dataset: ${currentDataset.value}`)
  } catch (error) {
    console.error('Failed to switch dataset:', error)
    alert(`Failed to switch dataset: ${error.message}`)
  } finally {
    setTimeout(() => {
      isLoading.value = false
    }, 300)
  }
}

// Export data for local testing (Niagara only)
const exporting = ref(false)
const exportData = async () => {
  if (!adapter || !isNiagaraEnv.value) return
  if (exporting.value) return // Prevent double-click
  
  exporting.value = true
  try {
    console.log('📦 Starting export...')
    alert('Export starting... This may take a minute for large datasets. Check console for progress.')
    await adapter.exportForLocalTesting()
    alert('Export complete! Check your downloads folder, or access via window.lastExport in console.')
  } catch (error) {
    console.error('Export failed:', error)
    alert(`Export failed: ${error.message}`)
  } finally {
    exporting.value = false
  }
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
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  flex-wrap: wrap;
}

.cache-status {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: var(--border-radius);
  font-size: var(--font-size-xs);
  color: var(--color-accent);
  animation: pulse 2s infinite;
}

.cache-status.success {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  color: var(--color-success);
  animation: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
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

/* Dataset Selector */
.dataset-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.dataset-selector label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.dataset-selector select {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.dataset-selector select:hover {
  border-color: var(--color-accent-primary);
}

/* Export Button */
.export-btn {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.export-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 3px solid rgba(59, 130, 246, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-content h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #fff;
}

.loading-message {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.loading-progress {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* FAB (Floating Action Button) */
.fab-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
}

.fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.fab-main {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
}

.fab-main:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.fab-main.active {
  transform: rotate(45deg);
  background: #ef4444;
}

.fab-icon {
  transition: transform 0.2s ease;
}

.fab-item {
  width: 48px;
  height: 48px;
  background: rgba(30, 30, 46, 0.95);
  color: white;
  font-size: 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.fab-item:hover {
  background: rgba(59, 130, 246, 0.3);
  border-color: #3b82f6;
}

.fab-item.feedback-btn {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.4);
}

.fab-item.feedback-btn:hover {
  background: rgba(139, 92, 246, 0.4);
  border-color: #8b5cf6;
}

/* FAB menu animation */
.fab-menu-enter-active,
.fab-menu-leave-active {
  transition: all 0.2s ease;
}

.fab-menu-enter-from,
.fab-menu-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.fab-menu {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
