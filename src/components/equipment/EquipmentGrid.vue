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

const deviceStore = useDeviceStore()
const emit = defineEmits(['point-clicked'])

const loading = ref(false)
const showFilter = ref(false)
const selectedType = ref(null)

// Get equipment list from store
const equipmentList = computed(() => deviceStore.allDevices)

// Get unique equipment types
const equipmentTypes = computed(() => {
  const types = [...new Set(equipmentList.value.map(e => e.type))]
  return types.sort()
})

// Filter equipment by type
const filteredEquipment = computed(() => {
  if (!selectedType.value) {
    return equipmentList.value
  }
  return equipmentList.value.filter(e => e.type === selectedType.value)
})

// Get count for specific type
const getTypeCount = (type) => {
  return equipmentList.value.filter(e => e.type === type).length
}

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

