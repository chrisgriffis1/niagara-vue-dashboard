<template>
  <div class="trending-panel-overlay" @click.self="handleClose">
    <div class="trending-panel">
      <!-- Header -->
      <div class="panel-header">
        <h3>📈 Advanced Trending</h3>
        <button @click="handleClose" class="close-btn" title="Close (Esc)">✕</button>
      </div>

      <!-- Quick Controls Bar (Always Visible) -->
      <div class="quick-controls">
        <!-- Selected Points Chips -->
        <div v-if="selectedPoints.length > 0" class="selected-points-compact">
          <div 
            v-for="point in selectedPoints" 
            :key="point.id"
            class="point-chip-compact"
            :style="{ borderLeftColor: point.color }"
          >
            <span class="point-name">{{ point.name }}</span>
            <button @click="removePoint(point.id)" class="remove-btn">✕</button>
          </div>
        </div>
        
        <!-- Quick Action Buttons -->
        <div class="quick-actions-bar">
          <button @click="showAdvancedSettings = !showAdvancedSettings" class="settings-toggle">
            {{ showAdvancedSettings ? '▼ Hide Settings' : '⚙️ Advanced Settings' }}
          </button>
          <button 
            v-if="currentEquipment"
            @click="addAllPointsFromEquipment"
            class="quick-btn"
            title="Add all points from current equipment"
          >
            + All Points
          </button>
          <button 
            v-if="selectedPoints.length > 0"
            @click="clearAll"
            class="quick-btn"
          >
            ✕ Clear
          </button>
        </div>
      </div>

      <!-- Advanced Settings (Collapsible) -->
      <div v-if="showAdvancedSettings" class="config-section">
        <!-- Time Range Selector -->
        <TimeRangeSelector 
          v-model="timeRange"
          :alarm-timestamp="initialAlarm?.timestamp"
          @range-changed="handleTimeRangeChange"
        />

        <!-- Point Selector -->
        <PointSelector
          v-model="selectedPoints"
          :available-equipment="availableEquipment"
          :current-equipment="currentEquipment"
          :equipment-points="equipmentPoints"
          @points-changed="handlePointsChange"
        />

        <!-- Smart Suggestions -->
        <SmartSuggestions
          v-if="currentEquipment"
          :equipment="currentEquipment"
          :has-alarm="!!initialAlarm"
          :selected-points="selectedPoints"
          :available-points="currentEquipmentPoints"
          @add-point="handleSuggestionAdd"
        />
      </div>

      <!-- View Toggle -->
      <div class="view-toggle">
        <button 
          :class="['toggle-btn', { active: viewMode === 'chart' }]"
          @click="viewMode = 'chart'"
        >
          📊 Chart View
        </button>
        <button 
          :class="['toggle-btn', { active: viewMode === 'table' }]"
          @click="viewMode = 'table'"
        >
          📋 Table View
        </button>
      </div>

      <!-- Display Section -->
      <div class="display-section">
        <!-- Chart View -->
        <div v-if="viewMode === 'chart' && hasData" class="chart-container">
          <PointChart
            :point="chartPoint"
            :loading="loading"
            :embedded="true"
          />
        </div>

        <!-- Table View -->
        <TableView
          v-if="viewMode === 'table' && hasData"
          :points="selectedPoints"
          :data="historicalData"
        />

        <!-- Empty State -->
        <div v-if="!hasData" class="empty-state">
          <div class="empty-icon">📊</div>
          <p class="empty-title">No Data to Display</p>
          <p class="empty-description">
            {{ selectedPoints.length === 0 
              ? 'Select one or more points to view trending data'
              : 'Loading historical data...'
            }}
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="loading && selectedPoints.length > 0" class="loading-overlay">
          <div class="spinner"></div>
          <p>Loading {{ selectedPoints.length }} point{{ selectedPoints.length > 1 ? 's' : '' }}...</p>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <button @click="refreshData" class="action-btn" :disabled="selectedPoints.length === 0">
          🔄 Refresh
        </button>
        <button @click="clearAll" class="action-btn">
          🗑 Clear All
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * TrendingPanel Component
 * Main orchestrator for advanced trending system
 * Integrates TimeRange, PointSelector, SmartSuggestions, Chart, and Table views
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import TimeRangeSelector from './TimeRangeSelector.vue'
import PointSelector from './PointSelector.vue'
import SmartSuggestions from './SmartSuggestions.vue'
import PointChart from './PointChart.vue'
import TableView from './TableView.vue'
import { useDeviceStore } from '../../stores/deviceStore'
import MockDataAdapter from '../../adapters/MockDataAdapter'

