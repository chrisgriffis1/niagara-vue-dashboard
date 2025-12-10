<template>
  <div class="building-view">
    <div class="view-header">
      <h2>Building Overview</h2>
      <button @click="refreshData" :disabled="loading">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <AlarmList />

    <PointChart
      v-if="selectedPoint"
      :point-id="selectedPoint.id"
      :title="selectedPoint.name"
      :data="selectedPoint.data"
      @close="closeChart"
    />

    <EquipmentGrid @point-clicked="handlePointClick" />
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
import EquipmentGrid from '../components/equipment/EquipmentGrid.vue'
import PointChart from '../components/charts/PointChart.vue'
import AlarmList from '../components/alarms/AlarmList.vue'

const deviceStore = useDeviceStore()
const alarmStore = useAlarmStore()
const loading = ref(false)
const selectedPoint = ref(null)

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
    data: history
  }
}

const closeChart = () => {
  selectedPoint.value = null
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
  padding: var(--spacing-md);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.view-header h2 {
  margin: 0;
}

@media (max-width: 768px) {
  .building-view {
    padding: var(--spacing-sm);
  }
}
</style>

