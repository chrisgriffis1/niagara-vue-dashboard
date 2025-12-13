<template>
  <div
    class="equipment-card card"
    :class="{ 'edit-mode': editMode, 'expanded': isExpanded && !editMode }"
    :data-equipment-id="equipment.id"
  >
    <!-- Header - clickable to expand/collapse -->
    <div 
      class="card-header-wrapper"
      :class="{ 'clickable': !editMode }"
      @click="!editMode && toggleExpanded()"
    >
      <EquipmentHeader
        :equipment="equipment"
        :status-class="alarms.statusClass.value"
        :edit-mode="editMode"
        :is-expanded="isExpanded"
        @toggle-edit-mode="toggleEditMode"
      />
    </div>

    <!-- Edit Mode Panel -->
    <div v-if="editMode" class="edit-panel">
      <div class="edit-section">
        <h4>📌 Point Order & Visibility</h4>
        <p class="edit-help">Drag to reorder • Toggle to show/hide</p>
        
        <div class="editable-points-list">
          <div
            v-for="(point, index) in editablePoints"
            :key="point.id"
            class="editable-point-item"
            draggable="true"
            @dragstart="onPointDragStart(index, $event)"
            @dragover="onPointDragOver(index, $event)"
            @drop="onPointDrop"
          >
            <span class="drag-handle">⋮⋮</span>
            <label class="point-toggle">
              <input 
                type="checkbox" 
                :checked="!point.hidden"
                @change="togglePointVisibility(point)"
              />
              <span class="point-name">{{ point.name }}</span>
              <span v-if="point.unit" class="point-unit">({{ point.unit }})</span>
            </label>
          </div>
        </div>
      </div>

      <div class="edit-section">
        <h4>📈 Sparkline Point</h4>
        <select v-model="selectedSparklinePoint" class="sparkline-select">
          <option value="">No Sparkline</option>
          <option 
            v-for="point in trendablePoints" 
            :key="point.id" 
            :value="point.id"
          >
            {{ point.name }}
          </option>
        </select>
      </div>

      <div class="edit-actions">
        <button @click="applyToAllOfType" class="apply-btn">
          Apply to All {{ equipment.type }}
        </button>
        <button @click="saveChanges" class="save-btn">
          💾 Save Changes
        </button>
      </div>
    </div>

    <!-- Normal View - Collapsed -->
    <template v-else-if="!isExpanded">
      <EquipmentStats
        :point-count-label="points.pointCountLabel.value"
        :status-class="alarms.statusClass.value"
        :display-status="alarms.displayStatus.value"
      />

      <EquipmentSparkline
        :has-sparkline-data="miniChart.hasSparklineData.value"
        :mini-chart-data="miniChart.miniChartData.value"
        :loading-mini-chart="miniChart.loadingMiniChart.value"
        :sparkline-attempted="miniChart.sparklineAttempted.value"
        :selected-mini-point="miniChart.selectedMiniPoint.value"
        :chart-color="miniChart.getMiniChartColor()"
      />

      <PointDeviceValue
        v-if="pointDevice.isPointDevice.value"
        :display-value="pointDevice.displayValue.value"
        :unit="equipment.unit"
        :display-status="pointDevice.displayStatus.value"
        :has-live-data="pointDevice.hasLiveData.value"
      />
    </template>

    <!-- Normal View - Expanded -->
    <template v-else>
      <!-- Keep sparkline visible at top when expanded -->
      <EquipmentSparkline
        v-if="miniChart.hasSparklineData.value"
        :has-sparkline-data="miniChart.hasSparklineData.value"
        :mini-chart-data="miniChart.miniChartData.value"
        :loading-mini-chart="miniChart.loadingMiniChart.value"
        :sparkline-attempted="miniChart.sparklineAttempted.value"
        :selected-mini-point="miniChart.selectedMiniPoint.value"
        :chart-color="miniChart.getMiniChartColor()"
        class="expanded-sparkline"
      />

      <EquipmentCardExpanded
        :points="points"
        :alarms="alarms"
        :equipment="equipment"
        @point-click="handlePointClick"
      />
    </template>
  </div>
</template>

<script setup>
/**
 * EquipmentCard Component
 * Displays a single piece of equipment with clickable points
 * Tesla-inspired design with dark theme
 * Refactored with sub-components - now under 300 lines
 */

