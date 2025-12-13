<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="smart-modal">
      <div class="modal-header">
        <h3>🎯 Smart Selection</h3>
        <button @click="close" class="close-btn">✕</button>
      </div>

      <div class="modal-content">
        <!-- Equipment Selector (for same-type when >5 devices) -->
        <div v-if="showEquipmentSelector" class="selector-view">
          <h4>📦 Select Devices ({{ currentEquipment.type }})</h4>
          <p class="section-desc">Choose which devices to add points from (max {{ MAX_POINTS_AT_ONCE }} points total)</p>
          
          <div class="equipment-list">
            <label 
              v-for="equipment in sameTypeEquipment" 
              :key="equipment.id"
              class="equipment-item"
            >
              <input 
                type="checkbox" 
                :value="equipment.id"
                v-model="selectedEquipmentIds"
              />
              <span class="equipment-name">{{ equipment.name }}</span>
              <span class="equipment-count">
                ({{ (equipmentPoints[equipment.id] || []).filter(p => p.hasHistory).length }} pts)
              </span>
            </label>
          </div>
          
          <div class="selector-actions">
            <button @click="cancelEquipmentSelection" class="btn-secondary">Cancel</button>
            <button @click="addSelectedEquipmentPoints" class="btn-primary">
              Add Selected Points
            </button>
          </div>
        </div>

        <!-- Location Alarm Selector -->
        <div v-else-if="showLocationAlarmSelector" class="selector-view">
          <h4>🚨 Select Alarmed Points in Location</h4>
          <p class="section-desc">Select devices and points with alarms (max {{ MAX_POINTS_AT_ONCE }} points)</p>
          
          <div class="alarm-equipment-list">
            <div 
              v-for="{ equipment, points } in equipmentWithAlarmsInLocation" 
              :key="equipment.id"
              class="alarm-equipment-group"
            >
              <label class="equipment-header">
                <input 
                  type="checkbox" 
                  :checked="selectedEquipmentIds.includes(equipment.id)"
                  @change="toggleEquipmentForAlarms(equipment.id)"
                />
                <span class="equipment-name">{{ equipment.name }}</span>
                <span class="equipment-type">({{ equipment.type }})</span>
                <span class="equipment-count">{{ points.length }} alarmed pts</span>
              </label>
              
              <div v-if="selectedEquipmentIds.includes(equipment.id)" class="points-list">
                <label 
                  v-for="point in points" 
                  :key="point.id"
                  class="point-item"
                >
                  <input 
                    type="checkbox" 
                    :checked="selectedPointIds.includes(point.id)"
                    @change="togglePointForAlarms(point)"
                    :disabled="!selectedPointIds.includes(point.id) && selectedPointIds.length >= MAX_POINTS_AT_ONCE"
                  />
                  <span class="point-name">{{ point.name }}</span>
                  <span v-if="point.value" class="point-value">{{ point.value }}</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="selector-actions">
            <button @click="cancelLocationAlarmSelection" class="btn-secondary">Cancel</button>
            <button @click="addSelectedLocationAlarmPoints" class="btn-primary">
              Add {{ selectedPointIds.length }} Point(s)
            </button>
          </div>
        </div>

        <!-- Main Smart Selection View -->
        <div v-else>
        <!-- By Device Type -->
        <div v-if="currentEquipment" class="smart-section">
          <h4>📦 Same Type Equipment ({{ currentEquipment.type }})</h4>
          <p class="section-desc">Select points from other {{ currentEquipment.type }} devices</p>
          
          <div class="smart-actions">
            <button 
              v-if="sameTypeEquipment.length > 0"
              @click="addAllFromSameType"
              class="smart-btn primary"
            >
              <span class="btn-icon">+</span>
              All Points from {{ sameTypeEquipment.length }} {{ currentEquipment.type }} devices
            </button>
            
            <button 
              v-if="selectedCurrentPoint"
              @click="addSamePointFromSameType"
              class="smart-btn"
            >
              <span class="btn-icon">🔍</span>
              "{{ selectedCurrentPoint.name }}" from all {{ currentEquipment.type }}
            </button>
          </div>
        </div>

        <!-- By Location -->
        <div v-if="currentEquipment && currentEquipment.location" class="smart-section">
          <h4>📍 Same Location ({{ currentEquipment.location }})</h4>
          <p class="section-desc">Select points from devices in the same location</p>
          
          <div class="smart-actions">
            <button 
              v-if="sameLocationEquipment.length > 0"
              @click="addAllFromSameLocation"
              class="smart-btn primary"
            >
              <span class="btn-icon">+</span>
              All Points from {{ sameLocationEquipment.length }} devices in {{ currentEquipment.location }}
            </button>
            
            <button 
              v-if="selectedCurrentPoint"
              @click="addSamePointFromSameLocation"
              class="smart-btn"
            >
              <span class="btn-icon">🔍</span>
              "{{ selectedCurrentPoint.name }}" from {{ currentEquipment.location }}
            </button>
          </div>
        </div>

        <!-- Points in Alarm (same device) -->
        <div v-if="currentEquipment" class="smart-section">
          <h4>🚨 Points in Alarm (This Device)</h4>
          <p class="section-desc">Select points that are currently in alarm on {{ currentEquipment.name }}</p>
          
          <div class="smart-actions">
            <button 
              v-if="alarmedPointsOnDevice.length > 0"
              @click="addAlarmedPointsOnDevice"
              class="smart-btn danger"
            >
              <span class="btn-icon">⚠️</span>
              Add {{ alarmedPointsOnDevice.length }} alarmed points
            </button>
            <p v-else class="no-data">No points currently in alarm on this device</p>
          </div>
        </div>

        <!-- Points in Alarm (same location) -->
        <div v-if="currentEquipment && (currentEquipment.zone || currentEquipment.location)" class="smart-section">
          <h4>🚨 Points in Alarm (Same Location)</h4>
          <p class="section-desc">Select points in alarm from {{ currentEquipment.zone || currentEquipment.location }}</p>
          
          <div class="smart-actions">
            <button 
              v-if="alarmedPointsInLocation.length > 0"
              @click="openLocationAlarmSelector"
              class="smart-btn danger"
            >
              <span class="btn-icon">⚠️</span>
              Select from {{ equipmentWithAlarmsInLocation.length }} device(s) with {{ alarmedPointsInLocation.length }} alarmed point(s)
            </button>
            <p v-else class="no-data">No points currently in alarm in this location</p>
          </div>
        </div>

        <!-- Connected AHUs (for zones) -->
        <div v-if="connectedAHUs.length > 0" class="smart-section">
          <h4>🌀 Connected AHUs</h4>
          <p class="section-desc">Select points from AHUs connected to this zone</p>
          
          <div class="smart-actions">
            <button 
              @click="addPointsFromConnectedAHUs"
              class="smart-btn primary"
            >
              <span class="btn-icon">+</span>
              All Points from {{ connectedAHUs.length }} connected AHUs
            </button>
          </div>
          
          <div class="connected-list">
            <div v-for="ahu in connectedAHUs" :key="ahu.id" class="connected-item">
              {{ ahu.name }}
            </div>
          </div>
        </div>

        <!-- No selections available -->
        <div v-if="!currentEquipment" class="no-data-section">
          <p>⚠️ Please select a device first to use Smart Selection features</p>
        </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn-secondary">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  currentEquipment: {
    type: Object,
    default: null
  },
  availableEquipment: {
    type: Array,
    default: () => []
  },
  equipmentPoints: {
    type: Object,
    default: () => ({})
  },
  selectedPoints: {
    type: Array,
    default: () => []
  },
  alarms: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'add-points'])

