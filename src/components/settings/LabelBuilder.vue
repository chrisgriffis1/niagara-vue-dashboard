<template>
  <div class="label-builder">
    <div class="builder-header">
      <h4>{{ title }}</h4>
      <div class="mode-toggle">
        <button 
          @click="mode = 'simple'"
          :class="['mode-btn', { active: mode === 'simple' }]"
        >
          🎨 Simple
        </button>
        <button 
          @click="mode = 'advanced'"
          :class="['mode-btn', { active: mode === 'advanced' }]"
        >
          ⚙️ Advanced
        </button>
      </div>
    </div>

    <!-- Simple Mode: Drag and Drop -->
    <div v-if="mode === 'simple'" class="simple-mode">
      <div class="label-preview-box">
        <div class="preview-label">Preview:</div>
        <div class="preview-content">
          {{ formattedPreview }}
        </div>
      </div>

      <div class="current-template">
        <div class="template-label">Current Template:</div>
        <div 
          class="template-chips"
          @drop="onDrop"
          @dragover.prevent
        >
          <div
            v-for="(part, index) in templateParts"
            :key="index"
            class="template-chip"
            draggable="true"
            @dragstart="onDragStart(index, $event)"
            @dragover="onDragOver(index, $event)"
          >
            <span class="chip-content">{{ part.display }}</span>
            <button @click="removePart(index)" class="chip-remove">✕</button>
          </div>
          <div class="add-separator-btn" @click="addSeparator">
            + Separator
          </div>
        </div>
      </div>

      <div class="available-variables">
        <div class="section-label">Available Variables (drag or click to add):</div>
        
        <!-- Device Type Selector -->
        <div v-if="deviceTypes.length > 0" class="device-type-selector">
          <select v-model="selectedDeviceType" class="type-select">
            <option value="">Standard Variables</option>
            <option v-for="type in deviceTypes" :key="type" :value="type">
              {{ type }} - Discover Points
            </option>
          </select>
          
          <select 
            v-if="selectedDeviceType && devicesOfType.length > 0" 
            v-model="selectedDeviceId" 
            class="device-select"
          >
            <option value="">Select a {{ selectedDeviceType }}...</option>
            <option v-for="device in devicesOfType" :key="device.id" :value="device.id">
              {{ device.name }}
            </option>
          </select>
        </div>
        
        <div class="variables-grid">
          <button
            v-for="variable in allVariables"
            :key="variable.value"
            @click="addVariable(variable)"
            draggable="true"
            @dragstart="onVariableDragStart(variable, $event)"
            class="variable-chip"
            :class="{ 'discovered-point': variable.actualValue }"
            :title="variable.description + (variable.actualValue ? ' = ' + variable.actualValue : '')"
          >
            <span class="drag-handle">⋮⋮</span>
            <span class="variable-label">{{ variable.display }}</span>
            <span v-if="variable.actualValue" class="point-value">{{ variable.actualValue }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Advanced Mode: Text Input -->
    <div v-else class="advanced-mode">
      <div class="form-group">
        <label>Template String:</label>
        <input
          v-model="advancedTemplate"
          type="text"
          class="form-input"
          @input="parseAdvancedTemplate"
          placeholder="{device.name} | {point.name} ({point.unit})"
        />
      </div>

      <div class="label-preview-box">
        <div class="preview-label">Preview:</div>
        <div class="preview-content">
          {{ formattedPreview }}
        </div>
      </div>

      <div class="available-variables-inline">
        <strong>Available:</strong>
        <span
          v-for="variable in availableVariables"
          :key="variable.value"
          @click="insertVariable(variable)"
          class="variable-tag"
          :title="'Click to insert: ' + variable.description"
        >
          {{ variable.value }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import configService from '../../services/ConfigurationService'

const props = defineProps({
  title: {
    type: String,
    default: 'Label Template'
  },
  modelValue: {
    type: String,
    default: ''
  },
  sampleDevice: {
    type: Object,
    default: () => ({
      name: 'HP12',
      displayName: 'Heat Pump 12',
      type: 'Heat Pump'
    })
  },
  samplePoint: {
    type: Object,
    default: () => ({
      name: 'Supply Air',
      displayName: 'Supply Air Temperature',
      unit: '°F',
      tstatLocation: 'Kitchen'
    })
  },
  availableEquipment: {
    type: Array,
    default: () => []
  },
  equipmentPoints: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

const mode = ref('simple')
const templateParts = ref([])
const advancedTemplate = ref('')
const draggedIndex = ref(null)
const draggedVariable = ref(null) // For dragging from available variables
const selectedDeviceType = ref('') // For filtering points by device type
const selectedDeviceId = ref('') // For getting actual point values

const availableVariables = [
  { value: '{point.tstatLocation}', display: '📍 tstatLocation', description: 'Point location from tstatLocation point' },
  { value: '{device.location}', display: '🏢 Device Location', description: 'Physical device location' },
  { value: '{device.zone}', display: '🌐 Zone', description: 'Device zone assignment' },
  { value: '{device.name}', display: '🔧 Device Name', description: 'Device name' },
  { value: '{device.displayName}', display: '📛 Device Display', description: 'Device display name' },
  { value: '{device.type}', display: '⚙️ Device Type', description: 'Device type' },
  { value: '{point.name}', display: '📊 Point Name', description: 'Point name' },
  { value: '{point.displayName}', display: '📝 Point Display', description: 'Point display name' },
  { value: '{point.unit}', display: '📏 Unit', description: 'Point unit' }
]

// Get unique device types from available equipment
const deviceTypes = computed(() => {
  if (!props.availableEquipment || props.availableEquipment.length === 0) return []
  const types = new Set(props.availableEquipment.map(e => e.type).filter(Boolean))
  return Array.from(types).sort()
})

// Get devices of selected type
const devicesOfType = computed(() => {
  if (!selectedDeviceType.value) return []
  return props.availableEquipment.filter(e => e.type === selectedDeviceType.value)
})

// Get points from selected device
const discoveredPoints = computed(() => {
  if (!selectedDeviceId.value) return []
  const points = props.equipmentPoints[selectedDeviceId.value] || []
  return points.map(p => ({
    value: `{point.${p.name}}`,
    display: `📌 ${p.name}`,
    description: `Point: ${p.name}${p.unit ? ' (' + p.unit + ')' : ''}`,
    actualValue: p.value || p.currentValue || 'N/A'
  }))
})

// Combined variables: built-in + discovered
const allVariables = computed(() => {
  return [...availableVariables, ...discoveredPoints.value]
})

// Initialize from modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    advancedTemplate.value = newValue
    parseTemplate(newValue)
  }
}, { immediate: true })

// Formatted preview
const formattedPreview = computed(() => {
  const template = mode.value === 'simple' ? buildTemplateString() : advancedTemplate.value
  
  // Use props as-is - don't merge tstatLocation into device
  const device = { ...props.sampleDevice }
  const point = { ...props.samplePoint }
  
  return configService.formatLabel(template, device, point)
})

// Parse template string into parts for simple mode
function parseTemplate(template) {
  if (!template) return
  
  const parts = []
  const regex = /(\{[^}]+\})|([^{}]+)/g
  let match
  
  while ((match = regex.exec(template)) !== null) {
    if (match[1]) {
      // Variable
      const variable = availableVariables.find(v => v.value === match[1])
      if (variable) {
        parts.push({
          type: 'variable',
          value: variable.value,
          display: variable.display
        })
      }
    } else if (match[2] && match[2].trim()) {
      // Separator/text
      parts.push({
        type: 'separator',
        value: match[2],
        display: match[2]
      })
    }
  }
  
  templateParts.value = parts
}

