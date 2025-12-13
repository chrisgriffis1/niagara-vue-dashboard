<template>
  <div class="points-section">
    <div class="points-header">
      <h4>Data Points</h4>
      <button
        v-if="points.showToggleButton.value"
        @click.stop="points.togglePoints"
        class="toggle-btn"
      >
        {{ points.pointsExpanded.value ? '▼' : '▶' }}
      </button>
    </div>

    <div v-if="points.pointsExpanded.value" class="points-list">
      <!-- Mini Trend for Primary Point -->
      <div v-if="miniChart.miniChartData.value?.length > 0" class="mini-chart-section">
        <div class="mini-chart-header">
          <span class="mini-chart-label">{{ miniChart.selectedMiniPoint.value?.name }} - Last Hour</span>
          <button @click.stop="$emit('trend-click')" class="trend-btn" title="Open full trending">
            📊 View Trend
          </button>
        </div>

        <!-- Point Selector Tabs -->
        <div v-if="points.pointsExpanded.value && points.trendablePoints.value?.length > 1" class="point-tabs">
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

        <MiniChart
          :data="miniChart.miniChartData.value"
          :color="miniChart.getMiniChartColor()"
          :loading="miniChart.loadingMiniChart.value"
          :point-name="miniChart.selectedMiniPoint.value?.name"
          :unit="miniChart.selectedMiniPoint.value?.unit"
        />
      </div>

      <div v-if="points.loading.value" class="points-loading">
        Loading points...
      </div>
      <div
        v-for="point in points.points.value"
        :key="point.id"
        class="point-item"
        :class="{ 'has-alarm': alarms.getPointAlarm(point) }"
        @click="$emit('point-click', point)"
      >
        <div class="point-info">
          <div class="point-name-row">
            <span class="point-name">{{ point.name }}</span>
            <span v-if="points.pointLiveValues.value.has(point.id)" class="live-dot" title="Live data">●</span>
            <span v-if="alarms.getPointAlarm(point)" class="alarm-badge" :class="`alarm-${alarms.getPointAlarm(point).priority}`">
              {{ alarms.getAlarmIcon(alarms.getPointAlarm(point).priority) }}
            </span>
          </div>
          <span class="point-type">{{ point.type }}</span>
        </div>
        <div class="point-value" :class="{ 'live': points.pointLiveValues.value.has(point.id) }">
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
import MiniChart from '../charts/MiniChart.vue'

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
}

.points-header h4 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

.toggle-btn {
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.toggle-btn:hover {
  background: var(--color-background-tertiary);
  border-color: var(--color-accent);
}

.points-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
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
  margin-bottom: var(--spacing-sm);
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
}

.point-item:hover {
  border-color: var(--color-accent);
  background: var(--color-background-secondary);
}

.point-item.has-alarm {
  border-left: 4px solid var(--color-error);
}

.point-info {
  flex: 1;
}

.point-name-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
}

.point-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.live-dot {
  color: var(--color-success);
  font-size: var(--font-size-sm);
}

.alarm-badge {
  font-size: var(--font-size-xs);
  padding: 2px 4px;
  border-radius: 2px;
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

.point-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.point-value {
  font-weight: 500;
  color: var(--color-text-primary);
  text-align: right;
  min-width: 80px;
}

.point-value.live {
  color: var(--color-success);
  animation: pulse-live 2s infinite;
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

@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
