<template>
  <div class="alarm-list card">
    <div class="alarm-header">
      <div class="header-title">
        <h3>🔔 Active Alarms</h3>
        <span v-if="unacknowledgedCount > 0" class="unack-badge">
          {{ unacknowledgedCount }} unacknowledged
        </span>
      </div>
      <span class="alarm-count" :class="countClass">
        {{ activeAlarmCount }}
      </span>
    </div>

    <!-- Alarm Stats -->
    <div v-if="activeAlarmCount > 0" class="alarm-stats">
      <div v-if="criticalCount > 0" class="stat-chip critical">
        <span class="chip-icon">⚠</span>
        {{ criticalCount }} Critical
      </div>
      <div v-if="highCount > 0" class="stat-chip high">
        <span class="chip-icon">⚡</span>
        {{ highCount }} High
      </div>
      <div v-if="mediumCount > 0" class="stat-chip medium">
        <span class="chip-icon">ℹ</span>
        {{ mediumCount }} Medium
      </div>
      <div v-if="lowCount > 0" class="stat-chip low">
        <span class="chip-icon">•</span>
        {{ lowCount }} Low
      </div>
    </div>

    <div class="alarm-body">
      <!-- Alarm Items -->
      <div
        v-for="alarm in sortedAlarms"
        :key="alarm.id"
        class="alarm-item"
        :class="[
          `priority-${alarm.priority}`,
          { acknowledged: alarm.acknowledged }
        ]"
      >
        <div class="alarm-content">
          <!-- Priority Icon & Status Dot -->
          <div class="alarm-indicator">
            <span class="priority-icon">{{ getPriorityIcon(alarm.priority) }}</span>
            <span class="status-dot" :class="priorityClass(alarm.priority)"></span>
          </div>

          <!-- Alarm Details -->
          <div class="alarm-details">
            <div class="alarm-header-row">
              <span class="alarm-priority-label">{{ alarm.priority.toUpperCase() }}</span>
              <span class="alarm-time">{{ formatTimeAgo(alarm.timestamp) }}</span>
            </div>
            <p class="alarm-message">{{ alarm.message }}</p>
            <div class="alarm-meta">
              <span 
                v-if="alarm.equipmentId" 
                class="equipment-link"
                @click="handleEquipmentClick(alarm.equipmentId)"
              >
                📍 {{ getEquipmentName(alarm.equipmentId) }}
              </span>
              <span class="alarm-timestamp">
                {{ formatTime(alarm.timestamp) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Alarm Actions -->
        <div class="alarm-actions">
          <button
            v-if="!alarm.acknowledged"
            @click="acknowledgeAlarm(alarm.id)"
            class="ack-btn primary"
          >
            ✓ Acknowledge
          </button>
          <span v-else class="acknowledged-badge">
            ✓ Acknowledged
          </span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="activeAlarmCount === 0" class="no-alarms">
        <span class="no-alarms-icon">✓</span>
        <p>No active alarms</p>
        <p class="no-alarms-subtitle">All systems operating normally</p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * AlarmList Component
 * Displays active building alarms with priority sorting
 * Tesla-inspired design with visual priority indicators
 */

import { computed } from 'vue'
import { useAlarmStore } from '../../stores/alarmStore'
import { useDeviceStore } from '../../stores/deviceStore'

const emit = defineEmits(['equipment-clicked'])

const alarmStore = useAlarmStore()
const deviceStore = useDeviceStore()

const activeAlarmCount = computed(() => alarmStore.activeAlarmCount)
const unacknowledgedCount = computed(() => alarmStore.unacknowledgedAlarms.length)

const sortedAlarms = computed(() => {
  const alarms = [...alarmStore.activeAlarms]
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return alarms.sort((a, b) => {
    // Sort by priority first, then by acknowledged status, then by time
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    if (a.acknowledged !== b.acknowledged) {
      return a.acknowledged ? 1 : -1
    }
    return new Date(b.timestamp) - new Date(a.timestamp)
  })
})

// Alarm counts by priority
const criticalCount = computed(() => 
  alarmStore.alarmsByPriority('critical').filter(a => a.active).length
)
const highCount = computed(() => 
  alarmStore.alarmsByPriority('high').filter(a => a.active).length
)
const mediumCount = computed(() => 
  alarmStore.alarmsByPriority('medium').filter(a => a.active).length
)
const lowCount = computed(() => 
  alarmStore.alarmsByPriority('low').filter(a => a.active).length
)

const countClass = computed(() => {
  if (alarmStore.hasCriticalAlarms) return 'critical'
  if (activeAlarmCount.value > 0) return 'warning'
  return 'ok'
})

const priorityClass = (priority) => {
  switch (priority) {
    case 'critical': return 'error'
    case 'high': return 'warning'
    case 'medium': return 'info'
    default: return 'ok'
  }
}

const getPriorityIcon = (priority) => {
  switch (priority) {
    case 'critical': return '⚠'
    case 'high': return '⚡'
    case 'medium': return 'ℹ'
    default: return '•'
  }
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatTimeAgo = (timestamp) => {
  const now = new Date()
  const date = new Date(timestamp)
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

const getEquipmentName = (equipmentId) => {
  const equipment = deviceStore.getDeviceById(equipmentId)
  return equipment ? equipment.name : equipmentId
}

const acknowledgeAlarm = (alarmId) => {
  alarmStore.acknowledgeAlarm(alarmId)
}

const handleEquipmentClick = (equipmentId) => {
  emit('equipment-clicked', equipmentId)
  console.log('Equipment clicked from alarm:', equipmentId)
}
</script>

<style scoped>
.alarm-list {
  margin-bottom: var(--spacing-lg);
  overflow: hidden;
}

/* Header */
.alarm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.alarm-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.unack-badge {
  font-size: var(--font-size-xs);
  color: var(--color-warning);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: var(--font-weight-semibold);
}

.alarm-count {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-lg);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  min-width: 44px;
  text-align: center;
}

.alarm-count.critical {
  background-color: var(--color-error);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
  animation: pulseCritical 1.5s ease-in-out infinite;
}

@keyframes pulseCritical {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
  }
  50% { 
    transform: scale(1.1);
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.9);
  }
}

/* Alarm Stats */
.alarm-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border: 1px solid;
}