// Build template string from parts
function buildTemplateString() {
  return templateParts.value.map(part => part.value).join('')
}

// Emit changes
function emitChange() {
  const template = mode.value === 'simple' ? buildTemplateString() : advancedTemplate.value
  emit('update:modelValue', template)
}

// Simple mode: Add variable
function addVariable(variable) {
  templateParts.value.push({
    type: 'variable',
    value: variable.value,
    display: variable.display
  })
  emitChange()
}

// Simple mode: Add separator
function addSeparator() {
  const separator = prompt('Enter separator text:', ' | ')
  if (separator !== null) {
    templateParts.value.push({
      type: 'separator',
      value: separator,
      display: separator
    })
    emitChange()
  }
}

// Simple mode: Remove part
function removePart(index) {
  templateParts.value.splice(index, 1)
  emitChange()
}

// Drag and drop for reordering existing chips
function onDragStart(index, event) {
  draggedIndex.value = index
  draggedVariable.value = null
  event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(index, event) {
  event.preventDefault()
  
  // If dragging a variable from available variables, just allow drop
  if (draggedVariable.value) {
    return
  }
  
  if (draggedIndex.value === null || draggedIndex.value === index) return
  
  // Reorder
  const draggedItem = templateParts.value[draggedIndex.value]
  templateParts.value.splice(draggedIndex.value, 1)
  templateParts.value.splice(index, 0, draggedItem)
  draggedIndex.value = index
}

function onDrop(event) {
  event.preventDefault()
  
  // Check if we're dropping a variable from available variables
  if (draggedVariable.value) {
    templateParts.value.push({
      type: 'variable',
      value: draggedVariable.value.value,
      display: draggedVariable.value.display
    })
    emitChange()
  }
  
  draggedIndex.value = null
  draggedVariable.value = null
  emitChange()
}

// Drag from available variables
function onVariableDragStart(variable, event) {
  draggedVariable.value = variable
  draggedIndex.value = null
  event.dataTransfer.effectAllowed = 'copy'
}

// Advanced mode: Parse on input
function parseAdvancedTemplate() {
  parseTemplate(advancedTemplate.value)
  emitChange()
}

// Advanced mode: Insert variable
function insertVariable(variable) {
  advancedTemplate.value += (advancedTemplate.value ? ' ' : '') + variable.value
  parseAdvancedTemplate()
}
</script>

<style scoped>
.label-builder {
  padding: var(--spacing-md);
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.builder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.builder-header h4 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}

.mode-toggle {
  display: flex;
  gap: 0;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.mode-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: transparent;
  border: none;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.mode-btn.active {
  background-color: var(--color-accent-primary);
  color: white;
}

.label-preview-box {
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
  border: 2px solid var(--color-border);
}

.preview-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  margin-bottom: var(--spacing-xs);
  font-weight: var(--font-weight-semibold);
}

.preview-content {
  font-size: var(--font-size-lg);
  color: var(--color-accent-primary);
  font-weight: var(--font-weight-semibold);
  font-family: 'Courier New', monospace;
  word-break: break-word;
}

/* Simple Mode */
.current-template {
  margin-bottom: var(--spacing-md);
}

.template-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
  font-weight: var(--font-weight-semibold);
}

