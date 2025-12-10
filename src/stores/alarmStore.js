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
    },

    /**
     * Get unacknowledged alarms
     */
    unacknowledgedAlarms: (state) => {
      return state.alarms.filter(alarm => alarm.active && !alarm.acknowledged)
    }
  },

  actions: {
    /**
     * Initialize alarm subscription with adapter
     */
    async initializeAlarms(adapter) {
      if (!adapter) {
        console.error('No adapter provided to alarm store')
        return
      }

      // Unsubscribe from previous subscription if exists
      if (this.unsubscribe) {
        this.unsubscribe()
      }

      // Subscribe to alarm updates
      this.unsubscribe = adapter.subscribeToAlarms((alarms) => {
        this.alarms = alarms
        console.log(`Alarms updated: ${alarms.length} total`)
      })
    },

    /**
     * Subscribe to alarm updates from adapter (legacy method)
     */
    subscribeToAlarms(adapter) {
      this.initializeAlarms(adapter)
    },

    /**
     * Add a new alarm
     */
    addAlarm(alarm) {
      this.alarms.push({
        id: `alarm_${Date.now()}`,
        timestamp: new Date(),
        active: true,
        acknowledged: false,
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
        console.log(`Alarm acknowledged: ${alarmId}`)
      }
    },

    /**
     * Clear an alarm
     */
    clearAlarm(alarmId) {
      const alarm = this.alarms.find(a => a.id === alarmId)
      if (alarm) {
        alarm.active = false
        console.log(`Alarm cleared: ${alarmId}`)
      }
    },

    /**
     * Cleanup subscriptions
     */
    cleanup() {
      if (this.unsubscribe) {
        this.unsubscribe()
        this.unsubscribe = null
      }
    }
  }
})

