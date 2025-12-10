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

    <!-- Dashboard Summary (Collapsible) -->
    <div v-if="showDashboard" class="dashboard-container">
      <div class="dashboard-header">
        <h3>Dashboard Summary</h3>
        <button @click="showDashboard = false" class="collapse-btn" title="Hide dashboard">
          ▼ Collapse
        </button>
      </div>
      <DashboardSummary
        @filter-alarms="handleFilterAlarms"
        @filter-critical="handleFilterCritical"
        @show-alarms="scrollToAlarms"
        @view-all="handleViewAll"
      />
    </div>
    <div v-else class="dashboard-collapsed">
      <button @click="showDashboard = true" class="expand-btn">
        ▶ Show Dashboard Summary
      </button>
    </div>

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
const showDashboard = ref(true)

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
  if (equipmentGridRef.value) {
    equipmentGridRef.value.applyAlarmFilter('with-alarms')
  }
}

const handleFilterCritical = () => {
  if (equipmentGridRef.value) {
    equipmentGridRef.value.applyAlarmFilter('critical')
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

const handleViewAll = () => {
  if (equipmentGridRef.value) {
    equipmentGridRef.value.scrollToGrid()
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

/* Dashboard Container */
.dashboard-container {
  margin-bottom: var(--spacing-xl);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) 0;
}

.dashboard-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}

.collapse-btn, .expand-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
  min-height: unset;
  transition: all var(--transition-fast);
}

.collapse-btn:hover, .expand-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border-color: var(--color-border-light);
}

.dashboard-collapsed {
  margin-bottom: var(--spacing-lg);
}

.expand-btn {
  width: 100%;
  padding: var(--spacing-md);
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