const props = defineProps({
  initialEquipment: {
    type: Object,
    default: null
  },
  initialPoint: {
    type: Object,
    default: null
  },
  initialAlarm: {
    type: Object,
    default: null
  },
  availableEquipment: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close'])

const deviceStore = useDeviceStore()
const adapter = new MockDataAdapter()

const viewMode = ref('chart')
// Default to 24 hours
const now = new Date()
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
const timeRange = ref({ start: yesterday, end: now })
const selectedPoints = ref([])
const historicalData = ref({})
const equipmentPoints = ref({})
const loading = ref(false)
const showAdvancedSettings = ref(false) // Collapsed by default

const currentEquipment = computed(() => props.initialEquipment)

const currentEquipmentPoints = computed(() => {
  return equipmentPoints.value[currentEquipment.value?.id] || []
})

const hasData = computed(() => {
  return selectedPoints.value.length > 0 && Object.keys(historicalData.value).length > 0
})

// Format data for Chart.js (single or multi-point)
const chartPoint = computed(() => {
  if (selectedPoints.value.length === 0) return null
  
  if (selectedPoints.value.length === 1) {
    // Single point - use existing PointChart format
    const point = selectedPoints.value[0]
    const history = historicalData.value[point.id] || []
    return {
      ...point,
      data: history
    }
  }
  
  // Multi-point - combine data
  return {
    id: 'multi',
    name: 'Multi-Point Trend',
    equipmentName: 'Multiple',
    data: historicalData.value,
    points: selectedPoints.value,
    isMultiPoint: true
  }
})

// Initialize with initial point if provided
onMounted(async () => {
  // Initialize adapter
  await adapter.initialize()
  
  // Load equipment points
  await loadAllEquipmentPoints()
  
  // Add initial point if provided
  if (props.initialPoint && props.initialEquipment) {
    const colorIndex = selectedPoints.value.length % 10
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ]
    
    selectedPoints.value.push({
      ...props.initialPoint,
      equipmentName: props.initialEquipment.name,
      equipmentId: props.initialEquipment.id,
      color: colors[colorIndex]
    })
    
    // Load data immediately for initial point
    await loadHistoricalData()
  }
  
  // Setup keyboard shortcuts
  document.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress)
})

const loadAllEquipmentPoints = async () => {
  for (const equipment of props.availableEquipment) {
    const points = await deviceStore.loadDevicePoints(equipment.id)
    equipmentPoints.value[equipment.id] = points
  }
}

const handleTimeRangeChange = async (newRange) => {
  timeRange.value = newRange
  if (selectedPoints.value.length > 0) {
    await loadHistoricalData()
  }
}

const handlePointsChange = async (points) => {
  selectedPoints.value = points
  if (points.length > 0 && timeRange.value.start) {
    await loadHistoricalData()
  }
}

const handleSuggestionAdd = (point) => {
  if (!selectedPoints.value.some(p => p.id === point.id)) {
    const colorIndex = selectedPoints.value.length % 10
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ]
    
    selectedPoints.value.push({
      ...point,
      equipmentName: currentEquipment.value.name,
      equipmentId: currentEquipment.value.id,
      color: colors[colorIndex]
    })
    
    handlePointsChange(selectedPoints.value)
  }
}

