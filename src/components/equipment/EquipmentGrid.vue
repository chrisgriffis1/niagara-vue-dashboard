<template>
  <div class="equipment-grid-container">
    <GridHeader
      :equipment-count="filteredEquipment.length"
      :has-filters="!!searchQuery || hasActiveFilters"
      :show-filter="showFilter"
      :loading="loading"
      :show-filter-button="equipmentTypes.length > 1"
      @toggle-filter="toggleFilter"
      @refresh="refreshEquipment"
      @force-refresh="forceRefresh"
    />

    <SearchBar
      v-model="searchQuery"
      @clear="searchQuery = ''"
    />

    <FilterSection
      :show-filter="showFilter"
      :selected-type="selectedType"
      :selected-location="selectedLocation"
      :selected-alarm-filter="selectedAlarmFilter"
      :show-advanced-filters="showAdvancedFilters"
      :selected-communication-status="selectedCommunicationStatus"
      :equipment-types="equipmentTypes"
      :equipment-locations="equipmentLocations"
      :total-count="filteredEquipment.length"
      :has-active-filters="hasActiveFilters"
      :get-type-count="getTypeCount"
      :get-location-count="getLocationCount"
      :get-alarm-count="getAlarmCount"
      @update:selected-type="selectedType = $event"
      @update:selected-location="selectedLocation = $event"
      @update:selected-alarm-filter="selectedAlarmFilter = $event"
      @update:show-advanced-filters="showAdvancedFilters = $event"
      @update:selected-communication-status="selectedCommunicationStatus = $event"
      @clear-filters="clearFilters"
    />

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

    <EquipmentGridDisplay
      :equipment="filteredEquipment"
      :loading="loading"
      :has-active-filters="hasActiveFilters"
      @point-clicked="handlePointClick"
      @equipment-clicked="handleEquipmentClick"
      @clear-filters="clearFilters"
    />
  </div>
</template>

<script setup>
/**
 * EquipmentGrid Component
 * Main equipment grid with filtering and search
 * Refactored to use sub-components for maintainability
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDeviceStore } from '../../stores/deviceStore'
import { useAlarmStore } from '../../stores/alarmStore'
import GridHeader from './GridHeader.vue'
import SearchBar from './SearchBar.vue'
import FilterSection from './FilterSection.vue'
import EquipmentGridDisplay from './EquipmentGridDisplay.vue'

const deviceStore = useDeviceStore()
const alarmStore = useAlarmStore()
const emit = defineEmits(['point-clicked'])

const loading = ref(false)
const showFilter = ref(false)
const showAdvancedFilters = ref(false)
const searchQuery = ref('')
const searchInputRef = ref(null)

// Get equipment list from store
const equipmentList = computed(() => deviceStore.allDevices || [])

// Get unique equipment types
const equipmentTypes = computed(() => {
  const types = [...new Set(equipmentList.value.map(e => e?.type).filter(Boolean))]
  return types.sort()
})

// Get unique zones for filtering - these come from the Location enum points (not tstatLocation)
// Zones are values like "Wing 300", "ZoneC_S" - typically only 5-6 unique values
const equipmentLocations = computed(() => {
  const locations = [...new Set(equipmentList.value.map(e => e?.location || e?.zone).filter(Boolean))]
  return locations.sort()
})

// Simple filter state (without complex composable)
const selectedType = ref(null)
const selectedLocation = ref(null)
const selectedAlarmFilter = ref(null)
const selectedCommunicationStatus = ref(null)

// Computed to check if any filters are active
const hasActiveFilters = computed(() => !!(selectedType.value || selectedLocation.value || selectedAlarmFilter.value))

// Count functions for filter chips
const getTypeCount = (type) => {
  return equipmentList.value.filter(e => e?.type === type).length
}

const getLocationCount = (location) => {
  return equipmentList.value.filter(e => (e?.location || e?.zone) === location).length
}

const getAlarmCount = (filterType) => {
  const equipmentWithAlarms = equipmentList.value.filter(e => {
    const equipAlarms = alarmStore.alarmsByEquipment[e.id] || []
    return equipAlarms.length > 0
  })
  
  if (filterType === 'with-alarms') {
    return equipmentWithAlarms.length
  }
  
  // Count by priority
  return equipmentWithAlarms.filter(e => {
    const equipAlarms = alarmStore.alarmsByEquipment[e.id] || []
    return equipAlarms.some(alarm => alarm.priority === filterType)
  }).length
}

// Simple filtered equipment (basic filtering only)
const filteredEquipment = computed(() => {
  let filtered = equipmentList.value || []

  // Basic type filter
  if (selectedType.value) {
    filtered = filtered.filter(e => e?.type === selectedType.value)
  }

  // Basic location filter
  if (selectedLocation.value) {
    filtered = filtered.filter(e => (e?.location || e?.zone) === selectedLocation.value)
  }

  // Basic search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(e =>
      (e?.name || '').toLowerCase().includes(query) ||
      (e?.type || '').toLowerCase().includes(query) ||
      (e?.location || '').toLowerCase().includes(query)
    )
  }

  return filtered
})

// Methods
const toggleFilter = () => {
  showFilter.value = !showFilter.value
}

const clearFilters = () => {
  selectedType.value = null
  selectedLocation.value = null
  selectedAlarmFilter.value = null
  selectedCommunicationStatus.value = null
  searchQuery.value = ''
}

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

const forceRefresh = async () => {
  loading.value = true
  try {
    // Clear local cache
    localStorage.removeItem('niagara-bql-cache')
    localStorage.removeItem('niagara-history-cache')
    // Reload the page to get fresh data
    window.location.reload()
  } catch (error) {
    console.error('Failed to force refresh:', error)
    loading.value = false
  }
}

const handlePointClick = (point) => {
  emit('point-clicked', point)
}

const handleEquipmentClick = (equipment) => {
  // Navigate to equipment detail or select it
  deviceStore.selectDevice(equipment)
}

// Lifecycle
onMounted(() => {
  // Focus search input if it exists
  if (searchInputRef.value) {
    searchInputRef.value.focus()
  }
})

onUnmounted(() => {
  // Remove keyboard shortcut listener
  document.removeEventListener('keydown', handleKeydown)
})

// Keyboard shortcuts
const handleKeydown = (event) => {
  // Ctrl/Cmd + F to focus search
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault()
    if (searchInputRef.value) {
      searchInputRef.value.focus()
    }
  }

  // Escape to clear search or close filters
  if (event.key === 'Escape') {
    if (searchQuery.value) {
      searchQuery.value = ''
    } else if (showFilter.value) {
      showFilter.value = false
    }
  }
}

// Add global keyboard listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Expose methods for parent components (e.g., alarm click -> clear filters -> scroll to equipment)
defineExpose({
  clearFilters
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

.force-refresh-btn {
  background-color: var(--color-warning);
  color: var(--color-bg-primary);
  font-weight: var(--font-weight-semibold);
}

.force-refresh-btn:hover {
  background-color: #f59e0b;
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

/* Search Section - Sticky at top */
.search-section {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-bg-primary);
  padding: var(--spacing-md) 0;
  margin-bottom: var(--spacing-md);
  /* Subtle shadow when stuck */
  transition: box-shadow 0.2s ease;
}

/* Add shadow when scrolled */
.search-section::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -20px;
  right: -20px;
  height: 10px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.05), transparent);
  pointer-events: none;
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

