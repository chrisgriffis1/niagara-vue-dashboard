<template>
  <div class="equipment-card card">
    <div class="equipment-header">
      <h3>{{ equipment.name }}</h3>
      <span class="status-dot" :class="statusClass"></span>
    </div>
    <div class="equipment-body">
      <p class="equipment-type">{{ equipment.type }}</p>
      <!-- Point list will be added here -->
    </div>
  </div>
</template>

<script setup>
/**
 * EquipmentCard Component
 * Displays a single piece of equipment with clickable points
 * Max 300 lines per component rule
 */

import { computed } from 'vue'

const props = defineProps({
  equipment: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['point-clicked'])

const statusClass = computed(() => {
  // Will be implemented based on equipment status
  return 'ok'
})
</script>

<style scoped>
.equipment-card {
  margin-bottom: var(--spacing-md);
  transition: transform var(--transition-fast);
  cursor: pointer;
}

.equipment-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-border-light);
}

.equipment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.equipment-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.equipment-type {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}

.equipment-body {
  padding-top: var(--spacing-sm);
}
</style>

