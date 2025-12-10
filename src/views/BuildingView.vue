<template>
  <div class="building-view">
    <!-- View Header with Back Button -->
    <div class="view-header">
      <div class="header-left">
        <button @click="goBack" class="back-btn">← Back</button>
        <div>
          <h2>Building Overview</h2>
          <p class="subtitle">Real-time equipment monitoring</p>
        </div>
      </div>
      <button @click="refreshData" :disabled="loading" class="primary">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <!-- Dashboard Summary -->
    <DashboardSummary
      @filter-alarms="handleFilterAlarms"
      @filter-critical="handleFilterCritical"
      @show-alarms="scrollToAlarms"
      @view-all="showDashboard = false"
    />

    <!-- Alarms Section -->
    <div ref="alarmsSection">
      <AlarmList @equipment-clicked="handleEquipmentClick" />
    </div>

    <!-- Chart Section (when point is selected) -->
    <PointChart
      v-if="selectedPoint"
      :point-id="selectedPoint.id"
      :title="`${selectedPoint.equipmentName} - ${selectedPoint.name}`"
      :data="selectedPoint.data"
      @close="closeChart"
    />

    <!-- Equipment Grid -->
    <EquipmentGrid 
      ref="equipmentGridRef"
      @point-clicked="handlePointClick" 
    />
  </div>
</template>

<script setup>
/**
 * BuildingView Component
 * Main dashboard view - orchestrates equipment, alarms, and trending
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { useDeviceStore } from '../stores/deviceStore'
import { useAlarmStore } from '../stores/alarmStore'
import DashboardSummary from '../components/dashboard/DashboardSummary.vue'
import EquipmentGrid from '../components/equipment/EquipmentGrid.vue'
import PointChart from '../components/charts/PointChart.vue'
import AlarmList from '../components/alarms/AlarmList.vue'

const emit = defineEmits(['back'])

const deviceStore = useDeviceStore()
const alarmStore = useAlarmStore()
const loading = ref(false)
const selectedPoint = ref(null)
const equipmentGridRef = ref(null)
const alarmsSection = ref(null)

const refreshData = async () => {
  loading.value = true
  await deviceStore.loadDevices()
  
  // Initialize alarms with the adapter
  const adapter = deviceStore.getAdapter()
  if (adapter) {
    alarmStore.initializeAlarms(adapter)
  }
  
  loading.value = false
}

const handlePointClick = async (point) => {
  // Load historical data for the clicked point
  const history = await deviceStore.getPointHistory(point.id)
  
  selectedPoint.value = {
    id: point.id,
    name: point.name,
    equipmentName: point.equipmentName || 'Equipment',
    data: history
  }
}

const closeChart = () => {
  selectedPoint.value = null
}

const goBack = () => {
  emit('back')
}

const handleEquipmentClick = (equipmentId) => {
  console.log('Scrolling to equipment:', equipmentId)
  
  // Find the equipment card element by ID
  const element = document.querySelector(`[data-equipment-id="${equipmentId}"]`)
  
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    })
    
    // Highlight the equipment card temporarily
    element.classList.add('highlight-pulse')
    setTimeout(() => {
      element.classList.remove('highlight-pulse')
    }, 2000)
  } else {
    console.warn('Equipment card not found:', equipmentId)
  }
}

// Handle quick actions from dashboard
const handleFilterAlarms = () => {
  // Trigger filter for equipment with alarms
  if (equipmentGridRef.value) {
    equipmentGridRef.value.selectedAlarmFilter = 'with-alarms'
  }
}

const handleFilterCritical = () => {
  // Trigger filter for critical alarms
  if (equipmentGridRef.value) {
    equipmentGridRef.value.selectedAlarmFilter = 'critical'
  }
}

const scrollToAlarms = () => {
  if (alarmsSection.value) {
    alarmsSection.value.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    })
  }
}

onMounted(() => {
  refreshData()
})

onUnmounted(() => {
  // Cleanup alarm subscriptions
  alarmStore.cleanup()
})
</script>

<style scoped>
.building-view {
  width: 100%;
  padding: var(--spacing-md);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 2px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.back-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-md);
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border-color: var(--color-border-light);
}

.view-header h2 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-xl);
}

.subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

/* Highlight animation for equipment cards */
:deep(.highlight-pulse) {
  animation: highlightPulse 2s ease;
  border-color: var(--color-accent-primary) !important;
}

@keyframes highlightPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.4);
  }
}

@media (max-width: 768px) {
  .building-view {
    padding: var(--spacing-sm);
  }

  .view-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .header-left {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .view-header button {
    width: 100%;
  }
}
</style>

