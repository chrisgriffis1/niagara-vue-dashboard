<template>
  <div class="points-section">
    <!-- Make entire header clickable -->
    <div 
      class="points-header" 
      :class="{ 'clickable': points.showToggleButton.value }"
      @click="handleHeaderClick"
    >
      <div class="header-content">
        <h4>Data Points</h4>
        <span v-if="points.pointCountLabel.value" class="point-count">
          ({{ points.pointCountLabel.value }})
        </span>
      </div>
      <div 
        v-if="points.showToggleButton.value"
        class="expand-indicator"
        :class="{ 'expanded': points.pointsExpanded.value }"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>

    <div v-if="points.pointsExpanded.value" class="points-list">
      <!-- Point Selector Tabs (controls outside sparkline) -->
      <div v-if="points.trendablePoints.value?.length > 1" class="point-selector-section">
        <div class="selector-header">
          <span class="selector-label">Select Point for Sparkline:</span>
          <button @click.stop="$emit('trend-click')" class="trend-btn" title="Open full trending">
            📊 View Trend
          </button>
        </div>
        <div class="point-tabs">
          <button
            v-for="point in points.trendablePoints.value"
            :key="point.id"
            @click.stop="miniChart.selectMiniPoint(point)"
            :class="['point-tab', { active: miniChart.selectedMiniPoint.value?.id === point.id }]"
            :title="point.name"
          >
            {{ point.name }}
          </button>
        </div>
      </div>

      <div v-if="points.loading.value" class="points-loading">
        Loading points...
      </div>
      <div
        v-for="point in points.points.value"
        :key="point.id"
        class="point-item"
        :class="getPointClasses(point)"
        @click="$emit('point-click', point)"
      >
        <div class="point-info">
          <div class="point-name-row">
            <!-- Status Badge (mobile-friendly, no tooltip) -->
            <span class="status-badge" :class="`status-${getPointStatus(point)}`">
              <span class="status-icon">{{ getStatusIcon(point) }}</span>
              <span class="status-text">{{ getStatusText(point) }}</span>
            </span>
            
            <!-- Point Type Badge -->
            <span class="type-badge" :class="{ 'setpoint': isSetpoint(point), 'readonly': isReadonly(point) }">
              {{ isSetpoint(point) ? 'SET' : 'RO' }}
            </span>
            
            <span class="point-name">{{ point.name }}</span>
            
            <!-- Live Data Indicator -->
            <span v-if="points.pointLiveValues.value.has(point.id)" class="live-indicator">
              LIVE
            </span>
            
            <!-- Alarm Badge -->
            <span v-if="alarms.getPointAlarm(point)" class="alarm-badge" :class="`alarm-${alarms.getPointAlarm(point).priority}`">
              {{ alarms.getAlarmIcon(alarms.getPointAlarm(point).priority) }}
            </span>
            
            <!-- Override Indicators -->
            <span v-if="point.overridden" class="override-badge">
              OVR
            </span>
            <span v-if="point.emergencyOverride" class="emerg-override-badge">
              EMERG
            </span>
          </div>
          <span class="point-type">{{ point.type }}</span>
        </div>
        <div class="point-value" :class="getValueClasses(point)">
          {{ points.getPointDisplayValue(point) }}
        </div>
      </div>
      <div v-if="!points.loading.value && points.points.value?.length === 0" class="no-points">
        No points available
      </div>

      <!-- Tesla-style: Show more points toggle -->
      <div v-if="!points.loading.value && points.allPointsCount.value > points.points.value?.length" class="show-more-section">
        <button @click.stop="points.toggleShowAllPoints" class="show-more-btn">
          {{ points.showAllPoints.value ? '⬆ Show Less' : `⬇ Show All ${points.allPointsCount.value} Points` }}
        </button>
      </div>
      <div v-else-if="points.showAllPoints.value && points.points.value?.length > 10" class="show-more-section">
        <button @click.stop="points.toggleShowAllPoints" class="show-more-btn">
          ⬆ Show Less
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  points: {
    type: Object,
    required: true
  },
  miniChart: {
    type: Object,
    required: true
  },
  alarms: {
    type: Object,
    required: true
  }
})

