<template>
  <div class="mini-chart">
    <div v-if="loading" class="mini-loading">
      <div class="mini-spinner"></div>
    </div>
    <div v-else-if="!data || data.length === 0" class="mini-empty">
      No recent data
    </div>
    <canvas v-else ref="chartCanvas" class="mini-canvas"></canvas>
  </div>
</template>

<script setup>
/**
 * MiniChart Component
 * Lightweight sparkline for equipment cards
 * Shows last hour of data with minimal styling
 */

import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
} from 'chart.js'

// Register Chart.js components including Tooltip
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
)

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  loading: {
    type: Boolean,
    default: false
  },
  pointName: {
    type: String,
    default: ''
  },
  unit: {
    type: String,
    default: ''
  }
})

const chartCanvas = ref(null)
let chartInstance = null

const initChart = () => {
  if (!chartCanvas.value || !props.data || props.data.length === 0) {
    console.log('MiniChart: Cannot init', {
      hasCanvas: !!chartCanvas.value,
      dataLength: props.data?.length
    })
    return
  }

  const ctx = chartCanvas.value.getContext('2d')

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
  }

  const values = props.data.map(d => d.value)
  const labels = props.data.map(d => {
    const date = new Date(d.timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  })

  console.log('MiniChart: Creating chart with', values.length, 'data points')

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: props.pointName,
        data: values,
        borderColor: props.color,
        backgroundColor: props.color + '20',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: props.color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { 
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: props.color,
          borderWidth: 2,
          padding: 12,
          displayColors: false,
          titleFont: {
            size: 12,
            weight: 'bold'
          },
          bodyFont: {
            size: 14,
            weight: 'normal'
          },
          callbacks: {
            title: (context) => {
              return context[0].label // Time
            },
            label: (context) => {
              const value = Math.round(context.parsed.y * 100) / 100
              return `${value} ${props.unit || ''}`
            }
          }
        }
      },
      scales: {
        x: {
          display: false
        },
        y: {
          display: false
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      animation: {
        duration: 0
      }
    }
  })
  
  console.log('MiniChart: Chart created successfully')
}

onMounted(async () => {
  await nextTick()
  if (props.data && props.data.length > 0) {
    initChart()
  }
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

watch(() => props.data, async (newData) => {
  await nextTick()
  if (newData && newData.length > 0) {
    initChart()
  }
}, { deep: true })
</script>

<style scoped>
.mini-chart {
  width: 100%;
  height: 60px;
  position: relative;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.mini-canvas {
  width: 100%;
  height: 100%;
}

.mini-loading,
.mini-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-bg-hover);
  border-top-color: var(--color-accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

