<template>
  <div 
    class="equipment-card card" 
    :data-equipment-id="equipment.id"
  >
    <!-- Equipment Header -->
    <div class="equipment-header">
      <div class="equipment-info">
        <h3>{{ equipment.name }}</h3>
        <div class="equipment-meta">
          <span class="equipment-type">{{ equipment.type }}</span>
          <span class="equipment-location">{{ equipment.location }}</span>
        </div>
      </div>
      <span class="status-dot" :class="statusClass"></span>
    </div>

    <!-- Equipment Stats -->
    <div class="equipment-stats">
      <div class="stat-item">
        <span class="stat-label">Points</span>
        <span class="stat-value">{{ equipment.pointCount || 0 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Status</span>
        <span class="stat-value" :class="`status-${statusClass}`">
          {{ displayStatus }}
        </span>
      </div>
    </div>

    <!-- Points List -->
    <div v-if="showPoints" class="points-section">
      <div class="points-header">
        <h4>Data Points</h4>
        <button 
          v-if="equipment.pointCount > 0" 
          @click.stop="togglePoints"
          class="toggle-btn"
        >
          {{ pointsExpanded ? '▼' : '▶' }}
        </button>
      </div>

      <div v-if="pointsExpanded" class="points-list">
        <!-- Mini Trend for Primary Point -->
        <div v-if="miniChartData.length > 0" class="mini-chart-section">
          <div class="mini-chart-header">
            <span class="mini-chart-label">{{ selectedMiniPoint?.name }} - Last Hour</span>
            <button @click.stop="handleTrendClick" class="trend-btn" title="Open full trending">
              📊 View Trend
            </button>
          </div>
          
          <!-- Point Selector Tabs -->
          <div v-if="trendablePoints.length > 1" class="point-tabs">
            <button
              v-for="point in trendablePoints"
              :key="point.id"
              @click.stop="selectMiniPoint(point)"
              :class="['point-tab', { active: selectedMiniPoint?.id === point.id }]"
              :title="point.name"
            >
              {{ point.name }}
            </button>
          </div>
          
          <MiniChart 
            :data="miniChartData" 
            :color="getMiniChartColor()"
            :loading="loadingMiniChart"
            :point-name="selectedMiniPoint?.name"
            :unit="selectedMiniPoint?.unit"
          />
        </div>

        <div v-if="loading" class="points-loading">
          Loading points...
        </div>
        <div 
          v-for="point in points" 
          :key="point.id"
          class="point-item"
          :class="{ 'has-alarm': getPointAlarm(point) }"
          @click="handlePointClick(point)"
        >
          <div class="point-info">
            <div class="point-name-row">
              <span class="point-name">{{ point.name }}</span>
              <span v-if="getPointAlarm(point)" class="alarm-badge" :class="`alarm-${getPointAlarm(point).priority}`">
                {{ getAlarmIcon(getPointAlarm(point).priority) }}
              </span>
            </div>
            <span class="point-type">{{ point.type }}</span>
          </div>
          <div class="point-value">
            {{ point.displayValue }}
          </div>
        </div>
        <div v-if="!loading && points.length === 0" class="no-points">
          No points available
        </div>
        
        <!-- Tesla-style: Show more points toggle -->
        <div v-if="!loading && allPointsCount > points.length" class="show-more-section">
          <button @click.stop="toggleShowAllPoints" class="show-more-btn">
            {{ showAllPoints ? '⬆ Show Less' : `⬇ Show All ${allPointsCount} Points` }}
          </button>
        </div>
        <div v-else-if="showAllPoints && points.length > 10" class="show-more-section">
          <button @click.stop="toggleShowAllPoints" class="show-more-btn">
            ⬆ Show Less
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * EquipmentCard Component
 * Displays a single piece of equipment with clickable points
 * Tesla-inspired design with dark theme
 * Max 300 lines per component rule
 */

import { ref, computed, watch, onMounted } from 'vue'
import { useDeviceStore } from '../../stores/deviceStore'
import { useAlarmStore } from '../../stores/alarmStore'
import MiniChart from '../charts/MiniChart.vue'

const props = defineProps({
  equipment: {
    type: Object,
    required: true
  },
  showPoints: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['point-clicked', 'equipment-clicked'])

const deviceStore = useDeviceStore()
const alarmStore = useAlarmStore()
const adapter = computed(() => deviceStore.adapter || deviceStore.getAdapter())
const pointsExpanded = ref(false)
const loading = ref(false)
const points = ref([])
const allPointsCount = ref(0) // Total points including hidden
const showAllPoints = ref(false) // Toggle for Tesla-style progressive disclosure
const miniChartData = ref([])
const loadingMiniChart = ref(false)
const primaryPoint = ref(null)
const selectedMiniPoint = ref(null)

// Get trendable points (numeric types)
const trendablePoints = computed(() => {
  return points.value.filter(p => 
    ['Temperature', 'Pressure', 'Flow', 'Speed', 'Power', 'Current', 'Voltage', 'Setpoint'].includes(p.type)
  ).slice(0, 6) // Max 6 tabs for clean UI
})

// Get alarms for this equipment
const equipmentAlarms = computed(() => {
  return alarmStore.activeAlarms.filter(alarm => alarm.equipmentId === props.equipment.id)
})

// Display status - show alarm priority if alarms exist
const displayStatus = computed(() => {
  if (equipmentAlarms.value.length > 0) {
    const priorities = equipmentAlarms.value.map(a => a.priority)
    if (priorities.includes('critical')) return 'critical'
    if (priorities.includes('high')) return 'high'
    if (priorities.includes('medium')) return 'medium'
  }
  return props.equipment.status
})

// Check if a point has an alarm
const getPointAlarm = (point) => {
  // Check if point name/type matches alarm message
  return equipmentAlarms.value.find(alarm => {
    const lowerMessage = alarm.message.toLowerCase()
    const lowerPointName = point.name.toLowerCase()
    const lowerPointType = point.type.toLowerCase()
    return lowerMessage.includes(lowerPointName) || 
           lowerMessage.includes(lowerPointType)
  })
}

// Status indicator color based on equipment status and alarms
const statusClass = computed(() => {
  // Check if equipment has alarms - highest priority alarm determines status
  if (equipmentAlarms.value.length > 0) {
    const priorities = equipmentAlarms.value.map(a => a.priority)
    if (priorities.includes('critical')) return 'error'
    if (priorities.includes('high')) return 'warning'
    if (priorities.includes('medium')) return 'warning'
  }
  
  // Otherwise use equipment status
  switch (props.equipment.status) {
    case 'ok': return 'ok'
    case 'warning': return 'warning'
    case 'error': return 'error'
    default: return 'ok'
  }
})

// Load points when expanded
const togglePoints = async () => {
  pointsExpanded.value = !pointsExpanded.value
  
  if (pointsExpanded.value) {
    // Load points if not already loaded
    if (points.value.length === 0) {
      await loadPoints()
    }
    // Load mini-chart data on-demand when expanded
    await loadMiniChartData()
  }
}

// Load points from adapter - Tesla style: filtered by default
const loadPoints = async (showAll = false) => {
  loading.value = true
  try {
    // Load filtered points (Tesla-style: only important ones)
    const loadedPoints = await deviceStore.loadDevicePoints(props.equipment.id, { showAll })
    points.value = loadedPoints
    
    // Get total count for "show more" button
    if (!showAll) {
      const allPoints = await deviceStore.loadDevicePoints(props.equipment.id, { showAll: true })
      allPointsCount.value = allPoints.length
    } else {
      allPointsCount.value = loadedPoints.length
    }
  } catch (error) {
    console.error('Failed to load points:', error)
  } finally {
    loading.value = false
  }
}

// Toggle between filtered and all points
const toggleShowAllPoints = async () => {
  showAllPoints.value = !showAllPoints.value
  await loadPoints(showAllPoints.value)
}

// Load mini-chart data (last 1 hour) - only when expanded
const loadMiniChartData = async () => {
  if (!props.equipment.pointCount) return
  
  try {
    // Use already-loaded points from card expansion
    if (!points.value || points.value.length === 0) return
    
    // Pick primary point (first one, or first with alarm, or first numeric)
    primaryPoint.value = points.value.find(p => getPointAlarm(p)) || 
                          points.value.find(p => ['Temperature', 'Pressure', 'Flow'].includes(p.type)) ||
                          points.value[0]
    
    if (!primaryPoint.value) return
    
    // Set as selected mini point
    selectedMiniPoint.value = primaryPoint.value
    
    // Load last hour of data
    await loadMiniChartForPoint(selectedMiniPoint.value)
  } catch (error) {
    console.error('Failed to load mini-chart data:', error)
  }
}

// Load mini-chart for specific point
const loadMiniChartForPoint = async (point) => {
  if (!point) return
  
  loadingMiniChart.value = true
  try {
    const currentAdapter = adapter.value
    if (!currentAdapter) {
      console.error('Adapter not available')
      return
    }
    // Ensure adapter is initialized (deviceStore handles this)
    await deviceStore.initializeAdapter()
    const now = new Date()
    // Use 90 days lookback for COV histories which may have sparse data
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    miniChartData.value = await currentAdapter.getHistoricalData(point.id, { start: ninetyDaysAgo, end: now })
  } catch (error) {
    console.error('Failed to load mini-chart for point:', error)
  } finally {
    loadingMiniChart.value = false
  }
}

// Select different point for mini-chart
const selectMiniPoint = async (point) => {
  selectedMiniPoint.value = point
  await loadMiniChartForPoint(point)
}

// Open full trending panel for selected point
const handleTrendClick = () => {
  if (selectedMiniPoint.value) {
    handlePointClick(selectedMiniPoint.value)
  }
}

// Get mini-chart color based on status
const getMiniChartColor = () => {
  const alarm = getPointAlarm(selectedMiniPoint.value)
  if (alarm) {
    switch (alarm.priority) {
      case 'critical': return '#ef4444'
      case 'high': return '#f59e0b'
      case 'medium': return '#3b82f6'
      default: return '#6366f1'
    }
  }
  return '#3b82f6' // Default blue
}

// Handle point click
const handlePointClick = (point) => {
  emit('point-clicked', {
    ...point,
    equipmentName: props.equipment.name,
    equipmentId: props.equipment.id
  })
}

// Get alarm icon
const getAlarmIcon = (priority) => {
  switch (priority) {
    case 'critical': return '⚠'
    case 'high': return '⚡'
    case 'medium': return 'ℹ'
    default: return '•'
  }
}

// Watch equipment changes
watch(() => props.equipment.id, () => {
  points.value = []
  pointsExpanded.value = false
})
</script>

<style scoped>
.equipment-card {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.equipment-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-border-light);
  box-shadow: var(--shadow-md);
}

/* Header Section */
.equipment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.equipment-info {
  flex: 1;
}

.equipment-header h3 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.equipment-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
}

.equipment-type {
  color: var(--color-accent-primary);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.equipment-location {
  color: var(--color-text-secondary);
}

/* Status Indicator */
.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: var(--spacing-xs);
}

.status-dot.ok {
  background-color: var(--color-success);
  box-shadow: 0 0 8px var(--color-success);
}

.status-dot.warning {
  background-color: var(--color-warning);
  box-shadow: 0 0 8px var(--color-warning);
}

.status-dot.error {
  background-color: var(--color-error);
  box-shadow: 0 0 8px var(--color-error);
}

/* Stats Section */
.equipment-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

/* Mini Chart Section */
.mini-chart-section {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm);
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.mini-chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.mini-chart-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.trend-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-accent-primary);
  border: none;
  color: white;
  font-size: var(--font-size-xs);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: unset;
}

