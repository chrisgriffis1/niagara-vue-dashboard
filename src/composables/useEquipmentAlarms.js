/**
 * Equipment Alarms Composable
 * Handles alarm integration and display for equipment
 */

import { computed } from 'vue'
import { useAlarmStore } from '../stores/alarmStore'

export function useEquipmentAlarms(equipmentId) {
  const alarmStore = useAlarmStore()

  // Computed properties
  const equipmentAlarms = computed(() => {
    return alarmStore.activeAlarms.filter(alarm => alarm.equipmentId === equipmentId.value)
  })

  // Display status - show alarm priority if alarms exist
  const displayStatus = computed(() => {
    if (equipmentAlarms.value.length > 0) {
      const priorities = equipmentAlarms.value.map(a => a.priority)
      if (priorities.includes('critical')) return 'critical'
      if (priorities.includes('high')) return 'high'
      if (priorities.includes('medium')) return 'medium'
    }
    return 'ok' // Default status
  })

  // Status indicator color based on equipment status and alarms
  const statusClass = computed(() => {
    // Check if equipment has alarms - highest priority alarm determines status
    if (equipmentAlarms.value.length > 0) {
      const priorities = equipmentAlarms.value.map(a => a.priority)
      if (priorities.includes('critical')) return 'error'
      if (priorities.includes('high')) return 'warning'
      if (priorities.includes('medium')) return 'warning'
    }

    return 'ok' // Default to ok
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

  // Get alarm icon based on priority
  const getAlarmIcon = (priority) => {
    switch (priority) {
      case 'critical': return '🚨'
      case 'high': return '⚡'
      case 'medium': return '⚠️'
      case 'low': return 'ℹ️'
      default: return '⚠️'
    }
  }

  // Check if equipment has any alarms
  const hasAlarms = computed(() => equipmentAlarms.value.length > 0)

  // Get highest priority alarm
  const highestPriorityAlarm = computed(() => {
    if (equipmentAlarms.value.length === 0) return null

    const priorities = ['critical', 'high', 'medium', 'low']
    for (const priority of priorities) {
      const alarm = equipmentAlarms.value.find(a => a.priority === priority)
      if (alarm) return alarm
    }
    return equipmentAlarms.value[0]
  })

  return {
    // State
    equipmentAlarms,

    // Computed
    displayStatus,
    statusClass,
    hasAlarms,
    highestPriorityAlarm,

    // Methods
    getPointAlarm,
    getAlarmIcon
  }
}
