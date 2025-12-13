/**
 * Equipment Points Composable
 * Handles point loading, filtering, and live subscriptions for equipment
 */

import { ref, computed } from 'vue'
import { useDeviceStore } from '../stores/deviceStore'

export function useEquipmentPoints(equipment) {
  const deviceStore = useDeviceStore()
  const adapter = computed(() => deviceStore.adapter || deviceStore.getAdapter())

  // State
  const loading = ref(false)
  const points = ref([])
  const allPointsCount = ref(0)
  const showAllPoints = ref(false)
  const pointsExpanded = ref(false)
  const pointsLoaded = ref(false)
  const pointLiveValues = ref(new Map())

  // Live subscription cleanup
  let equipmentUnsubscribe = null

  // Computed properties
  const pointCountLabel = computed(() => {
    if (allPointsCount.value > 0) return allPointsCount.value
    if (pointsLoaded.value) return points.value.length
    if (equipment.value?.pointCount) return equipment.value.pointCount
    return 'Tap to load'
  })

  const canShowPoints = computed(() => {
    // Point-devices don't have sub-points
    if (equipment.value?.isPointDevice) return false

    // Regular equipment with points
    return equipment.value?.pointCount > 0 || !equipment.value?.pointCount
  })

  const showToggleButton = computed(() => canShowPoints.value)

  // Get trendable points (numeric types)
  const trendablePoints = computed(() => {
    return points.value.filter(p =>
      ['Temperature', 'Pressure', 'Flow', 'Speed', 'Power', 'Current', 'Voltage', 'Setpoint'].includes(p.type)
    ).slice(0, 6) // Max 6 tabs for clean UI
  })

  // Methods
  const loadPoints = async () => {
    if (!equipment.value || loading.value) return

    loading.value = true
    try {
      const currentAdapter = adapter.value
      if (!currentAdapter) {
        console.warn('No adapter available for loading points')
        return
      }

      console.log(`📊 Loading points for equipment: ${equipment.value.name}`)

      // Get points for this equipment
      const equipmentPoints = await currentAdapter.getPointsByEquipment(equipment.value.id, {
        includeHidden: showAllPoints.value
      })

      if (equipmentPoints && Array.isArray(equipmentPoints)) {
        points.value = equipmentPoints
        allPointsCount.value = equipmentPoints.length
        pointsLoaded.value = true
        console.log(`✅ Loaded ${equipmentPoints.length} points for ${equipment.value.name}`)
      }
    } catch (error) {
      console.error('❌ Failed to load points:', error)
      points.value = []
    } finally {
      loading.value = false
    }
  }

  const togglePoints = async () => {
    pointsExpanded.value = !pointsExpanded.value

    if (pointsExpanded.value) {
      // Load points if not already loaded
      if (points.value.length === 0) {
        await loadPoints()
      }

      // Subscribe to live updates for this equipment's points
      const currentAdapter = adapter.value
      if (currentAdapter && currentAdapter.subscribeToEquipment && points.value.length > 0) {
        equipmentUnsubscribe = currentAdapter.subscribeToEquipment(equipment.value.id, (update) => {
          // Update point's live value
          pointLiveValues.value.set(update.pointId, {
            value: update.value,
            status: update.status,
            timestamp: update.timestamp
          })
          // Force reactivity update
          pointLiveValues.value = new Map(pointLiveValues.value)
        })
      }
    } else {
      // Unsubscribe when collapsing
      if (equipmentUnsubscribe) {
        equipmentUnsubscribe()
        equipmentUnsubscribe = null
      }
    }
  }

  const toggleShowAllPoints = async () => {
    showAllPoints.value = !showAllPoints.value
    await loadPoints() // Reload with new filter
  }

  const getPointDisplayValue = (point) => {
    // Check for live value first
    const liveData = pointLiveValues.value.get(point.id)
    if (liveData) {
      return formatValue(liveData.value, point.unit)
    }

    // Fall back to static value
    return formatValue(point.value, point.unit)
  }

  const formatValue = (value, unit) => {
    if (value === null || value === undefined) return 'N/A'

    // Format based on unit/type
    if (typeof value === 'number') {
      if (unit === '°F' || unit === '°C') {
        return Math.round(value * 10) / 10 + unit
      }
      if (unit === 'psi' || unit === 'kPa') {
        return Math.round(value * 10) / 10 + unit
      }
      if (unit === '%' || unit?.includes('percent')) {
        return Math.round(value) + '%'
      }
      return Math.round(value * 100) / 100 + (unit ? ' ' + unit : '')
    }

    return String(value)
  }

  // Cleanup
  const cleanup = () => {
    if (equipmentUnsubscribe) {
      equipmentUnsubscribe()
      equipmentUnsubscribe = null
    }
  }

  return {
    // State
    loading,
    points,
    allPointsCount,
    showAllPoints,
    pointsExpanded,
    pointsLoaded,
    pointLiveValues,

    // Computed
    pointCountLabel,
    canShowPoints,
    showToggleButton,
    trendablePoints,

    // Methods
    loadPoints,
    togglePoints,
    toggleShowAllPoints,
    getPointDisplayValue,
    cleanup
  }
}