.trend-btn:hover {
  background-color: rgba(59, 130, 246, 0.8);
  transform: scale(1.05);
}

/* Point Selector Tabs */
.point-tabs {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
  flex-wrap: wrap;
}

.point-tab {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: unset;
}

.point-tab:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-accent-primary);
}

.point-tab.active {
  background-color: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
  color: white;
  font-weight: var(--font-weight-semibold);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.stat-value.status-ok {
  color: var(--color-success);
}

.stat-value.status-warning {
  color: var(--color-warning);
}

.stat-value.status-error {
  color: var(--color-error);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
}

/* Points Section */
.points-section {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-md);
}

.points-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.points-header h4 {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs);
  min-height: unset;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.toggle-btn:hover {
  color: var(--color-text-primary);
}

/* Points List */
.points-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  max-height: 300px;
  overflow-y: auto;
}

.point-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  cursor: pointer;
  min-height: var(--touch-target-min);
}

.point-item:hover {
  background-color: var(--color-bg-hover);
  transform: translateX(4px);
}

.point-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  flex: 1;
}

.point-name-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.point-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.alarm-badge {
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.alarm-badge.alarm-critical {
  background-color: var(--color-error);
  color: white;
  animation: pulseAlarmBadge 1.5s ease-in-out infinite;
}

.alarm-badge.alarm-high {
  background-color: var(--color-warning);
  color: var(--color-bg-primary);
}

.alarm-badge.alarm-medium {
  background-color: var(--color-info);
  color: white;
}

.alarm-badge.alarm-low {
  background-color: var(--color-text-tertiary);
  color: white;
}

@keyframes pulseAlarmBadge {
  0%, 100% { 
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.point-item.has-alarm {
  border-left: 3px solid var(--color-error);
  background-color: rgba(239, 68, 68, 0.05);
}

.point-item.has-alarm:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.point-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.point-value {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-accent-primary);
  font-family: 'Courier New', monospace;
}

.points-loading,
.no-points {
  padding: var(--spacing-md);
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

/* Tesla-style show more section */
.show-more-section {
  padding: var(--spacing-sm);
  text-align: center;
  border-top: 1px solid var(--color-border);
}

.show-more-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all 0.2s ease;
}

.show-more-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-accent-primary);
}

/* Scrollbar for points list */
.points-list::-webkit-scrollbar {
  width: 4px;
}

.points-list::-webkit-scrollbar-thumb {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .equipment-card {
    padding: var(--spacing-md);
  }

  .equipment-meta {
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .equipment-stats {
    grid-template-columns: 1fr;
  }
}
</style>