// UI state for equipment/point selection
const showEquipmentSelector = ref(false)
const showLocationAlarmSelector = ref(false)
const selectedEquipmentIds = ref([])
const selectedPointIds = ref([])

const MAX_POINTS_AT_ONCE = 10

// Currently selected point from current equipment
const selectedCurrentPoint = computed(() => {
  if (!props.currentEquipment || props.selectedPoints.length === 0) return null
  return props.selectedPoints.find(p => p.equipmentId === props.currentEquipment.id)
})

// Same type equipment
const sameTypeEquipment = computed(() => {
  if (!props.currentEquipment) return []
  return props.availableEquipment.filter(e => 
    e.type === props.currentEquipment.type && e.id !== props.currentEquipment.id
  )
})

// Same location equipment (use zone/location, not statLocation)
const sameLocationEquipment = computed(() => {
  if (!props.currentEquipment) return []
  
  // Priority: zone > location
  const targetLocation = props.currentEquipment.zone || props.currentEquipment.location
  if (!targetLocation) return []
  
  return props.availableEquipment.filter(e => {
    if (e.id === props.currentEquipment.id) return false
    const eLocation = e.zone || e.location
    return eLocation === targetLocation
  })
})

// Points in alarm on current device
const alarmedPointsOnDevice = computed(() => {
  if (!props.currentEquipment) return []
  const devicePoints = props.equipmentPoints[props.currentEquipment.id] || []
  return devicePoints.filter(point => {
    return props.alarms.some(alarm => 
      alarm.equipmentId === props.currentEquipment.id && 
      alarm.sourcePoint === point.name
    )
  })
})

