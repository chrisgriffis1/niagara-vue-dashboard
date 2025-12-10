<template>
  <div class="dashboard-summary">
    <!-- Building Health Card -->
    <div class="summary-card card health-card">
      <div class="card-icon">🏢</div>
      <div class="card-content">
        <h3>Building Health</h3>
        <div class="health-score" :class="healthClass">
          {{ healthScore }}%
        </div>
        <p class="health-label">{{ healthLabel }}</p>
      </div>
    </div>

    <!-- Active Alarms Card -->
    <div class="summary-card card alarm-card" @click="$emit('show-alarms')">
      <div class="card-icon">🔔</div>
      <div class="card-content">
        <h3>Active Alarms</h3>
        <div class="alarm-breakdown">
          <div v-if="criticalCount > 0" class="alarm-stat critical">
            <span class="count">{{ criticalCount }}</span>
            <span class="label">Critical</span>
          </div>
          <div v-if="highCount > 0" class="alarm-stat high">
            <span class="count">{{ highCount }}</span>
            <span class="label">High</span>
          </div>
          <div v-if="mediumCount > 0" class="alarm-stat medium">
            <span class="count">{{ mediumCount }}</span>
            <span class="label">Medium</span>
          </div>
          <div v-if="activeAlarmCount === 0" class="no-alarms-stat">
            <span>✓ All Clear</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Equipment Status Card -->
    <div class="summary-card card equipment-card" @click="$emit('view-all')">
      <div class="card-icon">⚙️</div>
      <div class="card-content">
        <h3>Equipment Status</h3>
        <div class="equipment-stats">
          <div class="stat-row">
            <span class="stat-label">Total Devices</span>
            <span class="stat-value">{{ totalEquipment }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">With Alarms</span>
            <span class="stat-value warning">{{ equipmentWithAlarms }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Online</span>
            <span class="stat-value success">{{ onlineEquipment }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions Card -->
    <div class="summary-card card actions-card">
      <div class="card-icon">⚡</div>
      <div class="card-content">
        <h3>Quick Actions</h3>
        <div class="quick-actions">
          <button 
            v-if="criticalCount > 0"
            @click="$emit('filter-critical')" 
            class="action-btn critical"
          >
            ⚠ View Critical
          </button>
          <button 
            v-if="unacknowledgedCount > 0"
            @click="$emit('show-alarms')" 
            class="action-btn"
          >
            ✓ Ack Alarms ({{ unacknowledgedCount }})
          </button>
          <button 
            @click="$emit('view-all')" 
            class="action-btn"
          >
            📋 View All Equipment
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * DashboardSummary Component
 * Shows building health, alarm counts, and quick actions
 * Displayed on initial login for quick situational awareness
 */

import { computed } from 'vue'
import { useDeviceStore } from '../../stores/deviceStore'
import { useAlarmStore } from '../../stores/alarmStore'

const emit = defineEmits(['filter-alarms', 'filter-critical', 'show-alarms', 'view-all'])

const deviceStore = useDeviceStore()
const alarmStore = useAlarmStore()

// Equipment stats
const totalEquipment = computed(() => deviceStore.allDevices.length)
const equipmentWithAlarms = computed(() => {
  const alarmEquipmentIds = new Set(alarmStore.activeAlarms.map(a => a.equipmentId))
  return alarmEquipmentIds.size
})
const onlineEquipment = computed(() => {
  return deviceStore.allDevices.filter(e => e.status !== 'offline').length
})

// Alarm stats
const activeAlarmCount = computed(() => alarmStore.activeAlarmCount)
const unacknowledgedCount = computed(() => alarmStore.unacknowledgedAlarms.length)
const criticalCount = computed(() => 
  alarmStore.alarmsByPriority('critical').filter(a => a.active).length
)
const highCount = computed(() => 
  alarmStore.alarmsByPriority('high').filter(a => a.active).length
)
const mediumCount = computed(() => 
  alarmStore.alarmsByPriority('medium').filter(a => a.active).length
)

// Building health score (0-100)
const healthScore = computed(() => {
  if (totalEquipment.value === 0) return 100
  
  // Calculate health based on alarms and equipment status
  let score = 100
  
  // Deduct for alarms
  score -= criticalCount.value * 15
  score -= highCount.value * 10
  score -= mediumCount.value * 5
  
  // Deduct for offline equipment
  const offlineCount = totalEquipment.value - onlineEquipment.value
  score -= offlineCount * 10
  
  return Math.max(0, Math.min(100, score))
})

const healthClass = computed(() => {
  if (healthScore.value >= 90) return 'excellent'
  if (healthScore.value >= 75) return 'good'
  if (healthScore.value >= 50) return 'fair'
  return 'poor'
})

const healthLabel = computed(() => {
  if (healthScore.value >= 90) return 'Excellent'
  if (healthScore.value >= 75) return 'Good'
  if (healthScore.value >= 50) return 'Fair'
  return 'Needs Attention'
})
</script>

<style scoped>
.dashboard-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.summary-card {
  padding: var(--spacing-xl);
  display: flex;
  gap: var(--spacing-lg);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.summary-card.health-card {
  cursor: default;
}

.summary-card.health-card:hover {
  transform: none;
}

.actions-card {
  cursor: default;
}

.actions-card:hover {
  transform: none;
}

.card-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

/* Health Card */
.health-score {
  font-size: 48px;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  margin-bottom: var(--spacing-xs);
}

.health-score.excellent {
  color: var(--color-success);
}

.health-score.good {
  color: #60d394;
}

.health-score.fair {
  color: var(--color-warning);
}

.health-score.poor {
  color: var(--color-error);
}

.health-label {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Alarm Card */
.alarm-breakdown {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.alarm-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.alarm-stat .count {
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.alarm-stat.critical .count {
  color: var(--color-error);
}

.alarm-stat.high .count {
  color: var(--color-warning);
}

.alarm-stat.medium .count {
  color: var(--color-info);
}

.alarm-stat .label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.no-alarms-stat {
  display: flex;
  align-items: center;
  color: var(--color-success);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

/* Equipment Card */
.equipment-stats {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) 0;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.stat-value.success {
  color: var(--color-success);
}

.stat-value.warning {
  color: var(--color-warning);
}

/* Quick Actions */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.action-btn {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  text-align: left;
  min-height: var(--touch-target-min);
}

.action-btn:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-border-light);
}

.action-btn.critical {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: var(--color-error);
  color: var(--color-error);
  font-weight: var(--font-weight-semibold);
}

.action-btn.critical:hover {
  background-color: rgba(239, 68, 68, 0.2);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .dashboard-summary {
    grid-template-columns: 1fr;
  }

  .summary-card {
    padding: var(--spacing-lg);
  }

  .card-icon {
    font-size: 36px;
  }

  .health-score {
    font-size: 36px;
  }

  .alarm-stat .count {
    font-size: 24px;
  }
}
</style>

