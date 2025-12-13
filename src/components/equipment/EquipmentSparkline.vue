<template>
  <div v-if="hasSparklineData" class="sparkline-section">
    <MiniChart
      v-if="miniChartData.length > 0 || loadingMiniChart"
      :data="miniChartData"
      :color="chartColor"
      :loading="loadingMiniChart"
      :point-name="selectedMiniPoint?.name"
      :unit="selectedMiniPoint?.unit"
      compact
    />
    <div v-else-if="sparklineAttempted && !loadingMiniChart" class="sparkline-no-data">
      No trend data available
    </div>
    <div v-if="selectedMiniPoint && !loadingMiniChart && miniChartData.length > 0" class="sparkline-label">
      {{ selectedMiniPoint.name }}
    </div>
  </div>
</template>

<script setup>
import MiniChart from '../charts/MiniChart.vue'

defineProps({
  hasSparklineData: {
    type: Boolean,
    required: true
  },
  miniChartData: {
    type: Array,
    required: true
  },
  loadingMiniChart: {
    type: Boolean,
    required: true
  },
  sparklineAttempted: {
    type: Boolean,
    required: true
  },
  selectedMiniPoint: {
    type: Object,
    default: null
  },
  chartColor: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.sparkline-section {
  margin-bottom: var(--spacing-lg);
}

.sparkline-no-data {
  text-align: center;
  padding: var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  background: var(--color-background-secondary);
  border-radius: var(--border-radius);
}

.sparkline-label {
  text-align: center;
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
