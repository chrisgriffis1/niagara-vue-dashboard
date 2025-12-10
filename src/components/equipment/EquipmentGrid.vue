<template>
  <div class="equipment-grid-container">
    <!-- Grid Header -->
    <div class="grid-header">
      <div class="header-info">
        <h2>Equipment Overview</h2>
        <p class="equipment-count">
          {{ equipmentList.length }} {{ equipmentList.length === 1 ? 'device' : 'devices' }}
        </p>
      </div>
      <div class="header-actions">
        <button 
          v-if="equipmentTypes.length > 1"
          @click="toggleFilter" 
          class="filter-btn"
        >
          {{ showFilter ? 'Hide Filters' : 'Filter' }}
        </button>
        <button @click="refreshEquipment" :disabled="loading">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Filter Section -->
    <div v-if="showFilter" class="filter-section card">
      <!-- Equipment Type Filter -->
      <div class="filter-group">
        <label>Equipment Type</label>
        <div class="filter-chips">
          <button
            :class="['chip', { active: selectedType === null }]"
            @click="selectedType = null"
          >
            All ({{ equipmentList.length }})
          </button>
          <button
            v-for="type in equipmentTypes"
            :key="type"
            :class="['chip', { active: selectedType === type }]"
            @click="selectedType = type"
          >
            {{ type }} ({{ getTypeCount(type) }})
          </button>
        </div>
      </div>

      <!-- Location/Zone Filter -->
      <div class="filter-group">
        <label>Location / Zone</label>
        <div class="filter-chips">
          <button
            :class="['chip', { active: selectedLocation === null }]"
            @click="selectedLocation = null"
          >
            All Locations
          </button>
          <button
            v-for="location in equipmentLocations"
            :key="location"
            :class="['chip', { active: selectedLocation === location }]"
            @click="selectedLocation = location"
          >
            {{ location }} ({{ getLocationCount(location) }})
          </button>
        </div>
      </div>

      <!-- Alarm Filter -->
      <div class="filter-group">
        <label>Alarm Status</label>
        <div class="filter-chips">
          <button
            :class="['chip', { active: selectedAlarmFilter === null || selectedAlarmFilter === 'all' }]"
            @click="selectedAlarmFilter = null"
          >
            All Equipment
          </button>
          <button
            :class="['chip alarm-chip', { active: selectedAlarmFilter === 'with-alarms' }]"
            @click="selectedAlarmFilter = 'with-alarms'"
          >
            🔔 With Alarms ({{ getAlarmCount('with-alarms') }})
          </button>
          <button
            v-if="getAlarmCount('critical') > 0"
            :class="['chip alarm-chip critical', { active: selectedAlarmFilter === 'critical' }]"
            @click="selectedAlarmFilter = 'critical'"
          >
            ⚠ Critical ({{ getAlarmCount('critical') }})
          </button>
          <button
            v-if="getAlarmCount('high') > 0"
            :class="['chip alarm-chip high', { active: selectedAlarmFilter === 'high' }]"
            @click="selectedAlarmFilter = 'high'"
          >
            ⚡ High ({{ getAlarmCount('high') }})
          </button>
          <button
            v-if="getAlarmCount('medium') > 0"
            :class="['chip alarm-chip medium', { active: selectedAlarmFilter === 'medium' }]"
            @click="selectedAlarmFilter = 'medium'"
          >
            ℹ Medium ({{ getAlarmCount('medium') }})
          </button>
        </div>
      </div>

      <!-- Clear Filters Button -->
      <div v-if="hasActiveFilters" class="filter-actions">
        <button @click="clearFilters" class="clear-filters-btn">
          ✕ Clear All Filters
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && equipmentList.length === 0" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading equipment...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && filteredEquipment.length === 0" class="empty-state card">
      <p>No equipment found</p>
      <button @click="refreshEquipment" class="primary">
        Load Equipment
      </button>
    </div>

    <!-- Equipment Grid -->
    <div v-else class="equipment-grid">
      <EquipmentCard
        v-for="equipment in filteredEquipment"
        :key="equipment.id"
        :equipment="equipment"
        @point-clicked="handlePointClick"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * EquipmentGrid Component
 * Grid layout for multiple equipment cards with filtering
 * Tesla-inspired design with responsive layout
 */

import { ref, computed, onMounted } from 'vue'
import EquipmentCard from './EquipmentCard.vue'
import { useDeviceStore } from '../../stores/deviceStore'
import { useAlarmStore } from '../../stores/alarmStore'

const deviceStore = useDeviceStore()
const alarmStore = useAlarmStore()
const emit = defineEmits(['point-clicked'])

