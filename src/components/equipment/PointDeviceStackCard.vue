<template>
  <div class="stack-card" :class="[statusClass, { expanded: isExpanded }]">
    <div class="stack-header" @click="toggleExpand">
      <div class="stack-icon">{{ typeIcon }}</div>
      <div class="stack-info">
        <div class="stack-title">{{ deviceType }} ({{ devices.length }})</div>
        <div class="stack-summary">{{ summaryText }}</div>
        <div v-if="locationsSummary" class="stack-locations">📍 {{ locationsSummary }}</div>
      </div>
      <div class="stack-status">
        <span class="status-indicator" :class="statusClass"></span>
        <span class="expand-icon">{{ isExpanded ? '▼' : '▶' }}</span>
      </div>
    </div>
    
    <div v-if="isExpanded" class="stack-devices">
      <div 
        v-for="device in devices" 
        :key="device.id" 
        class="device-row"
        :class="getDeviceStatusClass(device)"
      >
        <div class="device-info">
          <span class="device-name">{{ device.name }}</span>
          <span v-if="device.location || device.zone" class="device-location">
            📍 {{ device.location || device.zone }}
          </span>
        </div>
        <div class="device-value-container">
          <span class="device-value">{{ formatValue(device.currentValue) }}</span>
          <span v-if="device.unit" class="device-unit">{{ device.unit }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  deviceType: {
    type: String,
    required: true
  },
  devices: {
    type: Array,
    required: true
  }
})

onMounted(() => {
  console.log(`🃏 Stack card mounted: ${props.deviceType} (${props.devices.length} devices)`)
})

const isExpanded = ref(false)

// Determine if this type uses boolean values
const isBooleanType = computed(() => {
  const booleanTypes = ['Exhaust Fan', 'Fan', 'Pump', 'Motor']
  return booleanTypes.some(t => props.deviceType.includes(t))
})

// Get icon for device type
const typeIcon = computed(() => {
  const icons = {
    'Exhaust Fan': '🌀',
    'Water Sensor': '💧',
    'Freezer': '❄️',
    'Fridge': '🧊',
    'Heater': '🔥',
    'Pressure Sensor': '📊',
    'Cooling Tower': '🏗️',
    'Fan': '🌀',
    'Pump': '⚡',
    'Sensor': '📡'
  }
  // Find matching icon or default
  for (const [key, icon] of Object.entries(icons)) {
    if (props.deviceType.includes(key)) return icon
  }
  return '📦'
})

// Count ON/OFF for boolean types
const onCount = computed(() => {
  if (!isBooleanType.value) return 0
  return props.devices.filter(d => 
    d.currentValue === true || 
    d.currentValue === 'true' || 
    d.currentValue === 'True' ||
    d.currentValue === 'ON'
  ).length
})

const offCount = computed(() => {
  if (!isBooleanType.value) return 0
  return props.devices.length - onCount.value
})

// Get min/max for numeric types
const numericRange = computed(() => {
  if (isBooleanType.value) return null
  const values = props.devices
    .map(d => parseFloat(d.currentValue))
    .filter(v => !isNaN(v))
  if (values.length === 0) return null
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length
  }
})

// Generate summary text
const summaryText = computed(() => {
  if (isBooleanType.value) {
    return `${onCount.value} ON / ${offCount.value} OFF`
  }
  if (numericRange.value) {
    const { min, max } = numericRange.value
    const unit = props.devices[0]?.unit || ''
    if (min === max) {
      return `${min.toFixed(1)}${unit}`
    }
    return `${min.toFixed(1)} - ${max.toFixed(1)}${unit}`
  }
  return 'No data'
})

// Get unique locations in this group
const locationsSummary = computed(() => {
  const locations = [...new Set(props.devices.map(d => d.location || d.zone).filter(Boolean))]
  if (locations.length === 0) return ''
  if (locations.length === 1) return locations[0]
  if (locations.length === 2) return locations.join(' & ')
  return `${locations.length} locations`
})

// Status class for coloring
const statusClass = computed(() => {
  if (isBooleanType.value) {
    if (offCount.value === 0) return 'status-good'
    if (onCount.value === 0) return 'status-off'
    return 'status-mixed'
  }
  // For numeric, could add threshold-based logic
  return 'status-neutral'
})

// Get status class for individual device row
const getDeviceStatusClass = (device) => {
  if (isBooleanType.value) {
    const val = device.currentValue
    if (val === true || val === 'true' || val === 'True' || val === 'ON') {
      return 'device-on'
    }
    return 'device-off'
  }
  return ''
}

// Format display value
const formatValue = (value) => {
  if (value === true || value === 'true' || value === 'True') return 'ON'
  if (value === false || value === 'false' || value === 'False') return 'OFF'
  if (typeof value === 'number') {
    return value % 1 === 0 ? value : value.toFixed(1)
  }
  return value ?? 'N/A'
}

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.stack-card {
  background: var(--color-bg-secondary, #1a1a2e);
  border-radius: 12px;
  border: 1px solid var(--color-border, #333);
  overflow: hidden;
  transition: all 0.2s ease;
}

.stack-card:hover {
  border-color: var(--color-border-hover, #555);
}

.stack-header {
  display: flex;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  gap: 12px;
}

.stack-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary, #252540);
  border-radius: 8px;
}

.stack-info {
  flex: 1;
}

.stack-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, #fff);
}

.stack-summary {
  font-size: 14px;
  color: var(--color-text-secondary, #888);
  margin-top: 2px;
}

.stack-locations {
  font-size: 12px;
  color: var(--color-text-tertiary, #666);
  margin-top: 2px;
}

.stack-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-good .status-indicator {
  background: var(--color-success, #4ade80);
  box-shadow: 0 0 8px var(--color-success, #4ade80);
}

.status-off .status-indicator {
  background: var(--color-text-tertiary, #666);
}

.status-mixed .status-indicator {
  background: var(--color-warning, #fbbf24);
  box-shadow: 0 0 8px var(--color-warning, #fbbf24);
}

.status-neutral .status-indicator {
  background: var(--color-primary, #3b82f6);
}

.expand-icon {
  color: var(--color-text-tertiary, #666);
  font-size: 12px;
  transition: transform 0.2s;
}

.expanded .expand-icon {
  transform: rotate(0deg);
}

.stack-devices {
  border-top: 1px solid var(--color-border, #333);
  max-height: 300px;
  overflow-y: auto;
}

.device-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border, #222);
  gap: 12px;
}

.device-row:last-child {
  border-bottom: none;
}

.device-row:hover {
  background: var(--color-bg-tertiary, #252540);
}

.device-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-name {
  color: var(--color-text-primary, #fff);
  font-size: 14px;
  font-weight: 500;
}

.device-location {
  color: var(--color-text-tertiary, #666);
  font-size: 12px;
}

.device-value-container {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.device-value {
  font-weight: 600;
  font-size: 14px;
}

.device-on .device-value {
  color: var(--color-success, #4ade80);
}

.device-off .device-value {
  color: var(--color-text-tertiary, #666);
}

.device-unit {
  color: var(--color-text-tertiary, #666);
  font-size: 12px;
}
</style>
