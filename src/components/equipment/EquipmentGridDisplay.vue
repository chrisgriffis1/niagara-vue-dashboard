<template>
  <div class="equipment-grid-display">
    <!-- Loading State -->
    <div v-if="loading && equipment.length === 0" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading equipment...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && equipment.length === 0" class="empty-state">
      <div class="empty-icon">🏭</div>
      <h3>No Equipment Found</h3>
      <p>No equipment matches your current filters.</p>
      <button v-if="hasActiveFilters" @click="$emit('clear-filters')" class="clear-filters-btn">
        Clear All Filters
      </button>
    </div>

    <!-- Equipment Grid -->
    <div v-else class="equipment-grid">
      <!-- Point Device Stack Cards (grouped by type) -->
      <PointDeviceStackCard
        v-for="deviceType in pointDeviceTypeKeys"
        :key="`stack-${deviceType}`"
        :device-type="deviceType"
        :devices="pointDeviceGroups[deviceType]"
      />
      
      <!-- Regular Equipment Cards -->
      <EquipmentCard
        v-for="equip in regularEquipment"
        :key="equip.id"
        :equipment="equip"
        @point-clicked="$emit('point-clicked', $event)"
        @equipment-clicked="$emit('equipment-clicked', $event)"
      />
    </div>

    <!-- Load More Button (for future pagination) -->
    <div v-if="hasMore && !loading" class="load-more-section">
      <button @click="$emit('load-more')" class="load-more-btn">
        Load More Equipment...
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import EquipmentCard from './EquipmentCard.vue'
import PointDeviceStackCard from './PointDeviceStackCard.vue'

const props = defineProps({
  equipment: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  hasActiveFilters: {
    type: Boolean,
    default: false
  },
  hasMore: {
    type: Boolean,
    default: false
  }
})

defineEmits(['point-clicked', 'equipment-clicked', 'clear-filters', 'load-more'])

// Separate point-devices from regular equipment
const regularEquipment = computed(() => {
  const regular = props.equipment.filter(e => !e.isPointDevice)
  console.log(`📊 Equipment split: ${regular.length} regular, ${props.equipment.length - regular.length} point-devices`)
  return regular
})

// Group point-devices by type
const pointDeviceGroups = computed(() => {
  const pointDevices = props.equipment.filter(e => e.isPointDevice)
  const groups = {}
  
  pointDevices.forEach(device => {
    const type = device.type || 'Unknown'
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(device)
  })
  
  // Debug: Log group counts
  if (Object.keys(groups).length > 0) {
    console.log('📦 Point-device groups:', Object.keys(groups).map(k => `${k}: ${groups[k].length}`).join(', '))
  }
  
  return groups
})

// Get the keys of the point device groups for v-for iteration
const pointDeviceTypeKeys = computed(() => {
  const keys = Object.keys(pointDeviceGroups.value).sort()
  console.log(`🔑 Stack card keys (${keys.length}):`, keys)
  return keys
})

// Debug on mount
onMounted(() => {
  console.log('🎨 EquipmentGridDisplay mounted')
  console.log('  Equipment count:', props.equipment.length)
  console.log('  Point device types:', pointDeviceTypeKeys.value)
  console.log('  Regular equipment:', regularEquipment.value.length)
})
</script>

<style scoped>
.equipment-grid-display {
  min-height: 200px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl);
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border);
  border-top: 4px solid var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-lg);
}

.empty-icon {
  font-size: var(--font-size-4xl);
  margin-bottom: var(--spacing-lg);
  opacity: 0.6;
}

.empty-state h3 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-xl);
}

.empty-state p {
  margin: 0 0 var(--spacing-lg) 0;
  color: var(--color-text-secondary);
  max-width: 400px;
}

.clear-filters-btn {
  background: var(--color-accent);
  color: white;
  border: none;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.clear-filters-btn:hover {
  background: var(--color-accent-hover);
}

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  grid-auto-rows: min-content; /* Rows only as tall as needed */
  align-items: start; /* All items align to top of their cells */
}

.load-more-section {
  text-align: center;
  padding: var(--spacing-xl);
}

.load-more-btn {
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size-md);
  transition: all var(--transition-fast);
}

.load-more-btn:hover {
  background: var(--color-background-tertiary);
  border-color: var(--color-accent);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive grid */
@media (max-width: 768px) {
  .equipment-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
}

@media (max-width: 480px) {
  .equipment-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }

  .loading-state,
  .empty-state {
    padding: var(--spacing-xl);
  }
}
</style>