defineEmits(['point-click', 'trend-click'])

// Handle header click
function handleHeaderClick() {
  if (points.showToggleButton.value) {
    points.togglePoints()
  }
}

// Helper functions for point status and styling
function getPointStatus(point) {
  // Priority order: alarm > emergency > overridden > stale > down > ok
  if (alarms.getPointAlarm(point)) return 'alarm'
  if (point.emergencyOverride) return 'emerg-override'
  if (point.overridden) return 'overridden'
  if (point.status === 'stale' || point.stale) return 'stale'
  if (point.status === 'down' || point.down || point.status === 'fault') return 'down'
  return 'ok'
}

function getStatusIcon(point) {
  const status = getPointStatus(point)
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

function getStatusTitle(point) {
  const status = getPointStatus(point)
  const titles = {
    'alarm': 'Point in alarm',
    'emerg-override': 'Emergency override active',
    'overridden': 'Override active',
    'stale': 'Stale data',
    'down': 'Point offline',
    'ok': 'OK'
  }
  return titles[status] || 'Unknown status'
}

function getStatusText(point) {
  const status = getPointStatus(point)
  const texts = {
    'alarm': 'ALM',
    'emerg-override': 'EMG',
    'overridden': 'OVR',
    'stale': 'STALE',
    'down': 'DOWN',
    'ok': 'OK'
  }
  return texts[status] || '?'
}

function isSetpoint(point) {
  // Check if point is writable/setpoint
  return point.writable || 
         point.isSetpoint || 
         point.type?.toLowerCase().includes('setpoint') ||
         point.name?.toLowerCase().includes('setpoint') ||
         point.name?.toLowerCase().includes('sp')
}

function isReadonly(point) {
  return !isSetpoint(point)
}

function getPointTypeTitle(point) {
  return isSetpoint(point) ? 'Setpoint (writable)' : 'Readonly'
}

function getPointClasses(point) {
  const classes = []
  const status = getPointStatus(point)
  
  classes.push(`status-${status}`)
  
  if (alarms.getPointAlarm(point)) classes.push('has-alarm')
  if (isSetpoint(point)) classes.push('is-setpoint')
  if (point.overridden) classes.push('is-overridden')
  if (point.emergencyOverride) classes.push('is-emerg-override')
  
  return classes
}

function getValueClasses(point) {
  const classes = []
  
  if (points.pointLiveValues.value.has(point.id)) classes.push('live')
  if (point.overridden) classes.push('overridden-value')
  if (point.emergencyOverride) classes.push('emerg-value')
  
  return classes
}
</script>

<style scoped>
.points-section {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-lg);
}

.points-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-background-secondary);
  border-radius: var(--border-radius);
  transition: all var(--transition-fast);
}

.points-header.clickable {
  cursor: pointer;
  user-select: none;
}

.points-header.clickable:hover {
  background: var(--color-background-tertiary);
  transform: translateX(2px);
}

.points-header.clickable:active {
  transform: scale(0.98);
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.points-header h4 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

.point-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-weight: normal;
}

.expand-indicator {
  color: var(--color-text-secondary);
  transition: transform var(--transition-fast);
  display: flex;
  align-items: center;
}

.expand-indicator.expanded {
  transform: rotate(0deg);
}

.expand-indicator:not(.expanded) {
  transform: rotate(-90deg);
}

