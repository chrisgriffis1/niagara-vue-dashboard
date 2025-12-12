<template>
  <div class="equipment-grid-container">
    <!-- Grid Header -->
    <div class="grid-header">
      <div class="header-info">
        <h2>Equipment Overview</h2>
        <p class="equipment-count">
          {{ filteredEquipment.length }} {{ filteredEquipment.length === 1 ? 'device' : 'devices' }}
          <span v-if="searchQuery || hasActiveFilters" class="filter-indicator">
            (filtered)
          </span>
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

    <!-- Search Bar -->
    <div class="search-section">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search equipment by name, type, or location... (Press / to focus)"
          class="search-input"
          @keydown.esc="searchQuery = ''"
        />
        <button 
          v-if="searchQuery"
          @click="searchQuery = ''" 
          class="clear-search"
          title="Clear search"
        >
          ✕
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
            All ({{ filteredEquipment.length }})
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
        <label>Alarm & Status</label>
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
          <button
            v-if="getAlarmCount('warning') > 0"
            :class="['chip alarm-chip warning', { active: selectedAlarmFilter === 'warning' }]"
            @click="selectedAlarmFilter = 'warning'"
          >
            ⚠ Warning ({{ getAlarmCount('warning') }})
          </button>
        </div>
      </div>

      <!-- Advanced Filters (Collapsible) -->
      <div class="filter-group advanced-filters">
        <button 
          @click="showAdvancedFilters = !showAdvancedFilters"
          class="advanced-toggle"
        >
          {{ showAdvancedFilters ? '▼' : '▶' }} Advanced Filters
          <span v-if="selectedStatusFilter" class="active-indicator">•</span>
        </button>
        
        <div v-if="showAdvancedFilters" class="advanced-content">
          <!-- Communication Status -->
          <div class="sub-filter-group">
            <label>Communication Status</label>
            <div class="filter-chips">
              <button
                :class="['chip', { active: selectedStatusFilter === null }]"
                @click="selectedStatusFilter = null"
              >
                All
              </button>
              <button
                :class="['chip status-chip', { active: selectedStatusFilter === 'online' }]"
                @click="selectedStatusFilter = 'online'"
              >
                📡 Online ({{ getStatusCount('online') }})
              </button>
              <button
                :class="['chip status-chip', { active: selectedStatusFilter === 'offline' }]"
                @click="selectedStatusFilter = 'offline'"
                disabled
                title="No offline equipment (coming soon)"
              >
                📴 Offline (0)
              </button>
              <button
                :class="['chip status-chip', { active: selectedStatusFilter === 'stale' }]"
                @click="selectedStatusFilter = 'stale'"
                disabled
                title="Stale data detection (coming soon)"
              >
                ⏱ Stale Data (0)
              </button>
            </div>
          </div>

          <!-- Future Filters Placeholder -->
          <div class="coming-soon">
            <p>🔜 Coming Soon:</p>
            <ul>
              <li>Override Status (manual overrides)</li>
              <li>Operating Mode (cooling/heating/off)</li>
              <li>Occupancy Status (occupied/unoccupied)</li>
              <li>Running Status (on/off)</li>
            </ul>
          </div>
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

    <!-- Empty State (only if NO equipment loaded at all) -->
    <div v-else-if="!loading && equipmentList.length === 0" class="empty-state card">
      <p>No equipment found</p>
      <button @click="refreshEquipment" class="primary">
        Load Equipment
      </button>
    </div>

    <!-- No Results State (equipment loaded but filtered out) -->
    <div v-else-if="filteredEquipment.length === 0" class="empty-state card">
      <p>No equipment matches your filters</p>
      <button @click="clearFilters" class="secondary">
        Clear Filters
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

import { ref, computed, onMounted, onUnmounted } from 'vue'
import EquipmentCard from './EquipmentCard.vue'
import { useDeviceStore } from '../../stores/deviceStore'
import { useAlarmStore } from '../../stores/alarmStore'

const deviceStore = useDeviceStore()
const alarmStore = useAlarmStore()
const emit = defineEmits(['point-clicked'])

