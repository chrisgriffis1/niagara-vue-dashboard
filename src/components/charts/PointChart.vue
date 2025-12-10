<template>
  <div class="chart-overlay" @click.self="handleClose">
    <div class="point-chart card">
      <div class="chart-header">
        <div class="chart-title">
          <h3>{{ title }}</h3>
          <p v-if="data.length > 0" class="chart-subtitle">
            {{ data.length }} data points over 24 hours
          </p>
        </div>
        <button @click="handleClose" class="close-btn" title="Close chart">✕</button>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="chart-loading">
        <div class="loading-spinner"></div>
        <p>Loading chart data...</p>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="data.length === 0" class="chart-empty">
        <p>No historical data available</p>
      </div>
      
      <!-- Chart Display -->
      <div v-show="!loading && data.length > 0" class="chart-container">
        <canvas ref="chartCanvas"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * PointChart Component
 * Instant Chart.js trending for building automation points
 * Supports multi-point comparison
 */

import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
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
  CategoryScale,
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
const loading = ref(true)
let chartInstance = null

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
}

const initChart = async () => {
  // Wait for next tick to ensure canvas is rendered
  await nextTick()
  
  if (!chartCanvas.value) {
    loading.value = false
    return
  }
  
  if (props.data.length === 0) {
    loading.value = false
    return
  }

  const ctx = chartCanvas.value.getContext('2d')
  
  // Destroy existing chart if it exists
  if (chartInstance) {
    chartInstance.destroy()
  }
  
  const labels = props.data.map(d => formatTimestamp(d.timestamp))
  const values = props.data.map(d => d.value)
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: props.title,
        data: values,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#ffffff',
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#333333',
          borderWidth: 1,
          padding: 12,
          displayColors: true
        }
      },
      scales: {
        x: {
          ticks: { 
            color: '#a0a0a0',
            maxRotation: 45,
            minRotation: 0
          },
          grid: { 
            color: '#333333',
            drawBorder: false
          }
        },
        y: {
          ticks: { 
            color: '#a0a0a0'
          },
          grid: { 
            color: '#333333',
            drawBorder: false
          }
        }
      }
    }
  })
  
  loading.value = false
}

const handleClose = (event) => {
  // Prevent closing when clicking inside the chart card
  if (event && event.target.closest('.point-chart') && !event.target.classList.contains('close-btn')) {
    return
  }
  emit('close')
}

onMounted(() => {
  if (props.data.length > 0) {
    initChart()
  } else {
    loading.value = false
  }
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

// Watch for data changes
watch(() => props.data, (newData) => {
  if (newData && newData.length > 0) {
    initChart()
  }
}, { deep: true })
</script>

<style scoped>
/* Overlay for modal-like behavior */
.chart-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--spacing-xl);
  overflow-y: auto;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.point-chart {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  width: 100%;
  max-width: 900px;
  margin-top: var(--spacing-xl);
  box-shadow: var(--shadow-lg);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { 
    transform: translateY(-20px);
    opacity: 0;
  }
  to { 
    transform: translateY(0);
    opacity: 1;
  }
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.chart-title h3 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
}

.chart-subtitle {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.close-btn {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xl);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  min-height: unset;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.close-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-border-light);
  transform: scale(1.1);
}

.chart-container {
  height: 400px;
  position: relative;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

.chart-loading,
.chart-empty {
  height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-bg-tertiary);
  border-top-color: var(--color-accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chart-empty p {
  font-size: var(--font-size-lg);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .chart-overlay {
    padding: var(--spacing-md);
  }

  .point-chart {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
  }

  .chart-container,
  .chart-loading,
  .chart-empty {
    height: 300px;
  }

  .chart-header {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .close-btn {
    align-self: flex-end;
  }
}

/* Prevent body scroll when chart is open */
body:has(.chart-overlay) {
  overflow: hidden;
}
</style>