// Points in alarm in same location (use zone/location)
const alarmedPointsInLocation = computed(() => {
  if (!props.currentEquipment) return []
  
  const targetLocation = props.currentEquipment.zone || props.currentEquipment.location
  if (!targetLocation) return []
  
  const locationEquipment = [props.currentEquipment, ...sameLocationEquipment.value]
  const pointsWithAlarms = []
  
  locationEquipment.forEach(equipment => {
    const points = props.equipmentPoints[equipment.id] || []
    // Only include points with history
    points.filter(p => p.hasHistory).forEach(point => {
      const hasAlarm = props.alarms.some(alarm => 
        alarm.equipmentId === equipment.id && alarm.sourcePoint === point.name
      )
      if (hasAlarm) {
        pointsWithAlarms.push({ ...point, equipment })
      }
    })
  })
  
  return pointsWithAlarms
})

// Equipment with alarmed points in location
const equipmentWithAlarmsInLocation = computed(() => {
  const equipmentMap = new Map()
  
  alarmedPointsInLocation.value.forEach(point => {
    if (!equipmentMap.has(point.equipment.id)) {
      equipmentMap.set(point.equipment.id, {
        equipment: point.equipment,
        points: []
      })
    }
    equipmentMap.get(point.equipment.id).points.push(point)
  })
  
  return Array.from(equipmentMap.values())
})

// Connected AHUs (for zones)
const connectedAHUs = computed(() => {
  if (!props.currentEquipment) return []
  
  // Check if current equipment has a zone reference
  const zone = props.currentEquipment.zone || props.currentEquipment.location
  if (!zone) return []
  
  // Find AHUs that serve this zone
  return props.availableEquipment.filter(e => 
    e.type === 'AHU' && 
    (e.zone === zone || e.servesZone === zone || e.location === zone)
  )
})

// Action handlers
const close = () => {
  // Reset UI state
  showEquipmentSelector.value = false
  showLocationAlarmSelector.value = false
  selectedEquipmentIds.value = []
  selectedPointIds.value = []
  emit('close')
}

const addAllFromSameType = () => {
  // If more than 5 equipment, show selector
  if (sameTypeEquipment.value.length > 5) {
    showEquipmentSelector.value = true
    return
  }
  
  // Otherwise, collect all points (with history) and limit to 10
  const points = []
  sameTypeEquipment.value.forEach(equipment => {
    const equipPoints = props.equipmentPoints[equipment.id] || []
    equipPoints.filter(p => p.hasHistory).forEach(point => {
      if (points.length < MAX_POINTS_AT_ONCE) {
        points.push({ ...point, equipment })
      }
    })
  })
  
  if (points.length === 0) {
    alert('No points with history found on these devices')
    return
  }
  
  emit('add-points', points.slice(0, MAX_POINTS_AT_ONCE))
}

