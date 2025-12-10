<template>
  <div 
    class="equipment-card card" 
    :data-equipment-id="equipment.id"
  >
    <!-- Equipment Header -->
    <div class="equipment-header">
      <div class="equipment-info">
        <h3>{{ equipment.name }}</h3>
        <div class="equipment-meta">
          <span class="equipment-type">{{ equipment.type }}</span>
          <span class="equipment-location">{{ equipment.location }}</span>
        </div>
      </div>
      <span class="status-dot" :class="statusClass"></span>
    </div>

    <!-- Equipment Stats -->
    <div class="equipment-stats">
      <div class="stat-item">
        <span class="stat-label">Points</span>
        <span class="stat-value">{{ equipment.pointCount || 0 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Status</span>
        <span class="stat-value" :class="`status-${equipment.status}`">
          {{ equipment.status }}
        </span>
      </div>
    </div>

    <!-- Points List -->
    <div v-if="showPoints" class="points-section">
      <div class="points-header">
        <h4>Data Points</h4>
        <button 
          v-if="equipment.pointCount > 0" 
          @click.stop="togglePoints"
          class="toggle-btn"
        >
          {{ pointsExpanded ? '▼' : '▶' }}
        </button>
      </div>

      <div v-if="pointsExpanded" class="points-list">
        <div v-if="loading" class="points-loading">
          Loading points...
        </div>
        <div 
          v-for="point in points" 
          :key="point.id"
          class="point-item"
          @click="handlePointClick(point)"
        >
          <div class="point-info">
            <span class="point-name">{{ point.name }}</span>
            <span class="point-type">{{ point.type }}</span>
          </div>
          <div class="point-value">
            {{ point.displayValue }}
          </div>
        </div>
        <div v-if="!loading && points.length === 0" class="no-points">
          No points available
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * EquipmentCard Component
 * Displays a single piece of equipment with clickable points
 * Tesla-inspired design with dark theme
 * Max 300 lines per component rule
 */

import { ref, computed, watch } from 'vue'
import { useDeviceStore } from '../../stores/deviceStore'

const props = defineProps({
  equipment: {
    type: Object,
    required: true
  },
  showPoints: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['point-clicked', 'equipment-clicked'])

const deviceStore = useDeviceStore()
const pointsExpanded = ref(false)
const loading = ref(false)
const points = ref([])

// Status indicator color based on equipment status
const statusClass = computed(() => {
  switch (props.equipment.status) {
    case 'ok': return 'ok'
    case 'warning': return 'warning'
    case 'error': return 'error'
    default: return 'ok'
  }
})

// Load points when expanded
const togglePoints = async () => {
  pointsExpanded.value = !pointsExpanded.value
  
  if (pointsExpanded.value && points.value.length === 0) {
    await loadPoints()
  }
}

// Load points from adapter
const loadPoints = async () => {
  loading.value = true
  try {
    points.value = await deviceStore.loadDevicePoints(props.equipment.id)
  } catch (error) {
    console.error('Failed to load points:', error)
  } finally {
    loading.value = false
  }
}

// Handle point click
const handlePointClick = (point) => {
  emit('point-clicked', {
    ...point,
    equipmentName: props.equipment.name,
    equipmentId: props.equipment.id
  })
}

// Watch equipment changes
watch(() => props.equipment.id, () => {
  points.value = []
  pointsExpanded.value = false
})
</script>

<style scoped>
.equipment-card {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.equipment-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-border-light);
  box-shadow: var(--shadow-md);
}

/* Header Section */
.equipment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.equipment-info {
  flex: 1;
}

.equipment-header h3 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.equipment-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
}

.equipment-type {
  color: var(--color-accent-primary);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.equipment-location {
  color: var(--color-text-secondary);
}

/* Status Indicator */
.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: var(--spacing-xs);
}

.status-dot.ok {
  background-color: var(--color-success);
  box-shadow: 0 0 8px var(--color-success);
}

.status-dot.warning {
  background-color: var(--color-warning);
  box-shadow: 0 0 8px var(--color-warning);
}

.status-dot.error {
  background-color: var(--color-error);
  box-shadow: 0 0 8px var(--color-error);
}

/* Stats Section */
.equipment-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.stat-value.status-ok {
  color: var(--color-success);
}

.stat-value.status-warning {
  color: var(--color-warning);
}

.stat-value.status-error {
  color: var(--color-error);
}

/* Points Section */
.points-section {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-md);
}

.points-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.points-header h4 {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs);
  min-height: unset;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.toggle-btn:hover {
  color: var(--color-text-primary);
}

/* Points List */
.points-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  max-height: 300px;
  overflow-y: auto;
}

.point-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  cursor: pointer;
  min-height: var(--touch-target-min);
}

.point-item:hover {
  background-color: var(--color-bg-hover);
  transform: translateX(4px);
}

.point-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  flex: 1;
}

.point-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.point-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.point-value {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-accent-primary);
  font-family: 'Courier New', monospace;
}

.points-loading,
.no-points {
  padding: var(--spacing-md);
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

/* Scrollbar for points list */
.points-list::-webkit-scrollbar {
  width: 4px;
}

.points-list::-webkit-scrollbar-thumb {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .equipment-card {
    padding: var(--spacing-md);
  }

  .equipment-meta {
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .equipment-stats {
    grid-template-columns: 1fr;
  }
}
</style>