import { computed, onMounted, onUnmounted, toRef, ref } from 'vue'
import EquipmentHeader from './EquipmentHeader.vue'
import EquipmentStats from './EquipmentStats.vue'
import EquipmentSparkline from './EquipmentSparkline.vue'
import PointDeviceValue from './PointDeviceValue.vue'
import EquipmentCardExpanded from './EquipmentCardExpanded.vue'
import { useEquipmentPoints } from '../../composables/useEquipmentPoints'
import { useEquipmentMiniChart } from '../../composables/useEquipmentMiniChart'
import { useEquipmentAlarms } from '../../composables/useEquipmentAlarms'
import { usePointDevice } from '../../composables/usePointDevice'
import configService from '../../services/ConfigurationService'

const props = defineProps({
  equipment: {
    type: Object,
    required: true
  },
  showPointsSection: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['point-clicked', 'equipment-clicked'])

// Edit mode state
const editMode = ref(false)
const editablePoints = ref([])
const selectedSparklinePoint = ref('')
const draggedPointIndex = ref(null)

// Expanded state - card can be expanded/collapsed
const isExpanded = ref(false)

// Create reactive reference for equipment
const equipmentRef = toRef(props, 'equipment')

// Use composables
const points = useEquipmentPoints(equipmentRef)
const miniChart = useEquipmentMiniChart(equipmentRef, points.trendablePoints)
const alarms = useEquipmentAlarms(computed(() => props.equipment.id))
const pointDevice = usePointDevice(equipmentRef)

// Get trendable points for sparkline selector
const trendablePoints = computed(() => {
  return points.trendablePoints.value || []
})

// Toggle edit mode
async function toggleEditMode() {
  if (!editMode.value) {
    // Entering edit mode - load points if not loaded
    if (points.allPoints.value.length === 0) {
      await points.loadPoints()
    }
  }
  
  editMode.value = !editMode.value
  
  if (editMode.value) {
    // Load current configuration
    loadEditConfiguration()
  }
}

// Toggle expanded state
async function toggleExpanded() {
  if (!isExpanded.value) {
    // Expanding - load points if not loaded
    if (points.points.value.length === 0) {
      await points.loadPoints()
    }
  }
  
  isExpanded.value = !isExpanded.value
}

// Load current point order and visibility from config
function loadEditConfiguration() {
  const config = configService.getCurrentConfig()
  const typeSettings = configService.getDeviceTypeSettings(props.equipment.type)
  const deviceSettings = configService.getDeviceSettings(props.equipment.id)
  
  // Get ALL points (including hidden ones) for editing
  const allPointsList = points.allPoints.value || []
  
  if (allPointsList.length === 0) {
    console.warn('No points loaded for editing')
    return
  }
  
  // Apply current order or use default
  const orderedPoints = configService.applyPointOrder(
    allPointsList,
    props.equipment.type,
    props.equipment.id
  )
  
  // Add hidden status to each point
  editablePoints.value = orderedPoints.map(point => ({
    ...point,
    hidden: configService.isPointHidden(point, props.equipment.type, props.equipment.id)
  }))
  
  console.log(`📝 Loaded ${editablePoints.value.length} points for editing (${editablePoints.value.filter(p => p.hidden).length} hidden)`)
  
  // Load sparkline selection
  selectedSparklinePoint.value = typeSettings.sparklinePoint || ''
}

// Drag and drop handlers
function onPointDragStart(index, event) {
  draggedPointIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

function onPointDragOver(index, event) {
  event.preventDefault()
  
  if (draggedPointIndex.value === null || draggedPointIndex.value === index) return
  
  // Reorder
  const draggedPoint = editablePoints.value[draggedPointIndex.value]
  editablePoints.value.splice(draggedPointIndex.value, 1)
  editablePoints.value.splice(index, 0, draggedPoint)
  draggedPointIndex.value = index
}

function onPointDrop(event) {
  event.preventDefault()
  draggedPointIndex.value = null
}

// Toggle point visibility
function togglePointVisibility(point) {
  point.hidden = !point.hidden
}

// Save changes
function saveChanges() {
  const pointOrder = editablePoints.value.map(p => p.name)
  const hiddenPoints = editablePoints.value.filter(p => p.hidden).map(p => p.name)
  
  // Save to device-specific settings
  configService.updateDeviceSettings(props.equipment.id, {
    pointOrder,
    hiddenPoints,
    sparklinePoint: selectedSparklinePoint.value
  })
  
  alert('✅ Changes saved for this device!')
  editMode.value = false
  
  // Reload the component to apply changes
  window.location.reload()
}

// Apply to all devices of this type
function applyToAllOfType() {
  const confirm = window.confirm(
    `Apply these settings to ALL ${props.equipment.type} devices?\n\n` +
    `This will update point order, visibility, and sparkline for all ${props.equipment.type} equipment.`
  )
  
  if (!confirm) return
  
  const pointOrder = editablePoints.value.map(p => p.name)
  const hiddenPoints = editablePoints.value.filter(p => p.hidden).map(p => p.name)
  
  // Save to device-type settings
  configService.updateDeviceTypeSettings(props.equipment.type, {
    pointOrder,
    hiddenPoints,
    sparklinePoint: selectedSparklinePoint.value
  })
  
  alert(`✅ Changes applied to all ${props.equipment.type} devices!`)
  editMode.value = false
  
  // Reload to apply changes
  window.location.reload()
}

// Methods
const handlePointClick = (point) => {
  emit('point-clicked', { point, equipment: props.equipment })
}

const handleEquipmentClick = () => {
  emit('equipment-clicked', props.equipment)
}

const handleTrendClick = () => {
  if (miniChart.selectedMiniPoint.value) {
    emit('point-clicked', {
      point: miniChart.selectedMiniPoint.value,
      equipment: props.equipment,
      openTrend: true
    })
  }
}

// Lifecycle
onMounted(async () => {
  // Debug: Log point-device detection
  if (props.equipment.isPointDevice) {
    console.log(`📌 Point-device mounted: ${props.equipment.name}, value: ${props.equipment.currentValue}`)
    
    // For point-devices, load sparkline using the equipment as the point
    // Create a pseudo-point object from the equipment data
    const pseudoPoint = {
      id: props.equipment.id,
      name: props.equipment.name,
      slotPath: props.equipment.slotPath,
      ord: props.equipment.ord,
      type: props.equipment.type,
      unit: props.equipment.unit,
      hasHistory: true
    }
    miniChart.loadMiniChartData(pseudoPoint)
  } else if (props.equipment.pointCount > 0) {
    // For regular equipment with points, load points to enable sparkline
    await points.loadPoints()
    
    // Initialize sparkline after points are loaded
    if (points.trendablePoints.value.length > 0) {
      miniChart.initializeSparkline()
    }
  }
})

onUnmounted(() => {
  // Cleanup subscriptions
  points.cleanup()
  pointDevice.unsubscribeFromLiveUpdates()
})
</script>

<style scoped>
.equipment-card {
  transition: all var(--transition-fast);
}

.equipment-card.expanded {
  border-color: var(--color-accent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.card-header-wrapper {
  margin: calc(var(--spacing-lg) * -1);
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
  transition: all var(--transition-fast);
}

.card-header-wrapper.clickable {
  cursor: pointer;
  user-select: none;
}

.card-header-wrapper.clickable:hover {
  background: var(--color-background-secondary);
}

.card-header-wrapper.clickable:active {
  transform: scale(0.99);
}

.expanded-sparkline {
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.equipment-card.edit-mode {
  border: 2px solid var(--color-accent-primary);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}

.edit-panel {
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.edit-section {
  margin-bottom: var(--spacing-lg);
}

.edit-section h4 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}

.edit-help {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0 0 var(--spacing-sm) 0;
}

.editable-points-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.editable-point-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: move;
  transition: all var(--transition-fast);
}

.editable-point-item:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-accent-primary);
}

.drag-handle {
  color: var(--color-text-tertiary);
  font-size: 12px;
  cursor: grab;
}

.editable-point-item:active .drag-handle {
  cursor: grabbing;
}

.point-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
}

.point-toggle input[type="checkbox"] {
  cursor: pointer;
}

.point-name {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.point-unit {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.sparkline-select {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.sparkline-select:focus {
  outline: none;
  border-color: var(--color-accent-primary);
}

.edit-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.apply-btn,
.save-btn {
  flex: 1;
  padding: var(--spacing-sm);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.apply-btn {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.apply-btn:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-accent-primary);
}

.save-btn {
  background-color: var(--color-accent-primary);
  color: white;
}

.save-btn:hover {
  background-color: rgba(59, 130, 246, 0.8);
}
</style>
