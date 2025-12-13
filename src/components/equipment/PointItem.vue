<template>
  <div 
    class="point-item-compact"
    :class="getPointClasses()"
    @click="$emit('click', point)"
  >
    <div class="point-left">
      <!-- Status Badge -->
      <span class="status-badge-mini" :class="`status-${getPointStatus()}`">
        {{ getStatusIcon() }}
      </span>
      
      <!-- Point Name -->
      <span class="point-name">{{ point.name }}</span>
      
      <!-- Badges -->
      <span v-if="points.pointLiveValues.value.has(point.id)" class="badge-mini live-badge">LIVE</span>
      <span v-if="alarms.getPointAlarm(point)" class="badge-mini alarm-badge-mini">ALM</span>
      <span v-if="point.overridden" class="badge-mini override-badge-mini">OVR</span>
      <span v-if="point.emergencyOverride" class="badge-mini emerg-badge-mini">EMG</span>
    </div>
    
    <div class="point-right">
      <span class="point-value" :class="getValueClasses()">
        {{ points.getPointDisplayValue(point) }}
      </span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  point: {
    type: Object,
    required: true
  },
  points: {
    type: Object,
    required: true
  },
  alarms: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])

function getPointStatus() {
  if (props.alarms.getPointAlarm(props.point)) return 'alarm'
  if (props.point.emergencyOverride) return 'emerg-override'
  if (props.point.overridden) return 'overridden'
  if (props.point.status === 'stale' || props.point.stale) return 'stale'
  if (props.point.status === 'down' || props.point.down || props.point.status === 'fault') return 'down'
  return 'ok'
}

function getStatusIcon() {
  const status = getPointStatus()
  const icons = {
    'alarm': '🚨',
    'emerg-override': '⚠️',
    'overridden': '🔧',
    'stale': '⏱️',
    'down': '❌',
    'ok': '✓'
  }
  return icons[status] || '●'
}

function getPointClasses() {
  const classes = []
  const status = getPointStatus()
  
  classes.push(`status-${status}`)
  
  if (props.alarms.getPointAlarm(props.point)) classes.push('has-alarm')
  if (isSetpoint()) classes.push('is-setpoint')
  if (props.point.overridden) classes.push('is-overridden')
  if (props.point.emergencyOverride) classes.push('is-emerg-override')
  
  return classes
}

function getValueClasses() {
  const classes = []
  
  if (props.points.pointLiveValues.value.has(props.point.id)) classes.push('live')
  if (props.point.overridden) classes.push('overridden-value')
  if (props.point.emergencyOverride) classes.push('emerg-value')
  
  return classes
}

function isSetpoint() {
  return props.point.writable || 
         props.point.isSetpoint || 
         props.point.type?.toLowerCase().includes('setpoint') ||
         props.point.name?.toLowerCase().includes('setpoint') ||
         props.point.name?.toLowerCase().includes('sp')
}
</script>

<style scoped>
.point-item-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-border);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--color-background-primary);
  min-height: 36px;
}

.point-item-compact:hover {
  border-color: var(--color-accent);
  background: var(--color-background-secondary);
  transform: translateX(2px);
}

/* Status-based left border */
.point-item-compact.status-ok {
  border-left-color: var(--color-success);
}

.point-item-compact.has-alarm {
  border-left-color: var(--color-error);
  background: rgba(239, 68, 68, 0.03);
}

.point-item-compact.status-emerg-override {
  border-left-color: #dc2626;
  background: rgba(220, 38, 38, 0.05);
}

.point-item-compact.status-overridden {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.03);
}

.point-item-compact.status-stale {
  border-left-color: #6b7280;
  opacity: 0.7;
}

.point-item-compact.status-down {
  border-left-color: #ef4444;
  opacity: 0.6;
}

.point-item-compact.is-setpoint:hover {
  background: rgba(59, 130, 246, 0.05);
  border-color: var(--color-accent);
}

.point-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex: 1;
  min-width: 0;
}

.status-badge-mini {
  font-size: 12px;
  flex-shrink: 0;
}

.point-name {
  font-weight: 500;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-mini {
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

.live-badge {
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.alarm-badge-mini {
  background: var(--color-error);
  color: white;
}

.override-badge-mini {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid #f59e0b;
}

.emerg-badge-mini {
  background: rgba(220, 38, 38, 0.2);
  color: #dc2626;
  border: 1px solid #dc2626;
}

.point-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.point-value {
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  text-align: right;
  min-width: 60px;
}

.point-value.live {
  color: var(--color-success);
}

.point-value.overridden-value {
  color: #f59e0b;
}

.point-value.emerg-value {
  color: #dc2626;
  font-weight: 700;
}
</style>

