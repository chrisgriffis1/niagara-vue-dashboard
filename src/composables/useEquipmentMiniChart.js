/**
 * Equipment Mini Chart Composable
 * Handles sparkline/mini-chart data loading and management
 */

import { ref, computed } from 'vue'
import { useDeviceStore } from '../stores/deviceStore'

export function useEquipmentMiniChart(equipment, trendablePoints) {
  const deviceStore = useDeviceStore()
  const adapter = computed(() => deviceStore.adapter || deviceStore.getAdapter())

  // State
  const miniChartData = ref([])
  const loadingMiniChart = ref(false)
  const sparklineAttempted = ref(false)
  const selectedMiniPoint = ref(null)

  // Computed
  const hasSparklineData = computed(() => {
    return loadingMiniChart.value || miniChartData.value.length > 0 || sparklineAttempted.value
  })

  // Methods
  const loadMiniChartData = async (point = null) => {
    if (!equipment.value || loadingMiniChart.value) return

    const pointToLoad = point || selectedMiniPoint.value || getPrimaryPoint()
    if (!pointToLoad) return

    selectedMiniPoint.value = pointToLoad
    loadingMiniChart.value = true
    sparklineAttempted.value = true

    try {
      const currentAdapter = adapter.value
      if (!currentAdapter) {
        console.warn('No adapter available for mini chart')
        return
      }

      console.log(`📊 Loading mini chart for: ${pointToLoad.name}`)

      // Get last hour of data
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 60 * 60 * 1000) // 1 hour ago

      const historyData = await currentAdapter.getHistoricalData(pointToLoad, {
        startDate,
        endDate,
        explicitRange: true
      })

      if (historyData && Array.isArray(historyData)) {
        // Take last 12 points for sparkline (5-minute intervals)
        miniChartData.value = historyData.slice(-12)
        console.log(`✅ Loaded ${miniChartData.value.length} mini chart points for ${pointToLoad.name}`)
      } else {
        miniChartData.value = []
        console.log(`⚠️ No mini chart data for ${pointToLoad.name}`)
      }
    } catch (error) {
      console.error('❌ Failed to load mini chart data:', error)
      miniChartData.value = []
    } finally {
      loadingMiniChart.value = false
    }
  }

  const selectMiniPoint = async (point) => {
    if (selectedMiniPoint.value?.id === point.id) return
    await loadMiniChartData(point)
  }

  const getPrimaryPoint = () => {
    // Find best point for initial sparkline
    const availablePoints = trendablePoints.value

    // Priority: Temperature > Pressure > Flow > First available
    const priorityOrder = ['Temperature', 'Pressure', 'Flow']
    for (const type of priorityOrder) {
      const point = availablePoints.find(p => p.type === type)
      if (point) return point
    }

    // Fall back to first available
    return availablePoints[0] || null
  }

  const getMiniChartColor = () => {
    // Color based on equipment type for consistency
    const typeColors = {
      'VAV': '#3b82f6',      // Blue
      'AHU': '#8b5cf6',      // Purple
      'Chiller': '#06b6d4',  // Cyan
      'Boiler': '#ef4444',   // Red
      'Pump': '#10b981',     // Green
      'Fan': '#f59e0b',      // Amber
      'default': '#6b7280'   // Gray
    }

    return typeColors[equipment.value?.type] || typeColors.default
  }

  const handleTrendClick = () => {
    if (selectedMiniPoint.value) {
      // Emit event to parent to open full trending
      // This will be handled by the parent component
      console.log(`📊 Opening full trend for: ${selectedMiniPoint.value.name}`)
    }
  }

  // Auto-load sparkline on mount if equipment has points
  const initializeSparkline = async () => {
    if (equipment.value && trendablePoints.value.length > 0) {
      // Small delay to avoid overwhelming the server on initial load
      setTimeout(() => {
        loadMiniChartData()
      }, Math.random() * 2000 + 500) // Random delay 500-2500ms
    }
  }

  return {
    // State
    miniChartData,
    loadingMiniChart,
    sparklineAttempted,
    selectedMiniPoint,

    // Computed
    hasSparklineData,

    // Methods
    loadMiniChartData,
    selectMiniPoint,
    getMiniChartColor,
    handleTrendClick,
    initializeSparkline
  }
}