const loading = ref(false)
const showFilter = ref(false)
const showAdvancedFilters = ref(false)
const searchQuery = ref('')
const searchInputRef = ref(null)
const selectedType = ref(null)
const selectedLocation = ref(null)
const selectedAlarmFilter = ref(null) // 'all', 'with-alarms', 'critical', 'high', 'medium', 'low', 'warning'
const selectedStatusFilter = ref(null) // 'all', 'online', 'offline', 'stale'

// Get equipment list from store
const equipmentList = computed(() => deviceStore.allDevices)

// Get unique equipment types
const equipmentTypes = computed(() => {
  const types = [...new Set(equipmentList.value.map(e => e.type))]
  return types.sort()
})

// Get unique locations (filter out tstatLocation and other system values)
const equipmentLocations = computed(() => {
  const locations = [...new Set(equipmentList.value.map(e => e.location))]
    .filter(loc => {
      // Filter out empty, "Unknown", and system values like "tstatLocation"
      return loc && 
             loc !== 'Unknown' && 
             loc.toLowerCase() !== 'tstatlocation' &&
             !loc.toLowerCase().includes('slot:') &&
             !loc.toLowerCase().startsWith('/')
    })
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

// Filter equipment by type, location, alarm status, communication status, and search
const filteredEquipment = computed(() => {
  let filtered = equipmentList.value

  // Filter by search query (fuzzy matching)
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().replace(/\s+/g, '') // Remove spaces
    filtered = filtered.filter(e => {
      // Remove spaces from equipment fields for comparison
      const name = e.name.toLowerCase().replace(/\s+/g, '')
      const type = e.type.toLowerCase().replace(/\s+/g, '')
      const location = e.location.toLowerCase().replace(/\s+/g, '')
      const id = e.id.toLowerCase().replace(/\s+/g, '')
      
      return name.includes(query) ||
             type.includes(query) ||
             location.includes(query) ||
             id.includes(query)
    })
  }

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
    } else if (selectedAlarmFilter.value === 'warning') {
      // Show equipment with warning status (no critical/high/medium alarms)
      filtered = filtered.filter(e => {
        const hasAlarm = equipmentWithAlarms.value.has(e.id)
        if (hasAlarm) {
          const alarms = alarmStore.activeAlarms.filter(a => a.equipmentId === e.id)
          const priorities = alarms.map(a => a.priority)
          return !priorities.includes('critical') && 
                 !priorities.includes('high') && 
                 !priorities.includes('medium')
        }
        return e.status === 'warning'
      })
    } else {
      // Filter by specific alarm priority
      const priorityEquipment = getEquipmentByAlarmPriority(selectedAlarmFilter.value)
      filtered = filtered.filter(e => priorityEquipment.has(e.id))
    }
  }

  // Filter by communication status
  if (selectedStatusFilter.value && selectedStatusFilter.value !== 'all') {
    // For now, all equipment is online (mock data)
    // In real implementation, check actual status
    if (selectedStatusFilter.value === 'online') {
      filtered = filtered.filter(e => e.status !== 'offline')
    }
  }

  // Sort: by type first, then alphanumerically by name
  filtered = [...filtered].sort((a, b) => {
    // First sort by type
    const typeCompare = (a.type || '').localeCompare(b.type || '')
    if (typeCompare !== 0) return typeCompare
    
    // Then sort alphanumerically by name
    // Handle numeric suffixes properly (HP1, HP2, HP10 should sort correctly)
    const aName = a.name || ''
    const bName = b.name || ''
    
    // Extract numeric parts for natural sorting
    const aMatch = aName.match(/^(.+?)(\d+)$/)
    const bMatch = bName.match(/^(.+?)(\d+)$/)
    
    if (aMatch && bMatch && aMatch[1] === bMatch[1]) {
      // Same prefix, sort by number
      return parseInt(aMatch[2]) - parseInt(bMatch[2])
    }
    
    // Default string comparison
    return aName.localeCompare(bName)
  })

  return filtered
})