const loading = ref(false)
const showFilter = ref(false)
const selectedType = ref(null)
const selectedLocation = ref(null)
const selectedAlarmFilter = ref(null) // 'all', 'with-alarms', 'critical', 'high', 'medium', 'low'

// Get equipment list from store
const equipmentList = computed(() => deviceStore.allDevices)

// Get unique equipment types
const equipmentTypes = computed(() => {
  const types = [...new Set(equipmentList.value.map(e => e.type))]
  return types.sort()
})

// Get unique locations
const equipmentLocations = computed(() => {
  const locations = [...new Set(equipmentList.value.map(e => e.location))]
  return locations.sort()
})

// Get equipment IDs with alarms
const equipmentWithAlarms = computed(() => {
  return new Set(alarmStore.activeAlarms.map(alarm => alarm.equipmentId))
})

// Get equipment by alarm priority
const getEquipmentByAlarmPriority = (priority) => {
  const alarms = alarmStore.alarmsByPriority(priority).filter(a => a.active)
  return new Set(alarms.map(a => a.equipmentId))
}

// Filter equipment by type, location, and alarm status
const filteredEquipment = computed(() => {
  let filtered = equipmentList.value

  // Filter by type
  if (selectedType.value) {
    filtered = filtered.filter(e => e.type === selectedType.value)
  }

  // Filter by location
  if (selectedLocation.value) {
    filtered = filtered.filter(e => e.location === selectedLocation.value)
  }

  // Filter by alarm
  if (selectedAlarmFilter.value && selectedAlarmFilter.value !== 'all') {
    if (selectedAlarmFilter.value === 'with-alarms') {
      filtered = filtered.filter(e => equipmentWithAlarms.value.has(e.id))
    } else {
      // Filter by specific alarm priority
      const priorityEquipment = getEquipmentByAlarmPriority(selectedAlarmFilter.value)
      filtered = filtered.filter(e => priorityEquipment.has(e.id))
    }
  }

  return filtered
})

// Get count for specific type
const getTypeCount = (type) => {
  return equipmentList.value.filter(e => e.type === type).length
}

// Get count for specific location
const getLocationCount = (location) => {
  return equipmentList.value.filter(e => e.location === location).length
}

// Get count for alarm filter
const getAlarmCount = (filter) => {
  if (filter === 'with-alarms') {
    return equipmentWithAlarms.value.size
  }
  return getEquipmentByAlarmPriority(filter).size
}

// Clear all filters
const clearFilters = () => {
  selectedType.value = null
  selectedLocation.value = null
  selectedAlarmFilter.value = null
}

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return selectedType.value || selectedLocation.value || selectedAlarmFilter.value
})

// Toggle filter visibility
const toggleFilter = () => {
  showFilter.value = !showFilter.value
}

// Refresh equipment data
const refreshEquipment = async () => {
  loading.value = true
  try {
    await deviceStore.loadDevices()
  } catch (error) {
    console.error('Failed to refresh equipment:', error)
  } finally {
    loading.value = false
  }
}

// Handle point click from card
const handlePointClick = (point) => {
  emit('point-clicked', point)
}

// Load equipment on mount
onMounted(async () => {
  if (equipmentList.value.length === 0) {
    await refreshEquipment()
  }
})
</script>

<style scoped>
.equipment-grid-container {
  width: 100%;
}

/* Grid Header */
.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.header-info h2 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.equipment-count {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.filter-btn {
  background-color: var(--color-bg-tertiary);
}

/* Filter Section */
.filter-section {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-lg);
}

.filter-group {
  margin-bottom: var(--spacing-lg);
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-group label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.chip {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: unset;
}

.chip:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-border-light);
  color: var(--color-text-primary);
}

.chip.active {
  background-color: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
  color: var(--color-text-primary);
}

/* Alarm Filter Chips */
.alarm-chip {
  font-weight: var(--font-weight-semibold);
}

.alarm-chip.critical {
  border-color: var(--color-error);
}

.alarm-chip.critical.active {
  background-color: var(--color-error);
  color: white;
}

.alarm-chip.high {
  border-color: var(--color-warning);
}

.alarm-chip.high.active {
  background-color: var(--color-warning);
  color: var(--color-bg-primary);
}

.alarm-chip.medium {
  border-color: var(--color-info);
}

.alarm-chip.medium.active {
  background-color: var(--color-info);
  color: white;
}

/* Filter Actions */
.filter-actions {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.clear-filters-btn {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  min-height: unset;
}

.clear-filters-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

/* Equipment Grid */
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-lg);
  padding: var(--spacing-sm) 0;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
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

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  text-align: center;
}

.empty-state p {
  margin-bottom: var(--spacing-lg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .equipment-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .equipment-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }

  .grid-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .header-actions button {
    flex: 1;
  }

  .filter-chips {
    justify-content: flex-start;
  }
}
</style>

