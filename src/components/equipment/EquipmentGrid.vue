<template>
  <div class="equipment-grid">
    <EquipmentCard
      v-for="equipment in equipmentList"
      :key="equipment.id"
      :equipment="equipment"
      @point-clicked="handlePointClick"
    />
  </div>
</template>

<script setup>
/**
 * EquipmentGrid Component
 * Grid layout for multiple equipment cards
 */

import { computed } from 'vue'
import EquipmentCard from './EquipmentCard.vue'
import { useDeviceStore } from '../../stores/deviceStore'

const deviceStore = useDeviceStore()

const equipmentList = computed(() => deviceStore.allDevices)

const emit = defineEmits(['point-clicked'])

const handlePointClick = (point) => {
  emit('point-clicked', point)
}
</script>

<style scoped>
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-md);
  padding: var(--spacing-md) 0;
}

@media (max-width: 768px) {
  .equipment-grid {
    grid-template-columns: 1fr;
  }
}
</style>