// Get count for specific type (considering other active filters)
const getTypeCount = (type) => {
  let filtered = equipmentList.value
  
  // Apply location filter if active
  if (selectedLocation.value) {
    filtered = filtered.filter(e => e.location === selectedLocation.value)
  }
  
  // Apply alarm filter if active
  if (selectedAlarmFilter.value && selectedAlarmFilter.value !== 'all') {
    if (selectedAlarmFilter.value === 'with-alarms') {
      filtered = filtered.filter(e => equipmentWithAlarms.value.has(e.id))
    } else if (selectedAlarmFilter.value === 'warning') {
      filtered = filtered.filter(e => {
        const hasAlarm = equipmentWithAlarms.value.has(e.id)
        if (hasAlarm) {
          const alarms = alarmStore.activeAlarms.filter(a => a.equipmentId === e.id)
          const priorities = alarms.map(a => a.priority)
          return !priorities.includes('critical') && 
                 !priorities.includes('high') && 
                 !priorities.includes('medium')
        }
        return e.status === 'warning'
      })
    } else {
      const priorityEquipment = getEquipmentByAlarmPriority(selectedAlarmFilter.value)
      filtered = filtered.filter(e => priorityEquipment.has(e.id))
    }
  }
  
  // Now count by type
  return filtered.filter(e => e.type === type).length
}

// Get count for specific location (considering other active filters)
const getLocationCount = (location) => {
  let filtered = equipmentList.value
  
  // Apply type filter if active
  if (selectedType.value) {
    filtered = filtered.filter(e => e.type === selectedType.value)
  }
  
  // Apply alarm filter if active
  if (selectedAlarmFilter.value && selectedAlarmFilter.value !== 'all') {
    if (selectedAlarmFilter.value === 'with-alarms') {
      filtered = filtered.filter(e => equipmentWithAlarms.value.has(e.id))
    } else if (selectedAlarmFilter.value === 'warning') {
      filtered = filtered.filter(e => {
        const hasAlarm = equipmentWithAlarms.value.has(e.id)
        if (hasAlarm) {
          const alarms = alarmStore.activeAlarms.filter(a => a.equipmentId === e.id)
          const priorities = alarms.map(a => a.priority)
          return !priorities.includes('critical') && 
                 !priorities.includes('high') && 
                 !priorities.includes('medium')
        }
        return e.status === 'warning'
      })
    } else {
      const priorityEquipment = getEquipmentByAlarmPriority(selectedAlarmFilter.value)
      filtered = filtered.filter(e => priorityEquipment.has(e.id))
    }
  }
  
  // Now count by location
  return filtered.filter(e => e.location === location).length
}

// Get count for alarm filter (considering other active filters)
const getAlarmCount = (filter) => {
  let filtered = equipmentList.value
  
  // Apply type filter if active
  if (selectedType.value) {
    filtered = filtered.filter(e => e.type === selectedType.value)
  }
  
  // Apply location filter if active
  if (selectedLocation.value) {
    filtered = filtered.filter(e => e.location === selectedLocation.value)
  }
  
  // Now count by alarm status
  if (filter === 'with-alarms') {
    return filtered.filter(e => equipmentWithAlarms.value.has(e.id)).length
  }
  if (filter === 'warning') {
    return filtered.filter(e => {
      const hasAlarm = equipmentWithAlarms.value.has(e.id)
      if (hasAlarm) {
        const alarms = alarmStore.activeAlarms.filter(a => a.equipmentId === e.id)
        const priorities = alarms.map(a => a.priority)
        return !priorities.includes('critical') && 
               !priorities.includes('high') && 
               !priorities.includes('medium')
      }
      return e.status === 'warning'
    }).length
  }
  const priorityEquipment = getEquipmentByAlarmPriority(filter)
  return filtered.filter(e => priorityEquipment.has(e.id)).length
}

// Get count for status filter
const getStatusCount = (status) => {
  if (status === 'online') {
    return equipmentList.value.filter(e => e.status !== 'offline').length
  }
  // Extend for offline, stale when real data available
  return 0
}