const addSelectedEquipmentPoints = () => {
  if (selectedEquipmentIds.value.length === 0) {
    alert('Please select at least one device')
    return
  }
  
  const points = []
  selectedEquipmentIds.value.forEach(equipId => {
    const equipment = sameTypeEquipment.value.find(e => e.id === equipId)
    if (!equipment) return
    
    const equipPoints = props.equipmentPoints[equipId] || []
    equipPoints.filter(p => p.hasHistory).forEach(point => {
      if (points.length < MAX_POINTS_AT_ONCE) {
        points.push({ ...point, equipment })
      }
    })
  })
  
  if (points.length === 0) {
    alert('No points with history found on selected devices')
    return
  }
  
  emit('add-points', points.slice(0, MAX_POINTS_AT_ONCE))
  showEquipmentSelector.value = false
  selectedEquipmentIds.value = []
}

const cancelEquipmentSelection = () => {
  showEquipmentSelector.value = false
  selectedEquipmentIds.value = []
}

const addSamePointFromSameType = () => {
  if (!selectedCurrentPoint.value) return
  const targetName = selectedCurrentPoint.value.name.toLowerCase()
  const points = []
  
  sameTypeEquipment.value.forEach(equipment => {
    const equipPoints = props.equipmentPoints[equipment.id] || []
    const matchingPoint = equipPoints.find(p => p.name.toLowerCase() === targetName)
    if (matchingPoint && matchingPoint.hasHistory && points.length < MAX_POINTS_AT_ONCE) {
      points.push({ ...matchingPoint, equipment })
    }
  })
  
  if (points.length === 0) {
    alert(`No matching "${selectedCurrentPoint.value.name}" points with history found`)
    return
  }
  
  emit('add-points', points)
}

const addAllFromSameLocation = () => {
  const points = []
  sameLocationEquipment.value.forEach(equipment => {
    const equipPoints = props.equipmentPoints[equipment.id] || []
    equipPoints.filter(p => p.hasHistory).forEach(point => {
      if (points.length < MAX_POINTS_AT_ONCE) {
        points.push({ ...point, equipment })
      }
    })
  })
  
  if (points.length === 0) {
    alert('No points with history found in this location')
    return
  }
  
  emit('add-points', points.slice(0, MAX_POINTS_AT_ONCE))
}

const addSamePointFromSameLocation = () => {
  if (!selectedCurrentPoint.value) return
  const targetName = selectedCurrentPoint.value.name.toLowerCase()
  const points = []
  
  sameLocationEquipment.value.forEach(equipment => {
    const equipPoints = props.equipmentPoints[equipment.id] || []
    const matchingPoint = equipPoints.find(p => p.name.toLowerCase() === targetName)
    if (matchingPoint && matchingPoint.hasHistory && points.length < MAX_POINTS_AT_ONCE) {
      points.push({ ...matchingPoint, equipment })
    }
  })
  
  if (points.length === 0) {
    alert(`No matching "${selectedCurrentPoint.value.name}" points with history found`)
    return
  }
  
  emit('add-points', points)
}

const addAlarmedPointsOnDevice = () => {
  const points = alarmedPointsOnDevice.value.map(point => ({
    ...point,
    equipment: props.currentEquipment
  })).slice(0, MAX_POINTS_AT_ONCE)
  
  emit('add-points', points)
}

const openLocationAlarmSelector = () => {
  showLocationAlarmSelector.value = true
  selectedEquipmentIds.value = []
  selectedPointIds.value = []
}

const toggleEquipmentForAlarms = (equipId) => {
  const index = selectedEquipmentIds.value.indexOf(equipId)
  if (index > -1) {
    selectedEquipmentIds.value.splice(index, 1)
    // Remove any selected points from this equipment
    const equipmentData = equipmentWithAlarmsInLocation.value.find(e => e.equipment.id === equipId)
    if (equipmentData) {
      equipmentData.points.forEach(point => {
        const pointIndex = selectedPointIds.value.indexOf(point.id)
        if (pointIndex > -1) {
          selectedPointIds.value.splice(pointIndex, 1)
        }
      })
    }
  } else {
    selectedEquipmentIds.value.push(equipId)
  }
}

const togglePointForAlarms = (point) => {
  const index = selectedPointIds.value.indexOf(point.id)
  if (index > -1) {
    selectedPointIds.value.splice(index, 1)
  } else {
    if (selectedPointIds.value.length < MAX_POINTS_AT_ONCE) {
      selectedPointIds.value.push(point.id)
    } else {
      alert(`Maximum ${MAX_POINTS_AT_ONCE} points allowed at once`)
    }
  }
}