.stat-chip.critical {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: var(--color-error);
  color: var(--color-error);
}

.stat-chip.high {
  background-color: rgba(251, 191, 36, 0.1);
  border-color: var(--color-warning);
  color: var(--color-warning);
}

.stat-chip.medium {
  background-color: rgba(59, 130, 246, 0.1);
  border-color: var(--color-info);
  color: var(--color-info);
}

.stat-chip.low {
  background-color: rgba(160, 160, 160, 0.1);
  border-color: var(--color-text-tertiary);
  color: var(--color-text-secondary);
}

.chip-icon {
  font-size: var(--font-size-md);
}

/* Alarm Body */
.alarm-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

/* Alarm Item */
.alarm-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--color-border);
  transition: all var(--transition-fast);
}

.alarm-item:hover {
  background-color: var(--color-bg-hover);
  transform: translateX(2px);
}

.alarm-item.priority-critical {
  border-left-color: var(--color-error);
  background-color: rgba(239, 68, 68, 0.05);
  animation: pulseAlarmCard 2s ease-in-out infinite;
}

@keyframes pulseAlarmCard {
  0%, 100% {
    border-left-width: 4px;
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
  50% {
    border-left-width: 6px;
    box-shadow: -4px 0 12px rgba(239, 68, 68, 0.4);
  }
}

.alarm-item.priority-high {
  border-left-color: var(--color-warning);
  background-color: rgba(251, 191, 36, 0.05);
}

.alarm-item.priority-medium {
  border-left-color: var(--color-info);
}

.alarm-item.acknowledged {
  opacity: 0.6;
  border-left-color: var(--color-text-tertiary);
}

.alarm-content {
  display: flex;
  gap: var(--spacing-md);
  flex: 1;
  align-items: flex-start;
}

.alarm-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.priority-icon {
  font-size: var(--font-size-xl);
}

.alarm-details {
  flex: 1;
  min-width: 0;
}

.alarm-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
  gap: var(--spacing-sm);
}

.alarm-priority-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-tertiary);
}

.alarm-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.alarm-message {
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  line-height: 1.4;
}

.alarm-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.equipment-link {
  color: var(--color-accent-primary);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.equipment-link:hover {
  color: var(--color-accent-hover);
}

/* Actions */
.alarm-actions {
  display: flex;
  align-items: center;
}

.ack-btn {
  font-size: var(--font-size-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  min-height: var(--touch-target-min);
  white-space: nowrap;
}

.acknowledged-badge {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  color: var(--color-success);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

/* Empty State */
.no-alarms {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-secondary);
}

.no-alarms-icon {
  font-size: 48px;
  display: block;
  margin-bottom: var(--spacing-md);
  color: var(--color-success);
}

.no-alarms p {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.no-alarms-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .alarm-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .alarm-content {
    width: 100%;
  }

  .alarm-actions {
    width: 100%;
  }

  .ack-btn {
    width: 100%;
  }

  .alarm-stats {
    gap: var(--spacing-xs);
  }

  .stat-chip {
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}
</style>