// Clear all filters
const clearFilters = () => {
  searchQuery.value = ''
  selectedType.value = null
  selectedLocation.value = null
  selectedAlarmFilter.value = null
  selectedStatusFilter.value = null
}

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return searchQuery.value.trim() ||
         selectedType.value || 
         selectedLocation.value || 
         selectedAlarmFilter.value ||
         selectedStatusFilter.value
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

// Expose filter methods for parent components
const applyAlarmFilter = (filterType) => {
  selectedAlarmFilter.value = filterType
  showFilter.value = true
  
  // Scroll to equipment grid
  setTimeout(() => {
    const gridElement = document.querySelector('.equipment-grid')
    if (gridElement) {
      gridElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

const applyLocationFilter = (location) => {
  selectedLocation.value = location
  showFilter.value = true
}

const applyTypeFilter = (type) => {
  selectedType.value = type
  showFilter.value = true
}

const scrollToGrid = () => {
  setTimeout(() => {
    const gridElement = document.querySelector('.equipment-grid')
    if (gridElement) {
      gridElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

// Expose methods to parent
defineExpose({
  applyAlarmFilter,
  applyLocationFilter,
  applyTypeFilter,
  scrollToGrid,
  clearFilters
})

// Load equipment on mount
onMounted(async () => {
  if (equipmentList.value.length === 0) {
    await refreshEquipment()
  }
  
  // Add keyboard shortcut listener
  window.addEventListener('keydown', handleKeyboardShortcut)
})

onUnmounted(() => {
  // Remove keyboard shortcut listener
  window.removeEventListener('keydown', handleKeyboardShortcut)
})

// Keyboard shortcuts
const handleKeyboardShortcut = (event) => {
  // / key - Focus search
  if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
    const searchInput = document.querySelector('.search-input')
    if (searchInput && document.activeElement !== searchInput) {
      event.preventDefault()
      searchInput.focus()
    }
  }
  
  // Escape key - Clear search or close filters
  if (event.key === 'Escape') {
    if (searchQuery.value) {
      searchQuery.value = ''
    } else if (showFilter.value) {
      showFilter.value = false
    }
  }
}
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

.alarm-chip.warning {
  border-color: var(--color-warning);
}

.alarm-chip.warning.active {
  background-color: var(--color-warning);
  color: var(--color-bg-primary);
}

/* Advanced Filters */
.advanced-filters {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.advanced-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: color var(--transition-fast);
  min-height: unset;
  text-align: left;
}

.advanced-toggle:hover {
  color: var(--color-text-primary);
}

.active-indicator {
  color: var(--color-accent-primary);
  font-size: var(--font-size-xl);
  line-height: 0;
}

.advanced-content {
  margin-top: var(--spacing-md);
  padding-left: var(--spacing-md);
  border-left: 2px solid var(--color-border);
}

.sub-filter-group {
  margin-bottom: var(--spacing-md);
}

.sub-filter-group label {
  font-size: var(--font-size-xs);
  margin-bottom: var(--spacing-xs);
}

.status-chip {
  font-size: var(--font-size-xs);
}

.chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.coming-soon {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: rgba(59, 130, 246, 0.05);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

.coming-soon p {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.coming-soon ul {
  margin: 0;
  padding-left: var(--spacing-lg);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  line-height: 1.6;
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

/* Search Section */
.search-section {
  margin-bottom: var(--spacing-lg);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background-color: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  transition: all var(--transition-fast);
}

.search-box:focus-within {
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  font-size: var(--font-size-lg);
  margin-right: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  font-family: inherit;
  padding: var(--spacing-xs) 0;
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.clear-search {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
  padding: var(--spacing-xs);
  min-height: unset;
  cursor: pointer;
  transition: color var(--transition-fast);
  border-radius: var(--radius-sm);
}

.clear-search:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-hover);
}

.filter-indicator {
  color: var(--color-accent-primary);
  font-weight: var(--font-weight-semibold);
}
</style>

