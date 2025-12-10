<template>
  <div class="point-chart card">
    <div class="chart-header">
      <h3>{{ title }}</h3>
      <button @click="handleClose" class="close-btn">✕</button>
    </div>
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>

<script setup>
/**
 * PointChart Component
 * Instant Chart.js trending for building automation points
 * Supports multi-point comparison
 */

import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend
)

const props = defineProps({
  pointId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Point Trend'
  },
  data: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close'])

const chartCanvas = ref(null)
let chartInstance = null

const initChart = () => {
  if (!chartCanvas.value) return

  const ctx = chartCanvas.value.getContext('2d')
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: props.data.map(d => d.timestamp),
      datasets: [{
        label: props.title,
        data: props.data.map(d => d.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#ffffff'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#a0a0a0' },
          grid: { color: '#333333' }
        },
        y: {
          ticks: { color: '#a0a0a0' },
          grid: { color: '#333333' }
        }
      }
    }
  })
}

const handleClose = () => {
  emit('close')
}

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})

watch(() => props.data, () => {
  if (chartInstance) {
    chartInstance.data.labels = props.data.map(d => d.timestamp)
    chartInstance.data.datasets[0].data = props.data.map(d => d.value)
    chartInstance.update()
  }
})
</script>

<style scoped>
.point-chart {
  margin-bottom: var(--spacing-lg);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.chart-header h3 {
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xl);
  padding: 0;
  min-height: unset;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-text-primary);
}

.chart-container {
  height: 300px;
  position: relative;
}

@media (max-width: 768px) {
  .chart-container {
    height: 250px;
  }
}
</style>