.points-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.point-selector-section {
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.selector-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.mini-chart-section {
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
}

.mini-chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.mini-chart-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.trend-btn {
  background: var(--color-accent);
  color: white;
  border: none;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.trend-btn:hover {
  background: var(--color-accent-hover);
  transform: scale(1.05);
}

.point-tabs {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.point-tab {
  background: var(--color-background-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size-xs);
  transition: all var(--transition-fast);
}

.point-tab:hover {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.point-tab.active {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.points-loading,
.no-points {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.point-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--color-background-primary);
  position: relative;
}

.point-item:hover {
  border-color: var(--color-accent);
  background: var(--color-background-secondary);
  transform: translateX(2px);
}

/* Status-based border coloring */
.point-item.has-alarm {
  border-left: 4px solid var(--color-error);
  background: rgba(239, 68, 68, 0.05);
}

.point-item.status-emerg-override {
  border-left: 4px solid #dc2626;
  background: rgba(220, 38, 38, 0.08);
}

.point-item.status-overridden {
  border-left: 4px solid #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

.point-item.status-stale {
  border-left: 4px solid #6b7280;
  background: rgba(107, 114, 128, 0.05);
  opacity: 0.7;
}

.point-item.status-down {
  border-left: 4px solid #ef4444;
  background: rgba(239, 68, 68, 0.05);
  opacity: 0.6;
}

.point-item.status-ok {
  border-left: 4px solid var(--color-success);
}

.point-item.is-setpoint {
  cursor: pointer;
}

.point-item.is-setpoint:hover {
  background: rgba(59, 130, 246, 0.08);
}

.point-info {
  flex: 1;
}

.point-name-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
  flex-wrap: wrap;
}

/* Status Badge (mobile-friendly, no tooltips) */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
}

.status-badge.status-ok {
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.status-badge.status-alarm {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-error);
  border: 1px solid var(--color-error);
  animation: pulse-alarm 1s infinite;
}

.status-badge.status-emerg-override {
  background: rgba(220, 38, 38, 0.2);
  color: #dc2626;
  border: 1px solid #dc2626;
  animation: pulse-emerg 1.5s infinite;
}

.status-badge.status-overridden {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid #f59e0b;
}

.status-badge.status-stale {
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
  border: 1px solid #6b7280;
}

.status-badge.status-down {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid #ef4444;
}

.status-icon {
  font-size: 11px;
}

.status-text {
  font-size: 9px;
  letter-spacing: 0.3px;
}

/* Type Badge */
.type-badge {
  display: inline-block;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.type-badge.setpoint {
  background: rgba(59, 130, 246, 0.15);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
}

.type-badge.readonly {
  background: rgba(107, 114, 128, 0.1);
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
}

.point-name {
  font-weight: 500;
  color: var(--color-text-primary);
  flex: 1;
}

.live-indicator {
  display: inline-block;
  padding: 2px 5px;
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-success);
  border: 1px solid var(--color-success);
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  animation: pulse-live 2s infinite;
}

.alarm-badge {
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 3px;
  font-weight: 600;
}

.alarm-badge.alarm-critical {
  background: var(--color-error);
  color: white;
}

.alarm-badge.alarm-high {
  background: var(--color-warning);
  color: white;
}

.alarm-badge.alarm-medium {
  background: #f59e0b;
  color: white;
}

/* Override Badges */
.override-badge {
  display: inline-block;
  padding: 2px 5px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid #f59e0b;
  border-radius: 3px;
  color: #f59e0b;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.emerg-override-badge {
  display: inline-block;
  padding: 2px 5px;
  background: rgba(220, 38, 38, 0.2);
  border: 1px solid #dc2626;
  border-radius: 3px;
  color: #dc2626;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  animation: pulse-emerg 1.5s infinite;
}

.point-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.point-value {
  font-weight: 500;
  color: var(--color-text-primary);
  text-align: right;
  min-width: 80px;
  transition: all var(--transition-fast);
}

.point-value.live {
  color: var(--color-success);
  animation: pulse-live 2s infinite;
}

.point-value.overridden-value {
  color: #f59e0b;
  font-weight: 600;
}

.point-value.emerg-value {
  color: #dc2626;
  font-weight: 700;
  animation: pulse-emerg 1.5s infinite;
}

/* Animations */
@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes pulse-alarm {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

@keyframes pulse-emerg {
  0%, 100% { opacity: 1; transform: scale(1); }
  25% { opacity: 0.8; transform: scale(1.15); }
  50% { opacity: 1; transform: scale(1); }
  75% { opacity: 0.8; transform: scale(1.15); }
}

.show-more-section {
  text-align: center;
  margin-top: var(--spacing-md);
}

.show-more-btn {
  background: var(--color-accent);
  color: white;
  border: none;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.show-more-btn:hover {
  background: var(--color-accent-hover);
  transform: scale(1.02);
}
</style>
