<template>
  <div class="point-selector">
    <div class="selector-header">
      <h4>📊 Select Points</h4>
      <span class="selected-count">{{ selectedPoints.length }} selected</span>
    </div>

    <!-- Selected Points List -->
    <div v-if="selectedPoints.length > 0" class="selected-points">
      <div 
        v-for="point in selectedPoints" 
        :key="point.id"
        class="selected-point-chip"
        :style="{ borderLeftColor: point.color }"
      >
        <span class="point-label">{{ point.name }}</span>
        <button @click="removePoint(point.id)" class="remove-btn">✕</button>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button 
        v-if="currentEquipment"
        @click="addAllPointsFromEquipment"
        class="action-btn"
      >
        + All Points from {{ currentEquipment.name }}
      </button>
      <button 
        @click="showPointPicker = !showPointPicker"
        class="action-btn primary"
      >
        + Add Points
      </button>
      <button 
        v-if="selectedPoints.length > 0"
        @click="clearAllPoints"
        class="action-btn"
      >
        ✕ Clear All
      </button>
    </div>

    <!-- Point Picker -->
    <div v-if="showPointPicker" class="point-picker card">
      <!-- Search Points -->
      <div class="picker-search">
        <input
          v-model="pointSearchQuery"
          type="text"
          placeholder="Search points..."
          class="search-input"
        />
      </div>

      <!-- Group by Equipment -->
      <div class="equipment-groups">
        <div 
          v-for="equipment in availableEquipment" 
          :key="equipment.id"
          class="equipment-group"
        >
          <div class="group-header" @click="toggleEquipment(equipment.id)">
            <span>{{ expandedEquipment[equipment.id] ? '▼' : '▶' }}</span>
            <span class="equipment-name">{{ equipment.name }}</span>
            <span class="point-count">({{ equipment.pointCount }} points)</span>
          </div>
          
          <div v-if="expandedEquipment[equipment.id]" class="group-points">
            <div 
              v-for="point in getEquipmentPoints(equipment.id)" 
              :key="point.id"
              class="point-option"
              @click="addPoint(point, equipment)"
            >
              <span class="point-name">{{ point.name }}</span>
              <span class="point-type">{{ point.type }}</span>
              <span v-if="isPointSelected(point.id)" class="selected-indicator">✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Point Type Quick Add -->
    <div class="type-quick-add">
      <button @click="showTypeSelector = !showTypeSelector" class="toggle-types">
        {{ showTypeSelector ? '▼' : '▶' }} Add by Point Type
      </button>
      
      <div v-if="showTypeSelector" class="type-chips">
        <button
          v-for="type in pointTypes"
          :key="type"
          @click="addAllPointsByType(type)"
          class="type-chip"
        >
          + All {{ type }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * PointSelector Component
 * Multi-point selection for trending
 * Supports adding by equipment, type, or individual selection
 */

import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  availableEquipment: {
    type: Array,
    default: () => []
  },
  currentEquipment: {
    type: Object,
    default: null
  },
  equipmentPoints: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'points-changed'])

const selectedPoints = ref([...props.modelValue])
const showPointPicker = ref(false)
const showTypeSelector = ref(false)
const pointSearchQuery = ref('')
const expandedEquipment = ref({})

// Chart colors for multiple points
const chartColors = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
]

// Get unique point types
const pointTypes = computed(() => {
  const types = new Set()
  Object.values(props.equipmentPoints).forEach(points => {
    points.forEach(point => types.add(point.type))
  })
  return Array.from(types).sort()
})

const isPointSelected = (pointId) => {
  return selectedPoints.value.some(p => p.id === pointId)
}

const getEquipmentPoints = (equipmentId) => {
  const points = props.equipmentPoints[equipmentId] || []
  
  if (!pointSearchQuery.value) return points
  
  const query = pointSearchQuery.value.toLowerCase()
  return points.filter(p => 
    p.name.toLowerCase().includes(query) ||
    p.type.toLowerCase().includes(query)
  )
}

const addPoint = (point, equipment) => {
  if (isPointSelected(point.id)) return
  
  const colorIndex = selectedPoints.value.length % chartColors.length
  selectedPoints.value.push({
    ...point,
    equipmentName: equipment.name,
    equipmentId: equipment.id,
    color: chartColors[colorIndex]
  })
  
  emitChange()
}

const removePoint = (pointId) => {
  selectedPoints.value = selectedPoints.value.filter(p => p.id !== pointId)
  emitChange()
}

const addAllPointsFromEquipment = () => {
  if (!props.currentEquipment) return
  
  const points = props.equipmentPoints[props.currentEquipment.id] || []
  points.forEach(point => {
    if (!isPointSelected(point.id)) {
      addPoint(point, props.currentEquipment)
    }
  })
}

const addAllPointsByType = (type) => {
  Object.entries(props.equipmentPoints).forEach(([equipId, points]) => {
    const equipment = props.availableEquipment.find(e => e.id === equipId)
    if (!equipment) return
    
    points.filter(p => p.type === type).forEach(point => {
      if (!isPointSelected(point.id)) {
        addPoint(point, equipment)
      }
    })
  })
  
  showTypeSelector.value = false
}

const clearAllPoints = () => {
  selectedPoints.value = []
  emitChange()
}

const toggleEquipment = (equipmentId) => {
  expandedEquipment.value[equipmentId] = !expandedEquipment.value[equipmentId]
}

const emitChange = () => {
  emit('update:modelValue', selectedPoints.value)
  emit('points-changed', selectedPoints.value)
}
</script>

<style scoped>
.point-selector {
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.selector-header h4 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}

.selected-count {
  font-size: var(--font-size-sm);
  color: var(--color-accent-primary);
  font-weight: var(--font-weight-semibold);
}

/* Selected Points */
.selected-points {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm);
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-md);
}

.selected-point-chip {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-left: 3px solid;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}

.point-label {
  color: var(--color-text-primary);
}

.remove-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  padding: 0;
  min-height: unset;
  cursor: pointer;
  font-size: var(--font-size-sm);
  line-height: 1;
}

.remove-btn:hover {
  color: var(--color-error);
}

/* Quick Actions */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.action-btn {
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--font-size-sm);
  min-height: unset;
  text-align: left;
}

/* Point Picker */
.point-picker {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  max-height: 400px;
  overflow-y: auto;
}

.picker-search {
  margin-bottom: var(--spacing-md);
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent-primary);
}

/* Equipment Groups */
.equipment-groups {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.equipment-group {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.group-header:hover {
  background-color: var(--color-bg-hover);
}

.equipment-name {
  flex: 1;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.point-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.group-points {
  padding: var(--spacing-xs);
}

.point-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.point-option:hover {
  background-color: var(--color-bg-hover);
}

.point-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.point-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-left: var(--spacing-sm);
}

.selected-indicator {
  color: var(--color-success);
  font-weight: var(--font-weight-bold);
}

/* Type Quick Add */
.type-quick-add {
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.toggle-types {
  width: 100%;
  padding: var(--spacing-sm);
  background: transparent;
  border: 1px dashed var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  min-height: unset;
  text-align: left;
  transition: all var(--transition-fast);
}

.toggle-types:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
}

.type-chip {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: unset;
}

.type-chip:hover {
  background-color: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
  color: white;
}

/* Mobile */
@media (max-width: 768px) {
  .point-picker {
    max-height: 300px;
  }
}
</style>

