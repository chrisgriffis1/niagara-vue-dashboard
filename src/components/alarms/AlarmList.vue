<template>
  <div class="alarm-list card">
    <div class="alarm-header">
      <h3>Active Alarms</h3>
      <span class="alarm-count" :class="countClass">
        {{ activeAlarmCount }}
      </span>
    </div>
    <div class="alarm-body">
      <div
        v-for="alarm in sortedAlarms"
        :key="alarm.id"
        class="alarm-item"
        :class="`priority-${alarm.priority}`"
      >
        <div class="alarm-info">
          <span class="status-dot" :class="priorityClass(alarm.priority)"></span>
          <div class="alarm-details">
            <p class="alarm-message">{{ alarm.message }}</p>
            <p class="alarm-timestamp">{{ formatTime(alarm.timestamp) }}</p>
          </div>
        </div>
        <div class="alarm-actions">
          <button
            v-if="!alarm.acknowledged"
            @click="acknowledgeAlarm(alarm.id)"
            class="ack-btn"
          >
            Acknowledge
          </button>
        </div>
      </div>
      <p v-if="activeAlarmCount === 0" class="no-alarms">
        No active alarms
      </p>
    </div>
  </div>
</template>

<script setup>
/**
 * AlarmList Component
 * Displays active building alarms with priority sorting
 */

import { computed } from 'vue'
import { useAlarmStore } from '../../stores/alarmStore'

const alarmStore = useAlarmStore()

const activeAlarmCount = computed(() => alarmStore.activeAlarmCount)

const sortedAlarms = computed(() => {
  const alarms = [...alarmStore.activeAlarms]
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return alarms.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
})

const countClass = computed(() => {
  if (alarmStore.hasCriticalAlarms) return 'critical'
  if (activeAlarmCount.value > 0) return 'warning'
  return 'ok'
})

const priorityClass = (priority) => {
  switch (priority) {
    case 'critical': return 'error'
    case 'high': return 'warning'
    default: return 'ok'
  }
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

const acknowledgeAlarm = (alarmId) => {
  alarmStore.acknowledgeAlarm(alarmId)
}
</script>

<style scoped>
.alarm-list {
  margin-bottom: var(--spacing-lg);
}

.alarm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.alarm-header h3 {
  margin: 0;
}

.alarm-count {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
}

.alarm-count.critical {
  background-color: var(--color-error);
}

.alarm-count.warning {
  background-color: var(--color-warning);
  color: var(--color-bg-primary);
}

.alarm-count.ok {
  background-color: var(--color-success);
  color: var(--color-bg-primary);
}

.alarm-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.alarm-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-border);
}

.alarm-item.priority-critical {
  border-left-color: var(--color-error);
}

.alarm-item.priority-high {
  border-left-color: var(--color-warning);
}

.alarm-info {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  flex: 1;
}

.alarm-details {
  flex: 1;
}

.alarm-message {
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: var(--font-weight-medium);
}

.alarm-timestamp {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.ack-btn {
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  min-height: unset;
}

.no-alarms {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--spacing-lg);
}

@media (max-width: 768px) {
  .alarm-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .alarm-actions {
    width: 100%;
  }

  .ack-btn {
    width: 100%;
  }
}
</style>