const addAllPointsFromEquipment = () => {
  if (!currentEquipment.value) return
  
  const points = equipmentPoints.value[currentEquipment.value.id] || []
  points.forEach(point => {
    if (!selectedPoints.value.some(p => p.id === point.id)) {
      const colorIndex = selectedPoints.value.length % 10
      const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
      ]
      
      selectedPoints.value.push({
        ...point,
        equipmentName: currentEquipment.value.name,
        equipmentId: currentEquipment.value.id,
        color: colors[colorIndex]
      })
    }
  })
  
  handlePointsChange(selectedPoints.value)
}

const removePoint = (pointId) => {
  selectedPoints.value = selectedPoints.value.filter(p => p.id !== pointId)
  handlePointsChange(selectedPoints.value)
}

const loadHistoricalData = async () => {
  loading.value = true
  historicalData.value = {}
  
  try {
    for (const point of selectedPoints.value) {
      const data = await adapter.getHistoricalData(point.id, timeRange.value.start, timeRange.value.end)
      historicalData.value[point.id] = data
    }
  } catch (error) {
    console.error('Error loading historical data:', error)
  } finally {
    loading.value = false
  }
}

const refreshData = async () => {
  if (selectedPoints.value.length > 0 && timeRange.value.start) {
    await loadHistoricalData()
  }
}

const clearAll = () => {
  selectedPoints.value = []
  historicalData.value = {}
}

const handleClose = () => {
  emit('close')
}

const handleKeyPress = (e) => {
  if (e.key === 'Escape') {
    handleClose()
  }
}

// Watch for point/time changes
watch([selectedPoints, timeRange], async () => {
  if (selectedPoints.value.length > 0 && timeRange.value.start) {
    await loadHistoricalData()
  }
}, { deep: true })
</script>

<style scoped>
.trending-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.trending-panel {
  width: 100%;
  max-width: 1400px;
  background-color: var(--color-bg-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  max-height: 95vh;
  overflow: hidden;
}

/* Header */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.panel-header h3 {
  margin: 0;
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
}

.close-btn {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xl);
  width: 40px;
  height: 40px;
  padding: 0;
  min-height: unset;
}

.close-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

/* Quick Controls Bar */
.quick-controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.selected-points-compact {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.point-chip-compact {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-left: 3px solid;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}

.point-chip-compact .point-name {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.point-chip-compact .remove-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  padding: 0;
  min-height: unset;
  cursor: pointer;
  font-size: var(--font-size-sm);
  line-height: 1;
  transition: color var(--transition-fast);
}

.point-chip-compact .remove-btn:hover {
  color: var(--color-error);
}

.quick-actions-bar {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.settings-toggle {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--color-accent-primary);
  border: none;
  color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  min-height: unset;
  transition: all var(--transition-fast);
}

.settings-toggle:hover {
  background-color: rgba(59, 130, 246, 0.8);
}

.quick-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  min-height: unset;
  transition: all var(--transition-fast);
}

.quick-btn:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-accent-primary);
}

/* Configuration Section (Collapsible) */
.config-section {
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  overflow-y: auto;
  max-height: 60vh;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* View Toggle */
.view-toggle {
  display: flex;
  padding: var(--spacing-md) var(--spacing-lg);
  gap: var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.toggle-btn {
  flex: 1;
  padding: var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
  min-height: unset;
}

.toggle-btn.active {
  background-color: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
  color: white;
}

/* Display Section */
.display-section {
  flex: 1;
  padding: var(--spacing-lg);
  overflow-y: auto;
  position: relative;
  min-height: 500px;
}

.chart-container {
  height: 100%;
  min-height: 500px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xxl);
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.empty-title {
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-sm) 0;
}

.empty-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 10;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Action Bar */
.action-bar {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
}

.action-btn {
  flex: 1;
  padding: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  min-height: unset;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Mobile */
@media (max-width: 768px) {
  .trending-panel-overlay {
    padding: 0;
  }

  .trending-panel {
    max-width: 100%;
    border-radius: 0;
    max-height: 100vh;
  }

  .config-section {
    max-height: 30vh;
  }

  .chart-container {
    min-height: 300px;
  }
}
</style>

