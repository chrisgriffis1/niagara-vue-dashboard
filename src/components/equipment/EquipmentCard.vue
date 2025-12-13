<template>
  <div
    class="equipment-card card"
    :data-equipment-id="equipment.id"
  >
    <EquipmentHeader
      :equipment="equipment"
      :status-class="alarms.statusClass.value"
    />

    <EquipmentStats
      :point-count-label="points.pointCountLabel.value"
      :status-class="alarms.statusClass.value"
      :display-status="alarms.displayStatus.value"
    />

    <EquipmentSparkline
      :has-sparkline-data="miniChart.hasSparklineData.value"
      :mini-chart-data="miniChart.miniChartData.value"
      :loading-mini-chart="miniChart.loadingMiniChart.value"
      :sparkline-attempted="miniChart.sparklineAttempted.value"
      :selected-mini-point="miniChart.selectedMiniPoint.value"
      :chart-color="miniChart.getMiniChartColor()"
    />

    <PointDeviceValue
      v-if="pointDevice.isPointDevice.value"
      :display-value="pointDevice.displayValue.value"
      :unit="equipment.unit"
      :display-status="pointDevice.displayStatus.value"
      :has-live-data="pointDevice.hasLiveData.value"
    />

    <EquipmentPointsList
      v-if="points.canShowPoints.value && !pointDevice.isPointDevice.value"
      :points="points"
      :mini-chart="miniChart"
      :alarms="alarms"
      @point-click="handlePointClick"
      @trend-click="handleTrendClick"
    />
  </div>
</template>

<script setup>
/**
 * EquipmentCard Component
 * Displays a single piece of equipment with clickable points
 * Tesla-inspired design with dark theme
 * Refactored with sub-components - now under 300 lines
 */

import { computed, onMounted, onUnmounted, toRef } from 'vue'
import EquipmentHeader from './EquipmentHeader.vue'
import EquipmentStats from './EquipmentStats.vue'
import EquipmentSparkline from './EquipmentSparkline.vue'
import PointDeviceValue from './PointDeviceValue.vue'
import EquipmentPointsList from './EquipmentPointsList.vue'
import { useEquipmentPoints } from '../../composables/useEquipmentPoints'
import { useEquipmentMiniChart } from '../../composables/useEquipmentMiniChart'
import { useEquipmentAlarms } from '../../composables/useEquipmentAlarms'
import { usePointDevice } from '../../composables/usePointDevice'

const props = defineProps({
  equipment: {
    type: Object,
    required: true
  },
  showPointsSection: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['point-clicked', 'equipment-clicked'])

// Create reactive reference for equipment
const equipmentRef = toRef(props, 'equipment')

// Use composables
const points = useEquipmentPoints(equipmentRef)
const miniChart = useEquipmentMiniChart(equipmentRef, points.trendablePoints)
const alarms = useEquipmentAlarms(computed(() => props.equipment.id))
const pointDevice = usePointDevice(equipmentRef)

// Methods
const handlePointClick = (point) => {
  emit('point-clicked', { point, equipment: props.equipment })
}

const handleEquipmentClick = () => {
  emit('equipment-clicked', props.equipment)
}

const handleTrendClick = () => {
  if (miniChart.selectedMiniPoint.value) {
    emit('point-clicked', {
      point: miniChart.selectedMiniPoint.value,
      equipment: props.equipment,
      openTrend: true
    })
  }
}

// Lifecycle
onMounted(async () => {
  // Debug: Log point-device detection
  if (props.equipment.isPointDevice) {
    console.log(`📌 Point-device mounted: ${props.equipment.name}, value: ${props.equipment.currentValue}`)
    
    // For point-devices, load sparkline using the equipment as the point
    // Create a pseudo-point object from the equipment data
    const pseudoPoint = {
      id: props.equipment.id,
      name: props.equipment.name,
      slotPath: props.equipment.slotPath,
      ord: props.equipment.ord,
      type: props.equipment.type,
      unit: props.equipment.unit,
      hasHistory: true
    }
    miniChart.loadMiniChartData(pseudoPoint)
  } else if (props.equipment.pointCount > 0) {
    // For regular equipment with points, load points to enable sparkline
    await points.loadPoints()
    
    // Initialize sparkline after points are loaded
    if (points.trendablePoints.value.length > 0) {
      miniChart.initializeSparkline()
    }
  }
})

onUnmounted(() => {
  // Cleanup subscriptions
  points.cleanup()
  pointDevice.unsubscribeFromLiveUpdates()
})
</script>