const addSelectedLocationAlarmPoints = () => {
  if (selectedPointIds.value.length === 0) {
    alert('Please select at least one point')
    return
  }
  
  const selectedPoints = alarmedPointsInLocation.value.filter(p => 
    selectedPointIds.value.includes(p.id)
  )
  
  emit('add-points', selectedPoints.slice(0, MAX_POINTS_AT_ONCE))
  showLocationAlarmSelector.value = false
  selectedEquipmentIds.value = []
  selectedPointIds.value = []
}

const cancelLocationAlarmSelection = () => {
  showLocationAlarmSelector.value = false
  selectedEquipmentIds.value = []
  selectedPointIds.value = []
}

const addAlarmedPointsInLocation = () => {
  // Always open selector for location alarms to allow device/point selection
  openLocationAlarmSelector()
}

const addPointsFromConnectedAHUs = () => {
  const points = []
  connectedAHUs.value.forEach(equipment => {
    const equipPoints = props.equipmentPoints[equipment.id] || []
    equipPoints.filter(p => p.hasHistory).forEach(point => {
      if (points.length < MAX_POINTS_AT_ONCE) {
        points.push({ ...point, equipment })
      }
    })
  })
  
  if (points.length === 0) {
    alert('No points with history found on connected AHUs')
    return
  }
  
  emit('add-points', points.slice(0, MAX_POINTS_AT_ONCE))
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: var(--spacing-md);
}

.smart-modal {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: var(--font-size-xl);
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--spacing-xs);
  min-height: unset;
  transition: color var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-text-primary);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

.smart-section {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.smart-section h4 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

.section-desc {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.smart-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.smart-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.smart-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-accent-primary);
  transform: translateX(4px);
}

.smart-btn.primary {
  background: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
  color: white;
  font-weight: var(--font-weight-semibold);
}

.smart-btn.primary:hover {
  background: var(--color-accent-hover);
}

.smart-btn.danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

.smart-btn.danger:hover {
  background: rgba(239, 68, 68, 0.2);
}

.btn-icon {
  font-size: var(--font-size-lg);
}

.connected-list {
  margin-top: var(--spacing-md);
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.connected-item {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.no-data {
  padding: var(--spacing-md);
  text-align: center;
  color: var(--color-text-tertiary);
  font-style: italic;
  font-size: var(--font-size-sm);
}

.no-data-section {
  padding: var(--spacing-xl);
  text-align: center;
}

.no-data-section p {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}

.modal-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}

.btn-secondary {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);
}

.btn-secondary:hover {
  background: var(--color-bg-tertiary);
}

/* Selector Views */
.selector-view {
  padding: var(--spacing-lg);
}

.selector-view h4 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
}

.equipment-list,
.alarm-equipment-list {
  max-height: 400px;
  overflow-y: auto;
  margin: var(--spacing-md) 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
}

.equipment-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.equipment-item:hover {
  background: var(--color-bg-hover);
}

.equipment-name {
  flex: 1;
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.equipment-type {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.equipment-count {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.alarm-equipment-group {
  margin-bottom: var(--spacing-md);
}

.equipment-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: var(--font-weight-semibold);
  transition: background var(--transition-fast);
}

.equipment-header:hover {
  background: var(--color-bg-hover);
}

.points-list {
  margin-top: var(--spacing-xs);
  margin-left: var(--spacing-xl);
  padding-left: var(--spacing-md);
  border-left: 2px solid var(--color-border);
}

.point-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.point-item:hover {
  background: var(--color-bg-hover);
}

.point-item:has(input:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.point-name {
  flex: 1;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.point-value {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-family: monospace;
}

.selector-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.btn-primary {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-accent-primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  transition: all var(--transition-fast);
}

.btn-primary:hover {
  background: var(--color-accent-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .smart-modal {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .modal-content {
    padding: var(--spacing-md);
  }
  
  .smart-section {
    padding: var(--spacing-md);
  }
}
</style>