.template-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 2px dashed var(--color-border);
  min-height: 60px;
  align-items: center;
}

.template-chip {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-accent-primary);
  color: white;
  border-radius: var(--radius-sm);
  cursor: move;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.template-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.chip-content {
  user-select: none;
}

.chip-remove {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip-remove:hover {
  background: rgba(255, 255, 255, 0.4);
}

.add-separator-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px dashed var(--color-border);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
  transition: all var(--transition-fast);
}

.add-separator-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-accent-primary);
}

.section-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
  font-weight: var(--font-weight-semibold);
}

.device-type-selector {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.type-select,
.device-select {
  flex: 1;
  padding: var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.type-select:focus,
.device-select:focus {
  outline: none;
  border-color: var(--color-accent-primary);
}

.variables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--spacing-xs);
}

.variable-chip {
  padding: var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  cursor: grab;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
  text-align: left;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-direction: column;
}

.variable-chip.discovered-point {
  background-color: rgba(59, 130, 246, 0.1);
  border-color: var(--color-accent-primary);
}

.variable-label {
  font-weight: var(--font-weight-medium);
}

.point-value {
  font-size: var(--font-size-xs);
  color: var(--color-accent-primary);
  font-family: 'Courier New', monospace;
  font-weight: var(--font-weight-bold);
}

.variable-chip {
  padding: var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  cursor: grab;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
  text-align: left;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.variable-chip:active {
  cursor: grabbing;
}

.variable-chip .drag-handle {
  color: var(--color-text-tertiary);
  font-size: 10px;
  opacity: 0.5;
}

.variable-chip:hover {
  background-color: var(--color-accent-primary);
  color: white;
  border-color: var(--color-accent-primary);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.variable-chip:hover .drag-handle {
  color: white;
  opacity: 1;
}

/* Advanced Mode */
.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  font-family: 'Courier New', monospace;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent-primary);
}

.available-variables-inline {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  align-items: center;
  font-size: var(--font-size-sm);
}

.available-variables-inline strong {
  color: var(--color-text-secondary);
  margin-right: var(--spacing-xs);
}

.variable-tag {
  padding: 2px 6px;
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.variable-tag:hover {
  background-color: var(--color-accent-primary);
  color: white;
  border-color: var(--color-accent-primary);
}
</style>

