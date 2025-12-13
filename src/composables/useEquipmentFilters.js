/**
 * Equipment Filters Composable
 * Handles all filtering logic for equipment grid
 */

import { ref, computed } from 'vue'
import { useAlarmStore } from '../stores/alarmStore'

export function useEquipmentFilters(equipment, alarms) {
  const alarmStore = useAlarmStore()

  // Filter state
  const selectedType = ref(null)
  const selectedLocation = ref(null)
  const selectedAlarmFilter = ref(null)
  const showAdvancedFilters = ref(false)
  const selectedCommunicationStatus = ref(null)
  const selectedOverride = ref(null)
  const selectedMode = ref(null)
  const selectedOccupancy = ref(null)
  const selectedRunning = ref(null)

  // Computed filter options
  const equipmentTypes = computed(() => {
    const types = [...new Set(equipment.value?.map(eq => eq.type) || [])]
    return types.filter(type => type).sort()
  })

  const equipmentLocations = computed(() => {
    const locations = [...new Set(equipment.value?.map(eq => eq.zone || eq.location) || [])]
    return locations.filter(loc => loc).sort()
  })

  // Filter counts
  const getTypeCount = (type) => {
    return equipment.value?.filter(eq => eq.type === type).length || 0
  }

  const getLocationCount = (location) => {
    return equipment.value?.filter(eq => (eq.zone || eq.location) === location).length || 0
  }

  const getAlarmCount = (filterType) => {
    if (!equipment.value) return 0

    switch (filterType) {
      case 'with-alarms':
        return equipment.value.filter(eq => {
          const eqAlarms = alarmStore.activeAlarms.filter(alarm => alarm.equipmentId === eq.id)
          return eqAlarms.length > 0
        }).length

      case 'critical':
      case 'high':
      case 'medium':
      case 'warning':
        return equipment.value.filter(eq => {
          const eqAlarms = alarmStore.activeAlarms.filter(alarm => alarm.equipmentId === eq.id)
          return eqAlarms.some(alarm => alarm.priority === filterType)
        }).length

      default:
        return equipment.value.length
    }
  }

  // Check if any filters are active
  const hasActiveFilters = computed(() => {
    return selectedType.value !== null ||
           selectedLocation.value !== null ||
           selectedAlarmFilter.value !== null ||
           selectedCommunicationStatus.value !== null ||
           selectedOverride.value !== null ||
           selectedMode.value !== null ||
           selectedOccupancy.value !== null ||
           selectedRunning.value !== null
  })

  // Clear all filters
  const clearAllFilters = () => {
    selectedType.value = null
    selectedLocation.value = null
    selectedAlarmFilter.value = null
    selectedCommunicationStatus.value = null
    selectedOverride.value = null
    selectedMode.value = null
    selectedOccupancy.value = null
    selectedRunning.value = null
  }

  return {
    // State
    selectedType,
    selectedLocation,
    selectedAlarmFilter,
    showAdvancedFilters,
    selectedCommunicationStatus,
    selectedOverride,
    selectedMode,
    selectedOccupancy,
    selectedRunning,

    // Computed
    equipmentTypes,
    equipmentLocations,
    hasActiveFilters,

    // Methods
    getTypeCount,
    getLocationCount,
    getAlarmCount,
    clearAllFilters
  }
}
