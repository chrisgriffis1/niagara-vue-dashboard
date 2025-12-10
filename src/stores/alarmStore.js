/**
 * Alarm Store - Pinia State Management
 * Manages building alarms and notifications
 */

import { defineStore } from 'pinia'

export const useAlarmStore = defineStore('alarm', {
  state: () => ({
    alarms: [],
    unsubscribe: null,
    loading: false,
    error: null
  }),

  getters: {
    /**
     * Get all active alarms
     */
    activeAlarms: (state) => state.alarms.filter(alarm => alarm.active),

    /**
     * Get alarms by priority
     */
    alarmsByPriority: (state) => (priority) => {
      return state.alarms.filter(alarm => alarm.priority === priority)
    },

    /**
     * Count of active alarms
     */
    activeAlarmCount: (state) => {
      return state.alarms.filter(alarm => alarm.active).length
    },

    /**
     * Check if there are critical alarms
     */
    hasCriticalAlarms: (state) => {
      return state.alarms.some(alarm => alarm.active && alarm.priority === 'critical')
    }
  },

  actions: {
    /**
     * Subscribe to alarm updates from adapter
     */
    subscribeToAlarms(adapter) {
      if (this.unsubscribe) {
        this.unsubscribe()
      }

      this.unsubscribe = adapter.subscribeToAlarms((alarms) => {
        this.alarms = alarms
      })
    },

    /**
     * Add a new alarm
     */
    addAlarm(alarm) {
      this.alarms.push({
        id: Date.now(),
        timestamp: new Date(),
        active: true,
        ...alarm
      })
    },

    /**
     * Acknowledge an alarm
     */
    acknowledgeAlarm(alarmId) {
      const alarm = this.alarms.find(a => a.id === alarmId)
      if (alarm) {
        alarm.acknowledged = true
      }
    },

    /**
     * Clear an alarm
     */
    clearAlarm(alarmId) {
      const alarm = this.alarms.find(a => a.id === alarmId)
      if (alarm) {
        alarm.active = false
      }
    }
  }
})

