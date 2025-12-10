<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Niagara Dashboard</h1>
      <div class="header-status">
        <span class="status-dot ok"></span>
        <span>System Online</span>
      </div>
    </header>

    <main class="app-main">
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
            {{ dataLoaded ? '✓ Mock data loaded' : '⏳ Loading data...' }}
          </p>
        </div>
        
        <!-- Quick Actions -->
        <div v-if="dataLoaded" class="actions">
          <button @click="testAdapter" class="primary">
            Test MockDataAdapter
          </button>
          <button @click="showBuildingView">
            Open Building View
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
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MockDataAdapter from './adapters/MockDataAdapter'

const adapter = new MockDataAdapter()
const stats = ref(null)
const dataLoaded = ref(false)
const testResults = ref([])

onMounted(async () => {
  try {
    // Initialize adapter
    await adapter.initialize()
    
    // Load building stats
    stats.value = await adapter.getBuildingStats()
    dataLoaded.value = true
    
    console.log('✓ App initialized with mock data')
  } catch (error) {
    console.error('Failed to initialize:', error)
  }
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

const showBuildingView = () => {
  alert('BuildingView will be integrated in the next step!\n\nThe view is ready at src/views/BuildingView.vue')
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
</style>
