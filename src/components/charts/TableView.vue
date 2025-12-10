<template>
  <div class="table-view">
    <div class="table-header">
      <h4>📋 Data Table</h4>
      <div class="table-actions">
        <button @click="exportToCSV" class="export-btn" title="Export to CSV">
          📥 Export CSV
        </button>
        <button @click="$emit('close')" class="close-btn">✕</button>
      </div>
    </div>

    <!-- Table Container -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th v-for="point in points" :key="point.id" class="point-header">
              <div class="header-content">
                <span class="point-name">{{ point.name }}</span>
                <span class="point-unit">{{ point.unit }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in tableData" :key="index">
            <td class="timestamp-cell">{{ formatTimestamp(row.timestamp) }}</td>
            <td 
              v-for="point in points" 
              :key="point.id"
              class="value-cell"
            >
              {{ formatValue(row.values[point.id]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Table Stats -->
    <div class="table-stats">
      <span>{{ tableData.length }} rows × {{ points.length }} columns</span>
      <span>{{ points.length }} points</span>
    </div>
  </div>
</template>

<script setup>
/**
 * TableView Component
 * Displays historical data in tabular format
 * Supports CSV export for analysis
 */

import { computed } from 'vue'

const props = defineProps({
  points: {
    type: Array,
    required: true
  },
  data: {
    type: Object,
    required: true // { pointId: [{ timestamp, value }] }
  }
})

const emit = defineEmits(['close'])

// Build table data by merging all point histories
const tableData = computed(() => {
  // Get all unique timestamps
  const timestampSet = new Set()
  Object.values(props.data).forEach(history => {
    history.forEach(item => timestampSet.add(item.timestamp))
  })
  
  const timestamps = Array.from(timestampSet).sort()
  
  // Build rows
  return timestamps.map(timestamp => {
    const values = {}
    props.points.forEach(point => {
      const history = props.data[point.id] || []
      const entry = history.find(h => h.timestamp === timestamp)
      values[point.id] = entry?.value ?? null
    })
    
    return { timestamp, values }
  })
})

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatValue = (value) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') {
    return Math.round(value * 100) / 100
  }
  return value
}

const exportToCSV = () => {
  // Build CSV content
  let csv = 'Timestamp,' + props.points.map(p => `${p.name} (${p.unit || ''})`).join(',') + '\n'
  
  tableData.value.forEach(row => {
    const values = props.points.map(p => formatValue(row.values[p.id]))
    csv += formatTimestamp(row.timestamp) + ',' + values.join(',') + '\n'
  })
  
  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `trend-data-${Date.now()}.csv`
  link.click()
  window.URL.revokeObjectURL(url)
}
</script>

<style scoped>
.table-view {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.table-header h4 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.table-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.export-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--color-success);
  border: none;
  color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  min-height: unset;
}

.export-btn:hover {
  background-color: #22c55e;
}

.close-btn {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
  width: 32px;
  height: 32px;
  padding: 0;
  min-height: unset;
}

.close-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

/* Table */
.table-container {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 500px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.data-table thead {
  position: sticky;
  top: 0;
  background-color: var(--color-bg-tertiary);
  z-index: 10;
}

.data-table th {
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 2px solid var(--color-border);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.point-header .header-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.point-name {
  color: var(--color-text-primary);
}

.point-unit {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-normal);
}

.data-table tbody tr {
  border-bottom: 1px solid var(--color-border);
  transition: background-color var(--transition-fast);
}

.data-table tbody tr:hover {
  background-color: var(--color-bg-hover);
}

.data-table td {
  padding: var(--spacing-sm);
  color: var(--color-text-primary);
}

.timestamp-cell {
  font-family: 'Courier New', monospace;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.value-cell {
  font-family: 'Courier New', monospace;
  text-align: right;
  color: var(--color-accent-primary);
}

/* Table Stats */
.table-stats {
  display: flex;
  justify-content: space-between;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* Mobile */
@media (max-width: 768px) {
  .table-container {
    max-height: 400px;
  }

  .data-table {
    font-size: var(--font-size-xs);
  }

  .data-table th,
  .data-table td {
    padding: var(--spacing-xs);
  }
}
</style>

