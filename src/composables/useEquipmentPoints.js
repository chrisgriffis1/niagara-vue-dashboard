/**
 * Equipment Points Composable
 * Handles point loading, filtering, and live subscriptions for equipment
 */

import { ref, computed } from 'vue'
import { useDeviceStore } from '../stores/deviceStore'
import configService from '../services/ConfigurationService'

export function useEquipmentPoints(equipment) {
  const deviceStore = useDeviceStore()
  const adapter = computed(() => deviceStore.adapter || deviceStore.getAdapter())

  // State
  const loading = ref(false)
  const allPoints = ref([]) // Store all points
  const points = ref([]) // Displayed points (limited)
  const allPointsCount = ref(0)
  const showAllPoints = ref(false)
  const pointsExpanded = ref(false)
  const pointsLoaded = ref(false)
  const pointLiveValues = ref(new Map())
  
  const INITIAL_POINT_LIMIT = 10 // Show first 10 points initially

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

  // Get visible points (not hidden by configuration) for subscriptions
  const visiblePoints = computed(() => {
    return allPoints.value.filter(point => {
      return !configService.isPointHidden(point, equipment.value?.type, equipment.value?.id)
    })
  })

  // Get trendable points (numeric types)
  const trendablePoints = computed(() => {
    return visiblePoints.value.filter(p =>
      ['Temperature', 'Pressure', 'Flow', 'Speed', 'Power', 'Current', 'Voltage', 'Setpoint'].includes(p.type)
    ).slice(0, 6) // Max 6 tabs for clean UI
  })
  
  // Sort points by priority: alarms first, then history, then alphabetical
  const sortPointsByPriority = (pointsList) => {
    return [...pointsList].sort((a, b) => {
      // Priority 1: Points with alarms
      const aHasAlarm = a.hasAlarm || false
      const bHasAlarm = b.hasAlarm || false
      if (aHasAlarm && !bHasAlarm) return -1
      if (!aHasAlarm && bHasAlarm) return 1
      
      // Priority 2: Points with history
      const aHasHistory = a.hasHistory || false
      const bHasHistory = b.hasHistory || false
      if (aHasHistory && !bHasHistory) return -1
      if (!aHasHistory && bHasHistory) return 1
      
      // Priority 3: Alphabetical by name
      return (a.name || '').localeCompare(b.name || '')
    })
  }
  
  // Get displayed points (limited or all based on showAllPoints)
  // Also filters out hidden points based on configuration
  const getDisplayedPoints = () => {
    // Check if there's a custom order configured
    const customOrdered = configService.applyPointOrder(
      allPoints.value,
      equipment.value?.type,
      equipment.value?.id
    )
    
    // If custom order was applied (different from original), use it
    // Otherwise fall back to priority sorting
    const hasCustomOrder = customOrdered.length > 0 && 
      customOrdered.some((p, i) => allPoints.value[i]?.id !== p.id)
    
    const sorted = hasCustomOrder ? customOrdered : sortPointsByPriority(allPoints.value)
    
    // Filter out hidden points based on configuration
    const filtered = sorted.filter(point => {
      return !configService.isPointHidden(point, equipment.value.type, equipment.value.id)
    })
    
    console.log(`🔍 useEquipmentPoints: Total points: ${sorted.length}`)
    console.log(`🔍 useEquipmentPoints: Using ${hasCustomOrder ? 'custom' : 'priority'} order`)
    console.log(`🔍 useEquipmentPoints: After hiding: ${filtered.length}`)
    console.log(`🔍 useEquipmentPoints: Points with alarms: ${filtered.filter(p => p.hasAlarm).length}`)
    console.log(`🔍 useEquipmentPoints: Points with history: ${filtered.filter(p => p.hasHistory).length}`)
    console.log(`🔍 useEquipmentPoints: showAllPoints: ${showAllPoints.value}`)
    console.log(`🔍 useEquipmentPoints: INITIAL_POINT_LIMIT: ${INITIAL_POINT_LIMIT}`)
    
    if (showAllPoints.value || filtered.length <= INITIAL_POINT_LIMIT) {
      console.log(`✅ useEquipmentPoints: Returning all ${filtered.length} points`)
      return filtered
    }
    
    const limited = filtered.slice(0, INITIAL_POINT_LIMIT)
    console.log(`✅ useEquipmentPoints: Returning limited ${limited.length} of ${filtered.length} points`)
    console.log(`   First 3 points:`, limited.slice(0, 3).map(p => ({ name: p.name, hasAlarm: p.hasAlarm, hasHistory: p.hasHistory })))
    
    return limited
  }

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
        allPoints.value = equipmentPoints
        allPointsCount.value = equipmentPoints.length
        points.value = getDisplayedPoints()
        pointsLoaded.value = true
        console.log(`✅ Loaded ${equipmentPoints.length} points for ${equipment.value.name}`)
        console.log(`   Showing ${points.value.length} of ${allPointsCount.value} points`)
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

      // Subscribe to live updates ONLY for visible (non-hidden) points
      const currentAdapter = adapter.value
      if (currentAdapter && currentAdapter.subscribeToEquipment && points.value.length > 0) {
        const visibleCount = visiblePoints.value.length
        const hiddenCount = allPoints.value.length - visibleCount
        console.log(`📡 Subscribing to ${visibleCount} visible points (${hiddenCount} hidden)`)
        
        equipmentUnsubscribe = currentAdapter.subscribeToEquipment(equipment.value.id, (update) => {
          // Only process updates for visible (non-hidden) points
          const point = visiblePoints.value.find(p => p.id === update.pointId)
          if (!point) {
            // Point is hidden, ignore update to save resources
            return
          }
          
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
    points.value = getDisplayedPoints()
    console.log(`📊 ${showAllPoints.value ? 'Showing all' : 'Showing limited'} points: ${points.value.length} of ${allPointsCount.value}`)
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
    allPoints,  // Expose all points for editing
    allPointsCount,
    showAllPoints,
    pointsExpanded,
    pointsLoaded,
    pointLiveValues,

    // Computed
    pointCountLabel,
    canShowPoints,
    showToggleButton,
    visiblePoints,  // Expose visible points
    trendablePoints,

    // Methods
    loadPoints,
    togglePoints,
    toggleShowAllPoints,
    getPointDisplayValue,
    cleanup
  }
}
