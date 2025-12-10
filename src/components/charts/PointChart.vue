<template>
  <!-- Standalone mode: with overlay -->
  <div v-if="!embedded" class="chart-overlay" @click.self="handleClose">
    <div class="point-chart card">
      <div class="chart-header">
        <div class="chart-title">
          <h3>{{ title }}</h3>
          <p v-if="dataPoints.length > 0 && !point.isMultiPoint" class="chart-subtitle">
            {{ dataPoints.length }} data points
          </p>
          <p v-if="point.isMultiPoint" class="chart-subtitle">
            {{ point.points.length }} points
          </p>
        </div>
        <button @click="handleClose" class="close-btn" title="Close chart (Esc)">✕</button>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="chart-loading">
        <div class="loading-spinner"></div>
        <p>Loading chart data...</p>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="!point.isMultiPoint && dataPoints.length === 0" class="chart-empty">
        <p>No historical data available</p>
      </div>
      
      <!-- Chart Display -->
      <div v-show="!loading && (point.isMultiPoint || dataPoints.length > 0)" class="chart-container">
        <canvas ref="chartCanvas"></canvas>
      </div>
    </div>
  </div>

  <!-- Embedded mode: no overlay, just the chart -->
  <div v-else class="point-chart-embedded">
    <div class="chart-header-embedded">
      <div class="chart-title">
        <h3>{{ title }}</h3>
        <p v-if="dataPoints.length > 0 && !point.isMultiPoint" class="chart-subtitle">
          {{ dataPoints.length }} data points
        </p>
        <p v-if="point.isMultiPoint" class="chart-subtitle">
          {{ point.points.length }} points
        </p>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="chart-loading">
      <div class="loading-spinner"></div>
      <p>Loading chart data...</p>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!point.isMultiPoint && dataPoints.length === 0" class="chart-empty">
      <p>No historical data available</p>
    </div>
    
    <!-- Chart Display -->
    <div v-show="!loading && (point.isMultiPoint || dataPoints.length > 0)" class="chart-container-embedded">
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
  Legend,
  Filler
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
  Legend,
  Filler
)

const props = defineProps({
  point: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  embedded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const chartCanvas = ref(null)
let chartInstance = null

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true  // 12-hour format with AM/PM
  })
}

const title = ref('')
const dataPoints = ref([])

const updateData = () => {
  if (!props.point) return
  
  if (props.point.isMultiPoint) {
    // Multi-point mode
    title.value = props.point.name
    dataPoints.value = props.point.points || []
  } else {
    // Single point mode
    title.value = `${props.point.name} - ${props.point.equipmentName || ''}`
    dataPoints.value = props.point.data || []
  }
}

const initChart = async () => {
  // Wait for next tick to ensure canvas is rendered
  await nextTick()
  
  if (!chartCanvas.value) {
    return
  }
  
  updateData()
  
  if (!props.point.isMultiPoint && dataPoints.value.length === 0) {
    return
  }

  const ctx = chartCanvas.value.getContext('2d')
  
  // Destroy existing chart if it exists
  if (chartInstance) {
    chartInstance.destroy()
  }
  
  let datasets = []
  
  if (props.point.isMultiPoint) {
    // Multi-point: create dataset for each point
    datasets = props.point.points.map(point => {
      const history = props.point.data[point.id] || []
      return {
        label: `${point.name} (${point.unit || ''})`,
        data: history.map(d => d.value),
        borderColor: point.color,
        backgroundColor: point.color + '20',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        fill: false
      }
    })
    
    // Use labels from first point
    const firstPoint = props.point.points[0]
    const firstHistory = props.point.data[firstPoint.id] || []
    var labels = firstHistory.map(d => formatTimestamp(d.timestamp))
  } else {
    // Single point mode
    var labels = dataPoints.value.map(d => formatTimestamp(d.timestamp))
    const values = dataPoints.value.map(d => d.value)
    datasets = [{
      label: `${props.point.name} (${props.point.unit || ''})`,
      data: values,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      fill: true
    }]
  }
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
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
}

const handleClose = (event) => {
  // Prevent closing when clicking inside the chart card
  if (event && event.target.closest('.point-chart') && !event.target.classList.contains('close-btn')) {
    return
  }
  emit('close')
}

onMounted(() => {
  if (props.point) {
    initChart()
  }
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

// Watch for data changes
watch(() => props.point, (newPoint) => {
  if (newPoint) {
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

/* Mobile Landscape: Maximize chart height */
@media (max-width: 768px) and (orientation: landscape) {
  .chart-container-embedded {
    height: 70vh;
    padding: var(--spacing-xs);
  }
  
  .chart-header-embedded {
    padding: var(--spacing-xs);
    margin-bottom: var(--spacing-xs);
  }
  
  .chart-header-embedded .chart-title h3 {
    font-size: var(--font-size-sm);
    margin-bottom: 0;
  }
  
  .chart-subtitle {
    font-size: var(--font-size-xs);
  }
}

/* Prevent body scroll when chart is open */
body:has(.chart-overlay) {
  overflow: hidden;
}

/* Embedded mode styles (for use inside TrendingPanel) */
.point-chart-embedded {
  width: 100%;
  padding: 0;
}

.chart-header-embedded {
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
}

.chart-header-embedded .chart-title h3 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

.chart-container-embedded {
  height: 450px;
  width: 100%;
  position: relative;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

@media (max-width: 768px) {
  .chart-container-embedded {
    height: 350px;
  }
}
</style>

